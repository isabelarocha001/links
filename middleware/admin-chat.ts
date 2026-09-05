/**
 * Protege /admin/chat: sem cookie admin_token válido → 404 (não revela a rota).
 * Login só pela home (cadeado); depois acesse /admin/chat com a sessão ativa.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const path = String(to.path || '').replace(/\/+$/, '').toLowerCase()
  if (path !== '/admin/chat') return

  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    await $fetch('/api/admin/session', { headers })
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Page not found',
      fatal: true,
    })
  }
})
