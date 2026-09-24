<script setup lang="ts">
/**
 * /telegram — bridge Meta Ads → canal de prévias
 * Formulário em etapas (estilo typebot): tem Telegram? → redirect ou baixar app.
 */
const TELEGRAM_URL_BR = 'https://t.me/+yA5Y1pAWx5RlMWIx'
const TELEGRAM_URL_INTL = 'https://t.me/+2bYvtb_AA0AzMTcx'
const REDIRECT_SECONDS = 3

const OG_IMAGE = 'https://wanessabsx.vercel.app/og-formulario-wanessa.jpg'

useSeoMeta({
  title: 'Formulário Wanessa',
  description: 'Formulário de Wanessa — atendimento oficial.',
  robots: 'index, follow',
  author: 'Wanessa',
  ogTitle: 'Formulário Wanessa',
  ogDescription: 'Formulário oficial de Wanessa.',
  ogType: 'website',
  ogUrl: 'https://wanessabsx.vercel.app/telegram',
  ogSiteName: 'Wanessa',
  ogLocale: 'pt_BR',
  ogImage: OG_IMAGE,
  ogImageSecureUrl: OG_IMAGE,
  ogImageType: 'image/jpeg',
  ogImageWidth: '1200',
  ogImageHeight: '630',
  ogImageAlt: 'Formulário Wanessa',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Formulário Wanessa',
  twitterDescription: 'Formulário oficial de Wanessa.',
  twitterImage: OG_IMAGE,
  twitterImageAlt: 'Formulário Wanessa',
})

useHead({
  title: 'Formulário Wanessa',
  meta: [
    { name: 'keywords', content: 'formulário wanessa, atendimento, telegram, links oficiais' },
    { name: 'theme-color', content: '#000000' },
    { name: 'application-name', content: 'Formulário Wanessa' },
    // fallback explícito (alguns crawlers leem só property=)
    { property: 'og:image', content: OG_IMAGE },
    { property: 'og:image:url', content: OG_IMAGE },
    { name: 'twitter:image', content: OG_IMAGE },
  ],
  link: [
    { rel: 'image_src', href: OG_IMAGE },
    { rel: 'canonical', href: 'https://wanessabsx.vercel.app/telegram' },
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Formulário Wanessa',
        description: 'Formulário oficial de Wanessa — atendimento.',
        url: 'https://wanessabsx.vercel.app/telegram',
        inLanguage: 'pt-BR',
        primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE },
        isPartOf: { '@type': 'WebSite', name: 'Wanessa', url: 'https://wanessabsx.vercel.app' },
      }),
    },
  ],
})

type Step = 'ask' | 'download' | 'redirect'
const step = ref<Step>('ask')
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

/** Mesmo pipeline da home (pressel / canal público) */
function readUtms() {
  try {
    const q = new URLSearchParams(window.location.search)
    return {
      utm_source: q.get('utm_source') || '',
      utm_medium: q.get('utm_medium') || '',
      utm_campaign: q.get('utm_campaign') || '',
      utm_content: q.get('utm_content') || '',
      utm_term: q.get('utm_term') || '',
    }
  } catch {
    return {}
  }
}

function getVisitorId(): string {
  try {
    const k = 'wanessa_vid'
    let v = localStorage.getItem(k)
    if (!v || v.length < 8) {
      v = (crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 36)
      localStorage.setItem(k, v)
    }
    return v
  } catch {
    return ''
  }
}

function track(eventName: string, extra: Record<string, string | undefined> = {}) {
  try {
    // path igual à árvore de links → conta no mesmo dashboard do Telegram público
    const payload = {
      event_name: eventName,
      path: '/links/wanessa',
      visitor_id: getVisitorId(),
      ...readUtms(),
      ...extra,
    }
    const json = JSON.stringify(payload)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon('/api/track', new Blob([json], { type: 'application/json' }))) return
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

/** Clique no Telegram público — mesmo evento da home */
function trackTelegramPublicClick(url: string) {
  track('outbound_click', {
    label: 'Telegram Público',
    url,
    offer_slug: 'telegram_publico',
  })
}

function goTelegram() {
  if (done.value) return
  done.value = true
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  const url = pickTelegramUrl()
  // Mesmo tracking do card "Telegram Público" na home
  trackTelegramPublicClick(url)
  try {
    window.location.replace(url)
  } catch {
    window.location.href = url
  }
}

function startRedirect() {
  // Tela de "abrindo" é só base visual — redireciona na hora
  step.value = 'redirect'
  secondsLeft.value = REDIRECT_SECONDS
  if (timer) clearInterval(timer)
  // Contagem visual (não bloqueia)
  timer = setInterval(() => {
    if (secondsLeft.value > 1) secondsLeft.value -= 1
  }, 1000)
  // Redirect imediato
  goTelegram()
}

function onHasTelegram() {
  track('cta_click', { label: 'Tem Telegram: Sim', offer_slug: 'telegram_bridge_yes' })
  startRedirect()
}

function onNoTelegram() {
  track('cta_click', { label: 'Tem Telegram: Não', offer_slug: 'telegram_bridge_no' })
  step.value = 'download'
}

/** iOS / Android / desktop — detecção mais confiável (inclui iPadOS 13+) */
type Platform = 'ios' | 'android' | 'desktop'
const platform = ref<Platform>('desktop')
const storeUrl = computed(() => {
  if (platform.value === 'ios') {
    return 'https://apps.apple.com/app/telegram-messenger/id686449807'
  }
  if (platform.value === 'android') {
    return 'https://play.google.com/store/apps/details?id=org.telegram.messenger'
  }
  return 'https://telegram.org/apps'
})
const storeLabel = computed(() => {
  if (platform.value === 'ios') return 'Baixar na App Store'
  if (platform.value === 'android') return 'Baixar na Play Store'
  return 'Baixar Telegram'
})

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  const platformStr = (navigator as any).userAgentData?.platform || navigator.platform || ''
  // iPhone / iPod
  if (/iPhone|iPod/i.test(ua)) return 'ios'
  // iPad clássico OU iPadOS 13+ (se passa por MacIntel + touch)
  if (/iPad/i.test(ua)) return 'ios'
  if (
    /Mac/i.test(platformStr) &&
    typeof document !== 'undefined' &&
    'ontouchend' in document
  ) {
    return 'ios'
  }
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function openStore() {
  track('cta_click', { label: 'Baixar Telegram', offer_slug: 'telegram_store', url: storeUrl.value })
  const url = storeUrl.value
  try {
    window.location.href = url
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function afterInstalled() {
  track('cta_click', { label: 'Já baixei Telegram', offer_slug: 'telegram_installed' })
  startRedirect()
}

onMounted(() => {
  platform.value = detectPlatform()
  // View da bridge conta como page_view da árvore (mesmo canal de métricas)
  track('page_view', { label: 'Telegram Bridge', offer_slug: 'telegram_bridge' })
  track('session_start', { label: 'Telegram Bridge', offer_slug: 'telegram_bridge' })
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
        <svg viewBox="0 0 24 24" width="36" height="36" fill="#2AABEE" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      </div>

      <!-- ETAPA 1: formulário -->
      <template v-if="step === 'ask'">
        <p class="tg-title">Você já tem o Telegram?</p>
        <p class="tg-sub">Escolha uma opção pra continuar</p>

        <div class="tg-form">
          <button type="button" class="tg-btn tg-btn--primary" @click="onHasTelegram">
            ✅ Sim, já tenho
          </button>
          <button type="button" class="tg-btn tg-btn--ghost" @click="onNoTelegram">
            ❌ Ainda não tenho
          </button>
        </div>
      </template>

      <!-- ETAPA 2: baixar app -->
      <template v-else-if="step === 'download'">
        <p class="tg-title">Baixe o Telegram grátis</p>
        <p class="tg-sub">
          <template v-if="platform === 'ios'">Seu celular é iPhone. Abre a App Store pra instalar.</template>
          <template v-else-if="platform === 'android'">Seu celular é Android. Abre a Play Store pra instalar.</template>
          <template v-else>Leva menos de 1 minuto. Depois volta e continua.</template>
        </p>

        <div class="tg-form">
          <button type="button" class="tg-btn tg-btn--primary" @click="openStore">
            {{ storeLabel }}
          </button>
          <button type="button" class="tg-btn tg-btn--ghost" @click="afterInstalled">
            Já baixei — continuar
          </button>
        </div>
      </template>

      <!-- ETAPA 3: abrir destino -->
      <template v-else>
        <p class="tg-title">Abrindo Telegram…</p>
        <p class="tg-sub">Abrindo em {{ secondsLeft }}s…</p>

        <div class="tg-bar" aria-hidden="true">
          <div
            class="tg-bar-fill"
            :style="{ width: `${((REDIRECT_SECONDS - secondsLeft + 1) / REDIRECT_SECONDS) * 100}%` }"
          />
        </div>

        <button type="button" class="tg-btn tg-btn--primary" @click="goTelegram">
          Entrar agora
        </button>
      </template>
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
  max-width: 340px;
  width: 100%;
}

.tg-avatar-wrap {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 4px rgba(42, 171, 238, 0.15);
  margin-bottom: 18px;
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
  margin-bottom: 14px;
  line-height: 0;
}

.tg-title {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.tg-sub {
  margin: 0 0 22px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
}

.tg-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tg-btn {
  appearance: none;
  border: none;
  cursor: pointer;
  width: 100%;
  min-height: 52px;
  border-radius: 14px;
  font-size: 0.98rem;
  font-weight: 600;
  padding: 14px 16px;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.tg-btn--primary {
  background: #2AABEE;
  color: #fff;
}

.tg-btn--ghost {
  background: rgba(255, 255, 255, 0.08);
  color: #e8e8e8;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.tg-btn:active {
  transform: scale(0.98);
  opacity: 0.92;
}

.tg-bar {
  width: 100%;
  height: 4px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  margin-bottom: 18px;
}

.tg-bar-fill {
  height: 100%;
  border-radius: 99px;
  background: #2AABEE;
  transition: width 0.9s linear;
}
</style>
