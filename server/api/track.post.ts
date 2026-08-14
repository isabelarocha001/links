export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const label = String(body?.label || '').slice(0, 80)
  const url = String(body?.url || '').slice(0, 500)
  if (!label) return { ok: false }

  const supabase = useServiceSupabase()
  const visitor = getCookie(event, 'vid') || crypto.randomUUID()
  if (!getCookie(event, 'vid')) {
    setCookie(event, 'vid', visitor, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/'
    })
  }

  const dedupe = `${visitor}:${label}:${Date.now()}`

  await supabase.from('tracking_events').insert({
    visitor_id: visitor,
    event_name: 'link_click',
    occurred_at: new Date().toISOString(),
    path: '/',
    dedupe_key: dedupe,
    metadata: { label, url, source: 'link_page' }
  })

  return { ok: true }
})
