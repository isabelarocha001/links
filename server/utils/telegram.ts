/** Utils Telegram: envio de mensagens/API do bot. */
import { useServiceSupabase } from './supabase'
import { deleteTempMediaByUrl } from './media'
import { leadDisplayName } from './lead-name'

/** getTelegramConfig */
export async function getTelegramConfig(): Promise<{ botToken: string; ownerChatId: string }> {
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
  return { botToken, ownerChatId }
}

/** ensureOwnerChatId */
export async function ensureOwnerChatId(chatId: string | number) {
  const id = String(chatId || '').trim()
  if (!id) return
  const { ownerChatId } = await getTelegramConfig()
  if (ownerChatId) return
  try {
    const supabase = useServiceSupabase()
    await supabase.from('app_secrets').upsert({ key: 'TELEGRAM_OWNER_CHAT_ID', value: id }, { onConflict: 'key' })
  } catch (e: any) {
    console.warn('[telegram] save owner chat', e?.message || e)
  }
}

/** sendTelegramOwnerMessage */
export async function sendTelegramOwnerMessage(text: string) {
  const { botToken, ownerChatId } = await getTelegramConfig()
  if (!botToken) return { ok: false as const, error: 'bot_token_missing' }
  if (!ownerChatId) return { ok: false as const, error: 'owner_chat_missing' }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ownerChatId,
        text: text.slice(0, 3900),
        disable_web_page_preview: true,
      }),
    })
    const data = await res.json().catch(() => ({} as any))
    if (!data?.ok) return { ok: false as const, error: data?.description || 'send_failed' }
    return { ok: true as const, message_id: data.result?.message_id }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'network' }
  }
}

/** Envia mídia pro admin e apaga do storage temp em seguida */
export async function sendTelegramOwnerMedia(opts: {
  kind: 'photo' | 'video' | 'audio' | 'document'
  url: string
  caption?: string
  deleteAfter?: boolean
}) {
  const { botToken, ownerChatId } = await getTelegramConfig()
  if (!botToken || !ownerChatId) return { ok: false as const, error: 'config_missing' }

  const caption = String(opts.caption || '').slice(0, 900)
  let method = 'sendDocument'
  let field = 'document'
  if (opts.kind === 'photo') {
    method = 'sendPhoto'
    field = 'photo'
  } else if (opts.kind === 'video') {
    method = 'sendVideo'
    field = 'video'
  } else if (opts.kind === 'audio') {
    method = 'sendAudio'
    field = 'audio'
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ownerChatId,
        [field]: opts.url,
        caption: caption || undefined,
      }),
    })
    const data = await res.json().catch(() => ({} as any))
    if (!data?.ok) {
      // fallback document
      if (opts.kind !== 'document') {
        const res2 = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: ownerChatId, document: opts.url, caption: caption || undefined }),
        })
        const data2 = await res2.json().catch(() => ({} as any))
        if (!data2?.ok) return { ok: false as const, error: data2?.description || data?.description || 'send_failed' }
      } else {
        return { ok: false as const, error: data?.description || 'send_failed' }
      }
    }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'network' }
  } finally {
    if (opts.deleteAfter !== false) {
      try {
        await deleteTempMediaByUrl(opts.url)
      } catch {}
    }
  }
  return { ok: true as const }
}

/** notifyTelegramLeadMessage */
export async function notifyTelegramLeadMessage(opts: {
  conversationId: string
  visitorId: string
  message: string
  step?: string | null
  unlocked?: boolean
  media_url?: string | null
  media_kind?: string | null
}) {
  const name = leadDisplayName(opts.visitorId)
  const badge = opts.unlocked ? '💬 Lead no chat (desbloqueado)' : '💬 Lead no chat'
  const text =
    `${badge}\n` +
    `👤 ${name}\n` +
    `Conv: ${opts.conversationId}\n` +
    `Visitor: ${String(opts.visitorId).slice(0, 12)}\n` +
    (opts.step ? `Step: ${opts.step}\n` : '') +
    (opts.media_kind ? `Mídia: ${opts.media_kind}\n` : '') +
    `\n📝 Mensagem:\n${String(opts.message || '').slice(0, 1200)}\n\n` +
    `↩️ Responda (texto ou foto/vídeo/áudio) nesta mensagem pra falar com o lead.\n` +
    `Ou: /r ${opts.conversationId} sua mensagem`

  if (opts.media_url && opts.media_kind) {
    const kind = (['photo', 'video', 'audio'].includes(String(opts.media_kind))
      ? opts.media_kind
      : 'document') as 'photo' | 'video' | 'audio' | 'document'
    await sendTelegramOwnerMedia({
      kind,
      url: opts.media_url,
      caption: text.slice(0, 900),
      deleteAfter: true,
    })
    return { ok: true as const }
  }

  return sendTelegramOwnerMessage(text)
}
