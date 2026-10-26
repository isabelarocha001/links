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

  // Limite de pendentes: abandona tentativas antigas (>15 min) e no máx. 5 ativas
  const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      metadata: { abandoned: true, reason: 'stale_pending' },
    })
    .eq('status', 'pending')
    .eq('payment_method', 'stripe_vip')
    .contains('metadata', {
      visitor_id: visitorId,
      plan_key: catalog.plan_key,
      currency,
    })
    .lt('created_at', pendingCutoff)

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

  if ((pendingCount || 0) >= 5) {
    // Libera as mais antigas para não travar o visitante
    const { data: oldRows } = await supabase
      .from('payments')
      .select('id')
      .eq('status', 'pending')
      .eq('payment_method', 'stripe_vip')
      .contains('metadata', { visitor_id: visitorId, plan_key: catalog.plan_key, currency })
      .order('created_at', { ascending: true })
      .limit(Math.max(0, (pendingCount || 0) - 2))

    if (oldRows?.length) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          metadata: { abandoned: true, reason: 'pending_cap' },
        })
        .in(
          'id',
          oldRows.map((r: any) => r.id),
        )
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
  const metaCommon: Record<string, string> = {
    payment_id: payment.id,
    plan_key: catalog.plan_key,
    plan,
    source: 'assinaturavip',
    visitor_id: visitorId,
    currency,
  }

  let clientSecret = ''
  let externalId = ''
  let stripeSubscriptionId: string | null = null
  let stripePaymentIntentId: string | null = null
  let stripeCustomerId: string | null = null

  const idempotencyKey = `vip-el-${payment.id}-${plan}-${currency}`

  if (mode === 'subscription') {
    // 1) Customer anônimo (API exige customer na subscription)
    const custParams = new URLSearchParams()
    for (const [k, v] of Object.entries(metaCommon)) {
      custParams.append(`metadata[${k}]`, v)
    }
    custParams.append('metadata[role]', 'vip_checkout')
    const { ok: custOk, data: customer } = await stripeForm(
      secrets.secret,
      'customers',
      custParams,
      `vip-cust-${payment.id}`,
    )
    const customerId = String(customer?.id || '')
    stripeCustomerId = customerId
    if (!custOk || !customerId) {
      await supabase
        .from('payments')
        .update({ status: 'failed', failed_at: new Date().toISOString() })
        .eq('id', payment.id)
      console.error('[stripe-vip-session] customer create failed', customer?.error?.code || 'err')
      throw createError({ statusCode: 502, statusMessage: 'Stripe could not start card payment.' })
    }

    // 2) Subscription incompleta → client_secret (confirmation_secret na API atual)
    const params = new URLSearchParams()
    params.append('customer', customerId)
    params.append('items[0][price]', priceId)
    params.append('items[0][quantity]', '1')
    params.append('payment_behavior', 'default_incomplete')
    params.append('payment_settings[save_default_payment_method]', 'on_subscription')
    params.append('payment_settings[payment_method_types][0]', 'card')
    params.append('expand[]', 'latest_invoice.confirmation_secret')
    params.append('expand[]', 'latest_invoice.payment_intent')
    for (const [k, v] of Object.entries(metaCommon)) {
      params.append(`metadata[${k}]`, v)
    }
    const { ok, status, data: sub } = await stripeForm(
      secrets.secret,
      'subscriptions',
      params,
      idempotencyKey,
    )
    const inv = typeof sub?.latest_invoice === 'object' && sub?.latest_invoice ? sub.latest_invoice : null
    const conf = inv?.confirmation_secret
    const pi = inv?.payment_intent
    const piObj = typeof pi === 'object' && pi ? pi : null
    clientSecret = String(
      (conf && conf.client_secret) ||
        piObj?.client_secret ||
        '',
    )
    // Extrai pi_ do client_secret quando payment_intent não vem expandido
    const secretPiMatch = clientSecret.match(/^(pi_[^_]+)/)
    stripePaymentIntentId = String(piObj?.id || secretPiMatch?.[1] || '')
    stripeSubscriptionId = String(sub?.id || '')
    externalId = stripePaymentIntentId || stripeSubscriptionId
    if (!ok || !clientSecret || !externalId) {
      await supabase
        .from('payments')
        .update({ status: 'failed', failed_at: new Date().toISOString() })
        .eq('id', payment.id)
      console.error(
        '[stripe-vip-session] subscription create failed',
        status,
        sub?.error?.message || sub?.error?.code || 'err',
        inv ? 'has_invoice' : 'no_invoice',
      )
      throw createError({ statusCode: 502, statusMessage: 'Stripe could not start card payment.' })
    }
  } else {
    // Vitalício: PaymentIntent one-shot (Payment Element)
    const params = new URLSearchParams()
    params.append('amount', String(expectedCents))
    params.append('currency', currency.toLowerCase())
    params.append('payment_method_types[0]', 'card')
    params.append('description', String(catalog.title || 'VIP'))
    for (const [k, v] of Object.entries(metaCommon)) {
      params.append(`metadata[${k}]`, v)
    }
    const { ok, status, data: pi } = await stripeForm(
      secrets.secret,
      'payment_intents',
      params,
      idempotencyKey,
    )
    clientSecret = String(pi?.client_secret || '')
    stripePaymentIntentId = String(pi?.id || '')
    externalId = stripePaymentIntentId
    if (!ok || !clientSecret || !externalId) {
      await supabase
        .from('payments')
        .update({ status: 'failed', failed_at: new Date().toISOString() })
        .eq('id', payment.id)
      console.error('[stripe-vip-session] payment_intent create failed', status, pi?.error?.code || 'err')
      throw createError({ statusCode: 502, statusMessage: 'Stripe could not start card payment.' })
    }
  }

  const capability = mintCapabilityToken(secrets.capabilitySecret, payment.id, visitorId)

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      external_id: externalId,
      metadata: {
        source: 'assinaturavip',
        plan_key: catalog.plan_key,
        plan,
        visitor_id: visitorId,
        currency,
        provider: 'stripe',
        mode,
        ui: 'payment_element',
        recurrence: validated.recurrence.label_key,
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        // Nunca persistir client_secret
      },
    })
    .eq('id', payment.id)

  if (updateError) {
    console.error('[stripe-vip-session] persist intent id failed', updateError.code || 'unknown')
    throw createError({
      statusCode: 503,
      statusMessage: 'Payment created but could not be tracked. Do not pay yet; try again.',
    })
  }

  setHeader(event, 'Cache-Control', 'no-store')
  return {
    ok: true,
    payment_id: payment.id,
    payment_intent_id: stripePaymentIntentId,
    subscription_id: stripeSubscriptionId,
    client_secret: clientSecret,
    publishable_key: secrets.publishable,
    capability_token: capability,
    amount: expectedCents / 100,
    amount_cents: expectedCents,
    currency,
    plan,
    plan_key: catalog.plan_key,
    mode,
    ui: 'payment_element',
    recurrence: validated.recurrence.label_key,
    title: catalog.title,
    return_url: `${origin}/assinaturavip?stripe_vip=1&payment_id=${payment.id}`,
  }
})

/** GET leve: disponibilidade de cartão sem secrets. */
