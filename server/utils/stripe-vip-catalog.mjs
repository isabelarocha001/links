/** @typedef {'monthly' | 'lifetime'} VipStripePlanKey */
/** @typedef {'BRL' | 'USD' | 'EUR'} VipStripeCurrency */

/** @type {readonly VipStripeCurrency[]} */
export const VIP_STRIPE_CURRENCIES = ['BRL', 'USD', 'EUR']

/** @type {Record<VipStripePlanKey, { plan_key: string, amount_cents: Record<VipStripeCurrency, number>, title: string }>} */
export const VIP_STRIPE_CATALOG = {
  monthly: {
    plan_key: 'vip_monthly',
    amount_cents: { BRL: 2990, USD: 2990, EUR: 2990 },
    title: 'Canal VIP Mensal',
  },
  lifetime: {
    plan_key: 'vip_lifetime',
    amount_cents: { BRL: 10990, USD: 10990, EUR: 10990 },
    title: 'Canal VIP Vitalício',
  },
}

/** @type {Record<VipStripePlanKey, Record<VipStripeCurrency, string>>} */
export const VIP_STRIPE_PRICE_SECRET_KEYS = {
  monthly: {
    BRL: 'STRIPE_VIP_PRICE_MONTHLY_BRL',
    USD: 'STRIPE_VIP_PRICE_MONTHLY_USD',
    EUR: 'STRIPE_VIP_PRICE_MONTHLY_EUR',
  },
  lifetime: {
    BRL: 'STRIPE_VIP_PRICE_LIFETIME_BRL',
    USD: 'STRIPE_VIP_PRICE_LIFETIME_USD',
    EUR: 'STRIPE_VIP_PRICE_LIFETIME_EUR',
  },
}

/** @param {string} plan @param {string} currency */
export function getVipPriceCents(plan, currency) {
  if (!VIP_STRIPE_CURRENCIES.includes(/** @type {VipStripeCurrency} */ (currency))) return null
  if (plan !== 'monthly' && plan !== 'lifetime') return null
  return VIP_STRIPE_CATALOG[plan].amount_cents[/** @type {VipStripeCurrency} */ (currency)] ?? null
}
