export default defineEventHandler((event) => {
  // Apaga o cookie de sessão admin (só some de verdade no logout)
  deleteCookie(event, 'admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/'
  })
  return { ok: true }
})
