import { useServiceSupabase, getClientIp } from '../utils/supabase'

async function notifyTelegramLeadMessage(opts: {
  conversationId: string
  visitorId: string
  message: string
  step?: string | null
  unlocked?: boolean
}) {
  if (!opts.unlocked) return
  const env = process.env as Record<string, string | undefined>
  let botToken = String(env.TELEGRAM_BOT_TOKEN || env.NUXT_TELEGRAM_BOT_TOKEN || '').trim()
  let ownerChatId = String(
    env.TELEGRAM_OWNER_CHAT_ID || env.NUXT_TELEGRAM_OWNER_CHAT_ID || env.TELEGRAM_ADMIN_CHAT_ID || '',
  ).trim()
  const supabase = useServiceSupabase()
  if (!botToken || !ownerChatId) {
    try {
      const { data } = await supabase
        .from('app_secrets')
        .select('key, value')
        .in('key', ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_OWNER_CHAT_ID', 'TELEGRAM_ADMIN_CHAT_ID'])
      for (const row of data || []) {
        const k = String(row.key || '')
        const v = row.value ? String(row.value).trim() : ''
        if (!v) continue
        if (!botToken && k === 'TELEGRAM_BOT_TOKEN') botToken = v
        if (!ownerChatId && (k === 'TELEGRAM_OWNER_CHAT_ID' || k === 'TELEGRAM_ADMIN_CHAT_ID')) ownerChatId = v
      }
    } catch {}
  }
  if (!botToken || !ownerChatId) {
    console.warn('[funnel-chat] telegram notify skipped: missing bot token or owner chat id')
    return
  }
  const text =
    `💬 Lead no chat do site (desbloqueado)\n` +
    `Conv: ${opts.conversationId}\n` +
    `Visitor: ${opts.visitorId.slice(0, 12)}\n` +
    (opts.step ? `Step: ${opts.step}\n` : '') +
    `\n${opts.message.slice(0, 1500)}\n\n` +
    `↩️ Responda esta mensagem (reply) pra falar com o lead no site.`
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ownerChatId,
        text,
        disable_web_page_preview: true,
      }),
    })
    const data = await res.json().catch(() => ({} as any))
    if (data?.result?.message_id) {
      await supabase
        .from('wa_funnel_conversations')
        .update({
          telegram_last_notify_id: data.result.message_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', opts.conversationId)
    }
  } catch (e: any) {
    console.error('[funnel-chat] telegram notify', e?.message || e)
  }
}


/**
 * Persiste mensagens do funil isoladas por conversation_id.
 * Body: { visitor_id, conversation_id?, access_token?, session_id?, direction, message, ... }
 *
 * Cada lead tem uma conversa própria (wa_funnel_conversations).
 * RLS bloqueia anon/authenticated: só a API com service_role acessa.
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  let body: any
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  const direction = String(body?.direction || '').toLowerCase()
  const message = String(body?.message || '').trim()
  if (!message || message.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'message required' })
  }
  if (direction !== 'lead' && direction !== 'bot') {
    throw createError({ statusCode: 400, statusMessage: 'direction must be lead|bot' })
  }

  const visitor_id = body?.visitor_id ? String(body.visitor_id).slice(0, 120) : null
  if (!visitor_id) {
    throw createError({ statusCode: 400, statusMessage: 'visitor_id required' })
  }

  let conversation_id = body?.conversation_id ? String(body.conversation_id).slice(0, 80) : null
  let access_token = body?.access_token ? String(body.access_token).slice(0, 120) : null
  const session_id = body?.session_id ? String(body.session_id).slice(0, 120) : null
  const step = body?.step ? String(body.step).slice(0, 40) : null
  const selected_offer = body?.selected_offer ? String(body.selected_offer).slice(0, 80) : null
  const selected_price = body?.selected_price ? String(body.selected_price).slice(0, 40) : null
  const creator_slug = String(body?.creator_slug || 'wanessabsx').slice(0, 60)
  const metadata = typeof body?.metadata === 'object' && body.metadata ? body.metadata : {}

  const ip = getClientIp(event)
  const ua = getHeader(event, 'user-agent') || null
  const supabase = useServiceSupabase()
  const now = new Date().toISOString()

  // Garante conversa isolada do lead
  try {
    if (conversation_id && access_token) {
      const { data: existing } = await supabase
        .from('wa_funnel_conversations')
        .select('id, visitor_id, access_token')
        .eq('id', conversation_id)
        .eq('access_token', access_token)
        .maybeSingle()

      if (!existing || existing.visitor_id !== visitor_id) {
        // token/id inválido ou de outro lead → cria nova (não vaza conversa)
        conversation_id = null
        access_token = null
      }
    }

    if (!conversation_id) {
      // reutiliza conversa open do mesmo visitor + creator nas últimas 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('wa_funnel_conversations')
        .select('id, access_token')
        .eq('visitor_id', visitor_id)
        .eq('creator_slug', creator_slug)
        .eq('status', 'open')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recent?.id) {
        conversation_id = recent.id
        access_token = recent.access_token
      } else {
        const { data: created, error: cErr } = await supabase
          .from('wa_funnel_conversations')
          .insert({
            visitor_id,
            creator_slug,
            status: 'open',
            title: `Lead ${visitor_id.slice(0, 8)} × ${creator_slug}`,
            metadata: { session_id, source: 'wanessa_links_funnel' },
            last_message_at: now,
            updated_at: now,
          })
          .select('id, access_token')
          .single()

        if (cErr || !created?.id) {
          console.error('[funnel-chat] create conversation', cErr?.message)
          return { ok: false, error: cErr?.message || 'conversation_create_failed' }
        }
        conversation_id = created.id
        access_token = created.access_token
      }
    } else {
      await supabase
        .from('wa_funnel_conversations')
        .update({ last_message_at: now, updated_at: now })
        .eq('id', conversation_id)
        .eq('visitor_id', visitor_id)
    }
  } catch (e: any) {
    console.error('[funnel-chat] conversation', e?.message || e)
    return { ok: false, error: 'conversation_error' }
  }

  const row = {
    visitor_id,
    session_id,
    conversation_id,
    direction,
    message: message.slice(0, 2000),
    step,
    selected_offer,
    selected_price,
    metadata: {
      ...metadata,
      ip,
      user_agent: ua ? String(ua).slice(0, 300) : null,
      path: '/chat/' + creator_slug,
      source: 'wanessa_links_funnel',
      conversation_id,
    },
  }

  try {
    const { error } = await supabase.from('wa_funnel_messages').insert(row)
    if (error) {
      console.error('[funnel-chat]', error.message)
      return { ok: false, error: error.message, conversation_id, access_token }
    }
    // Se o chat está desbloqueado, avisa o admin no Telegram pra responder
    const unlocked = body?.chat_unlocked === true || body?.unlocked === true || step === 'other' || step === 'live_admin'
    if (direction === 'lead' && conversation_id) {
      // fire-and-forget
      notifyTelegramLeadMessage({
        conversationId: conversation_id,
        visitorId: visitor_id,
        message,
        step,
        unlocked,
      }).catch(() => {})
    }

    return {
      ok: true,
      conversation_id,
      access_token,
    }
  } catch (e: any) {
    console.error('[funnel-chat]', e?.message || e)
    return { ok: false, error: 'insert_failed' }
  }
})
