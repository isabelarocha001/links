export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const password = String(body?.password || '')
  const ip = getClientIp(event)
  const config = useRuntimeConfig()
  const supabase = useServiceSupabase()

  // Rate limit: máx 5 falhas em 15 min por IP
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data: attempts } = await supabase
    .from('link_page_login_attempts')
    .select('id')
    .eq('ip', ip)
    .eq('success', false)
    .gte('created_at', since)

  if ((attempts?.length || 0) >= 5) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas tentativas. Aguarde 15 minutos.'
    })
  }

  if (!password || password.length > 128) {
    await supabase.from('link_page_login_attempts').insert({ ip, success: false })
    throw createError({ statusCode: 401, statusMessage: 'Senha inválida' })
  }

  const { data: verified, error } = await supabase.rpc('verify_link_admin', {
    plain_password: password
  })

  const valid = !error && verified === true

  await supabase.from('link_page_login_attempts').insert({
    ip,
    success: valid
  })

  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Senha inválida' })
  }

  const token = signAdminToken(config.adminSessionSecret)
  setCookie(event, 'admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
    path: '/'
  })

  return { ok: true }
})
