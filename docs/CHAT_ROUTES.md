# Rotas de chat

## Público (lead)

| URL | O que faz |
|-----|-----------|
| `/chat` | Abre o funil WhatsApp direto (slug padrão wanessabsx) |
| `/chat/wanessabsx` | Abre o funil WhatsApp direto (pula quiz se slug ok) |
| `/chat/wanessa` | Idem |
| `/chamada` | Canal de prévias: abre funil + popup de videochamada entrando |
| `/?chat=1` ou `/?open=whatsapp` | Abre funil na home |
| `/#chat` | Fallback hash |

Páginas shell: `pages/chat/index.vue`, `pages/chat/[slug].vue`, `pages/chamada.vue`  
Lógica: `app.vue` → `onMounted` → `openWaFunnel(...)` (+ `startIncomingVideoCall` em `/chamada`)

## Admin (protegido)

| URL | O que faz |
|-----|-----------|
| `/admin/chat` | Inbox de conversas — **404 se não logado** na home |

Login só pelo cadeado na home; depois acessa `/admin/chat` com cookie de sessão.
