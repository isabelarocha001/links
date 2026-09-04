import { useServiceSupabase, getClientIp } from '../../utils/supabase'

type PlanKey = 'chat_quick' | 'chat_basic' | 'chat_midia'

const PLAN_FALLBACK: Record<PlanKey, { title: string; amount: number }> = {
  chat_quick: { title: 'Chat rápido 10 min', amount: 9.9 },
  chat_basic: { title: 'Chat 30 min', amount: 19.9 },
  chat_midia: { title: 'Chat + mídias', amount: 29.9 },
}

async function getSyncPayToken(clientId: string, clientSecret: string) {
  const res = await fetch('https://api.syncpayments.com.br/api/partner/v1/auth-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.access_token) {
    throw createError({ statusCode: 502, statusMessage: data?.message || 'Falha auth SyncPay' })
  }
  return String(data.access_token)
}

async function loadSyncPayCredentials() {
  const config = useRuntimeConfig()
  let clientId = String(config.syncpayClientId || process.env.SYNCPAY_CLIENT_ID || '').trim()
  let clientSecret = String(config.syncpayClientSecret || process.env.SYNCPAY_CLIENT_SECRET || '').trim()

  if (!clientId || !clientSecret) {
    try {
      const supabase = useServiceSupabase()
      const { data } = await supabase
        .from('app_secrets')
        .select('key, value')
        .in('key', ['SYNCPAY_CLIENT_ID', 'SYNCPAY_CLIENT_SECRET'])
      for (const row of data || []) {
        if (row.key === 'SYNCPAY_CLIENT_ID' && row.value) clientId = String(row.value).trim()
        if (row.key === 'SYNCPAY_CLIENT_SECRET' && row.value) clientSecret = String(row.value).trim()
      }
    } catch {}
  }

  return { clientId, clientSecret }
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const planKey = String(body?.plan_key || '').trim() as PlanKey
  const plan = PLAN_FALLBACK[planKey]
  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Plano inválido' })
  }

  const amount = Number(body?.amount)
  const finalAmount = Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : plan.amount
  const title = String(body?.title || plan.title).slice(0, 80)
  const visitor_id = body?.visitor_id ? String(body.visitor_id).slice(0, 120) : null
  const source = String(body?.source || 'links_chat_lock').slice(0, 60)

  const { clientId, clientSecret } = await loadSyncPayCredentials()
  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'SyncPay não configurado (SYNCPAY_CLIENT_ID / SECRET)',
    })
  }

  const token = await getSyncPayToken(clientId, clientSecret)

  // Cliente genérico low-friction (SyncPay exige dados básicos)
  const client = {
    name: 'Cliente Links',
    email: `lead+${Date.now()}@wanessa.links`,
    cpf: '00000000000',
    phone: '11999999999',
  }

  const webhookUrl =
    String(useRuntimeConfig().syncpayWebhookUrl || process.env.SYNCPAY_WEBHOOK_URL || '').trim() ||
    undefined

  const cashInBody: Record<string, any> = {
    amount: finalAmount,
    description: `${title} · ${source}`,
    client,
  }
  if (webhookUrl) cashInBody.webhook_url = webhookUrl

  const payRes = await fetch('https://api.syncpayments.com.br/api/partner/v1/cash-in', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cashInBody),
  })
  const payData = await payRes.json().catch(() => ({}))

  if (!payRes.ok) {
    console.error('[checkout/pix] syncpay error', payData)
    throw createError({
      statusCode: 502,
      statusMessage: payData?.message || payData?.error || 'Erro ao gerar PIX na SyncPay',
    })
  }

  const externalId = String(payData?.id || payData?.identifier || payData?.transaction_id || '')
  const pixCode = String(
    payData?.pix_code ||
      payData?.qr_code ||
      payData?.copy_paste ||
      payData?.payment_data?.pix_code ||
      payData?.data?.pix_code ||
      '',
  )
  const qrImage = String(
    payData?.qr_code_image ||
      payData?.qr_image ||
      payData?.payment_data?.qr_code_image ||
      '',
  )

  if (!pixCode) {
    console.error('[checkout/pix] missing pix code', payData)
    throw createError({ statusCode: 502, statusMessage: 'SyncPay não retornou código PIX' })
  }

  const supabase = useServiceSupabase()
  const ip = getClientIp(event)
  let paymentId: string | null = null

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        external_id: externalId || null,
        payment_method: 'pix',
        status: 'pending',
        amount: finalAmount,
        currency: 'BRL',
        pix_qr_code: pixCode,
        metadata: {
          source,
          plan_key: planKey,
          title,
          visitor_id,
          ip,
          syncpay: payData,
        },
      })
      .select('id')
      .single()
    if (!error && data?.id) paymentId = data.id
  } catch (e: any) {
    console.error('[checkout/pix] payments insert', e?.message || e)
  }

  return {
    ok: true,
    payment_id: paymentId,
    external_id: externalId,
    pix_code: pixCode,
    qr_image: qrImage || null,
    amount: finalAmount,
    plan_key: planKey,
  }
})
