import { useServiceSupabase, verifyAdminToken } from '../../utils/supabase'

/**
 * Heartbeat de presença do admin (chamar a cada ~15s enquanto /admin/chat estiver aberta).
 * Marca is_online=true e atualiza last_seen_at.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const offline = body?.offline === true
  const now = new Date().toISOString()
  const supabase = useServiceSupabase()

  const row = {
    id: 'main',
    is_online: !offline,
    last_seen_at: now,
    updated_at: now,
  }

  const { error } = await supabase.from('admin_presence').upsert(row, { onConflict: 'id' })
  if (error) {
    // Tabela pode não existir ainda — não quebra o admin UI
    console.warn('[admin/presence]', error.message)
    return { ok: false, reason: error.message, at: now, online: !offline }
  }

  return { ok: true, online: !offline, last_seen_at: now }
})
