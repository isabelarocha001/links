import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'

export function useServiceSupabase() {
  const config = useRuntimeConfig()
  const key = config.supabaseServiceKey || config.public.supabaseAnonKey
  return createClient(config.public.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export function useAnonSupabase() {
  const config = useRuntimeConfig()
  return createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export function getClientIp(event: any): string {
  const xf = getHeader(event, 'x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  const real = getHeader(event, 'x-real-ip')
  if (real) return real
  return 'unknown'
}

export function signAdminToken(secret: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 8 // 8h
  const payload = `admin:${exp}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

export function verifyAdminToken(token: string | undefined, secret: string): boolean {
  if (!token) return false
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8')
    const [payload, sig] = raw.split('.')
    if (!payload || !sig) return false
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
    const exp = Number(payload.split(':')[1])
    if (!exp || Date.now() > exp) return false
    return true
  } catch {
    return false
  }
}
