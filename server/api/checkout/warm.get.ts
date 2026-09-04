import { useServiceSupabase } from '../../utils/supabase'

async function loadSyncPayCredentials() {
  const config = useRuntimeConfig() as any
  const env = process.env as Record<string, string | undefined>
  let clientId = String(config.syncpayClientId || env.SYNCPAY_CLIENT_ID || env.NUXT_SYNCPAY_CLIENT_ID || '').trim()
  let clientSecret = String(config.syncpayClientSecret || env.SYNCPAY_CLIENT_SECRET || env.NUXT_SYNCPAY_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret) {
    try {
      const supabase = useServiceSupabase()
      const { data } = await supabase
        .from('app_secrets')
        .select('key, value')
        .in('key', ['SYNCPAY_CLIENT_ID', 'SYNCPAY_CLIENT_SECRET'])
      for (const row of data || []) {
        if (row.key === 'SYNCPAY_CLIENT_ID' && row.value) clientId = String(row.value).trim()
        if (row.key === 'SYNCPAY_CLIENT_SECRET' && row.value) clientSecret = String(row.value).trim()
      }
    } catch {}
  }
  return { clientId, clientSecret }
}

// cache em memória do processo (warm entre requests no mesmo instance)
let cachedToken: { token: string; exp: number } | null = null

export async function getCachedSyncPayToken(): Promise<string | null> {
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.token
  const { clientId, clientSecret } = await loadSyncPayCredentials()
  if (!clientId || !clientSecret) return null
  const res = await fetch('https://api.syncpayments.com.br/api/partner/v1/auth-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || !data?.access_token) return null
  const token = String(data.access_token)
  const expiresIn = Number(data.expires_in || 3600)
  cachedToken = { token, exp: Date.now() + expiresIn * 1000 }
  return token
}

export default defineEventHandler(async () => {
  try {
    const token = await getCachedSyncPayToken()
    return { ok: !!token, warmed: !!token }
  } catch (e: any) {
    return { ok: false, warmed: false, error: e?.message || 'warm failed' }
  }
})
