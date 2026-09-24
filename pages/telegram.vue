<script setup lang="ts">
/**
 * /telegram — camuflador Meta Ads → canal de prévias
 * Página preta neutra; redireciona pro Telegram após timer.
 * Não mostrar conteúdo adulto / sugestivo no HTML (política Meta).
 */
const TELEGRAM_URL_BR = 'https://t.me/+yA5Y1pAWx5RlMWIx'
const TELEGRAM_URL_INTL = 'https://t.me/+2bYvtb_AA0AzMTcx'
const REDIRECT_SECONDS = 4

useHead({
  title: 'Abrindo…',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'theme-color', content: '#000000' },
    { name: 'description', content: 'Redirect' },
  ],
})

const secondsLeft = ref(REDIRECT_SECONDS)
const done = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function pickTelegramUrl(): string {
  if (typeof navigator === 'undefined') return TELEGRAM_URL_BR
  const lang = String(navigator.language || '').toLowerCase()
  const langs = (navigator.languages || []).map((l) => String(l).toLowerCase())
  const isBr =
    lang.startsWith('pt-br') ||
    langs.some((l) => l.startsWith('pt-br')) ||
    (lang.startsWith('pt') && !lang.startsWith('pt-pt'))
  return isBr ? TELEGRAM_URL_BR : TELEGRAM_URL_INTL
}

function goTelegram() {
  if (done.value) return
  done.value = true
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  const url = pickTelegramUrl()
  try {
    window.location.replace(url)
  } catch {
    window.location.href = url
  }
}

onMounted(() => {
  // Tracking leve (UTM) se existir
  try {
    const q = new URLSearchParams(window.location.search)
    const payload = {
      event_name: 'telegram_bridge_view',
      path: '/telegram',
      utm_source: q.get('utm_source') || '',
      utm_medium: q.get('utm_medium') || '',
      utm_campaign: q.get('utm_campaign') || '',
      utm_content: q.get('utm_content') || '',
      utm_term: q.get('utm_term') || '',
    }
    const json = JSON.stringify(payload)
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/track', new Blob([json], { type: 'application/json' }))
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {}

  timer = setInterval(() => {
    if (secondsLeft.value <= 1) {
      goTelegram()
      return
    }
    secondsLeft.value -= 1
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="tg-bridge">
    <div class="tg-bridge-inner">
      <div class="tg-avatar-wrap">
        <img
          class="tg-avatar"
          src="/model.jpg"
          alt=""
          width="112"
          height="112"
          draggable="false"
        />
      </div>

      <div class="tg-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="#2AABEE" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      </div>

      <p class="tg-title">Abrindo Telegram…</p>
      <p class="tg-sub">Você será redirecionado em {{ secondsLeft }}s</p>

      <div class="tg-bar" aria-hidden="true">
        <div
          class="tg-bar-fill"
          :style="{ width: `${((REDIRECT_SECONDS - secondsLeft + 1) / REDIRECT_SECONDS) * 100}%` }"
        />
      </div>

      <button type="button" class="tg-btn" @click="goTelegram">
        Entrar agora
      </button>
    </div>
  </div>
</template>

<style scoped>
.tg-bridge {
  position: fixed;
  inset: 0;
  z-index: 2147483640;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #fff;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-user-select: none;
  user-select: none;
}

.tg-bridge-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px;
  max-width: 320px;
  width: 100%;
}

.tg-avatar-wrap {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 4px rgba(42, 171, 238, 0.15);
  margin-bottom: 20px;
  background: #111;
}

.tg-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}

.tg-logo {
  margin-bottom: 16px;
  line-height: 0;
}

.tg-title {
  margin: 0 0 6px;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.tg-sub {
  margin: 0 0 20px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.55);
}

.tg-bar {
  width: 100%;
  height: 4px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  margin-bottom: 22px;
}

.tg-bar-fill {
  height: 100%;
  border-radius: 99px;
  background: #2AABEE;
  transition: width 0.9s linear;
}

.tg-btn {
  appearance: none;
  border: none;
  cursor: pointer;
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  background: #2AABEE;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 16px;
  -webkit-tap-highlight-color: transparent;
}

.tg-btn:active {
  transform: scale(0.98);
  opacity: 0.92;
}
</style>
