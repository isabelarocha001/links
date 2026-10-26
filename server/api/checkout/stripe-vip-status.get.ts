/**
 * GET /api/checkout/stripe-vip-status?payment_id=&capability=
 * Status da compra VIP Stripe. NÃO confia só em payments.status=approved:
 * quando possível consulta a Session no Stripe. Capability token obrigatório.
 */
import {
  assertRateLimit,
  clientIp,
  loadVipStripeSecrets,
  stripeGet,
  verifyCapabilityToken,
} from '../../utils/stripe-vip'
import { useServiceSupabase } from '../../utils/supabase'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const q = getQuery(event)
  const paymentId = String(q.payment_id || '').trim()
  const capability = String(q.capability || q.capability_token || '').trim()

  if (!UUID_RE.test(paymentId) || !capability) {
    throw createError({ statusCode: 400, statusMessage: 'Missing payment credentials.' })
  }

  const ip = clientIp(event)
  await assertRateLimit({
    key: `stripe_vip_status:p:${paymentId}`,
    limit: 5,
    windowMs: 60 * 1000,
    retryAfterSec: 15,
  })
  await assertRateLimit({
    key: `stripe_vip_status:ip:${ip}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
    retryAfterSec: 30,
  })

  const secrets = await loadVipStripeSecrets()
  if (!secrets.capabilitySecret) {
    throw createError({ statusCode: 503, statusMessage: 'Status unavailable.' })
  }

  const cap = verifyCapabilityToken(secrets.capabilitySecret, capability, paymentId)
  if (!cap.ok) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid or expired capability.' })
  }

  const supabase = useServiceSupabase()
  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, status, amount, currency, external_id, payment_method, metadata, created_at')
    .eq('id', paymentId)
    .eq('payment_method', 'stripe_vip')
    .maybeSingle()

  if (error || !payment) {
    throw createError({ statusCode: 404, statusMessage: 'Payment not found.' })
  }

  // Garante que o token é do visitor da ordem
  if (String(payment.metadata?.visitor_id || '') !== String(cap.visitorId || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid capability for this payment.' })
  }

  let providerStatus: string | null = null
  let paymentStatus: string | null = null
  let paid = false

  if (secrets.secret && payment.external_id) {
    const ext = String(payment.external_id)
    let ok = false
    let data: any = null

    if (ext.startsWith('pi_')) {
      ;({ ok, data } = await stripeGet(secrets.secret, `payment_intents/${encodeURIComponent(ext)}`))
      if (ok && data?.id) {
        providerStatus = String(data.status || '')
        paymentStatus = providerStatus
        paid = providerStatus === 'succeeded'
      }
    } else if (ext.startsWith('sub_')) {
      ;({ ok, data } = await stripeGet(
        secrets.secret,
        `subscriptions/${encodeURIComponent(ext)}?expand[]=${encodeURIComponent('latest_invoice.payment_intent')}`,
      ))
      if (ok && data?.id) {
        providerStatus = String(data.status || '')
        const pi = data?.latest_invoice?.payment_intent
        const piStatus = typeof pi === 'object' && pi ? String(pi.status || '') : ''
        paymentStatus = piStatus || providerStatus
        paid = piStatus === 'succeeded' || ['active', 'trialing'].includes(providerStatus)
      }
    } else if (ext.startsWith('cs_')) {
      // Legacy Checkout Session
      ;({ ok, data } = await stripeGet(
        secrets.secret,
        `checkout/sessions/${encodeURIComponent(ext)}`,
      ))
      if (ok && data?.id) {
        providerStatus = String(data.status || '')
        paymentStatus = String(data.payment_status || '')
        paid = paymentStatus === 'paid'
      }
    } else {
      ok = false
    }

    if (ok && data?.id) {
      if (paid && payment.status !== 'approved') {
        await supabase
          .from('payments')
          .update({
            status: 'approved',
            metadata: {
              ...(payment.metadata || {}),
              stripe_payment_status: paymentStatus,
              stripe_provider_status: providerStatus,
              confirmed_via: 'status_poll',
            },
          })
          .eq('id', payment.id)
          .eq('status', 'pending')
      }
    } else {
      setHeader(event, 'Retry-After', '15')
      return {
        ok: true,
        payment_id: payment.id,
        status: payment.status === 'approved' ? 'pending' : payment.status,
        paid: false,
        provider_unreachable: true,
        amount: payment.amount,
        currency: payment.currency,
      }
    }
  } else {
    // Sem secret ou external_id: nunca trata status local approved como pago definitivo
    paid = false
  }

  setHeader(event, 'Cache-Control', 'no-store')
  return {
    ok: true,
    payment_id: payment.id,
    status: paid ? 'approved' : payment.status === 'failed' ? 'failed' : 'pending',
    paid,
    provider_status: providerStatus,
    payment_status: paymentStatus,
    amount: payment.amount,
    currency: payment.currency,
    plan_key: payment.metadata?.plan_key || null,
  }
})
