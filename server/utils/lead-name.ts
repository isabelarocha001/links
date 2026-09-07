/** Utils: normaliza/extrai nome do lead a partir de título/visitor. */
/**
 * Nome legível e estável por visitor_id (mesmo lead = mesmo nome).
 * Nomes brasileiros comuns pra admin distinguir conversas.
 */
const FIRST = [
  'Lucas', 'Gabriel', 'Matheus', 'Pedro', 'Rafael', 'Felipe', 'Bruno', 'Gustavo',
  'Thiago', 'Leonardo', 'André', 'Rodrigo', 'Fernando', 'Carlos', 'Diego', 'Marcos',
  'João', 'Paulo', 'Ricardo', 'Eduardo', 'Henrique', 'Vinícius', 'Caio', 'Daniel',
  'Alexandre', 'Fábio', 'Leandro', 'Marcelo', 'Renato', 'Sérgio', 'Vitor', 'Igor',
  'Samuel', 'Arthur', 'Enzo', 'Miguel', 'Bernardo', 'Davi', 'Heitor', 'Lorenzo',
  'Murilo', 'Nicolas', 'Otávio', 'Pietro', 'Cauã', 'Yago', 'Kaique', 'Ryan',
  'Wesley', 'Douglas', 'Jeferson', 'Anderson', 'Roberto', 'Antônio', 'José', 'Luiz',
]

const LAST = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos',
  'Gonçalves', 'Santana', 'Teixeira', 'Moraes', 'Araujo', 'Castro', 'Campos', 'Pinto',
]

/** hashStr */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** leadDisplayName */
export function leadDisplayName(visitorId: string): string {
  const id = String(visitorId || 'anon')
  const h = hashStr(id)
  const first = FIRST[h % FIRST.length]
  const last = LAST[Math.floor(h / FIRST.length) % LAST.length]
  return `${first} ${last}`
}

/** leadConversationTitle */
export function leadConversationTitle(visitorId: string, creatorSlug?: string): string {
  const name = leadDisplayName(visitorId)
  // título curto só com o nome — admin distingue pelo nome
  return name
}
