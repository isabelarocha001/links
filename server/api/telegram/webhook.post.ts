import { useServiceSupabase } from '../../utils/supabase'

async function getTelegramConfig() {
  const env = process.env as Record<string, string | undefined>
  let botToken = String(env.TELEGRAM_BOT_TOKEN || env.NUXT_TELEGRAM_BOT_TOKEN || '').trim()
  let ownerChatId = String(
    env.TELEGRAM_OWNER_CHAT_ID ||
      env.NUXT_TELEGRAM_OWNER_CHAT_ID ||
      env.TELEGRAM_ADMIN_CHAT_ID ||
      '',
  ).trim()

  if (!botToken || !ownerChatId) {
    try {
      const supabase = useServiceSupabase()
      const { data } = await supabase
        .from('app_secrets')
        .select('key, value')
        .in('key', [
          'TELEGRAM_BOT_TOKEN',
          'TELEGRAM_OWNER_CHAT_ID',
          'TELEGRAM_ADMIN_CHAT_ID',
        ])
      for (const row of data || []) {
        const k = String(row.key || '')
        const v = row.value ? String(row.value).trim() : ''
        if (!v) continue
        if (!botToken && k === 'TELEGRAM_BOT_TOKEN') botToken = v
        if (!ownerChatId && (k === 'TELEGRAM_OWNER_CHAT_ID' || k === 'TELEGRAM_ADMIN_CHAT_ID'))
          ownerChatId = v
      }
    } catch {}
  }
  return { botToken, ownerChatId }
}

/**
 * Webhook do bot Telegram.
 * Quando o admin RESPONDE (reply) a notificação de um lead do chat desbloqueado,
 * a mensagem entra em wa_funnel_messages como direction=bot e o lead vê no site.
 */
export default defineEventHandler(async (event) => {
  const { botToken, ownerChatId } = await getTelegramConfig()
  if (!botToken) {
    return { ok: false, error: 'bot_token_missing' }
  }

  let update: any
  try {
    update = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'invalid body' })
  }

  const msg = update?.message || update?.edited_message
  if (!msg) return { ok: true, ignored: true }

  const chatId = String(msg.chat?.id || '')
  // só aceita resposta do chat do dono (admin)
  if (ownerChatId && chatId !== String(ownerChatId)) {
    return { ok: true, ignored: 'not_owner' }
  }

  const text = String(msg.text || msg.caption || '').trim()
  if (!text) return { ok: true, ignored: 'empty' }

  // 1) Reply à notificação
  const reply = msg.reply_to_message
  let conversationId: string | null = null
  if (reply?.text) {
    const m = String(reply.text).match(/Conv:\s*([0-9a-f-]{36})/i)
    if (m) conversationId = m[1]
  }
  // 2) Comando /r <uuid> texto
  if (!conversationId) {
    const m = text.match(/^\/r(?:eply)?\s+([0-9a-f-]{36})\s+([\s\S]+)/i)
    if (m) {
      conversationId = m[1]
      // body is m[2]
    }
  }

  let replyBody = text
  const mCmd = text.match(/^\/r(?:eply)?\s+[0-9a-f-]{36}\s+([\s\S]+)/i)
  if (mCmd) replyBody = mCmd[1].trim()

  if (!conversationId) {
    // dica pro admin
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Pra responder o lead do site: responda a mensagem da notificação (swipe reply) ou use:\n/r <id-da-conversa> sua mensagem',
        }),
      })
    } catch {}
    return { ok: true, hint: true }
  }

  const supabase = useServiceSupabase()
  const { data: conv } = await supabase
    .from('wa_funnel_conversations')
    .select('id, visitor_id, status, creator_slug')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conv?.id || !conv.visitor_id) {
    return { ok: false, error: 'conversation_not_found' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('wa_funnel_messages').insert({
    visitor_id: conv.visitor_id,
    conversation_id: conv.id,
    direction: 'bot',
    message: replyBody.slice(0, 2000),
    step: 'live_admin',
    metadata: {
      source: 'telegram_admin_reply',
      telegram_message_id: msg.message_id,
      telegram_chat_id: chatId,
    },
  })

  if (error) {
    console.error('[telegram/webhook]', error.message)
    return { ok: false, error: error.message }
  }

  await supabase
    .from('wa_funnel_conversations')
    .update({ last_message_at: now, updated_at: now, status: 'open' })
    .eq('id', conv.id)

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ Enviado pro chat do lead no site',
        reply_to_message_id: msg.message_id,
      }),
    })
  } catch {}

  return { ok: true, conversation_id: conv.id }
})
