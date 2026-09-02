/**
 * GET /api/quiz?visitor_id=...&fingerprint=...
 * Busca status por visitor_id OU fingerprint (mesmo aparelho / outro browser).
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const fromQuery = String(q.visitor_id || '').trim().slice(0, 64)
  const fromCookie = (getCookie(event, 'vid') || '').trim().slice(0, 64)
  const visitorId = fromQuery || fromCookie
  const fingerprint = String(q.fingerprint || '').trim().slice(0, 128)

  if ((!visitorId || visitorId.length < 8) && (!fingerprint || fingerprint.length < 8)) {
    return { status: null, visitor_id: null, fingerprint: null }
  }

  try {
    const supabase = useServiceSupabase()

    if (visitorId && visitorId.length >= 8) {
      const { data } = await supabase
        .from('quiz_gate')
        .select('status, answers, fingerprint, updated_at, visitor_id')
        .eq('visitor_id', visitorId)
        .maybeSingle()

      if (data?.status === 'pass' || data?.status === 'reject') {
        return {
          status: data.status,
          visitor_id: data.visitor_id || visitorId,
          fingerprint: data.fingerprint || fingerprint || null,
          answers: data.answers || null,
          updated_at: data.updated_at || null,
          matched: 'visitor_id',
        }
      }
    }

    if (fingerprint && fingerprint.length >= 8) {
      const { data } = await supabase
        .from('quiz_gate')
        .select('status, answers, fingerprint, updated_at, visitor_id')
        .eq('fingerprint', fingerprint)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.status === 'pass' || data?.status === 'reject') {
        return {
          status: data.status,
          visitor_id: data.visitor_id || visitorId || null,
          fingerprint: data.fingerprint || fingerprint,
          answers: data.answers || null,
          updated_at: data.updated_at || null,
          matched: 'fingerprint',
        }
      }
    }

    return { status: null, visitor_id: visitorId || null, fingerprint: fingerprint || null }
  } catch {
    return { status: null, visitor_id: visitorId || null, fingerprint: fingerprint || null }
  }
})
