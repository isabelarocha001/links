<template>
  <div class="page" :class="{ 'page--locked': showLogin || isAdmin }" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
    <div class="bg-glow" aria-hidden="true"></div>
    <button class="lock-btn" type="button" aria-label="Editar página" @click="openLogin">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    </button>
    <main class="container">
      <div v-if="configReady && displayBanner && !bannerHidden" class="banner-wrap">
        <img :src="displayBanner" alt="" class="banner-img" width="480" height="623" fetchpriority="high" decoding="async" draggable="false">
        <div class="banner-fire-frame" aria-hidden="true">
          <span class="fire-edge fire-left"></span>
          <span class="fire-edge fire-right"></span>
          <span class="fire-edge fire-top"></span>
          <span class="fire-edge fire-bottom"></span>
        </div>
      </div>

      <header v-if="config.bio" class="identity">
        <p class="bio">{{ config.bio }}</p>
      </header>

      <div class="cta-choose"><p class="cta-title">👇 Escolhe o que tu quer primeiro 👇</p></div>

      <div v-if="configReady" class="links">
        <div v-for="link in visibleLinks" :key="link.label + '|' + link.url" class="link-block">
          <p v-if="link.desc" class="link-intro">{{ link.desc }}</p>
          <a :href="link.url" class="link" :class="{ 'link-rgb link-pulse': isPrevias(link.label) }" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onLinkPointerDown(link)">
            <span class="link-icon">
              <img v-if="link.logo" :src="link.logo" alt="" class="logo-img" width="28" height="28" loading="lazy" decoding="async" draggable="false">
              <template v-else>{{ link.icon }}</template>
            </span>
            <span class="link-label">{{ link.label }}</span>
            <span class="link-arrow">→</span>
          </a>
        </div>
      </div>
      <div v-else class="links links-skeleton" aria-hidden="true"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>

      <footer class="footer">
        <p class="footer-note">18+ · exclusivo</p>
        <p class="footer-copy">© Todos os direitos reservados</p>
      </footer>
    </main>
  </div>

  <ClientOnly>
    <Teleport to="body">
      <div v-if="showLogin && !isAdmin" class="wl-overlay" @click.self="showLogin = false">
        <div class="wl-card" role="dialog" aria-modal="true" aria-labelledby="login-title" @click.stop>
          <h2 id="login-title">Acesso admin</h2>
          <label class="wl-sr" for="admin-pass">Senha</label>
          <input id="admin-pass" ref="passInput" v-model="password" type="password" placeholder="Senha" autocomplete="current-password" @keyup.enter="doLogin">
          <p v-if="loginError" class="wl-error">{{ loginError }}</p>
          <button type="button" class="wl-btn wl-btn-primary" :disabled="loading" @click="doLogin">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
          <button type="button" class="wl-btn wl-btn-ghost" @click="showLogin = false">Cancelar</button>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="isAdmin" class="wl-overlay" @click.self="closeAdmin">
        <div class="wl-card wl-card-edit" role="dialog" aria-modal="true" @click.stop>
          <div class="wl-head"><h2>Editar página</h2><button type="button" class="wl-x" aria-label="Fechar" @click="closeAdmin">×</button></div>
          <label class="wl-label">Bio</label>
          <input v-model="edit.bio" type="text" maxlength="200" class="wl-input">
          <label class="wl-label">Banner atual</label>
          <div v-if="!edit.hideBanner" class="wl-preview"><img :src="editPreviewBanner" alt="Banner atual"></div>
          <p v-else class="wl-muted">Banner oculto na página</p>
          <div class="wl-banner-actions">
            <button type="button" class="wl-btn wl-btn-sm" :class="edit.hideBanner ? 'wl-btn-primary' : 'wl-btn-danger'" @click="toggleHideBanner">{{ edit.hideBanner ? 'Mostrar banner' : 'Remover / ocultar banner' }}</button>
            <button v-if="!edit.hideBanner && edit.avatar_url" type="button" class="wl-btn wl-btn-sm wl-btn-ghost" @click="restoreDefaultBanner">Voltar ao banner padrão</button>
          </div>
          <label class="wl-label">Trocar banner (cole URL da imagem)</label>
          <input v-model="edit.avatar_url" type="url" class="wl-input" placeholder="https://exemplo.com/foto.jpg" :disabled="edit.hideBanner" @input="onAvatarInput">
          <p v-if="previewError" class="wl-error">Não foi possível carregar esta URL</p>
          <div class="wl-links-head"><span class="wl-label" style="margin:0">Links</span><button type="button" class="wl-btn wl-btn-sm wl-btn-primary" @click="addLink">+ Adicionar</button></div>
          <div v-for="(l, i) in edit.links" :key="i" class="wl-link-edit" :class="{ 'is-off': l.enabled === false }">
            <div class="wl-link-row"><input v-model="l.icon" class="wl-input wl-icon" placeholder="🔥" title="Ícone"><input v-model="l.label" class="wl-input" placeholder="Título do botão"></div>
            <input v-model="l.url" class="wl-input" placeholder="https://...">
            <textarea v-model="l.desc" class="wl-input wl-textarea" placeholder="Texto explicativo ACIMA do botão (use Enter para quebrar linha)" maxlength="300" rows="4"></textarea>
            <div class="wl-link-actions">
              <label class="wl-toggle"><input type="checkbox" :checked="l.enabled !== false" @change="l.enabled = ($event.target as HTMLInputElement).checked"><span>{{ l.enabled === false ? 'Desativado (some da página)' : 'Ativo' }}</span></label>
              <button type="button" class="wl-btn wl-btn-sm wl-btn-danger" @click="removeLink(i)">Remover</button>
            </div>
          </div>
          <p v-if="saveMsg" class="wl-ok">{{ saveMsg }}</p>
          <p v-if="saveError" class="wl-error">{{ saveError }}</p>
          <div class="wl-row">
            <button type="button" class="wl-btn wl-btn-primary" :disabled="loading" @click="doSave">{{ loading ? 'Salvando...' : 'Salvar' }}</button>
            <button type="button" class="wl-btn wl-btn-ghost" @click="closeAdmin">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
type LinkItem = { label: string; icon: string; url: string; desc?: string; logo?: string; enabled?: boolean }
import { WANESSA_BANNER } from '~/utils/banner'
import { LOGO_TG_BLUE, LOGO_TG_PURPLE, LOGO_PRIVSEX } from '~/utils/logos'
const DEFAULT_BANNER = WANESSA_BANNER
const HIDDEN_BANNER_TOKEN = '__HIDDEN__'
const VID_KEY = 'wanessa_vid'
const VIEW_DAY_KEY = 'wanessa_view_day'
const CLICK_DAY_PREFIX = 'wanessa_click_'
const config = reactive({ name: 'Wanessa', bio: '', avatar_url: DEFAULT_BANNER as string, links: [] as LinkItem[] })
const configReady = ref(false)
const bannerHidden = ref(false)
const showLogin = ref(false)
const isAdmin = ref(false)
const password = ref('')
const loginError = ref('')
const saveMsg = ref('')
const saveError = ref('')
const loading = ref(false)
const previewError = ref(false)
const passInput = ref<HTMLInputElement | null>(null)
const edit = reactive({ name: '', bio: '', avatar_url: '' as string, hideBanner: false, links: [] as LinkItem[] })
const visibleLinks = computed(() => config.links.filter((l) => l.enabled !== false && l.label))
const displayBanner = computed(() => { if (bannerHidden.value) return ''; const url = (config.avatar_url || '').trim(); if (!url || url === HIDDEN_BANNER_TOKEN) return DEFAULT_BANNER; return url })
const editPreviewBanner = computed(() => { if (edit.hideBanner) return ''; const url = (edit.avatar_url || '').trim(); if (url && !url.startsWith('data:')) return url; return DEFAULT_BANNER })
function isPrevias(label: string) { return /pr[eé]via|canal/i.test(label || '') }
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(VID_KEY) || ''
    if (!id || id.length < 8) { id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`; localStorage.setItem(VID_KEY, id) }
    document.cookie = `vid=${encodeURIComponent(id)};path=/;max-age=31536000;SameSite=Lax;Secure`
    return id
  } catch { return `v_${Date.now().toString(36)}` }
}
function todayKey(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function alreadyViewedToday(): boolean { try { return localStorage.getItem(VIEW_DAY_KEY) === todayKey() } catch { return false } }
function markViewedToday() { try { localStorage.setItem(VIEW_DAY_KEY, todayKey()) } catch {} }
function alreadyClickedToday(slug: string): boolean { try { return localStorage.getItem(CLICK_DAY_PREFIX + slug) === todayKey() } catch { return false } }
function markClickedToday(slug: string) { try { localStorage.setItem(CLICK_DAY_PREFIX + slug, todayKey()) } catch {} }
function readUtms() {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  return { utm_source: p.get('utm_source'), utm_medium: p.get('utm_medium'), utm_campaign: p.get('utm_campaign'), utm_content: p.get('utm_content'), utm_term: p.get('utm_term'), src: p.get('src'), sck: p.get('sck') }
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
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }).catch(() => {})
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
      if (pct >= mark && !scrollMarks.has(mark)) { scrollMarks.add(mark); track('scroll_depth', { depth: mark, offer_slug: 'wanessa_links' }) }
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
function applyServerConfig(data: any) {
  if (!data) return
  config.name = data.name || config.name
  const incomingBio = (data.bio || '').trim()
  const isGeneric = /creator|conteúdo\s*&?\s*links|content\s*&?\s*links|conteudo\s*&?\s*links|língua\s*bifurcada|resto\s*tu\s*descobre/i.test(incomingBio)
  if (!incomingBio || isGeneric) config.bio = ''
  else config.bio = incomingBio
  const savedAvatar = (data.avatar_url || '').trim()
  if (savedAvatar === HIDDEN_BANNER_TOKEN) { bannerHidden.value = true; config.avatar_url = HIDDEN_BANNER_TOKEN }
  else if (savedAvatar && !savedAvatar.startsWith('data:')) { bannerHidden.value = false; config.avatar_url = savedAvatar }
  else { bannerHidden.value = false; config.avatar_url = DEFAULT_BANNER }
  if (Array.isArray(data.links) && data.links.length) {
    config.links = data.links.filter((l: any) => l && l.label).map((l: any) => attachLogo({ label: String(l.label || ''), icon: String(l.icon || '🔗'), url: String(l.url || '#'), desc: String(l.desc || ''), enabled: l.enabled !== false }))
  }
}
const { data: remoteConfig } = await useAsyncData('link-page-config', () => $fetch<any>('/api/config').catch(() => null))
if (remoteConfig.value) applyServerConfig(remoteConfig.value)
configReady.value = true
onMounted(() => {
  const block = (e: Event) => { e.preventDefault(); return false }
  document.addEventListener('copy', block, true)
  document.addEventListener('cut', block, true)
  document.addEventListener('selectstart', block, true)
  document.addEventListener('dragstart', block, true)
  document.addEventListener('contextmenu', block, true)
  getOrCreateVisitorId()
  if (!alreadyViewedToday()) { markViewedToday(); track('page_view', { offer_slug: 'wanessa_links' }) }
  setupLinkViews()
  setupScrollDepth()
})
function openLogin() { password.value = ''; loginError.value = ''; showLogin.value = true; nextTick(() => passInput.value?.focus()) }
function openEdit() {
  edit.name = config.name; edit.bio = config.bio; edit.hideBanner = bannerHidden.value
  const av = config.avatar_url || ''
  edit.avatar_url = av.startsWith('data:') || av === HIDDEN_BANNER_TOKEN ? '' : av
  edit.links = config.links.map((l) => ({ label: l.label, icon: l.icon, url: l.url, desc: l.desc || '', enabled: l.enabled !== false }))
  if (!edit.links.length) edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true })
  previewError.value = false
}
function closeAdmin() { isAdmin.value = false; saveMsg.value = ''; saveError.value = '' }
function toggleHideBanner() { edit.hideBanner = !edit.hideBanner; if (edit.hideBanner) previewError.value = false }
function restoreDefaultBanner() { edit.avatar_url = ''; edit.hideBanner = false; previewError.value = false }
function onAvatarInput() { previewError.value = false; if (edit.avatar_url.trim()) edit.hideBanner = false }
function addLink() { edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true }) }
function removeLink(i: number) { edit.links.splice(i, 1) }
async function doLogin() {
  loginError.value = ''; loading.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    password.value = ''; showLogin.value = false; isAdmin.value = true; openEdit()
  } catch (e: any) { loginError.value = e?.data?.statusMessage || e?.statusMessage || 'Senha inválida' }
  finally { loading.value = false }
}
async function doSave() {
  saveMsg.value = ''; saveError.value = ''; loading.value = true
  try {
    let avatarToSave = edit.hideBanner ? HIDDEN_BANNER_TOKEN : (edit.avatar_url || '').trim()
    const payload = {
      name: edit.name || config.name || 'Wanessa',
      bio: edit.bio,
      avatar_url: avatarToSave,
      links: edit.links.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), icon: l.icon || '🔗', url: l.url || '#', desc: (l.desc || '').trim(), enabled: l.enabled !== false }))
    }
    await $fetch('/api/admin/update', { method: 'POST', body: payload })
    config.name = payload.name; config.bio = payload.bio
    if (payload.avatar_url === HIDDEN_BANNER_TOKEN) { bannerHidden.value = true; config.avatar_url = HIDDEN_BANNER_TOKEN }
    else if (payload.avatar_url) { bannerHidden.value = false; config.avatar_url = payload.avatar_url }
    else { bannerHidden.value = false; config.avatar_url = DEFAULT_BANNER }
    config.links = payload.links.map((l) => attachLogo(l))
    saveMsg.value = 'Salvo!'; setTimeout(() => { saveMsg.value = '' }, 2500)
  } catch (e: any) { saveError.value = e?.data?.statusMessage || 'Erro ao salvar' }
  finally { loading.value = false }
}
</script>

<style scoped>
.page { min-height: 100dvh; height: 100dvh; display: flex; justify-content: center; align-items: flex-start; padding: max(8px, env(safe-area-inset-top)) 14px max(10px, env(safe-area-inset-bottom)); position: relative; z-index: 1; overflow: hidden; background: #0a0a0c; box-sizing: border-box; -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; -webkit-tap-highlight-color: transparent; }
.page--locked { pointer-events: none; filter: brightness(0.35); }
.page ::selection, .page *::selection { background: transparent !important; color: inherit !important; }
.page *, .page *::before, .page *::after { -webkit-user-select: none !important; user-select: none !important; -webkit-user-drag: none !important; }
.bg-glow { position: absolute; top: -8%; left: 50%; transform: translateX(-50%); width: min(100vw, 420px); height: 280px; background: radial-gradient(circle, rgba(236, 72, 153, 0.16) 0%, transparent 70%); pointer-events: none; z-index: 0; }
.lock-btn { position: fixed; top: max(8px, env(safe-area-inset-top)); right: 8px; z-index: 50; width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.page--locked .lock-btn { pointer-events: none; }
.container { width: 100%; max-width: 360px; height: 100%; max-height: 100dvh; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; overflow: hidden; }
.banner-wrap { position: relative; width: 100%; flex: 0 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid rgba(236, 72, 153, 0.28); box-shadow: 0 0 24px rgba(236, 72, 153, 0.15); aspect-ratio: 480 / 623; max-height: min(40vh, 320px); background: #111; }
.banner-img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; display: block; pointer-events: none; }
.banner-fire-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  border-radius: 16px;
  overflow: hidden;
}
.fire-edge {
  position: absolute;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.55;
}
.fire-left, .fire-right {
  top: 6%;
  bottom: 6%;
  width: 5px;
  border-radius: 4px;
  filter: blur(3px);
  animation: fire-color 4.5s ease-in-out infinite, fire-side 1.4s ease-in-out infinite;
}
.fire-left { left: 2px; }
.fire-right { right: 2px; animation-delay: 0s, 0.25s; }
.fire-top, .fire-bottom {
  left: 6%;
  right: 6%;
  height: 4px;
  border-radius: 4px;
  filter: blur(3px);
  animation: fire-color 4.5s ease-in-out infinite, fire-edge 1.4s ease-in-out infinite;
}
.fire-top { top: 2px; animation-delay: 1.1s, 0.1s; }
.fire-bottom { bottom: 2px; animation-delay: 2.2s, 0.2s; }
@keyframes fire-color {
  0%, 100% { background: linear-gradient(90deg, #ff6a00, #ff3d00, #ffb300); }
  25% { background: linear-gradient(90deg, #a855f7, #7c3aed, #c084fc); }
  50% { background: linear-gradient(90deg, #ef4444, #dc2626, #f87171); }
  75% { background: linear-gradient(90deg, #3b82f6, #2563eb, #60a5fa); }
}
@keyframes fire-side {
  0%, 100% { opacity: 0.4; transform: scaleX(1); }
  50% { opacity: 0.75; transform: scaleX(1.35); }
}
@keyframes fire-edge {
  0%, 100% { opacity: 0.4; transform: scaleY(1); }
  50% { opacity: 0.75; transform: scaleY(1.4); }
}
.identity { text-align: center; margin-top: 8px; margin-bottom: 6px; width: 100%; flex-shrink: 0; }
.bio { font-family: Inter, system-ui, sans-serif; font-size: 0.88rem; font-weight: 500; color: rgba(255, 255, 255, 0.88); margin-top: 4px; line-height: 1.4; }
.cta-choose { text-align: center; margin-bottom: 14px; flex-shrink: 0; }
.cta-title { font-family: Inter, system-ui, sans-serif; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #f6339a; line-height: 1.35; }
.links { width: 100%; display: flex; flex-direction: column; gap: 14px; flex-shrink: 0; }
.link-block { width: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 8px 28px rgba(0, 0, 0, 0.25); }
.link-intro {
  font-family: Inter, system-ui, sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.55;
  text-align: center;
  padding: 0 4px;
  letter-spacing: 0.01em;
  white-space: pre-line;
}
.links-skeleton .skel { height: 56px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.85; } }
.link { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; background: linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(192, 38, 211, 0.08)); border: 1px solid rgba(236, 72, 153, 0.38); border-radius: 12px; font-weight: 600; font-size: 0.88rem; transition: transform 0.12s ease, box-shadow 0.12s ease; position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent; touch-action: manipulation; z-index: 0; }
.link:hover { transform: translateY(-1px); border-color: rgba(244, 114, 182, 0.65); box-shadow: 0 6px 18px rgba(236, 72, 153, 0.25); }
.link:active { transform: scale(0.98); }
.link-rgb { border: 2px solid transparent; background: linear-gradient(#121014, #121014) padding-box, linear-gradient(90deg, #ff0040, #ff8c00, #ffee00, #00ff66, #00c8ff, #7a00ff, #ff00c8, #ff0040) border-box; background-size: 100% 100%, 300% 100%; animation: rgb-border 3s linear infinite; box-shadow: 0 0 12px rgba(255, 0, 128, 0.35), 0 0 24px rgba(0, 200, 255, 0.2); }
.link-rgb:hover { border-color: transparent; box-shadow: 0 0 16px rgba(255, 0, 128, 0.5), 0 0 32px rgba(0, 200, 255, 0.35); }
@keyframes rgb-border { 0% { background-position: 0% 0%, 0% 50%; } 100% { background-position: 0% 0%, 300% 50%; } }
.link-pulse { animation: rgb-border 3s linear infinite, decision-pulse 1.4s ease-in-out infinite; }
@keyframes decision-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 128, 0.55), 0 0 18px rgba(255, 0, 128, 0.35), 0 0 32px rgba(0, 200, 255, 0.2); }
  50% { transform: scale(1.035); box-shadow: 0 0 0 10px rgba(255, 0, 128, 0), 0 0 28px rgba(255, 0, 128, 0.55), 0 0 48px rgba(255, 80, 0, 0.35); }
}
.link-pulse:hover { animation: rgb-border 3s linear infinite, decision-pulse 1.4s ease-in-out infinite; }
.link-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.06); border-radius: 9px; flex-shrink: 0; overflow: hidden; }
.logo-img { width: 24px; height: 24px; object-fit: contain; border-radius: 50%; }
.link-label { flex: 1; font-family: Inter, system-ui, sans-serif; font-weight: 700; line-height: 1.2; color: #fff; letter-spacing: 0.01em; }
.link-arrow { opacity: 0.5; color: #f472b6; font-size: 1rem; flex-shrink: 0; transition: transform 0.12s ease, opacity 0.12s ease; }
.link:hover .link-arrow { opacity: 1; transform: translateX(3px); }
.footer { margin-top: 16px; text-align: center; flex-shrink: 0; width: 100%; }
.footer-note { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); margin-bottom: 4px; }
.footer-copy { font-size: 0.62rem; color: rgba(255, 255, 255, 0.28); letter-spacing: 0.02em; line-height: 1.35; }
@media (min-height: 720px) { .banner-wrap { max-height: min(44vh, 360px); } .links { gap: 16px; } .link { padding: 13px 16px; font-size: 0.9rem; } .identity { margin-top: 10px; margin-bottom: 8px; } .cta-choose { margin-bottom: 14px; } }
@media (min-width: 768px) { .page { padding-top: 24px; } .container { max-width: 380px; } .links { gap: 16px; } }
@media (max-height: 640px) { .banner-wrap { max-height: min(32vh, 220px); } .bio { font-size: 0.72rem; } .cta-title { font-size: 0.78rem; } .link { padding: 10px 12px; font-size: 0.82rem; } .links { gap: 10px; } }
</style>

<style>
.wl-overlay { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100dvh !important; z-index: 2147483646 !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 16px !important; margin: 0 !important; background: rgba(0, 0, 0, 0.85) !important; box-sizing: border-box !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch; isolation: isolate; pointer-events: auto !important; }
.wl-card { position: relative !important; z-index: 2147483647 !important; background: #141416 !important; border: 1px solid rgba(255, 255, 255, 0.14) !important; border-radius: 16px !important; padding: 20px !important; width: 100% !important; max-width: 400px !important; max-height: min(88dvh, 720px) !important; overflow-y: auto !important; margin: auto !important; box-sizing: border-box !important; color: #fff !important; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.75) !important; -webkit-user-select: text !important; user-select: text !important; pointer-events: auto !important; }
.wl-card input, .wl-card textarea, .wl-card button { pointer-events: auto !important; -webkit-user-select: text !important; user-select: text !important; }
.wl-card h2 { font-size: 1.15rem; margin: 0 0 14px; color: #fff; }
.wl-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.wl-head h2 { margin: 0; }
.wl-x { background: transparent; border: none; color: rgba(255,255,255,0.55); font-size: 1.7rem; line-height: 1; cursor: pointer; padding: 0 4px; }
.wl-label { display: block; font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); margin: 12px 0 4px; }
.wl-muted { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 6px 0; }
.wl-input { width: 100% !important; padding: 11px 12px !important; border-radius: 10px !important; border: 1px solid rgba(255, 255, 255, 0.12) !important; background: rgba(255, 255, 255, 0.06) !important; color: #fff !important; font-size: 0.9rem !important; box-sizing: border-box !important; }
.wl-textarea { resize: vertical; min-height: 72px; line-height: 1.4; font-family: inherit; }
.wl-input:disabled { opacity: 0.4; }
.wl-btn { width: 100%; margin-top: 10px; padding: 12px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
.wl-btn-primary { background: linear-gradient(135deg, #ec4899, #c026d3); color: #fff; }
.wl-btn-ghost { background: transparent; border: 1px solid rgba(255, 255, 255, 0.15); color: #fff; }
.wl-btn-sm { width: auto; padding: 6px 12px; font-size: 0.78rem; margin-top: 0; }
.wl-btn-danger { background: rgba(248, 113, 113, 0.15); border: 1px solid rgba(248, 113, 113, 0.4); color: #fca5a5; }
.wl-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.wl-error { color: #f87171; font-size: 0.8rem; margin-top: 8px; }
.wl-ok { color: #4ade80; font-size: 0.8rem; margin-top: 8px; }
.wl-row { display: flex; gap: 8px; margin-top: 14px; }
.wl-row .wl-btn { flex: 1; margin-top: 0; }
.wl-banner-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.wl-preview { margin-top: 6px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); background: #0a0a0c; width: 100%; }
.wl-preview img { width: 100%; height: auto; aspect-ratio: 480 / 623; object-fit: contain; object-position: center top; display: block; background: #0a0a0c; }
.wl-links-head { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; margin-bottom: 4px; }
.wl-link-edit { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; margin-top: 10px; background: rgba(255,255,255,0.03); }
.wl-link-edit.is-off { opacity: 0.55; border-style: dashed; }
.wl-link-row { display: grid; grid-template-columns: 48px 1fr; gap: 6px; margin-bottom: 6px; }
.wl-icon { text-align: center !important; padding: 8px 4px !important; }
.wl-link-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.wl-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: rgba(255,255,255,0.7); margin: 0 !important; cursor: pointer; }
.wl-toggle input { width: auto !important; accent-color: #ec4899; }
.wl-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
@media (max-width: 480px) { .wl-card { max-width: 100%; padding: 16px; } }
</style>
