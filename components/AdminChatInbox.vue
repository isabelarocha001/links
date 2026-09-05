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

const selectedId = ref<string | null>(null)
const messages = ref<ChatMsg[]>([])
const messagesLoading = ref(false)
const replyText = ref('')
const replySending = ref(false)
const presenceOk = ref(false)

let presenceTimer: ReturnType<typeof setInterval> | null = null
let listTimer: ReturnType<typeof setInterval> | null = null
let msgTimer: ReturnType<typeof setInterval> | null = null

const filteredConversations = computed(() => {
  let list = conversations.value
  if (filter.value === 'new') list = list.filter((c) => c.is_new)
  if (filter.value === 'open') list = list.filter((c) => c.status === 'open')
  return list
})

const selectedTitle = computed(() => {
  const c = conversations.value.find((x) => x.id === selectedId.value)
  return c?.title || (selectedId.value ? `Conversa ${selectedId.value.slice(0, 8)}` : '')
})

async function checkSession() {
  authChecking.value = true
  try {
    await $fetch('/api/admin/session')
    authed.value = true
  } catch {
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
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
  } catch {}
  authed.value = false
  conversations.value = []
  selectedId.value = null
  messages.value = []
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
  presenceTimer = setInterval(() => sendPresence(false), 15000)
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

async function openConversation(id: string) {
  selectedId.value = id
  messages.value = []
  await loadMessages()
  startMsgPoll()
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
  if (el) el.scrollTop = el.scrollHeight
}

async function sendReply() {
  const text = replyText.value.trim()
  if (!text || !selectedId.value || replySending.value) return
  replySending.value = true
  try {
    await $fetch(`/api/admin/conversation-reply`, {
      method: 'POST',
      body: { id: selectedId.value, message: text },
    })
    replyText.value = ''
    await loadMessages()
    await loadConversations()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Falha ao enviar')
  } finally {
    replySending.value = false
  }
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
  sendPresence(true)
  stopPolling()
})

// Fecha aba / navega fora → tenta marcar offline
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    try {
      navigator.sendBeacon(
        '/api/admin/presence',
        new Blob([JSON.stringify({ offline: true })], { type: 'application/json' }),
      )
    } catch {}
  })
}
</script>

<template>
  <div class="ac">
    <div v-if="authChecking" class="ac-center">Verificando sessão…</div>

    <div v-else-if="!authed" class="ac-login">
      <h1>Admin · Chat</h1>
      <p class="ac-hint">Somente autenticado. Sessão via cookie httpOnly.</p>
      <input
        v-model="password"
        type="password"
        class="ac-input"
        placeholder="Senha admin"
        @keydown.enter="doLogin"
      />
      <button type="button" class="ac-btn" :disabled="loginLoading" @click="doLogin">
        {{ loginLoading ? 'Entrando…' : 'Entrar' }}
      </button>
      <p v-if="loginError" class="ac-err">{{ loginError }}</p>
    </div>

    <template v-else>
      <header class="ac-top">
        <div>
          <h1>Conversas</h1>
          <p class="ac-sub">
            <span class="ac-dot" :class="{ on: presenceOk }"></span>
            {{ presenceOk ? 'Você está online (lead vê online)' : 'Presença: falhou (crie a tabela admin_presence)' }}
            · {{ newCount }} nova(s)
          </p>
        </div>
        <div class="ac-top-actions">
          <button type="button" class="ac-btn ghost" @click="loadConversations">Atualizar</button>
          <button type="button" class="ac-btn ghost" @click="doLogout">Sair</button>
        </div>
      </header>

      <div class="ac-filters">
        <button type="button" :class="{ active: filter === 'all' }" @click="filter = 'all'">Todas</button>
        <button type="button" :class="{ active: filter === 'new' }" @click="filter = 'new'">Novas</button>
        <button type="button" :class="{ active: filter === 'open' }" @click="filter = 'open'">Abertas</button>
      </div>

      <div class="ac-body">
        <aside class="ac-list">
          <p v-if="listLoading && !conversations.length" class="ac-muted">Carregando…</p>
          <p v-if="listError" class="ac-err">{{ listError }}</p>
          <button
            v-for="c in filteredConversations"
            :key="c.id"
            type="button"
            class="ac-item"
            :class="{ active: selectedId === c.id, new: c.is_new }"
            @click="openConversation(c.id)"
          >
            <div class="ac-item-top">
              <strong>{{ c.title || c.visitor_id?.slice(0, 8) }}</strong>
              <span v-if="c.is_new" class="ac-badge">nova</span>
            </div>
            <p class="ac-preview">
              {{ c.last_message?.direction === 'lead' ? 'Lead: ' : 'Você: ' }}
              {{ c.last_message?.message || '—' }}
            </p>
            <span class="ac-time">{{ formatTime(c.last_message_at || c.last_message?.created_at) }}</span>
          </button>
          <p v-if="!listLoading && !filteredConversations.length" class="ac-muted">Nenhuma conversa.</p>
        </aside>

        <section class="ac-thread">
          <div v-if="!selectedId" class="ac-center muted">Selecione uma conversa</div>
          <template v-else>
            <header class="ac-thread-head">
              <h2>{{ selectedTitle }}</h2>
              <span class="ac-muted">{{ selectedId.slice(0, 8) }}…</span>
            </header>
            <div id="admin-msg-list" class="ac-msgs">
              <div
                v-for="(m, i) in messages"
                :key="m.id || i"
                class="ac-bubble"
                :class="m.direction === 'lead' ? 'lead' : 'bot'"
              >
                <p>{{ m.message }}</p>
                <span>{{ formatTime(m.created_at) }} · {{ m.direction }}{{ m.step ? ` · ${m.step}` : '' }}</span>
              </div>
              <p v-if="messagesLoading && !messages.length" class="ac-muted">Carregando msgs…</p>
            </div>
            <form class="ac-composer" @submit.prevent="sendReply">
              <input
                v-model="replyText"
                class="ac-input"
                type="text"
                placeholder="Responder como Wanessa…"
                :disabled="replySending"
              />
              <button type="submit" class="ac-btn" :disabled="replySending || !replyText.trim()">
                Enviar
              </button>
            </form>
          </template>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ac {
  min-height: 100dvh;
  background: #0b141a;
  color: #e9edef;
  font-family: Inter, system-ui, sans-serif;
  display: flex;
  flex-direction: column;
}
.ac-center {
  margin: auto;
  padding: 48px;
  text-align: center;
  opacity: 0.8;
}
.ac-center.muted { opacity: 0.45; }
.ac-login {
  max-width: 360px;
  margin: 12vh auto;
  padding: 24px;
  background: #1f2c34;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-login h1 { margin: 0; font-size: 1.25rem; }
.ac-hint { margin: 0; font-size: 0.8rem; opacity: 0.65; }
.ac-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: #0b141a;
  color: #e9edef;
  font-size: 0.95rem;
}
.ac-btn {
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  background: #25d366;
  color: #053b1c;
  font-weight: 700;
  cursor: pointer;
}
.ac-btn:disabled { opacity: 0.5; cursor: wait; }
.ac-btn.ghost {
  background: transparent;
  color: #aebac1;
  border: 1px solid rgba(255,255,255,0.12);
}
.ac-err { color: #f87171; font-size: 0.85rem; margin: 0; }
.ac-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #1f2c34;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ac-top h1 { margin: 0; font-size: 1.1rem; }
.ac-sub { margin: 4px 0 0; font-size: 0.75rem; color: #8696a0; display: flex; align-items: center; gap: 6px; }
.ac-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #8696a0;
  display: inline-block;
}
.ac-dot.on { background: #25d366; box-shadow: 0 0 8px rgba(37,211,102,0.5); }
.ac-top-actions { display: flex; gap: 8px; }
.ac-filters {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  background: #111b21;
}
.ac-filters button {
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: #aebac1;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.8rem;
  cursor: pointer;
}
.ac-filters button.active {
  background: rgba(37,211,102,0.15);
  border-color: rgba(37,211,102,0.4);
  color: #e9edef;
}
.ac-body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(260px, 340px) 1fr;
  min-height: 0;
  height: calc(100dvh - 110px);
}
.ac-list {
  overflow-y: auto;
  border-right: 1px solid rgba(255,255,255,0.06);
  background: #111b21;
}
.ac-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  background: transparent;
  color: inherit;
  padding: 12px 14px;
  cursor: pointer;
}
.ac-item:hover { background: rgba(255,255,255,0.03); }
.ac-item.active { background: #1f2c34; }
.ac-item.new { box-shadow: inset 3px 0 0 #25d366; }
.ac-item-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.ac-badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #25d366;
  color: #053b1c;
  border-radius: 999px;
  padding: 2px 7px;
  font-weight: 700;
}
.ac-preview {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #8696a0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ac-time { font-size: 0.68rem; color: #667781; }
.ac-muted { color: #667781; font-size: 0.85rem; padding: 16px; }
.ac-thread {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #0b141a;
}
.ac-thread-head {
  padding: 12px 16px;
  background: #1f2c34;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ac-thread-head h2 { margin: 0; font-size: 1rem; }
.ac-msgs {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ac-bubble {
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.92rem;
  line-height: 1.35;
}
.ac-bubble p { margin: 0; white-space: pre-wrap; word-break: break-word; }
.ac-bubble span { display: block; margin-top: 4px; font-size: 0.65rem; opacity: 0.55; }
.ac-bubble.lead {
  align-self: flex-start;
  background: #202c33;
  border-top-left-radius: 2px;
}
.ac-bubble.bot {
  align-self: flex-end;
  background: #005c4b;
  border-top-right-radius: 2px;
}
.ac-composer {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: #1f2c34;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.ac-composer .ac-input { flex: 1; }
@media (max-width: 720px) {
  .ac-body { grid-template-columns: 1fr; height: auto; }
  .ac-list { max-height: 40vh; }
  .ac-thread { min-height: 55vh; }
}
</style>
