import { useServiceSupabase, verifyAdminToken } from '../../utils/supabase'

const POSITION_KEY = 'PRIVSEX_AVATAR_POSITION'

function normalizePosition(body: any) {
  return {
    x: Math.min(100, Math.max(0, Number.isFinite(Number(body?.x)) ? Number(body.x) : 50)),
    y: Math.min(100, Math.max(0, Number.isFinite(Number(body?.y)) ? Number(body.y) : 50)),
    zoom: Math.min(2, Math.max(1, Number.isFinite(Number(body?.zoom)) ? Number(body.zoom) : 1.16)),
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')

  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const position = normalizePosition(await readBody(event))
  const supabase = useServiceSupabase()
  const { error } = await supabase
    .from('app_secrets')
    .upsert({ key: POSITION_KEY, value: JSON.stringify({ version: 2, ...position }) }, { onConflict: 'key' })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Não foi possível salvar a posição: ${error.message}` })
  }

  return { ok: true, position }
})
