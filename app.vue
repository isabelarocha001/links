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
    <div class="bg-grain" aria-hidden="true"></div>

    <button class="lock-btn" type="button" aria-label="Editar página" @click="openLogin">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>

    <main class="container">
      <header class="hero">
        <div class="photo-stage">
          <div class="photo-frame">
            <img
              v-for="(src, i) in gallery"
              :key="src + i"
              :src="src"
              :class="['hero-photo', { 'is-active': i === photoIndex }]"
              alt="Wanessa"
              decoding="async"
              draggable="false"
            />
            <div class="photo-shine" aria-hidden="true"></div>
            <div class="photo-vignette" aria-hidden="true"></div>
          </div>
          <div class="photo-dots" aria-hidden="true">
            <span
              v-for="(_, i) in gallery"
              :key="i"
              class="dot"
              :class="{ active: i === photoIndex }"
            />
          </div>
        </div>

        <div class="identity">
          <p class="eyebrow">Modelo de Luxo</p>
          <h1 class="name">{{ config.name || 'Wanessa' }}</h1>
          <p class="tagline">{{ config.bio || 'Exclusividade. Elegância. Nível que poucos alcançam.' }}</p>
          <div class="accent-line" aria-hidden="true"></div>
        </div>
      </header>

      <section class="main-cards" v-if="configReady">
        <a
          class="lux-card lux-card--left"
          :href="privsexUrl"
          target="_blank"
          rel="noopener noreferrer"
          @pointerdown.passive="onCardClick('PrivSex', privsexUrl)"
        >
          <div class="card-glow"></div>
          <div class="card-top">
            <span class="card-icon">
              <img v-if="logoPriv" :src="logoPriv" alt="" class="logo-img" width="28" height="28" />
              <template v-else>🔥</template>
            </span>
            <span class="card-badge">Privado</span>
          </div>
          <h2 class="card-title">PrivSex</h2>
          <p class="card-desc">Conteúdo exclusivo e experiência premium.</p>
          <span class="card-cta">Entrar →</span>
        </a>

        <a
          class="lux-card lux-card--right"
          :href="telegramPublicUrl"
          target="_blank"
          rel="noopener noreferrer"
          @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrl)"
        >
          <div class="card-glow"></div>
          <div class="card-top">
            <span class="card-icon">
              <img v-if="logoTg" :src="logoTg" alt="" class="logo-img" width="28" height="28" />
              <template v-else>📱</template>
            </span>
            <span class="card-badge badge-tg">Telegram</span>
          </div>
          <h2 class="card-title">Canal Público</h2>
          <p class="card-desc">Prévias e o primeiro contato com o meu mundo.</p>
          <span class="card-cta">Entrar →</span>
        </a>
      </section>

      <section class="vip-block" v-if="configReady">
        <a
          class="vip-card"
          :href="vipBotUrl"
          target="_blank"
          rel="noopener noreferrer"
          @pointerdown.passive="onCardClick('VIP Bot', vipBotUrl)"
        >
          <div class="vip-shine"></div>
          <div class="vip-content">
            <span class="vip-icon">⭐</span>
            <div>
              <h3 class="vip-title">VIP Automático</h3>
              <p class="vip-desc">Compra instantânea · sem conversa · acesso imediato</p>
            </div>
          </div>
          <span class="vip-arrow">→</span>
        </a>
      </section>

      <section class="direct-section">
        <p class="direct-label">Contato direto · apenas para quem deseja algo além</p>
        <div class="direct-stack">
          <a
            class="direct-btn direct-wa"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            @pointerdown.passive="onCardClick('WhatsApp', whatsappUrl)"
          >
            <span class="d-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </span>
            <span>Meus conteúdos no WhatsApp</span>
          </a>
          <a
            class="direct-btn direct-tg"
            :href="telegramPrivateUrl"
            target="_blank"
            rel="noopener noreferrer"
            @pointerdown.passive="onCardClick('Telegram Privado', telegramPrivateUrl)"
          >
            <span class="d-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </span>
            <span>Canal de conteúdo no Telegram</span>
          </a>
        </div>
      </section>

      <footer class="footer">
        <p class="footer-copy">© Wanessa · Experiência exclusiva</p>
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
            <h2>Editar apresentação</h2>
            <button type="button" class="wl-x" @click="closeAdmin">×</button>
          </div>
          <label class="wl-label">Nome</label>
          <input v-model="edit.name" type="text" maxlength="80" class="wl-input" />
          <label class="wl-label">Tagline / Bio</label>
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
            <span class="wl-label" style="margin:0">Links (admin)</span>
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

const privsexUrl = 'https://privsex.com/wanessa'
const telegramPublicUrl = 'https://t.me/+yA5Y1pAWx5RlMWIx'
const vipBotUrl = 'https://t.me/wanessaavipbot?start=Pressel'
const whatsappUrl = 'https://wa.me/5547992750967'
const telegramPrivateUrl = 'https://t.me/wanessabsx'

const logoPriv = LOGO_PRIVSEX
const logoTg = LOGO_TG_BLUE

const gallery = ['/model.jpg', '/model.jpg', '/model.jpg']

const photoIndex = ref(0)
let photoTimer: ReturnType<typeof setInterval> | null = null

const DEFAULT_LINKS: LinkItem[] = [
  { label: 'PrivSex', icon: '🔥', url: privsexUrl, enabled: true },
  { label: 'Telegram VIP', icon: '⭐', url: vipBotUrl, enabled: true },
  { label: 'Canal de prévias', icon: '📱', url: telegramPublicUrl, enabled: true },
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
  if (/pr[eé]via|canal|público/i.test(lower)) return 'previa_telegram'
  if (/vip/i.test(lower)) return 'telegram_vip'
  if (/priv/i.test(lower)) return 'privsex'
  if (/whats/i.test(lower)) return 'whatsapp'
  if (/telegram.*priv|conteúdo no telegram/i.test(lower)) return 'telegram_privado'
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
function onCardClick(label: string, url: string) {
  const slug = offerFromLabel(label)
  if (alreadyClickedToday(slug)) return
  markClickedToday(slug)
  track('outbound_click', { label, url, offer_slug: slug })
}

function attachLogo(l: LinkItem): LinkItem {
  const lab = (l.label || '').toLowerCase()
  let logo: string | undefined
  if (/pr[eé]via|canal|público/i.test(lab)) logo = LOGO_TG_BLUE
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
  photoTimer = setInterval(() => {
    photoIndex.value = (photoIndex.value + 1) % gallery.length
  }, 4200)
})

onUnmounted(() => {
  if (photoTimer) clearInterval(photoTimer)
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
  title: 'Wanessa | Modelo de Luxo',
  meta: [
    { name: 'description', content: 'Apresentação exclusiva de Wanessa — elegância, privacidade e alto nível.' },
    { name: 'theme-color', content: '#1a0a24' },
  ],
})
</script>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: max(16px, env(safe-area-inset-top)) 16px max(28px, env(safe-area-inset-bottom));
  position: relative;
  background: #12081a;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
  overflow-x: hidden;
}
.page--locked {
  pointer-events: none;
  filter: brightness(0.35);
}
.bg-glow {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: min(100vw, 520px);
  height: 420px;
  background:
    radial-gradient(ellipse 70% 50% at 50% 20%, rgba(168, 85, 247, 0.22) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 70% 40%, rgba(192, 38, 211, 0.12) 0%, transparent 55%);
  pointer-events: none;
}
.bg-grain {
  position: absolute;
  inset: 0;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
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
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  margin: 0 auto;
}
.hero {
  width: 100%;
  text-align: center;
  margin-bottom: 28px;
}
.photo-stage {
  position: relative;
  width: 100%;
  max-width: 280px;
  margin: 0 auto 20px;
}
.photo-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 18px;
  overflow: hidden;
  background: #1a0f24;
  border: 1px solid rgba(192, 132, 252, 0.4);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    0 20px 50px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(168, 85, 247, 0.15);
}
.hero-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 1.1s ease, transform 6s ease;
  will-change: opacity, transform;
}
.hero-photo.is-active {
  opacity: 1;
  transform: scale(1);
  z-index: 1;
}
.photo-shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(125deg, transparent 40%, rgba(255, 255, 255, 0.07) 48%, transparent 56%);
  pointer-events: none;
  animation: shine-sweep 7s ease-in-out infinite;
}
@keyframes shine-sweep {
  0%, 100% { transform: translateX(-30%); opacity: 0; }
  40% { opacity: 1; }
  60% { transform: translateX(30%); opacity: 0; }
}
.photo-vignette {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: radial-gradient(ellipse at center, transparent 45%, rgba(18, 8, 26, 0.5) 100%);
  pointer-events: none;
}
.photo-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}
.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.3s, transform 0.3s;
}
.dot.active {
  background: #c084fc;
  transform: scale(1.25);
}
.identity { padding: 0 8px; }
.eyebrow {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #c084fc;
  margin: 0 0 6px;
}
.name {
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #f5f0ff;
  margin: 0 0 8px;
  line-height: 1.15;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
}
.tagline {
  font-size: 0.88rem;
  font-weight: 400;
  color: rgba(245, 240, 255, 0.72);
  line-height: 1.45;
  margin: 0 auto;
  max-width: 300px;
}
.accent-line {
  width: 48px;
  height: 1px;
  margin: 16px auto 0;
  background: linear-gradient(90deg, transparent, #c084fc, transparent);
}
.main-cards {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}
.lux-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 16px 14px 14px;
  border-radius: 16px;
  background: linear-gradient(165deg, rgba(40, 20, 55, 0.95), rgba(24, 12, 36, 0.98));
  border: 1px solid rgba(168, 85, 247, 0.28);
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  min-height: 148px;
}
.lux-card:hover {
  transform: translateY(-3px);
  border-color: rgba(192, 132, 252, 0.55);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 0 28px rgba(168, 85, 247, 0.18);
}
.lux-card:active { transform: scale(0.98); }
.card-glow {
  position: absolute;
  top: -30%;
  right: -20%;
  width: 80%;
  height: 70%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%);
  pointer-events: none;
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
}
.card-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.logo-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  border-radius: 50%;
}
.card-badge {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e9d5ff;
  background: rgba(168, 85, 247, 0.2);
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid rgba(168, 85, 247, 0.35);
}
.badge-tg {
  color: #c4b5fd;
  background: rgba(139, 92, 246, 0.18);
  border-color: rgba(139, 92, 246, 0.35);
}
.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #f5f0ff;
  margin: 0 0 4px;
  position: relative;
  z-index: 1;
}
.card-desc {
  font-size: 0.72rem;
  color: rgba(245, 240, 255, 0.55);
  line-height: 1.35;
  margin: 0 0 auto;
  position: relative;
  z-index: 1;
  flex: 1;
}
.card-cta {
  font-size: 0.75rem;
  font-weight: 600;
  color: #c084fc;
  margin-top: 12px;
  position: relative;
  z-index: 1;
  letter-spacing: 0.02em;
}
.vip-block { width: 100%; margin-bottom: 22px; }
.vip-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(126, 34, 206, 0.12));
  border: 1px solid rgba(192, 132, 252, 0.45);
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.vip-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(168, 85, 247, 0.25);
}
.vip-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%);
  animation: vip-shine 4.5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes vip-shine {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
}
.vip-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  position: relative;
  z-index: 1;
}
.vip-icon { font-size: 1.4rem; }
.vip-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f5f0ff;
  margin: 0 0 2px;
}
.vip-desc {
  font-size: 0.7rem;
  color: rgba(245, 240, 255, 0.6);
  margin: 0;
}
.vip-arrow {
  color: #c084fc;
  font-size: 1.1rem;
  opacity: 0.85;
  position: relative;
  z-index: 1;
}
.direct-section {
  width: 100%;
  text-align: center;
  margin-bottom: 8px;
}
.direct-label {
  font-size: 0.68rem;
  color: rgba(245, 240, 255, 0.35);
  letter-spacing: 0.04em;
  margin: 0 0 12px;
}
.direct-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}
.direct-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid rgba(192, 132, 252, 0.22);
  background: rgba(168, 85, 247, 0.1);
  color: rgba(245, 240, 255, 0.9);
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
  box-sizing: border-box;
}
.direct-btn:hover {
  background: rgba(168, 85, 247, 0.18);
  border-color: rgba(192, 132, 252, 0.45);
  color: #fff;
  transform: translateY(-1px);
}
.direct-btn:active { transform: scale(0.98); }
.d-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  color: #c084fc;
}
.direct-wa .d-icon { color: #25d366; }
.direct-tg .d-icon { color: #2aabee; }
.footer { margin-top: 28px; text-align: center; }
.footer-copy {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.22);
  letter-spacing: 0.04em;
}
@media (min-height: 780px) {
  .page { align-items: center; }
}
@media (max-width: 360px) {
  .main-cards { gap: 8px; }
  .lux-card { padding: 12px 10px; min-height: 136px; }
  .card-title { font-size: 0.95rem; }
  .name { font-size: 1.6rem; }
  .direct-btn { font-size: 0.8rem; padding: 12px 14px; }
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
  background: rgba(18, 8, 26, 0.92) !important;
  overflow-y: auto !important;
}
.wl-card {
  background: #1e1230 !important;
  border: 1px solid rgba(168, 85, 247, 0.25) !important;
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
.wl-btn-primary { background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; }
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
