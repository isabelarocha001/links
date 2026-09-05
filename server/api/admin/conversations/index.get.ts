import { useServiceSupabase, verifyAdminToken } from '~~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const q = getQuery(event)
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100)
  const status = String(q.status || '').trim()
  const supabase = useServiceSupabase()

  let query = supabase
    .from('wa_funnel_conversations')
    .select('id, visitor_id, creator_slug, status, title, last_message_at, created_at, updated_at, metadata')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (status === 'open' || status === 'closed') {
    query = query.eq('status', status)
  }

  const { data: conversations, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const list = conversations || []
  const ids = list.map((c: any) => c.id).filter(Boolean)
  const lastByConv: Record<string, { direction: string; message: string; created_at: string }> = {}
  if (ids.length) {
    const { data: msgs } = await supabase
      .from('wa_funnel_messages')
      .select('conversation_id, direction, message, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(ids.length * 3)

    for (const m of msgs || []) {
      const cid = String((m as any).conversation_id || '')
      if (!cid || lastByConv[cid]) continue
      lastByConv[cid] = {
        direction: String((m as any).direction || ''),
        message: String((m as any).message || '').slice(0, 160),
        created_at: String((m as any).created_at || ''),
      }
    }
  }

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000
  const items = list.map((c: any) => {
    const last = lastByConv[c.id] || null
    const lastAt = last?.created_at || c.last_message_at || c.updated_at
    const lastTs = lastAt ? new Date(lastAt).getTime() : 0
    const is_new = last?.direction === 'lead' && lastTs >= dayAgo
    const meta = (c.metadata && typeof c.metadata === 'object') ? c.metadata : {}
    const lead_blocked = !!(meta as any).lead_blocked || c.status === 'blocked'
    const block_reason = String((meta as any).block_reason || '')
    return {
      id: c.id,
      visitor_id: c.visitor_id,
      creator_slug: c.creator_slug,
      status: c.status,
      title: c.title || ('Lead ' + String(c.visitor_id || '').slice(0, 8)),
      last_message_at: c.last_message_at,
      created_at: c.created_at,
      last_message: last,
      is_new,
      lead_blocked,
      block_reason,
    }
  })

  return { ok: true, total: items.length, new_count: items.filter((i: any) => i.is_new).length, conversations: items }
})
