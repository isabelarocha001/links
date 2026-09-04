import { createHmac, timingSafeEqual } from 'node:crypto'
import { useServiceSupabase } from '../../utils/supabase'

/**
 * Webhook SyncPay
 * URL: https://wanessabsx.vercel.app/api/webhooks/syncpay
 * Header: X-SyncPay-Signature (HMAC do body com SYNCPAY_WEBHOOK_SECRET)
 */

async function loadWebhookSecret(): Promise<string> {
  const config = useRuntimeConfig() as any
  let secret = String(
    config.syncpayWebhookSecret ||
      process.env.SYNCPAY_WEBHOOK_SECRET ||
      process.env.NUXT_SYNCPAY_WEBHOOK_SECRET ||
      '',
  ).trim()

  if (!secret) {
    try {
      const supabase = useServiceSupabase()
      const { data } = await supabase
        .from('app_secrets')
        .select('value')
        .eq('key', 'SYNCPAY_WEBHOOK_SECRET')
        .maybeSingle()
      if (data?.value) secret = String(data.value).trim()
    } catch {}
  }
  return secret
}

function safeEqualStr(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

function verifySyncPaySignature(rawBody: string, headerValue: string | undefined, secret: string): boolean {
  if (!secret) return true // sem secret configurado, não bloqueia (dev)
  if (!headerValue) return false

  const provided = headerValue.trim()
  // formatos comuns: hex puro | sha256=hex | t=...,v1=hex
  let candidates: string[] = []

  const hmacHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const hmacBase64 = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  candidates.push(hmacHex, hmacBase64, `sha256=${hmacHex}`, `sha256=${hmacBase64}`)

  // padrão estilo Stripe/Sync: t=timestamp,v1=signature
  const m = provided.match(/t=(\d+),v1=([A-Za-z0-9+/=_-]+)/)
  if (m) {
    const signed = `${m[1]}.${rawBody}`
    const v1hex = createHmac('sha256', secret).update(signed, 'utf8').digest('hex')
    const v1b64 = createHmac('sha256', secret).update(signed, 'utf8').digest('base64')
    candidates.push(v1hex, v1b64)
    if (safeEqualStr(m[2], v1hex) || safeEqualStr(m[2], v1b64)) return true
  }

  const providedNorm = provided.replace(/^sha256=/i, '')
  for (const c of candidates) {
    const cn = c.replace(/^sha256=/i, '')
    if (safeEqualStr(provided, c) || safeEqualStr(providedNorm, cn)) return true
  }
  return false
}

function pickStatus(payload: any): string {
  const raw = String(
    payload?.status ||
      payload?.data?.status ||
      payload?.transaction?.status ||
      payload?.payment?.status ||
      payload?.event ||
      payload?.type ||
      '',
  ).toLowerCase()

  if (
    [
      'approved',
      'paid',
      'completed',
      'confirmed',
      'success',
      'pago',
      'payment.approved',
      'transaction.paid',
      'transaction.updated',
    ].some((x) => raw.includes(x) && !raw.includes('pending'))
  ) {
    // transaction.updated pode ser qualquer status — olhar payload.status primeiro já feito
  }

  if (['approved', 'paid', 'completed', 'confirmed', 'success', 'pago'].includes(raw)) return 'approved'
  if (raw.includes('approved') || raw.includes('paid') || raw.includes('completed')) {
    if (!raw.includes('unpaid') && !raw.includes('pending')) return 'approved'
  }
  if (['failed', 'cancelled', 'canceled', 'expired', 'refused', 'rejected', 'error'].includes(raw)) return 'failed'
  if (['pending', 'waiting', 'created', 'processing', 'waiting_payment', 'transaction.created'].includes(raw)) {
    return 'pending'
  }
  return raw || 'pending'
}

function pickExternalId(payload: any): string {
  return String(
    payload?.id ||
      payload?.identifier ||
      payload?.transaction_id ||
      payload?.transactionId ||
      payload?.data?.id ||
      payload?.data?.identifier ||
      payload?.transaction?.id ||
      payload?.payment?.id ||
      payload?.external_id ||
      '',
  ).trim()
}

function pickPixCode(payload: any): string | null {
  const code = String(
    payload?.pix_code ||
      payload?.qr_code ||
      payload?.copy_paste ||
      payload?.data?.pix_code ||
      payload?.transaction?.pix_code ||
      '',
  ).trim()
  return code || null
}

function pickAmount(payload: any): number | null {
  const n = Number(
    payload?.amount ?? payload?.final_amount ?? payload?.data?.amount ?? payload?.transaction?.amount ?? NaN,
  )
  return Number.isFinite(n) ? n : null
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) === 'GET') {
    return { ok: true, service: 'syncpay-webhook' }
  }

  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const rawBody = (await readRawBody(event, 'utf8')) || ''
  const signature =
    getHeader(event, 'x-syncpay-signature') ||
    getHeader(event, 'X-SyncPay-Signature') ||
    getHeader(event, 'x-signature')

  const secret = await loadWebhookSecret()
  if (secret && !verifySyncPaySignature(rawBody, signature || undefined, secret)) {
    console.error('[webhook/syncpay] invalid signature', {
      hasHeader: !!signature,
      bodyLen: rawBody.length,
    })
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  let body: any = {}
  try {
    body = rawBody ? JSON.parse(rawBody) : await readBody(event)
  } catch {
    try {
      body = await readBody(event)
    } catch {
      body = {}
    }
  }

  const payload =
    Array.isArray(body)
      ? body[0]
      : body?.data && typeof body.data === 'object'
        ? { ...body, ...body.data }
        : body

  // event type no topo (transaction.created / transaction.updated)
  if (body?.event && !payload.event) payload.event = body.event
  if (body?.type && !payload.type) payload.type = body.type

  const externalId = pickExternalId(payload)
  const status = pickStatus(payload)
  const pixCode = pickPixCode(payload)
  const amount = pickAmount(payload)

  console.log('[webhook/syncpay]', { externalId, status, hasPix: !!pixCode, amount, event: payload?.event || payload?.type })

  if (!externalId) {
    console.error('[webhook/syncpay] missing external id', rawBody.slice(0, 500))
    return { ok: false, error: 'missing_id' }
  }

  const supabase = useServiceSupabase()
  const now = new Date().toISOString()

  const patch: Record<string, any> = {
    status,
    updated_at: now,
  }
  if (status === 'approved') patch.approved_at = now
  if (status === 'failed') patch.failed_at = now
  if (pixCode) patch.pix_qr_code = pixCode
  if (amount != null) patch.amount = amount

  const { data: existing, error: findErr } = await supabase
    .from('payments')
    .select('id, metadata')
    .eq('external_id', externalId)
    .maybeSingle()

  if (findErr) console.error('[webhook/syncpay] find', findErr.message)

  if (existing?.id) {
    const mergedMeta = {
      ...(existing.metadata || {}),
      source: 'webhook',
      syncpay: payload,
      webhook_at: now,
      signature_ok: true,
    }
    const { error } = await supabase
      .from('payments')
      .update({ ...patch, metadata: mergedMeta })
      .eq('id', existing.id)
    if (error) {
      console.error('[webhook/syncpay] update', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true, updated: true, payment_id: existing.id, status }
  }

  const { data: inserted, error: insErr } = await supabase
    .from('payments')
    .insert({
      external_id: externalId,
      payment_method: 'pix',
      status,
      amount: amount ?? 0,
      currency: 'BRL',
      pix_qr_code: pixCode,
      approved_at: status === 'approved' ? now : null,
      failed_at: status === 'failed' ? now : null,
      metadata: {
        source: 'webhook',
        syncpay: payload,
        webhook_at: now,
        signature_ok: true,
      },
    })
    .select('id')
    .single()

  if (insErr) {
    console.error('[webhook/syncpay] insert', insErr.message)
    return { ok: false, error: insErr.message }
  }

  return { ok: true, created: true, payment_id: inserted?.id, status }
})
