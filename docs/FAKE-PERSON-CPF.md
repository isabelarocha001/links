# Fake person + CPF (instância própria)

Documento para humanos e LLMs. **Não usa API externa** (não chama geradordecpf.com.br).  
Algoritmo local do CPF (módulo 11), alinhado à shape pública documentada em https://geradordecpf.com.br/api-docs.

## Objetivo

- Gerar CPF matematicamente válido sem dependência de terceiro.
- Gerar dados fictícios estáveis por `visitor_id` para ferramentas e testes locais.
- O checkout real de Pix Automático pede o CPF do titular da conta; não usa CPF gerado.
- Expor endpoints REST no próprio app Nuxt (Vercel).

## Arquivos

| Arquivo | Papel |
|---------|--------|
| `server/utils/fake-person.ts` | Algoritmo CPF + validação + `fakePersonForVisitor()` |
| `server/api/cpf/index.get.ts` | `GET /api/cpf` — gera 1–100 CPFs |
| `server/api/cpf/validate.get.ts` | `GET /api/cpf/validate?cpf=` — valida |
| `server/api/fake-person.get.ts` | `GET /api/fake-person?visitor_id=` — pessoa completa estável |
| `server/api/checkout/vip-monthly.post.ts` | Completa nome/email se necessário e exige um CPF válido enviado pelo pagador |

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

1. Exige `visitor_id` (UUID), `accepted_recurring: true` e um `document` válido.
2. A página pede o CPF em uma janela antes de iniciar o Pix Automático.
3. Nome/e-mail ainda podem ser completados com dados locais; o CPF nunca é substituído por um valor gerado.
4. Envia o CPF à SyncPay para iniciar a autorização. O PrivSex não grava esse número no banco; a página o guarda no `localStorage` deste navegador para evitar nova digitação.

Uma chamada sem CPF válido é recusada antes de iniciar uma nova autorização.

## Aviso (Pix Automático)

CPF fictício pode ser válido **matematicamente**, mas não é o documento real do pagador. Por isso, os endpoints de geração continuam restritos a ferramentas/testes e não são usados no checkout mensal.

O checkout exige o CPF do titular que autoriza o Pix Automático. Tentativas antigas sem a confirmação desse dado não são reutilizadas; se houver uma autorização anterior aberta, o sistema bloqueia uma nova para evitar duplicidade.

## O que NÃO fazer

- Não chamar `https://geradordecpf.com.br` — a instância é local.
- Não confundir com consulta Receita Federal / CPF real.
- Não assumir que `message` da SyncPay no enroll é EMV; o QR vem em `payment.qr_code`.

## Histórico relacionado (SyncPay Pix Automático)

Problema intermitente: enroll cria mandato sem `qr_code`. Lookup da assinatura também retorna `pix_code`/`qr_code` null.  
Detalhes de diagnóstico ficaram na conversa de suporte; mitigação possível: retry de enroll + fallback `checkout_url` do plano.
