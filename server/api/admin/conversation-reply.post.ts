import { useServiceSupabase, verifyAdminToken } from '~~/server/utils/supabase'

/**
 * Admin responde numa conversa (texto, mídia, chamada, enquete).
 * POST /api/admin/conversation-reply
 * body: { id, message?, kind?, url?, poll_question?, poll_options? }
 * kind: text | call | photo | video | audio | poll
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const id = String(body?.id || body?.conversation_id || '').trim()
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const kind = String(body?.kind || 'text').toLowerCase().trim() || 'text'
  let message = String(body?.message || '').trim().slice(0, 8000)
  const url = String(body?.url || '').trim().slice(0, 2_000_000)
  const pollQ = String(body?.poll_question || '').trim().slice(0, 200)
  const pollOpts = Array.isArray(body?.poll_options)
    ? body.poll_options.map((o: any) => String(o || '').trim()).filter(Boolean).slice(0, 5)
    : []

  if (kind === 'call') {
    message = '⟦ADMIN⟧' + JSON.stringify({ k: 'call' })
  } else if (kind === 'photo') {
    if (!url) throw createError({ statusCode: 400, statusMessage: 'url da foto obrigatória' })
    message = '⟦ADMIN⟧' + JSON.stringify({ k: 'photo', u: url })
  } else if (kind === 'video') {
    if (!url) throw createError({ statusCode: 400, statusMessage: 'url do vídeo obrigatória' })
    message = '⟦ADMIN⟧' + JSON.stringify({ k: 'video', u: url })
  } else if (kind === 'audio') {
    if (!url) throw createError({ statusCode: 400, statusMessage: 'url do áudio obrigatória' })
    message = '⟦ADMIN⟧' + JSON.stringify({ k: 'audio', u: url })
  } else if (kind === 'poll') {
    if (pollQ.length < 2 || pollOpts.length < 2) {
      throw createError({ statusCode: 400, statusMessage: 'Enquete precisa de pergunta e 2+ opções' })
    }
    message = '⟦ADMIN⟧' + JSON.stringify({ k: 'poll', q: pollQ, o: pollOpts })
  } else {
    if (!message) throw createError({ statusCode: 400, statusMessage: 'message required' })
  }

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
    metadata: {
      source: 'admin_chat',
      admin_reply: true,
      kind,
      has_url: !!url,
    },
  }

  const { data: inserted, error } = await supabase
    .from('wa_funnel_messages')
    .insert(row)
    .select('id, direction, message, step, created_at, metadata')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  await supabase
    .from('wa_funnel_conversations')
    .update({ last_message_at: now, updated_at: now, status: 'open' })
    .eq('id', id)

  return { ok: true, message: inserted }
})
