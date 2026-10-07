import { useServiceSupabase } from '../utils/supabase'

const POSITION_KEY = 'PRIVSEX_AVATAR_POSITION'
const DEFAULT_POSITION = { x: 50, y: 50, zoom: 1 }

function normalizePosition(value: any) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  return {
    x: Math.min(100, Math.max(0, Number.isFinite(Number(parsed?.x)) ? Number(parsed.x) : DEFAULT_POSITION.x)),
    y: Math.min(100, Math.max(0, Number.isFinite(Number(parsed?.y)) ? Number(parsed.y) : DEFAULT_POSITION.y)),
    zoom: Math.min(2, Math.max(1, Number.isFinite(Number(parsed?.zoom)) ? Number(parsed.zoom) : DEFAULT_POSITION.zoom)),
  }
}

export default defineEventHandler(async () => {
  try {
    const supabase = useServiceSupabase()
    const { data, error } = await supabase
      .from('app_secrets')
      .select('value')
      .eq('key', POSITION_KEY)
      .maybeSingle()

    if (!error && data?.value) return normalizePosition(data.value)
  } catch {}

  return DEFAULT_POSITION
})
