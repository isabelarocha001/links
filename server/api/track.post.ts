/**
 * Tracking da ÁRVORE DE LINKS:
 *   https://wanessa-links.vercel.app/
 *
 * Proxy → https://telegram-metricas.vercel.app/api/pressel
 * NÃO grava direto no Supabase (evita clique duplicado).
 */

const PRESSEL_WEBHOOK = 'https://telegram-metricas.vercel.app/api/pressel'
const LINK_TREE_HOST = 'wanessa-links.vercel.app'
const LINK_TREE_PATH = '/links/wanessa'
const LINK_TREE_SOURCE = 'wanessa_links'

function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'cta'
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const label = String(body?.label || '').slice(0, 80)
  const url = String(body?.url || '').slice(0, 500)
  let eventName = String(body?.event_name || body?.event || 'cta_click')
    .trim()
    .toLowerCase()

  if (['click', 'cta', 'btn_click', 'link_click'].includes(eventName)) {
    eventName = 'cta_click'
  }
  if (['view', 'page_view', 'pv', 'pageview'].includes(eventName)) {
    eventName = 'presell_view'
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
    (label ? slugify(label) : 'cta')

  // Sempre path/source da árvore — não misturar com PrivSex ou /wanessa interno
  const path = LINK_TREE_PATH

  const payload = {
    visitor_id: visitorId,
    event_name: eventName,
    path,
    offer_slug: offerSlug,
    utm_source: body?.utm_source || null,
    utm_medium: body?.utm_medium || null,
    utm_campaign: body?.utm_campaign || null,
    utm_content: body?.utm_content || null,
    utm_term: body?.utm_term || null,
    src: body?.src || null,
    sck: body?.sck || null,
    metadata: {
      label: label || null,
      url: url || null,
      button: offerSlug,
      source: LINK_TREE_SOURCE,
      host: LINK_TREE_HOST,
      site: `https://${LINK_TREE_HOST}/`,
      channel: 'link_tree',
      ...(body?.metadata && typeof body.metadata === 'object' ? body.metadata : {})
    }
  }

  try {
    const res = await fetch(PRESSEL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json().catch(() => ({}))
    return {
      ok: data?.ok !== false && res.ok,
      deduped: !!data?.deduped,
      event_name: data?.event_name || eventName,
      visitor_id: visitorId,
      channel: 'link_tree'
    }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || 'webhook failed',
      visitor_id: visitorId
    }
  }
})
