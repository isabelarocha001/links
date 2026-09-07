/**
 * GET /api/admin/lead-presence
 * Status online/activity do lead na conversa aberta (para o inbox admin).
 */
import { useServiceSupabase, verifyAdminToken } from '../../utils/supabase'

/**
 * Admin: status do lead (online, activity, last read).
 * GET ?visitor_id= | ?conversation_id=
 */
const ONLINE_MS = 8_000

function formatLastSeen(iso: string | null | undefined): string {
  try {
    const d = iso ? new Date(iso) : null
    if (!d || Number.isNaN(d.getTime())) return 'offline'
    const fmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `visto às ${fmt.format(d)}`
  } catch {
    return 'offline'
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const q = getQuery(event)
  const visitor_id = String(q.visitor_id || '').trim()
  const conversation_id = String(q.conversation_id || '').trim()
  if (!visitor_id && !conversation_id) {
    throw createError({ statusCode: 400, statusMessage: 'visitor_id or conversation_id required' })
  }

  const supabase = useServiceSupabase()
  let query = supabase.from('lead_presence').select('*')
  if (visitor_id) query = query.eq('visitor_id', visitor_id)
  else query = query.eq('conversation_id', conversation_id)

  const { data, error } = await query.maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (!data) {
    return {
      ok: true,
      online: false,
      activity: 'idle',
      label: 'offline',
      last_seen_at: null,
      last_read_at: null,
      last_read_message_id: null,
    }
  }

  const last = data.last_seen_at ? new Date(String(data.last_seen_at)).getTime() : 0
  const fresh = last > 0 && Date.now() - last < ONLINE_MS
  const online = data.is_online === true && fresh
  const activity = online ? String(data.activity || 'idle') : 'idle'

  let label = formatLastSeen(data.last_seen_at)
  if (online) {
    if (activity === 'typing') label = 'digitando…'
    else if (activity === 'recording') label = 'gravando áudio…'
    else if (activity === 'uploading') label = 'enviando mídia…'
    else if (activity === 'viewing') label = 'online · na conversa'
    else label = 'online'
  }

  return {
    ok: true,
    online,
    activity,
    label,
    last_seen_at: data.last_seen_at,
    last_read_at: data.last_read_at,
    last_read_message_id: data.last_read_message_id,
    visitor_id: data.visitor_id,
    conversation_id: data.conversation_id,
  }
})
