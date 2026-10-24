/**
 * Gerador local de dados fictícios BR (CPF matematicamente válido + nome/email/fone).
 * Algoritmo oficial dos dígitos verificadores do CPF (módulo 11) — sem chamar API externa.
 * Uso: testes, seeds e auto-preenchimento de formulários do funil.
 *
 * API shape alinhada a https://geradordecpf.com.br/api-docs
 */

/** 9º dígito regional do CPF por UF */
const UF_DIGIT: Record<string, number> = {
  DF: 0, GO: 0, MS: 0, MT: 0, TO: 0,
  AC: 1, AM: 1, AP: 1, PA: 1, RO: 1, RR: 1,
  CE: 2, MA: 2, PI: 2,
  AL: 3, PB: 3, PE: 3, RN: 3,
  BA: 4, SE: 4,
  MG: 5,
  ES: 6, RJ: 6,
  SP: 7,
  PR: 8, SC: 8,
  RS: 9,
}

const FIRST_NAMES = [
  'Lucas', 'Gabriel', 'Matheus', 'Pedro', 'Rafael', 'Felipe', 'Bruno', 'Gustavo',
  'Thiago', 'Leonardo', 'André', 'Rodrigo', 'Fernando', 'Carlos', 'Diego', 'Marcos',
  'João', 'Paulo', 'Ricardo', 'Eduardo', 'Henrique', 'Vinícius', 'Caio', 'Daniel',
  'Alexandre', 'Fábio', 'Leandro', 'Marcelo', 'Renato', 'Sérgio', 'Vitor', 'Igor',
  'Samuel', 'Arthur', 'Enzo', 'Miguel', 'Bernardo', 'Davi', 'Heitor', 'Lorenzo',
  'Ana', 'Maria', 'Julia', 'Beatriz', 'Larissa', 'Camila', 'Fernanda', 'Patricia',
  'Amanda', 'Bruna', 'Carla', 'Daniela', 'Eduarda', 'Gabriela', 'Helena', 'Isabela',
]

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos',
]

/** hash estável (FNV-1a) */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** PRNG determinístico a partir de seed */
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function checkDigit(base: string, factor: number): number {
  let sum = 0
  for (let i = 0; i < base.length; i++) {
    sum += Number(base[i]) * (factor - i)
  }
  const rem = (sum * 10) % 11
  return rem === 10 ? 0 : rem
}

/** Gera CPF matematicamente válido (11 dígitos). */
export function generateCpf(opts?: {
  uf?: string
  seed?: string | number
  masked?: boolean
}): string {
  const rand = opts?.seed != null
    ? mulberry32(typeof opts.seed === 'number' ? opts.seed : hashStr(String(opts.seed)))
    : Math.random

  const digits: number[] = []
  for (let i = 0; i < 8; i++) digits.push(Math.floor(rand() * 10))

  const uf = opts?.uf?.toUpperCase()
  if (uf && UF_DIGIT[uf] !== undefined) {
    digits.push(UF_DIGIT[uf])
  } else {
    digits.push(Math.floor(rand() * 10))
  }

  // evita sequência repetida (111.111.111-11 etc.)
  if (digits.every((d) => d === digits[0])) {
    digits[0] = (digits[0] + 1) % 10
  }

  const base = digits.join('')
  const d1 = checkDigit(base, 10)
  const d2 = checkDigit(base + String(d1), 11)
  const cpf = base + String(d1) + String(d2)

  if (opts?.masked) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
  }
  return cpf
}

/** Valida CPF (com ou sem máscara). */
export function validateCpf(input: string): {
  valid: boolean
  formatted: string
  digits: string
  regionalDigit: number
  possibleStates: string[]
  reason?: string
} {
  const digits = String(input || '').replace(/\D/g, '')
  const formatted =
    digits.length === 11
      ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
      : String(input || '')

  const regionalDigit = digits.length >= 9 ? Number(digits[8]) : -1
  const possibleStates = Object.entries(UF_DIGIT)
    .filter(([, d]) => d === regionalDigit)
    .map(([uf]) => uf)
    .sort()

  if (digits.length !== 11) {
    return {
      valid: false,
      formatted,
      digits,
      regionalDigit,
      possibleStates,
      reason: 'CPF deve ter 11 dígitos.',
    }
  }
  if (/^(\d)\1{10}$/.test(digits)) {
    return {
      valid: false,
      formatted,
      digits,
      regionalDigit,
      possibleStates,
      reason: 'CPF com dígitos repetidos é inválido.',
    }
  }
  const ok1 = checkDigit(digits.slice(0, 9), 10) === Number(digits[9])
  const ok2 = checkDigit(digits.slice(0, 10), 11) === Number(digits[10])
  if (!ok1 || !ok2) {
    return {
      valid: false,
      formatted,
      digits,
      regionalDigit,
      possibleStates,
      reason: 'Dígitos verificadores incorretos.',
    }
  }
  return { valid: true, formatted, digits, regionalDigit, possibleStates }
}

export type FakePerson = {
  name: string
  email: string
  phone: string
  document: string
  document_masked: string
  visitor_id?: string
}

/**
 * Pessoa fictícia estável por visitor_id (mesmo id → mesmos dados).
 * Ideal pro funil: não pede nome/email/cpf/fone a cada visita.
 */
export function fakePersonForVisitor(
  visitorId: string,
  opts?: { uf?: string },
): FakePerson {
  const id = String(visitorId || 'anon').trim() || 'anon'
  const h = hashStr(id)
  const rand = mulberry32(h)

  const first = FIRST_NAMES[h % FIRST_NAMES.length]
  const last = LAST_NAMES[Math.floor(h / FIRST_NAMES.length) % LAST_NAMES.length]
  const name = `${first} ${last}`

  const slug = `${first}.${last}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z.]/g, '')
  const email = `${slug}.${(h % 9000) + 1000}@email.com`

  // celular BR 11 dígitos: DDD 11–99 + 9 + 8 dígitos
  const dddList = [11, 21, 31, 41, 51, 61, 71, 81, 85, 19, 27, 47, 48, 62]
  const ddd = dddList[h % dddList.length]
  let rest = ''
  for (let i = 0; i < 8; i++) rest += String(Math.floor(rand() * 10))
  const phone = `${ddd}9${rest}`

  const document = generateCpf({ seed: `cpf:${id}`, uf: opts?.uf, masked: false })
  const document_masked = `${document.slice(0, 3)}.${document.slice(3, 6)}.${document.slice(6, 9)}-${document.slice(9)}`

  return { name, email, phone, document, document_masked, visitor_id: id }
}
