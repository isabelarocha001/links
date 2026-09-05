import { verifyAdminToken } from '../utils/supabase'

/**
 * Camada server: GET /admin/chat sem sessão admin → 404 genérico.
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname.replace(/\/+$/, '').toLowerCase()
  if (path !== '/admin/chat') return

  // Só protege navegação de página (não APIs)
  const method = getMethod(event)
  if (method !== 'GET' && method !== 'HEAD') return

  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Page not found',
    })
  }
})
