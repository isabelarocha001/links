/**
 * GET /api/quiz?visitor_id=...
 * Retorna se o visitante já passou/rejeitou o formulário.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const fromQuery = String(q.visitor_id || '').trim().slice(0, 64)
  const fromCookie = (getCookie(event, 'vid') || '').trim().slice(0, 64)
  const visitorId = fromQuery || fromCookie

  if (!visitorId || visitorId.length < 8) {
    return { status: null, visitor_id: null }
  }

  try {
    const supabase = useServiceSupabase()
    const { data, error } = await supabase
      .from('quiz_gate')
      .select('status, answers, updated_at')
      .eq('visitor_id', visitorId)
      .maybeSingle()

    if (error || !data) {
      return { status: null, visitor_id: visitorId }
    }

    const status = data.status === 'pass' || data.status === 'reject' ? data.status : null
    return {
      status,
      visitor_id: visitorId,
      answers: data.answers || null,
      updated_at: data.updated_at || null,
    }
  } catch {
    return { status: null, visitor_id: visitorId }
  }
})
