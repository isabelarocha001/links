import { useServiceSupabase } from '../../utils/supabase'
import { loadVipCheckoutPrices } from '../../utils/vip-checkout-prices'
import { getCachedSyncPayToken } from './warm.get'

type VipRecurringKey = 'monthly' | 'six_months'
const BASE_TOKEN_KEYS: Record<VipRecurringKey, string> = {
  monthly: 'SYNCPAY_VIP_MONTHLY_PLAN_TOKEN',
  six_months: 'SYNCPAY_VIP_SIX_MONTH_PLAN_TOKEN',
}
const ADDONS = { vip_bump_video_call: { amount: 49.9, suffix: 'VIDEO_CALL' }, vip_bump_sexting: { amount: 19.9, suffix: 'SEXTING' } } as const
type AddonId = keyof typeof ADDONS
const cachedPlans = new Map<string, { value: { checkout_url: string; amount: number; periodicity_days: number }; expiresAt: number }>()

async function loadPlanToken(planKey: VipRecurringKey, addons: AddonId[]) {
  const suffix = addons.map((id) => ADDONS[id].suffix).sort().join('_')
  const configKey = suffix ? `${BASE_TOKEN_KEYS[planKey]}_${suffix}` : BASE_TOKEN_KEYS[planKey]
  let token = String(process.env[configKey] || '').trim()
  if (token) return token
  try {
    const supabase = useServiceSupabase()
    const { data } = await supabase.from('app_secrets').select('value').eq('key', configKey).maybeSingle()
    token = String(data?.value || '').trim()
  } catch { /* Keep the response generic. */ }
  return token
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const planKey: VipRecurringKey = query.plan_key === 'six_months' ? 'six_months' : 'monthly'
  const rawAddons = query.add_ons === undefined ? [] : Array.isArray(query.add_ons) ? query.add_ons : [query.add_ons]
  if (rawAddons.length > 2 || rawAddons.some((id) => typeof id !== 'string' || !(id in ADDONS))) {
    throw createError({ statusCode: 400, statusMessage: 'Extra do plano invalido.' })
  }
  const addons = [...new Set(rawAddons as AddonId[])].sort()
  const prices = await loadVipCheckoutPrices()
  const baseAmount = planKey === 'monthly' ? prices.monthlyBrl : prices.sixMonthBrl
  const expectedAmount = Number((baseAmount + addons.reduce((sum, id) => sum + ADDONS[id].amount, 0)).toFixed(2))
  const expectedPeriodDays = planKey === 'monthly' ? prices.monthlyPeriodDays : prices.sixMonthPeriodDays
  const cacheKey = `${planKey}:${addons.join('|')}`
  const cached = cachedPlans.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.value.amount === expectedAmount && cached.value.periodicity_days === expectedPeriodDays) return { ok: true, ...cached.value }
    cachedPlans.delete(cacheKey)
  }

  const planToken = await loadPlanToken(planKey, addons)
  if (!/^[0-9a-f-]{36}$/i.test(planToken)) {
    throw createError({ statusCode: 503, statusMessage: 'Esta combinacao de plano e extras ainda nao foi cadastrada na SyncPay.' })
  }
  const accessToken = await getCachedSyncPayToken()
  if (!accessToken) throw createError({ statusCode: 503, statusMessage: 'A SyncPay nao esta configurada neste ambiente.' })

  const response = await fetch(`https://api.syncpayments.com.br/api/partner/v1/subscription-plans/${planToken}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  })
  const payload = await response.json().catch(() => ({} as any))
  if (!response.ok) {
    console.error('[checkout/vip-recurring] plan lookup failed', response.status)
    throw createError({ statusCode: 503, statusMessage: 'Nao consegui consultar o plano na SyncPay.' })
  }
  const plan = payload?.data ?? payload
  const checkoutUrl = String(plan?.checkout_url || '')
  let parsedUrl: URL
  try { parsedUrl = new URL(checkoutUrl) } catch { throw createError({ statusCode: 503, statusMessage: 'A SyncPay nao retornou um checkout valido.' }) }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'app.syncpayments.com.br') {
    throw createError({ statusCode: 503, statusMessage: 'O endereco do checkout da SyncPay nao passou na validacao.' })
  }
  if (String(plan?.billing_method || '').toLowerCase() !== 'pix_automatico') throw createError({ statusCode: 409, statusMessage: 'O plano cadastrado nao usa Pix Automatico.' })
  if (String(plan?.status || '').toLowerCase() !== 'active') throw createError({ statusCode: 409, statusMessage: 'O plano esta inativo na SyncPay.' })
  if (Number(plan?.amount) !== expectedAmount || Number(plan?.periodicity_days) !== expectedPeriodDays) {
    throw createError({ statusCode: 409, statusMessage: 'O valor ou o ciclo do plano na SyncPay nao corresponde ao checkout.' })
  }
  const value = { checkout_url: parsedUrl.toString(), amount: expectedAmount, periodicity_days: expectedPeriodDays }
  cachedPlans.set(cacheKey, { value, expiresAt: Date.now() + 5 * 60_000 })
  return { ok: true, ...value }
})
