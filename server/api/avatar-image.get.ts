import { useServiceSupabase } from '../utils/supabase'

const AVATAR_KEY = 'PRIVSEX_LINKS_AVATAR_IMAGE'

/** Serve o avatar salvo no Supabase sem expor a chave administrativa. */
export default defineEventHandler(async (event) => {
  const supabase = useServiceSupabase()
  const { data, error } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', AVATAR_KEY)
    .maybeSingle()

  if (error || !data?.value) {
    throw createError({ statusCode: 404, statusMessage: 'Avatar não encontrado' })
  }

  try {
    const stored = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
    const contentType = String(stored?.contentType || 'image/jpeg')
    const encoded = String(stored?.data || '')
    if (!encoded || !/^image\/(jpeg|png|webp|gif)$/i.test(contentType)) throw new Error('asset inválido')

    setResponseHeader(event, 'Content-Type', contentType)
    setResponseHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400')
    return Buffer.from(encoded, 'base64')
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Avatar inválido no Supabase' })
  }
})
