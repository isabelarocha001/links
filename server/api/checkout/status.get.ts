import { useServiceSupabase } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const id = String(q.id || '').trim()
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id required' })
  }

  const supabase = useServiceSupabase()

  // tenta por id interno ou external_id
  let row: any = null
  {
    const { data } = await supabase.from('payments').select('id, status, external_id, amount').eq('id', id).maybeSingle()
    row = data
  }
  if (!row) {
    const { data } = await supabase.from('payments').select('id, status, external_id, amount').eq('external_id', id).maybeSingle()
    row = data
  }

  if (!row) {
    return { status: 'unknown' }
  }

  return {
    status: row.status,
    payment_id: row.id,
    external_id: row.external_id,
    amount: row.amount,
  }
})
