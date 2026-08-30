<template>
  <div class="redirect-page">
    <p class="msg">Abrindo o canal de prévias…</p>
    <p class="sub">Se não abrir automaticamente, <a :href="TARGET" rel="noopener noreferrer">clique aqui</a>.</p>
  </div>
</template>

<script setup lang="ts">
/**
 * Pressel = redirecionador direto para o Canal de prévias (Telegram).
 * Objetivo: zero fricção no funil Instagram → Telegram.
 * Tracking continua ativo e envia para o webhook de métricas.
 */

const TARGET = 'https://t.me/+yA5Y1pAWx5RlMWIx'
const VID_KEY = 'wanessa_vid'
const VIEW_DAY_KEY = 'wanessa_view_day'

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(VID_KEY) || ''
    if (!id || id.length < 8) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(VID_KEY, id)
    }
    document.cookie = `vid=${encodeURIComponent(id)};path=/;max-age=31536000;SameSite=Lax;Secure`
    return id
  } catch {
    return `v_${Date.now().toString(36)}`
  }
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function alreadyViewedToday(): boolean {
  try {
    return localStorage.getItem(VIEW_DAY_KEY) === todayKey()
  } catch {
    return false
  }
}

function markViewedToday() {
  try {
    localStorage.setItem(VIEW_DAY_KEY, todayKey())
  } catch {}
}

function readUtms() {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  return {
    utm_source: p.get('utm_source'),
    utm_medium: p.get('utm_medium'),
    utm_campaign: p.get('utm_campaign'),
    utm_content: p.get('utm_content'),
    utm_term: p.get('utm_term'),
    src: p.get('src'),
    sck: p.get('sck')
  }
}

function track(eventName: string, extra: Record<string, any> = {}) {
  const visitor_id = getOrCreateVisitorId()
  const payload = {
    event_name: eventName,
    path: '/links/wanessa',
    visitor_id,
    offer_slug: 'previa_telegram',
    label: 'Canal de prévias',
    url: TARGET,
    ...readUtms(),
    ...extra
  }
  const json = JSON.stringify(payload)
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' })
      if (navigator.sendBeacon('/api/track', blob)) return
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true
    }).catch(() => {})
  } catch {}
}

// Redirect o mais cedo possível (client)
if (import.meta.client) {
  getOrCreateVisitorId()
  if (!alreadyViewedToday()) {
    markViewedToday()
    track('page_view', { offer_slug: 'previa_telegram' })
  }
  // registra o clique de saída também
  track('outbound_click', {
    label: 'Canal de prévias',
    url: TARGET,
    offer_slug: 'previa_telegram'
  })
  // redireciona imediatamente
  window.location.replace(TARGET)
}

// Fallback meta refresh (caso JS demore)
useHead({
  meta: [
    { 'http-equiv': 'refresh', content: `0;url=${TARGET}` }
  ],
  title: 'Wanessa — Canal de prévias'
})
</script>

<style scoped>
.redirect-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0a0c;
  color: #fff;
  font-family: Inter, system-ui, sans-serif;
  padding: 24px;
  text-align: center;
}
.msg {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 10px;
}
.sub {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
}
.sub a {
  color: #f472b6;
  text-decoration: underline;
}
</style>
