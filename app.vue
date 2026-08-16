<template>
  <div class="page" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
    <div class="bg-glow" aria-hidden="true"></div>

    <button class="lock-btn" type="button" aria-label="Editar página" @click="openLogin">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>

    <main class="container">
      <div v-if="displayBanner" class="banner-wrap">
        <img
          :src="displayBanner"
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
          v-for="link in visibleLinks"
          :key="link.label + link.url"
          :href="link.url"
          class="link"
          :class="{ 'link-rgb': isPrevias(link.label) }"
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

    <!-- Login -->
    <Teleport to="body">
      <div v-if="showLogin && !isAdmin" class="modal" @click.self="showLogin = false">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <h2 id="login-title">Acesso admin</h2>
          <label class="sr-only" for="admin-pass">Senha</label>
          <input
            id="admin-pass"
            ref="passInput"
            v-model="password"
            type="password"
            placeholder="Senha"
            autocomplete="current-password"
            @keyup.enter="doLogin"
          >
          <p v-if="loginError" class="error">{{ loginError }}</p>
          <button type="button" class="btn primary" :disabled="loading" @click="doLogin">
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>
          <button type="button" class="btn ghost" @click="showLogin = false">Cancelar</button>
        </div>
      </div>
    </Teleport>

    <!-- Painel admin -->
    <Teleport to="body">
      <div v-if="isAdmin" class="modal" @click.self="closeAdmin">
        <div class="modal-card edit" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h2>Editar página</h2>
            <button type="button" class="icon-x" aria-label="Fechar" @click="closeAdmin">×</button>
          </div>

          <label>Nome</label>
          <input v-model="edit.name" type="text" maxlength="80">

          <label>Bio</label>
          <input v-model="edit.bio" type="text" maxlength="160">

          <label>Banner (URL da imagem)</label>
          <input v-model="edit.avatar_url" type="url" placeholder="https://... ou deixe vazio">
          <div class="banner-actions">
            <button type="button" class="btn small ghost" @click="edit.avatar_url = ''">
              Remover banner
            </button>
            <button type="button" class="btn small ghost" @click="edit.avatar_url = DEFAULT_BANNER_HINT">
              Usar banner padrão
            </button>
          </div>
          <div v-if="edit.avatar_url && !edit.avatar_url.startsWith('data:')" class="preview-banner">
            <img :src="edit.avatar_url" alt="Prévia" @error="onPreviewError">
          </div>
          <p v-if="previewError" class="error">Não foi possível carregar a imagem desta URL</p>

          <div class="links-head">
            <label>Links</label>
            <button type="button" class="btn small" @click="addLink">+ Adicionar link</button>
          </div>

          <div v-for="(l, i) in edit.links" :key="i" class="link-edit" :class="{ disabled: l.enabled === false }">
            <div class="link-edit-row">
              <input v-model="l.icon" class="icon-input" placeholder="🔥" title="Ícone">
              <input v-model="l.label" placeholder="Título do botão">
            </div>
            <input v-model="l.url" placeholder="https://...">
            <div class="link-edit-actions">
              <label class="toggle">
                <input type="checkbox" :checked="l.enabled !== false" @change="l.enabled = ($event.target as HTMLInputElement).checked">
                <span>{{ l.enabled === false ? 'Desativado (não aparece)' : 'Ativo' }}</span>
              </label>
              <button type="button" class="btn small danger" @click="removeLink(i)">Remover</button>
            </div>
          </div>

          <p v-if="saveMsg" class="ok">{{ saveMsg }}</p>
          <p v-if="saveError" class="error">{{ saveError }}</p>

          <div class="row">
            <button type="button" class="btn primary" :disabled="loading" @click="doSave">
              {{ loading ? 'Salvando...' : 'Salvar' }}
            </button>
            <button type="button" class="btn ghost" @click="closeAdmin">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
type LinkItem = {
  label: string
  icon: string
  url: string
  logo?: string
  enabled?: boolean
}

import { WANESSA_BANNER } from '~/utils/banner'
import { LOGO_TG_BLUE, LOGO_TG_PURPLE, LOGO_PRIVSEX } from '~/utils/logos'

const DEFAULT_BANNER = WANESSA_BANNER
// dica só no painel (não grava data URL gigante)
const DEFAULT_BANNER_HINT = ''
const VID_KEY = 'wanessa_vid'
const VIEW_DAY_KEY = 'wanessa_view_day'
const CLICK_DAY_PREFIX = 'wanessa_click_'

const config = reactive({
  name: 'Wanessa',
  bio: 'língua bifurcada · o resto tu descobre 👅',
  avatar_url: DEFAULT_BANNER as string,
  links: [
    { label: 'Canal de prévias', icon: '📱', logo: LOGO_TG_BLUE, url: 'https://t.me/+yA5Y1pAWx5RlMWIx', enabled: true },
    { label: 'Telegram VIP', icon: '⭐', logo: LOGO_TG_PURPLE, url: 'https://t.me/wanessaavipbot?start=pressel', enabled: true },
    { label: 'PrivSex', icon: '🔥', logo: LOGO_PRIVSEX, url: 'https://privsex.com/wanessa', enabled: true }
  ] as LinkItem[]
})

const showLogin = ref(false)
const isAdmin = ref(false)
const password = ref('')
const loginError = ref('')
const saveMsg = ref('')
const saveError = ref('')
const loading = ref(false)
const previewError = ref(false)
const passInput = ref<HTMLInputElement | null>(null)
const edit = reactive({
  name: '',
  bio: '',
  avatar_url: '',
  links: [] as LinkItem[]
})

const visibleLinks = computed(() =>
  config.links.filter((l) => l.enabled !== false && l.label)
)

const displayBanner = computed(() => {
  const url = (config.avatar_url || '').trim()
  if (!url) return DEFAULT_BANNER
  return url
})

function isPrevias(label: string) {
  return /pr[eé]via|canal/i.test(label || '')
}

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(VID_KEY) || ''
    if (!id || id.length < 8) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
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
function alreadyClickedToday(slug: string): boolean {
  try { return localStorage.getItem(CLICK_DAY_PREFIX + slug) === todayKey() } catch { return false }
}
function markClickedToday(slug: string) {
  try { localStorage.setItem(CLICK_DAY_PREFIX + slug, todayKey()) } catch {}
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

function offerFromLabel(label: string) {
  const lower = label.toLowerCase()
  if (/pr[eé]via|canal/i.test(lower)) return 'previa_telegram'
  if (/vip/i.test(lower)) return 'telegram_vip'
  if (/priv/i.test(lower)) return 'privsex'
  return label.toLowerCase().replace(/\s+/g, '_').slice(0, 40)
}

function track(eventName: string, extra: Record<string, any> = {}) {
  const visitor_id = getOrCreateVisitorId()
  const payload = { event_name: eventName, path: '/links/wanessa', visitor_id, ...readUtms(), ...extra }
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

function onLinkPointerDown(link: LinkItem) {
  const slug = offerFromLabel(link.label)
  if (alreadyClickedToday(slug)) return
  markClickedToday(slug)
  track('outbound_click', { label: link.label, url: link.url, offer_slug: slug })
}

const viewedLinks = new Set<string>()
const scrollMarks = new Set<number>()

function setupLinkViews() {
  if (typeof IntersectionObserver === 'undefined') return
  nextTick(() => {
    const nodes = document.querySelectorAll('a.link')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target as HTMLElement
        const label = el.querySelector('.link-label')?.textContent?.trim() || ''
        if (!label || viewedLinks.has(label)) return
        viewedLinks.add(label)
        const link = config.links.find((l) => l.label === label)
        track('link_view', { label, url: link?.url || '', offer_slug: offerFromLabel(label) })
        io.unobserve(el)
      })
    }, { threshold: 0.5 })
    nodes.forEach((n) => io.observe(n))
  })
}

function setupScrollDepth() {
  const report = () => {
    const doc = document.documentElement
    const scrollable = doc.scrollHeight - window.innerHeight
    let pct = 100
    if (scrollable > 20) pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100))
    for (const mark of [25, 50, 75, 100]) {
      if (pct >= mark && !scrollMarks.has(mark)) {
        scrollMarks.add(mark)
        track('scroll_depth', { depth: mark, offer_slug: 'wanessa_links' })
      }
    }
  }
  window.addEventListener('scroll', report, { passive: true })
  setTimeout(report, 400)
}

function attachLogo(l: LinkItem): LinkItem {
  const lab = (l.label || '').toLowerCase()
  let logo: string | undefined
  if (/pr[eé]via|canal/i.test(lab)) logo = LOGO_TG_BLUE
  else if (/vip/i.test(lab)) logo = LOGO_TG_PURPLE
  else if (/priv/i.test(lab)) logo = LOGO_PRIVSEX
  return { ...l, logo, enabled: l.enabled !== false }
}

onMounted(async () => {
  const block = (e: Event) => { e.preventDefault(); return false }
  document.addEventListener('copy', block, true)
  document.addEventListener('cut', block, true)
  document.addEventListener('selectstart', block, true)
  document.addEventListener('dragstart', block, true)
  document.addEventListener('contextmenu', block, true)
  getOrCreateVisitorId()

  try {
    const data = await $fetch<any>('/api/config')
    if (data) {
      config.name = data.name || config.name
      const incomingBio = (data.bio || '').trim()
      const isGeneric = !incomingBio || /creator|conteúdo\s*&?\s*links|content\s*&?\s*links|conteudo\s*&?\s*links/i.test(incomingBio)
      if (!isGeneric) config.bio = incomingBio

      const savedAvatar = (data.avatar_url || '').trim()
      if (savedAvatar && !savedAvatar.startsWith('data:')) {
        config.avatar_url = savedAvatar
      } else {
        config.avatar_url = DEFAULT_BANNER
      }

      if (Array.isArray(data.links) && data.links.length) {
        config.links = data.links
          .filter((l: any) => l && l.label)
          .map((l: any) => attachLogo({
            label: String(l.label || ''),
            icon: String(l.icon || '🔗'),
            url: String(l.url || '#'),
            enabled: l.enabled !== false
          }))
      }
    }
  } catch {}

  if (!alreadyViewedToday()) {
    markViewedToday()
    track('page_view', { offer_slug: 'wanessa_links' })
  }
  setupLinkViews()
  setupScrollDepth()
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
  const av = config.avatar_url || ''
  edit.avatar_url = av.startsWith('data:') ? '' : av
  edit.links = config.links.map((l) => ({
    label: l.label,
    icon: l.icon,
    url: l.url,
    enabled: l.enabled !== false
  }))
  if (!edit.links.length) {
    edit.links.push({ label: '', icon: '🔗', url: '', enabled: true })
  }
  previewError.value = false
}

function closeAdmin() {
  isAdmin.value = false
  saveMsg.value = ''
  saveError.value = ''
}

function addLink() {
  edit.links.push({ label: '', icon: '🔗', url: '', enabled: true })
}

function removeLink(i: number) {
  edit.links.splice(i, 1)
}

function onPreviewError() {
  previewError.value = true
}

watch(() => edit.avatar_url, () => { previewError.value = false })

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
      name: edit.name,
      bio: edit.bio,
      avatar_url: (edit.avatar_url || '').trim(),
      links: edit.links
        .filter((l) => l.label.trim())
        .map((l) => ({
          label: l.label.trim(),
          icon: l.icon || '🔗',
          url: l.url || '#',
          enabled: l.enabled !== false
        }))
    }
    await $fetch('/api/admin/update', { method: 'POST', body: payload })

    config.name = payload.name
    config.bio = payload.bio
    config.avatar_url = payload.avatar_url || DEFAULT_BANNER
    config.links = payload.links.map((l) => attachLogo(l))

    saveMsg.value = 'Salvo!'
    setTimeout(() => { saveMsg.value = '' }, 2500)
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Erro ao salvar'
  } finally {
    loading.value = false
  }
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
  user-select: none !important;
  -webkit-touch-callout: none !important;
  -webkit-tap-highlight-color: transparent;
}
.page ::selection, .page *::selection { background: transparent !important; color: inherit !important; }
.page *, .page *::before, .page *::after {
  -webkit-user-select: none !important;
  user-select: none !important;
  -webkit-user-drag: none !important;
}

.bg-glow {
  position: absolute; top: -8%; left: 50%; transform: translateX(-50%);
  width: min(100vw, 420px); height: 280px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.16) 0%, transparent 70%);
  pointer-events: none; z-index: 0;
}
.lock-btn {
  position: fixed; top: max(8px, env(safe-area-inset-top)); right: 8px; z-index: 50;
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.3);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.container {
  width: 100%; max-width: 360px; height: 100%; max-height: 100dvh;
  display: flex; flex-direction: column; align-items: center;
  position: relative; z-index: 1; overflow: hidden;
}
.banner-wrap {
  position: relative; width: 100%; flex: 0 0 auto;
  border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(236, 72, 153, 0.28);
  box-shadow: 0 0 24px rgba(236, 72, 153, 0.15);
  aspect-ratio: 480 / 623; max-height: min(40vh, 320px); background: #111;
}
.banner-img {
  width: 100%; height: 100%; object-fit: cover; object-position: center 20%;
  display: block; pointer-events: none;
}
.identity { text-align: center; margin-top: 8px; margin-bottom: 6px; width: 100%; flex-shrink: 0; }
.tagline {
  font-size: 0.62rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
  color: #f9a8d4; margin-bottom: 1px; line-height: 1.2;
}
.name { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.03em; color: #fff; line-height: 1.15; }
.bio { font-size: 0.78rem; color: #fbcfe8; margin-top: 1px; line-height: 1.3; }
.cta-choose { text-align: center; margin-bottom: 12px; flex-shrink: 0; }
.cta-title { font-size: 0.85rem; font-weight: 600; color: #fbcfe8; line-height: 1.3; }

.links {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.link {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 13px 14px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(192, 38, 211, 0.08));
  border: 1px solid rgba(236, 72, 153, 0.38);
  border-radius: 12px; font-weight: 600; font-size: 0.88rem;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  z-index: 0;
}
.link:hover {
  transform: translateY(-1px);
  border-color: rgba(244, 114, 182, 0.65);
  box-shadow: 0 6px 18px rgba(236, 72, 153, 0.25);
}
.link:active { transform: scale(0.98); }

.link-rgb {
  border: 2px solid transparent;
  background:
    linear-gradient(#121014, #121014) padding-box,
    linear-gradient(90deg, #ff0040, #ff8c00, #ffee00, #00ff66, #00c8ff, #7a00ff, #ff00c8, #ff0040) border-box;
  background-size: 100% 100%, 300% 100%;
  animation: rgb-border 3s linear infinite;
  box-shadow: 0 0 12px rgba(255, 0, 128, 0.35), 0 0 24px rgba(0, 200, 255, 0.2);
}
.link-rgb:hover {
  border-color: transparent;
  box-shadow: 0 0 16px rgba(255, 0, 128, 0.5), 0 0 32px rgba(0, 200, 255, 0.35);
}
@keyframes rgb-border {
  0% { background-position: 0% 0%, 0% 50%; }
  100% { background-position: 0% 0%, 300% 50%; }
}

.link-icon {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.06); border-radius: 9px; flex-shrink: 0; overflow: hidden;
}
.logo-img { width: 24px; height: 24px; object-fit: contain; border-radius: 50%; }
.link-label { flex: 1; }
.link-arrow { opacity: 0.5; color: #f472b6; font-size: 1rem; transition: transform 0.12s ease, opacity 0.12s ease; }
.link:hover .link-arrow { opacity: 1; transform: translateX(3px); }

.footer { margin-top: 16px; text-align: center; flex-shrink: 0; width: 100%; }
.footer-note { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); margin-bottom: 4px; }
.footer-copy { font-size: 0.62rem; color: rgba(255, 255, 255, 0.28); letter-spacing: 0.02em; line-height: 1.35; }

@media (min-height: 720px) {
  .banner-wrap { max-height: min(44vh, 360px); }
  .name { font-size: 1.55rem; }
  .links { gap: 18px; }
  .link { padding: 14px 16px; font-size: 0.9rem; }
  .identity { margin-top: 10px; margin-bottom: 8px; }
  .cta-choose { margin-bottom: 14px; }
}
@media (min-width: 768px) {
  .page { padding-top: 24px; }
  .container { max-width: 380px; }
  .links { gap: 18px; }
}
@media (max-height: 640px) {
  .banner-wrap { max-height: min(32vh, 220px); }
  .tagline { font-size: 0.55rem; }
  .name { font-size: 1.2rem; }
  .bio { font-size: 0.72rem; }
  .cta-title { font-size: 0.78rem; }
  .link { padding: 10px 12px; font-size: 0.82rem; }
  .links { gap: 12px; }
}
</style>

<style>
/* Modal global (Teleport no body) — centralizado em qualquer tela */
.modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.78);
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.modal-card {
  background: #141416;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  max-height: min(90dvh, 720px);
  overflow-y: auto;
  margin: auto;
  box-sizing: border-box;
  color: #fff;
  -webkit-user-select: text;
  user-select: text;
}
.modal-card input,
.modal-card textarea {
  -webkit-user-select: text !important;
  user-select: text !important;
}
.modal-card h2 {
  font-size: 1.15rem;
  margin: 0 0 14px;
  color: #fff;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.modal-head h2 { margin: 0; }
.icon-x {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.modal-card label {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 12px 0 4px;
}
.modal-card input[type="text"],
.modal-card input[type="password"],
.modal-card input[type="url"] {
  width: 100%;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 0.9rem;
  box-sizing: border-box;
}
.modal-card .btn {
  width: 100%;
  margin-top: 10px;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
}
.modal-card .btn.primary {
  background: linear-gradient(135deg, #ec4899, #c026d3);
  color: #fff;
}
.modal-card .btn.ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
}
.modal-card .btn.small {
  width: auto;
  padding: 6px 12px;
  font-size: 0.78rem;
  margin-top: 0;
}
.modal-card .btn.danger {
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #fca5a5;
}
.modal-card .btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.modal-card .error { color: #f87171; font-size: 0.8rem; margin-top: 8px; }
.modal-card .ok { color: #4ade80; font-size: 0.8rem; margin-top: 8px; }
.modal-card .row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.modal-card .row .btn { flex: 1; margin-top: 0; }

.banner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.preview-banner {
  margin-top: 10px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  max-height: 140px;
}
.preview-banner img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.links-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  margin-bottom: 4px;
}
.links-head label { margin: 0; }

.link-edit {
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 10px;
  margin-top: 10px;
  background: rgba(255,255,255,0.03);
}
.link-edit.disabled {
  opacity: 0.55;
  border-style: dashed;
}
.link-edit-row {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 6px;
  margin-bottom: 6px;
}
.link-edit .icon-input {
  text-align: center;
  padding: 8px 4px;
}
.link-edit-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.7);
  margin: 0 !important;
  cursor: pointer;
}
.toggle input { width: auto !important; accent-color: #ec4899; }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  border: 0;
}

@media (max-width: 480px) {
  .modal-card { max-width: 100%; padding: 16px; }
}
</style>
