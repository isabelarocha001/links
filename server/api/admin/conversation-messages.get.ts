import { useServiceSupabase, verifyAdminToken } from '~~/server/utils/supabase'

/** Mensagens de uma conversa (admin). GET ?id= */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const q = getQuery(event)
  const id = String(q.id || '').trim()
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const supabase = useServiceSupabase()

  const { data: conv, error: cErr } = await supabase
    .from('wa_funnel_conversations')
    .select('id, visitor_id, creator_slug, status, title, last_message_at, created_at, metadata')
    .eq('id', id)
    .maybeSingle()

  if (cErr) throw createError({ statusCode: 500, statusMessage: cErr.message })
  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversa não encontrada' })

  const { data: messages, error: mErr } = await supabase
    .from('wa_funnel_messages')
    .select('id, direction, message, step, created_at, selected_offer, selected_price, metadata')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(300)

  if (mErr) throw createError({ statusCode: 500, statusMessage: mErr.message })

  return { ok: true, conversation: conv, messages: messages || [] }
})
