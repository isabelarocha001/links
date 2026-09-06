<script setup lang="ts">
/**
 * /moderador — gerencia vídeos que rodam na videochamada.
 * Mesmo login do admin.
 */
useHead({ title: 'Moderador · Vídeos da chamada' })

type CallVideo = {
  id: string
  url: string
  title?: string | null
  sort_order: number
  is_active: boolean
  created_at?: string
}

const password = ref('')
const loginError = ref('')
const loading = ref(false)
const authed = ref(false)
const videos = ref<CallVideo[]>([])
const newUrl = ref('')
const newTitle = ref('')
const msg = ref('')
const err = ref('')

async function checkSession() {
  try {
    await $fetch('/api/admin/session')
    authed.value = true
    await load()
  } catch {
    authed.value = false
  }
}

async function doLogin() {
  loginError.value = ''
  loading.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    password.value = ''
    authed.value = true
    await load()
  } catch (e: any) {
    loginError.value = e?.data?.statusMessage || 'Senha inválida'
  } finally {
    loading.value = false
  }
}

async function doLogout() {
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
  } catch {}
  authed.value = false
  videos.value = []
}

async function load() {
  err.value = ''
  try {
    const res = await $fetch<{ videos?: CallVideo[] }>('/api/call-videos', {
      method: 'POST',
      body: { action: 'list' },
    })
    videos.value = res?.videos || []
  } catch (e: any) {
    err.value = e?.data?.statusMessage || 'Erro ao carregar'
  }
}

async function addVideo() {
  msg.value = ''
  err.value = ''
  const url = newUrl.value.trim()
  if (!url) {
    err.value = 'Cole a URL do vídeo'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/call-videos', {
      method: 'POST',
      body: { action: 'add', url, title: newTitle.value.trim() || null },
    })
    newUrl.value = ''
    newTitle.value = ''
    msg.value = 'Vídeo adicionado'
    await load()
  } catch (e: any) {
    err.value = e?.data?.statusMessage || 'Erro ao adicionar'
  } finally {
    loading.value = false
  }
}

async function toggleActive(v: CallVideo) {
  try {
    await $fetch('/api/call-videos', {
      method: 'POST',
      body: { action: 'update', id: v.id, is_active: !v.is_active },
    })
    await load()
  } catch (e: any) {
    err.value = e?.data?.statusMessage || 'Erro'
  }
}

async function removeVideo(v: CallVideo) {
  if (!confirm('Remover este vídeo da chamada?')) return
  try {
    await $fetch('/api/call-videos', { method: 'POST', body: { action: 'delete', id: v.id } })
    await load()
  } catch (e: any) {
    err.value = e?.data?.statusMessage || 'Erro ao remover'
  }
}

async function move(v: CallVideo, dir: -1 | 1) {
  const idx = videos.value.findIndex((x) => x.id === v.id)
  if (idx < 0) return
  const j = idx + dir
  if (j < 0 || j >= videos.value.length) return
  const ids = videos.value.map((x) => x.id)
  const tmp = ids[idx]
  ids[idx] = ids[j]
  ids[j] = tmp
  try {
    await $fetch('/api/call-videos', { method: 'POST', body: { action: 'reorder', ids } })
    await load()
  } catch (e: any) {
    err.value = e?.data?.statusMessage || 'Erro ao reordenar'
  }
}

onMounted(() => {
  checkSession()
})
</script>

<template>
  <div class="mod">
    <header class="mod-head">
      <div>
        <p class="mod-kicker">Wanessa · painel</p>
        <h1>Moderador</h1>
        <p class="mod-sub">Vídeos que rodam na videochamada com o lead</p>
      </div>
      <button v-if="authed" type="button" class="mod-btn ghost" @click="doLogout">Sair</button>
    </header>

    <section v-if="!authed" class="mod-card mod-login">
      <h2>Entrar</h2>
      <p>Mesma senha do admin</p>
      <form @submit.prevent="doLogin">
        <input v-model="password" type="password" placeholder="Senha" autocomplete="current-password" />
        <button type="submit" class="mod-btn" :disabled="loading">{{ loading ? '…' : 'Entrar' }}</button>
      </form>
      <p v-if="loginError" class="mod-err">{{ loginError }}</p>
    </section>

    <template v-else>
      <section class="mod-card">
        <h2>Adicionar vídeo</h2>
        <p class="mod-hint">Cole um link direto (.mp4, .webm) ou URL pública do vídeo</p>
        <input v-model="newTitle" type="text" placeholder="Título (opcional)" />
        <input v-model="newUrl" type="url" placeholder="https://…/video.mp4" />
        <button type="button" class="mod-btn" :disabled="loading" @click="addVideo">Adicionar</button>
        <p v-if="msg" class="mod-ok">{{ msg }}</p>
        <p v-if="err" class="mod-err">{{ err }}</p>
      </section>

      <section class="mod-card">
        <div class="mod-list-head">
          <h2>Playlist da chamada</h2>
          <button type="button" class="mod-btn ghost" @click="load">Atualizar</button>
        </div>
        <p v-if="!videos.length" class="mod-empty">Nenhum vídeo ainda. Adiciona o primeiro acima.</p>
        <ul v-else class="mod-list">
          <li v-for="v in videos" :key="v.id" :class="{ off: !v.is_active }">
            <div class="mod-preview">
              <video v-if="v.url" :src="v.url" muted preload="metadata" playsinline />
            </div>
            <div class="mod-meta">
              <strong>{{ v.title || 'Sem título' }}</strong>
              <a :href="v.url" target="_blank" rel="noopener">{{ v.url }}</a>
              <span class="mod-badge" :class="{ on: v.is_active }">{{ v.is_active ? 'Ativo' : 'Pausado' }}</span>
            </div>
            <div class="mod-actions">
              <button type="button" title="Subir" @click="move(v, -1)">↑</button>
              <button type="button" title="Descer" @click="move(v, 1)">↓</button>
              <button type="button" @click="toggleActive(v)">{{ v.is_active ? 'Pausar' : 'Ativar' }}</button>
              <button type="button" class="danger" @click="removeVideo(v)">Apagar</button>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.mod {
  min-height: 100dvh;
  background: #0a0a0c;
  color: #f3f0f7;
  padding: 24px 16px 48px;
  font-family: Inter, system-ui, sans-serif;
  max-width: 720px;
  margin: 0 auto;
}
.mod-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.mod-kicker {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c084fc;
  font-weight: 700;
}
.mod-head h1 {
  margin: 4px 0;
  font-size: 1.6rem;
}
.mod-sub {
  margin: 0;
  color: rgba(243, 240, 247, 0.55);
  font-size: 0.9rem;
}
.mod-card {
  background: #141218;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 14px;
}
.mod-card h2 {
  margin: 0 0 10px;
  font-size: 1.05rem;
}
.mod-hint {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: rgba(243, 240, 247, 0.5);
}
.mod-card input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #0c0b10;
  color: #fff;
  font-size: 0.95rem;
}
.mod-btn {
  border: none;
  border-radius: 999px;
  padding: 11px 18px;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: #fff;
}
.mod-btn:disabled {
  opacity: 0.6;
}
.mod-btn.ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(243, 240, 247, 0.8);
}
.mod-err {
  color: #f87171;
  font-size: 0.88rem;
}
.mod-ok {
  color: #4ade80;
  font-size: 0.88rem;
}
.mod-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mod-empty {
  color: rgba(243, 240, 247, 0.45);
}
.mod-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mod-list li {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.mod-list li.off {
  opacity: 0.5;
}
.mod-preview {
  width: 96px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}
.mod-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mod-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mod-meta a {
  font-size: 0.75rem;
  color: #a78bfa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mod-badge {
  align-self: flex-start;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #aaa;
}
.mod-badge.on {
  background: rgba(37, 211, 102, 0.15);
  color: #4ade80;
}
.mod-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mod-actions button {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: #ddd;
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.75rem;
}
.mod-actions button.danger {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}
@media (max-width: 560px) {
  .mod-list li {
    grid-template-columns: 1fr;
  }
  .mod-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
