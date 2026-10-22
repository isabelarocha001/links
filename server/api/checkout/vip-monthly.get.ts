import { useServiceSupabase } from '../../utils/supabase'
import { getCachedSyncPayToken } from './warm.get'

let cachedPlan: { value: { checkout_url: string; amount: number; periodicity_days: number }; expiresAt: number } | null = null

async function loadMonthlyPlanToken() {
  let token = String(process.env.SYNCPAY_VIP_MONTHLY_PLAN_TOKEN || '').trim()
  if (token) return token

  try {
    const supabase = useServiceSupabase()
    const { data } = await supabase
      .from('app_secrets')
      .select('value')
      .eq('key', 'SYNCPAY_VIP_MONTHLY_PLAN_TOKEN')
      .maybeSingle()
    token = String(data?.value || '').trim()
  } catch {
    // Keep the public response generic; the plan token is server configuration.
  }
  return token
}

export default defineEventHandler(async () => {
  if (cachedPlan && cachedPlan.expiresAt > Date.now()) {
    return { ok: true, ...cachedPlan.value }
  }

  const planToken = await loadMonthlyPlanToken()
  if (!/^[0-9a-f-]{36}$/i.test(planToken)) {
    throw createError({ statusCode: 503, statusMessage: 'O plano mensal de Pix Automático ainda não foi conectado à SyncPay.' })
  }

  const accessToken = await getCachedSyncPayToken()
  if (!accessToken) {
    throw createError({ statusCode: 503, statusMessage: 'A SyncPay não está configurada neste ambiente.' })
  }

  const response = await fetch(`https://api.syncpayments.com.br/api/partner/v1/subscription-plans/${planToken}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  })
  const payload = await response.json().catch(() => ({} as any))
  if (!response.ok) {
    console.error('[checkout/vip-monthly] plan lookup failed', response.status)
    throw createError({ statusCode: 503, statusMessage: 'Não consegui consultar o plano mensal na SyncPay.' })
  }

  const plan = payload?.data ?? payload
  const checkoutUrl = String(plan?.checkout_url || '')
  let parsedUrl: URL
  try { parsedUrl = new URL(checkoutUrl) } catch {
    throw createError({ statusCode: 503, statusMessage: 'A SyncPay não retornou um checkout válido para o plano.' })
  }

  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'app.syncpayments.com.br') {
    throw createError({ statusCode: 503, statusMessage: 'O endereço do checkout da SyncPay não passou na validação.' })
  }
  if (String(plan?.billing_method || '').toLowerCase() !== 'pix_automatico') {
    throw createError({ statusCode: 409, statusMessage: 'O plano cadastrado não usa Pix Automático.' })
  }
  if (String(plan?.status || '').toLowerCase() !== 'active') {
    throw createError({ statusCode: 409, statusMessage: 'O plano mensal está inativo na SyncPay.' })
  }

  const amount = Number(plan?.amount)
  const periodicityDays = Number(plan?.periodicity_days)
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(periodicityDays) || periodicityDays < 1) {
    throw createError({ statusCode: 503, statusMessage: 'O plano mensal retornou dados inválidos.' })
  }

  const value = { checkout_url: parsedUrl.toString(), amount: Number(amount.toFixed(2)), periodicity_days: periodicityDays }
  cachedPlan = { value, expiresAt: Date.now() + 5 * 60_000 }
  return { ok: true, ...value }
})
