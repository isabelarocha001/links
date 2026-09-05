import { useServiceSupabase, verifyAdminToken } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')

  // Se ainda tem sessão válida, marca presença offline no servidor
  if (verifyAdminToken(token, config.adminSessionSecret)) {
    try {
      const now = new Date().toISOString()
      const supabase = useServiceSupabase()
      await supabase.from('admin_presence').upsert(
        {
          id: 'main',
          is_online: false,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: 'id' },
      )
    } catch (e: any) {
      console.warn('[admin/logout] presence offline', e?.message || e)
    }
  }

  // Apaga o cookie de sessão admin (só some de verdade no logout)
  deleteCookie(event, 'admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  })

  return { ok: true, online: false }
})
