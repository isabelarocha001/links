/**
 * POST /api/quiz
 * Body: { visitor_id, fingerprint, status: 'pass'|'reject', answers? }
 * Salva no Supabase e avisa o Telegram no final (resumo das respostas).
 */

const PRESSEL_WEBHOOK = 'https://telegram-metricas.vercel.app/api/pressel'
const FALLBACK_SECRET =
  'trk_wanessa_ingest_9f3c2a7b1e8d4c6f0a5b7e9d2c4f6a8b'

function trackingSecret(): string {
  return (
    process.env.TRACKING_INGEST_SECRET ||
    process.env.PRESSEL_INGEST_SECRET ||
    FALLBACK_SECRET
  ).trim()
}

function formatAnswers(answers: Record<string, any> | null): string {
  if (!answers || typeof answers !== 'object') return 'sem respostas'
  const map: Record<string, string> = {
    assinou_sim: 'Já assinou conteúdo pago',
    assinou_nao: 'Nunca assinou',
    conhece_sim: 'Conhece pelo Instagram',
    conhece_nao: 'Não conhece pelo Instagram',
    pago_sim: 'Disposto a pagar',
    pago_nao: 'Não pagaria',
    intent_assinar_hoje: 'Quer assinar VIP hoje',
    intent_ver_precos: 'Quer ver preços',
    intent_so_olhando: 'Só olhando',
  }
  const parts: string[] = []
  for (const [k, v] of Object.entries(answers)) {
    const val = String(v)
    parts.push(map[val] || `${k}=${val}`)
  }
  return parts.length ? parts.join(' · ') : 'sem respostas'
}

function notifyTelegramQuiz(payload: {
  visitor_id: string
  status: string
  answers: Record<string, any> | null
  fingerprint: string
}) {
  const summary = formatAnswers(payload.answers)
  const isPass = payload.status === 'pass'
  const label = isPass
    ? `✅ Quiz PASS — ${summary}`
    : `⛔ Quiz REJECT — ${summary}`

  const body = {
    visitor_id: payload.visitor_id,
    event_name: 'cta_click',
    path: '/links/wanessa',
    offer_slug: isPass ? 'quiz_pass' : 'quiz_reject',
    label,
    metadata: {
      channel: 'quiz_gate',
      source: 'wanessa_links',
      quiz_status: payload.status,
      answers: payload.answers,
      answers_text: summary,
      fingerprint: payload.fingerprint || null,
      notify_text: label,
    },
  }

  fetch(PRESSEL_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tracking-Secret': trackingSecret(),
    },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  let visitorId = String(body?.visitor_id || getCookie(event, 'vid') || '').trim().slice(0, 64)
  const fingerprint = String(body?.fingerprint || '').trim().slice(0, 128)
  const status = String(body?.status || '').trim()

  if (!visitorId || visitorId.length < 8) {
    visitorId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}`
  }

  if (status !== 'pass' && status !== 'reject') {
    throw createError({ statusCode: 400, statusMessage: 'status must be pass or reject' })
  }

  setCookie(event, 'vid', visitorId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  const answers =
    body?.answers && typeof body.answers === 'object' ? body.answers : null

  try {
    const supabase = useServiceSupabase()
    const row: Record<string, any> = {
      visitor_id: visitorId,
      status,
      answers,
      updated_at: new Date().toISOString(),
    }
    if (fingerprint && fingerprint.length >= 8) {
      row.fingerprint = fingerprint
    }

    const { error } = await supabase.from('quiz_gate').upsert(row, {
      onConflict: 'visitor_id',
    })

    if (error) {
      return {
        ok: false,
        visitor_id: visitorId,
        fingerprint: fingerprint || null,
        status,
        stored: false,
        reason: error.message,
      }
    }

    notifyTelegramQuiz({
      visitor_id: visitorId,
      status,
      answers,
      fingerprint,
    })

    return {
      ok: true,
      visitor_id: visitorId,
      fingerprint: fingerprint || null,
      status,
      stored: true,
      telegram_queued: true,
    }
  } catch (e: any) {
    return {
      ok: false,
      visitor_id: visitorId,
      fingerprint: fingerprint || null,
      status,
      stored: false,
      reason: e?.message || 'error',
    }
  }
})
