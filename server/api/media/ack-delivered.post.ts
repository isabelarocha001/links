import { deleteTempMediaByUrl, deleteTempMediaByPath } from '../../utils/media'

/**
 * Lead confirma que a mídia já está no localStorage → apaga do Supabase Storage.
 * POST { url? } | { path? }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as any))
  const url = String(body?.url || '').trim()
  const path = String(body?.path || '').trim()
  if (!url && !path) {
    throw createError({ statusCode: 400, statusMessage: 'url or path required' })
  }
  if (path) await deleteTempMediaByPath(path)
  else await deleteTempMediaByUrl(url)
  return { ok: true }
})
