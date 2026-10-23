import type { SupabaseClient } from '@supabase/supabase-js'

export const VIP_PIX_SESSION_TTL_MS = 30 * 60 * 1000

export function readPixExpiry(payload: any): string | null {
  const values = [
    payload?.expires_at,
    payload?.expiration,
    payload?.expiresAt,
    payload?.payment?.expires_at,
    payload?.payment?.expiration,
    payload?.charge?.expires_at,
    payload?.first_payment?.expires_at,
    payload?.latest_charge?.expires_at,
    payload?.mandate?.expires_at,
    payload?.data?.expires_at,
    payload?.data?.payment?.expires_at,
    payload?.data?.charge?.expires_at,
    payload?.data?.first_payment?.expires_at,
    payload?.data?.latest_charge?.expires_at,
    payload?.data?.mandate?.expires_at,
  ]
  for (const value of values) {
    const date = value ? new Date(value) : null
    if (date && Number.isFinite(date.getTime())) return date.toISOString()
  }
  return null
}

export async function findPendingVipPix(
  supabase: SupabaseClient,
  input: { visitorId: string; planKey: string; paymentMethod: 'pix' | 'pix_automatico' },
) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, status, external_id, amount, pix_qr_code, metadata, created_at')
    .eq('payment_method', input.paymentMethod)
    .eq('status', 'pending')
    .contains('metadata', {
      source: 'assinaturavip',
      plan_key: input.planKey,
      visitor_id: input.visitorId,
    })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export function getVipPixExpiry(row: any, fallbackToSessionTtl: boolean): string | null {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const saved = new Date(String(metadata.pix_expires_at || metadata.checkout_expires_at || ''))
  if (Number.isFinite(saved.getTime())) return saved.toISOString()
  if (!fallbackToSessionTtl || !row?.created_at) return null
  const createdAt = new Date(row.created_at)
  if (!Number.isFinite(createdAt.getTime())) return null
  return new Date(createdAt.getTime() + VIP_PIX_SESSION_TTL_MS).toISOString()
}

export function isVipPixExpired(expiresAt: string | null): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() <= Date.now()
}
