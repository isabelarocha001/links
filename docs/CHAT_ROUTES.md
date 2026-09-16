# Rotas de chat / WhatsApp

## Público (lead)

| URL | O que faz |
|-----|-----------|
| `/chat` | **Quiz ICP** (qualificação → WhatsApp). Não abre o funil antigo. |
| `/chat/wanessabsx` | Idem (slug só tracking) |
| `/chat/wanessa` | Idem |
| `/quiz` | Mesmo quiz ICP |
| `/?quiz=1` ou `/?wa=1` | Quiz na home |
| `/?chat=1` ou `/?open=whatsapp` | Quiz ICP (não funil antigo) |
| `/chamada` | Funil antigo + popup videochamada (canal de prévias) |
| `/CanalPublico` | Landing tráfego canal |

Lógica do quiz: **`app.vue`** (`iqStart`).  
Funil antigo (`openWaFunnel`) só em **`/chamada`** (e restore de sessão se o usuário já tinha chat aberto na home).

## Admin

| URL | O que faz |
|-----|-----------|
| `/admin/chat` | Inbox admin (`AdminChatInbox.vue`) — **não alterar** |

## APIs (inalteradas)

| Método | Path | Uso |
|--------|------|-----|
| POST | `/api/funnel-chat` | Funil legado |
| GET | `/api/funnel-chat` | Funil legado |
| GET | `/api/chat-unlock` | Unlock legado |
