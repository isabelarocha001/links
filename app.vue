<template>
  <div class="page" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
    <div class="bg-glow" aria-hidden="true"></div>

    <button class="lock-btn" type="button" aria-label="Editar página" @click="showLogin = true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>

    <main class="container">
      <div class="banner-wrap">
        <img
          :src="config.avatar_url"
          :alt="config.name"
          class="banner-img"
          width="480"
          height="623"
          fetchpriority="high"
          decoding="async"
          draggable="false"
        >
      </div>

      <header class="identity">
        <p class="tagline">🔥 só pra quem aguenta 🔥</p>
        <h1 class="name">{{ config.name }}</h1>
        <p class="bio">{{ config.bio }}</p>
      </header>

      <div class="cta-choose">
        <p class="cta-title">👇 Escolhe o que tu quer primeiro 👇</p>
      </div>

      <div class="links">
        <a
          v-for="link in config.links"
          :key="link.label"
          :href="link.url"
          class="link"
          target="_blank"
          rel="noopener noreferrer"
          @click="trackClick(link)"
        >
          <span class="link-icon">
            <img
              v-if="link.logo"
              :src="link.logo"
              alt=""
              class="logo-img"
              width="28"
              height="28"
              loading="lazy"
              decoding="async"
              draggable="false"
            >
            <template v-else>{{ link.icon }}</template>
          </span>
          <span class="link-label">{{ link.label }}</span>
          <span class="link-arrow">→</span>
        </a>
      </div>

      <footer class="footer">
        <p class="footer-note">18+ · exclusivo</p>
        <p class="footer-copy">© Todos os direitos reservados a Wanessa Borges</p>
      </footer>
    </main>

    <div v-if="showLogin && !isAdmin" class="modal" @click.self="showLogin = false">
      <div class="modal-card">
        <h2>Acesso</h2>
        <input
          v-model="password"
          type="password"
          placeholder="Senha"
          autocomplete="current-password"
          @keyup.enter="doLogin"
        >
        <p v-if="loginError" class="error">{{ loginError }}</p>
        <button type="button" class="btn" :disabled="loading" @click="doLogin">
          {{ loading ? '...' : 'Entrar' }}
        </button>
      </div>
    </div>

    <div v-if="isAdmin" class="modal" @click.self="isAdmin = false">
      <div class="modal-card edit">
        <h2>Editar página</h2>
        <label>Nome</label>
        <input v-model="edit.name" type="text">
        <label>Bio</label>
        <input v-model="edit.bio" type="text">
        <label>Banner / Avatar URL</label>
        <input v-model="edit.avatar_url" type="url">

        <div v-for="(l, i) in edit.links" :key="i" class="link-edit">
          <input v-model="l.icon" class="icon-input" placeholder="🔥">
          <input v-model="l.label" placeholder="Label">
          <input v-model="l.url" placeholder="https://...">
        </div>

        <p v-if="saveMsg" class="ok">{{ saveMsg }}</p>
        <p v-if="saveError" class="error">{{ saveError }}</p>

        <div class="row">
          <button type="button" class="btn" :disabled="loading" @click="doSave">Salvar</button>
          <button type="button" class="btn ghost" @click="isAdmin = false">Fechar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type LinkItem = { label: string; icon: string; url: string; logo?: string }

import { WANESSA_BANNER } from '~/utils/banner'
import { LOGO_TG_BLUE, LOGO_TG_PURPLE, LOGO_PRIVSEX } from '~/utils/logos'

const DEFAULT_BANNER = WANESSA_BANNER

const config = reactive({
  name: 'Wanessa',
  bio: 'língua bifurcada · o resto tu descobre 👅',
  avatar_url: DEFAULT_BANNER,
  links: [
    {
      label: 'Canal de prévias',
      icon: '📱',
      logo: LOGO_TG_BLUE,
      url: 'https://t.me/+yA5Y1pAWx5RlMWIx'
    },
    {
      label: 'Telegram VIP',
      icon: '⭐',
      logo: LOGO_TG_PURPLE,
      url: 'https://t.me/wanessaavipbot?start=pressel'
    },
    {
      label: 'PrivSex',
      icon: '🔥',
      logo: LOGO_PRIVSEX,
      url: 'https://privsex.com/wanessa'
    }
  ] as LinkItem[]
})

const showLogin = ref(false)
const isAdmin = ref(false)
const password = ref('')
const loginError = ref('')
const saveMsg = ref('')
const saveError = ref('')
const loading = ref(false)
const edit = reactive({
  name: '',
  bio: '',
  avatar_url: '',
  links: [] as LinkItem[]
})

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

function offerFromLabel(label: string) {
  const map: Record<string, string> = {
    'Canal de prévias': 'previa_telegram',
    'Telegram VIP': 'telegram_vip',
    'PrivSex': 'privsex'
  }
  const lower = label.toLowerCase()
  if (/pr[eé]via|canal/i.test(lower)) return 'previa_telegram'
  if (/vip/i.test(lower)) return 'telegram_vip'
  if (/priv/i.test(lower)) return 'privsex'
  return map[label] || label.toLowerCase().replace(/\s+/g, '_').slice(0, 40)
}

onMounted(async () => {
  // Anti-cópia reforçado (não 100% inviolável, mas impede o "copiar" normal)
  const block = (e: Event) => { e.preventDefault(); return false }
  document.addEventListener('copy', block, true)
  document.addEventListener('cut', block, true)
  document.addEventListener('selectstart', block, true)
  document.addEventListener('dragstart', block, true)
  document.addEventListener('contextmenu', block, true)

  try {
    const data = await $fetch<any>('/api/config')
    if (data) {
      config.name = data.name || config.name
      const incomingBio = (data.bio || '').trim()
      const isGeneric = !incomingBio || /creator|conteúdo\s*&?\s*links|content\s*&?\s*links|conteudo\s*&?\s*links/i.test(incomingBio)
      if (!isGeneric) {
        config.bio = incomingBio
      }
      config.avatar_url = DEFAULT_BANNER
      // Links canônicos — nunca deixar # ou URL errada do Supabase quebrar os botões
      const CANONICAL: LinkItem[] = [
        { label: 'Canal de prévias', icon: '📱', logo: LOGO_TG_BLUE, url: 'https://t.me/+yA5Y1pAWx5RlMWIx' },
        { label: 'Telegram VIP', icon: '⭐', logo: LOGO_TG_PURPLE, url: 'https://t.me/wanessaavipbot?start=pressel' },
        { label: 'PrivSex', icon: '🔥', logo: LOGO_PRIVSEX, url: 'https://privsex.com/wanessa' }
      ]
      if (Array.isArray(data.links) && data.links.length) {
        config.links = CANONICAL.map((canon) => {
          const match = data.links.find((l: LinkItem) => {
            const lab = (l.label || '').toLowerCase()
            return (
              lab === canon.label.toLowerCase() ||
              (canon.label.includes('prévia') && /pr[eé]via|canal/i.test(lab)) ||
              (canon.label.includes('VIP') && /vip/i.test(lab)) ||
              (canon.label === 'PrivSex' && /priv/i.test(lab))
            )
          })
          const url = (match?.url || '').trim()
          const bad = !url || url === '#' || url === '/' || !url.startsWith('http')
          return {
            ...canon,
            label: match?.label && match.label.length > 2 ? match.label : canon.label,
            url: bad ? canon.url : url
          }
        })
      } else {
        config.links = CANONICAL
      }
    }
  } catch {}

  $fetch('/api/track', {
    method: 'POST',
    body: {
      event_name: 'presell_view',
      path: '/links/wanessa',
      offer_slug: 'wanessa_links',
      ...readUtms()
    }
  }).catch(() => {})
})

function openEdit() {
  edit.name = config.name
  edit.bio = config.bio
  edit.avatar_url = config.avatar_url.startsWith('data:') || config.avatar_url.startsWith('/') ? '' : config.avatar_url
  edit.links = config.links.map(l => ({ label: l.label, icon: l.icon, url: l.url }))
  while (edit.links.length < 3) {
    edit.links.push({ label: '', icon: '🔗', url: '#' })
  }
}

async function doLogin() {
  loginError.value = ''
  loading.value = true
  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { password: password.value }
    })
    password.value = ''
    showLogin.value = false
    isAdmin.value = true
    openEdit()
  } catch (e: any) {
    loginError.value = e?.data?.statusMessage || e?.statusMessage || 'Senha inválida'
  } finally {
    loading.value = false
  }
}

async function doSave() {
  saveMsg.value = ''
  saveError.value = ''
  loading.value = true
  try {
    const payload: any = {
      name: edit.name,
      bio: edit.bio,
      links: edit.links.filter(l => l.label)
    }
    if (edit.avatar_url && !edit.avatar_url.startsWith('data:') && !edit.avatar_url.startsWith('/')) {
      payload.avatar_url = edit.avatar_url
    }
    await $fetch('/api/admin/update', {
      method: 'POST',
      body: payload
    })
    config.name = edit.name
    config.bio = edit.bio
    if (payload.avatar_url) config.avatar_url = payload.avatar_url
    const logoMap: Record<string, string> = {
      'canal de prévias': LOGO_TG_BLUE,
      'telegram vip': LOGO_TG_PURPLE,
      'privsex': LOGO_PRIVSEX
    }
    config.links = edit.links.filter(l => l.label).map(l => ({
      ...l,
      logo: logoMap[l.label.toLowerCase()] || (
        /pr[eé]via|canal/i.test(l.label) ? LOGO_TG_BLUE :
        /vip/i.test(l.label) ? LOGO_TG_PURPLE :
        /priv/i.test(l.label) ? LOGO_PRIVSEX : undefined
      )
    }))
    saveMsg.value = 'Salvo!'
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Erro ao salvar'
  } finally {
    loading.value = false
  }
}

function trackClick(link: LinkItem) {
  const body = {
    event_name: 'cta_click',
    label: link.label,
    url: link.url,
    path: '/links/wanessa',
    offer_slug: offerFromLabel(link.label),
    ...readUtms()
  }
  // sendBeacon sobrevive à navegação (mais confiável que fetch ao clicar)
  try {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', blob)
      return
    }
  } catch {}
  $fetch('/api/track', { method: 'POST', body }).catch(() => {})
}
</script>

<style scoped>
.page {
  min-height: 100dvh;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: max(8px, env(safe-area-inset-top)) 14px max(10px, env(safe-area-inset-bottom));
  position: relative;
  overflow: hidden;
  background: #0a0a0c;
  box-sizing: border-box;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
  -webkit-tap-highlight-color: transparent;
}

.page ::selection,
.page *::selection {
  background: transparent !important;
  color: inherit !important;
}

.page ::-moz-selection,
.page *::-moz-selection {
  background: transparent !important;
  color: inherit !important;
}

.page *,
.page *::before,
.page *::after {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-user-drag: none !important;
  -webkit-touch-callout: none !important;
}

.modal-card input {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
}

.bg-glow {
  position: absolute;
  top: -8%;
  left: 50%;
  transform: translateX(-50%);
  width: min(100vw, 420px);
  height: 280px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.16) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.lock-btn {
  position: fixed;
  top: max(8px, env(safe-area-inset-top));
  right: 8px;
  z-index: 50;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.container {
  width: 100%;
  max-width: 360px;
  height: 100%;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.banner-wrap {
  position: relative;
  width: 100%;
  flex: 0 0 auto;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(236, 72, 153, 0.28);
  box-shadow: 0 0 24px rgba(236, 72, 153, 0.15);
  aspect-ratio: 480 / 623;
  max-height: min(40vh, 320px);
  background: #111;
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  display: block;
  -webkit-user-drag: none;
  user-select: none;
  pointer-events: none;
}

.identity {
  text-align: center;
  margin-top: 8px;
  margin-bottom: 6px;
  width: 100%;
  flex-shrink: 0;
}

.tagline {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #f9a8d4;
  margin-bottom: 1px;
  line-height: 1.2;
}

.name {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.15;
}

.bio {
  font-size: 0.78rem;
  color: #fbcfe8;
  margin-top: 1px;
  line-height: 1.3;
}

.cta-choose {
  text-align: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.cta-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #fbcfe8;
  line-height: 1.3;
}

.links {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(192, 38, 211, 0.08));
  border: 1px solid rgba(236, 72, 153, 0.38);
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.88rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  position: relative;
  overflow: hidden;
}

.link:hover {
  transform: translateY(-1px);
  border-color: rgba(244, 114, 182, 0.65);
  box-shadow: 0 6px 18px rgba(236, 72, 153, 0.25);
}

.link:active {
  transform: scale(0.98);
}

.link-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 9px;
  flex-shrink: 0;
  overflow: hidden;
}

.logo-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 50%;
  -webkit-user-drag: none;
}

.link-label { flex: 1; }

.link-arrow {
  opacity: 0.5;
  color: #f472b6;
  font-size: 1rem;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.link:hover .link-arrow {
  opacity: 1;
  transform: translateX(3px);
}

.footer {
  margin-top: 12px;
  text-align: center;
  flex-shrink: 0;
  width: 100%;
}

.footer-note {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
}

.footer-copy {
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.28);
  letter-spacing: 0.02em;
  line-height: 1.35;
}

@media (min-height: 720px) {
  .banner-wrap { max-height: min(44vh, 360px); }
  .name { font-size: 1.55rem; }
  .links { gap: 10px; }
  .link { padding: 13px 16px; font-size: 0.9rem; }
  .identity { margin-top: 10px; margin-bottom: 8px; }
  .cta-choose { margin-bottom: 10px; }
}

@media (min-width: 768px) {
  .page { padding-top: 24px; }
  .container { max-width: 380px; }
}

@media (max-height: 640px) {
  .banner-wrap { max-height: min(32vh, 220px); }
  .tagline { font-size: 0.55rem; }
  .name { font-size: 1.2rem; }
  .bio { font-size: 0.72rem; }
  .cta-title { font-size: 0.78rem; }
  .link { padding: 9px 12px; font-size: 0.82rem; }
  .links { gap: 6px; }
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal-card {
  background: #141416;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 340px;
}

.modal-card h2 {
  font-size: 1.1rem;
  margin-bottom: 12px;
  color: #fff;
}

.modal-card label {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
  margin-top: 10px;
}

.modal-card input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.modal-card .btn {
  width: 100%;
  margin-top: 14px;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #ec4899, #c026d3);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.modal-card .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-card .btn.ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  margin-top: 8px;
}

.modal-card .error {
  color: #f87171;
  font-size: 0.8rem;
  margin-top: 8px;
}

.modal-card .ok {
  color: #4ade80;
  font-size: 0.8rem;
  margin-top: 8px;
}

.modal-card.edit .row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.modal-card.edit .row .btn {
  flex: 1;
  margin-top: 0;
}

.link-edit {
  display: grid;
  grid-template-columns: 40px 1fr 1.2fr;
  gap: 6px;
  margin-top: 8px;
}

.link-edit .icon-input {
  text-align: center;
  padding: 8px 4px;
}

@media (max-width: 480px) {
  .link-edit { grid-template-columns: 1fr; }
}
</style>
