/**
 * POST /api/call-videos
 * Upload/cadastro de vídeos de chamada (painel moderador).
 */
import { useServiceSupabase, verifyAdminToken } from '../utils/supabase'

const CALL_BUCKET = 'call-videos'

async function ensureCallBucket(supabase: ReturnType<typeof useServiceSupabase>) {
  try {
    const { data } = await supabase.storage.getBucket(CALL_BUCKET)
    if (data?.id) return
  } catch {}
  try {
    await supabase.storage.createBucket(CALL_BUCKET, {
      public: true,
      fileSizeLimit: 1024 * 1024 * 120, // 120MB
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'],
    })
  } catch {
    // bucket pode já existir ou policy — segue; upload valida
  }
}

/**
 * CRUD de vídeos da chamada (admin).
 * body.action: list | add | update | delete | reorder | upload
 * upload: multipart (file) ou JSON { action:'upload', filename, content_type, data_base64, title }
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const supabase = useServiceSupabase()
  const now = new Date().toISOString()
  const ct = String(getHeader(event, 'content-type') || '')

  // --- multipart upload (arquivo do PC) ---
  if (ct.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    if (!parts?.length) throw createError({ statusCode: 400, statusMessage: 'arquivo ausente' })
    const filePart = parts.find((p) => p.name === 'file' && p.data)
    const titlePart = parts.find((p) => p.name === 'title')
    if (!filePart?.data?.length) throw createError({ statusCode: 400, statusMessage: 'Selecione um vídeo' })

    const contentType = filePart.type || 'video/mp4'
    if (!String(contentType).startsWith('video/')) {
      throw createError({ statusCode: 400, statusMessage: 'Arquivo precisa ser vídeo (mp4/webm)' })
    }
    if (filePart.data.length > 120 * 1024 * 1024) {
      throw createError({ statusCode: 400, statusMessage: 'Vídeo muito grande (máx. 120MB)' })
    }

    await ensureCallBucket(supabase)
    const orig = String(filePart.filename || 'video.mp4')
    const ext = (orig.split('.').pop() || 'mp4').replace(/[^a-z0-9]/gi, '') || 'mp4'
    const path = `calls/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`

    const { error: upErr } = await supabase.storage.from(CALL_BUCKET).upload(path, filePart.data, {
      contentType,
      upsert: false,
    })
    if (upErr) throw createError({ statusCode: 500, statusMessage: `Upload falhou: ${upErr.message}` })

    const { data: pub } = supabase.storage.from(CALL_BUCKET).getPublicUrl(path)
    const url = pub?.publicUrl || ''
    if (!url) throw createError({ statusCode: 500, statusMessage: 'URL pública não gerada' })

    const title = titlePart?.data ? String(titlePart.data).slice(0, 120) : orig.slice(0, 120)
    const { data: maxRow } = await supabase
      .from('call_videos')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const sort_order = (maxRow?.sort_order ?? -1) + 1
    const { data, error } = await supabase
      .from('call_videos')
      .insert({ url, title: title || null, sort_order, is_active: true, updated_at: now })
      .select('*')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true, video: data, uploaded: true }
  }

  const body = await readBody(event).catch(() => ({} as any))
  const action = String(body?.action || 'list').toLowerCase()

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
    // tenta apagar do storage se for do bucket call-videos
    try {
      const { data: row } = await supabase.from('call_videos').select('url').eq('id', id).maybeSingle()
      const u = String(row?.url || '')
      const marker = `/object/public/${CALL_BUCKET}/`
      const i = u.indexOf(marker)
      if (i >= 0) {
        const path = decodeURIComponent(u.slice(i + marker.length).split('?')[0])
        if (path) await supabase.storage.from(CALL_BUCKET).remove([path])
      }
    } catch {}
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
