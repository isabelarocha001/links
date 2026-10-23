/**
 * POST /api/telegram/webhook
 * Webhook do bot Telegram (mensagens, callbacks).
 */
import { useServiceSupabase } from '../../utils/supabase'
import { getTelegramConfig, ensureOwnerChatId, sendTelegramOwnerMessage } from '../../utils/telegram'
import { ingestTelegramFile, deleteTempMediaByUrl } from '../../utils/media'
import { randomUUID } from 'node:crypto'

/**
 * Webhook @wanessabsxbot
 * - texto / foto / vídeo / áudio / doc em reply → chat do lead no site
 * - mídia sobe no storage TEMP; lead salva no localStorage e API apaga depois
 */
export default defineEventHandler(async (event) => {
  const { botToken, ownerChatId } = await getTelegramConfig()
  if (!botToken) return { ok: false, error: 'bot_token_missing' }

  let update: any
  try {
    update = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'invalid body' })
  }

  // Add one positive reaction to each new post in the configured preview channel.
  // The deterministic rotation spreads emojis across posts while keeping the
  // official Bot API limit of one reaction per bot per message.
  const channelPost = update?.channel_post
  if (channelPost) {
    const configuredChannelId = String(process.env.TELEGRAM_PREVIEW_CHANNEL_ID || '').trim()
    const channelId = String(channelPost.chat?.id || '')
    if (!configuredChannelId || channelId !== configuredChannelId) {
      return { ok: true, ignored: 'channel_not_configured_or_mismatch' }
    }

    const positiveReactions = ['🔥', '❤️', '😍', '👏', '🥰', '💚']
    const messageId = Number(channelPost.message_id)
    const reaction = positiveReactions[Math.abs(messageId - 1) % positiveReactions.length]
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setMessageReaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          message_id: messageId,
          reaction: [{ type: 'emoji', emoji: reaction }],
          is_big: false
        })
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) {
        console.error('[telegram/webhook] channel post reaction failed', {
          channelId,
          messageId,
          description: result?.description || response.status
        })
        return { ok: true, reacted: false, error: 'reaction_failed' }
      }
      console.info('[telegram/webhook] channel post reacted', { channelId, messageId, reaction })
      return { ok: true, reacted: true, reaction }
    } catch (error: any) {
      console.error('[telegram/webhook] channel post reaction failed', error?.message || error)
      return { ok: true, reacted: false, error: 'reaction_failed' }
    }
  }

  // Track human members joining the configured Telegram preview channel.
  // Telegram only sends this update when chat_member is enabled in setWebhook.
  const memberUpdate = update?.chat_member
  if (memberUpdate) {
    const configuredChannelId = String(process.env.TELEGRAM_PREVIEW_CHANNEL_ID || '').trim()
    const channelId = String(memberUpdate.chat?.id || '')
    if (!configuredChannelId || channelId !== configuredChannelId) {
      return { ok: true, ignored: 'channel_not_configured_or_mismatch' }
    }

    const oldMember = memberUpdate.old_chat_member || {}
    const newMember = memberUpdate.new_chat_member || {}
    const wasMember = ['member', 'administrator', 'creator'].includes(String(oldMember.status)) ||
      (oldMember.status === 'restricted' && oldMember.is_member === true)
    const isMember = ['member', 'administrator', 'creator'].includes(String(newMember.status)) ||
      (newMember.status === 'restricted' && newMember.is_member === true)
    const joinedUser = newMember.user || {}
    const usedInviteLink = String(memberUpdate.invite_link?.invite_link || '')
    const firstName = String(joinedUser.first_name || '').trim()
    const lastName = String(joinedUser.last_name || '').trim()
    const displayName = [firstName, lastName].filter(Boolean).join(' ').slice(0, 100) || 'Uma pessoa'
    const username = String(joinedUser.username || '').trim().slice(0, 64)

    if (wasMember || !isMember || !joinedUser.id || joinedUser.is_bot) {
      return { ok: true, ignored: 'not_a_new_human_member' }
    }

    try {
      const supabase = useServiceSupabase()
      const { error } = await supabase.from('tracking_events').insert({
        visitor_id: randomUUID(),
        event_name: 'telegram_channel_join',
        occurred_at: new Date(Number(memberUpdate.date || 0) * 1000).toISOString(),
        path: '/telegram/channel',
        offer_slug: 'telegram_preview_channel',
        utm_source: 'telegram',
        utm_medium: 'channel_member',
        utm_campaign: channelId,
        utm_content: String(joinedUser.id),
        utm_term: username ? `@${username}` : null,
        metadata: {
          display_name: displayName,
          username: username || null,
          invite_link: usedInviteLink || null,
          telegram_update_id: update?.update_id ?? null
        }
      })
      if (error) console.error('[telegram/webhook] channel join tracking failed', error.message)
      else console.info('[telegram/webhook] channel join tracked', { channelId, telegramUserId: String(joinedUser.id) })
    } catch (error: any) {
      console.error('[telegram/webhook] channel join tracking failed', error?.message || error)
    }
    const nameText = username ? `${displayName} (@${username})` : displayName
    const notice = `👋 ${nameText} entrou no canal de prévias!\n🆔 ID do Telegram: ${String(joinedUser.id)}`
    const profileUrl = username
      ? `https://t.me/${encodeURIComponent(username)}`
      : `tg://user?id=${String(joinedUser.id)}`
    const notification = await sendTelegramOwnerMessage(notice, {
      reply_markup: {
        inline_keyboard: [[{ text: '👤 Ver perfil', url: profileUrl }]]
      }
    })
    if (!notification.ok) console.error('[telegram/webhook] join notification failed', notification.error)
    return { ok: true, tracked: true }
  }

  const msg = update?.message || update?.edited_message
  if (!msg) return { ok: true, ignored: true }

  const chatId = String(msg.chat?.id || '')
  const chatType = String(msg.chat?.type || '')
  if (chatType === 'private' && chatId) await ensureOwnerChatId(chatId)

  const effectiveOwner = ownerChatId || (chatType === 'private' ? chatId : '')
  if (effectiveOwner && chatId !== String(effectiveOwner)) {
    return { ok: true, ignored: 'not_owner' }
  }

  const text = String(msg.text || msg.caption || '').trim()

  if (/^\/start/i.test(text)) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            '✅ Bot conectado.\n\n' +
            'Responda as notificações com texto, foto, vídeo ou áudio — chega no chat do lead no site.\n' +
            'A mídia é temporária no servidor e some depois que o lead recebe.',
        }),
      })
    } catch {}
    return { ok: true, started: true }
  }

  // conversation id from reply or /r command
  let conversationId: string | null = null
  const reply = msg.reply_to_message
  if (reply?.text || reply?.caption) {
    const m = String(reply.text || reply.caption || '').match(/Conv:\s*([0-9a-f-]{36})/i)
    if (m) conversationId = m[1]
  }
  let replyBody = text
  if (!conversationId) {
    const m = text.match(/^\/r(?:eply)?\s+([0-9a-f-]{36})\s+([\s\S]*)/i)
    if (m) {
      conversationId = m[1]
      replyBody = (m[2] || '').trim()
    }
  }

  if (!conversationId) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Responda a notificação do lead (reply) com texto ou mídia, ou use:\n/r <id-da-conversa> mensagem',
        }),
      })
    } catch {}
    return { ok: true, hint: true }
  }

  const supabase = useServiceSupabase()
  const { data: conv } = await supabase
    .from('wa_funnel_conversations')
    .select('id, visitor_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conv?.id || !conv.visitor_id) return { ok: false, error: 'conversation_not_found' }

  // Detect media
  let kind: 'photo' | 'video' | 'audio' | 'doc' | 'text' = 'text'
  let fileId = ''
  let contentType = ''
  let ext = ''

  if (Array.isArray(msg.photo) && msg.photo.length) {
    kind = 'photo'
    fileId = msg.photo[msg.photo.length - 1].file_id
    contentType = 'image/jpeg'
    ext = 'jpg'
  } else if (msg.video?.file_id) {
    kind = 'video'
    fileId = msg.video.file_id
    contentType = msg.video.mime_type || 'video/mp4'
    ext = 'mp4'
  } else if (msg.voice?.file_id) {
    kind = 'audio'
    fileId = msg.voice.file_id
    contentType = msg.voice.mime_type || 'audio/ogg'
    ext = 'ogg'
  } else if (msg.audio?.file_id) {
    kind = 'audio'
    fileId = msg.audio.file_id
    contentType = msg.audio.mime_type || 'audio/mpeg'
    ext = 'mp3'
  } else if (msg.document?.file_id) {
    kind = 'doc'
    fileId = msg.document.file_id
    contentType = msg.document.mime_type || 'application/octet-stream'
    ext = (msg.document.file_name || '').split('.').pop() || 'bin'
  }

  let messageText = replyBody || (kind === 'text' ? '' : kind.toUpperCase())
  let adminPayload: any = null

  if (kind !== 'text' && fileId) {
    try {
      const up = await ingestTelegramFile({
        botToken,
        fileId,
        contentType,
        ext,
        visitor_id: conv.visitor_id,
        conversation_id: conv.id,
        kind,
      })
      const k = kind === 'doc' ? 'doc' : kind
      adminPayload = { k, u: up.public_url, temp: true, path: up.path }
      messageText = '⟦ADMIN⟧' + JSON.stringify(adminPayload)
      if (replyBody) {
        // caption kept in separate text field still in payload message - caption already in replyBody for display fallback
        adminPayload.caption = replyBody
        messageText = '⟦ADMIN⟧' + JSON.stringify(adminPayload)
      }
    } catch (e: any) {
      console.error('[telegram/webhook] media', e?.message || e)
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: '❌ Falha ao processar mídia: ' + (e?.message || 'erro') }),
        })
      } catch {}
      return { ok: false, error: 'media_failed' }
    }
  }

  if (!messageText) {
    return { ok: true, ignored: 'empty' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('wa_funnel_messages').insert({
    visitor_id: conv.visitor_id,
    conversation_id: conv.id,
    direction: 'bot',
    message: messageText.slice(0, 8000),
    step: 'live_admin',
    metadata: {
      source: 'telegram_admin_reply',
      telegram_message_id: msg.message_id,
      kind,
      temp_media: !!adminPayload?.temp,
      storage_path: adminPayload?.path || null,
    },
  })

  if (error) {
    if (adminPayload?.u) {
      try {
        await deleteTempMediaByUrl(adminPayload.u)
      } catch {}
    }
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
        text: kind === 'text' ? '✅ Enviado pro chat do lead' : `✅ ${kind} enviado pro chat do lead (temp → some após ele abrir)`,
        reply_to_message_id: msg.message_id,
      }),
    })
  } catch {}

  return { ok: true, conversation_id: conv.id, kind }
})
