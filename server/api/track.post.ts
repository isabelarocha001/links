/**
 * Tracking da ÁRVORE DE LINKS:
 *   https://wanessa-links.vercel.app/
 *
 * Proxy → https://telegram-metricas.vercel.app/api/pressel
 *
 * Eventos da árvore:
 *   session_start | page_view | link_view | link_click | outbound_click | scroll_depth
 * Compat funil (painel):
 *   presell_view | cta_click
 */

const PRESSEL_WEBHOOK = 'https://telegram-metricas.vercel.app/api/pressel'
const LINK_TREE_HOST = 'wanessa-links.vercel.app'
const LINK_TREE_PATH = '/links/wanessa'
const LINK_TREE_SOURCE = 'wanessa_links'

const TREE_EVENTS = new Set([
  'session_start',
  'page_view',
  'link_view',
  'link_click',
  'outbound_click',
  'scroll_depth',
  'presell_view',
  'cta_click',
  'pageview'
])

function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'cta'
}

function normalizeEvent(raw: string): string {
  let e = raw.trim().toLowerCase()
  // aliases simples
  if (['click', 'cta', 'btn_click'].includes(e)) e = 'cta_click'
  if (['view', 'pv', 'pageview'].includes(e)) e = 'page_view'
  // não forçar link_click → cta_click (evento próprio da árvore)
  return e || 'cta_click'
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as any))
  const label = String(body?.label || '').slice(0, 80)
  const url = String(body?.url || '').slice(0, 500)
  let eventName = normalizeEvent(String(body?.event_name || body?.event || 'cta_click'))

  // Aceita eventos da árvore; desconhecidos passam mesmo assim
  if (!TREE_EVENTS.has(eventName)) {
    // ainda grava, mas marca no metadata
  }

  let visitorId = getCookie(event, 'vid') || ''
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    setCookie(event, 'vid', visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
      path: '/'
    })
  }

  if (body?.visitor_id) {
    visitorId = String(body.visitor_id).slice(0, 64)
  }

  const offerSlug =
    String(body?.offer_slug || body?.offer || '').slice(0, 60) ||
    (label ? slugify(label) : 'wanessa_links')

  const path = LINK_TREE_PATH
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
    ...(body?.depth != null ? { depth: body.depth } : {}),
    ...(body?.metadata && typeof body.metadata === 'object' ? body.metadata : {})
  }

  // Eventos a enviar ao painel:
  // 1) o evento da árvore (nome original)
  // 2) espelho no funil quando fizer sentido
  const toSend: string[] = [eventName]

  if (eventName === 'page_view' || eventName === 'session_start') {
    // funil usa presell_view
    if (!toSend.includes('presell_view')) toSend.push('presell_view')
  }
  if (eventName === 'link_click' || eventName === 'outbound_click') {
    if (!toSend.includes('cta_click')) toSend.push('cta_click')
  }

  const results: any[] = []

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

    try {
      const res = await fetch(PRESSEL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      results.push({
        event_name: name,
        ok: data?.ok !== false && res.ok,
        deduped: !!data?.deduped
      })
    } catch (e: any) {
      results.push({ event_name: name, ok: false, error: e?.message || 'webhook failed' })
    }
  }

  return {
    ok: results.some((r) => r.ok),
    visitor_id: visitorId,
    channel: 'link_tree',
    results
  }
})
