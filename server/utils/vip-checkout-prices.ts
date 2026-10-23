import { useServiceSupabase } from './supabase'

export type VipCheckoutPrices = {
  monthlyBrl: number
  sixMonthBrl: number
  lifetimeBrl: number
  monthlyPeriodDays: 30
  sixMonthPeriodDays: 180
}

const PRICE_KEYS = {
  monthlyBrl: 'VIP_MONTHLY_PRICE_BRL',
  sixMonthBrl: 'VIP_SIX_MONTH_PRICE_BRL',
  lifetimeBrl: 'VIP_LIFETIME_PRICE_BRL',
} as const

function parsePrice(value: unknown, key: string): number {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000) {
    throw createError({
      statusCode: 503,
      statusMessage: `O preço ${key} não está configurado corretamente no Supabase.`,
    })
  }
  return Number(parsed.toFixed(2))
}

/** Reads the public VIP prices from the server-only app_secrets key/value table. */
export async function loadVipCheckoutPrices(): Promise<VipCheckoutPrices> {
  const supabase = useServiceSupabase()
  const { data, error } = await supabase
    .from('app_secrets')
    .select('key, value')
    .in('key', Object.values(PRICE_KEYS))

  if (error) {
    console.error('[checkout/vip-prices] Supabase lookup failed', error.code || 'unknown')
    throw createError({ statusCode: 503, statusMessage: 'Não consegui carregar os preços do Canal VIP.' })
  }

  const values = new Map((data || []).map((row: any) => [String(row.key), row.value]))
  return {
    monthlyBrl: parsePrice(values.get(PRICE_KEYS.monthlyBrl), PRICE_KEYS.monthlyBrl),
    sixMonthBrl: parsePrice(values.get(PRICE_KEYS.sixMonthBrl), PRICE_KEYS.sixMonthBrl),
    lifetimeBrl: parsePrice(values.get(PRICE_KEYS.lifetimeBrl), PRICE_KEYS.lifetimeBrl),
    monthlyPeriodDays: 30,
    sixMonthPeriodDays: 180,
  }
}
