/**
 * GET /api/fake-person?visitor_id=...
 * Retorna nome, email, telefone e CPF válidos e ESTÁVEIS por visitor_id.
 * Mesmo visitor_id → sempre os mesmos dados (não pede de novo a cada visita).
 *
 * Query opcional: uf=SP (fixa dígito regional do CPF)
 */
import { fakePersonForVisitor, generateCpf, validateCpf } from '../utils/fake-person'

export default defineEventHandler((event) => {
  const q = getQuery(event)
  let visitorId = String(q.visitor_id || q.visitorId || '').trim()

  if (!visitorId) {
    visitorId = `tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  }

  const uf = q.uf ? String(q.uf).toUpperCase().slice(0, 2) : undefined
  const person = fakePersonForVisitor(visitorId, { uf })

  const check = validateCpf(person.document)
  if (!check.valid) {
    const cpf = generateCpf({ seed: `retry:${visitorId}`, masked: false })
    person.document = cpf
    person.document_masked = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
  }

  return {
    ok: true,
    name: person.name,
    email: person.email,
    phone: person.phone,
    document: person.document,
    document_masked: person.document_masked,
    visitor_id: person.visitor_id,
  }
})
