/**
 * GET /api/cpf/validate?cpf=...
 * Valida CPF (com ou sem máscara). Instância própria.
 */
import { validateCpf } from '../../utils/fake-person'

export default defineEventHandler((event) => {
  const q = getQuery(event)
  const cpf = String(q.cpf || '').trim()
  if (!cpf) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parâmetro inválido',
      data: {
        error: 'Parâmetro inválido',
        message: "Informe o parâmetro 'cpf'.",
        docs: 'https://geradordecpf.com.br/api-docs',
      },
    })
  }
  return validateCpf(cpf)
})
