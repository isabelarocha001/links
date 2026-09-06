import { useServiceSupabase } from '../../utils/supabase'
import { getTelegramConfig, ensureOwnerChatId } from '../../utils/telegram'

/**
 * Webhook do bot Telegram (@wanessabsxbot).
 * - Qualquer msg privada grava TELEGRAM_OWNER_CHAT_ID se ainda não existir
 * - Reply na notificação (ou /r <uuid> texto) → mensagem no chat do lead no site
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
  const chatType = String(msg.chat?.type || '')

  // Aprende o chat do admin na primeira DM
  if (chatType === 'private' && chatId) {
    await ensureOwnerChatId(chatId)
  }

  // Só processa reply se for o owner (ou se owner ainda não configurado e for private)
  const effectiveOwner = ownerChatId || (chatType === 'private' ? chatId : '')
  if (effectiveOwner && chatId !== String(effectiveOwner)) {
    return { ok: true, ignored: 'not_owner' }
  }

  const text = String(msg.text || msg.caption || '').trim()
  if (!text) return { ok: true, ignored: 'empty' }

  // Comandos simples
  if (/^\/start/i.test(text)) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            '✅ Bot conectado ao chat do site.\n\n' +
            'Quando um lead falar no site, você recebe aqui.\n' +
            'Responda a notificação (reply) ou use:\n/r <id-da-conversa> sua mensagem',
        }),
      })
    } catch {}
    return { ok: true, started: true }
  }

  // 1) Reply à notificação
  const reply = msg.reply_to_message
  let conversationId: string | null = null
  if (reply?.text) {
    const m = String(reply.text).match(/Conv:\s*([0-9a-f-]{36})/i)
    if (m) conversationId = m[1]
  }
  // 2) Comando /r <uuid> texto
  let replyBody = text
  if (!conversationId) {
    const m = text.match(/^\/r(?:eply)?\s+([0-9a-f-]{36})\s+([\s\S]+)/i)
    if (m) {
      conversationId = m[1]
      replyBody = m[2].trim()
    }
  }

  if (!conversationId) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            'Pra responder o lead do site: responda a notificação (swipe reply) ou use:\n' +
            '/r <id-da-conversa> sua mensagem',
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
