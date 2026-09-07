/**
 * GET /api/call-videos
 * Lista vídeos disponíveis para o fluxo de videochamada.
 */
import { useServiceSupabase } from '../utils/supabase'

/**
 * Lista vídeos da videochamada (público — só ativos).
 * Admin com cookie pode passar ?all=1 para ver inativos.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const all = String(q.all || '') === '1'
  const supabase = useServiceSupabase()

  let query = supabase
    .from('call_videos')
    .select('id, url, title, sort_order, is_active, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (!all) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, videos: data || [] }
})
