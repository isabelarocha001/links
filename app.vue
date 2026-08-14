<template>
  <div class="page">
    <div class="bg-glow" aria-hidden="true"></div>

    <button class="lock-btn" type="button" aria-label="Editar página" @click="showLogin = true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>

    <main class="container">
      <!-- Banner: só a foto, sem texto por cima -->
      <div class="banner-wrap">
        <img
          :src="config.avatar_url"
          :alt="config.name"
          class="banner-img"
          width="720"
          height="960"
          fetchpriority="high"
          decoding="async"
        >
        <span class="intimate-emoji" aria-hidden="true">💦</span>
      </div>

      <!-- Nome e bio FORA da imagem -->
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
              :alt=""
              class="logo-img"
              width="28"
              height="28"
              loading="lazy"
              decoding="async"
            >
            <template v-else>{{ link.icon }}</template>
          </span>
          <span class="link-label">{{ link.label }}</span>
          <span class="link-arrow">→</span>
        </a>
      </div>

      <p class="footer-note">18+ · conteúdo exclusivo</p>
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
  bio: 'conteúdo quente · privacidade total 😈',
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
  return map[label] || label.toLowerCase().replace(/\s+/g, '_').slice(0, 40)
}

onMounted(async () => {
  try {
    const data = await $fetch<any>('/api/config')
    if (data) {
      config.name = data.name || config.name
      config.bio = data.bio || config.bio
      const av = data.avatar_url || ''
      if (av && !av.includes('pravatar') && !av.includes('placeholder')) {
        config.avatar_url = av
      }
      if (Array.isArray(data.links) && data.links.length) {
        const byLabel = new Map(config.links.map(l => [l.label.toLowerCase(), l]))
        config.links = data.links.map((l: LinkItem) => {
          const key = (l.label || '').toLowerCase()
          const base = byLabel.get(key)
          return {
            ...l,
            logo: base?.logo || l.logo,
            icon: l.icon || base?.icon || '🔗'
          }
        })
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
  edit.avatar_url = config.avatar_url.startsWith('data:') ? '' : config.avatar_url
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
    if (edit.avatar_url && !edit.avatar_url.startsWith('data:')) {
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
      logo: logoMap[l.label.toLowerCase()]
    }))
    saveMsg.value = 'Salvo!'
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Erro ao salvar'
  } finally {
    loading.value = false
  }
}

function trackClick(link: LinkItem) {
  $fetch('/api/track', {
    method: 'POST',
    body: {
      event_name: 'cta_click',
      label: link.label,
      url: link.url,
      path: '/links/wanessa',
      offer_slug: offerFromLabel(link.label),
      ...readUtms()
    }
  }).catch(() => {})
}
</script>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 16px 16px 24px;
  position: relative;
  overflow-x: hidden;
  background: #0a0a0c;
}

.bg-glow {
  position: absolute;
  top: -10%;
  left: 50%;
  transform: translateX(-50%);
  width: min(100vw, 480px);
  height: 360px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.18) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.lock-btn {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 50;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.container {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

/* Banner: foto livre, altura controlada */
.banner-wrap {
  position: relative;
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(236, 72, 153, 0.3);
  box-shadow: 0 0 28px rgba(236, 72, 153, 0.18);
  /* mobile: ~38vh pra caber botões na tela */
  max-height: min(38vh, 280px);
  aspect-ratio: 3 / 4;
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}

.intimate-emoji {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.5rem;
  filter: drop-shadow(0 0 10px rgba(255, 0, 120, 0.85));
  animation: pulse-emoji 1.6s ease-in-out infinite;
  pointer-events: none;
  user-select: none;
  z-index: 2;
}

@keyframes pulse-emoji {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
  50% { transform: translateX(-50%) scale(1.12); opacity: 0.85; }
}

/* Texto FORA da foto */
.identity {
  text-align: center;
  margin-top: 12px;
  margin-bottom: 10px;
  width: 100%;
}

.tagline {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #f9a8d4;
  margin-bottom: 2px;
}

.name {
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.2;
}

.bio {
  font-size: 0.82rem;
  color: #fbcfe8;
  margin-top: 2px;
}

.cta-choose {
  text-align: center;
  margin-bottom: 12px;
}

.cta-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fbcfe8;
}

.links {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 16px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(192, 38, 211, 0.08));
  border: 1px solid rgba(236, 72, 153, 0.4);
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.9rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  position: relative;
  overflow: hidden;
}

.link:hover {
  transform: translateY(-2px);
  border-color: rgba(244, 114, 182, 0.7);
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.28);
}

.link:active {
  transform: scale(0.98);
}

.link-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  flex-shrink: 0;
  overflow: hidden;
}

.logo-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  border-radius: 50%;
}

.link-label { flex: 1; }

.link-arrow {
  opacity: 0.55;
  color: #f472b6;
  font-size: 1.05rem;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.link:hover .link-arrow {
  opacity: 1;
  transform: translateX(3px);
}

.footer-note {
  margin-top: 16px;
  font-size: 0.62rem;
  color: #52525b;
  text-align: center;
}

/* Desktop / tablet: banner um pouco maior, ainda sem scroll excessivo */
@media (min-width: 480px) {
  .page { padding: 24px 20px 32px; }
  .container { max-width: 400px; }
  .banner-wrap {
    max-height: min(42vh, 340px);
    border-radius: 20px;
  }
  .name { font-size: 1.7rem; }
  .links { gap: 12px; }
  .link { padding: 15px 18px; font-size: 0.95rem; }
}

@media (min-width: 768px) {
  .banner-wrap {
    max-height: min(40vh, 360px);
  }
}

/* Telas baixas: banner ainda menor */
@media (max-height: 700px) {
  .banner-wrap { max-height: min(32vh, 220px); }
  .identity { margin-top: 8px; margin-bottom: 6px; }
  .name { font-size: 1.35rem; }
  .links { gap: 8px; }
  .link { padding: 11px 14px; }
  .footer-note { margin-top: 10px; }
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
  width: 100%;
  max-width: 360px;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-card.edit {
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-card h2 { font-size: 1.1rem; margin-bottom: 6px; }
label { font-size: 0.75rem; color: #888; }

input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #0a0a0a;
  color: #fff;
  font-size: 0.9rem;
}

.link-edit {
  display: grid;
  grid-template-columns: 48px 1fr 1.4fr;
  gap: 6px;
}

.icon-input { text-align: center; }

.btn {
  margin-top: 8px;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: #ec4899;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn.ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ccc;
}
.row { display: flex; gap: 8px; }
.row .btn { flex: 1; }
.error { color: #ff6b6b; font-size: 0.85rem; }
.ok { color: #6bffb0; font-size: 0.85rem; }

@media (max-width: 480px) {
  .link-edit { grid-template-columns: 1fr; }
}
</style>
