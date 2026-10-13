/**
 * Meta Pixel — PageView e ViewContent com anti-duplicação por sessão.
 * O init fica no nuxt.config (head). Aqui só disparamos os eventos 1x.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const KEY_PV = 'meta_pv_session_v1'
  const KEY_VC = 'meta_vc_session_v1'

  const fire = () => {
    try {
      const fbq = (window as any).fbq
      if (typeof fbq !== 'function') return false

      try {
        if (!sessionStorage.getItem(KEY_PV)) {
          fbq('track', 'PageView')
          sessionStorage.setItem(KEY_PV, '1')
        }
      } catch {
        fbq('track', 'PageView')
      }

      try {
        if (!sessionStorage.getItem(KEY_VC)) {
          fbq('track', 'ViewContent')
          sessionStorage.setItem(KEY_VC, '1')
        }
      } catch {
        fbq('track', 'ViewContent')
      }

      return true
    } catch {
      return false
    }
  }

  // fbq pode ainda estar carregando o script do head
  if (fire()) return

  let tries = 0
  const timer = setInterval(() => {
    tries++
    if (fire() || tries > 40) clearInterval(timer)
  }, 150)
})
