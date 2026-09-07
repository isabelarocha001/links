# Rotas de chat

## Público (lead)

| URL | O que faz |
|-----|-----------|
| `/chat` | Abre o funil WhatsApp direto (slug padrão) |
| `/chat/wanessabsx` | Funil direto (pula quiz se slug ok) |
| `/chat/wanessa` | Idem |
| `/chamada` | Canal de prévias: funil + popup de videochamada |
| `/CanalPublico` | Landing de tráfego do canal (esconde botão canal) |
| `/?chat=1` ou `/?open=whatsapp` | Abre funil na home |
| `/#chat` | Fallback hash |

Páginas shell: `pages/chat/index.vue`, `pages/chat/[slug].vue`, `pages/chamada.vue`, `pages/CanalPublico.vue`  
Lógica real do funil: **`app.vue`**

## Admin

| URL | O que faz |
|-----|-----------|
| `/admin/chat` | Inbox de conversas (`AdminChatInbox.vue`) |

Ver também: [ADMIN_CHAT.md](./ADMIN_CHAT.md)

## APIs de chat (lead)

| Método | Path | Uso |
|--------|------|-----|
| POST | `/api/funnel-chat` | Lead envia msg / evento |
| GET | `/api/funnel-chat` | Lead busca respostas do admin |
| GET | `/api/chat-unlock` | Lead verifica se chat foi liberado |
| POST | `/api/checkout/pix` | Gera PIX (chat R$ 9,90, packs, call…) |
| GET | `/api/checkout/status` | Poll status do pagamento |
| POST | `/api/lead-presence` | Lead reporta typing/online |
| GET | `/api/presence` | Lead vê se admin está online |
