import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/track
 * Analytics de eventos do funil/página (views, cliques, unlocks).
 */
/**
 * Tracking da ÁRVORE DE LINKS (proxy server-side)
 *
 * Responde IMEDIATO ao browser; envia ao pressel em background.
 * Assim o clique no link não espera Supabase/Telegram.
 */

const PRESSEL_WEBHOOK = 'https://agent-de-metricas-telegram.vercel.app/api/pressel'
const LINK_TREE_HOST = 'wanessabsx.vercel.app'
const LINK_TREE_PATH = '/links/wanessa'
const LINK_TREE_SOURCE = 'wanessa_links'
const VIP_CHECKOUT_PATH = '/assinaturavip'
const VIP_CHECKOUT_SOURCE = 'vip_checkout'
const VIP_CHECKOUT_EVENTS = new Set([
  'vip_checkout_view',
  'vip_plan_selected',
  'vip_subscribe_clicked',
  'vip_pix_generated',
  'vip_pix_copy_clicked',
  'vip_pix_pending_exit'
])

const FALLBACK_SECRET =
  'trk_wanessa_ingest_9f3c2a7b1e8d4c6f0a5b7e9d2c4f6a8b'

const ALLOWED_ORIGINS = new Set([
  'https://wanessabsx.vercel.app',
  'https://www.wanessabsx.vercel.app',
  'https://wanessa-links.vercel.app',
  'https://www.wanessa-links.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://[::1]:3000'
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
  'view_content'
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

  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true

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

function safeText(value: unknown, max = 200): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  return String(value).trim().slice(0, max) || null
}

function safeMetadata(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 24)
  return Object.fromEntries(entries.flatMap(([key, item]) => {
    if (!/^[a-zA-Z0-9_:-]{1,40}$/.test(key)) return []
    if (typeof item === 'string') return [[key, item.slice(0, 300)]]
    if (typeof item === 'number' && Number.isFinite(item)) return [[key, item]]
    if (typeof item === 'boolean') return [[key, item]]
    return []
  }))
}

function normalizeEvent(raw: string): string {
  let e = raw.trim().toLowerCase().slice(0, 40)
  if (['click', 'cta', 'btn_click'].includes(e)) e = 'cta_click'
  if (['view', 'pv', 'pageview'].includes(e)) e = 'page_view'
  if (e === 'viewcontent') e = 'view_content'
  return e || 'page_view'
}

function trackingSecret(): string {
  return (
    process.env.TRACKING_INGEST_SECRET ||
    process.env.PRESSEL_INGEST_SECRET ||
    FALLBACK_SECRET
  ).trim()
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
  const requestedEventName = normalizeEvent(String(body?.event_name || body?.event || 'page_view'))
  const isVipCheckoutEvent = VIP_CHECKOUT_EVENTS.has(requestedEventName)
  const eventName = isVipCheckoutEvent
    ? requestedEventName === 'vip_checkout_view' ? 'page_view' : 'cta_click'
    : requestedEventName

  if (!TREE_EVENTS.has(eventName) || (!TREE_EVENTS.has(requestedEventName) && !isVipCheckoutEvent)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid event' })
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

  const offerSlug = isVipCheckoutEvent
    ? 'vip_telegram'
    : String(body?.offer_slug || body?.offer || '').slice(0, 60) ||
      (label ? slugify(label) : 'wanessa_links')

  const path = isVipCheckoutEvent ? VIP_CHECKOUT_PATH : LINK_TREE_PATH
  const source = isVipCheckoutEvent ? VIP_CHECKOUT_SOURCE : LINK_TREE_SOURCE
  const safeVipMetadata: Record<string, string> = {}
  if (isVipCheckoutEvent && ['monthly', 'lifetime'].includes(String(body?.metadata?.plan_key || ''))) {
    safeVipMetadata.plan_key = String(body.metadata.plan_key)
  }
  const utms = {
    utm_source: safeText(body?.utm_source),
    utm_medium: safeText(body?.utm_medium),
    utm_campaign: safeText(body?.utm_campaign),
    utm_content: safeText(body?.utm_content),
    utm_term: safeText(body?.utm_term),
    src: safeText(body?.src),
    sck: safeText(body?.sck)
  }

  const extraMetadata = safeMetadata(body?.metadata)
  // Country is derived server-side from Vercel's IP geolocation header; never trust a client-supplied country.
  delete extraMetadata.country_code
  const countryCode = String(getHeader(event, 'x-vercel-ip-country') || '').toUpperCase()
  if (/^[A-Z]{2}$/.test(countryCode)) extraMetadata.country_code = countryCode
  const baseMeta = {
    label: isVipCheckoutEvent ? requestedEventName : label || null,
    url: isVipCheckoutEvent ? `https://${LINK_TREE_HOST}${VIP_CHECKOUT_PATH}` : url || null,
    button: offerSlug,
    source,
    host: LINK_TREE_HOST,
    site: `https://${LINK_TREE_HOST}${path}`,
    channel: isVipCheckoutEvent ? 'vip_checkout' : 'link_tree',
    tree_event: isVipCheckoutEvent ? requestedEventName : eventName,
    ...(isVipCheckoutEvent ? { funnel_event: requestedEventName, ...safeVipMetadata } : {}),
    ...(body?.depth != null ? { depth: Math.max(0, Math.min(100, Number(body.depth) || 0)) } : {}),
    ...(isVipCheckoutEvent
      ? safeVipMetadata
      : extraMetadata)
  }

  // Separate analytics destination; the app's primary Supabase remains untouched.
  try {
    const config = useRuntimeConfig()
    const analytics = createClient(config.analyticsSupabaseUrl, config.analyticsSupabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const metadataJson = JSON.stringify(baseMeta)
    const metadata = metadataJson.length <= 8000
      ? baseMeta
      : { source, channel: baseMeta.channel, tree_event: eventName }
    const { error } = await analytics.from('tracking_events').insert({
      visitor_id: visitorId,
      event_name: eventName,
      occurred_at: new Date().toISOString(),
      path,
      offer_slug: offerSlug,
      ...utms,
      metadata
    })
    if (error) console.warn('[track] Analytics Supabase insert failed', { message: error.message })
  } catch (error: any) {
    console.warn('[track] Analytics Supabase unavailable', { message: error?.message || 'unknown error' })
  }

  const toSend: string[] = [eventName]
  if (!isVipCheckoutEvent && (eventName === 'page_view' || eventName === 'session_start')) {
    if (!toSend.includes('presell_view')) toSend.push('presell_view')
  }
  if (eventName === 'link_click' || eventName === 'outbound_click') {
    if (!toSend.includes('cta_click')) toSend.push('cta_click')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tracking-Secret': secret
  }

  // Await bounded proxy calls so serverless runtimes don't drop telemetry after
  // the response. sendBeacon callers remain non-blocking in the browser.
  const deliveries = toSend.map(async (name) => {
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
    const response = await fetch(PRESSEL_WEBHOOK, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3500)
    })
    if (!response.ok) throw new Error(`Tracking ingest returned ${response.status}`)
  })
  const deliveryResults = await Promise.allSettled(deliveries)
  const deliveryErrors = deliveryResults.flatMap((result) => {
    if (result.status !== 'rejected') return []
    const message = result.reason instanceof Error ? result.reason.message : ''
    return [/^Tracking ingest returned \d{3}$/.test(message) ? message : 'Network error or timeout']
  })
  if (deliveryErrors.length) {
    console.warn('[track] Metrics delivery failed', { failures: deliveryErrors })
  }

  return {
    ok: true,
    visitor_id: visitorId,
    channel: isVipCheckoutEvent ? 'vip_checkout' : 'link_tree',
    queued: true
  }
})
