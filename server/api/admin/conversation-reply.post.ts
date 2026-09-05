import { useServiceSupabase, verifyAdminToken } from '~~/server/utils/supabase'

/**
 * Admin responde numa conversa.
 * POST /api/admin/conversation-reply  { id, message }
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const id = String(body?.id || body?.conversation_id || '').trim()
  const message = String(body?.message || '').trim().slice(0, 2000)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
  if (!message) throw createError({ statusCode: 400, statusMessage: 'message required' })

  const supabase = useServiceSupabase()

  const { data: conv } = await supabase
    .from('wa_funnel_conversations')
    .select('id, visitor_id, creator_slug, status')
    .eq('id', id)
    .maybeSingle()

  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversa não encontrada' })

  const now = new Date().toISOString()
  const row = {
    visitor_id: conv.visitor_id,
    conversation_id: id,
    direction: 'bot',
    message,
    step: 'live_admin',
    metadata: { source: 'admin_chat', admin_reply: true },
  }

  const { data: inserted, error } = await supabase
    .from('wa_funnel_messages')
    .insert(row)
    .select('id, direction, message, step, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  await supabase
    .from('wa_funnel_conversations')
    .update({ last_message_at: now, updated_at: now, status: 'open' })
    .eq('id', id)

  return { ok: true, message: inserted }
})
