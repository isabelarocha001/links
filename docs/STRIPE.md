# Stripe (cartão / gringa) — 100% via Supabase

Sem variáveis na Vercel. Tudo em `app_secrets`.

## Chaves (tabela `app_secrets`)

| key | value |
|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (opcional até configurar webhook) |

O front **nunca** lê a secret. Fluxo:

1. Lead gringo → `POST /api/checkout/stripe-session`
2. API lê `sk_` + `pk_` no Supabase, cria session embedded
3. API devolve `client_secret` + `publishable_key` ao front
4. Front monta Stripe.js no popup da conversa

## Webhook

URL: `https://SEU_DOMINIO/api/webhooks/stripe`  
Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`  
Signing secret → gravar em `app_secrets` como `STRIPE_WEBHOOK_SECRET`.
