<template>
  <div class="page" :class="{ 'page--locked': showLogin || isAdmin }" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
    <div class="bg-glow" aria-hidden="true"></div>
    <div class="bg-grain" aria-hidden="true"></div>
    <button class="lock-btn" type="button" aria-label="Editar página" @click="openLogin">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    </button>
    <main class="container">
      <section
        v-if="gateReady && (gate === 1 || gate === 2 || gate === 3 || gate === 'reject')"
        class="wa-shell"
      >
        <header class="wa-header">
          <div class="wa-header-side">
            <span class="wa-back" aria-hidden="true">‹</span>
          </div>
          <div class="wa-header-info">
            <p class="wa-name">Criadora de conteúdo · Wanessa</p>
            <p class="wa-status">
              <span v-if="isTyping" class="wa-status-typing">digitando…</span>
              <span v-else class="wa-status-online">online</span>
            </p>
          </div>
          <div class="wa-avatar-wrap">
            <img class="wa-avatar" src="/model.jpg" alt="" draggable="false" />
            <span class="wa-online-dot" aria-hidden="true"></span>
          </div>
        </header>

        <div ref="chatBox" class="wa-chat">
          <div class="wa-day">Hoje</div>
          <div
            v-for="(m, i) in chatMessages"
            :key="i"
            class="wa-row"
            :class="m.from === 'me' ? 'wa-row--me' : 'wa-row--her'"
          >
            <div class="wa-bubble" :class="m.from === 'me' ? 'wa-bubble--me' : 'wa-bubble--her'">
              <p class="wa-text">{{ m.text }}</p>
              <span class="wa-time">{{ m.time }}</span>
            </div>
          </div>
          <div v-if="isTyping" class="wa-row wa-row--her">
            <div class="wa-bubble wa-bubble--her wa-bubble--typing">
              <span class="wa-dot"></span><span class="wa-dot"></span><span class="wa-dot"></span>
            </div>
          </div>
        </div>

        <div v-if="!isTyping && gate !== 'reject' && quizOptions.length" class="wa-quick">
          <button
            v-for="opt in quizOptions"
            :key="opt.key"
            type="button"
            class="wa-quick-btn"
            :class="opt.variant"
            @click="answerQuiz(opt.key)"
          >
            {{ opt.label }}
          </button>
        </div>

        <div class="wa-composer">
          <button type="button" class="wa-emoji" disabled aria-hidden="true">😊</button>
          <input class="wa-input" type="text" disabled placeholder="Responda pelos botões acima" readonly />
          <button type="button" class="wa-send" disabled aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </section>

      <template v-else-if="gateReady && gate === 'pass'">
        <header class="hero">
          <div class="photo-stage">
            <div class="photo-frame">
              <img v-for="(src, i) in gallery" :key="src + i" :src="src" :class="['hero-photo', { 'is-active': i === photoIndex }]" alt="" decoding="async" draggable="false" />
              <div class="photo-shine" aria-hidden="true"></div>
              <div class="photo-vignette" aria-hidden="true"></div>
            </div>
            <div class="photo-dots" aria-hidden="true">
              <span v-for="(_, i) in gallery" :key="i" class="dot" :class="{ active: i === photoIndex }" />
            </div>
          </div>
          <!-- identity title removed -->
        </header>
        <section class="main-cards" v-if="configReady">
          <a class="lux-card lux-card--left" :href="privsexUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('PrivSex', privsexUrl)">
            <div class="card-glow"></div>
            <div class="card-top">
              <span class="card-icon"><img v-if="logoPriv" :src="logoPriv" alt="" class="logo-img" width="28" height="28" /><template v-else>🔥</template></span>
              <span class="card-badge">Privado</span>
            </div>
            <h2 class="card-title">PrivSex</h2>
            <p class="card-desc">Conteúdo exclusivo e experiência premium.</p>
            <span class="card-cta">Entrar →</span>
          </a>
          <a class="lux-card lux-card--right" :href="telegramPublicUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrl)">
            <div class="card-glow"></div>
            <div class="card-top">
              <span class="card-icon"><img v-if="logoTg" :src="logoTg" alt="" class="logo-img" width="28" height="28" /><template v-else>📱</template></span>
              <span class="card-badge badge-tg">Telegram</span>
            </div>
            <h2 class="card-title">Canal Público</h2>
            <p class="card-desc">Prévias e o primeiro contato com o meu mundo.</p>
            <span class="card-cta">Entrar →</span>
          </a>
        </section>
        <section class="vip-block" v-if="configReady">
          <a class="vip-card" :href="vipBotUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('VIP Bot', vipBotUrl)">
            <div class="vip-shine"></div>
            <div class="vip-content">
              <span class="vip-icon vip-icon-stack" aria-hidden="true" title="Bot Telegram">
                <span class="vip-robot">🤖</span>
                <img class="vip-tg-logo" :src="logoTgPurple" alt="Telegram" width="18" height="18" />
              </span>
              <div>
                <h3 class="vip-title">Bot pra assinar o VIP no Telegram</h3>
                <p class="vip-desc">Compra instantânea · sem conversa · acesso imediato</p>
              </div>
            </div>
            <span class="vip-arrow">→</span>
          </a>
        </section>
        <section class="direct-section">
          <p class="direct-label">Privado · somente venda de conteúdo</p>
          <div class="direct-stack">
            <a class="direct-btn direct-wa" :href="whatsappUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('WhatsApp', whatsappUrl)">
              <span class="d-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></span>
              <span class="d-btn-text"><span class="d-btn-title">WhatsApp privado</span><span class="d-btn-sub">Só venda de conteúdo</span></span>
            </a>
            <a class="direct-btn direct-tg" :href="telegramPrivateUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Privado', telegramPrivateUrl)">
              <span class="d-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></span>
              <span class="d-btn-text"><span class="d-btn-title">Telegram privado</span><span class="d-btn-sub">Só venda de conteúdo</span></span>
            </a>
          </div>
        </section>
        <footer class="bio-block">
          <div class="ig-card">
            <img class="ig-avatar" :src="igProfileSrc" alt="" width="72" height="72" draggable="false" />
            <div class="ig-info">
              <p class="ig-user">wanessabsx_</p>
              <p class="ig-name">Wanessa Borges</p>
              <div class="ig-stats">
                <span><b>22</b> posts</span>
                <span><b>32,2 mil</b> seguidores</span>
                <span><b>53</b> seguindo</span>
              </div>
            </div>
          </div>
          <p class="bio-meta">Criadora de conteúdo · Catarinense · 22 anos</p>
          <p class="bio-text">Presença digital com mais de 30 mil pessoas. O que você encontra aqui é o que não cabe no Instagram.</p>
          <p class="bio-copy">© Wanessa</p>
        </footer>
      </template>
    </main>
  </div>

  <ClientOnly>
    <Teleport to="body">
      <div v-if="showLogin && !isAdmin" class="wl-overlay" @click.self="showLogin = false">
        <div class="wl-card" role="dialog" aria-modal="true" @click.stop>
          <h2>Acesso admin</h2>
          <input ref="passInput" v-model="password" type="password" placeholder="Senha" autocomplete="current-password" class="wl-input" @keyup.enter="doLogin" />
          <p v-if="loginError" class="wl-error">{{ loginError }}</p>
          <button type="button" class="wl-btn wl-btn-primary" :disabled="loading" @click="doLogin">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
          <button type="button" class="wl-btn wl-btn-ghost" @click="showLogin = false">Cancelar</button>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="isAdmin" class="wl-overlay" @click.self="closeAdmin">
        <div class="wl-card" role="dialog" aria-modal="true" @click.stop>
          <div class="wl-head"><h2>Editar apresentação</h2><button type="button" class="wl-x" @click="closeAdmin">×</button></div>
          <label class="wl-label">Nome</label>
          <input v-model="edit.name" type="text" maxlength="80" class="wl-input" />
          <label class="wl-label">Tagline / Bio</label>
          <input v-model="edit.bio" type="text" maxlength="200" class="wl-input" />
          <label class="wl-label">Botão em destaque (RGB)</label>
          <select v-model="edit.highlight_label" class="wl-input wl-select">
            <option value="">Nenhum</option>
            <option v-for="l in edit.links.filter((x) => x.label.trim())" :key="l.label" :value="l.label">{{ l.label }}</option>
          </select>
          <div class="wl-links-head"><span class="wl-label" style="margin:0">Links (admin)</span><button type="button" class="wl-btn wl-btn-sm wl-btn-primary" @click="addLink">+ Adicionar</button></div>
          <div v-for="(l, i) in edit.links" :key="i" class="wl-link-edit" :class="{ 'is-off': l.enabled === false }">
            <div class="wl-link-row"><input v-model="l.icon" class="wl-input wl-icon" placeholder="🔥" /><input v-model="l.label" class="wl-input" placeholder="Título" /></div>
            <input v-model="l.url" class="wl-input" placeholder="https://..." />
            <textarea v-model="l.desc" class="wl-input wl-textarea" placeholder="Texto acima do botão (opcional)" maxlength="300" rows="3" />
            <div class="wl-link-actions">
              <label class="wl-toggle"><input type="checkbox" :checked="l.enabled !== false" @change="l.enabled = ($event.target as HTMLInputElement).checked" /><span>{{ l.enabled === false ? 'Desativado' : 'Ativo' }}</span></label>
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
type ChatMsg = { from: 'her' | 'me'; text: string; time: string }
import { LOGO_TG_BLUE, LOGO_TG_PURPLE, LOGO_PRIVSEX } from '~/utils/logos'
import { getDeviceFingerprint } from '~/utils/fingerprint'
import { IG_PROFILE_SRC as igProfileSrc } from '~/utils/ig-profile'
import '~/assets/css/links-page.css'

const DEFAULT_HIGHLIGHT = 'PrivSex'
const VID_KEY = 'wanessa_vid'
const VIEW_DAY_KEY = 'wanessa_view_day'
const CLICK_DAY_PREFIX = 'wanessa_click_'
const GATE_KEY = 'wanessa_gate_v1'

const privsexUrl = 'https://privsex.com/wanessa'
const telegramPublicUrl = 'https://t.me/+yA5Y1pAWx5RlMWIx'
const vipBotUrl = 'https://t.me/wanessaavipbot?start=Pressel'
const whatsappUrl = 'https://wa.me/5547992750967?text=' + encodeURIComponent('Quero mais informaçoes sobre o seu conteudo vip')
const telegramPrivateUrl = 'https://t.me/wanessabsx'
const logoPriv = LOGO_PRIVSEX
const logoTg = LOGO_TG_BLUE
const logoTgPurple = LOGO_TG_PURPLE
const gallery = ['/model.jpg', '/model.jpg', '/model.jpg']
const photoIndex = ref(0)
let photoTimer: ReturnType<typeof setInterval> | null = null

const gate = ref<1 | 2 | 3 | 'pass' | 'reject' | null>(null)
const quizAnswers = ref<Record<string, string>>({})
const gateReady = ref(false)
const chatMessages = ref<ChatMsg[]>([])
const isTyping = ref(false)
const chatBox = ref<HTMLElement | null>(null)
let typingTimer: ReturnType<typeof setTimeout> | null = null

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function scrollChat() {
  nextTick(() => {
    const el = chatBox.value
    if (el) el.scrollTop = el.scrollHeight
  })
}
function pushMsg(from: 'her' | 'me', text: string) {
  chatMessages.value.push({ from, text, time: nowTime() })
  scrollChat()
}
function typeThenAsk(text: string, delay = 900) {
  isTyping.value = true
  scrollChat()
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    isTyping.value = false
    pushMsg('her', text)
  }, delay)
}
const questionText = (g: 1 | 2 | 3) => {
  if (g === 1) return 'Oi 😊 Você já assinou Privacy, PrivSex ou VIP de alguma criadora?'
  if (g === 2) return 'Você já me conhece pelo Instagram?'
  return 'O que você busca aqui agora?'
}
const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: 'Sim, já assinei', variant: 'wa-quick--yes' }, { key: 'no', label: 'Nunca assinei nada', variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: 'Sim', variant: 'wa-quick--yes' }, { key: 'no', label: 'Não', variant: 'wa-quick--no' }]
  if (gate.value === 3) return [
    { key: 'assinar', label: 'Quero assinar o VIP hoje', variant: 'wa-quick--yes' },
    { key: 'precos', label: 'Quero ver preços / opções', variant: 'wa-quick--yes' },
    { key: 'olhando', label: 'Só estou olhando', variant: 'wa-quick--no' },
  ]
  return []
})
function setGate(next: 1 | 2 | 3 | 'pass' | 'reject', persistServer = false) {
  gate.value = next
  try { localStorage.setItem(GATE_KEY, String(next)) } catch {}
  if (persistServer && (next === 'pass' || next === 'reject')) {
    const visitor_id = getOrCreateVisitorId()
    getDeviceFingerprint().then((fingerprint) => {
      try {
        fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitor_id, fingerprint, status: next, answers: { ...quizAnswers.value } }),
          keepalive: true,
        }).catch(() => {})
      } catch {}
    })
  }
}
function answerQuiz(key: string) {
  if (isTyping.value) return
  const label = quizOptions.value.find((o) => o.key === key)?.label || key
  pushMsg('me', label)
  if (gate.value === 1) {
    quizAnswers.value.q1 = key === 'yes' ? 'assinou_sim' : 'assinou_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk('Obrigada. Este espaço é exclusivo pra quem já valoriza conteúdo pago. Não libero acesso pra quem nunca assinou nada.', 1400)
    } else {
      setGate(2)
      typeThenAsk(questionText(2), 1100)
    }
    return
  }
  if (gate.value === 2) {
    quizAnswers.value.q2 = key === 'yes' ? 'conhece_sim' : 'conhece_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk('Obrigada. Você não é o tipo de pessoa que estou procurando.', 1200)
    } else {
      setGate(3)
      typeThenAsk(questionText(3), 1100)
    }
    return
  }
  if (gate.value === 3) {
    const intentMap: Record<string, string> = {
      assinar: 'intent_assinar_hoje',
      precos: 'intent_ver_precos',
      olhando: 'intent_so_olhando',
    }
    quizAnswers.value.q3 = intentMap[key] || key
    try { localStorage.setItem('wanessa_intent', quizAnswers.value.q3) } catch {}
    // 3a pergunta = filtro final: so curiosos nao entram na pressel
    if (key === 'olhando') {
      setGate('reject', true)
      typeThenAsk('Obrigada. Este espaço é pra quem já está pronto pra assinar. Quando decidir, volta aqui.', 1400)
    } else if (key === 'assinar') {
      pushMsg('her', 'Perfeito. Vou te levar pro bot VIP e às opções de compra…')
      setTimeout(() => setGate('pass', true), 800)
    } else {
      // precos / opcoes
      pushMsg('her', 'Perfeito. Entrando nas opções e valores…')
      setTimeout(() => setGate('pass', true), 800)
    }
  }
}
const DEFAULT_LINKS: LinkItem[] = [
  { label: 'PrivSex', icon: '🔥', url: privsexUrl, enabled: true },
  { label: 'Telegram VIP', icon: '⭐', url: vipBotUrl, enabled: true },
  { label: 'Canal de prévias', icon: '📱', url: telegramPublicUrl, enabled: true },
]
const config = reactive({ name: '', bio: '', links: [] as LinkItem[], highlight_label: DEFAULT_HIGHLIGHT })
const configReady = ref(false)
const showLogin = ref(false)
const isAdmin = ref(false)
const password = ref('')
const loginError = ref('')
const saveMsg = ref('')
const saveError = ref('')
const loading = ref(false)
const passInput = ref<HTMLInputElement | null>(null)
const edit = reactive({ name: '', bio: '', links: [] as LinkItem[], highlight_label: DEFAULT_HIGHLIGHT })
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(VID_KEY) || ''
    if (!id || id.length < 8) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(VID_KEY, id)
    }
    document.cookie = `vid=${encodeURIComponent(id)};path=/;max-age=31536000;SameSite=Lax;Secure`
    return id
  } catch { return `v_${Date.now().toString(36)}` }
}
function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function alreadyViewedToday() { try { return localStorage.getItem(VIEW_DAY_KEY) === todayKey() } catch { return false } }
function markViewedToday() { try { localStorage.setItem(VIEW_DAY_KEY, todayKey()) } catch {} }
function alreadyClickedToday(slug: string) { try { return localStorage.getItem(CLICK_DAY_PREFIX + slug) === todayKey() } catch { return false } }
function markClickedToday(slug: string) { try { localStorage.setItem(CLICK_DAY_PREFIX + slug, todayKey()) } catch {} }
function readUtms() {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  return { utm_source: p.get('utm_source'), utm_medium: p.get('utm_medium'), utm_campaign: p.get('utm_campaign'), utm_content: p.get('utm_content'), utm_term: p.get('utm_term'), src: p.get('src'), sck: p.get('sck') }
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
  const isGeneric = /creator|conteúdo\s*&?\s*links|content\s*&?\s*links|língua\s*bifurcada|resto\s*tu\s*descobre/i.test(incomingBio)
  config.bio = !incomingBio || isGeneric ? '' : incomingBio
  config.highlight_label = String(data.highlight_label || '').trim() || DEFAULT_HIGHLIGHT
  if (Array.isArray(data.links) && data.links.length) {
    config.links = data.links.filter((l: any) => l && l.label).map((l: any) => attachLogo({ label: String(l.label || ''), icon: String(l.icon || '🔗'), url: String(l.url || '#'), desc: String(l.desc || ''), enabled: l.enabled !== false }))
  } else config.links = DEFAULT_LINKS.map(attachLogo)
}
const { data: remoteConfig } = await useAsyncData('link-page-config', () => $fetch<any>('/api/config').catch(() => null))
if (remoteConfig.value) applyServerConfig(remoteConfig.value)
else config.links = DEFAULT_LINKS.map(attachLogo)
configReady.value = true
onMounted(async () => {
  const visitor_id = getOrCreateVisitorId()
  if (!alreadyViewedToday()) {
    markViewedToday()
    track('page_view', { offer_slug: 'wanessa_links' })
  }
  let restored: string | null = null
  try { restored = localStorage.getItem(GATE_KEY) } catch {}
  if (restored === 'pass' || restored === 'reject') gate.value = restored
  else if (restored === '1' || restored === '2' || restored === '3') gate.value = Number(restored) as 1 | 2 | 3
  else if (restored === '4') gate.value = 1 // legacy progress -> restart
  const fingerprint = await getDeviceFingerprint()
  if (gate.value !== 'pass' && gate.value !== 'reject') {
    try {
      const res = await $fetch<{ status: string | null }>('/api/quiz', { query: { visitor_id, fingerprint } })
      if (res?.status === 'pass' || res?.status === 'reject') {
        gate.value = res.status
        try { localStorage.setItem(GATE_KEY, res.status) } catch {}
      }
    } catch {}
  } else if (visitor_id && (gate.value === 'pass' || gate.value === 'reject')) {
    try {
      fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor_id, fingerprint, status: gate.value }), keepalive: true }).catch(() => {})
    } catch {}
  }
  if (gate.value == null) gate.value = 1
  gateReady.value = true
  if (gate.value === 1 || gate.value === 2 || gate.value === 3) {
    chatMessages.value = []
    typeThenAsk(questionText(gate.value as 1 | 2 | 3), 800)
  } else if (gate.value === 'reject') {
    chatMessages.value = []
    pushMsg('her', 'Obrigada. Você não é o tipo de pessoa que estou procurando.')
  }
  photoTimer = setInterval(() => { photoIndex.value = (photoIndex.value + 1) % gallery.length }, 4200)
})
onUnmounted(() => {
  if (photoTimer) clearInterval(photoTimer)
  if (typingTimer) clearTimeout(typingTimer)
})
function openLogin() { password.value = ''; loginError.value = ''; showLogin.value = true; nextTick(() => passInput.value?.focus()) }
function openEdit() {
  edit.name = config.name; edit.bio = config.bio; edit.highlight_label = config.highlight_label || DEFAULT_HIGHLIGHT
  edit.links = config.links.map((l) => ({ label: l.label, icon: l.icon, url: l.url, desc: l.desc || '', enabled: l.enabled !== false }))
  if (!edit.links.length) edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true })
}
function closeAdmin() { isAdmin.value = false; saveMsg.value = ''; saveError.value = '' }
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
    const payload = {
      name: edit.name || config.name || '', bio: edit.bio, avatar_url: '',
      highlight_label: (edit.highlight_label || '').trim() || DEFAULT_HIGHLIGHT,
      links: edit.links.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), icon: l.icon || '🔗', url: l.url || '#', desc: (l.desc || '').trim(), enabled: l.enabled !== false })),
    }
    await $fetch('/api/admin/update', { method: 'POST', body: payload })
    config.name = payload.name; config.bio = payload.bio; config.highlight_label = payload.highlight_label
    config.links = payload.links.map((l) => attachLogo(l))
    saveMsg.value = 'Salvo!'; setTimeout(() => { saveMsg.value = '' }, 2500)
  } catch (e: any) { saveError.value = e?.data?.statusMessage || 'Erro ao salvar' }
  finally { loading.value = false }
}
useHead({
  title: 'Wanessa',
  meta: [{ name: 'description', content: 'Acesso restrito — privacidade e alto nível.' }, { name: 'theme-color', content: '#12081a' }],
})
</script>
