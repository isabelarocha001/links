/**
 * /admin/chat — página sempre acessível.
 * Auth fica no formulário de login do AdminChatInbox (cookie admin_token).
 * Não retorna 404: esconde a existência da rota só por URL pouco óbvia.
 */
export default defineNuxtRouteMiddleware(async () => {
  // noop — login na própria página
})
