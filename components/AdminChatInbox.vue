<script setup lang="ts">
/**
 * Inbox admin — só com sessão autenticada (cookie admin_token).
 * Heartbeat de presença a cada 15s → lead vê "online" / "visto por último às HH:MM".
 */
type ConvItem = {
  id: string
  visitor_id?: string
  title?: string
  status?: string
  last_message_at?: string
  is_new?: boolean
  last_message?: { direction: string; message: string; created_at: string } | null
  lead_blocked?: boolean
  block_reason?: string
}

type ChatMsg = {
  id?: string
  direction: string
  message: string
  step?: string
  created_at?: string
}

const authed = ref(false)
const authChecking = ref(true)
const password = ref('')
const loginError = ref('')
const loginLoading = ref(false)

const conversations = ref<ConvItem[]>([])
const newCount = ref(0)
const listLoading = ref(false)
const listError = ref('')
const filter = ref<'all' | 'new' | 'open'>('all')
const searchQuery = ref('')

const selectedId = ref<string | null>(null)
const messages = ref<ChatMsg[]>([])
const messagesLoading = ref(false)
const replyText = ref('')
const replySending = ref(false)
const presenceOk = ref(false)
const leadPresenceOnline = ref(false)
const leadPresenceLabel = ref('offline')
const leadPresenceActivity = ref('idle')
const leadLastReadId = ref<string | null>(null)
let leadPresenceTimer: ReturnType<typeof setInterval> | null = null

let presenceTimer: ReturnType<typeof setInterval> | null = null
let listTimer: ReturnType<typeof setInterval> | null = null
let msgTimer: ReturnType<typeof setInterval> | null = null

const filteredConversations = computed(() => {
  let list = conversations.value
  if (filter.value === 'new') list = list.filter((c) => c.is_new)
  if (filter.value === 'open') list = list.filter((c) => c.status === 'open')
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((c) => {
      const title = String(c.title || '').toLowerCase()
      const vid = String(c.visitor_id || '').toLowerCase()
      const last = String(c.last_message?.message || '').toLowerCase()
      return title.includes(q) || vid.includes(q) || last.includes(q)
    })
  }
  return list
})

const selectedTitle = computed(() => {
  const c = conversations.value.find((x) => x.id === selectedId.value)
  return c?.title || (selectedId.value ? `Conversa ${selectedId.value.slice(0, 8)}` : '')
})
const selectedIsBlocked = computed(() => {
  const c = conversations.value.find((x) => x.id === selectedId.value)
  return !!(c?.lead_blocked || c?.status === 'blocked')
})
const selectedBlockReason = computed(() => {
  const c = conversations.value.find((x) => x.id === selectedId.value)
  return String(c?.block_reason || '')
})

async function checkSession() {
  authChecking.value = true
  try {
    await $fetch('/api/admin/session')
    authed.value = true
  } catch {
    // Sem sessão: mostra formulário de login nesta rota
    authed.value = false
  } finally {
    authChecking.value = false
  }
}

async function doLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { password: password.value },
    })
    password.value = ''
    authed.value = true
    await afterAuth()
  } catch (e: any) {
    loginError.value = e?.data?.statusMessage || e?.statusMessage || 'Senha inválida'
    authed.value = false
  } finally {
    loginLoading.value = false
  }
}

async function doLogout() {
  stopPresence()
  stopPolling()
  // Offline ANTES de invalidar o cookie (logout no server também zera presença)
  try {
    await $fetch('/api/admin/presence', { method: 'POST', body: { offline: true } })
  } catch {}
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
  } catch {}
  presenceOk.value = false
  authed.value = false
  conversations.value = []
  selectedId.value = null
  messages.value = []
  if (import.meta.client) {
    // permanece em /admin/chat com formulário de login
  }
}

async function sendPresence(offline = false) {
  try {
    const res = await $fetch<{ ok?: boolean }>('/api/admin/presence', {
      method: 'POST',
      body: { offline },
    })
    presenceOk.value = !!res?.ok
  } catch {
    presenceOk.value = false
  }
}

function startPresence() {
  stopPresence()
  sendPresence(false)
  presenceTimer = setInterval(() => sendPresence(false), 1000)
}

function stopPresence() {
  if (presenceTimer) {
    clearInterval(presenceTimer)
    presenceTimer = null
  }
}

async function loadConversations() {
  listLoading.value = true
  listError.value = ''
  try {
    const res = await $fetch<{
      ok?: boolean
      conversations?: ConvItem[]
      new_count?: number
    }>('/api/admin/conversations', { query: { limit: 80 } })
    conversations.value = res?.conversations || []
    newCount.value = res?.new_count || 0
  } catch (e: any) {
    if (e?.statusCode === 401) {
      authed.value = false
      return
    }
    listError.value = e?.data?.statusMessage || e?.message || 'Erro ao carregar conversas'
  } finally {
    listLoading.value = false
  }
}


async function pullLeadPresence() {
  if (!selectedId.value) {
    leadPresenceOnline.value = false
    leadPresenceLabel.value = 'offline'
    leadPresenceActivity.value = 'idle'
    return
  }
  try {
    const conv = conversations.value.find((c) => c.id === selectedId.value)
    const res = await $fetch<{
      online?: boolean
      label?: string
      activity?: string
      last_read_message_id?: string | null
    }>('/api/admin/lead-presence', {
      query: {
        conversation_id: selectedId.value,
        ...(conv?.visitor_id ? { visitor_id: conv.visitor_id } : {}),
      },
    })
    leadPresenceOnline.value = !!res?.online
    leadPresenceLabel.value = res?.label || (res?.online ? 'online' : 'offline')
    leadPresenceActivity.value = res?.activity || 'idle'
    leadLastReadId.value = res?.last_read_message_id || null
  } catch {
    // keep last
  }
}

function startLeadPresencePoll() {
  stopLeadPresencePoll()
  pullLeadPresence()
  leadPresenceTimer = setInterval(() => pullLeadPresence(), 2000)
}

function stopLeadPresencePoll() {
  if (leadPresenceTimer) {
    clearInterval(leadPresenceTimer)
    leadPresenceTimer = null
  }
}

async function openConversation(id: string) {
  selectedId.value = id
  messages.value = []
  await loadMessages()
  startMsgPoll()
  startLeadPresencePoll()
}

async function loadMessages() {
  if (!selectedId.value) return
  messagesLoading.value = true
  try {
    const res = await $fetch<{
      messages?: ChatMsg[]
      conversation?: { title?: string }
    }>(`/api/admin/conversation-messages?id=${selectedId.value}`)
    messages.value = res?.messages || []
    await nextTick()
    scrollMsgs()
  } catch (e: any) {
    if (e?.statusCode === 401) authed.value = false
  } finally {
    messagesLoading.value = false
  }
}

function startMsgPoll() {
  stopMsgPoll()
  msgTimer = setInterval(() => {
    if (selectedId.value) loadMessages()
  }, 4000)
}

function stopMsgPoll() {
  if (msgTimer) {
    clearInterval(msgTimer)
    msgTimer = null
  }
}

function stopPolling() {
  stopMsgPoll()
  if (listTimer) {
    clearInterval(listTimer)
    listTimer = null
  }
}

function scrollMsgs() {
  const el = document.getElementById('admin-msg-list')
  if (!el) return
  el.scrollTop = el.scrollHeight
  // reforço (layout mobile / teclado)
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight
  })
  setTimeout(() => {
    el.scrollTop = el.scrollHeight
  }, 50)
}

const replyError = ref('')


const showAdminPoll = ref(false)
const adminPollQ = ref('')
const adminPollOpts = ref(['', ''])
const adminPollErr = ref('')
const adminMediaInput = ref<HTMLInputElement | null>(null)
const adminMediaKind = ref<'photo' | 'video' | 'audio' | null>(null)
const actionBusy = ref(false)

function labelAdminMessage(raw: string): string {
  const t = String(raw || '')
  if (!t.startsWith('⟦ADMIN⟧')) return t
  try {
    const p = JSON.parse(t.slice('⟦ADMIN⟧'.length))
    if (p.k === 'call') return '📞 Convite de videochamada'
    if (p.k === 'photo') return '📷 Foto'
    if (p.k === 'video') return '🎬 Vídeo'
    if (p.k === 'audio') return '🎤 Áudio'
    if (p.k === 'poll') return '📊 Enquete: ' + (p.q || '')
  } catch {}
  return t
}

async function sendAdminAction(body: Record<string, any>) {
  if (!selectedId.value || actionBusy.value) return
  actionBusy.value = true
  replyError.value = ''
  try {
    await $fetch('/api/admin/conversation-reply', {
      method: 'POST',
      body: { id: selectedId.value, ...body },
    })
    await loadMessages()
    await loadConversations()
    await nextTick()
    scrollMsgs()
  } catch (e: any) {
    replyError.value = e?.data?.statusMessage || e?.message || 'Falha ao enviar'
  } finally {
    actionBusy.value = false
  }
}

function inviteCall() {
  sendAdminAction({ kind: 'call', message: 'call' })
}

function pickMedia(kind: 'photo' | 'video' | 'audio') {
  adminMediaKind.value = kind
  nextTick(() => adminMediaInput.value?.click())
}

function onAdminMediaPicked(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const kind = adminMediaKind.value
  adminMediaKind.value = null
  if (!file || !kind) return
  const max = kind === 'photo' ? 3.5 * 1024 * 1024 : 8 * 1024 * 1024
  if (file.size > max) {
    replyError.value = `Arquivo grande demais (máx. ${kind === 'photo' ? '3,5' : '8'} MB). Comprime ou manda link.`
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const url = String(reader.result || '')
    if (!url) return
    sendAdminAction({ kind, url, message: kind })
  }
  reader.onerror = () => {
    replyError.value = 'Não deu pra ler o arquivo'
  }
  reader.readAsDataURL(file)
}

function openAdminPoll() {
  adminPollQ.value = ''
  adminPollOpts.value = ['', '']
  adminPollErr.value = ''
  showAdminPoll.value = true
}

function addAdminPollOpt() {
  if (adminPollOpts.value.length >= 5) return
  adminPollOpts.value.push('')
}

function submitAdminPoll() {
  const q = adminPollQ.value.trim()
  const opts = adminPollOpts.value.map((o) => o.trim()).filter(Boolean)
  if (q.length < 2) {
    adminPollErr.value = 'Escreva a pergunta'
    return
  }
  if (opts.length < 2) {
    adminPollErr.value = 'Mínimo 2 opções'
    return
  }
  showAdminPoll.value = false
  sendAdminAction({ kind: 'poll', poll_question: q, poll_options: opts, message: 'poll' })
}


async function sendReply() {
  const text = replyText.value.trim()
  if (!text || !selectedId.value || replySending.value) return
  if (selectedIsBlocked.value) {
    replyError.value = 'Lead bloqueou o contato — não dá pra responder por aqui.'
    return
  }
  replyError.value = ''
  replySending.value = true
  const pending = text
  replyText.value = ''
  // otimista: mostra na hora e desce o scroll
  const optimistic: ChatMsg = {
    id: 'local-' + Date.now(),
    direction: 'bot',
    message: pending,
    step: 'live_admin',
    created_at: new Date().toISOString(),
  }
  messages.value = [...messages.value, optimistic]
  await nextTick()
  scrollMsgs()
  try {
    await $fetch('/api/admin/conversation-reply', {
      method: 'POST',
      body: { id: selectedId.value, message: pending },
    })
    await loadMessages()
    await loadConversations()
    await nextTick()
    scrollMsgs()
  } catch (e: any) {
    // remove otimista se falhou
    messages.value = messages.value.filter((m) => m.id !== optimistic.id)
    replyText.value = pending
    replyError.value =
      e?.data?.statusMessage || e?.statusMessage || e?.message || 'Falha ao enviar'
  } finally {
    replySending.value = false
    await nextTick()
    scrollMsgs()
  }
}

function isMsgReadByLead(m: ChatMsg) {
  if (!leadLastReadId.value || !m?.id) return false
  // se last_read é o id, ok; senão compara created_at se disponível nas msgs
  if (String(m.id) === String(leadLastReadId.value)) return true
  const readMsg = messages.value.find((x) => String(x.id) === String(leadLastReadId.value))
  if (!readMsg?.created_at || !m.created_at) return false
  return new Date(m.created_at).getTime() <= new Date(readMsg.created_at).getTime() && m.direction !== 'lead'
}

function formatTime(iso?: string) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

async function afterAuth() {
  startPresence()
  await loadConversations()
  listTimer = setInterval(() => loadConversations(), 12000)
}

onMounted(async () => {
  await checkSession()
  if (authed.value) await afterAuth()
})

onBeforeUnmount(() => {
  stopPresence()
  stopPolling()
  // Prefer fetch com cookie (beacon às vezes não manda credenciais)
  try {
    $fetch('/api/admin/presence', { method: 'POST', body: { offline: true } }).catch(() => {})
  } catch {}
})

if (typeof window !== 'undefined') {
  const markOffline = () => {
    try {
      // keepalive mantém cookie da sessão na requisição
      fetch('/api/admin/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offline: true }),
        credentials: 'same-origin',
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }
  window.addEventListener('pagehide', markOffline)
  window.addEventListener('beforeunload', markOffline)
}
</script>

<template>
  <div class="ac">
    <div v-if="authChecking" class="ac-shell ac-shell--center">
      <p class="ac-muted">Verificando sessão…</p>
    </div>

    <div v-else-if="!authed" class="ac-shell ac-shell--center">
      <form class="ac-login-card" @submit.prevent="doLogin">
        <div class="ac-brand">Conversas</div>
        <p class="ac-hint">Acesso admin · esta URL não aparece na home</p>
        <input
          v-model="password"
          class="ac-search"
          type="password"
          autocomplete="current-password"
          placeholder="Senha"
        />
        <p v-if="loginError" class="ac-err">{{ loginError }}</p>
        <button type="submit" class="ac-btn-primary" :disabled="loginLoading || !password.trim()">
          {{ loginLoading ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>

    <div v-else class="ac-shell">
      <!-- Top bar estilo FatalFans -->
      <header class="ac-header">
        <div class="ac-brand-row">
          <span class="ac-logo-mark" aria-hidden="true">✦</span>
          <span class="ac-brand">Conversas</span>
        </div>
        <div class="ac-header-actions">
          <span class="ac-presence-pill" :class="{ on: presenceOk }">
            <span class="ac-presence-dot"></span>
            {{ presenceOk ? 'Online' : 'Offline' }}
          </span>
          <button type="button" class="ac-link-btn" @click="loadConversations">Atualizar</button>
          <button type="button" class="ac-link-btn" @click="doLogout">Sair</button>
        </div>
      </header>

      <div class="ac-main" :class="{ 'ac-main--thread': !!selectedId }">
        <!-- Lista (mobile: some quando thread aberta) -->
        <section class="ac-inbox">
          <div class="ac-inbox-inner">
            <div class="ac-search-wrap">
              <span class="ac-search-ico" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
              </span>
              <input
                v-model="searchQuery"
                class="ac-search"
                type="search"
                placeholder="Pesquisar por nome"
                autocomplete="off"
              />
            </div>

            <div class="ac-tabs">
              <button type="button" class="ac-tab" :class="{ active: filter === 'all' }" @click="filter = 'all'">Todas</button>
              <button type="button" class="ac-tab" :class="{ active: filter === 'new' }" @click="filter = 'new'">
                Não lidas
                <span v-if="newCount" class="ac-tab-count">{{ newCount }}</span>
              </button>
              <button type="button" class="ac-tab" :class="{ active: filter === 'open' }" @click="filter = 'open'">Abertas</button>
            </div>

            <div class="ac-list">
              <p v-if="listLoading && !conversations.length" class="ac-muted pad">Carregando…</p>
              <p v-if="listError" class="ac-err pad">{{ listError }}</p>

              <button
                v-for="c in filteredConversations"
                :key="c.id"
                type="button"
                class="ac-item"
                :class="{ active: selectedId === c.id, new: c.is_new }"
                @click="openConversation(c.id)"
              >
                <div class="ac-avatar" aria-hidden="true">
                  {{ (c.title || c.visitor_id || '?').slice(0, 1).toUpperCase() }}
                </div>
                <div class="ac-item-body">
                  <div class="ac-item-top">
                    <strong>{{ c.title || ('Lead ' + (c.visitor_id || '').slice(0, 8)) }}</strong>
                    <span class="ac-time">{{ formatTime(c.last_message_at || c.last_message?.created_at) }}</span>
                  </div>
                  <p class="ac-preview" :class="{ 'ac-preview--blocked': c.lead_blocked || c.status === 'blocked' }">
                    <template v-if="c.lead_blocked || c.status === 'blocked'">🚫 Bloqueou o contato</template>
                    <template v-else>
                      {{ c.last_message?.direction === 'lead' ? '' : 'Você: ' }}{{ c.last_message?.message || '—' }}
                    </template>
                  </p>
                </div>
                <span v-if="c.is_new" class="ac-unread-dot" aria-label="nova"></span>
              </button>

              <!-- Empty state estilo FatalFans -->
              <div v-if="!listLoading && !filteredConversations.length" class="ac-empty">
                <div class="ac-empty-ico" aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
                    <circle cx="12" cy="11" r="1.2" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
                <h2>Nenhuma conversa ainda</h2>
                <p>Quando um lead falar no chat da home, a conversa aparece aqui.</p>
                <button type="button" class="ac-btn-primary" @click="loadConversations">Atualizar lista</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Thread -->
        <section class="ac-thread" v-if="selectedId">
          <header class="ac-thread-head">
            <button type="button" class="ac-back" aria-label="Voltar" @click="selectedId = null; stopPolling(); stopLeadPresencePoll()">‹</button>
            <div class="ac-thread-who">
              <div class="ac-avatar ac-avatar--sm">{{ selectedTitle.slice(0, 1).toUpperCase() }}</div>
              <div>
                <h2>{{ selectedTitle }}</h2>
                <p class="ac-status-line" :class="{ on: leadPresenceOnline, act: leadPresenceActivity !== 'idle' }">
                  <span class="ac-status-dot"></span>
                  {{ leadPresenceLabel }}
                </p>
                <p class="ac-muted tight">{{ selectedId.slice(0, 10) }}…</p>
              </div>
            </div>
          </header>

          <div v-if="selectedIsBlocked" class="ac-blocked-banner">
            Lead bloqueou o contato
            <span v-if="selectedBlockReason">· {{ selectedBlockReason }}</span>
          </div>

          <div id="admin-msg-list" class="ac-msgs">
            <p v-if="messagesLoading && !messages.length" class="ac-muted pad">Carregando msgs…</p>
            <div
              v-for="(m, i) in messages"
              :key="m.id || i"
              class="ac-bubble"
              :class="m.direction === 'lead' ? 'lead' : 'bot'"
            >
              <p>{{ labelAdminMessage(m.message) }}</p>
              <span>
                {{ formatTime(m.created_at) }}
                <template v-if="m.direction !== 'lead' && isMsgReadByLead(m)"> · visualizado</template>
              </span>
            </div>
          </div>

          <input
            ref="adminMediaInput"
            type="file"
            class="ac-file-hidden"
            accept="image/*,video/*,audio/*"
            @change="onAdminMediaPicked"
          />

          <div v-if="showAdminPoll" class="ac-poll-modal" @click.self="showAdminPoll = false">
            <div class="ac-poll-card" @click.stop>
              <h3>Criar enquete</h3>
              <input v-model="adminPollQ" class="ac-composer-input" type="text" placeholder="Pergunta" maxlength="120" />
              <input
                v-for="(opt, i) in adminPollOpts"
                :key="i"
                v-model="adminPollOpts[i]"
                class="ac-composer-input"
                type="text"
                :placeholder="'Opção ' + (i + 1)"
                maxlength="80"
              />
              <button v-if="adminPollOpts.length < 5" type="button" class="ac-link-btn" @click="addAdminPollOpt">+ opção</button>
              <p v-if="adminPollErr" class="ac-err">{{ adminPollErr }}</p>
              <div class="ac-poll-actions">
                <button type="button" class="ac-link-btn" @click="showAdminPoll = false">Cancelar</button>
                <button type="button" class="ac-btn-primary" @click="submitAdminPoll">Enviar enquete</button>
              </div>
            </div>
          </div>

          <div class="ac-actions" v-if="!selectedIsBlocked">
            <button type="button" class="ac-action" title="Videochamada" :disabled="actionBusy" @click="inviteCall">📞</button>
            <button type="button" class="ac-action" title="Foto" :disabled="actionBusy" @click="pickMedia('photo')">📷</button>
            <button type="button" class="ac-action" title="Vídeo" :disabled="actionBusy" @click="pickMedia('video')">🎬</button>
            <button type="button" class="ac-action" title="Áudio" :disabled="actionBusy" @click="pickMedia('audio')">🎤</button>
            <button type="button" class="ac-action" title="Enquete" :disabled="actionBusy" @click="openAdminPoll">📊</button>
          </div>

          <p v-if="replyError" class="ac-reply-err">{{ replyError }}</p>
          <form class="ac-composer" @submit.prevent="sendReply">
            <input
              v-model="replyText"
              class="ac-composer-input"
              type="text"
              placeholder="Responder como Wanessa…"
              :disabled="replySending || selectedIsBlocked"
              @keydown.enter.prevent="sendReply"
            />
            <button
              type="button"
              class="ac-send"
              :disabled="replySending || !replyText.trim() || selectedIsBlocked"
              aria-label="Enviar"
              @click.prevent="sendReply"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </form>
        </section>

        <section v-else class="ac-thread ac-thread--placeholder">
          <div class="ac-empty">
            <div class="ac-empty-ico" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
              </svg>
            </div>
            <h2>Selecione uma conversa</h2>
            <p>Escolha um lead à esquerda para ver o histórico e responder.</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ac {
  min-height: 100dvh;
  background: #0b141a;
  color: #e9edef;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
.ac-shell {
  min-height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #0b141a;
  overflow: hidden;
}
.ac-shell--center {
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #0b141a;
  max-height: none;
  overflow: auto;
}
.ac-login-card {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px 24px;
  border-radius: 16px;
  background: #1f2c34;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
}
.ac-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: #1f2c34;
  flex-shrink: 0;
  z-index: 5;
}
.ac-brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ac-logo-mark { color: #25d366; font-size: 1.1rem; }
.ac-brand {
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  color: #e9edef;
}
.ac-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ac-link-btn {
  border: none;
  background: transparent;
  color: #aebac1;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 8px;
}
.ac-presence-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #8696a0;
  background: rgba(255,255,255,0.06);
  padding: 4px 10px;
  border-radius: 999px;
}
.ac-presence-pill.on { color: #25d366; background: rgba(37,211,102,0.12); }
.ac-presence-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #667781;
}
.ac-presence-pill.on .ac-presence-dot {
  background: #25d366;
  box-shadow: 0 0 0 3px rgba(37,211,102,0.25);
}

.ac-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
  overflow: hidden;
}
@media (min-width: 860px) {
  .ac-main {
    grid-template-columns: minmax(300px, 380px) 1fr;
  }
  .ac-thread--placeholder { display: flex !important; }
}

.ac-inbox {
  border-right: 1px solid rgba(255,255,255,0.06);
  background: #111b21;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ac-inbox-inner {
  padding: 12px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.ac-search-wrap { position: relative; flex-shrink: 0; }
.ac-search-ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #8696a0;
  display: flex;
}
.ac-search {
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: #2a3942;
  border-radius: 999px;
  padding: 12px 16px 12px 42px;
  font-size: 0.92rem;
  color: #e9edef;
  outline: none;
}
.ac-search::placeholder { color: #8696a0; }
.ac-search:focus { background: #334651; }

.ac-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.ac-tab {
  border: none;
  background: #2a3942;
  color: #aebac1;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ac-tab.active {
  background: #25d366;
  color: #053b1c;
}
.ac-tab-count {
  background: rgba(0,0,0,0.2);
  border-radius: 999px;
  padding: 1px 6px;
  font-size: 0.72rem;
}

.ac-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.ac-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 12px 10px;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  color: inherit;
}
.ac-item:hover { background: rgba(255,255,255,0.04); }
.ac-item.active { background: #2a3942; }
.ac-item.new { box-shadow: inset 3px 0 0 #25d366; }
.ac-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00a884, #25d366);
  color: #053b1c;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1rem;
}
.ac-avatar--sm { width: 36px; height: 36px; font-size: 0.85rem; }
.ac-item-body { flex: 1; min-width: 0; }
.ac-item-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}
.ac-item-top strong {
  font-size: 0.95rem;
  color: #e9edef;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ac-time { font-size: 0.72rem; color: #8696a0; flex-shrink: 0; }
.ac-preview {
  margin: 3px 0 0;
  font-size: 0.82rem;
  color: #8696a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ac-preview--blocked { color: #f87171; font-weight: 600; }
.ac-unread-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #25d366;
  flex-shrink: 0;
}

.ac-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 20px;
  gap: 8px;
  color: #8696a0;
}
.ac-empty-ico { color: #667781; margin-bottom: 8px; }
.ac-empty h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #e9edef;
  font-weight: 700;
}
.ac-empty p {
  margin: 0 0 12px;
  font-size: 0.9rem;
  max-width: 280px;
  line-height: 1.45;
  color: #8696a0;
}
.ac-btn-primary {
  border: none;
  background: #25d366;
  color: #053b1c;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 12px 22px;
  border-radius: 999px;
  cursor: pointer;
}
.ac-btn-primary:disabled { opacity: 0.55; cursor: wait; }

.ac-thread {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #0b141a;
  overflow: hidden;
}
.ac-thread--placeholder {
  display: none;
  align-items: center;
  justify-content: center;
}
.ac-thread-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #1f2c34;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.ac-back {
  border: none;
  background: transparent;
  font-size: 1.6rem;
  line-height: 1;
  color: #e9edef;
  cursor: pointer;
  padding: 4px 8px;
}
.ac-thread-who {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ac-thread-who h2 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #e9edef;
}
.ac-muted { color: #8696a0; font-size: 0.8rem; }
.ac-muted.tight { margin: 0; }
.ac-muted.pad { padding: 16px; }
.ac-err { color: #f87171; font-size: 0.85rem; margin: 0; }
.ac-err.pad { padding: 12px 16px; }
.ac-hint { margin: 0; font-size: 0.82rem; color: #8696a0; }
.ac-reply-err {
  margin: 0;
  padding: 8px 14px;
  background: rgba(248,113,113,0.12);
  color: #f87171;
  font-size: 0.8rem;
  text-align: center;
  flex-shrink: 0;
}

.ac-blocked-banner {
  background: rgba(248,113,113,0.12);
  color: #f87171;
  font-size: 0.8rem;
  padding: 8px 14px;
  text-align: center;
  flex-shrink: 0;
}

.ac-msgs {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
}
.ac-bubble {
  max-width: 78%;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.35;
}
.ac-bubble p { margin: 0; white-space: pre-wrap; word-break: break-word; }
.ac-bubble span {
  display: block;
  margin-top: 4px;
  font-size: 0.68rem;
  opacity: 0.7;
}
.ac-bubble.lead {
  align-self: flex-start;
  background: #202c33;
  color: #e9edef;
  border-bottom-left-radius: 4px;
}
.ac-bubble.bot {
  align-self: flex-end;
  background: #005c4b;
  color: #e9edef;
  border-bottom-right-radius: 4px;
}

.ac-composer {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #1f2c34;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}
.ac-composer-input {
  flex: 1;
  border: none;
  background: #2a3942;
  border-radius: 999px;
  padding: 12px 16px;
  font-size: 0.92rem;
  color: #e9edef;
  outline: none;
  min-width: 0;
}
.ac-composer-input::placeholder { color: #8696a0; }
.ac-send {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: #25d366;
  color: #053b1c;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  pointer-events: auto;
}
.ac-send:disabled { opacity: 0.4; cursor: not-allowed; }
.ac-send:not(:disabled):active { transform: scale(0.95); }

@media (max-width: 859px) {
  .ac-main--thread .ac-inbox { display: none; }
  .ac-main:not(.ac-main--thread) .ac-thread { display: none; }
  .ac-main--thread .ac-thread { display: flex; }
  .ac-shell { max-height: 100dvh; }
}

.ac-file-hidden { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }
.ac-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px 0;
  flex-shrink: 0;
  background: #1f2c34;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.ac-action {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: #2a3942;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ac-action:disabled { opacity: 0.45; cursor: wait; }
.ac-action:not(:disabled):active { transform: scale(0.95); background: #334651; }
.ac-poll-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.ac-poll-card {
  width: 100%;
  max-width: 380px;
  background: #1f2c34;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid rgba(255,255,255,0.08);
}
.ac-poll-card h3 { margin: 0; font-size: 1rem; color: #e9edef; }
.ac-poll-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
}

</style>
