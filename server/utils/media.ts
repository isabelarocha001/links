import { useServiceSupabase } from './supabase'

const BUCKET = 'chat-media-temp'

export function mediaBucket() {
  return BUCKET
}

export async function uploadTempMedia(opts: {
  bytes: Buffer | Uint8Array
  contentType: string
  ext?: string
  visitor_id?: string | null
  conversation_id?: string | null
  direction?: string
  kind?: string
}) {
  const supabase = useServiceSupabase()
  const ext = (opts.ext || guessExt(opts.contentType)).replace(/[^a-z0-9]/gi, '') || 'bin'
  const path = `tmp/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, opts.bytes, {
    contentType: opts.contentType || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const public_url = data?.publicUrl || ''

  await supabase.from('chat_media_temp').insert({
    storage_path: path,
    public_url,
    visitor_id: opts.visitor_id || null,
    conversation_id: opts.conversation_id || null,
    direction: opts.direction || null,
    kind: opts.kind || null,
  })

  return { path, public_url }
}

export async function deleteTempMediaByPath(path: string) {
  const supabase = useServiceSupabase()
  const p = String(path || '').trim()
  if (!p) return
  try {
    await supabase.storage.from(BUCKET).remove([p])
  } catch {}
  try {
    await supabase
      .from('chat_media_temp')
      .update({ deleted_at: new Date().toISOString() })
      .eq('storage_path', p)
  } catch {}
}

export async function deleteTempMediaByUrl(url: string) {
  const u = String(url || '')
  const marker = `/object/public/${BUCKET}/`
  const idx = u.indexOf(marker)
  if (idx >= 0) {
    const path = decodeURIComponent(u.slice(idx + marker.length).split('?')[0])
    await deleteTempMediaByPath(path)
    return
  }
  // fallback: match by public_url
  const supabase = useServiceSupabase()
  const { data } = await supabase
    .from('chat_media_temp')
    .select('storage_path')
    .eq('public_url', u)
    .is('deleted_at', null)
    .maybeSingle()
  if (data?.storage_path) await deleteTempMediaByPath(data.storage_path)
}

function guessExt(ct: string) {
  const c = (ct || '').toLowerCase()
  if (c.includes('jpeg') || c.includes('jpg')) return 'jpg'
  if (c.includes('png')) return 'png'
  if (c.includes('webp')) return 'webp'
  if (c.includes('gif')) return 'gif'
  if (c.includes('mp4')) return 'mp4'
  if (c.includes('webm')) return 'webm'
  if (c.includes('ogg')) return 'ogg'
  if (c.includes('mpeg') || c.includes('mp3')) return 'mp3'
  if (c.includes('wav')) return 'wav'
  if (c.includes('pdf')) return 'pdf'
  return 'bin'
}

/** Baixa arquivo do Telegram (getFile) e sobe no storage temp */
export async function ingestTelegramFile(opts: {
  botToken: string
  fileId: string
  contentType?: string
  ext?: string
  visitor_id?: string | null
  conversation_id?: string | null
  kind?: string
}) {
  const metaRes = await fetch(
    `https://api.telegram.org/bot${opts.botToken}/getFile?file_id=${encodeURIComponent(opts.fileId)}`,
  )
  const meta = await metaRes.json().catch(() => ({} as any))
  const filePath = meta?.result?.file_path
  if (!filePath) throw new Error('telegram getFile failed')

  const fileRes = await fetch(`https://api.telegram.org/file/bot${opts.botToken}/${filePath}`)
  if (!fileRes.ok) throw new Error('telegram file download failed')
  const ab = await fileRes.arrayBuffer()
  const bytes = Buffer.from(ab)
  const ct =
    opts.contentType ||
    fileRes.headers.get('content-type') ||
    'application/octet-stream'

  return uploadTempMedia({
    bytes,
    contentType: ct,
    ext: opts.ext || filePath.split('.').pop(),
    visitor_id: opts.visitor_id,
    conversation_id: opts.conversation_id,
    direction: 'bot',
    kind: opts.kind,
  })
}
