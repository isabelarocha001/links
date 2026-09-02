<template>
  <div
    class="page"
    :class="{ 'page--locked': showLogin || isAdmin }"
    @copy.prevent
    @cut.prevent
    @contextmenu.prevent
    @selectstart.prevent
    @dragstart.prevent
  >
    <div class="bg-glow" aria-hidden="true"></div>

    <button class="lock-btn" type="button" aria-label="Editar página" @click="openLogin">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>

    <main class="container">
      <header class="profile">
        <div class="avatar-wrap">
          <img
            class="avatar"
            src="/model.jpg"
            alt="Wanessa"
            width="120"
            height="120"
            decoding="async"
            draggable="false"
          />
        </div>
        <h1 class="name">{{ config.name || 'Wanessa' }}</h1>
        <p v-if="config.bio" class="bio">{{ config.bio }}</p>
        <p v-else class="bio bio-soft">Meus links · escolhe o que tu quer</p>
      </header>

      <div class="cta-choose">
        <p class="cta-title">🔥 Vitrine · toque e entra</p>
      </div>

      <div v-if="configReady" class="links">
        <div
          v-for="link in visibleLinks"
          :key="link.label + '|' + link.url"
          class="link-block"
        >
          <p v-if="link.desc" class="link-intro">{{ link.desc }}</p>
          <a
            :href="link.url"
            class="link"
            :class="{ 'link-rgb link-pulse': isHighlighted(link.label) }"
            target="_blank"
            rel="noopener noreferrer"
            @pointerdown.passive="onLinkPointerDown(link)"
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
              />
              <template v-else>{{ link.icon }}</template>
            </span>
            <span class="link-label">{{ link.label }}</span>
            <span class="link-arrow">→</span>
          </a>
        </div>
      </div>
      <div v-else class="links links-skeleton" aria-hidden="true">
        <div class="skel"></div>
        <div class="skel"></div>
        <div class="skel"></div>
      </div>

      <footer class="footer">
        <p class="footer-copy">© Wanessa Borges</p>
      </footer>
    </main>
  </div>

  <ClientOnly>
    <Teleport to="body">
      <div v-if="showLogin && !isAdmin" class="wl-overlay" @click.self="showLogin = false">
        <div class="wl-card" role="dialog" aria-modal="true" @click.stop>
          <h2>Acesso admin</h2>
          <input
            ref="passInput"
            v-model="password"
            type="password"
            placeholder="Senha"
            autocomplete="current-password"
            class="wl-input"
            @keyup.enter="doLogin"
          />
          <p v-if="loginError" class="wl-error">{{ loginError }}</p>
          <button type="button" class="wl-btn wl-btn-primary" :disabled="loading" @click="doLogin">
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>
          <button type="button" class="wl-btn wl-btn-ghost" @click="showLogin = false">Cancelar</button>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="isAdmin" class="wl-overlay" @click.self="closeAdmin">
        <div class="wl-card" role="dialog" aria-modal="true" @click.stop>
          <div class="wl-head">
            <h2>Editar vitrine</h2>
            <button type="button" class="wl-x" @click="closeAdmin">×</button>
          </div>
          <label class="wl-label">Nome</label>
          <input v-model="edit.name" type="text" maxlength="80" class="wl-input" />
          <label class="wl-label">Bio</label>
          <input v-model="edit.bio" type="text" maxlength="200" class="wl-input" />
          <label class="wl-label">Botão em destaque (RGB)</label>
          <select v-model="edit.highlight_label" class="wl-input wl-select">
            <option value="">Nenhum</option>
            <option
              v-for="l in edit.links.filter((x) => x.label.trim())"
              :key="l.label"
              :value="l.label"
            >
              {{ l.label }}
            </option>
          </select>
          <div class="wl-links-head">
            <span class="wl-label" style="margin:0">Links</span>
            <button type="button" class="wl-btn wl-btn-sm wl-btn-primary" @click="addLink">+ Adicionar</button>
          </div>
          <div
            v-for="(l, i) in edit.links"
            :key="i"
            class="wl-link-edit"
            :class="{ 'is-off': l.enabled === false }"
          >
            <div class="wl-link-row">
              <input v-model="l.icon" class="wl-input wl-icon" placeholder="🔥" />
              <input v-model="l.label" class="wl-input" placeholder="Título" />
            </div>
            <input v-model="l.url" class="wl-input" placeholder="https://..." />
            <textarea
              v-model="l.desc"
              class="wl-input wl-textarea"
              placeholder="Texto acima do botão (opcional)"
              maxlength="300"
              rows="3"
            />
            <div class="wl-link-actions">
              <label class="wl-toggle">
                <input
                  type="checkbox"
                  :checked="l.enabled !== false"
                  @change="l.enabled = ($event.target as HTMLInputElement).checked"
                />
                <span>{{ l.enabled === false ? 'Desativado' : 'Ativo' }}</span>
              </label>
              <button type="button" class="wl-btn wl-btn-sm wl-btn-danger" @click="removeLink(i)">
                Remover
              </button>
            </div>
          </div>
          <p v-if="saveMsg" class="wl-ok">{{ saveMsg }}</p>
          <p v-if="saveError" class="wl-error">{{ saveError }}</p>
          <div class="wl-row">
            <button type="button" class="wl-btn wl-btn-primary" :disabled="loading" @click="doSave">
              {{ loading ? 'Salvando...' : 'Salvar' }}
            </button>
            <button type="button" class="wl-btn wl-btn-ghost" @click="closeAdmin">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
type LinkItem = {
  label: string
  icon: string
  url: string
  desc?: string
  logo?: string
  enabled?: boolean
}

import { LOGO_TG_BLUE, LOGO_TG_PURPLE, LOGO_PRIVSEX } from '~/utils/logos'

const DEFAULT_HIGHLIGHT = 'PrivSex'
const VID_KEY = 'wanessa_vid'
const VIEW_DAY_KEY = 'wanessa_view_day'
const CLICK_DAY_PREFIX = 'wanessa_click_'

const DEFAULT_LINKS: LinkItem[] = [
  { label: 'PrivSex', icon: '🔥', url: 'https://privsex.com/wanessa', enabled: true },
  { label: 'Telegram VIP', icon: '⭐', url: 'https://t.me/wanessaavipbot?start=pressel', enabled: true },
  { label: 'Canal de prévias', icon: '📱', url: 'https://t.me/+yA5Y1pAWx5RlMWIx', enabled: true },
]

const config = reactive({
  name: 'Wanessa',
  bio: '',
  links: [] as LinkItem[],
  highlight_label: DEFAULT_HIGHLIGHT,
})
const configReady = ref(false)
const showLogin = ref(false)
const isAdmin = ref(false)
const password = ref('')
const loginError = ref('')
const saveMsg = ref('')
const saveError = ref('')
const loading = ref(false)
const passInput = ref<HTMLInputElement | null>(null)
const edit = reactive({
  name: '',
  bio: '',
  links: [] as LinkItem[],
  highlight_label: DEFAULT_HIGHLIGHT,
})

const visibleLinks = computed(() =>
  config.links.filter((l) => l.enabled !== false && l.label)
)

function isHighlighted(label: string) {
  const target = (config.highlight_label || DEFAULT_HIGHLIGHT).trim().toLowerCase()
  if (!target || !label) return false
  return label.trim().toLowerCase() === target
}

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

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function alreadyViewedToday() {
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
function alreadyClickedToday(slug: string) {
  try {
    return localStorage.getItem(CLICK_DAY_PREFIX + slug) === todayKey()
  } catch {
    return false
  }
}
function markClickedToday(slug: string) {
  try {
    localStorage.setItem(CLICK_DAY_PREFIX + slug, todayKey())
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
    sck: p.get('sck'),
  }
}
function offerFromLabel(label: string) {
  const lower = label.toLowerCase()
  if (/pr[eé]via|canal/i.test(lower)) return 'previa_telegram'
  if (/vip/i.test(lower)) return 'telegram_vip'
  if (/priv/i.test(lower)) return 'privsex'
  return label.toLowerCase().replace(/\s+/g, '_').slice(0, 40)
}
function track(eventName: string, extra: Record<string, any> = {}) {
  const visitor_id = getOrCreateVisitorId()
  const payload = {
    event_name: eventName,
    path: '/links/wanessa',
    visitor_id,
    ...readUtms(),
    ...extra,
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
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
function onLinkPointerDown(link: LinkItem) {
  const slug = offerFromLabel(link.label)
  if (alreadyClickedToday(slug)) return
  markClickedToday(slug)
  track('outbound_click', { label: link.label, url: link.url, offer_slug: slug })
}

function attachLogo(l: LinkItem): LinkItem {
  const lab = (l.label || '').toLowerCase()
  let logo: string | undefined
  if (/pr[eé]via|canal/i.test(lab)) logo = LOGO_TG_BLUE
  else if (/vip/i.test(lab)) logo = LOGO_TG_PURPLE
  else if (/priv/i.test(lab)) logo = LOGO_PRIVSEX
  return { ...l, logo, enabled: l.enabled !== false }
}

function applyServerConfig(data: any) {
  if (!data) return
  config.name = data.name || config.name
  const incomingBio = (data.bio || '').trim()
  const isGeneric =
    /creator|conteúdo\s*&?\s*links|content\s*&?\s*links|língua\s*bifurcada|resto\s*tu\s*descobre/i.test(
      incomingBio
    )
  config.bio = !incomingBio || isGeneric ? '' : incomingBio
  const hl = String(data.highlight_label || '').trim()
  config.highlight_label = hl || DEFAULT_HIGHLIGHT
  if (Array.isArray(data.links) && data.links.length) {
    config.links = data.links
      .filter((l: any) => l && l.label)
      .map((l: any) =>
        attachLogo({
          label: String(l.label || ''),
          icon: String(l.icon || '🔗'),
          url: String(l.url || '#'),
          desc: String(l.desc || ''),
          enabled: l.enabled !== false,
        })
      )
  } else {
    config.links = DEFAULT_LINKS.map(attachLogo)
  }
}

const { data: remoteConfig } = await useAsyncData('link-page-config', () =>
  $fetch<any>('/api/config').catch(() => null)
)
if (remoteConfig.value) applyServerConfig(remoteConfig.value)
else config.links = DEFAULT_LINKS.map(attachLogo)
configReady.value = true

onMounted(() => {
  getOrCreateVisitorId()
  if (!alreadyViewedToday()) {
    markViewedToday()
    track('page_view', { offer_slug: 'wanessa_links' })
  }
})

function openLogin() {
  password.value = ''
  loginError.value = ''
  showLogin.value = true
  nextTick(() => passInput.value?.focus())
}
function openEdit() {
  edit.name = config.name
  edit.bio = config.bio
  edit.highlight_label = config.highlight_label || DEFAULT_HIGHLIGHT
  edit.links = config.links.map((l) => ({
    label: l.label,
    icon: l.icon,
    url: l.url,
    desc: l.desc || '',
    enabled: l.enabled !== false,
  }))
  if (!edit.links.length) edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true })
}
function closeAdmin() {
  isAdmin.value = false
  saveMsg.value = ''
  saveError.value = ''
}
function addLink() {
  edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true })
}
function removeLink(i: number) {
  edit.links.splice(i, 1)
}
async function doLogin() {
  loginError.value = ''
  loading.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
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
    const payload = {
      name: edit.name || config.name || 'Wanessa',
      bio: edit.bio,
      avatar_url: '',
      highlight_label: (edit.highlight_label || '').trim() || DEFAULT_HIGHLIGHT,
      links: edit.links
        .filter((l) => l.label.trim())
        .map((l) => ({
          label: l.label.trim(),
          icon: l.icon || '🔗',
          url: l.url || '#',
          desc: (l.desc || '').trim(),
          enabled: l.enabled !== false,
        })),
    }
    await $fetch('/api/admin/update', { method: 'POST', body: payload })
    config.name = payload.name
    config.bio = payload.bio
    config.highlight_label = payload.highlight_label
    config.links = payload.links.map((l) => attachLogo(l))
    saveMsg.value = 'Salvo!'
    setTimeout(() => {
      saveMsg.value = ''
    }, 2500)
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Erro ao salvar'
  } finally {
    loading.value = false
  }
}

useHead({
  title: 'Wanessa | Links',
  meta: [{ name: 'description', content: 'Vitrine de links da Wanessa' }],
})
</script>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: max(20px, env(safe-area-inset-top)) 14px max(24px, env(safe-area-inset-bottom));
  position: relative;
  background: #0a0a0c;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
}
.page--locked {
  pointer-events: none;
  filter: brightness(0.35);
}
.bg-glow {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: min(100vw, 420px);
  height: 280px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.18) 0%, transparent 70%);
  pointer-events: none;
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
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  margin: 0 auto;
  padding-top: 12px;
}
.profile {
  text-align: center;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.avatar-wrap {
  width: 112px;
  height: 112px;
  margin-bottom: 2px;
}
.avatar {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center top;
  border: 2px solid rgba(244, 114, 182, 0.55);
  box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.12), 0 12px 32px rgba(0, 0, 0, 0.45);
  background: #151518;
}
.name {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0;
  line-height: 1.2;
}
.bio {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.4;
  margin: 0;
  max-width: 320px;
}
.bio-soft {
  color: rgba(255, 255, 255, 0.55);
}
.cta-choose {
  text-align: center;
  margin: 10px 0 18px;
}
.cta-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #f6339a;
  margin: 0;
}
.links {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.link-block {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}
.link-intro {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  line-height: 1.4;
  white-space: pre-line;
  margin: 0;
}
.links-skeleton .skel {
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.85; }
}
.link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.14), rgba(192, 38, 211, 0.08));
  border: 1px solid rgba(236, 72, 153, 0.4);
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.92rem;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  touch-action: manipulation;
}
.link:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(236, 72, 153, 0.28);
}
.link:active {
  transform: scale(0.98);
}
.link-rgb {
  border: 2px solid transparent;
  background:
    linear-gradient(#121014, #121014) padding-box,
    linear-gradient(90deg, #ff0040, #ff8c00, #ffee00, #00ff66, #00c8ff, #7a00ff, #ff00c8, #ff0040)
      border-box;
  background-size: 100% 100%, 300% 100%;
  animation: rgb-border 3s linear infinite, decision-pulse 1.4s ease-in-out infinite;
}
@keyframes rgb-border {
  0% { background-position: 0% 0%, 0% 50%; }
  100% { background-position: 0% 0%, 300% 50%; }
}
@keyframes decision-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
.link-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  flex-shrink: 0;
  overflow: hidden;
}
.logo-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 50%;
}
.link-label {
  flex: 1;
  font-weight: 700;
  color: #fff;
}
.link-arrow {
  opacity: 0.5;
  color: #f472b6;
}
.link:hover .link-arrow {
  opacity: 1;
}
.footer {
  margin-top: 28px;
  text-align: center;
}
.footer-copy {
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.28);
}
@media (min-height: 720px) {
  .page { align-items: center; }
}
</style>

<style>
.wl-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483646 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 16px !important;
  background: rgba(0, 0, 0, 0.85) !important;
  overflow-y: auto !important;
}
.wl-card {
  background: #141416 !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 16px !important;
  padding: 20px !important;
  width: 100% !important;
  max-width: 400px !important;
  max-height: min(88dvh, 720px) !important;
  overflow-y: auto !important;
  color: #fff !important;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.75) !important;
  -webkit-user-select: text !important;
  user-select: text !important;
}
.wl-card h2 { font-size: 1.15rem; margin: 0 0 14px; }
.wl-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.wl-x { background: transparent; border: none; color: rgba(255,255,255,0.55); font-size: 1.7rem; cursor: pointer; }
.wl-label { display: block; font-size: 0.75rem; color: rgba(255,255,255,0.5); margin: 12px 0 4px; }
.wl-input {
  width: 100% !important;
  padding: 11px 12px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  background: rgba(255,255,255,0.06) !important;
  color: #fff !important;
  font-size: 0.9rem !important;
  box-sizing: border-box !important;
}
.wl-select { appearance: none; cursor: pointer; }
.wl-textarea { resize: vertical; min-height: 64px; font-family: inherit; }
.wl-btn {
  width: 100%; margin-top: 10px; padding: 12px; border-radius: 10px;
  border: none; font-weight: 600; cursor: pointer; font-size: 0.9rem;
}
.wl-btn-primary { background: linear-gradient(135deg, #ec4899, #c026d3); color: #fff; }
.wl-btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #fff; }
.wl-btn-sm { width: auto; padding: 6px 12px; font-size: 0.78rem; margin-top: 0; }
.wl-btn-danger { background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.4); color: #fca5a5; }
.wl-error { color: #f87171; font-size: 0.8rem; margin-top: 8px; }
.wl-ok { color: #4ade80; font-size: 0.8rem; margin-top: 8px; }
.wl-row { display: flex; gap: 8px; margin-top: 14px; }
.wl-row .wl-btn { flex: 1; margin-top: 0; }
.wl-links-head { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
.wl-link-edit {
  border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px;
  margin-top: 10px; background: rgba(255,255,255,0.03);
}
.wl-link-edit.is-off { opacity: 0.55; }
.wl-link-row { display: grid; grid-template-columns: 48px 1fr; gap: 6px; margin-bottom: 6px; }
.wl-icon { text-align: center !important; }
.wl-link-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
.wl-toggle {
  display: flex; align-items: center; gap: 6px; font-size: 0.78rem;
  color: rgba(255,255,255,0.7); cursor: pointer;
}
</style>
