import { useServiceSupabase } from '../../utils/supabase'
import { fakePersonForVisitor } from '../../utils/fake-person'
import { getCachedSyncPayToken } from './warm.get'

const EXPECTED_AMOUNT = 29.9
const EXPECTED_PERIOD_DAYS = 30
const enrollRateLimit = new Map<string, number>()

function enforceEnrollRateLimit(event: any) {
  const forwarded = String(getHeader(event, 'x-forwarded-for') || '').split(',')[0].trim()
  const ip = forwarded || String(getHeader(event, 'x-real-ip') || event?.node?.req?.socket?.remoteAddress || 'unknown')
  const now = Date.now()
  const previous = enrollRateLimit.get(ip) || 0
  if (now - previous < 20_000) {
    throw createError({ statusCode: 429, statusMessage: 'Aguarde alguns segundos antes de tentar novamente.' })
  }
  if (enrollRateLimit.size > 3000) {
    for (const [key, timestamp] of enrollRateLimit) if (now - timestamp > 60_000) enrollRateLimit.delete(key)
  }
  enrollRateLimit.set(ip, now)
}

async function loadPlanToken() {
  let token = String(process.env.SYNCPAY_VIP_MONTHLY_PLAN_TOKEN || '').trim()
  if (token) return token
  try {
    const supabase = useServiceSupabase()
    const { data } = await supabase.from('app_secrets').select('value')
      .eq('key', 'SYNCPAY_VIP_MONTHLY_PLAN_TOKEN').maybeSingle()
    token = String(data?.value || '').trim()
  } catch { /* Return a generic configuration error below. */ }
  return token
}

function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (base: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(cpf.slice(0, 9), 10) === Number(cpf[9]) && digit(cpf.slice(0, 10), 11) === Number(cpf[10])
}

function extractEnrollment(payload: any) {
  const root = payload?.data && typeof payload.data === 'object' ? { ...payload, ...payload.data } : payload
  const payment = root?.payment || root?.first_payment || root?.charge || root?.subscription?.payment || {}
  const mandate = root?.mandate || root?.subscription?.mandate || root?.pix_automatico || {}
  const pixCode = (...values: any[]) => values
    .map(value => typeof value === 'string' ? value.trim() : '')
    .find(value => value && !/^data:image\//i.test(value)) || ''
  return {
    root,
    payment,
    // SyncPay uses `token` for plan identifiers too. Only accept an explicit
    // subscription token so a plan token cannot be mistaken for this enrollment.
    subscriptionToken: String(root?.subscription_token || root?.subscription?.token || ''),
    mandateId: String(payment?.mandate_id || mandate?.mandate_id || mandate?.id || root?.mandate_id || ''),
    mandateStatus: String(payment?.mandate_status || mandate?.status || root?.mandate_status || ''),
    qrCode: pixCode(
      payment?.pix_code, payment?.qr_code, payment?.copy_paste, payment?.copyPaste, payment?.emv,
      mandate?.pix_code, mandate?.qr_code, mandate?.copy_paste,
      root?.pix_code, root?.qr_code, root?.pix_copy_paste, root?.emv
    ),
  }
}

function extractPendingSubscriptionPix(payload: any) {
  const root = payload?.data && typeof payload.data === 'object' ? { ...payload, ...payload.data } : payload
  const charges = Array.isArray(root?.charges)
    ? root.charges
    : Array.isArray(root?.subscription?.charges) ? root.subscription.charges : []
  const pendingCharges = charges
    .filter((charge: any) => String(charge?.status || '').toLowerCase() === 'pending')
    .sort((a: any, b: any) => Number(b?.cycle_number || 0) - Number(a?.cycle_number || 0))
  const candidates = pendingCharges.length ? pendingCharges : charges.slice(-1)
  for (const charge of candidates) {
    const payment = charge?.payment || {}
    for (const value of [payment.pix_code, payment.qr_code, payment.copy_paste, payment.emv, charge.pix_code, charge.qr_code]) {
      if (typeof value === 'string' && value.trim() && !/^data:image\//i.test(value.trim())) return value.trim()
    }
  }
  return ''
}

function responseShape(payload: any) {
  const root = payload?.data && typeof payload.data === 'object' ? { ...payload, ...payload.data } : payload
  const payment = root?.payment || root?.first_payment || root?.charge || root?.subscription?.payment || {}
  const mandate = root?.mandate || root?.subscription?.mandate || root?.pix_automatico || {}
  const charges = Array.isArray(root?.charges)
    ? root.charges
    : Array.isArray(root?.subscription?.charges) ? root.subscription.charges : []
  const pendingPayment = charges.find((charge: any) => String(charge?.status || '').toLowerCase() === 'pending')?.payment || {}
  return {
    topLevelKeys: Object.keys(payload || {}).slice(0, 30),
    dataKeys: Object.keys(payload?.data || {}).slice(0, 30),
    paymentKeys: Object.keys(payment).slice(0, 30),
    mandateKeys: Object.keys(mandate).slice(0, 30),
    chargeCount: charges.length,
    pendingChargePaymentKeys: Object.keys(pendingPayment).slice(0, 30),
  }
}

export default defineEventHandler(async (event) => {
  enforceEnrollRateLimit(event)
  const body = await readBody(event).catch(() => ({} as any))
  const visitorId = String(body?.visitor_id || '').trim()

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
    throw createError({ statusCode: 400, statusMessage: 'Não consegui identificar esta visita. Atualize a página e tente novamente.' })
  }
  if (body?.accepted_recurring !== true) {
    throw createError({ statusCode: 400, statusMessage: 'Confirme que entendeu a cobrança mensal automática.' })
  }

  // Auto-preenche nome/email/CPF estáveis por visitor_id (instância própria — sem API externa).
  // Se o front/agente mandar dados válidos, usa os enviados; senão completa com gerador local.
  const auto = fakePersonForVisitor(visitorId)
  let name = String(body?.name || '').trim().replace(/\s+/g, ' ').slice(0, 100)
  let email = String(body?.email || '').trim().toLowerCase().slice(0, 254)
  let document = String(body?.document || '').replace(/\D/g, '')

  if (name.length < 2) name = auto.name
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = auto.email
  if (!isValidCpf(document)) document = auto.document

  const planToken = await loadPlanToken()
  if (!/^[0-9a-f-]{36}$/i.test(planToken)) {
    throw createError({ statusCode: 503, statusMessage: 'O plano mensal Pix Automático ainda não está configurado na SyncPay.' })
  }
  const accessToken = await getCachedSyncPayToken()
  if (!accessToken) throw createError({ statusCode: 503, statusMessage: 'A SyncPay não está configurada neste ambiente.' })

  const base = 'https://api.syncpayments.com.br/api/partner/v1'
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
  const planResponse = await fetch(`${base}/subscription-plans/${planToken}`, { headers, signal: AbortSignal.timeout(8000) })
  const planPayload = await planResponse.json().catch(() => ({} as any))
  if (!planResponse.ok) {
    console.error('[checkout/vip-monthly] plan lookup failed', planResponse.status)
    throw createError({ statusCode: 503, statusMessage: 'Não consegui verificar o plano mensal na SyncPay.' })
  }
  const plan = planPayload?.data ?? planPayload
  if (String(plan?.billing_method || '').toLowerCase() !== 'pix_automatico') {
    throw createError({ statusCode: 409, statusMessage: 'O plano configurado não usa Pix Automático.' })
  }
  if (String(plan?.status || '').toLowerCase() !== 'active') {
    throw createError({ statusCode: 409, statusMessage: 'O plano mensal está inativo na SyncPay.' })
  }
  if (Number(plan?.amount) !== EXPECTED_AMOUNT || Number(plan?.periodicity_days) !== EXPECTED_PERIOD_DAYS) {
    throw createError({ statusCode: 409, statusMessage: 'O plano SyncPay precisa estar configurado em R$ 29,90 a cada 30 dias.' })
  }

  const supabase = useServiceSupabase()
  const { data: payment, error: insertError } = await supabase.from('payments').insert({
    external_id: null,
    payment_method: 'pix_automatico',
    status: 'pending',
    amount: EXPECTED_AMOUNT,
    currency: 'BRL',
    metadata: { source: 'assinaturavip', plan_key: 'vip_monthly', visitor_id: visitorId, billing_method: 'pix_automatico' },
  }).select('id').single()
  if (insertError || !payment?.id) {
    console.error('[checkout/vip-monthly] pending payment insert failed', insertError?.code || 'unknown')
    throw createError({ statusCode: 503, statusMessage: 'Não consegui iniciar a assinatura agora. Tente novamente.' })
  }

  try {
    const enrollResponse = await fetch(`${base}/subscription-plans/${planToken}/enroll`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, document }),
      signal: AbortSignal.timeout(12000),
    })
    const enrollPayload = await enrollResponse.json().catch(() => ({} as any))
    if (!enrollResponse.ok) {
      await supabase.from('payments').update({ status: 'failed', failed_at: new Date().toISOString() }).eq('id', payment.id)
      console.error('[checkout/vip-monthly] enroll failed', enrollResponse.status, enrollPayload?.code || 'provider_error')
      throw createError({ statusCode: 502, statusMessage: 'A SyncPay não conseguiu iniciar a autorização. Confira os dados e tente novamente.' })
    }

    const enrollment = extractEnrollment(enrollPayload)
    if (!enrollment.subscriptionToken || !enrollment.mandateId) {
      await supabase.from('payments').update({ status: 'failed', failed_at: new Date().toISOString() }).eq('id', payment.id)
      console.error('[checkout/vip-monthly] incomplete mandate response', {
        hasSubscription: !!enrollment.subscriptionToken,
        hasMandate: !!enrollment.mandateId,
        hasQr: !!enrollment.qrCode,
      })
      throw createError({ statusCode: 502, statusMessage: 'A SyncPay não retornou os dados do mandato Pix Automático.' })
    }

    const metadata: Record<string, string> = {
      source: 'assinaturavip',
      plan_key: 'vip_monthly',
      visitor_id: visitorId,
      billing_method: 'pix_automatico',
      subscription_token: enrollment.subscriptionToken,
      mandate_id: enrollment.mandateId,
      mandate_status: enrollment.mandateStatus || 'CREATED',
      subscription_status: String(enrollment.root?.status || 'pending_first_payment'),
    }

    // Keep the provider identifiers before attempting QR recovery. This avoids
    // losing a created mandate if SyncPay omits the Pix code from the enroll response.
    const { error: initialPersistError } = await supabase.from('payments').update({ metadata }).eq('id', payment.id)
    if (initialPersistError) {
      console.error('[checkout/vip-monthly] mandate tracking persistence failed', initialPersistError.code || 'unknown')
      throw createError({ statusCode: 503, statusMessage: 'A SyncPay criou a autorização, mas não consegui salvar o acompanhamento. Não tente novamente até falar com o suporte.' })
    }

    let qrCode = enrollment.qrCode
    let qrSource = qrCode ? 'enroll' : ''
    let lookupStatus = 0
    let lookupPayload: any = null
    if (!qrCode) {
      try {
        const lookupResponse = await fetch(`${base}/subscriptions/${encodeURIComponent(enrollment.subscriptionToken)}`, {
          headers,
          signal: AbortSignal.timeout(8000),
        })
        lookupStatus = lookupResponse.status
        if (lookupResponse.ok) {
          lookupPayload = await lookupResponse.json().catch(() => ({} as any))
          qrCode = extractPendingSubscriptionPix(lookupPayload)
          if (qrCode) qrSource = 'subscription_lookup'
        }
      } catch (lookupError: any) {
        console.warn('[checkout/vip-monthly] Pix recovery lookup failed', lookupError?.name || 'network_error')
      }
    }

    if (!qrCode) {
      metadata.qr_recovery = `missing_after_lookup_${lookupStatus || 'network_error'}`
      await supabase.from('payments').update({ metadata }).eq('id', payment.id)
      console.error('[checkout/vip-monthly] Pix code unavailable after recovery', {
        hasSubscription: true,
        hasMandate: true,
        lookupStatus: lookupStatus || 'network_error',
        enrollShape: responseShape(enrollPayload),
        lookupShape: lookupPayload ? responseShape(lookupPayload) : null,
      })
      throw createError({ statusCode: 502, statusMessage: 'A autorização foi criada, mas o Pix ainda não veio. Ela ficou registrada; não gere outra até resolvermos.' })
    }

    metadata.qr_source = qrSource
    const { error: updateError } = await supabase.from('payments').update({ pix_qr_code: qrCode, metadata }).eq('id', payment.id)
    if (updateError) {
      console.error('[checkout/vip-monthly] mandate persistence failed', updateError.code || 'unknown')
      throw createError({ statusCode: 503, statusMessage: 'A autorização foi iniciada, mas não consegui salvar o acompanhamento. Não tente autorizar outra vez; fale com o suporte.' })
    }

    return {
      ok: true,
      payment_id: payment.id,
      subscription_status: metadata.subscription_status,
      mandate_id: enrollment.mandateId,
      mandate_status: metadata.mandate_status,
      pix_code: qrCode,
      amount: EXPECTED_AMOUNT,
      periodicity_days: EXPECTED_PERIOD_DAYS,
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    await supabase.from('payments').update({ status: 'failed', failed_at: new Date().toISOString() }).eq('id', payment.id)
    console.error('[checkout/vip-monthly] provider request failed', error?.name || 'network_error')
    throw createError({ statusCode: 502, statusMessage: 'Não consegui falar com a SyncPay. Tente novamente em instantes.' })
  }
})
