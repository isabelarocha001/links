export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const password = String(body?.password || '')
  const ip = getClientIp(event)
  const config = useRuntimeConfig()
  const supabase = useServiceSupabase()

  // Rate limit: máx 5 tentativas falhas em 15 min por IP
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

  // Validação real no banco (pgcrypto crypt)
  const { data: ok, error } = await supabase.rpc('verify_link_page_password', {
    p_password: password
  })

  // Fallback se a function ainda não existir: query manual
  let valid = false
  if (!error && ok === true) {
    valid = true
  } else {
    const { data: rows } = await supabase
      .from('link_page_auth')
      .select('password_hash')
      .eq('id', 'main')
      .limit(1)

    // Não dá pra comparar bcrypt no JS sem a lib — usamos SQL
    const { data: check } = await supabase.rpc('check_password_plain', {
      plain: password
    }).maybeSingle?.() 

    // Query direta via SQL function criada abaixo
    valid = false
  }

  // Sempre tenta a function dedicada
  const { data: verified } = await supabase.rpc('verify_link_admin', {
    plain_password: password
  })

  valid = verified === true

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
