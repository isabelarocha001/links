import { useServiceSupabase } from '../utils/supabase'

/**
 * Heartbeat do lead no chat do site.
 * POST { visitor_id, conversation_id?, activity?, online?, last_read_message_id? }
 * activity: idle | typing | recording | uploading | viewing
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as any))
  const visitor_id = String(body?.visitor_id || '').trim().slice(0, 120)
  if (!visitor_id) throw createError({ statusCode: 400, statusMessage: 'visitor_id required' })

  const conversation_id = body?.conversation_id ? String(body.conversation_id).slice(0, 80) : null
  const online = body?.online === false ? false : true
  let activity = String(body?.activity || 'idle').toLowerCase()
  if (!['idle', 'typing', 'recording', 'uploading', 'viewing'].includes(activity)) activity = 'idle'
  const last_read_message_id = body?.last_read_message_id
    ? String(body.last_read_message_id).slice(0, 80)
    : null

  const supabase = useServiceSupabase()
  const now = new Date().toISOString()

  const row: Record<string, any> = {
    visitor_id,
    is_online: online,
    last_seen_at: now,
    activity: online ? activity : 'idle',
    updated_at: now,
  }
  if (conversation_id) row.conversation_id = conversation_id
  if (last_read_message_id) {
    row.last_read_message_id = last_read_message_id
    row.last_read_at = now
  }

  const { error } = await supabase.from('lead_presence').upsert(row, { onConflict: 'visitor_id' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { ok: true, at: now }
})
