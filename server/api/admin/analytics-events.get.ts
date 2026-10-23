import { useServiceSupabase, verifyAdminToken } from '../../utils/supabase'

const KNOWN_SYNC_PAY_EVENTS = [
  'transaction', 'cash-in', 'cash-out', 'med',
  'subscription-activated', 'subscription-overdue', 'subscription-suspended',
  'subscription-cancelled', 'subscription-reactivated', 'subscription-renewed',
  'subscription-expired',
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'admin_token')
  if (!verifyAdminToken(token, config.adminSessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Não autorizado' })
  }

  const supabase = useServiceSupabase()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [recentResult, totalResult] = await Promise.all([
    supabase.from('analytics_webhook_events')
      .select('event_type,event_id,payload,received_at')
      .eq('source', 'syncpay')
      .order('received_at', { ascending: false })
      .limit(100),
    supabase.from('analytics_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'syncpay')
      .gte('received_at', since),
  ])

  if (recentResult.error || totalResult.error) {
    console.error('[admin/analytics-events] Supabase query failed', recentResult.error?.message, totalResult.error?.message)
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar as métricas' })
  }

  const recent = recentResult.data || []
  const eventTypes = [...new Set([...KNOWN_SYNC_PAY_EVENTS, ...recent.map((row) => String(row.event_type))])]
  const counts = await Promise.all(eventTypes.map(async (eventType) => {
    const { count, error } = await supabase.from('analytics_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'syncpay')
      .eq('event_type', eventType)
      .gte('received_at', since)
    if (error) {
      console.error('[admin/analytics-events] Event count query failed', error.message)
      throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar as métricas' })
    }
    return { event_type: eventType, count: count || 0 }
  }))

  return {
    ok: true,
    window: '24h',
    total: totalResult.count || 0,
    counts,
    recent,
    updated_at: new Date().toISOString(),
  }
})
