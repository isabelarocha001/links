/**
 * POST /api/media/temp-upload
 * Upload temporário de mídia (foto/vídeo/áudio) no funil/admin.
 */
import { uploadTempMedia } from '../../utils/media'

/**
 * Upload temporário de mídia do lead (multipart ou base64).
 * Body JSON: { base64, contentType, kind?, visitor_id?, conversation_id? }
 * Ou multipart file.
 */
export default defineEventHandler(async (event) => {
  const ct = String(getHeader(event, 'content-type') || '')
  let bytes: Buffer
  let contentType = 'application/octet-stream'
  let kind = 'file'
  let visitor_id: string | null = null
  let conversation_id: string | null = null
  let ext: string | undefined

  if (ct.includes('multipart/form-data')) {
    const form = await readMultipartFormData(event)
    const file = form?.find((p) => p.name === 'file' && p.data)
    if (!file?.data) throw createError({ statusCode: 400, statusMessage: 'file required' })
    bytes = Buffer.from(file.data)
    contentType = file.type || 'application/octet-stream'
    const fields = Object.fromEntries((form || []).filter((p) => p.name && !p.filename).map((p) => [p.name!, p.data?.toString('utf8') || '']))
    kind = fields.kind || 'file'
    visitor_id = fields.visitor_id || null
    conversation_id = fields.conversation_id || null
    if (file.filename?.includes('.')) ext = file.filename.split('.').pop()
  } else {
    const body = await readBody(event).catch(() => ({} as any))
    const b64 = String(body?.base64 || '').replace(/^data:[^;]+;base64,/, '')
    if (!b64) throw createError({ statusCode: 400, statusMessage: 'base64 required' })
    bytes = Buffer.from(b64, 'base64')
    contentType = String(body?.contentType || 'application/octet-stream')
    kind = String(body?.kind || 'file')
    visitor_id = body?.visitor_id ? String(body.visitor_id) : null
    conversation_id = body?.conversation_id ? String(body.conversation_id) : null
  }

  // limite: 100MB
  if (bytes.length > 100 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Arquivo acima de 100MB' })
  }

  const up = await uploadTempMedia({
    bytes,
    contentType,
    ext,
    visitor_id,
    conversation_id,
    direction: 'lead',
    kind,
  })
  return { ok: true, url: up.public_url, path: up.path }
})
