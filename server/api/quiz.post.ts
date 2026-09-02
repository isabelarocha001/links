/**
 * POST /api/quiz
 * Body: { visitor_id, fingerprint, status: 'pass'|'reject', answers? }
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  let visitorId = String(body?.visitor_id || getCookie(event, 'vid') || '').trim().slice(0, 64)
  const fingerprint = String(body?.fingerprint || '').trim().slice(0, 128)
  const status = String(body?.status || '').trim()

  if (!visitorId || visitorId.length < 8) {
    visitorId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}`
  }

  if (status !== 'pass' && status !== 'reject') {
    throw createError({ statusCode: 400, statusMessage: 'status must be pass or reject' })
  }

  setCookie(event, 'vid', visitorId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  const answers =
    body?.answers && typeof body.answers === 'object' ? body.answers : null

  try {
    const supabase = useServiceSupabase()
    const row: Record<string, any> = {
      visitor_id: visitorId,
      status,
      answers,
      updated_at: new Date().toISOString(),
    }
    if (fingerprint && fingerprint.length >= 8) {
      row.fingerprint = fingerprint
    }

    const { error } = await supabase.from('quiz_gate').upsert(row, {
      onConflict: 'visitor_id',
    })

    if (error) {
      return {
        ok: false,
        visitor_id: visitorId,
        fingerprint: fingerprint || null,
        status,
        stored: false,
        reason: error.message,
      }
    }

    return {
      ok: true,
      visitor_id: visitorId,
      fingerprint: fingerprint || null,
      status,
      stored: true,
    }
  } catch (e: any) {
    return {
      ok: false,
      visitor_id: visitorId,
      fingerprint: fingerprint || null,
      status,
      stored: false,
      reason: e?.message || 'error',
    }
  }
})
