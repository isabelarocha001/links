# Admin Chat + Presença

## Rota

- **URL:** `/admin/chat`
- **Componente:** `components/AdminChatInbox.vue`
- **Acesso:** senha admin → cookie `admin_token` httpOnly
- Sem autenticação: formulário de login na própria página (não lista conversas)

## O que faz

1. Lista conversas de `wa_funnel_conversations`
2. Abre histórico de `wa_funnel_messages`
3. Admin responde → `direction=bot`, `step=live_admin` (lead recebe no poll do funil)
4. **Presença admin:** heartbeat `POST /api/admin/presence` enquanto a aba está aberta  
   - Lead consulta `GET /api/presence` → `online` se last_seen &lt; 45s; senão “visto por último às HH:MM” (America/Sao_Paulo)
5. **Liberar chat pago** manualmente (`POST /api/admin/unlock-chat`) por visitor_id ou nome
6. Enviar foto/vídeo/áudio, enquete e convite de videochamada

## Abas de filtro

| Aba | Filtro |
|-----|--------|
| Todas | todas as conversas |
| Não lidas | `is_new` (última msg do lead &lt; 24h) |
| Abertas | `status === 'open'` |
| **Chat pago** | `metadata.chat_unlocked === true` (pagou PIX ou grant admin) |

Na lista, conversas desbloqueadas mostram badge **💚 pago**.

## Chat desbloqueado (como detectar)

- `wa_funnel_conversations.metadata.chat_unlocked = true`
- ou `payments` com `status=approved` e `plan_key` de chat / `admin_grant`
- Lead consulta: `GET /api/chat-unlock?visitor_id=`

## Preços relacionados (funil)

| Plano | Valor | Quando |
|-------|-------|--------|
| `chat_quick` | **R$ 9,90** | Desbloqueio do chat (enviar mensagem) |
| `chat_unlock_segunda_chance` | R$ 29,90 | Mimo após bloqueio permanente da Wanessa |
| `chat_unlock_blocked` | R$ 49,90 | Desbloqueio após pedir programa/encontro |

Fonte no front: `chatPlans` / `CHAT_MSG_UNLOCK_PLAN` em `app.vue`  
Fonte no server: `PLAN_FALLBACK` em `server/api/checkout/pix.post.ts`

## SQL (presença admin)

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

alter table public.admin_presence enable row level security;
```

Sem essa tabela o inbox funciona; só a presença fica “offline” para o lead.

## APIs

| Método | Path | Auth | Uso |
|--------|------|------|-----|
| POST | `/api/admin/login` | — | senha → cookie |
| POST | `/api/admin/logout` | admin | sai + zera presença |
| GET | `/api/admin/session` | admin | checa sessão |
| POST | `/api/admin/presence` | admin | heartbeat / offline |
| GET | `/api/presence` | público | status para o lead |
| GET | `/api/admin/conversations` | admin | lista (+ `chat_unlocked`, `unlocked_count`) |
| GET | `/api/admin/conversation-messages` | admin | mensagens (`?id=`) |
| POST | `/api/admin/conversation-reply` | admin | responder / mídia / poll / call |
| GET | `/api/admin/lead-presence` | admin | online do lead na conversa |
| POST | `/api/admin/unlock-chat` | admin | liberar chat pago |

## Segurança

- Não versionar senha, tokens ou service keys
- Presença pública não expõe IP, visitor_id nem mensagens
