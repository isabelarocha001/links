# Stripe VIP — setup (Test Mode)

Integração isolada do cartão em `/assinaturavip`. **Não** reutiliza o webhook de chat.

## Secrets em `app_secrets` (service role only)

| key | formato | uso |
|-----|---------|-----|
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` | API Stripe |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…` | Embedded Checkout no browser |
| `STRIPE_VIP_WEBHOOK_SECRET` | `whsec_…` | **Só** endpoint `/api/webhooks/stripe-vip` |
| `STRIPE_VIP_PRICE_MONTHLY_BRL` | `price_…` | Price recorrente BRL 29,90 |
| `STRIPE_VIP_PRICE_MONTHLY_USD` | `price_…` | Price recorrente USD 29,90 |
| `STRIPE_VIP_PRICE_MONTHLY_EUR` | `price_…` | Price recorrente EUR 29,90 |
| `STRIPE_VIP_PRICE_LIFETIME_BRL` | `price_…` | Price one-time BRL 109,90 |
| `STRIPE_VIP_PRICE_LIFETIME_USD` | `price_…` | Price one-time USD 109,90 |
| `STRIPE_VIP_PRICE_LIFETIME_EUR` | `price_…` | Price one-time EUR 109,90 |
| `STRIPE_VIP_CAPABILITY_SECRET` | string longa aleatória | (opcional) assina token de status |

Nunca commitar valores reais. Separar Test e Live.

## Prices

- **Mensal:** `unit_amount=2990`, `currency=brl`, recurring:
  - preferível `interval=day`, `interval_count=30` se a oferta prometer 30 dias; **ou**
  - `interval=month`, `interval_count=1` (mês-calendário) e a UI mostra “todo mês”.
- **Vitalício:** `unit_amount=10990`, em cada moeda configurada, **sem** recurring.
- Catálogo aprovado: mensal 29,90 BRL/USD/EUR; vitalício 109,90 BRL/USD/EUR. Valores numéricos iguais por moeda, sem conversão cambial.
- Cada combinação plano/moeda precisa de um Price Stripe Live ativo próprio; só gravar o `price_id` correspondente no segredo com o mesmo sufixo.

## Webhook (Dashboard)

URL: `https://wanessabsx.vercel.app/api/webhooks/stripe-vip`  
Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.

Segredo **próprio** → `STRIPE_VIP_WEBHOOK_SECRET` (não reutilizar o do chat).

## SQL recomendado

```sql
create table if not exists public.stripe_vip_events (
  event_id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.rate_limit_buckets (
  key text primary key,
  window_start timestamptz not null,
  count int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.stripe_vip_events enable row level security;
alter table public.rate_limit_buckets enable row level security;
revoke all on public.stripe_vip_events from anon, authenticated;
revoke all on public.rate_limit_buckets from anon, authenticated;
```

Inspecionar o projeto Supabase real antes de aplicar.

## Rotas

| método | path |
|--------|------|
| GET | `/api/checkout/stripe-vip-availability` |
| POST | `/api/checkout/stripe-vip-session` |
| GET | `/api/checkout/stripe-vip-status` |
| POST | `/api/webhooks/stripe-vip` |

## UI

- Cartão só fica disponível quando availability retornar o plano+moeda e o Price Stripe ativo tiver valor, moeda e recorrência corretos.
- Pix BRL permanece. Sem cartão configurado, o fluxo Pix atual é preservado.
- Stripe **não** usa `/api/fake-person` nem CPF sintético.
