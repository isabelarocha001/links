import { useServiceSupabase, verifyAdminToken } from '../utils/supabase'

/**
 * CRUD de vídeos da chamada (admin).
 * body.action: list | add | update | delete | reorder
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const action = String(body?.action || 'list').toLowerCase()
  const supabase = useServiceSupabase()
  const now = new Date().toISOString()

  if (action === 'list') {
    const { data, error } = await supabase
      .from('call_videos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true, videos: data || [] }
  }

  if (action === 'add') {
    const url = String(body?.url || '').trim()
    if (!url || url.length > 2000) throw createError({ statusCode: 400, statusMessage: 'url inválida' })
    const title = body?.title ? String(body.title).slice(0, 120) : null
    const { data: maxRow } = await supabase
      .from('call_videos')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const sort_order = (maxRow?.sort_order ?? -1) + 1
    const { data, error } = await supabase
      .from('call_videos')
      .insert({ url, title, sort_order, is_active: true, updated_at: now })
      .select('*')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true, video: data }
  }

  if (action === 'update') {
    const id = String(body?.id || '')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
    const patch: Record<string, any> = { updated_at: now }
    if (body?.url != null) patch.url = String(body.url).trim()
    if (body?.title != null) patch.title = String(body.title).slice(0, 120)
    if (body?.is_active != null) patch.is_active = !!body.is_active
    if (body?.sort_order != null) patch.sort_order = Number(body.sort_order) || 0
    const { data, error } = await supabase.from('call_videos').update(patch).eq('id', id).select('*').single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true, video: data }
  }

  if (action === 'delete') {
    const id = String(body?.id || '')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
    const { error } = await supabase.from('call_videos').delete().eq('id', id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true }
  }

  if (action === 'reorder') {
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : []
    for (let i = 0; i < ids.length; i++) {
      await supabase.from('call_videos').update({ sort_order: i, updated_at: now }).eq('id', ids[i])
    }
    return { ok: true }
  }

  throw createError({ statusCode: 400, statusMessage: 'action inválida' })
})
