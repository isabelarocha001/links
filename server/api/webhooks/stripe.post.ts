/**
 * POST /api/webhooks/stripe
 * Stripe webhook: checkout.session.completed → aprova payment + libera chat se plan chat.
 *
 * Configure no Dashboard Stripe:
 *   URL: https://SEU_DOMINIO/api/webhooks/stripe
 *   Eventos: checkout.session.completed, checkout.session.async_payment_succeeded
 *   Secret: STRIPE_WEBHOOK_SECRET (whsec_...)
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { useServiceSupabase } from '../../utils/supabase'

async function loadSecrets() {
  const config = useRuntimeConfig() as any
  const env = process.env as Record<string, string | undefined>
  let secret = String(config.stripeSecretKey || env.STRIPE_SECRET_KEY || env.NUXT_STRIPE_SECRET_KEY || '').trim()
  let whsec = String(config.stripeWebhookSecret || env.STRIPE_WEBHOOK_SECRET || env.NUXT_STRIPE_WEBHOOK_SECRET || '').trim()
  if (!secret || !whsec) {
    try {
      const supabase = useServiceSupabase()
      const keys = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NUXT_STRIPE_SECRET_KEY', 'NUXT_STRIPE_WEBHOOK_SECRET']
      const { data } = await supabase.from('app_secrets').select('key, value').in('key', keys)
      for (const row of data || []) {
        const k = String(row.key || '')
        const v = row.value ? String(row.value).trim() : ''
        if (!v) continue
        if (!secret && k.includes('SECRET_KEY')) secret = v
        if (!whsec && k.includes('WEBHOOK')) whsec = v
      }
    } catch {}
  }
  return { secret, whsec }
}

function verifyStripeSignature(rawBody: string, header: string | undefined, whsec: string): boolean {
  if (!whsec) return true // dev sem secret
  if (!header) return false
  try {
    const parts = Object.fromEntries(
      header.split(',').map((p) => {
        const [k, v] = p.split('=')
        return [k.trim(), v]
      }),
    )
    const t = parts['t']
    const v1 = parts['v1']
    if (!t || !v1) return false
    const signed = `${t}.${rawBody}`
    const expected = createHmac('sha256', whsec).update(signed, 'utf8').digest('hex')
    const a = Buffer.from(v1)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    // tolerância 5 min
    const age = Math.abs(Date.now() / 1000 - Number(t))
    if (age > 300) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function isChatPlan(meta: any): boolean {
  const plan = String(meta?.plan_key || meta?.plan || '').toLowerCase()
  const source = String(meta?.source || '')
  return (
    plan.includes('chat') ||
    source === 'links_chat_lock' ||
    source === 'links_stripe' ||
    source === 'admin_unlock_chat' ||
    meta?.admin_grant === true
  )
}

async function markChatUnlocked(supabase: any, visitorId: string, planKey: string) {
  const vid = String(visitorId || '').trim()
  if (!vid) return
  const now = new Date().toISOString()
  const { data: convs } = await supabase
    .from('wa_funnel_conversations')
    .select('id, metadata')
    .eq('visitor_id', vid)
  for (const c of convs || []) {
    const meta = c.metadata && typeof c.metadata === 'object' ? { ...c.metadata } : {}
    if (meta.chat_unlocked === true) continue
    meta.chat_unlocked = true
    meta.chat_unlocked_at = now
    meta.chat_unlocked_by = 'stripe'
    meta.chat_unlock_plan = planKey
    await supabase.from('wa_funnel_conversations').update({ metadata: meta, updated_at: now }).eq('id', c.id)
  }
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) === 'GET') {
    return { ok: true, service: 'stripe-webhook' }
  }
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const rawBody = (await readRawBody(event, 'utf8')) || ''
  const sig = getHeader(event, 'stripe-signature')
  const { whsec } = await loadSecrets()

  if (whsec && !verifyStripeSignature(rawBody, sig || undefined, whsec)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Stripe signature' })
  }

  let eventBody: any = {}
  try {
    eventBody = rawBody ? JSON.parse(rawBody) : await readBody(event)
  } catch {
    eventBody = {}
  }

  const type = String(eventBody?.type || '')
  const obj = eventBody?.data?.object || {}

  if (
    type !== 'checkout.session.completed' &&
    type !== 'checkout.session.async_payment_succeeded'
  ) {
    return { ok: true, ignored: type }
  }

  const sessionId = String(obj?.id || '')
  const paymentStatus = String(obj?.payment_status || obj?.status || '')
  if (!sessionId) return { ok: false, error: 'missing session id' }

  // paid / complete
  const paid =
    paymentStatus === 'paid' ||
    paymentStatus === 'complete' ||
    obj?.status === 'complete'

  if (!paid) {
    return { ok: true, pending: true, payment_status: paymentStatus }
  }

  const supabase = useServiceSupabase()
  const now = new Date().toISOString()
  const metaIn = obj?.metadata || {}

  const { data: existing } = await supabase
    .from('payments')
    .select('id, metadata')
    .eq('external_id', sessionId)
    .maybeSingle()

  const mergedMeta = {
    ...(existing?.metadata || {}),
    ...metaIn,
    provider: 'stripe',
    stripe_event: type,
    webhook_at: now,
  }

  if (existing?.id) {
    await supabase
      .from('payments')
      .update({
        status: 'approved',
        approved_at: now,
        updated_at: now,
        metadata: mergedMeta,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('payments').insert({
      external_id: sessionId,
      payment_method: 'card',
      status: 'approved',
      amount: (Number(obj?.amount_total) || 0) / 100,
      currency: String(obj?.currency || 'brl').toUpperCase(),
      approved_at: now,
      metadata: mergedMeta,
    })
  }

  if (isChatPlan(mergedMeta)) {
    const vid = String(mergedMeta.visitor_id || '')
    if (vid) {
      try {
        await markChatUnlocked(supabase, vid, String(mergedMeta.plan_key || 'chat_quick'))
      } catch (e: any) {
        console.warn('[stripe webhook] unlock', e?.message || e)
      }
    }
  }

  return { ok: true, session_id: sessionId, unlocked: isChatPlan(mergedMeta) }
})
