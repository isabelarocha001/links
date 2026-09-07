# Stripe — formulário próprio (Elements)

Popup na conversa com campos:
- número do cartão
- validade
- CVV

Implementados com **Stripe Elements** (PCI: dados sensíveis ficam no iframe da Stripe; visual nosso).

## Fluxo

1. Lead gringo → `POST /api/checkout/stripe-intent` (PaymentIntent)
2. API lê `sk_` / `pk_` em `app_secrets`
3. Front monta Elements em `#stripe-card-number`, `#stripe-card-expiry`, `#stripe-card-cvc`
4. Lead toca **Pay** → `stripe.confirmCardPayment`
5. Webhook `payment_intent.succeeded` → libera chat no Supabase

## app_secrets

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_URL`
