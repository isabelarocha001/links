/**
 * GET /api/webhooks/stripe
 * Health-check do endpoint (Stripe envia POST; GET só para testar se a rota está no ar).
 */
export default defineEventHandler(() => {
  return {
    ok: true,
    service: 'stripe-webhook',
    methods: ['POST'],
    hint: 'Stripe envia eventos via POST. GET só confirma que a rota existe.',
  }
})
