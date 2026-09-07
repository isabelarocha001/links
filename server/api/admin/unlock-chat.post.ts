import { useServiceSupabase, verifyAdminToken } from '~~/server/utils/supabase'

/**
 * POST /api/admin/unlock-chat
 * body: { visitor_id?: string, name?: string, query?: string }
 * Libera o chat pago para um lead (teste admin ou liberação manual).
 *
 * Efeitos:
 *   1) metadata.chat_unlocked = true nas conversas do visitor
 *   2) insere payment approved (plan_key chat_unlock) para /api/chat-unlock
 *
 * Body: { visitor_id?: string, name?: string, query?: string }
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  let visitor_id = String(body?.visitor_id || '').trim()
  const nameOrQuery = String(body?.name || body?.query || '').trim()

  const supabase = useServiceSupabase()

  // Resolve visitor_id por nome/título da conversa se necessário
  if (!visitor_id && nameOrQuery) {
    const q = nameOrQuery.toLowerCase()
    const { data: convs } = await supabase
      .from('wa_funnel_conversations')
      .select('id, visitor_id, title')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(80)

    const match = (convs || []).find((c: any) => {
      const title = String(c.title || '').toLowerCase()
      const vid = String(c.visitor_id || '').toLowerCase()
      return title.includes(q) || vid.includes(q) || vid === q
    })
    if (match?.visitor_id) visitor_id = String(match.visitor_id)
  }

  if (!visitor_id) {
    throw createError({ statusCode: 400, statusMessage: 'Informe visitor_id ou nome do lead' })
  }

  const now = new Date().toISOString()

  // Marca conversas desse visitor como chat liberado
  const { data: convs } = await supabase
    .from('wa_funnel_conversations')
    .select('id, metadata')
    .eq('visitor_id', visitor_id)

  for (const c of convs || []) {
    const meta = (c.metadata && typeof c.metadata === 'object') ? { ...c.metadata } : {}
    ;(meta as any).chat_unlocked = true
    ;(meta as any).chat_unlocked_at = now
    ;(meta as any).chat_unlocked_by = 'admin'
    await supabase
      .from('wa_funnel_conversations')
      .update({ metadata: meta, updated_at: now })
      .eq('id', c.id)
  }

  // Registro em payments (para GET /api/chat-unlock)
  try {
    await supabase.from('payments').insert({
      status: 'approved',
      amount: 0,
      external_id: `admin_unlock_${visitor_id.slice(0, 40)}_${Date.now()}`,
      approved_at: now,
      metadata: {
        visitor_id,
        plan_key: 'chat_unlock',
        admin_grant: true,
        source: 'admin_unlock_chat',
      },
    })
  } catch (e: any) {
    console.warn('[admin/unlock-chat] payments insert', e?.message || e)
  }

  return {
    ok: true,
    visitor_id,
    conversations_updated: (convs || []).length,
    message: 'Chat liberado para este lead',
  }
})
