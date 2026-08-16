import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const password = String(body?.password || '')
  const ip = getClientIp(event)
  const config = useRuntimeConfig()
  const supabase = useServiceSupabase()

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data: fails } = await supabase.rpc('count_failed_logins', {
    p_ip: ip,
    p_since: since
  })

  if ((fails || 0) >= 5) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas tentativas. Aguarde 15 minutos.'
    })
  }

  if (!password || password.length > 128) {
    await supabase.rpc('record_login_attempt', { p_ip: ip, p_success: false })
    throw createError({ statusCode: 401, statusMessage: 'Senha inválida' })
  }

  // Busca o hash no Supabase (nunca hardcode a senha no código)
  const { data: authRow, error: fetchError } = await supabase
    .from('link_page_auth')
    .select('password_hash')
    .eq('id', 'main')
    .single()

  let valid = false
  if (!fetchError && authRow?.password_hash) {
    try {
      valid = await bcrypt.compare(password, authRow.password_hash)
    } catch {
      valid = false
    }
  }

  await supabase.rpc('record_login_attempt', { p_ip: ip, p_success: valid })

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
