import { useServiceSupabase } from '../utils/supabase'

/**
 * Status público de presença da criadora (para o chat do lead).
 * online se last_seen_at < 45s; senão "visto por último às HH:MM" (fuso America/Sao_Paulo).
 * Não expõe tokens nem dados sensíveis.
 */
const ONLINE_MS = 45_000

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return 'visto por último recentemente'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'visto por último recentemente'
    const fmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const time = fmt.format(d)
    const dayFmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
    })
    const today = dayFmt.format(new Date())
    const that = dayFmt.format(d)
    if (today === that) return `visto por último às ${time}`
    return `visto por último ${that} às ${time}`
  } catch {
    return 'visto por último recentemente'
  }
}

export default defineEventHandler(async () => {
  const supabase = useServiceSupabase()
  const { data, error } = await supabase
    .from('admin_presence')
    .select('is_online, last_seen_at')
    .eq('id', 'main')
    .maybeSingle()

  if (error || !data) {
    return {
      ok: true,
      online: false,
      last_seen_at: null,
      label: 'offline',
    }
  }

  const last = data.last_seen_at ? new Date(String(data.last_seen_at)).getTime() : 0
  const fresh = last > 0 && Date.now() - last < ONLINE_MS
  const online = !!data.is_online && fresh

  return {
    ok: true,
    online,
    last_seen_at: data.last_seen_at || null,
    label: online ? 'online' : formatLastSeen(data.last_seen_at),
  }
})
