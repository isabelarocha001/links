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
| `server/api/checkout/*` | PIX SyncPay + status + VIP mensal (Pix Automático) |
| `server/api/cpf/*` | Geração/validação de CPF **local** (sem API externa) |
| `server/api/fake-person.get.ts` | Nome/email/fone/CPF estáveis por `visitor_id` |
| `server/api/funnel-*.ts` | Mensagens e intents do funil |
| `server/api/webhooks/syncpay.post.ts` | Pagamento aprovado → libera plano |
| `server/utils/supabase.ts` | Clients + `verifyAdminToken` |
| `server/utils/fake-person.ts` | Algoritmo CPF + `fakePersonForVisitor()` |

## Visitor ID

| Onde | Storage | Função |
|------|---------|--------|
| Funil / `app.vue` | `localStorage['wanessa_vid']` + cookie `vid` | `getOrCreateVisitorId()` |
| `/assinaturavip` | `localStorage['vip-checkout-visitor-id']` | `getVipVisitorId()` |

UUID na 1ª visita; reutilizado nas seguintes no mesmo navegador.

## Scripts

`scripts/*.py` — patches one-shot já aplicados no histórico; não rodar em produção sem revisar.

## Docs

| Doc | Tema |
|-----|------|
| `docs/FAKE-PERSON-CPF.md` | API local CPF/pessoa + auto-fill VIP (para LLMs) |
| `docs/STRIPE.md` | Estado dos fluxos Stripe existentes |
| `docs/STRIPE-VIP-GROK-HANDOFF.md` | Especificação detalhada da futura integração Stripe no checkout VIP |
| `docs/ADMIN_CHAT.md` | Inbox admin |
| `docs/CHAT_ROUTES.md` | Rotas de chat |
| `docs/CSS_RESTORE.md` | Restaurar CSS truncado |
