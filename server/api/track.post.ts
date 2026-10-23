/**
 * POST /api/track
 * Analytics de eventos do funil/página (views, cliques, unlocks).
 */
/**
 * Tracking da ÁRVORE DE LINKS (proxy server-side)
 *
 * Avisa o bot por este app e encaminha métricas ao agente em background.
 * A notificação usa a configuração deste app, sem depender do agente.
 */

import { getTelegramConfig, sendTelegramOwnerMessage } from '../utils/telegram'
import { useServiceSupabase } from '../utils/supabase'

const PRESSEL_WEBHOOK = 'https://agent-de-metricas-telegram.vercel.app/api/pressel'
const LINK_TREE_HOST = 'wanessabsx.vercel.app'
const LINK_TREE_PATH = '/'
const LINK_TREE_SOURCE = 'wanessa_links'
const TELEGRAM_NOTIFY_EVENTS = new Set(['page_view', 'link_click', 'outbound_click', 'cta_click', 'ViewContent'])
let telegramWebhookCheckedAt = 0

const FALLBACK_SECRET =
  'trk_wanessa_ingest_9f3c2a7b1e8d4c6f0a5b7e9d2c4f6a8b'

const ALLOWED_ORIGINS = new Set([
  'https://wanessabsx.vercel.app',
  'https://www.wanessabsx.vercel.app',
  'https://wanessa-links.vercel.app',
  'https://www.wanessa-links.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
])

const TREE_EVENTS = new Set([
  'session_start',
  'page_view',
  'link_view',
  'link_click',
  'outbound_click',
  'scroll_depth',
  'presell_view',
  'cta_click',
  'pageview',
  'ViewContent'
])

const hits = new Map<string, { n: number; t: number }>()
const RATE_MAX = 40
const RATE_WINDOW_MS = 60_000

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const row = hits.get(ip)
  if (!row || now - row.t > RATE_WINDOW_MS) {
    hits.set(ip, { n: 1, t: now })
    return true
  }
  if (row.n >= RATE_MAX) return false
  row.n += 1
  return true
}

function clientIp(event: any): string {
  const xf = getHeader(event, 'x-forwarded-for') || ''
  const real = getHeader(event, 'x-real-ip') || ''
  return (xf.split(',')[0] || real || 'unknown').trim().slice(0, 64)
}

function originAllowed(event: any): boolean {
  const origin = (getHeader(event, 'origin') || '').trim()
  const referer = (getHeader(event, 'referer') || '').trim()

  if (origin && ALLOWED_ORIGINS.has(origin)) return true

  if (referer) {
    try {
      const u = new URL(referer)
      const base = `${u.protocol}//${u.host}`
      if (ALLOWED_ORIGINS.has(base)) return true
      if (u.hostname === LINK_TREE_HOST) return true
      if (u.hostname === 'wanessa-links.vercel.app') return true
    } catch {}
  }

  if (!origin && !referer) {
    return process.env.NODE_ENV !== 'production'
  }
  return false
}

function slugify(label: string): string {
  return (
    label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || 'cta'
  )
}

function normalizeEvent(raw: string): string {
  let e = raw.trim().toLowerCase().slice(0, 40)
  if (['viewcontent', 'view_content'].includes(e)) return 'ViewContent'
  if (['click', 'cta', 'btn_click'].includes(e)) e = 'cta_click'
  if (['view', 'pv', 'pageview'].includes(e)) e = 'page_view'
  return e || 'page_view'
}

function trackingSecret(): string {
  return (
    process.env.TRACKING_INGEST_SECRET ||
    process.env.PRESSEL_INGEST_SECRET ||
    FALLBACK_SECRET
  ).trim()
}

function safeText(value: unknown, maxLength = 180): string {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLength)
}

function safeDestination(value: unknown): string {
  try {
    const url = new URL(String(value ?? ''))
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return `${url.origin}${url.pathname}`.slice(0, 300)
  } catch {
    return ''
  }
}

function trackingTelegramMessage(opts: {
  eventName: string
  visitorId: string
  offerSlug: string
  label: string
  url: string
  utms: Record<string, unknown>
  visitNumber: number
  deviceFingerprint: string
}): string {
  const linkName = opts.offerSlug === 'privsex'
    ? 'PrivSex'
    : opts.offerSlug === 'telegram_vip'
      ? 'bot VIP do Telegram'
      : opts.offerSlug === 'previa_telegram'
        ? 'canal de prévias do Telegram'
        : opts.offerSlug === 'telegram_publico'
          ? 'canal de prévias do Telegram'
        : safeText(opts.label) || 'site'
  if (opts.eventName === 'outbound_click') {
    return [
      `👆 Alguém clicou em: ${linkName}`,
      `🔢 Visita nº ${opts.visitNumber || 1}`
    ].join('\n')
  }

  if (opts.eventName === 'page_view') {
    return opts.visitNumber > 0
      ? `👋 Alguém entrou no site\n🔢 Visita nº ${opts.visitNumber}`
      : '👋 Alguém entrou no site'
  }

  if (opts.eventName === 'ViewContent') {
    return '👀 Alguém chegou à bio, ao FAQ e às redes sociais\n📊 Evento: ViewContent'
  }

  return `👋 Alguém fez algo no site: ${linkName}`
}

async function ensureTelegramJoinWebhook() {
  if (Date.now() - telegramWebhookCheckedAt < 10 * 60 * 1000) return
  const { botToken } = await getTelegramConfig()
  if (!botToken) return

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || 'https://wanessabsx.vercel.app/api/telegram/webhook'
  const apiBase = `https://api.telegram.org/bot${botToken}`
  const infoResponse = await fetch(`${apiBase}/getWebhookInfo`)
  const info = await infoResponse.json().catch(() => null)
  const updates = Array.isArray(info?.result?.allowed_updates) ? info.result.allowed_updates : []
  const requiredUpdates = ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'chat_member']
  if (info?.ok && info.result?.url === webhookUrl && requiredUpdates.every((update) => updates.includes(update))) {
    telegramWebhookCheckedAt = Date.now()
    return
  }

  const setResponse = await fetch(`${apiBase}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: requiredUpdates,
      drop_pending_updates: false
    })
  })
  const setResult = await setResponse.json().catch(() => null)
  if (!setResponse.ok || !setResult?.ok) {
    console.error('[track] Telegram member webhook setup failed', setResult?.description || setResponse.status)
    return
  }
  telegramWebhookCheckedAt = Date.now()
  console.info('[track] Telegram member webhook ready')
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  if (!originAllowed(event)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden origin' })
  }

  const ip = clientIp(event)
  if (!rateLimit(ip)) {
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })
  }

  const secret = trackingSecret()
  const body = await readBody(event).catch(() => ({} as any))
  const label = String(body?.label || '').slice(0, 80)
  const url = String(body?.url || '').slice(0, 500)
  const visitNumber = Math.max(0, Math.floor(Number(body?.visit_number) || 0))
  let notificationVisitNumber = visitNumber
  const deviceFingerprint = String(body?.device_fingerprint || '').slice(0, 64)
  let eventName = normalizeEvent(String(body?.event_name || body?.event || 'page_view'))

  if (!TREE_EVENTS.has(eventName)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid event' })
  }

  if (eventName === 'page_view' || eventName === 'session_start') {
    try {
      await ensureTelegramJoinWebhook()
    } catch (error: any) {
      console.error('[track] Telegram member webhook setup failed', error?.message || error)
    }
  }

  let visitorId = getCookie(event, 'vid') || ''
  const bodyVid = body?.visitor_id ? String(body.visitor_id).slice(0, 64) : ''

  if (!visitorId) {
    if (bodyVid && bodyVid.length >= 8 && /^[a-zA-Z0-9_-]+$/.test(bodyVid)) {
      visitorId = bodyVid
    } else {
      visitorId = crypto.randomUUID()
    }
    setCookie(event, 'vid', visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
      path: '/'
    })
  }

  const offerSlug =
    String(body?.offer_slug || body?.offer || '').slice(0, 60) ||
    (label ? slugify(label) : 'wanessa_links')

  const path = String(body?.path || '') === '/telegram' ? '/telegram' : LINK_TREE_PATH
  const utms = {
    utm_source: body?.utm_source || null,
    utm_medium: body?.utm_medium || null,
    utm_campaign: body?.utm_campaign || null,
    utm_content: body?.utm_content || null,
    utm_term: body?.utm_term || null,
    src: body?.src || null,
    sck: body?.sck || null
  }

  const baseMeta = {
    label: label || null,
    url: url || null,
    button: offerSlug,
    source: LINK_TREE_SOURCE,
    host: LINK_TREE_HOST,
    site: `https://${LINK_TREE_HOST}/`,
    channel: 'link_tree',
    tree_event: eventName,
    ...(visitNumber ? { visit_number: visitNumber } : {}),
    ...(deviceFingerprint ? { device_fingerprint: deviceFingerprint } : {}),
    ...(body?.depth != null ? { depth: Number(body.depth) || 0 } : {}),
    ...(body?.metadata && typeof body.metadata === 'object' ? body.metadata : {})
  }

  const shouldStoreClick = eventName === 'outbound_click' || (path === '/telegram' && eventName === 'cta_click')
  if (eventName === 'page_view' || eventName === 'ViewContent' || shouldStoreClick) {
    try {
      const supabase = useServiceSupabase()
      const { error } = await supabase.from('tracking_events').insert({
        visitor_id: visitorId,
        event_name: eventName,
        occurred_at: new Date().toISOString(),
        path,
        offer_slug: offerSlug,
        ...utms,
        metadata: {
          source: LINK_TREE_SOURCE,
          channel: 'link_tree',
          label: label || null,
          visit_number: visitNumber || null,
          device_fingerprint: deviceFingerprint || null
        }
      })
      if (error) console.error('[track] local analytics insert failed', { event_name: eventName, path, error: error.message })
      else if (eventName === 'page_view') {
        const { count, error: countError } = await supabase
          .from('tracking_events')
          .select('visitor_id', { count: 'exact', head: true })
          .eq('event_name', 'page_view')
          .eq('metadata->>source', LINK_TREE_SOURCE)
        if (countError) {
          console.error('[track] visit sequence count failed', countError.message)
        } else {
          notificationVisitNumber = Number(count) || 1
        }
      }
    } catch (error: any) {
      console.error('[track] local analytics insert failed', { event_name: eventName, path, error: error?.message || error })
    }
  }

  const toSend: string[] = [eventName]
  if (eventName === 'page_view' || eventName === 'session_start') {
    if (!toSend.includes('presell_view')) toSend.push('presell_view')
  }
  if (eventName === 'link_click' || eventName === 'outbound_click') {
    if (!toSend.includes('cta_click')) toSend.push('cta_click')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tracking-Secret': secret
  }

  // Fire-and-forget: NÃO await — browser recebe 200 na hora
  for (const name of toSend) {
    const payload = {
      visitor_id: visitorId,
      event_name: name,
      path,
      offer_slug: offerSlug,
      ...utms,
      metadata: {
        ...baseMeta,
        mirrored_from: name !== eventName ? eventName : undefined
      }
    }
    fetch(PRESSEL_WEBHOOK, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }).then((response) => {
      if (!response.ok) {
        console.warn('[track] metrics relay failed', { event_name: name, status: response.status })
      }
    }).catch(() => {
      console.warn('[track] metrics relay unavailable', { event_name: name })
    })
  }

  if (TELEGRAM_NOTIFY_EVENTS.has(eventName)) {
    const result = await sendTelegramOwnerMessage(trackingTelegramMessage({
      eventName,
      visitorId,
      offerSlug,
      label,
      url,
      utms,
      visitNumber: notificationVisitNumber,
      deviceFingerprint
    }))
    if (!result.ok) {
      const telegramError = result.error.toLowerCase()
      const reason = ['bot_token_missing', 'owner_chat_missing'].includes(telegramError)
        ? telegramError
        : telegramError.includes('unauthorized')
          ? 'telegram_token_rejected'
          : telegramError.includes('chat not found')
            ? 'telegram_chat_not_found'
            : telegramError.includes('forbidden') || telegramError.includes('blocked')
              ? 'telegram_bot_forbidden_or_blocked'
              : 'telegram_send_failed'
      console.error('[track] direct Telegram notification failed', { event_name: eventName, reason })
    }
  }

  return {
    ok: true,
    visitor_id: visitorId,
    channel: 'link_tree',
    queued: true
  }
})
