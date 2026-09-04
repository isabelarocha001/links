import { useServiceSupabase } from '../utils/supabase'

/**
 * Lê mensagens só da conversa do lead (conversation_id + access_token + visitor_id).
 * Sem os 3 → 403. Não lista outras conversas.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const conversation_id = String(q.conversation_id || '').trim()
  const access_token = String(q.access_token || '').trim()
  const visitor_id = String(q.visitor_id || '').trim()

  if (!conversation_id || !access_token || !visitor_id) {
    throw createError({ statusCode: 400, statusMessage: 'conversation_id, access_token and visitor_id required' })
  }

  const supabase = useServiceSupabase()

  const { data: conv } = await supabase
    .from('wa_funnel_conversations')
    .select('id, visitor_id, access_token, creator_slug, status')
    .eq('id', conversation_id)
    .eq('access_token', access_token)
    .eq('visitor_id', visitor_id)
    .maybeSingle()

  if (!conv) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { data: messages, error } = await supabase
    .from('wa_funnel_messages')
    .select('id, direction, message, step, created_at, selected_offer, selected_price')
    .eq('conversation_id', conversation_id)
    .eq('visitor_id', visitor_id)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return {
    ok: true,
    conversation_id: conv.id,
    creator_slug: conv.creator_slug,
    status: conv.status,
    messages: messages || [],
  }
})
