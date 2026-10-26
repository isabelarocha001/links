/**
 * GET /api/checkout/stripe-vip-availability
 * Diz quais planos/moedas têm cartão configurado — sem price_id nem secrets.
 */
import { listVipStripeAvailability } from '../../utils/stripe-vip'
import { VIP_STRIPE_CATALOG } from '../../utils/stripe-vip-catalog.mjs'

export default defineEventHandler(async (event) => {
  const { configured, available } = await listVipStripeAvailability()
  setHeader(event, 'Cache-Control', 'no-store')
  return {
    ok: true,
    card_enabled: configured,
    methods: available.map((a) => ({
      plan: a.plan,
      plan_key: VIP_STRIPE_CATALOG[a.plan].plan_key,
      currency: a.currency,
      amount: a.amount_cents / 100,
      amount_cents: a.amount_cents,
    })),
  }
})
