/**
 * POST /api/quiz-icp
 * Cada clique/etapa do quiz ICP → tracking_events (Supabase Analistcs)
 * + notificação no webhook Telegram (canal de prévias / pressel).
 * Responde rápido; Telegram/DB em fire-and-forget quando possível.
 */

const PRESSEL_WEBHOOK =
  process.env.PRESSEL_WEBHOOK_URL ||
  'https://telegram-metricas.vercel.app/api/pressel'

const FALLBACK_SECRET =
  'trk_wanessa_ingest_9f3c2a7b1e8d4c6f0a5b7e9d2c4f6a8b'

const ALLOWED = new Set([
  'quiz_started',
  'quiz_welcome_continue',
  'quiz_answer',
  'quiz_abandoned',
  'quiz_blocked_repeat',
  'disqualified_underage',
  'disqualified_meeting',
  'disqualified_browsing',
  'disqualified_low_ticket',
  'disqualified_no_purchase_intent',
  'qualified',
  'whatsapp_clicked',
])

const INTENT_LABEL: Record<string, string> = {
  private: 'fotos/vídeos',
  custom: 'personalizado',
  sexting: 'sexting',
  call: 'chamada',
  company: 'só conversar',
  meet: 'encontro presencial',
  looking: 'só olhando',
  yes18: '18+',
  no18: 'menor',
  from4990: 'aceita a partir R$49,90',
  custom_pay: 'algo especial (mais)',
  below: 'menos de R$49,90',
  pix: 'PIX',
  card: 'cartão',
  chat_first: 'só conversar sem pagar',
  not_buy: 'não quer comprar',
}

function trackingSecret(): string {
  return (
    process.env.TRACKING_INGEST_SECRET ||
    process.env.PRESSEL_INGEST_SECRET ||
    FALLBACK_SECRET
  ).trim()
}

function clientIp(event: any): string {
  const xf = getHeader(event, 'x-forwarded-for') || ''
  const real = getHeader(event, 'x-real-ip') || ''
  return (xf.split(',')[0] || real || 'unknown').trim().slice(0, 64)
}

function prettyEvent(name: string, body: any): string {
  const step = body?.step != null ? Number(body.step) : null
  const opt = String(body?.option || body?.metadata?.option || '').trim()
  const optLabel = INTENT_LABEL[opt] || opt
  const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {}

  switch (name) {
    case 'quiz_started':
      return '🟢 Quiz WA aberto'
    case 'quiz_welcome_continue':
      return '➡️ Leu o aviso e continuou'
    case 'quiz_answer':
      return `🔘 Etapa ${(step ?? 0) + 1}: ${optLabel || opt || '?'}`
    case 'quiz_abandoned':
      return `🚪 Abandonou na etapa ${(body?.abandon_step ?? step ?? '?')}`
    case 'quiz_blocked_repeat':
      return '🚫 Tentou de novo (já desqualificado)'
    case 'disqualified_underage':
      return '❌ Desqualificado: menor de 18'
    case 'disqualified_meeting':
      return '❌ Desqualificado: quer encontro'
    case 'disqualified_browsing':
      return '❌ Desqualificado: só olhando'
    case 'disqualified_low_ticket':
      return '❌ Desqualificado: ticket < R$49,90'
    case 'disqualified_no_purchase_intent':
      return '❌ Desqualificado: não quer pagar'
    case 'qualified':
      return `✅ QUALIFICADO · ${INTENT_LABEL[answers.intent] || answers.intent || '?'} · ${INTENT_LABEL[answers.pay] || answers.pay || '?'}`
    case 'whatsapp_clicked':
      return '📲 Clicou Ir pro WhatsApp'
    default:
      return `📌 ${name}`
  }
}

function notifyTelegram(payload: Record<string, any>) {
  fetch(PRESSEL_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tracking-Secret': trackingSecret(),
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const eventName = String(body?.event_name || body?.event || '')
    .trim()
    .toLowerCase()
    .slice(0, 64)

  if (!ALLOWED.has(eventName)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid quiz event' })
  }

  let visitorId = String(body?.visitor_id || getCookie(event, 'vid') || '')
    .trim()
    .slice(0, 64)
  if (!visitorId || visitorId.length < 8) {
    visitorId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}`
  }

  setCookie(event, 'vid', visitorId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  const step = body?.step != null ? Number(body.step) : null
  const phase = String(body?.phase || '').slice(0, 32)
  const option = String(body?.option || '').slice(0, 40)
  const answers =
    body?.answers && typeof body.answers === 'object' ? body.answers : null
  const notifyText = prettyEvent(eventName, body)
  const ip = clientIp(event)

  const metadata = {
    quiz: 'icp_wa',
    phase: phase || null,
    step,
    option: option || null,
    answers,
    notify_text: notifyText,
    ip,
    ...(body?.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
  }

  // Supabase Analistcs — tracking_events
  let stored = false
  let storeReason: string | null = null
  try {
    const supabase = useServiceSupabase()
    const { error } = await supabase.from('tracking_events').insert({
      visitor_id: visitorId,
      event_name: eventName,
      occurred_at: new Date().toISOString(),
      path: '/quiz-icp',
      offer_slug: 'quiz_icp_wa',
      utm_source: body?.utm_source || null,
      utm_medium: body?.utm_medium || null,
      utm_campaign: body?.utm_campaign || null,
      utm_content: body?.utm_content || null,
      utm_term: body?.utm_term || null,
      src: body?.src || null,
      sck: body?.sck || null,
      metadata,
    })
    if (error) storeReason = error.message
    else stored = true
  } catch (e: any) {
    storeReason = e?.message || 'db_error'
  }

  // Telegram canal (pressel webhook) — fire-and-forget
  notifyTelegram({
    visitor_id: visitorId,
    event_name: eventName,
    path: '/quiz-icp',
    offer_slug: 'quiz_icp_wa',
    utm_source: body?.utm_source || null,
    utm_medium: body?.utm_medium || null,
    utm_campaign: body?.utm_campaign || null,
    metadata: {
      ...metadata,
      channel: 'quiz_icp',
      source: 'wanessa_links',
      button: option || eventName,
      label: notifyText,
    },
  })

  return {
    ok: true,
    visitor_id: visitorId,
    event_name: eventName,
    stored,
    store_reason: storeReason,
    telegram_queued: true,
  }
})
