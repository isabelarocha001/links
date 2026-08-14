export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')

  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const body = await readBody(event)
  const name = String(body?.name || '').trim().slice(0, 80)
  const bio = String(body?.bio || '').trim().slice(0, 160)
  const avatar_url = String(body?.avatar_url || '').trim().slice(0, 500)
  const links = Array.isArray(body?.links) ? body.links.slice(0, 20) : []

  const cleanLinks = links.map((l: any) => ({
    label: String(l?.label || '').slice(0, 60),
    icon: String(l?.icon || '🔗').slice(0, 8),
    url: String(l?.url || '#').slice(0, 500)
  })).filter((l: any) => l.label)

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Nome obrigatório' })
  }

  const supabase = useServiceSupabase()
  const { error } = await supabase
    .from('link_page_config')
    .upsert({
      id: 'main',
      name,
      bio,
      avatar_url,
      links: cleanLinks,
      updated_at: new Date().toISOString()
    })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { ok: true }
})
