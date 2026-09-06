import { useServiceSupabase } from './supabase'

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
        if (!ownerChatId && (k === 'TELEGRAM_OWNER_CHAT_ID' || k === 'TELEGRAM_ADMIN_CHAT_ID')) {
          ownerChatId = v
        }
      }
    } catch {}
  }
  return { botToken, ownerChatId }
}

/** Grava o chat do admin na primeira interação privada com o bot */
export async function ensureOwnerChatId(chatId: string | number) {
  const id = String(chatId || '').trim()
  if (!id) return
  const { ownerChatId } = await getTelegramConfig()
  if (ownerChatId) return
  try {
    const supabase = useServiceSupabase()
    await supabase.from('app_secrets').upsert(
      { key: 'TELEGRAM_OWNER_CHAT_ID', value: id },
      { onConflict: 'key' },
    )
  } catch (e: any) {
    console.warn('[telegram] save owner chat', e?.message || e)
  }
}

export async function sendTelegramOwnerMessage(text: string, opts?: { replyMarkup?: any }) {
  const { botToken, ownerChatId } = await getTelegramConfig()
  if (!botToken) {
    console.warn('[telegram] missing bot token')
    return { ok: false as const, error: 'bot_token_missing' }
  }
  if (!ownerChatId) {
    console.warn('[telegram] missing TELEGRAM_OWNER_CHAT_ID — manda /start pro bot @wanessabsxbot')
    return { ok: false as const, error: 'owner_chat_missing' }
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ownerChatId,
        text: text.slice(0, 3900),
        disable_web_page_preview: true,
        ...(opts?.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
      }),
    })
    const data = await res.json().catch(() => ({} as any))
    if (!data?.ok) {
      console.warn('[telegram] sendMessage fail', data)
      return { ok: false as const, error: data?.description || 'send_failed' }
    }
    return { ok: true as const, message_id: data.result?.message_id }
  } catch (e: any) {
    console.error('[telegram] sendMessage', e?.message || e)
    return { ok: false as const, error: e?.message || 'network' }
  }
}

export async function notifyTelegramLeadMessage(opts: {
  conversationId: string
  visitorId: string
  message: string
  step?: string | null
  unlocked?: boolean
}) {
  const badge = opts.unlocked
    ? '💬 Lead no chat (desbloqueado)'
    : '💬 Lead no chat'

  const text =
    `${badge}\n` +
    `Conv: ${opts.conversationId}\n` +
    `Visitor: ${String(opts.visitorId).slice(0, 12)}\n` +
    (opts.step ? `Step: ${opts.step}\n` : '') +
    `\n📝 Mensagem:\n${String(opts.message || '').slice(0, 1200)}\n\n` +
    `↩️ Responda esta mensagem (reply) pra falar com o lead no site.\n` +
    `Ou: /r ${opts.conversationId} sua mensagem`

  return sendTelegramOwnerMessage(text)
}
