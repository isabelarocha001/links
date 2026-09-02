export async function hashString(input: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(input)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 64)
  } catch {
    let h = 5381
    for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i)
    return `f_${(h >>> 0).toString(16)}_${input.length}`
  }
}

const FP_KEY = 'wanessa_fp_v1'

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return ''
  try {
    const cached = localStorage.getItem(FP_KEY)
    if (cached && cached.length >= 16) return cached
  } catch {}

  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator)
  const parts = [
    nav.userAgent || '',
    nav.language || '',
    (nav.languages || []).join(','),
    String(nav.hardwareConcurrency || ''),
    String(nav.maxTouchPoints || ''),
    String(screen?.width || ''),
    String(screen?.height || ''),
    String(screen?.colorDepth || ''),
    String(window.devicePixelRatio || ''),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    String(new Date().getTimezoneOffset()),
    String((nav as any).deviceMemory || ''),
    String((nav as any).platform || ''),
  ]

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillStyle = '#c084fc'
      ctx.fillRect(0, 0, 200, 50)
      ctx.fillStyle = '#12081a'
      ctx.fillText('fp-wanessa-lux', 4, 12)
      parts.push(canvas.toDataURL().slice(-64))
    }
  } catch {}

  const fp = await hashString(parts.join('|'))
  try {
    localStorage.setItem(FP_KEY, fp)
  } catch {}
  return fp
}
