<template>
  <div class="page">
    <div class="bg-glow"></div>
    <div class="bg-glow-bottom"></div>

    <button class="lock-btn" type="button" aria-label="Editar página" @click="showLogin = true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>

    <main class="container">
      <div class="banner-wrap">
        <img :src="config.avatar_url" :alt="config.name" class="banner-img">
        <div class="banner-gradient"></div>
        <span class="intimate-emoji" aria-hidden="true">💦</span>
        <div class="banner-text">
          <p class="tagline">🔥 só pra quem aguenta 🔥</p>
          <h1 class="name">{{ config.name }}</h1>
          <p class="bio">{{ config.bio }}</p>
        </div>
      </div>

      <div class="cta-choose">
        <p class="cta-title">👇 Escolhe o que tu quer primeiro 👇</p>
        <p class="cta-sub">três caminhos · mesmo prazer</p>
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
            <img v-if="link.logo" :src="link.logo" :alt="link.label" class="logo-img">
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
      // mantém logos padrão; só sobrescreve label/url do backend se existirem
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
    // re-aplica logos conhecidos
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
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 28px 16px 40px;
  position: relative;
  overflow: hidden;
  background: #0a0a0c;
}

.bg-glow {
  position: absolute;
  top: -15%;
  left: 50%;
  transform: translateX(-50%);
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.22) 0%, transparent 68%);
  pointer-events: none;
  z-index: 0;
}

.bg-glow-bottom {
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(192, 38, 211, 0.18) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  filter: blur(20px);
}

.lock-btn {
  position: fixed;
  top: 14px;
  right: 14px;
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
  transition: all 0.2s ease;
}

.lock-btn:hover {
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  position: relative;
  z-index: 1;
}

.banner-wrap {
  position: relative;
  width: 100%;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(236, 72, 153, 0.35);
  box-shadow: 0 0 40px rgba(236, 72, 153, 0.22);
  margin-bottom: 20px;
  aspect-ratio: 3 / 4;
  max-height: 460px;
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}

.banner-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.35) 45%, transparent 70%);
  pointer-events: none;
}

.intimate-emoji {
  position: absolute;
  bottom: 18%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2rem;
  filter: drop-shadow(0 0 12px rgba(255, 0, 120, 0.9));
  animation: pulse-emoji 1.6s ease-in-out infinite;
  pointer-events: none;
  user-select: none;
  z-index: 2;
}

@keyframes pulse-emoji {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
  50% { transform: translateX(-50%) scale(1.15); opacity: 0.85; }
}

.banner-text {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 16px 18px;
  text-align: center;
  z-index: 3;
}

.tagline {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(251, 182, 206, 0.95);
  margin-bottom: 4px;
}

.name {
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #fff;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
}

.bio {
  font-size: 0.88rem;
  color: rgba(251, 207, 232, 0.9);
  margin-top: 4px;
}

.cta-choose {
  text-align: center;
  margin-bottom: 18px;
}

.cta-title {
  font-size: 1rem;
  font-weight: 600;
  color: #fbcfe8;
}

.cta-sub {
  font-size: 0.75rem;
  color: #71717a;
  margin-top: 4px;
}

.links {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.link {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(192, 38, 211, 0.08));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(236, 72, 153, 0.4);
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.link::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(192, 38, 211, 0.2));
  opacity: 0;
  transition: opacity 0.28s ease;
}

.link:hover {
  transform: translateY(-3px) scale(1.02);
  border-color: rgba(244, 114, 182, 0.7);
  box-shadow: 0 10px 32px rgba(236, 72, 153, 0.35);
}

.link:hover::before { opacity: 1; }

.link:active {
  transform: scale(0.98);
}

.link-icon, .link-label, .link-arrow {
  position: relative;
  z-index: 1;
}

.link-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 1.2rem;
}

.logo-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
  border-radius: 50%;
}

.link-label { flex: 1; }

.link-arrow {
  opacity: 0.5;
  transform: translateX(0);
  transition: all 0.28s ease;
  color: #f472b6;
  font-size: 1.1rem;
}

.link:hover .link-arrow {
  opacity: 1;
  transform: translateX(4px);
}

.footer-note {
  margin-top: 28px;
  font-size: 0.65rem;
  color: #52525b;
  text-align: center;
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

.modal-card h2 {
  font-size: 1.1rem;
  margin-bottom: 6px;
}

label {
  font-size: 0.75rem;
  color: #888;
}

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

.row {
  display: flex;
  gap: 8px;
}

.row .btn { flex: 1; }

.error { color: #ff6b6b; font-size: 0.85rem; }
.ok { color: #6bffb0; font-size: 0.85rem; }

@media (max-width: 480px) {
  .page { padding: 20px 12px 32px; }
  .banner-wrap { max-height: 420px; border-radius: 20px; }
  .name { font-size: 1.6rem; }
  .links { gap: 14px; }
  .link { padding: 16px 18px; }
  .link-edit { grid-template-columns: 1fr; }
}
</style>
