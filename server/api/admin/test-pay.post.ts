export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')

  // Sem cookie admin válido o visitante NÃO autoriza pagamento de teste
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  return {
    ok: true,
    admin: true,
    balance: 'infinite',
    message: 'admin_test_pay_authorized',
  }
})
