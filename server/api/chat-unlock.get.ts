import { useServiceSupabase } from '../utils/supabase'

/**
 * GET /api/chat-unlock?visitor_id=
 * Lead consulta se o chat pago foi liberado (PIX ou admin).
 *
 * Query: visitor_id (obrigatório)
 * Ordem de checagem:
 *   1) metadata.chat_unlocked na conversa
 *   2) payment approved com plan_key de chat / admin_grant
 *
 * Retorno: { unlocked: boolean, source?: string }
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const visitor_id = String(q.visitor_id || '').trim()
  if (!visitor_id) {
    throw createError({ statusCode: 400, statusMessage: 'visitor_id required' })
  }

  const supabase = useServiceSupabase()

  // 1) metadata da conversa
  const { data: convs } = await supabase
    .from('wa_funnel_conversations')
    .select('id, metadata')
    .eq('visitor_id', visitor_id)
    .limit(5)

  for (const c of convs || []) {
    const meta = (c.metadata && typeof c.metadata === 'object') ? c.metadata : {}
    if ((meta as any).chat_unlocked === true) {
      return { unlocked: true, source: 'conversation' }
    }
  }

  // 2) pagamento aprovado de chat (inclui grant admin)
  try {
    const { data: pays } = await supabase
      .from('payments')
      .select('id, status, metadata')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(30)

    for (const p of pays || []) {
      const meta = (p.metadata && typeof p.metadata === 'object') ? p.metadata : {}
      const vid = String((meta as any).visitor_id || '')
      const plan = String((meta as any).plan_key || (meta as any).plan || '')
      if (vid === visitor_id) {
        const isChat =
          plan.includes('chat') ||
          plan.includes('mimo') ||
          plan === 'chat_unlock' ||
          (meta as any).admin_grant === true ||
          (meta as any).source === 'links_chat_lock'
        if (isChat || (meta as any).admin_grant) {
          return { unlocked: true, source: 'payment', payment_id: p.id }
        }
      }
    }
  } catch {}

  return { unlocked: false }
})
