import { useServiceSupabase } from '../../utils/supabase'

/**
 * Webhook SyncPay
 * Configure na SyncPay / no cash-in: https://SEU-DOMINIO/api/webhooks/syncpay
 *
 * Aceita payloads variados e atualiza payments por external_id.
 */
function pickStatus(payload: any): string {
  const raw = String(
    payload?.status ||
      payload?.data?.status ||
      payload?.transaction?.status ||
      payload?.payment?.status ||
      payload?.event ||
      '',
  ).toLowerCase()

  if (['approved', 'paid', 'completed', 'confirmed', 'success', 'pago', 'payment.approved', 'transaction.paid'].includes(raw)) {
    return 'approved'
  }
  if (['failed', 'cancelled', 'canceled', 'expired', 'refused', 'rejected', 'error'].includes(raw)) {
    return 'failed'
  }
  if (['pending', 'waiting', 'created', 'processing', 'waiting_payment'].includes(raw)) {
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
    payload?.amount ??
      payload?.final_amount ??
      payload?.data?.amount ??
      payload?.transaction?.amount ??
      NaN,
  )
  return Number.isFinite(n) ? n : null
}

export default defineEventHandler(async (event) => {
  // SyncPay pode validar com GET ocasionalmente
  if (getMethod(event) === 'GET') {
    return { ok: true, service: 'syncpay-webhook' }
  }

  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  let body: any = {}
  try {
    body = await readBody(event)
  } catch {
    body = {}
  }

  // alguns gateways enviam { data: {...} } ou array
  const payload = Array.isArray(body) ? body[0] : body?.data && typeof body.data === 'object' ? { ...body, ...body.data } : body

  const externalId = pickExternalId(payload)
  const status = pickStatus(payload)
  const pixCode = pickPixCode(payload)
  const amount = pickAmount(payload)

  console.log('[webhook/syncpay]', { externalId, status, hasPix: !!pixCode, amount })

  if (!externalId) {
    // responde 200 pra não reintentar infinito, mas loga
    console.error('[webhook/syncpay] missing external id', JSON.stringify(body).slice(0, 500))
    return { ok: false, error: 'missing_id' }
  }

  const supabase = useServiceSupabase()
  const now = new Date().toISOString()

  const patch: Record<string, any> = {
    status,
    updated_at: now,
    metadata: {
      source: 'webhook',
      syncpay: payload,
      webhook_at: now,
    },
  }
  if (status === 'approved') patch.approved_at = now
  if (status === 'failed') patch.failed_at = now
  if (pixCode) patch.pix_qr_code = pixCode
  if (amount != null) patch.amount = amount

  // update por external_id
  const { data: existing, error: findErr } = await supabase
    .from('payments')
    .select('id, metadata')
    .eq('external_id', externalId)
    .maybeSingle()

  if (findErr) {
    console.error('[webhook/syncpay] find', findErr.message)
  }

  if (existing?.id) {
    const mergedMeta = {
      ...(existing.metadata || {}),
      source: 'webhook',
      syncpay: payload,
      webhook_at: now,
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

  // se não existe, cria registro
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
