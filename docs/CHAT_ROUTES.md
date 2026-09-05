# Rotas de chat

## Público (lead)

| URL | O que faz |
|-----|-----------|
| `/chat/wanessabsx` | Abre o funil WhatsApp direto (pula quiz se slug ok) |
| `/chat/wanessa` | Idem |
| `/?chat=1` ou `/?open=whatsapp` | Abre funil na home |
| `/#chat` | Fallback hash |

Páginas shell: `pages/chat/[slug].vue`, `pages/chat/index.vue`  
Lógica: `app.vue` → `onMounted` → `openWaFunnel('chat_' + slug)`

## Admin (protegido)

| URL | O que faz |
|-----|-----------|
| `/admin/chat` | Inbox de conversas — **404 se não logado** na home |

Login só pelo cadeado na home; depois acessa `/admin/chat` com cookie de sessão.
