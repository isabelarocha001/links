# Fake person + CPF (instância própria)

Documento para humanos e LLMs. **Não usa API externa** (não chama geradordecpf.com.br).  
Algoritmo local do CPF (módulo 11), alinhado à shape pública documentada em https://geradordecpf.com.br/api-docs.

## Objetivo

- Gerar CPF matematicamente válido sem dependência de terceiro.
- Auto-preencher **nome, e-mail, telefone e CPF** de forma **estável por `visitor_id`**, para o funil/agente não pedir esses dados a cada visita.
- Expor endpoints REST no próprio app Nuxt (Vercel).

## Arquivos

| Arquivo | Papel |
|---------|--------|
| `server/utils/fake-person.ts` | Algoritmo CPF + validação + `fakePersonForVisitor()` |
| `server/api/cpf/index.get.ts` | `GET /api/cpf` — gera 1–100 CPFs |
| `server/api/cpf/validate.get.ts` | `GET /api/cpf/validate?cpf=` — valida |
| `server/api/fake-person.get.ts` | `GET /api/fake-person?visitor_id=` — pessoa completa estável |
| `server/api/checkout/vip-monthly.post.ts` | Se body sem nome/email/CPF válidos, preenche via `fakePersonForVisitor(visitorId)` |

## Visitor ID (contexto)

- Home / funil (`app.vue`): `localStorage['wanessa_vid']` via `getOrCreateVisitorId()` — UUID na 1ª visita, reutilizado depois; também cookie `vid`.
- `/assinaturavip`: `localStorage['vip-checkout-visitor-id']` via `getVipVisitorId()`.
- Mesmo `visitor_id` ⇒ mesmos dados fictícios (hash FNV-1a + PRNG Mulberry32).

## Endpoints

### `GET /api/cpf`

Query: `count` (1–100, default 1), `uf` (SP/RJ/… opcional), `masked` (true|false, default true), `format` (json|text).

Exemplos de resposta:

```json
{ "cpf": "123.456.789-09", "masked": true }
```

```json
{ "cpfs": ["..."], "count": 5, "masked": false }
```

### `GET /api/cpf/validate?cpf=`

```json
{
  "valid": true,
  "formatted": "123.456.789-09",
  "digits": "12345678909",
  "regionalDigit": 9,
  "possibleStates": ["PR", "SC"]
}
```

### `GET /api/fake-person?visitor_id=&uf=`

```json
{
  "ok": true,
  "name": "Lucas Silva",
  "email": "lucas.silva.1234@email.com",
  "phone": "11987654321",
  "document": "82047315743",
  "document_masked": "820.473.157-43",
  "visitor_id": "..."
}
```

## Uso no checkout VIP mensal

`POST /api/checkout/vip-monthly`:

1. Exige `visitor_id` (UUID) e `accepted_recurring: true`.
2. Lê `name` / `email` / `document` do body.
3. Se inválidos ou ausentes → completa com `fakePersonForVisitor(visitorId)`.
4. Segue enroll SyncPay Pix Automático.

O agente pode mandar só `{ visitor_id, accepted_recurring: true }` e o servidor completa o resto.

## Aviso (Pix Automático)

CPF fictício é válido **matematicamente**, não é documento real de uma pessoa.  
No Pix Automático o banco autoriza o mandato no CPF de quem escaneia o QR no app.  
Auto-fill serve para não travar o funil/agente e para testes; cobrança real pode falhar na autorização bancária se o CPF não for o do pagador.

## O que NÃO fazer

- Não chamar `https://geradordecpf.com.br` — a instância é local.
- Não confundir com consulta Receita Federal / CPF real.
- Não assumir que `message` da SyncPay no enroll é EMV; o QR vem em `payment.qr_code`.

## Histórico relacionado (SyncPay Pix Automático)

Problema intermitente: enroll cria mandato sem `qr_code`. Lookup da assinatura também retorna `pix_code`/`qr_code` null.  
Detalhes de diagnóstico ficaram na conversa de suporte; mitigação possível: retry de enroll + fallback `checkout_url` do plano.
