import { loadVipCheckoutPrices } from '../../utils/vip-checkout-prices'

export default defineEventHandler(async () => {
  const prices = await loadVipCheckoutPrices()
  return {
    ok: true,
    currency: 'BRL',
    monthly: { amount: prices.monthlyBrl, periodicity_days: prices.monthlyPeriodDays },
    six_months: { amount: prices.sixMonthBrl, periodicity_days: prices.sixMonthPeriodDays },
    lifetime: { amount: prices.lifetimeBrl },
  }
})
