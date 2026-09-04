import { useServiceSupabase, getClientIp } from '../../utils/supabase'

type PlanKey = 'chat_quick' | 'chat_basic' | 'chat_midia'

const PLAN_FALLBACK: Record<PlanKey, { title: string; amount: number }> = {
  chat_quick: { title: 'Chat rápido 10 min', amount: 9.9 },
  chat_basic: { title: 'Chat 30 min', amount: 19.9 },
  chat_midia: { title: 'Chat + mídias', amount: 29.9 },
}

const MANUAL_PIX_KEY = '47992750967'

async function getSyncPayToken(clientId: string, clientSecret: string) {
  const res = await fetch('https://api.syncpayments.com.br/api/partner/v1/auth-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok || !data?.access_token) {
    const msg = data?.message || data?.error || `auth ${res.status}`
    throw new Error(`SyncPay auth falhou: ${msg}`)
  }
  return String(data.access_token)
}

async function loadSyncPayCredentials() {
  const config = useRuntimeConfig() as any
  const env = process.env as Record<string, string | undefined>

  const idKeys = [
    'SYNCPAY_CLIENT_ID',
    'NUXT_SYNCPAY_CLIENT_ID',
    'SYCPAY_CLIENT_ID',
    'SYNC_PAY_CLIENT_ID',
    'SYNCPAY_CLIENTID',
    'SYNC_CLIENT_ID',
  ]
  const secretKeys = [
    'SYNCPAY_CLIENT_SECRET',
    'NUXT_SYNCPAY_CLIENT_SECRET',
    'SYCPAY_CLIENT_SECRET',
    'SYNC_PAY_CLIENT_SECRET',
    'SYNCPAY_CLIENTSECRET',
    'SYNC_CLIENT_SECRET',
  ]

  let clientId = String(config.syncpayClientId || '').trim()
  let clientSecret = String(config.syncpayClientSecret || '').trim()

  if (!clientId) {
    for (const k of idKeys) {
      if (env[k]) {
        clientId = String(env[k]).trim()
        break
      }
    }
  }
  if (!clientSecret) {
    for (const k of secretKeys) {
      if (env[k]) {
        clientSecret = String(env[k]).trim()
        break
      }
    }
  }

  if (!clientId || !clientSecret) {
    try {
      const supabase = useServiceSupabase()
      const keys = [...idKeys, ...secretKeys]
      const { data } = await supabase.from('app_secrets').select('key, value').in('key', keys)
      for (const row of data || []) {
        const k = String(row.key || '')
        const v = row.value ? String(row.value).trim() : ''
        if (!v) continue
        if (!clientId && (idKeys.includes(k) || k.includes('CLIENT_ID'))) clientId = v
        if (!clientSecret && (secretKeys.includes(k) || k.includes('CLIENT_SECRET'))) clientSecret = v
      }
    } catch {}
  }

  return { clientId, clientSecret, hasId: !!clientId, hasSecret: !!clientSecret }
}

function extractPixCode(payData: any): string {
  return String(
    payData?.pix_code ||
      payData?.qr_code ||
      payData?.copy_paste ||
      payData?.copyPaste ||
      payData?.emv ||
      payData?.brcode ||
      payData?.payment_data?.pix_code ||
      payData?.payment_data?.qr_code ||
      payData?.data?.pix_code ||
      payData?.data?.qr_code ||
      payData?.transaction?.pix_code ||
      '',
  )
}

function extractQrImage(payData: any, pixCode: string): string {
  const img = String(
    payData?.qr_code_image ||
      payData?.qr_image ||
      payData?.qrcode_image ||
      payData?.payment_data?.qr_code_image ||
      payData?.data?.qr_code_image ||
      '',
  )
  if (img) return img
  if (pixCode) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode)}`
  }
  return ''
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const planKey = String(body?.plan_key || '').trim() as PlanKey
  const plan = PLAN_FALLBACK[planKey]
  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Plano inválido' })
  }

  const amount = Number(body?.amount)
  const finalAmount = Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : plan.amount
  const title = String(body?.title || plan.title).slice(0, 80)
  const visitor_id = body?.visitor_id ? String(body.visitor_id).slice(0, 120) : null
  const source = String(body?.source || 'links_chat_lock').slice(0, 60)

  const { clientId, clientSecret, hasId, hasSecret } = await loadSyncPayCredentials()
  const ip = getClientIp(event)
  const supabase = useServiceSupabase()

  // --- SyncPay path ---
  if (clientId && clientSecret) {
    try {
      const token = await getSyncPayToken(clientId, clientSecret)
      // Webhook: env OU origem do request (auto)
      let webhookUrl = String(
        (useRuntimeConfig() as any).syncpayWebhookUrl || process.env.SYNCPAY_WEBHOOK_URL || process.env.NUXT_SYNCPAY_WEBHOOK_URL || '',
      ).trim()
      if (!webhookUrl) {
        try {
          const origin = getRequestURL(event).origin
          if (origin && !origin.includes('localhost')) {
            webhookUrl = `${origin}/api/webhooks/syncpay`
          }
        } catch {}
      }

      const cashInBody: Record<string, any> = {
        amount: finalAmount,
        description: `${title} · ${source}`,
        client: {
          name: 'Cliente Wanessa',
          email: `lead${Date.now().toString().slice(-8)}@email.com`,
          cpf: '39053344705',
          phone: '11999999999',
        },
      }
      if (webhookUrl) cashInBody.webhook_url = webhookUrl

      const payRes = await fetch('https://api.syncpayments.com.br/api/partner/v1/cash-in', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cashInBody),
      })
      const payData = await payRes.json().catch(() => ({} as any))

      if (!payRes.ok) {
        console.error('[checkout/pix] syncpay cash-in', payRes.status, payData)
        throw new Error(payData?.message || payData?.error || `cash-in ${payRes.status}`)
      }

      const externalId = String(payData?.id || payData?.identifier || payData?.transaction_id || '')
      const pixCode = extractPixCode(payData)
      const qrImage = extractQrImage(payData, pixCode)

      if (!pixCode) {
        console.error('[checkout/pix] missing pix code payload', JSON.stringify(payData).slice(0, 800))
        throw new Error('SyncPay não retornou código PIX')
      }

      let paymentId: string | null = null
      try {
        const { data } = await supabase
          .from('payments')
          .insert({
            external_id: externalId || null,
            payment_method: 'pix',
            status: 'pending',
            amount: finalAmount,
            currency: 'BRL',
            pix_qr_code: pixCode,
            metadata: {
              source,
              plan_key: planKey,
              title,
              visitor_id,
              ip,
              provider: 'syncpay',
              syncpay: payData,
            },
          })
          .select('id')
          .single()
        paymentId = data?.id || null
      } catch (e: any) {
        console.error('[checkout/pix] payments insert', e?.message || e)
      }

      return {
        ok: true,
        mode: 'syncpay',
        payment_id: paymentId,
        external_id: externalId,
        pix_code: pixCode,
        qr_image: qrImage || null,
        amount: finalAmount,
        plan_key: planKey,
      }
    } catch (e: any) {
      console.error('[checkout/pix] syncpay path failed', e?.message || e)
      // cai no fallback manual abaixo
    }
  } else {
    console.error('[checkout/pix] missing credentials', { hasId, hasSecret })
  }


  // Sem SyncPay válido → erro explícito (não gera QR falso de telefone)
  const reason = hasId && hasSecret
    ? 'SyncPay respondeu com erro. Confira client_id/secret e permissões da API.'
    : 'Credenciais SyncPay ausentes no projeto links. Adicione SYNCPAY_CLIENT_ID e SYNCPAY_CLIENT_SECRET na Vercel (Production) ou no app_secrets.'

  throw createError({
    statusCode: 503,
    statusMessage: reason,
    data: {
      ok: false,
      credentials_found: !!(hasId && hasSecret),
      has_client_id: hasId,
      has_client_secret: hasSecret,
    },
  })
})
