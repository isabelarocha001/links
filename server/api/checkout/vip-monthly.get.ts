import { useServiceSupabase } from '../../utils/supabase'
import { loadVipCheckoutPrices } from '../../utils/vip-checkout-prices'
import { getCachedSyncPayToken } from './warm.get'

type VipRecurringKey = 'monthly' | 'six_months'
const TOKEN_KEYS: Record<VipRecurringKey, string> = {
  monthly: 'SYNCPAY_VIP_MONTHLY_PLAN_TOKEN',
  six_months: 'SYNCPAY_VIP_SIX_MONTH_PLAN_TOKEN',
}
const cachedPlans = new Map<VipRecurringKey, { value: { checkout_url: string; amount: number; periodicity_days: number }; expiresAt: number }>()

async function loadPlanToken(planKey: VipRecurringKey) {
  let token = planKey === 'monthly' ? String(process.env.SYNCPAY_VIP_MONTHLY_PLAN_TOKEN || '').trim() : ''
  if (token) return token
  try {
    const supabase = useServiceSupabase()
    const { data } = await supabase.from('app_secrets').select('value').eq('key', TOKEN_KEYS[planKey]).maybeSingle()
    token = String(data?.value || '').trim()
  } catch { /* Keep the response generic. */ }
  return token
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const planKey: VipRecurringKey = query.plan_key === 'six_months' ? 'six_months' : 'monthly'
  const prices = await loadVipCheckoutPrices()
  const expectedAmount = planKey === 'monthly' ? prices.monthlyBrl : prices.sixMonthBrl
  const expectedPeriodDays = planKey === 'monthly' ? prices.monthlyPeriodDays : prices.sixMonthPeriodDays
  const cached = cachedPlans.get(planKey)
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.value.amount === expectedAmount && cached.value.periodicity_days === expectedPeriodDays) {
      return { ok: true, ...cached.value }
    }
    cachedPlans.delete(planKey)
  }

  const planToken = await loadPlanToken(planKey)
  if (!/^[0-9a-f-]{36}$/i.test(planToken)) {
    throw createError({ statusCode: 503, statusMessage: 'Este plano Pix Automático ainda não está conectado à SyncPay.' })
  }
  const accessToken = await getCachedSyncPayToken()
  if (!accessToken) throw createError({ statusCode: 503, statusMessage: 'A SyncPay não está configurada neste ambiente.' })

  const response = await fetch(`https://api.syncpayments.com.br/api/partner/v1/subscription-plans/${planToken}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  })
  const payload = await response.json().catch(() => ({} as any))
  if (!response.ok) {
    console.error('[checkout/vip-recurring] plan lookup failed', response.status)
    throw createError({ statusCode: 503, statusMessage: 'Não consegui consultar o plano na SyncPay.' })
  }

  const plan = payload?.data ?? payload
  const checkoutUrl = String(plan?.checkout_url || '')
  let parsedUrl: URL
  try { parsedUrl = new URL(checkoutUrl) } catch {
    throw createError({ statusCode: 503, statusMessage: 'A SyncPay não retornou um checkout válido.' })
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'app.syncpayments.com.br') {
    throw createError({ statusCode: 503, statusMessage: 'O endereço do checkout da SyncPay não passou na validação.' })
  }
  if (String(plan?.billing_method || '').toLowerCase() !== 'pix_automatico') {
    throw createError({ statusCode: 409, statusMessage: 'O plano cadastrado não usa Pix Automático.' })
  }
  if (String(plan?.status || '').toLowerCase() !== 'active') {
    throw createError({ statusCode: 409, statusMessage: 'O plano está inativo na SyncPay.' })
  }
  if (Number(plan?.amount) !== expectedAmount || Number(plan?.periodicity_days) !== expectedPeriodDays) {
    throw createError({ statusCode: 409, statusMessage: 'O valor ou o ciclo do plano na SyncPay não corresponde ao checkout.' })
  }

  const value = { checkout_url: parsedUrl.toString(), amount: expectedAmount, periodicity_days: expectedPeriodDays }
  cachedPlans.set(planKey, { value, expiresAt: Date.now() + 5 * 60_000 })
  return { ok: true, ...value }
})
