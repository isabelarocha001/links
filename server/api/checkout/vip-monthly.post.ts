import { useServiceSupabase } from '../../utils/supabase'
import { loadVipCheckoutPrices } from '../../utils/vip-checkout-prices'
import { getCachedSyncPayToken } from './warm.get'
import { findPendingVipPix, getVipPixExpiry, isVipPixExpired, readPixExpiry } from '../../utils/vip-pix-cache'

const enrollRateLimit = new Map<string, number>()

function enforceEnrollRateLimit(event: any) {
  const forwarded = String(getHeader(event, 'x-forwarded-for') || '').split(',')[0].trim()
  const ip = forwarded || String(getHeader(event, 'x-real-ip') || event?.node?.req?.socket?.remoteAddress || 'unknown')
  const now = Date.now()
  const previous = enrollRateLimit.get(ip) || 0
  if (now - previous < 20_000) {
    throw createError({ statusCode: 429, statusMessage: 'Aguarde alguns segundos antes de tentar novamente.' })
  }
  if (enrollRateLimit.size > 3000) {
    for (const [key, timestamp] of enrollRateLimit) if (now - timestamp > 60_000) enrollRateLimit.delete(key)
  }
  enrollRateLimit.set(ip, now)
}

type VipRecurringKey = 'monthly' | 'six_months'

const PLAN_TOKEN_KEYS: Record<VipRecurringKey, string> = {
  monthly: 'SYNCPAY_VIP_MONTHLY_PLAN_TOKEN',
  six_months: 'SYNCPAY_VIP_SIX_MONTH_PLAN_TOKEN',
}

async function loadPlanToken(planKey: VipRecurringKey) {
  let token = planKey === 'monthly' ? String(process.env.SYNCPAY_VIP_MONTHLY_PLAN_TOKEN || '').trim() : ''
  if (token) return token
  try {
    const supabase = useServiceSupabase()
    const { data } = await supabase.from('app_secrets').select('value')
      .eq('key', PLAN_TOKEN_KEYS[planKey]).maybeSingle()
    token = String(data?.value || '').trim()
  } catch { /* Return a generic configuration error below. */ }
  return token
}

function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (base: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(cpf.slice(0, 9), 10) === Number(cpf[9]) && digit(cpf.slice(0, 10), 11) === Number(cpf[10])
}

function extractEnrollment(payload: any) {
  const root = payload?.data && typeof payload.data === 'object' ? { ...payload, ...payload.data } : payload
  const subscription = root?.subscription || {}
  const charges = Array.isArray(root?.charges) ? root.charges : Array.isArray(subscription?.charges) ? subscription.charges : []
  const latestCharge = root?.latest_charge || root?.first_payment || root?.charge ||
    charges.find((charge: any) => String(charge?.status || '').toLowerCase() === 'pending') || charges[0] || {}
  const payment = root?.payment || latestCharge?.payment || root?.first_payment?.payment ||
    root?.charge?.payment || subscription?.payment || {}
  const mandate = root?.mandate || payment?.mandate || subscription?.mandate || {}
  const qrSources = [payment, mandate, root?.first_payment, latestCharge, subscription, root]
  const qrFields = ['qr_code', 'qrCode', 'qr_code_value', 'qr_code_text', 'pix_code', 'pix_copy_paste', 'copy_paste', 'emv']
  const qrCode = qrSources.flatMap((source: any) => qrFields.map((field) => source?.[field]))
    .find((value) => typeof value === 'string' && value.trim()) || ''
  return {
    root,
    payment,
    subscriptionToken: String(root?.subscription_token || root?.token || subscription?.token || ''),
    mandateId: String(payment?.mandate_id || mandate?.id || mandate?.mandate_id || root?.mandate_id || ''),
    mandateStatus: String(payment?.mandate_status || mandate?.status || root?.mandate_status || ''),
    qrCode: String(qrCode),
    expiresAt: readPixExpiry({ ...root, payment, charge: latestCharge, mandate }),
  }
}

function responseShape(payload: any) {
  const root = payload?.data && typeof payload.data === 'object' ? { ...payload, ...payload.data } : payload
  const subscription = root?.subscription || {}
  const charges = Array.isArray(root?.charges) ? root.charges : Array.isArray(subscription?.charges) ? subscription.charges : []
  const payment = root?.payment || root?.first_payment?.payment || root?.charge?.payment || subscription?.payment || {}
  const mandate = root?.mandate || payment?.mandate || subscription?.mandate || {}
  return {
    rootKeys: Object.keys(root || {}).slice(0, 40),
    paymentKeys: Object.keys(payment || {}).slice(0, 30),
    mandateKeys: Object.keys(mandate || {}).slice(0, 30),
    latestChargeKeys: Object.keys(charges[0] || root?.latest_charge || root?.first_payment || root?.charge || {}).slice(0, 30),
    chargeCount: charges.length,
  }
}

export default defineEventHandler(async (event) => {
  enforceEnrollRateLimit(event)
  const body = await readBody(event).catch(() => ({} as any))
  if (body?.plan_key && !['monthly', 'six_months'].includes(String(body.plan_key))) {
    throw createError({ statusCode: 400, statusMessage: 'Plano recorrente inválido.' })
  }
  const planKey: VipRecurringKey = body?.plan_key === 'six_months' ? 'six_months' : 'monthly'
  const prices = await loadVipCheckoutPrices()
  const expectedAmount = planKey === 'monthly' ? prices.monthlyBrl : prices.sixMonthBrl
  const expectedPeriodDays = planKey === 'monthly' ? prices.monthlyPeriodDays : prices.sixMonthPeriodDays
  const storedPlanKey = planKey === 'monthly' ? 'vip_monthly' : 'vip_six_months'
  const name = String(body?.name || '').trim().replace(/\s+/g, ' ').slice(0, 100)
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 254)
  const document = String(body?.document || '').replace(/\D/g, '')
  const visitorId = String(body?.visitor_id || '').trim()

  if (name.length < 2) throw createError({ statusCode: 400, statusMessage: 'Informe seu nome.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 400, statusMessage: 'Informe um e-mail válido.' })
  if (!isValidCpf(document)) throw createError({ statusCode: 400, statusMessage: 'Confira o CPF informado.' })
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
    throw createError({ statusCode: 400, statusMessage: 'Não consegui identificar esta visita. Atualize a página e tente novamente.' })
  }
  if (body?.accepted_recurring !== true) {
    throw createError({ statusCode: 400, statusMessage: 'Confirme que entendeu as cobranças recorrentes pelo Pix Automático.' })
  }

  const planToken = await loadPlanToken(planKey)
  if (!/^[0-9a-f-]{36}$/i.test(planToken)) {
    throw createError({ statusCode: 503, statusMessage: 'Este plano Pix Automático ainda não está configurado na SyncPay.' })
  }
  const accessToken = await getCachedSyncPayToken()
  if (!accessToken) throw createError({ statusCode: 503, statusMessage: 'A SyncPay não está configurada neste ambiente.' })

  const base = 'https://api.syncpayments.com.br/api/partner/v1'
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
  const planResponse = await fetch(`${base}/subscription-plans/${planToken}`, { headers, signal: AbortSignal.timeout(8000) })
  const planPayload = await planResponse.json().catch(() => ({} as any))
  if (!planResponse.ok) {
    console.error('[checkout/vip-recurring] plan lookup failed', planResponse.status)
    throw createError({ statusCode: 503, statusMessage: 'Não consegui verificar este plano na SyncPay.' })
  }
  const plan = planPayload?.data ?? planPayload
  if (String(plan?.billing_method || '').toLowerCase() !== 'pix_automatico') {
    throw createError({ statusCode: 409, statusMessage: 'O plano configurado não usa Pix Automático.' })
  }
  if (String(plan?.status || '').toLowerCase() !== 'active') {
    throw createError({ statusCode: 409, statusMessage: 'Este plano está inativo na SyncPay.' })
  }
  if (Number(plan?.amount) !== expectedAmount || Number(plan?.periodicity_days) !== expectedPeriodDays) {
    throw createError({ statusCode: 409, statusMessage: 'O valor ou o ciclo do plano na SyncPay não corresponde ao checkout configurado.' })
  }

  const supabase = useServiceSupabase()
  const cached = await findPendingVipPix(supabase, { visitorId, planKey: storedPlanKey, paymentMethod: 'pix_automatico' })
  if (cached && !cached.pix_qr_code) {
    const cachedSubscriptionToken = String(cached.metadata?.subscription_token || cached.external_id || '')
    if (cachedSubscriptionToken) {
      try {
        const statusResponse = await fetch(`${base}/subscriptions/${encodeURIComponent(cachedSubscriptionToken)}`, {
          headers, signal: AbortSignal.timeout(6000),
        })
        if (statusResponse.ok) {
          const statusPayload = await statusResponse.json().catch(() => ({} as any))
          const recovered = extractEnrollment(statusPayload)
          if (recovered.qrCode) {
            const metadata = {
              ...(cached.metadata || {}),
              ...(recovered.mandateId ? { mandate_id: recovered.mandateId } : {}),
              mandate_status: recovered.mandateStatus || cached.metadata?.mandate_status || 'CREATED',
              ...(recovered.expiresAt ? { pix_expires_at: recovered.expiresAt } : {}),
              pix_qr_code_missing: false,
            }
            const { error } = await supabase.from('payments').update({ pix_qr_code: recovered.qrCode, metadata }).eq('id', cached.id)
            if (!error) {
              return {
                ok: true,
                reused: true,
                payment_id: cached.id,
                subscription_status: String(recovered.root?.status || 'pending_first_payment'),
                mandate_id: recovered.mandateId || metadata.mandate_id || null,
                mandate_status: metadata.mandate_status,
                pix_code: recovered.qrCode,
                amount: expectedAmount,
                periodicity_days: expectedPeriodDays,
                expires_at: recovered.expiresAt,
              }
            }
          }
        }
      } catch { /* Keep the existing enrollment; never create a duplicate subscription. */ }
    }
    throw createError({ statusCode: 502, statusMessage: 'A autorização já foi criada, mas a SyncPay ainda não disponibilizou o QR Code. Tente novamente em alguns instantes; não gere outra autorização.' })
  }
  if (cached?.pix_qr_code) {
    let cachedExpiry = getVipPixExpiry(cached, false)
    let cachedStatus = String(cached.metadata?.subscription_status || '').toLowerCase()
    let cachedMandateStatus = String(cached.metadata?.mandate_status || '').toLowerCase()
    let cachedChargeStatus = ''
    let cacheIsPaid = ['active', 'approved', 'paid'].includes(cachedStatus)
    let cacheIsTerminal = ['cancelled', 'canceled', 'failed', 'expired', 'rejected', 'declined'].includes(cachedStatus) || ['cancelled', 'canceled', 'failed', 'expired', 'rejected', 'declined'].includes(cachedMandateStatus)

    const cachedSubscriptionToken = String(cached.metadata?.subscription_token || cached.external_id || '')
    if (cachedSubscriptionToken) {
      try {
        const statusResponse = await fetch(`${base}/subscriptions/${encodeURIComponent(cachedSubscriptionToken)}`, {
          headers, signal: AbortSignal.timeout(6000),
        })
        const statusPayload = await statusResponse.json().catch(() => ({} as any))
        if (statusResponse.ok) {
          const root = statusPayload?.data && typeof statusPayload.data === 'object' ? { ...statusPayload, ...statusPayload.data } : statusPayload
          const subscription = root?.subscription || root
          const mandate = root?.mandate || subscription?.mandate || {}
          const charges = Array.isArray(root?.charges) ? root.charges : Array.isArray(subscription?.charges) ? subscription.charges : []
          const latestCharge = root?.latest_charge || root?.first_payment || root?.charge || charges.find((charge: any) => String(charge?.status || '').toLowerCase() === 'pending') || charges[0] || {}
          cachedExpiry = cachedExpiry || readPixExpiry({ ...root, charge: latestCharge, mandate })
          cachedStatus = String(subscription?.status || root?.subscription_status || cachedStatus).toLowerCase()
          cachedMandateStatus = String(mandate?.status || root?.mandate_status || subscription?.mandate_status || cachedMandateStatus).toLowerCase()
          cachedChargeStatus = String(latestCharge?.status || root?.charge_status || '').toLowerCase()
          cacheIsPaid = ['approved', 'paid', 'completed', 'confirmed', 'success'].includes(cachedChargeStatus) || ['active', 'approved', 'paid'].includes(cachedStatus)
          cacheIsTerminal = ['cancelled', 'canceled', 'failed', 'expired', 'rejected', 'declined'].includes(cachedStatus) || ['cancelled', 'canceled', 'failed', 'expired', 'rejected', 'declined'].includes(cachedMandateStatus) || ['cancelled', 'canceled', 'failed', 'expired', 'rejected', 'declined'].includes(cachedChargeStatus)
        }
      } catch { /* Keep using the saved authorization if the provider is temporarily unavailable. */ }
    }

    if (cachedExpiry && isVipPixExpired(cachedExpiry)) cacheIsTerminal = true
    if (cacheIsPaid || cacheIsTerminal) {
      await supabase.from('payments').update({
        status: cacheIsPaid ? 'approved' : cachedExpiry && isVipPixExpired(cachedExpiry) ? 'expired' : ['cancelled', 'canceled'].includes(cachedStatus) ? 'canceled' : 'failed',
        ...(cacheIsPaid ? { approved_at: new Date().toISOString() } : {}),
        metadata: { ...(cached.metadata || {}), subscription_status: cachedStatus, mandate_status: cachedMandateStatus, ...(cachedChargeStatus ? { charge_status: cachedChargeStatus } : {}) },
      }).eq('id', cached.id)
      if (cacheIsPaid) {
        return {
          ok: true,
          reused: true,
          status: 'approved',
          payment_id: cached.id,
          subscription_status: cachedStatus || 'active',
          mandate_id: cached.metadata?.mandate_id || null,
          mandate_status: cachedMandateStatus || 'ACTIVE',
          pix_code: cached.pix_qr_code,
          amount: expectedAmount,
          periodicity_days: expectedPeriodDays,
          expires_at: cachedExpiry,
        }
      }
    } else {
      return {
        ok: true,
        reused: true,
        payment_id: cached.id,
        subscription_status: cachedStatus || 'pending_first_payment',
        mandate_id: cached.metadata?.mandate_id || null,
        mandate_status: cachedMandateStatus || 'CREATED',
        pix_code: cached.pix_qr_code,
        amount: expectedAmount,
        periodicity_days: expectedPeriodDays,
        expires_at: cachedExpiry,
      }
    }
  }

  const { data: payment, error: insertError } = await supabase.from('payments').insert({
    external_id: null,
    payment_method: 'pix_automatico',
    status: 'pending',
    amount: expectedAmount,
    currency: 'BRL',
    metadata: { source: 'assinaturavip', plan_key: storedPlanKey, visitor_id: visitorId, billing_method: 'pix_automatico' },
  }).select('id').single()
  if (insertError || !payment?.id) {
    console.error('[checkout/vip-monthly] pending payment insert failed', insertError?.code || 'unknown')
    throw createError({ statusCode: 503, statusMessage: 'Não consegui iniciar a assinatura agora. Tente novamente.' })
  }

  try {
    const enrollResponse = await fetch(`${base}/subscription-plans/${planToken}/enroll`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, document }),
      signal: AbortSignal.timeout(12000),
    })
    const enrollPayload = await enrollResponse.json().catch(() => ({} as any))
    if (!enrollResponse.ok) {
      await supabase.from('payments').update({ status: 'failed', failed_at: new Date().toISOString() }).eq('id', payment.id)
      console.error('[checkout/vip-monthly] enroll failed', enrollResponse.status, enrollPayload?.code || 'provider_error')
      throw createError({ statusCode: 502, statusMessage: 'A SyncPay não conseguiu iniciar a autorização. Confira os dados e tente novamente.' })
    }

    let enrollment = extractEnrollment(enrollPayload)
    if (!enrollment.qrCode && enrollment.subscriptionToken) {
      try {
        const recoveryResponse = await fetch(`${base}/subscriptions/${encodeURIComponent(enrollment.subscriptionToken)}`, {
          headers, signal: AbortSignal.timeout(6000),
        })
        if (recoveryResponse.ok) {
          const recovered = extractEnrollment(await recoveryResponse.json().catch(() => ({} as any)))
          enrollment = {
            ...enrollment,
            ...recovered,
            subscriptionToken: enrollment.subscriptionToken,
            mandateId: recovered.mandateId || enrollment.mandateId,
            mandateStatus: recovered.mandateStatus || enrollment.mandateStatus,
            qrCode: recovered.qrCode || enrollment.qrCode,
            expiresAt: recovered.expiresAt || enrollment.expiresAt,
          }
        }
      } catch { /* Persist the provider identifiers below so a retry cannot create a duplicate. */ }
    }
    if (enrollment.subscriptionToken && enrollment.mandateId && !enrollment.qrCode) {
      const metadata = {
        source: 'assinaturavip',
        plan_key: storedPlanKey,
        visitor_id: visitorId,
        billing_method: 'pix_automatico',
        subscription_token: enrollment.subscriptionToken,
        mandate_id: enrollment.mandateId,
        mandate_status: enrollment.mandateStatus || 'CREATED',
        subscription_status: String(enrollment.root?.status || 'pending_first_payment'),
        pix_qr_code_missing: true,
        ...(enrollment.expiresAt ? { pix_expires_at: enrollment.expiresAt } : {}),
      }
      const { error: persistError } = await supabase.from('payments').update({
        metadata,
      }).eq('id', payment.id)
      if (persistError) {
        console.error('[checkout/vip-monthly] mandate persistence failed', persistError.code || 'unknown')
        throw createError({ statusCode: 503, statusMessage: 'A autorização foi criada, mas não consegui salvar o acompanhamento. Não tente gerar outra; fale com o suporte.' })
      }
      console.error('[checkout/vip-monthly] mandate QR missing', {
        hasSubscription: true,
        hasMandate: true,
        shape: responseShape(enrollPayload),
      })
      throw createError({ statusCode: 502, statusMessage: 'A autorização foi criada, mas a SyncPay não retornou o QR Code. Tente novamente em alguns instantes; não gere outra autorização.' })
    }
    if (!enrollment.subscriptionToken || !enrollment.mandateId || !enrollment.qrCode) {
      await supabase.from('payments').update({ status: 'failed', failed_at: new Date().toISOString() }).eq('id', payment.id)
      console.error('[checkout/vip-monthly] incomplete mandate response', {
        hasSubscription: !!enrollment.subscriptionToken,
        hasMandate: !!enrollment.mandateId,
        hasQr: !!enrollment.qrCode,
        shape: responseShape(enrollPayload),
      })
      throw createError({ statusCode: 502, statusMessage: 'A SyncPay não retornou os dados do mandato Pix Automático.' })
    }

    const metadata = {
      source: 'assinaturavip',
      plan_key: storedPlanKey,
      visitor_id: visitorId,
      billing_method: 'pix_automatico',
      subscription_token: enrollment.subscriptionToken,
      mandate_id: enrollment.mandateId,
      mandate_status: enrollment.mandateStatus || 'CREATED',
      subscription_status: String(enrollment.root?.status || 'pending_first_payment'),
      ...(enrollment.expiresAt ? { pix_expires_at: enrollment.expiresAt } : {}),
    }
    const { error: updateError } = await supabase.from('payments').update({
      pix_qr_code: enrollment.qrCode,
      metadata,
    }).eq('id', payment.id)
    if (updateError) {
      console.error('[checkout/vip-monthly] mandate persistence failed', updateError.code || 'unknown')
      throw createError({ statusCode: 503, statusMessage: 'A autorização foi iniciada, mas não consegui salvar o acompanhamento. Não tente autorizar outra vez; fale com o suporte.' })
    }

    return {
      ok: true,
      payment_id: payment.id,
      subscription_status: metadata.subscription_status,
      mandate_id: enrollment.mandateId,
      mandate_status: metadata.mandate_status,
      pix_code: enrollment.qrCode,
      amount: expectedAmount,
      periodicity_days: expectedPeriodDays,
      expires_at: enrollment.expiresAt,
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    await supabase.from('payments').update({ status: 'failed', failed_at: new Date().toISOString() }).eq('id', payment.id)
    console.error('[checkout/vip-monthly] provider request failed', error?.name || 'network_error')
    throw createError({ statusCode: 502, statusMessage: 'Não consegui falar com a SyncPay. Tente novamente em instantes.' })
  }
})
