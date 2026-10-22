/**
 * GET /api/checkout/status
 * Consulta status de um pagamento PIX (pending/approved).
 * Usado pelo front para liberar chat/plano após pagar.
 */
import { useServiceSupabase } from '../../utils/supabase'

/** Rate limit in-memory (por instância serverless). Chave: IP + payment id */
const STATUS_RL_WINDOW_MS = 4000 // 1 consulta a cada 4s por IP+id
const STATUS_RL_MAX_HITS = 1
const statusRateMap = new Map<string, { ts: number; hits: number }>()

function clientIp(event: any): string {
  const xf = getHeader(event, 'x-forwarded-for')
  if (xf) return String(xf).split(',')[0].trim()
  const real = getHeader(event, 'x-real-ip')
  if (real) return String(real).trim()
  try {
    return String(event?.node?.req?.socket?.remoteAddress || 'unknown')
  } catch {
    return 'unknown'
  }
}

function assertStatusRateLimit(event: any, paymentId: string) {
  const ip = clientIp(event)
  const key = `${ip}::${paymentId}`
  const now = Date.now()
  // limpa entradas antigas de vez em quando
  if (statusRateMap.size > 5000) {
    for (const [k, v] of statusRateMap) {
      if (now - v.ts > STATUS_RL_WINDOW_MS * 3) statusRateMap.delete(k)
    }
  }
  const prev = statusRateMap.get(key)
  if (!prev || now - prev.ts > STATUS_RL_WINDOW_MS) {
    statusRateMap.set(key, { ts: now, hits: 1 })
    return
  }
  if (prev.hits >= STATUS_RL_MAX_HITS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas consultas de status. Aguarde alguns segundos.',
    })
  }
  prev.hits += 1
  statusRateMap.set(key, prev)
}


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


/** Marca conversas do visitor como chat_unlocked (após PIX aprovado de plano chat). */
async function markChatUnlockedForVisitor(
  supabase: ReturnType<typeof useServiceSupabase>,
  visitorId: string,
  extra: Record<string, any> = {},
) {
  const vid = String(visitorId || '').trim()
  if (!vid) return 0
  const now = new Date().toISOString()
  const { data: convs } = await supabase
    .from('wa_funnel_conversations')
    .select('id, metadata')
    .eq('visitor_id', vid)
  let n = 0
  for (const c of convs || []) {
    const meta = (c.metadata && typeof c.metadata === 'object') ? { ...c.metadata } : {}
    if ((meta as any).chat_unlocked === true) continue
    ;(meta as any).chat_unlocked = true
    ;(meta as any).chat_unlocked_at = now
    ;(meta as any).chat_unlocked_by = extra.by || 'payment'
    if (extra.plan_key) (meta as any).chat_unlock_plan = extra.plan_key
    await supabase
      .from('wa_funnel_conversations')
      .update({ metadata: meta, updated_at: now })
      .eq('id', c.id)
    n++
  }
  return n
}

function isChatUnlockPlan(meta: any): boolean {
  const plan = String(meta?.plan_key || meta?.plan || '').toLowerCase()
  const source = String(meta?.source || '')
  return (
    plan.includes('chat') ||
    source === 'links_chat_lock' ||
    source === 'admin_unlock_chat' ||
    meta?.admin_grant === true
  )
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const id = String(q.id || '').trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id required' })
  }

  // Rate limit: 1 req / 4s por IP + id (protege SyncPay e o server)
  assertStatusRateLimit(event, id)

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

  // Pix Automático tem endpoint de assinatura próprio; não consultar como transação avulsa.
  const paymentMeta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const subscriptionToken = String((paymentMeta as any).subscription_token || '')
  if ((paymentMeta as any).billing_method === 'pix_automatico' && subscriptionToken) {
    try {
      const { clientId, clientSecret } = await loadSyncPayCredentials()
      if (clientId && clientSecret) {
        const token = await getSyncPayToken(clientId, clientSecret)
        if (token) {
          const response = await fetch(`https://api.syncpayments.com.br/api/partner/v1/subscriptions/${encodeURIComponent(subscriptionToken)}`, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          })
          const payload = await response.json().catch(() => ({} as any))
          if (response.ok) {
            const root = payload?.data && typeof payload.data === 'object' ? { ...payload, ...payload.data } : payload
            const subscription = root?.subscription || root
            const mandate = root?.mandate || subscription?.mandate || {}
            const charge = root?.latest_charge || root?.first_payment || root?.charge || subscription?.latest_charge || subscription?.charge || {}
            const subscriptionStatus = String(subscription?.status || root?.subscription_status || '').toLowerCase()
            const mandateStatus = String(mandate?.status || root?.mandate_status || subscription?.mandate_status || (paymentMeta as any).mandate_status || '')
            const chargeStatus = String(charge?.status || root?.charge_status || root?.payment_status || '').toLowerCase()
            const isPaid = ['approved', 'paid', 'completed', 'confirmed', 'success'].includes(chargeStatus) || ['active', 'approved', 'paid'].includes(subscriptionStatus)
            const mapped = isPaid ? 'approved' : ['cancelled', 'canceled', 'failed', 'expired'].includes(subscriptionStatus) ? subscriptionStatus : 'pending'
            const safeMeta = {
              ...paymentMeta,
              subscription_status: subscriptionStatus || (paymentMeta as any).subscription_status || 'pending',
              mandate_status: mandateStatus || (paymentMeta as any).mandate_status || 'CREATED',
              charge_status: chargeStatus || undefined,
              status_checked_at: new Date().toISOString(),
            }
            const update: Record<string, any> = { metadata: safeMeta }
            if (mapped === 'approved') { update.status = 'approved'; update.approved_at = new Date().toISOString() }
            else if (['cancelled', 'canceled', 'failed', 'expired'].includes(mapped)) update.status = mapped
            await supabase.from('payments').update(update).eq('id', row.id)
            return {
              status: mapped,
              payment_id: row.id,
              external_id: row.external_id,
              amount: row.amount,
              mandate_status: safeMeta.mandate_status,
              subscription_status: safeMeta.subscription_status,
              message: mapped === 'approved' ? 'Assinatura confirmada' : 'Aguardando autorização ou primeira cobrança',
            }
          }
          console.error('[checkout/status] subscription lookup failed', response.status)
        }
      }
    } catch (e: any) {
      console.error('[checkout/status] subscription status', e?.name || 'provider_error')
    }
    return {
      status: row.status || 'pending', payment_id: row.id, external_id: row.external_id,
      amount: row.amount, mandate_status: (paymentMeta as any).mandate_status || 'CREATED',
      subscription_status: (paymentMeta as any).subscription_status || 'pending',
      message: 'Aguardando autorização ou primeira cobrança',
    }
  }

  // Se já aprovado no banco, retorna (e garante metadata.chat_unlocked na conversa)
  if (['approved', 'paid', 'completed'].includes(String(row.status || '').toLowerCase())) {
    try {
      const meta = row.metadata || {}
      if (isChatUnlockPlan(meta)) {
        const vid = String((meta as any).visitor_id || '')
        if (vid) await markChatUnlockedForVisitor(supabase, vid, { by: 'status_already', plan_key: (meta as any).plan_key })
      }
    } catch {}
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
                const nextMeta = {
                  ...(row.metadata || {}),
                  status_check: stData,
                  checked_at: new Date().toISOString(),
                }
                await supabase
                  .from('payments')
                  .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    metadata: nextMeta,
                  })
                  .eq('id', row.id)
                if (isChatUnlockPlan(nextMeta)) {
                  const vid = String((nextMeta as any).visitor_id || '')
                  if (vid) await markChatUnlockedForVisitor(supabase, vid, { by: 'status_poll', plan_key: (nextMeta as any).plan_key })
                }
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
