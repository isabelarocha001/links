<template>
  <div class="page">
    <div class="bg-glow"></div>

    <!-- Cadeado minimalista canto superior direito -->
    <button class="lock-btn" type="button" aria-label="Editar página" @click="showLogin = true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>

    <main class="container">
      <div class="avatar-wrap">
        <img :src="config.avatar_url" :alt="config.name" class="avatar" width="120" height="120">
        <div class="avatar-ring"></div>
      </div>

      <h1 class="name">{{ config.name }}</h1>
      <p class="bio">{{ config.bio }}</p>

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
          <span class="link-icon">{{ link.icon }}</span>
          <span class="link-label">{{ link.label }}</span>
          <span class="link-arrow">→</span>
        </a>
      </div>
    </main>

    <!-- Modal login -->
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

    <!-- Painel edição -->
    <div v-if="isAdmin" class="modal" @click.self="isAdmin = false">
      <div class="modal-card edit">
        <h2>Editar página</h2>
        <label>Nome</label>
        <input v-model="edit.name" type="text">
        <label>Bio</label>
        <input v-model="edit.bio" type="text">
        <label>Avatar URL</label>
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
type LinkItem = { label: string; icon: string; url: string }

const config = reactive({
  name: 'Wanessa',
  bio: 'Creator • Conteúdo & Links',
  avatar_url: 'https://i.pravatar.cc/200?img=5',
  links: [
    { label: 'Prévia Telegram', icon: '📱', url: '#' },
    { label: 'Telegram VIP', icon: '⭐', url: '#' },
    { label: 'PrivSex', icon: '🔥', url: 'https://privsex.com' }
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

onMounted(async () => {
  try {
    const data = await $fetch<any>('/api/config')
    if (data) {
      config.name = data.name || config.name
      config.bio = data.bio || config.bio
      config.avatar_url = data.avatar_url || config.avatar_url
      if (Array.isArray(data.links) && data.links.length) config.links = data.links
    }
  } catch {}
})

function openEdit() {
  edit.name = config.name
  edit.bio = config.bio
  edit.avatar_url = config.avatar_url
  edit.links = config.links.map(l => ({ ...l }))
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
    await $fetch('/api/admin/update', {
      method: 'POST',
      body: {
        name: edit.name,
        bio: edit.bio,
        avatar_url: edit.avatar_url,
        links: edit.links.filter(l => l.label)
      }
    })
    config.name = edit.name
    config.bio = edit.bio
    config.avatar_url = edit.avatar_url
    config.links = edit.links.filter(l => l.label)
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
    body: { label: link.label, url: link.url }
  }).catch(() => {})
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 48px 16px 32px;
  position: relative;
  overflow: hidden;
}

.bg-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255, 77, 109, 0.15) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
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
  gap: 12px;
  position: relative;
  z-index: 1;
}

.avatar-wrap {
  position: relative;
  margin-bottom: 8px;
}

.avatar {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.avatar-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: linear-gradient(135deg, #ff4d6d, #c44dff, #4d9fff) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.7;
  animation: spin 8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.name {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  text-align: center;
}

.bio {
  font-size: 0.9rem;
  color: #a0a0a0;
  text-align: center;
  margin-bottom: 16px;
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
  padding: 15px 18px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.link::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 77, 109, 0.2), rgba(196, 77, 255, 0.15));
  opacity: 0;
  transition: opacity 0.25s ease;
}

.link:hover {
  transform: translateY(-2px) scale(1.01);
  border-color: rgba(255, 77, 109, 0.4);
  box-shadow: 0 8px 24px rgba(255, 77, 109, 0.15);
}

.link:hover::before { opacity: 1; }

.link-icon, .link-label, .link-arrow {
  position: relative;
  z-index: 1;
}

.link-label { flex: 1; }

.link-arrow {
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.25s ease;
  color: #ff4d6d;
}

.link:hover .link-arrow {
  opacity: 1;
  transform: translateX(0);
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
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
  background: #ff4d6d;
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
  .page { padding: 32px 14px 24px; }
  .avatar { width: 96px; height: 96px; }
  .name { font-size: 1.4rem; }
  .link-edit { grid-template-columns: 1fr; }
}
</style>
