/**
 * GET /api/admin/session
 * Verifica se cookie admin_token é válido (200 = autenticado).
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }
  return { ok: true }
})
