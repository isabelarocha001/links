/**
 * GET /api/cpf
 * Gera CPF(s) fictício(s) matematicamente válidos — instância própria (sem API externa).
 * Compatível com a doc: https://geradordecpf.com.br/api-docs
 *
 * Query:
 *   count   1–100 (default 1)
 *   uf      SP, RJ, MG… (opcional)
 *   masked  true|false (default true)
 *   format  json|text (default json)
 */
import { generateCpf } from '../../utils/fake-person'

export default defineEventHandler((event) => {
  const q = getQuery(event)
  const countRaw = Number(q.count ?? 1)
  const count = Number.isFinite(countRaw) ? Math.floor(countRaw) : 1
  if (count < 1 || count > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parâmetro inválido',
      data: {
        error: 'Parâmetro inválido',
        message: "'count' deve ser um inteiro entre 1 e 100.",
        docs: 'https://geradordecpf.com.br/api-docs',
      },
    })
  }

  const uf = q.uf ? String(q.uf).toUpperCase().slice(0, 2) : undefined
  const masked = String(q.masked ?? 'true').toLowerCase() !== 'false'
  const format = String(q.format || 'json').toLowerCase()

  const list = Array.from({ length: count }, () => generateCpf({ uf, masked }))

  if (format === 'text') {
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return list.join('\n')
  }

  if (count === 1) {
    return { cpf: list[0], masked }
  }
  return { cpfs: list, count, masked }
})
