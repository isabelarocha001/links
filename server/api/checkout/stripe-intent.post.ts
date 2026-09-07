/**
 * POST /api/checkout/stripe-intent
 * Cria PaymentIntent Stripe — front monta formulário próprio (número/validade/CVV via Stripe Elements).
 * Chaves só em app_secrets (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY).
 */
import { useServiceSupabase, getClientIp } from '../../utils/supabase'
import {
  currencyFromLocaleTag,
  toStripeUnitAmount,
  formatMoney,
} from '../../../utils/currency'

const PLAN_FALLBACK: Record<string, { title: string; amount: number }> = {
  chat_quick: { title: 'Unlock chat', amount: 9.9 },
  chat_basic: { title: 'Chat 30 min', amount: 19.9 },
  chat_midia: { title: 'Chat + media', amount: 29.9 },
  pack_basic: { title: 'Pack', amount: 29.9 },
  pack_gold: { title: 'Pack Gold', amount: 79.9 },
  pack_combo: { title: 'Combo', amount: 109.9 },
  vid_10: { title: 'Video call 10 min', amount: 99.9 },
  vid_20: { title: 'Video call 20 min', amount: 149.9 },
  vid_30: { title: 'Video call 30 min', amount: 229.9 },
  web_7: { title: 'Web dating 7 days', amount: 179.9 },
  web_15: { title: 'Web dating 15 days', amount: 299.9 },
  web_30: { title: 'Web dating 30 days', amount: 499.9 },
  chat_unlock_segunda_chance: { title: 'Second chance tip', amount: 29.9 },
  chat_unlock_blocked: { title: 'Unlock chat again', amount: 49.9 },
}

async function loadStripeSecret(): Promise<string> {
  const supabase = useServiceSupabase()
  const { data } = await supabase
    .from('app_secrets')
    .select('key, value')
    .in('key', ['STRIPE_SECRET_KEY', 'NUXT_STRIPE_SECRET_KEY'])
  for (const row of data || []) {
    const v = row?.value ? String(row.value).trim() : ''
    if (v.startsWith('sk_')) return v
  }
  return ''
}

async function loadStripePublishable(): Promise<string> {
  const supabase = useServiceSupabase()
  const { data } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', 'STRIPE_PUBLISHABLE_KEY')
    .maybeSingle()
  const v = data?.value ? String(data.value).trim() : ''
  return v.startsWith('pk_') ? v : ''
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const secret = await loadStripeSecret()
  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Stripe não configurado (STRIPE_SECRET_KEY em app_secrets).',
    })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const planKey = String(body?.plan_key || '').trim() || 'custom'
  const plan = PLAN_FALLBACK[planKey]
  // Preço base sempre em BRL (catálogo)
  const amountBrlRaw = Number(body?.amount_brl ?? body?.amount)
  const amountBrl =
    Number.isFinite(amountBrlRaw) && amountBrlRaw > 0
      ? Number(amountBrlRaw.toFixed(2))
      : plan?.amount
  if (!amountBrl || amountBrl <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid amount' })
  }

  const title = String(body?.title || plan?.title || planKey).slice(0, 80)
  const visitor_id = body?.visitor_id ? String(body.visitor_id).slice(0, 120) : null
  const source = String(body?.source || 'links_stripe').slice(0, 60)
  const ip = getClientIp(event)

  // Idioma/país do lead → moeda
  let localeTag = String(body?.locale_tag || body?.locale || '').trim()
  if (!localeTag) {
    const al = String(getHeader(event, 'accept-language') || '')
    localeTag = al.split(',')[0]?.trim() || 'en-US'
  }
  const money = currencyFromLocaleTag(localeTag)
  // body.currency opcional (override), senão detectado
  const currency = String(body?.currency || money.currency || 'usd').toLowerCase().slice(0, 3)

  // Mesmo valor numérico do plano (ex.: 9.90) — só muda a moeda do país, SEM conversão FX
  const finalAmount = amountBrl
  const unitAmount = toStripeUnitAmount(finalAmount, currency)
  if (unitAmount < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Amount too low for Stripe' })
  }

  const amountLabel = formatMoney(finalAmount, currency, localeTag)

  const params = new URLSearchParams()
  params.append('amount', String(unitAmount))
  params.append('currency', currency)
  params.append('automatic_payment_methods[enabled]', 'true')
  params.append('description', `${title} (${amountLabel})`)
  params.append('metadata[plan_key]', planKey)
  params.append('metadata[source]', source)
  params.append('metadata[amount_brl]', String(amountBrl))
  params.append('metadata[currency]', currency)
  params.append('metadata[locale_tag]', localeTag)
  params.append('metadata[region]', money.region)
  if (visitor_id) params.append('metadata[visitor_id]', visitor_id)

  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  const intent = await stripeRes.json().catch(() => ({} as any))
  if (!stripeRes.ok || !intent?.client_secret) {
    console.error('[stripe-intent]', stripeRes.status, intent)
    throw createError({
      statusCode: 502,
      statusMessage: intent?.error?.message || `Stripe error ${stripeRes.status}`,
    })
  }

  const supabase = useServiceSupabase()
  let paymentId: string | null = null
  try {
    const { data } = await supabase
      .from('payments')
      .insert({
        external_id: intent.id,
        payment_method: 'card',
        status: 'pending',
        amount: finalAmount,
        currency: currency.toUpperCase(),
        metadata: {
          source,
          plan_key: planKey,
          title,
          visitor_id,
          ip,
          provider: 'stripe',
          stripe_payment_intent: intent.id,
          amount_brl: amountBrl,
          currency,
          locale_tag: localeTag,
          region: money.region,
          amount_label: amountLabel,
        },
      })
      .select('id')
      .single()
    paymentId = data?.id || null
  } catch (e: any) {
    console.error('[stripe-intent] payments insert', e?.message || e)
  }

  const publishable = await loadStripePublishable()
  if (!publishable) {
    throw createError({
      statusCode: 503,
      statusMessage: 'STRIPE_PUBLISHABLE_KEY ausente em app_secrets.',
    })
  }

  return {
    ok: true,
    mode: 'stripe_elements',
    client_secret: intent.client_secret,
    payment_intent_id: intent.id,
    payment_id: paymentId,
    amount: finalAmount,
    amount_brl: amountBrl,
    amount_label: amountLabel,
    currency,
    region: money.region,
    locale_tag: localeTag,
    plan_key: planKey,
    publishable_key: publishable,
  }
})
