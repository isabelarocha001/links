import { useServiceSupabase } from '../../utils/supabase'

async function loadSyncPayCredentials() {
  const config = useRuntimeConfig() as any
  const env = process.env as Record<string, string | undefined>
  const idKeys = ['SYNCPAY_CLIENT_ID', 'NUXT_SYNCPAY_CLIENT_ID', 'SYCPAY_CLIENT_ID', 'SYNC_PAY_CLIENT_ID']
  const secretKeys = ['SYNCPAY_CLIENT_SECRET', 'NUXT_SYNCPAY_CLIENT_SECRET', 'SYCPAY_CLIENT_SECRET', 'SYNC_PAY_CLIENT_SECRET']
  let clientId = String(config.syncpayClientId || '').trim()
  let clientSecret = String(config.syncpayClientSecret || '').trim()
  for (const k of idKeys) if (!clientId && env[k]) clientId = String(env[k]).trim()
  for (const k of secretKeys) if (!clientSecret && env[k]) clientSecret = String(env[k]).trim()
  if (!clientId || !clientSecret) {
    try {
      const supabase = useServiceSupabase()
      const { data } = await supabase.from('app_secrets').select('key, value').in('key', [...idKeys, ...secretKeys])
      for (const row of data || []) {
        const k = String(row.key || '')
        const v = row.value ? String(row.value).trim() : ''
        if (!v) continue
        if (!clientId && idKeys.includes(k)) clientId = v
        if (!clientSecret && secretKeys.includes(k)) clientSecret = v
      }
    } catch {}
  }
  return { clientId, clientSecret }
}

async function getSyncPayToken(clientId: string, clientSecret: string) {
  const res = await fetch('https://api.syncpayments.com.br/api/partner/v1/auth-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || !data?.access_token) return null
  return String(data.access_token)
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const id = String(q.id || '').trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id required' })
  }

  const supabase = useServiceSupabase()

  let row: any = null
  {
    const { data } = await supabase
      .from('payments')
      .select('id, status, external_id, amount, pix_qr_code, metadata')
      .eq('id', id)
      .maybeSingle()
    row = data
  }
  if (!row) {
    const { data } = await supabase
      .from('payments')
      .select('id, status, external_id, amount, pix_qr_code, metadata')
      .eq('external_id', id)
      .maybeSingle()
    row = data
  }

  if (!row) {
    return { status: 'unknown', message: 'Pagamento não encontrado' }
  }

  // Se já aprovado no banco, retorna
  if (['approved', 'paid', 'completed'].includes(String(row.status || '').toLowerCase())) {
    return {
      status: row.status,
      payment_id: row.id,
      external_id: row.external_id,
      amount: row.amount,
      message: 'Pagamento confirmado',
    }
  }

  // Consulta SyncPay em tempo real
  const externalId = row.external_id || id
  if (externalId) {
    try {
      const { clientId, clientSecret } = await loadSyncPayCredentials()
      if (clientId && clientSecret) {
        const token = await getSyncPayToken(clientId, clientSecret)
        if (token) {
          const stRes = await fetch(`https://api.syncpayments.com.br/api/partner/v1/transaction/${externalId}`, {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })
          const stData = await stRes.json().catch(() => ({} as any))
          const remoteStatus = String(
            stData?.status || stData?.data?.status || stData?.transaction?.status || '',
          ).toLowerCase()

          if (remoteStatus) {
            const mapped =
              ['approved', 'paid', 'completed', 'confirmed', 'success'].includes(remoteStatus)
                ? 'approved'
                : ['pending', 'waiting', 'created', 'processing'].includes(remoteStatus)
                  ? 'pending'
                  : remoteStatus

            if (mapped === 'approved' && row.id) {
              try {
                await supabase
                  .from('payments')
                  .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    metadata: {
                      ...(row.metadata || {}),
                      status_check: stData,
                      checked_at: new Date().toISOString(),
                    },
                  })
                  .eq('id', row.id)
              } catch {}
            }

            return {
              status: mapped,
              payment_id: row.id,
              external_id: externalId,
              amount: row.amount,
              message:
                mapped === 'approved'
                  ? 'Pagamento confirmado'
                  : mapped === 'pending'
                    ? 'Aguardando pagamento'
                    : `Status: ${mapped}`,
              remote: remoteStatus,
            }
          }
        }
      }
    } catch (e: any) {
      console.error('[checkout/status] syncpay', e?.message || e)
    }
  }

  return {
    status: row.status || 'pending',
    payment_id: row.id,
    external_id: row.external_id,
    amount: row.amount,
    message: row.status === 'pending' ? 'Aguardando pagamento' : String(row.status),
  }
})
