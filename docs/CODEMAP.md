# Mapa do código (CODEMAP)

Guia rápido para revisar o repositório. Comentários no código usam headers `/**` e seções `=====`.

## Entrada / UI

| Arquivo | Responsabilidade |
|---------|------------------|
| `app.vue` | Página de links + funil WA completo (quiz, cards, chat, PIX, bloqueios) |
| `components/AdminChatInbox.vue` | Inbox admin em `/admin/chat` |
| `pages/*` | Shells de rota (conteúdo pesado fica no `app.vue`) |
| `utils/i18n.ts` | Textos PT/EN/ES/FR/DE/IT (ex.: `vipTitle`) |
| `assets/css/links-page.css` | Estilos da home + funil + modais |

## Bloqueios do chat (`app.vue`)

| Flag | Significado | Popup / preço |
|------|-------------|----------------|
| `funnelChatUnlocked` | Pagou desbloqueio | — (liberado) |
| `!funnelChatUnlocked` | Chat pago | popup R$ **9,90** (`chat_quick`) |
| `funnelBlocked` | Pediu programa/encontro | unlock R$ 49,90 |
| `funnelPermBlocked` | Wanessa bloqueou o lead | mimo R$ 29,90 (+ botão X para fechar; toque reabre) |
| `leadBlockedWanessa` | Lead bloqueou Wanessa | sem mimo |

## Server API (pastas)

| Pasta | Uso |
|-------|-----|
| `server/api/admin/*` | Login, conversas, reply, presença, unlock-chat |
| `server/api/checkout/*` | PIX SyncPay + status |
| `server/api/funnel-*.ts` | Mensagens e intents do funil |
| `server/api/webhooks/syncpay.post.ts` | Pagamento aprovado → libera plano |
| `server/utils/supabase.ts` | Clients + `verifyAdminToken` |

## Scripts

`scripts/*.py` — patches one-shot já aplicados no histórico; não rodar em produção sem revisar.

## Docs

| Arquivo | Conteúdo |
|---------|----------|
| `docs/ADMIN_CHAT.md` | Inbox admin, abas, APIs, preços de unlock |
| `docs/CHAT_ROUTES.md` | Rotas públicas e admin do chat |
| `docs/CSS_RESTORE.md` | Como recuperar `links-page.css` truncado |
| `docs/CODEMAP.md` | Este mapa |
