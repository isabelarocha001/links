<script setup lang="ts">
const AVATAR_URL = '/privsex-platform-avatar.jpg'
const AVATAR_POSITION_KEY = 'privsex_avatar_position_v1'

useHead({
  title: 'Gestão · Avatar PrivSex',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const password = ref('')
const authed = ref(false)
const loading = ref(false)
const checking = ref(true)
const errorMessage = ref('')
const savedMessage = ref('')
const avatarX = ref(50)
const avatarY = ref(50)
const avatarZoom = ref(1)

function applyPosition(saved: any) {
  if (Number.isFinite(Number(saved?.x))) avatarX.value = Math.min(100, Math.max(0, Number(saved.x)))
  if (Number.isFinite(Number(saved?.y))) avatarY.value = Math.min(100, Math.max(0, Number(saved.y)))
  if (Number.isFinite(Number(saved?.zoom))) avatarZoom.value = Math.min(2, Math.max(1, Number(saved.zoom)))
}

async function loadPosition() {
  try {
    const raw = localStorage.getItem(AVATAR_POSITION_KEY)
    if (raw) applyPosition(JSON.parse(raw))
  } catch {}

  try {
    const saved = await $fetch('/api/avatar-position')
    applyPosition(saved)
    localStorage.setItem(AVATAR_POSITION_KEY, JSON.stringify(saved))
  } catch {}
}

async function savePosition() {
  try {
    const position = {
      x: Number(avatarX.value),
      y: Number(avatarY.value),
      zoom: Number(avatarZoom.value),
    }
    await $fetch('/api/admin/avatar-position', { method: 'POST', body: position })
    localStorage.setItem(AVATAR_POSITION_KEY, JSON.stringify(position))
    savedMessage.value = 'Posição salva para a landing.'
    window.setTimeout(() => { savedMessage.value = '' }, 2600)
  } catch {
    try {
      localStorage.setItem(AVATAR_POSITION_KEY, JSON.stringify({
        x: Number(avatarX.value),
        y: Number(avatarY.value),
        zoom: Number(avatarZoom.value),
      }))
      savedMessage.value = 'Backend indisponível: salvo apenas neste navegador.'
    } catch {
      errorMessage.value = 'Não foi possível salvar a posição.'
    }
  }
}

async function resetPosition() {
  avatarX.value = 50
  avatarY.value = 50
  avatarZoom.value = 1
  savePosition()
}

const avatarStyle = computed(() => ({
  objectPosition: `${avatarX.value}% ${avatarY.value}%`,
  transform: `scale(${avatarZoom.value})`,
}))

async function checkSession() {
  try {
    await $fetch('/api/admin/session')
    authed.value = true
    await loadPosition()
  } catch {
    authed.value = false
  } finally {
    checking.value = false
  }
}

async function login() {
  errorMessage.value = ''
  loading.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    password.value = ''
    authed.value = true
    await loadPosition()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Senha inválida.'
  } finally {
    loading.value = false
  }
}

async function logout() {
  try { await $fetch('/api/admin/logout', { method: 'POST' }) } catch {}
  authed.value = false
}

onMounted(checkSession)
</script>

<template>
  <main class="gestao-page">
    <section v-if="checking" class="gestao-shell gestao-loading" aria-live="polite">
      Verificando acesso…
    </section>

    <section v-else-if="!authed" class="gestao-shell gestao-login" aria-labelledby="gestao-login-title">
      <div class="gestao-lock" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <p class="gestao-kicker">Área restrita</p>
      <h1 id="gestao-login-title">Gestão do avatar</h1>
      <p class="gestao-muted">Entre com a mesma senha do painel administrativo.</p>
      <form class="gestao-login-form" @submit.prevent="login">
        <input v-model="password" type="password" autocomplete="current-password" placeholder="Senha do administrador" required />
        <button type="submit" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
      </form>
      <p v-if="errorMessage" class="gestao-error" role="alert">{{ errorMessage }}</p>
    </section>

    <section v-else class="gestao-shell gestao-editor" aria-labelledby="gestao-editor-title">
      <header class="gestao-header">
        <div>
          <p class="gestao-kicker">Área restrita</p>
          <h1 id="gestao-editor-title">Ajustar avatar</h1>
          <p class="gestao-muted">Posicione a logo dentro do círculo da landing.</p>
        </div>
        <button type="button" class="gestao-ghost" @click="logout">Sair</button>
      </header>

      <div class="gestao-preview-wrap">
        <div class="gestao-preview" aria-label="Pré-visualização circular do avatar">
          <img :src="AVATAR_URL" alt="Pré-visualização do avatar PrivSex" :style="avatarStyle" />
        </div>
      </div>

      <div class="gestao-controls">
        <label>
          <span>Posição horizontal <output>{{ avatarX }}%</output></span>
          <input v-model.number="avatarX" type="range" min="0" max="100" step="1" />
        </label>
        <label>
          <span>Posição vertical <output>{{ avatarY }}%</output></span>
          <input v-model.number="avatarY" type="range" min="0" max="100" step="1" />
        </label>
        <label>
          <span>Zoom <output>{{ Number(avatarZoom).toFixed(2) }}x</output></span>
          <input v-model.number="avatarZoom" type="range" min="1" max="2" step="0.01" />
        </label>
      </div>

      <div class="gestao-actions">
        <button type="button" class="gestao-primary" @click="savePosition">Salvar posição</button>
        <button type="button" class="gestao-ghost" @click="resetPosition">Restaurar</button>
      </div>
      <p v-if="savedMessage" class="gestao-success" role="status">{{ savedMessage }}</p>
      <p v-if="errorMessage" class="gestao-error" role="alert">{{ errorMessage }}</p>
      <p class="gestao-note">A posição é salva no backend e também fica em cache neste navegador. O avatar permanece circular e responsivo.</p>
    </section>
  </main>
</template>

<style scoped>
.gestao-page {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  padding: max(28px, env(safe-area-inset-top)) 16px max(30px, env(safe-area-inset-bottom));
  background: #050505;
  color: #f4f4f5;
  font-family: Poppins, Inter, system-ui, sans-serif;
}

.gestao-shell {
  width: min(100%, 540px);
  min-width: 0;
  margin: 0 auto;
}

.gestao-loading,
.gestao-login,
.gestao-editor {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  background: linear-gradient(145deg, #171719, #0b0b0c);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
}

.gestao-loading { padding: 38px 24px; text-align: center; color: #b8bac2; }
.gestao-login, .gestao-editor { padding: clamp(22px, 5vw, 34px); }
.gestao-login { text-align: center; }
.gestao-lock { width: 48px; height: 48px; display: grid; place-items: center; margin: 0 auto 16px; border: 1px solid rgba(255,255,255,.22); border-radius: 50%; color: #e5e7eb; background: #0c0c0d; }
.gestao-kicker { margin: 0 0 7px; color: #d1d5db; font-size: .7rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
h1 { margin: 0; color: #fff; font-size: clamp(1.45rem, 5vw, 2rem); line-height: 1.15; }
.gestao-muted { margin: 9px 0 0; color: rgba(244,244,245,.62); font-size: .86rem; line-height: 1.5; }
.gestao-login-form { display: grid; gap: 10px; margin-top: 22px; }
.gestao-login-form input, .gestao-controls input { width: 100%; box-sizing: border-box; }
.gestao-login-form input { padding: 12px 14px; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: #080809; color: #fff; font: inherit; }
.gestao-login-form button, .gestao-primary { border: 0; border-radius: 12px; padding: 12px 16px; background: #f4f4f5; color: #101012; font: inherit; font-weight: 700; cursor: pointer; }
.gestao-login-form button:disabled { cursor: wait; opacity: .6; }
.gestao-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.gestao-ghost { border: 1px solid rgba(255,255,255,.16); border-radius: 10px; padding: 9px 13px; background: transparent; color: #d1d5db; font: inherit; cursor: pointer; }
.gestao-preview-wrap { display: grid; place-items: center; margin: 28px 0; }
.gestao-preview { width: min(62vw, 250px); aspect-ratio: 1; overflow: hidden; border: 1px solid rgba(255,255,255,.3); border-radius: 50%; background: #000; box-shadow: 0 0 0 8px rgba(255,255,255,.035), 0 18px 44px rgba(0,0,0,.5); }
.gestao-preview img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; transition: transform 120ms ease; }
.gestao-controls { display: grid; gap: 17px; }
.gestao-controls label { display: grid; gap: 7px; min-width: 0; }
.gestao-controls span { display: flex; justify-content: space-between; gap: 12px; color: #e5e7eb; font-size: .82rem; }
.gestao-controls output { color: #9ca3af; font-variant-numeric: tabular-nums; }
.gestao-controls input { accent-color: #d1d5db; cursor: pointer; }
.gestao-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 25px; }
.gestao-success, .gestao-error, .gestao-note { font-size: .8rem; line-height: 1.45; }
.gestao-success { color: #a7f3d0; }
.gestao-error { margin-top: 14px; color: #fca5a5; }
.gestao-note { margin: 18px 0 0; color: rgba(244,244,245,.45); }

@media (max-width: 380px) {
  .gestao-page { padding-left: 10px; padding-right: 10px; }
  .gestao-login, .gestao-editor { padding: 20px 15px; border-radius: 18px; }
  .gestao-actions > * { flex: 1 1 140px; }
}
</style>
