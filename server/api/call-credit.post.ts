import { useServiceSupabase } from '../utils/supabase'

/**
 * POST /api/call-credit
 * body.action:
 *  - grant   { visitor_id, minutes, plan_key?, conversation_id? }
 *  - consume { visitor_id, seconds_used, end_reason?, conversation_id?, video_urls? }
 *  - mark_watched { visitor_id, video_urls: string[], fully?: boolean }
 *  - start_session { visitor_id, conversation_id? }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as any))
  const action = String(body?.action || '').trim().toLowerCase()
  const visitor_id = String(body?.visitor_id || '').trim()
  if (!visitor_id) throw createError({ statusCode: 400, statusMessage: 'visitor_id required' })
  if (!action) throw createError({ statusCode: 400, statusMessage: 'action required' })

  const supabase = useServiceSupabase()
  const now = new Date().toISOString()
  const conversation_id = body?.conversation_id ? String(body.conversation_id) : null

  if (action === 'grant') {
    const minutes = Math.max(1, Math.floor(Number(body?.minutes) || 10))
    const secs = minutes * 60
    const plan_key = String(body?.plan_key || 'vid_10').slice(0, 40)

    const { data: existing } = await supabase
      .from('call_credits')
      .select('id, seconds_left, seconds_bought, seconds_consumed')
      .eq('visitor_id', visitor_id)
      .eq('status', 'active')
      .maybeSingle()

    if (existing?.id) {
      const { data, error } = await supabase
        .from('call_credits')
        .update({
          seconds_left: (existing.seconds_left || 0) + secs,
          seconds_bought: (existing.seconds_bought || 0) + secs,
          plan_key,
          last_payment_at: now,
          updated_at: now,
          conversation_id: conversation_id || undefined,
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { ok: true, credit: data }
    }

    const { data, error } = await supabase
      .from('call_credits')
      .insert({
        visitor_id,
        conversation_id,
        plan_key,
        seconds_bought: secs,
        seconds_left: secs,
        seconds_consumed: 0,
        status: 'active',
        last_payment_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true, credit: data }
  }

  if (action === 'consume') {
    const used = Math.max(0, Math.floor(Number(body?.seconds_used) || 0))
    const end_reason = body?.end_reason ? String(body.end_reason).slice(0, 40) : null
    const video_urls: string[] = Array.isArray(body?.video_urls)
      ? body.video_urls.map((u: any) => String(u || '').trim()).filter(Boolean).slice(0, 50)
      : []

    const { data: credit } = await supabase
      .from('call_credits')
      .select('*')
      .eq('visitor_id', visitor_id)
      .eq('status', 'active')
      .maybeSingle()

    let updated = credit
    if (credit?.id && used > 0) {
      const left = Math.max(0, (credit.seconds_left || 0) - used)
      const consumed = (credit.seconds_consumed || 0) + used
      const status = left <= 0 ? 'exhausted' : 'active'
      const { data, error } = await supabase
        .from('call_credits')
        .update({
          seconds_left: left,
          seconds_consumed: consumed,
          status,
          updated_at: now,
        })
        .eq('id', credit.id)
        .select('*')
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      updated = data

      await supabase.from('call_sessions').insert({
        visitor_id,
        conversation_id,
        credit_id: credit.id,
        started_at: body?.started_at || now,
        ended_at: now,
        seconds_used: used,
        end_reason,
      })
    }

    if (video_urls.length) {
      for (const url of video_urls) {
        await supabase.from('call_watched_videos').upsert(
          {
            visitor_id,
            video_url: url,
            fully_watched: true,
            watched_seconds: 0,
          },
          { onConflict: 'visitor_id,video_url' },
        )
      }
    }

    return { ok: true, credit: updated || null }
  }

  if (action === 'mark_watched') {
    const video_urls: string[] = Array.isArray(body?.video_urls)
      ? body.video_urls.map((u: any) => String(u || '').trim()).filter(Boolean).slice(0, 50)
      : []
    if (!video_urls.length) throw createError({ statusCode: 400, statusMessage: 'video_urls required' })
    const fully = body?.fully !== false
    for (const url of video_urls) {
      await supabase.from('call_watched_videos').upsert(
        {
          visitor_id,
          video_url: url,
          fully_watched: fully,
          watched_seconds: Math.max(0, Math.floor(Number(body?.watched_seconds) || 0)),
        },
        { onConflict: 'visitor_id,video_url' },
      )
    }
    return { ok: true }
  }

  if (action === 'start_session') {
    const { data: credit } = await supabase
      .from('call_credits')
      .select('id')
      .eq('visitor_id', visitor_id)
      .eq('status', 'active')
      .maybeSingle()

    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        visitor_id,
        conversation_id,
        credit_id: credit?.id || null,
        started_at: now,
      })
      .select('id')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { ok: true, session_id: data?.id }
  }

  throw createError({ statusCode: 400, statusMessage: 'action inválida' })
})
