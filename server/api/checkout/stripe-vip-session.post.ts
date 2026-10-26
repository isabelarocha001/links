/**
 * POST /api/checkout/stripe-vip-session
 * Cria Stripe Checkout Session embutida só para /assinaturavip.
 * O browser NÃO envia amount/price_id — servidor resolve catálogo + Price ativo.
 *
 * Body: { plan: 'monthly'|'lifetime', currency?: 'BRL', visitor_id, return_origin? }
 * Resposta: client_secret, publishable_key, payment_id, capability_token, amount, recurrence…
 */
import {
  assertRateLimit,
  clientIp,
  fetchAndValidatePrice,
  listVipStripeAvailability,
  loadVipStripeSecrets,
  mintCapabilityToken,
  resolveVipPlan,
  sanitizeOrigin,
  stripeForm,
  type VipStripeCurrency,
  type VipStripePlanKey,
} from '../../utils/stripe-vip'
import { useServiceSupabase } from '../../utils/supabase'
import { VIP_STRIPE_CATALOG, VIP_STRIPE_CURRENCIES } from '../../utils/stripe-vip-catalog.mjs'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const plan = resolveVipPlan(body?.plan || body?.plan_key)
  const currencyInput = String(body?.currency || 'BRL').toUpperCase().slice(0, 3)
  const visitorId = String(body?.visitor_id || '').trim()
  const origin = sanitizeOrigin(body?.return_origin || getHeader(event, 'origin'))

  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid plan.' })
  }
  if (!VIP_STRIPE_CURRENCIES.includes(currencyInput as VipStripeCurrency)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid currency.' })
  }
  const currency = currencyInput as VipStripeCurrency
  if (!UUID_RE.test(visitorId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid visitor.' })
  }
  // Rejeita qualquer tentativa de o cliente ditar preço
  if (body?.amount != null || body?.price_id || body?.unit_amount != null) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payment parameters.' })
  }

  const ip = clientIp(event)
  await assertRateLimit({
    key: `stripe_vip_sess:v:${visitorId}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
    retryAfterSec: 60,
  })
  await assertRateLimit({
    key: `stripe_vip_sess:ip:${ip}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
    retryAfterSec: 60,
  })

  const secrets = await loadVipStripeSecrets()
  if (!secrets.secret || !secrets.publishable) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Card payments are not configured.',
    })
  }

  const catalog = VIP_STRIPE_CATALOG[plan]
  const expectedCents = catalog.amount_cents[currency]
  const priceId = secrets.priceIds[plan][currency]
  if (!expectedCents || !priceId) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This plan/currency is not available for card payment.',
    })
  }

  const validated = await fetchAndValidatePrice(
    secrets.secret,
    priceId,
    plan,
    currency,
    expectedCents,
  )
  if (!validated.valid) {
    console.error('[stripe-vip-session] price validation failed', validated.reason)
    throw createError({
      statusCode: 503,
      statusMessage: 'Card price is misconfigured. Try Pix or contact support.',
    })
  }

  const supabase = useServiceSupabase()

  // Limite: no máximo 3 sessões pendentes por visitante+plano+moeda
  const { count: pendingCount } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('payment_method', 'stripe_vip')
    .contains('metadata', {
      visitor_id: visitorId,
      plan_key: catalog.plan_key,
      currency,
    })

  if ((pendingCount || 0) >= 3) {
    // Tenta reutilizar a mais recente com session ainda aberta
    const { data: recent } = await supabase
      .from('payments')
      .select('id, external_id, metadata, amount')
      .eq('status', 'pending')
      .eq('payment_method', 'stripe_vip')
      .contains('metadata', { visitor_id: visitorId, plan_key: catalog.plan_key, currency })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent?.external_id && recent.metadata?.stripe_client_secret_hint !== 'cleared') {
      // Não devolvemos client_secret antigo (pode ter expirado). Cria nova sessão abaixo
      // mas respeita o limite — falha se já tem 3
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many pending card attempts. Finish or wait before trying again.',
      })
    }
  }

  const { data: payment, error: insertError } = await supabase
    .from('payments')
    .insert({
      external_id: null,
      payment_method: 'stripe_vip',
      status: 'pending',
      amount: expectedCents / 100,
      currency,
      metadata: {
        source: 'assinaturavip',
        plan_key: catalog.plan_key,
        plan,
        visitor_id: visitorId,
        currency,
        provider: 'stripe',
        mode: plan === 'monthly' ? 'subscription' : 'payment',
        recurrence: validated.recurrence.label_key,
      },
    })
    .select('id')
    .single()

  if (insertError || !payment?.id) {
    console.error('[stripe-vip-session] payment insert failed', insertError?.code || 'unknown')
    throw createError({ statusCode: 503, statusMessage: 'Could not start card checkout.' })
  }

  const mode = plan === 'monthly' ? 'subscription' : 'payment'
  const params = new URLSearchParams()
  params.append('mode', mode)
  params.append('ui_mode', 'embedded')
  params.append('return_url', `${origin}/assinaturavip?stripe_vip=1&payment_id=${payment.id}`)
  params.append('line_items[0][price]', priceId)
  params.append('line_items[0][quantity]', '1')
  params.append('metadata[payment_id]', payment.id)
  params.append('metadata[plan_key]', catalog.plan_key)
  params.append('metadata[plan]', plan)
  params.append('metadata[source]', 'assinaturavip')
  params.append('metadata[visitor_id]', visitorId)
  params.append('metadata[currency]', currency)
  if (mode === 'subscription') {
    params.append('subscription_data[metadata][payment_id]', payment.id)
    params.append('subscription_data[metadata][plan_key]', catalog.plan_key)
    params.append('subscription_data[metadata][source]', 'assinaturavip')
    params.append('subscription_data[metadata][visitor_id]', visitorId)
  }

  const idempotencyKey = `vip-${payment.id}-${plan}-${currency}`
  const { ok, status, data: session } = await stripeForm(
    secrets.secret,
    'checkout/sessions',
    params,
    idempotencyKey,
  )

  if (!ok || !session?.client_secret || !session?.id) {
    await supabase
      .from('payments')
      .update({ status: 'failed', failed_at: new Date().toISOString() })
      .eq('id', payment.id)
    console.error('[stripe-vip-session] session create failed', status, session?.error?.code || 'err')
    throw createError({ statusCode: 502, statusMessage: 'Stripe could not create the session.' })
  }

  const capability = mintCapabilityToken(secrets.capabilitySecret, payment.id, visitorId)

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      external_id: session.id,
      metadata: {
        source: 'assinaturavip',
        plan_key: catalog.plan_key,
        plan,
        visitor_id: visitorId,
        currency,
        provider: 'stripe',
        mode,
        recurrence: validated.recurrence.label_key,
        stripe_session_id: session.id,
        // Nunca persistir client_secret
      },
    })
    .eq('id', payment.id)

  if (updateError) {
    console.error('[stripe-vip-session] persist session id failed', updateError.code || 'unknown')
    // Não devolve client_secret se não rastreou
    throw createError({
      statusCode: 503,
      statusMessage: 'Session created but could not be tracked. Do not pay yet; try again.',
    })
  }

  setHeader(event, 'Cache-Control', 'no-store')
  return {
    ok: true,
    payment_id: payment.id,
    session_id: session.id,
    client_secret: session.client_secret,
    publishable_key: secrets.publishable,
    capability_token: capability,
    amount: expectedCents / 100,
    amount_cents: expectedCents,
    currency,
    plan,
    plan_key: catalog.plan_key,
    mode,
    recurrence: validated.recurrence.label_key,
    title: catalog.title,
  }
})

/** GET leve: disponibilidade de cartão sem secrets. */
