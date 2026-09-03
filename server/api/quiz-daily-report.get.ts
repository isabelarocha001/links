/**
 * GET /api/quiz-daily-report
 * Resume leads do DIA ANTERIOR (fuso America/Sao_Paulo) e envia ao Telegram.
 * Protegido por: header x-vercel-cron | ?secret= | Authorization Bearer
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

function reportSecret(): string {
  return (
    process.env.CRON_SECRET ||
    process.env.TRACKING_INGEST_SECRET ||
    process.env.PRESSEL_INGEST_SECRET ||
    FALLBACK_SECRET
  ).trim()
}

function authorized(event: any): boolean {
  if (getHeader(event, 'x-vercel-cron') === '1') return true
  const q = getQuery(event)
  const secret = String(q.secret || '').trim()
  const expected = reportSecret()
  if (secret && secret === expected) return true
  const auth = (getHeader(event, 'authorization') || '').trim()
  if (auth === `Bearer ${expected}`) return true
  return false
}

/** Intervalo do dia anterior em SP (UTC-3). */
function previousDayRangeSP(now = new Date()) {
  // SP = UTC-3 (sem DST desde 2019)
  const spOffsetMs = 3 * 60 * 60 * 1000
  const spNow = new Date(now.getTime() - spOffsetMs)
  const y = spNow.getUTCFullYear()
  const m = spNow.getUTCMonth()
  const d = spNow.getUTCDate()
  // início do dia SP em UTC = 03:00 UTC do mesmo calendário SP… dia anterior:
  const startSp = new Date(Date.UTC(y, m, d - 1, 3, 0, 0, 0)) // 00:00 SP = 03:00 UTC
  const endSp = new Date(Date.UTC(y, m, d, 3, 0, 0, 0)) // exclusive
  const label = `${String(d - 1).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`
  // fix label when day rolls (d-1 = 0)
  const labelDate = new Date(Date.UTC(y, m, d - 1))
  const labelFixed = `${String(labelDate.getUTCDate()).padStart(2, '0')}/${String(labelDate.getUTCMonth() + 1).padStart(2, '0')}/${labelDate.getUTCFullYear()}`
  return { startIso: startSp.toISOString(), endIso: endSp.toISOString(), label: labelFixed }
}

const ANSWER_LABEL: Record<string, string> = {
  assinou_sim: 'Já assinou pago',
  assinou_nao: 'Nunca assinou',
  conhece_sim: 'Conhece Instagram',
  conhece_nao: 'Não conhece IG',
  pago_sim: 'Disposto a pagar',
  pago_nao: 'Não pagaria',
  intent_assinar_hoje: 'Quer VIP hoje',
  intent_ver_precos: 'Quer preços',
  intent_so_olhando: 'Só olhando',
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1
}

function linesFromCounts(title: string, map: Record<string, number>): string[] {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  if (!entries.length) return [`${title}: —`]
  return [title, ...entries.map(([k, n]) => `  • ${ANSWER_LABEL[k] || k}: ${n}`)]
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }
  if (!authorized(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const dry = String(getQuery(event).dry || '') === '1'
  const { startIso, endIso, label } = previousDayRangeSP()

  const supabase = useServiceSupabase()
  const { data, error } = await supabase
    .from('quiz_gate')
    .select('status, answers, updated_at, visitor_id')
    .gte('updated_at', startIso)
    .lt('updated_at', endIso)
    .order('updated_at', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const rows = data || []
  let pass = 0
  let reject = 0
  const q1: Record<string, number> = {}
  const q2: Record<string, number> = {}
  const qPay: Record<string, number> = {}
  const q3: Record<string, number> = {}

  for (const row of rows) {
    if (row.status === 'pass') pass++
    else if (row.status === 'reject') reject++
    const a = row.answers && typeof row.answers === 'object' ? row.answers : null
    if (!a) continue
    if (a.q1) bump(q1, String(a.q1))
    if (a.q2) bump(q2, String(a.q2))
    if (a.q_pay) bump(qPay, String(a.q_pay))
    if (a.q3) bump(q3, String(a.q3))
  }

  const total = rows.length
  const conv = total ? Math.round((pass / total) * 100) : 0

  const textLines = [
    `📊 Resumo formulário — ${label}`,
    ``,
    `Total leads: ${total}`,
    `✅ Pass (pressel): ${pass}`,
    `⛔ Reject: ${reject}`,
    `Taxa pass: ${conv}%`,
    ``,
    ...linesFromCounts('Assinou conteúdo pago?', q1),
    ``,
    ...linesFromCounts('Conhece Instagram?', q2),
    ``,
    ...linesFromCounts('Disposto a pagar?', qPay),
    ``,
    ...linesFromCounts('Intenção final?', q3),
  ]

  const reportText = textLines.join('\n')
  const labelOneLine = `📊 Quiz ${label}: ${total} leads · ✅${pass} · ⛔${reject} · ${conv}% pass`

  if (!dry) {
    await fetch(PRESSEL_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tracking-Secret': trackingSecret(),
      },
      body: JSON.stringify({
        visitor_id: `daily-report-${label.replace(/\//g, '-')}`,
        event_name: 'cta_click',
        path: '/links/wanessa',
        offer_slug: 'quiz_daily_report',
        label: labelOneLine,
        metadata: {
          channel: 'quiz_daily_report',
          source: 'wanessa_links',
          notify_text: reportText,
          report_date: label,
          total,
          pass,
          reject,
          conversion_pass_pct: conv,
          breakdown: { q1, q2, q_pay: qPay, q3 },
        },
      }),
    }).catch(() => {})
  }

  return {
    ok: true,
    date: label,
    range: { start: startIso, end: endIso },
    total,
    pass,
    reject,
    conversion_pass_pct: conv,
    breakdown: { q1, q2, q_pay: qPay, q3 },
    telegram_queued: !dry,
    preview: reportText,
  }
})
