import { useServiceSupabase } from '../utils/supabase'

/**
 * Status público de presença.
 * online só se is_online=true E last_seen_at há menos de 2s.
 * Nunca devolve label "offline" — só "visto por último…".
 */
const ONLINE_MS = 2_000

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
      label: 'visto por último recentemente',
    }
  }

  if (data.is_online !== true) {
    return {
      ok: true,
      online: false,
      last_seen_at: data.last_seen_at || null,
      label: formatLastSeen(data.last_seen_at),
    }
  }

  const last = data.last_seen_at ? new Date(String(data.last_seen_at)).getTime() : 0
  const fresh = last > 0 && Date.now() - last < ONLINE_MS
  const online = fresh

  return {
    ok: true,
    online,
    last_seen_at: data.last_seen_at || null,
    label: online ? 'online' : formatLastSeen(data.last_seen_at),
  }
})
