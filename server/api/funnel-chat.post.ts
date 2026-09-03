import { useServiceSupabase, getClientIp } from '../utils/supabase'

/**
 * Persiste mensagens do funil de chat WhatsApp (presell)
 * Body: { visitor_id, session_id?, direction: 'lead'|'bot', message, step?, selected_offer?, selected_price?, metadata? }
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  let body: any
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  const direction = String(body?.direction || '').toLowerCase()
  const message = String(body?.message || '').trim()
  if (!message || message.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'message required' })
  }
  if (direction !== 'lead' && direction !== 'bot') {
    throw createError({ statusCode: 400, statusMessage: 'direction must be lead|bot' })
  }

  const visitor_id = body?.visitor_id ? String(body.visitor_id).slice(0, 120) : null
  const session_id = body?.session_id ? String(body.session_id).slice(0, 120) : null
  const step = body?.step ? String(body.step).slice(0, 40) : null
  const selected_offer = body?.selected_offer ? String(body.selected_offer).slice(0, 80) : null
  const selected_price = body?.selected_price ? String(body.selected_price).slice(0, 40) : null
  const metadata = typeof body?.metadata === 'object' && body.metadata ? body.metadata : {}

  const ip = getClientIp(event)
  const ua = getHeader(event, 'user-agent') || null

  const row = {
    visitor_id,
    session_id,
    direction,
    message: message.slice(0, 2000),
    step,
    selected_offer,
    selected_price,
    metadata: {
      ...metadata,
      ip,
      user_agent: ua ? String(ua).slice(0, 300) : null,
      path: '/links/wanessa',
      source: 'wanessa_links_funnel',
    },
  }

  try {
    const supabase = useServiceSupabase()
    const { error } = await supabase.from('wa_funnel_messages').insert(row)
    if (error) {
      console.error('[funnel-chat]', error.message)
      // não quebra o UX do lead
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[funnel-chat]', e?.message || e)
    return { ok: false, error: 'insert_failed' }
  }
})
