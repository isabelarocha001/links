/**
 * Helpers Stripe VIP (checkout /assinaturavip) — isolado do Stripe de chat.
 * Secrets só via app_secrets (service role). Nunca logar sk_/whsec_/client_secret.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { useServiceSupabase } from './supabase'
import {
  VIP_STRIPE_CATALOG,
  VIP_STRIPE_CURRENCIES,
  VIP_STRIPE_PRICE_SECRET_KEYS,
  type VipStripeCurrency,
} from './stripe-vip-catalog.mjs'

export type VipStripePlanKey = 'monthly' | 'lifetime'
export type { VipStripeCurrency } from './stripe-vip-catalog.mjs'

export async function loadVipStripeSecrets() {
  const supabase = useServiceSupabase()
  const priceSecretKeys = Object.values(VIP_STRIPE_PRICE_SECRET_KEYS).flatMap((prices) => Object.values(prices))
  const keys = [
    'STRIPE_SECRET_KEY',
    'NUXT_STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_VIP_WEBHOOK_SECRET',
    'STRIPE_VIP_CAPABILITY_SECRET',
    ...priceSecretKeys,
  ]
  const { data } = await supabase.from('app_secrets').select('key, value').in('key', keys)
  const map: Record<string, string> = {}
  for (const row of data || []) {
    const k = String(row?.key || '')
    const v = row?.value ? String(row.value).trim() : ''
    if (k && v) map[k] = v
  }
  const secret =
    (map.STRIPE_SECRET_KEY?.startsWith('sk_') && map.STRIPE_SECRET_KEY) ||
    (map.NUXT_STRIPE_SECRET_KEY?.startsWith('sk_') && map.NUXT_STRIPE_SECRET_KEY) ||
    ''
  const publishable = map.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_') ? map.STRIPE_PUBLISHABLE_KEY : ''
  const webhookSecret = map.STRIPE_VIP_WEBHOOK_SECRET?.startsWith('whsec_')
    ? map.STRIPE_VIP_WEBHOOK_SECRET
    : ''
  const capabilitySecret =
    map.STRIPE_VIP_CAPABILITY_SECRET ||
    (secret ? createHmac('sha256', secret).update('vip-capability-v1').digest('hex') : '')

  return {
    secret,
    publishable,
    webhookSecret,
    capabilitySecret,
    priceIds: Object.fromEntries(
      (['monthly', 'lifetime'] as VipStripePlanKey[]).map((plan) => [
        plan,
        Object.fromEntries(
          VIP_STRIPE_CURRENCIES.map((currency) => {
            const value = map[VIP_STRIPE_PRICE_SECRET_KEYS[plan][currency]] || ''
            return [currency, value.startsWith('price_') ? value : '']
          }),
        ),
      ]),
    ) as Record<VipStripePlanKey, Record<VipStripeCurrency, string>>,
  }
}

/** Quais planos/moedas têm cartão configurado (sem expor price_id). */
export async function listVipStripeAvailability() {
  const s = await loadVipStripeSecrets()
  const available: Array<{ plan: VipStripePlanKey; currency: VipStripeCurrency; amount_cents: number }> = []
  if (!s.secret || !s.publishable) return { configured: false, available }

  for (const plan of ['monthly', 'lifetime'] as VipStripePlanKey[]) {
    for (const currency of VIP_STRIPE_CURRENCIES) {
      const priceId = s.priceIds[plan][currency]
      if (priceId) {
        available.push({
          plan,
          currency,
          amount_cents: VIP_STRIPE_CATALOG[plan].amount_cents[currency],
        })
      }
    }
  }
  return { configured: available.length > 0, available, publishable_prefix: s.publishable.slice(0, 8) }
}

export function resolveVipPlan(input: string): VipStripePlanKey | null {
  const k = String(input || '').toLowerCase().trim()
  if (k === 'monthly' || k === 'vip_monthly') return 'monthly'
  if (k === 'lifetime' || k === 'vip_lifetime') return 'lifetime'
  return null
}

export async function stripeForm(
  secret: string,
  path: string,
  params: URLSearchParams,
  idempotencyKey?: string,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey.slice(0, 255)
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers,
    body: params.toString(),
    signal: AbortSignal.timeout(20000),
  })
  const data = await res.json().catch(() => ({} as any))
  return { ok: res.ok, status: res.status, data }
}

export async function stripeGet(secret: string, path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json().catch(() => ({} as any))
  return { ok: res.ok, status: res.status, data }
}

/** Valida Price ativo e alinhado ao catálogo (tipo + moeda + valor). */
export async function fetchAndValidatePrice(
  secret: string,
  priceId: string,
  plan: VipStripePlanKey,
  currency: string,
  expectedCents: number,
) {
  const { ok, data } = await stripeGet(secret, `prices/${encodeURIComponent(priceId)}`)
  if (!ok || !data?.id) return { valid: false as const, reason: 'price_lookup_failed' }
  if (data.active !== true) return { valid: false as const, reason: 'price_inactive' }
  if (String(data.currency || '').toLowerCase() !== currency.toLowerCase()) {
    return { valid: false as const, reason: 'currency_mismatch' }
  }
  if (Number(data.unit_amount) !== expectedCents) {
    return { valid: false as const, reason: 'amount_mismatch' }
  }
  if (plan === 'monthly') {
    if (data.type !== 'recurring' || !data.recurring) {
      return { valid: false as const, reason: 'expected_recurring' }
    }
    const interval = String(data.recurring.interval || '')
    const count = Number(data.recurring.interval_count || 1)
    // Aceita month/1 (calendário) ou day/30 — copy deve refletir o que validamos
    if (interval === 'month' && count === 1) {
      return {
        valid: true as const,
        price: data,
        recurrence: { kind: 'calendar_month' as const, label_key: 'every_month' },
      }
    }
    if (interval === 'day' && count === 30) {
      return {
        valid: true as const,
        price: data,
        recurrence: { kind: 'days_30' as const, label_key: 'every_30_days' },
      }
    }
    return { valid: false as const, reason: 'unsupported_interval' }
  }
  // lifetime: one-time
  if (data.type === 'recurring') return { valid: false as const, reason: 'expected_one_time' }
  return {
    valid: true as const,
    price: data,
    recurrence: { kind: 'one_time' as const, label_key: 'one_time' },
  }
}

export function mintCapabilityToken(
  capabilitySecret: string,
  paymentId: string,
  visitorId: string,
): string {
  const nonce = randomBytes(8).toString('hex')
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 6 // 6h
  const payload = `${paymentId}.${visitorId}.${exp}.${nonce}`
  const sig = createHmac('sha256', capabilitySecret).update(payload).digest('hex')
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

export function verifyCapabilityToken(
  capabilitySecret: string,
  token: string,
  paymentId: string,
): { ok: boolean; visitorId?: string } {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8')
    const parts = raw.split('.')
    if (parts.length !== 5) return { ok: false }
    const [pid, visitorId, expStr, nonce, sig] = parts
    if (pid !== paymentId) return { ok: false }
    if (Number(expStr) < Math.floor(Date.now() / 1000)) return { ok: false }
    const payload = `${pid}.${visitorId}.${expStr}.${nonce}`
    const expected = createHmac('sha256', capabilitySecret).update(payload).digest('hex')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false }
    return { ok: true, visitorId }
  } catch {
    return { ok: false }
  }
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  header: string | undefined,
  whsec: string,
): boolean {
  // Fail closed: sem secret ou sem header = inválido
  // Stripe oficial: HMAC key = base64-decode do trecho após "whsec_"
  if (!whsec || !whsec.startsWith('whsec_') || !header) return false
  try {
    const parts = Object.fromEntries(
      header.split(',').map((p) => {
        const [k, ...rest] = p.split('=')
        return [k.trim(), rest.join('=')]
      }),
    )
    const t = parts['t']
    const v1 = parts['v1']
    if (!t || !v1) return false
    const age = Math.abs(Date.now() / 1000 - Number(t))
    if (!Number.isFinite(age) || age > 300) return false
    const key = Buffer.from(whsec.slice('whsec_'.length), 'base64')
    const expected = createHmac('sha256', key).update(`${t}.${rawBody}`, 'utf8').digest('hex')
    const a = Buffer.from(v1, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function clientIp(event: any): string {
  const xf = getHeader(event, 'x-forwarded-for')
  if (xf) return String(xf).split(',')[0].trim().slice(0, 64)
  const real = getHeader(event, 'x-real-ip')
  if (real) return String(real).trim().slice(0, 64)
  try {
    return String(event?.node?.req?.socket?.remoteAddress || 'unknown').slice(0, 64)
  } catch {
    return 'unknown'
  }
}

/**
 * Rate limit compartilhado via tabela rate_limit_buckets (se existir).
 * Fallback: conta payments pendentes Stripe VIP (parcial) + Map local (documentado).
 */
const localRl = new Map<string, { ts: number; n: number }>()

export async function assertRateLimit(opts: {
  key: string
  limit: number
  windowMs: number
  retryAfterSec?: number
}) {
  const supabase = useServiceSupabase()
  const now = Date.now()
  const windowStart = new Date(now - opts.windowMs).toISOString()

  // Tenta bucket atômico no Supabase
  try {
    const { data, error } = await supabase
      .from('rate_limit_buckets')
      .select('key, window_start, count')
      .eq('key', opts.key)
      .maybeSingle()

    if (!error) {
      if (!data || new Date(data.window_start).getTime() < now - opts.windowMs) {
        await supabase.from('rate_limit_buckets').upsert({
          key: opts.key,
          window_start: new Date(now).toISOString(),
          count: 1,
          updated_at: new Date().toISOString(),
        })
        return
      }
      if (Number(data.count) >= opts.limit) {
        throw createError({
          statusCode: 429,
          statusMessage: 'Too many requests. Try again later.',
          data: { retry_after: opts.retryAfterSec || Math.ceil(opts.windowMs / 1000) },
        })
      }
      await supabase
        .from('rate_limit_buckets')
        .update({ count: Number(data.count) + 1, updated_at: new Date().toISOString() })
        .eq('key', opts.key)
      return
    }
  } catch (e: any) {
    if (e?.statusCode === 429) throw e
    // tabela ausente → fallback local
  }

  const prev = localRl.get(opts.key)
  if (!prev || now - prev.ts > opts.windowMs) {
    localRl.set(opts.key, { ts: now, n: 1 })
    return
  }
  if (prev.n >= opts.limit) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Try again later.',
      data: { retry_after: opts.retryAfterSec || Math.ceil(opts.windowMs / 1000) },
    })
  }
  prev.n += 1
  localRl.set(opts.key, prev)
}

export function allowedReturnOrigins(): string[] {
  return [
    'https://wanessabsx.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]
}

export function sanitizeOrigin(input: unknown): string {
  const raw = String(input || '').trim().replace(/\/$/, '')
  if (allowedReturnOrigins().includes(raw)) return raw
  return 'https://wanessabsx.vercel.app'
}
