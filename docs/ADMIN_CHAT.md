# Admin Chat + Presença

## Rota

- **URL:** `/admin/chat`
- **Acesso:** somente com senha admin (mesmo login do painel). Cookie `admin_token` httpOnly.
- Sem autenticação: formulário de login na própria página (não lista conversas).

## O que faz

1. Lista conversas de `wa_funnel_conversations` (todas / novas / abertas).
2. Abre o histórico de `wa_funnel_messages`.
3. Admin responde → grava `direction=bot`, `step=live_admin` (lead recebe no poll do funil).
4. **Presença:** enquanto a aba `/admin/chat` estiver aberta, heartbeat a cada 15s em `POST /api/admin/presence`.
   - Lead consulta `GET /api/presence` → `online` se last_seen &lt; 45s; senão `visto por último às HH:MM` (fuso America/Sao_Paulo).

## SQL obrigatório (Supabase)

Rodar uma vez no SQL Editor:

```sql
create table if not exists public.admin_presence (
  id text primary key default 'main',
  is_online boolean not null default false,
  last_seen_at timestamptz,
  updated_at timestamptz default now()
);

insert into public.admin_presence (id, is_online, last_seen_at)
values ('main', false, now())
on conflict (id) do nothing;

-- service role já usa a API server-side; se usar RLS:
alter table public.admin_presence enable row level security;
-- sem policies para anon (só service role via API Nuxt)
```

Sem essa tabela, o inbox admin ainda funciona; só a presença fica “falhou” no topo e o lead vê `offline`.

## APIs

| Método | Path | Auth | Uso |
|--------|------|------|-----|
| POST | `/api/admin/presence` | admin | heartbeat / offline |
| GET | `/api/presence` | público | status para o chat do lead |
| GET | `/api/admin/conversations` | admin | lista |
| GET | `/api/admin/conversations/:id` | admin | mensagens |
| POST | `/api/admin/conversations/:id/reply` | admin | responder |

## Segurança

- Não documentar/versionar senha, tokens ou service keys.
- Presença pública não expõe IP, visitor_id nem mensagens.
'''

# Patch app.vue
python3 << 'PY'
from pathlib import Path
app = Path('/tmp/app.vue').read_text()

# 1) Hide main page on /admin
old = '''  <div class="page" :class="{ 'page--locked': showLogin || showAdminPanel, 'page--chat-landing': isChatLanding }" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>'''
new = '''  <div v-if="!isAdminRoute" class="page" :class="{ 'page--locked': showLogin || showAdminPanel, 'page--chat-landing': isChatLanding }" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>'''
if old not in app:
    raise SystemExit('page div not found')
app = app.replace(old, new, 1)
print('hide admin ok')

# 2) isAdminRoute computed near route
old_r = '''const route = useRoute()
const hidePublicChannel = computed(() => {'''
new_r = '''const route = useRoute()
const isAdminRoute = computed(() => {
  const p = String(route.path || '').toLowerCase()
  return p === '/admin' || p.startsWith('/admin/')
})
const hidePublicChannel = computed(() => {'''
if old_r not in app:
    raise SystemExit('route block not found')
app = app.replace(old_r, new_r, 1)
print('isAdminRoute ok')

# 3) Funnel header status: presence
old_st = '''              <p class="wa-status">
                <span v-if="funnelTyping" class="wa-status-typing">digitando…</span>
                <span v-else class="wa-status-online">online</span>
              </p>'''
new_st = '''              <p class="wa-status">
                <span v-if="funnelTyping" class="wa-status-typing">digitando…</span>
                <span v-else-if="adminPresenceOnline" class="wa-status-online">online</span>
                <span v-else class="wa-status-last">{{ adminPresenceLabel }}</span>
              </p>'''
if old_st not in app:
    raise SystemExit('status block not found')
app = app.replace(old_st, new_st, 1)
print('status template ok')

# 4) presence state + poll near funnelRecording or live chat
marker = 'let liveChatPollTimer: ReturnType<typeof setInterval> | null = null'
if marker not in app:
    raise SystemExit('liveChatPollTimer not found')
inject = '''const adminPresenceOnline = ref(false)
const adminPresenceLabel = ref('offline')
let presencePollTimer: ReturnType<typeof setInterval> | null = null

async function pullAdminPresence() {
  try {
    const res = await $fetch<{ online?: boolean; label?: string }>('/api/presence')
    adminPresenceOnline.value = !!res?.online
    adminPresenceLabel.value = String(res?.label || (res?.online ? 'online' : 'offline'))
  } catch {
    adminPresenceOnline.value = false
    adminPresenceLabel.value = 'offline'
  }
}
function startPresencePoll() {
  stopPresencePoll()
  pullAdminPresence()
  presencePollTimer = setInterval(pullAdminPresence, 20000)
}
function stopPresencePoll() {
  if (presencePollTimer) {
    clearInterval(presencePollTimer)
    presencePollTimer = null
  }
}

let liveChatPollTimer: ReturnType<typeof setInterval> | null = null'''
app = app.replace(marker, inject, 1)
print('presence poll ok')

# 5) start presence when opening funnel - find startLiveChatPoll and also openWaFunnel
# Call startPresencePoll when showWaFunnel becomes true / open funnel
old_open = 'function startLiveChatPoll() {\n  stopLiveChatPoll()\n  if (!funnelChatUnlocked.value) return'
# Also start presence regardless of unlock when funnel is open
# Find a good place - after open funnel functions that set showWaFunnel

# Search for showWaFunnel.value = true
import re
count = app.count('showWaFunnel.value = true')
print('showWaFunnel true count', count)

# Add startPresencePoll() after startLiveChatPoll definition calls
# Simpler: call startPresencePoll inside startLiveChatPoll always, and on funnel open

old_slp = '''function startLiveChatPoll() {
  stopLiveChatPoll()
  if (!funnelChatUnlocked.value) return
  pullLiveAdminReplies()
  liveChatPollTimer = setInterval(() => {
    pullLiveAdminReplies()
  }, 3000)
}'''
new_slp = '''function startLiveChatPoll() {
  stopLiveChatPoll()
  startPresencePoll()
  if (!funnelChatUnlocked.value) return
  pullLiveAdminReplies()
  liveChatPollTimer = setInterval(() => {
    pullLiveAdminReplies()
  }, 3000)
}'''
if old_slp not in app:
    raise SystemExit('startLiveChatPoll block not found')
app = app.replace(old_slp, new_slp, 1)
print('startLiveChatPoll ok')

old_stop = '''function stopLiveChatPoll() {
  if (liveChatPollTimer) {
    clearInterval(liveChatPollTimer)
    liveChatPollTimer = null
  }
}'''
new_stop = '''function stopLiveChatPoll() {
  if (liveChatPollTimer) {
    clearInterval(liveChatPollTimer)
    liveChatPollTimer = null
  }
  stopPresencePoll()
}'''
# careful - stopPresencePoll is defined after in inject which is BEFORE liveChatPollTimer
# Actually inject put stopPresencePoll before liveChatPollTimer declaration, and stopLiveChatPoll is after
# So order is fine
if old_stop not in app:
    raise SystemExit('stopLiveChatPoll not found')
app = app.replace(old_stop, new_stop, 1)
print('stopLiveChatPoll ok')

# CSS for last seen
# We'll add to links-page via small push

Path('/tmp/app-admin.vue').write_text(app)
print('app size', len(app))
PY
# Add CSS for last seen status
python3 << 'PY'
import urllib.request
from pathlib import Path
css = urllib.request.urlopen('https://raw.githubusercontent.com/isabelarocha001/links/main/assets/css/links-page.css').read().decode()
if '.wa-status-last' not in css:
    css += """
.wa-status-last {
  color: #8696a0;
  font-size: 0.72rem;
}
"""
    Path('/tmp/links-css-presence.css').write_text(css)
    print('css updated', len(css))
else:
    Path('/tmp/links-css-presence.css').write_text(css)
    print('css already has last')
PY
