# Stripe (cartão / gringa)

## Fluxo

- **Brasil (`isPt`)**: PIX via SyncPay (como antes)
- **Internacional**: Stripe Checkout **embedded** no popup da conversa (não abre página externa)

## APIs

| Path | Uso |
|------|-----|
| `POST /api/checkout/stripe-session` | Cria session `ui_mode=embedded` |
| `POST /api/webhooks/stripe` | `checkout.session.completed` → payment approved + chat_unlocked |

## Env (Vercel) — recomendado

```
STRIPE_SECRET_KEY=sk_live_...
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Também pode ficar em `app_secrets` (Supabase): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

## Webhook no Dashboard Stripe

1. Developers → Webhooks → Add endpoint  
2. URL: `https://SEU_DOMINIO/api/webhooks/stripe`  
3. Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`  
4. Copiar signing secret → `STRIPE_WEBHOOK_SECRET`

## Segurança

Nunca versionar `sk_live` no Git. Se a chave vazou em chat, rotacione no Dashboard Stripe.
