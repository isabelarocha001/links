/**
 * Antes: GET /admin/chat sem sessão → 404.
 * Agora: página sempre carrega; autenticação no client (login no AdminChatInbox).
 * APIs /api/admin/* continuam protegidas por token.
 */
export default defineEventHandler((_event) => {
  // noop
})
