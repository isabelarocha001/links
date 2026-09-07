/**
 * POST /api/checkout/stripe-session
 * Cria Stripe Checkout embutido (ui_mode: embedded) — popup na conversa, sem redirecionar o lead.
 *
 * Body: { plan_key?, amount, title?, visitor_id?, source?, currency? }
 * Retorno: { ok, client_secret, session_id, payment_id, amount, publishable_key }
 *
 * Secret: STRIPE_SECRET_KEY / NUXT_STRIPE_SECRET_KEY / app_secrets
 * Public: STRIPE_PUBLISHABLE_KEY (só para o client montar o embed)
 */
import { useServiceSupabase, getClientIp } from '../../utils/supabase'

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

/** Lê chaves Stripe só do Supabase `app_secrets` (sem env Vercel). */
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
      statusMessage: 'Stripe não configurado. Cadastre STRIPE_SECRET_KEY em app_secrets (Supabase).',
    })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const planKey = String(body?.plan_key || '').trim() || 'custom'
  const plan = PLAN_FALLBACK[planKey]
  const amount = Number(body?.amount)
  const finalAmount =
    Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : plan?.amount
  if (!finalAmount || finalAmount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid amount' })
  }

  const title = String(body?.title || plan?.title || planKey).slice(0, 80)
  const visitor_id = body?.visitor_id ? String(body.visitor_id).slice(0, 120) : null
  const source = String(body?.source || 'links_stripe').slice(0, 60)
  const currency = String(body?.currency || 'brl').toLowerCase().slice(0, 3) || 'brl'
  const ip = getClientIp(event)

  let origin = ''
  try {
    origin = getRequestURL(event).origin
  } catch {}
  if (!origin || origin.includes('localhost')) {
    origin = String(body?.return_origin || 'https://wanessabsx.vercel.app').replace(/\/$/, '')
  }

  const unitAmount = Math.round(finalAmount * 100) // centavos
  if (unitAmount < 50) {
    throw createError({ statusCode: 400, statusMessage: 'Amount too low for Stripe' })
  }

  // Stripe API (sem SDK — fetch nativo, menos dependência no deploy)
  const params = new URLSearchParams()
  params.append('mode', 'payment')
  params.append('ui_mode', 'embedded')
  params.append('return_url', `${origin}/?stripe_return=1&session_id={CHECKOUT_SESSION_ID}`)
  params.append('line_items[0][quantity]', '1')
  params.append('line_items[0][price_data][currency]', currency)
  params.append('line_items[0][price_data][unit_amount]', String(unitAmount))
  params.append('line_items[0][price_data][product_data][name]', title)
  params.append('metadata[plan_key]', planKey)
  params.append('metadata[source]', source)
  if (visitor_id) params.append('metadata[visitor_id]', visitor_id)
  params.append('payment_intent_data[metadata][plan_key]', planKey)
  params.append('payment_intent_data[metadata][source]', source)
  if (visitor_id) params.append('payment_intent_data[metadata][visitor_id]', visitor_id)

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  const session = await stripeRes.json().catch(() => ({} as any))
  if (!stripeRes.ok || !session?.client_secret) {
    console.error('[stripe-session]', stripeRes.status, session)
    throw createError({
      statusCode: 502,
      statusMessage: session?.error?.message || `Stripe error ${stripeRes.status}`,
    })
  }

  const supabase = useServiceSupabase()
  let paymentId: string | null = null
  try {
    const { data } = await supabase
      .from('payments')
      .insert({
        external_id: session.id,
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
          stripe_session_id: session.id,
        },
      })
      .select('id')
      .single()
    paymentId = data?.id || null
  } catch (e: any) {
    console.error('[stripe-session] payments insert', e?.message || e)
  }

  const publishable = await loadStripePublishable()
  if (!publishable) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Stripe publishable key ausente em app_secrets (STRIPE_PUBLISHABLE_KEY).',
    })
  }

  return {
    ok: true,
    mode: 'stripe_embedded',
    client_secret: session.client_secret,
    session_id: session.id,
    payment_id: paymentId,
    amount: finalAmount,
    currency,
    plan_key: planKey,
    publishable_key: publishable,
  }
})
