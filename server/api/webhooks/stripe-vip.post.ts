/**
 * POST /api/webhooks/stripe-vip
 * Webhook dedicado ao checkout VIP Stripe. Fail-closed sem whsec.
 * Não desbloqueia chat nem outros produtos.
 *
 * Eventos: checkout.session.completed, checkout.session.async_payment_*,
 * checkout.session.expired, invoice.paid, invoice.payment_failed,
 * customer.subscription.updated|deleted
 */
import {
  loadVipStripeSecrets,
  stripeGet,
  verifyStripeWebhookSignature,
} from '../../utils/stripe-vip'
import { useServiceSupabase } from '../../utils/supabase'

const RELEVANT = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const rawBody = await readRawBody(event, 'utf8')
  if (!rawBody || rawBody.length > 512_000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body.' })
  }

  const secrets = await loadVipStripeSecrets()
  // Fail closed
  if (!secrets.webhookSecret) {
    console.error('[stripe-vip-webhook] missing STRIPE_VIP_WEBHOOK_SECRET')
    throw createError({ statusCode: 503, statusMessage: 'Webhook not configured.' })
  }

  const sig = getHeader(event, 'stripe-signature')
  if (!verifyStripeWebhookSignature(rawBody, sig, secrets.webhookSecret)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature.' })
  }

  let stripeEvent: any
  try {
    stripeEvent = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON.' })
  }

  const eventId = String(stripeEvent?.id || '')
  const type = String(stripeEvent?.type || '')
  if (!eventId.startsWith('evt_') || !type) {
    throw createError({ statusCode: 400, statusMessage: 'Malformed event.' })
  }

  if (!RELEVANT.has(type)) {
    return { received: true, ignored: true }
  }

  const supabase = useServiceSupabase()

  // Idempotência: tenta gravar event.id
  try {
    const { error: dedupErr } = await supabase.from('stripe_vip_events').insert({
      event_id: eventId,
      type,
      created_at: new Date().toISOString(),
    })
    if (dedupErr) {
      // unique violation → já processado
      if (String(dedupErr.code) === '23505' || /duplicate|unique/i.test(String(dedupErr.message))) {
        return { received: true, duplicate: true }
      }
      // tabela ausente: continua com best-effort (documentado)
      console.error('[stripe-vip-webhook] dedup table', dedupErr.code || 'missing')
    }
  } catch (e: any) {
    console.error('[stripe-vip-webhook] dedup error', e?.message || 'err')
  }

  const obj = stripeEvent?.data?.object || {}

  try {
    if (
      type === 'checkout.session.completed' ||
      type === 'checkout.session.async_payment_succeeded'
    ) {
      await handleSessionPaid(supabase, secrets.secret, obj)
    } else if (
      type === 'checkout.session.async_payment_failed' ||
      type === 'checkout.session.expired'
    ) {
      await handleSessionFailed(supabase, obj, type)
    } else if (type === 'payment_intent.succeeded') {
      await handlePaymentIntentSucceeded(supabase, secrets.secret, obj)
    } else if (type === 'payment_intent.payment_failed') {
      await handlePaymentIntentFailed(supabase, obj)
    } else if (type === 'invoice.paid') {
      await handleInvoicePaid(supabase, secrets.secret, obj)
    } else if (type === 'invoice.payment_failed') {
      await handleInvoiceFailed(supabase, obj)
    } else if (type === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(supabase, obj)
    } else if (type === 'customer.subscription.updated') {
      // registra estado; renovação só com invoice.paid
      await handleSubscriptionUpdated(supabase, obj)
    }
  } catch (e: any) {
    console.error('[stripe-vip-webhook] handler', type, e?.message || 'err')
    // 500 faz a Stripe reenviar
    throw createError({ statusCode: 500, statusMessage: 'Handler failed.' })
  }

  return { received: true }
})

async function handleSessionPaid(supabase: any, secret: string, session: any) {
  const sessionId = String(session?.id || '')
  const paymentId = String(session?.metadata?.payment_id || '')
  const source = String(session?.metadata?.source || '')
  if (!sessionId || source !== 'assinaturavip') return

  // Confirma no Stripe (não confia só no payload)
  if (secret) {
    const { ok, data } = await stripeGet(secret, `checkout/sessions/${encodeURIComponent(sessionId)}`)
    if (!ok || data?.payment_status !== 'paid') {
      console.error('[stripe-vip-webhook] session not paid on retrieve', sessionId)
      return
    }
  } else {
    return
  }

  if (paymentId) {
    const { data: row } = await supabase
      .from('payments')
      .select('id, status, metadata')
      .eq('id', paymentId)
      .eq('payment_method', 'stripe_vip')
      .maybeSingle()
    if (!row) return
    if (row.status === 'approved') return

    await supabase
      .from('payments')
      .update({
        status: 'approved',
        external_id: sessionId,
        metadata: {
          ...(row.metadata || {}),
          stripe_session_id: sessionId,
          stripe_customer_id: session.customer || null,
          stripe_subscription_id: session.subscription || null,
          stripe_payment_status: 'paid',
          confirmed_via: 'webhook_session',
        },
      })
      .eq('id', paymentId)
      .eq('status', 'pending')
  }
}

async function handleSessionFailed(supabase: any, session: any, type: string) {
  const paymentId = String(session?.metadata?.payment_id || '')
  if (!paymentId || String(session?.metadata?.source || '') !== 'assinaturavip') return
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      metadata: { stripe_fail_event: type },
    })
    .eq('id', paymentId)
    .eq('payment_method', 'stripe_vip')
    .eq('status', 'pending')
}

async function handlePaymentIntentSucceeded(supabase: any, secret: string, pi: any) {
  const paymentId = String(pi?.metadata?.payment_id || '')
  const source = String(pi?.metadata?.source || '')
  if (!paymentId || source !== 'assinaturavip') return
  if (secret) {
    const { ok, data } = await stripeGet(secret, `payment_intents/${encodeURIComponent(String(pi.id || ''))}`)
    if (!ok || data?.status !== 'succeeded') {
      console.error('[stripe-vip-webhook] PI not succeeded on retrieve', pi?.id)
      return
    }
  } else {
    return
  }
  const { data: row } = await supabase
    .from('payments')
    .select('id, status, metadata')
    .eq('id', paymentId)
    .eq('payment_method', 'stripe_vip')
    .maybeSingle()
  if (!row || row.status === 'approved') return
  await supabase
    .from('payments')
    .update({
      status: 'approved',
      external_id: String(pi.id || row.id),
      metadata: {
        ...(row.metadata || {}),
        stripe_payment_intent_id: pi.id || null,
        stripe_payment_status: 'succeeded',
        confirmed_via: 'webhook_payment_intent',
      },
    })
    .eq('id', paymentId)
    .eq('status', 'pending')
}

async function handlePaymentIntentFailed(supabase: any, pi: any) {
  const paymentId = String(pi?.metadata?.payment_id || '')
  if (!paymentId || String(pi?.metadata?.source || '') !== 'assinaturavip') return
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      metadata: { stripe_fail_event: 'payment_intent.payment_failed' },
    })
    .eq('id', paymentId)
    .eq('payment_method', 'stripe_vip')
    .eq('status', 'pending')
}

async function handleInvoicePaid(supabase: any, secret: string, invoice: any) {
  // Renovação mensal: só estende após invoice paga confirmada
  const subId = String(invoice?.subscription || '')
  if (!subId) return
  const { data: rows } = await supabase
    .from('payments')
    .select('id, metadata, status')
    .eq('payment_method', 'stripe_vip')
    .contains('metadata', { stripe_subscription_id: subId })
    .limit(5)

  for (const row of rows || []) {
    await supabase
      .from('payments')
      .update({
        status: 'approved',
        metadata: {
          ...(row.metadata || {}),
          last_invoice_paid: invoice.id || null,
          last_invoice_paid_at: new Date().toISOString(),
          confirmed_via: 'webhook_invoice',
        },
      })
      .eq('id', row.id)
  }
}

async function handleInvoiceFailed(supabase: any, invoice: any) {
  const subId = String(invoice?.subscription || '')
  if (!subId) return
  // Marca metadata; não revoga automaticamente no mesmo instante (grace)
  const { data: rows } = await supabase
    .from('payments')
    .select('id, metadata')
    .eq('payment_method', 'stripe_vip')
    .contains('metadata', { stripe_subscription_id: subId })
    .limit(5)
  for (const row of rows || []) {
    await supabase
      .from('payments')
      .update({
        metadata: {
          ...(row.metadata || {}),
          last_invoice_failed: invoice.id || null,
          last_invoice_failed_at: new Date().toISOString(),
        },
      })
      .eq('id', row.id)
  }
}

async function handleSubscriptionDeleted(supabase: any, sub: any) {
  const subId = String(sub?.id || '')
  if (!subId) return
  const { data: rows } = await supabase
    .from('payments')
    .select('id, metadata')
    .eq('payment_method', 'stripe_vip')
    .contains('metadata', { stripe_subscription_id: subId })
    .limit(5)
  for (const row of rows || []) {
    await supabase
      .from('payments')
      .update({
        metadata: {
          ...(row.metadata || {}),
          subscription_status: 'canceled',
          canceled_at: new Date().toISOString(),
        },
      })
      .eq('id', row.id)
  }
}

async function handleSubscriptionUpdated(supabase: any, sub: any) {
  const subId = String(sub?.id || '')
  if (!subId) return
  const { data: rows } = await supabase
    .from('payments')
    .select('id, metadata')
    .eq('payment_method', 'stripe_vip')
    .contains('metadata', { stripe_subscription_id: subId })
    .limit(5)
  for (const row of rows || []) {
    await supabase
      .from('payments')
      .update({
        metadata: {
          ...(row.metadata || {}),
          subscription_status: String(sub.status || ''),
        },
      })
      .eq('id', row.id)
  }
}
