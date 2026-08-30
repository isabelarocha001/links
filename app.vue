<template>
  <div class="redirect-page">
    <div class="card">
      <img
        class="photo"
        src="/model.jpg"
        alt="Wanessa"
        width="320"
        height="480"
        decoding="async"
      />

      <div class="tg-row">
        <span class="tg-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
            <circle cx="12" cy="12" r="12" fill="#2AABEE"/>
            <path d="M17.6 7.2c.2-.8-.5-1.2-1.1-.9L5.8 10.4c-.7.3-.7.8-.1 1l2.8.9 1.1 3.4c.1.4.4.5.7.3l1.6-1.4 3.1 2.3c.4.2.8 0 .9-.5l1.8-8.2z" fill="#fff"/>
            <path d="M9.7 13.1l-.4 2.2c-.1.4.2.5.4.3l1.2-1.1" fill="#fff" opacity=".9"/>
          </svg>
        </span>
        <span class="tg-label">Canal de prévias</span>
      </div>

      <p class="timer-label">Abrindo em <strong>{{ seconds }}</strong>s…</p>
      <div class="bar">
        <div class="bar-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <a class="manual" :href="TARGET" rel="noopener noreferrer">Abrir agora →</a>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Pressel com foto + ícone Telegram + timer.
 * Redirect automático para o Canal de prévias.
 * Tracking com dedupe diário.
 */

const TARGET = 'https://t.me/+yA5Y1pAWx5RlMWIx'
const COUNTDOWN_SEC = 3
const VID_KEY = 'wanessa_vid'
const VIEW_DAY_KEY = 'wanessa_view_day'
const CLICK_DAY_KEY = 'wanessa_click_previa_telegram'

const seconds = ref(COUNTDOWN_SEC)
const progress = ref(0)

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
  try { return localStorage.getItem(VIEW_DAY_KEY) === todayKey() } catch { return false }
}
function markViewedToday() {
  try { localStorage.setItem(VIEW_DAY_KEY, todayKey()) } catch {}
}
function alreadyClickedToday(): boolean {
  try { return localStorage.getItem(CLICK_DAY_KEY) === todayKey() } catch { return false }
}
function markClickedToday() {
  try { localStorage.setItem(CLICK_DAY_KEY, todayKey()) } catch {}
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
      if (navigator.sendBeacon('/api/track', blob)) return true
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true
    }).catch(() => {})
    return true
  } catch {
    return false
  }
}

function goRedirect() {
  window.location.replace(TARGET)
}

onMounted(() => {
  getOrCreateVisitorId()

  if (!alreadyViewedToday()) {
    markViewedToday()
    track('page_view', { offer_slug: 'previa_telegram' })
  }
  if (!alreadyClickedToday()) {
    markClickedToday()
    track('outbound_click', {
      label: 'Canal de prévias',
      url: TARGET,
      offer_slug: 'previa_telegram'
    })
  }

  const totalMs = COUNTDOWN_SEC * 1000
  const started = Date.now()
  const tick = () => {
    const elapsed = Date.now() - started
    const left = Math.max(0, totalMs - elapsed)
    seconds.value = Math.ceil(left / 1000)
    progress.value = Math.min(100, (elapsed / totalMs) * 100)
    if (left <= 0) {
      goRedirect()
      return
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

useHead({
  title: 'Wanessa — Canal de prévias',
  meta: [
    // fallback se JS falhar
    { 'http-equiv': 'refresh', content: `${COUNTDOWN_SEC + 2};url=${TARGET}` }
  ]
})
</script>

<style scoped>
.redirect-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0c;
  padding: 20px 14px;
  box-sizing: border-box;
}
.card {
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.photo {
  width: 100%;
  max-width: 280px;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  object-position: center top;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  background: #151518;
}
.tg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.tg-icon {
  display: flex;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(42, 171, 238, 0.35);
}
.tg-label {
  font-family: Inter, system-ui, sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: #fff;
  letter-spacing: 0.01em;
}
.timer-label {
  font-family: Inter, system-ui, sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 2px 0 0;
}
.timer-label strong {
  color: #2AABEE;
  font-variant-numeric: tabular-nums;
}
.bar {
  width: 100%;
  max-width: 220px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2AABEE, #229ED9);
  transition: width 0.08s linear;
}
.manual {
  margin-top: 6px;
  font-family: Inter, system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: #f472b6;
  text-decoration: none;
  opacity: 0.9;
}
.manual:hover {
  text-decoration: underline;
  opacity: 1;
}
</style>
