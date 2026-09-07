/**
 * GET /api/call-credit
 * Consulta saldo/crédito de videochamada do visitor.
 */
import { useServiceSupabase } from '../utils/supabase'

/**
 * GET /api/call-credit?visitor_id=
 * Retorna crédito ativo + vídeos já assistidos.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const visitor_id = String(q.visitor_id || '').trim()
  if (!visitor_id) {
    throw createError({ statusCode: 400, statusMessage: 'visitor_id required' })
  }

  const supabase = useServiceSupabase()

  const { data: credit, error: cErr } = await supabase
    .from('call_credits')
    .select('id, visitor_id, plan_key, seconds_bought, seconds_left, seconds_consumed, status, last_payment_at, updated_at')
    .eq('visitor_id', visitor_id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cErr) throw createError({ statusCode: 500, statusMessage: cErr.message })

  const { data: watched, error: wErr } = await supabase
    .from('call_watched_videos')
    .select('video_url, fully_watched, watched_seconds, created_at')
    .eq('visitor_id', visitor_id)

  if (wErr) throw createError({ statusCode: 500, statusMessage: wErr.message })

  return {
    ok: true,
    credit: credit || null,
    watched: (watched || []).map((w) => w.video_url),
    watched_detail: watched || [],
  }
})
