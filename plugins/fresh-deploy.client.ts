/** Plugin client: detecta deploy novo e força refresh de cache/assets. */
/**
 * Se o build mudou após um deploy, força 1 reload limpo
 * (evita ficar preso em JS antigo no cache do celular).
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  const KEY = 'wanessa_build_id_v1'
  const check = async () => {
    try {
      const res = await $fetch<{ build?: string }>('/api/version', {
        headers: { 'Cache-Control': 'no-cache' },
      })
      const build = String(res?.build || '')
      if (!build) return
      const prev = localStorage.getItem(KEY)
      if (prev && prev !== build) {
        localStorage.setItem(KEY, build)
        // hard reload uma vez
        const url = new URL(window.location.href)
        url.searchParams.set('_v', build)
        window.location.replace(url.toString())
        return
      }
      localStorage.setItem(KEY, build)
    } catch {}
  }
  // na abertura + quando volta pra aba
  check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
})
