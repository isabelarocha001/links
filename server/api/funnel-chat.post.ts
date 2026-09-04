import { useServiceSupabase, getClientIp } from '../utils/supabase'

/**
 * Persiste mensagens do funil isoladas por conversation_id.
 * Body: { visitor_id, conversation_id?, access_token?, session_id?, direction, message, ... }
 *
 * Cada lead tem uma conversa própria (wa_funnel_conversations).
 * RLS bloqueia anon/authenticated: só a API com service_role acessa.
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
  if (!visitor_id) {
    throw createError({ statusCode: 400, statusMessage: 'visitor_id required' })
  }

  let conversation_id = body?.conversation_id ? String(body.conversation_id).slice(0, 80) : null
  let access_token = body?.access_token ? String(body.access_token).slice(0, 120) : null
  const session_id = body?.session_id ? String(body.session_id).slice(0, 120) : null
  const step = body?.step ? String(body.step).slice(0, 40) : null
  const selected_offer = body?.selected_offer ? String(body.selected_offer).slice(0, 80) : null
  const selected_price = body?.selected_price ? String(body.selected_price).slice(0, 40) : null
  const creator_slug = String(body?.creator_slug || 'wanessabsx').slice(0, 60)
  const metadata = typeof body?.metadata === 'object' && body.metadata ? body.metadata : {}

  const ip = getClientIp(event)
  const ua = getHeader(event, 'user-agent') || null
  const supabase = useServiceSupabase()
  const now = new Date().toISOString()

  // Garante conversa isolada do lead
  try {
    if (conversation_id && access_token) {
      const { data: existing } = await supabase
        .from('wa_funnel_conversations')
        .select('id, visitor_id, access_token')
        .eq('id', conversation_id)
        .eq('access_token', access_token)
        .maybeSingle()

      if (!existing || existing.visitor_id !== visitor_id) {
        // token/id inválido ou de outro lead → cria nova (não vaza conversa)
        conversation_id = null
        access_token = null
      }
    }

    if (!conversation_id) {
      // reutiliza conversa open do mesmo visitor + creator nas últimas 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('wa_funnel_conversations')
        .select('id, access_token')
        .eq('visitor_id', visitor_id)
        .eq('creator_slug', creator_slug)
        .eq('status', 'open')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recent?.id) {
        conversation_id = recent.id
        access_token = recent.access_token
      } else {
        const { data: created, error: cErr } = await supabase
          .from('wa_funnel_conversations')
          .insert({
            visitor_id,
            creator_slug,
            status: 'open',
            title: `Lead ${visitor_id.slice(0, 8)} × ${creator_slug}`,
            metadata: { session_id, source: 'wanessa_links_funnel' },
            last_message_at: now,
            updated_at: now,
          })
          .select('id, access_token')
          .single()

        if (cErr || !created?.id) {
          console.error('[funnel-chat] create conversation', cErr?.message)
          return { ok: false, error: cErr?.message || 'conversation_create_failed' }
        }
        conversation_id = created.id
        access_token = created.access_token
      }
    } else {
      await supabase
        .from('wa_funnel_conversations')
        .update({ last_message_at: now, updated_at: now })
        .eq('id', conversation_id)
        .eq('visitor_id', visitor_id)
    }
  } catch (e: any) {
    console.error('[funnel-chat] conversation', e?.message || e)
    return { ok: false, error: 'conversation_error' }
  }

  const row = {
    visitor_id,
    session_id,
    conversation_id,
    direction,
    message: message.slice(0, 2000),
    step,
    selected_offer,
    selected_price,
    metadata: {
      ...metadata,
      ip,
      user_agent: ua ? String(ua).slice(0, 300) : null,
      path: '/chat/' + creator_slug,
      source: 'wanessa_links_funnel',
      conversation_id,
    },
  }

  try {
    const { error } = await supabase.from('wa_funnel_messages').insert(row)
    if (error) {
      console.error('[funnel-chat]', error.message)
      return { ok: false, error: error.message, conversation_id, access_token }
    }
    return {
      ok: true,
      conversation_id,
      access_token,
    }
  } catch (e: any) {
    console.error('[funnel-chat]', e?.message || e)
    return { ok: false, error: 'insert_failed' }
  }
})
