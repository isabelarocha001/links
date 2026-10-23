# Webhook de eventos do Analitics

Edge Function no projeto Supabase `Analitics`, para receber eventos gerais do agente e eventos financeiros da SyncPay.

## Endpoint

`https://sgolmmhbufosmtigaakx.supabase.co/functions/v1/analytics-events`

## Eventos SyncPay

Nos prints aparecem: **Transação — criada e atualizada (PIX e Cartão)**, **Recebimento — Cash in**, **Transação — Cash Out**, **Infração — MED** e **Assinatura — Ativada, Em atraso, Suspensa, Cancelada, Reativada, Renovada e Expirada**. Configure os webhooks desejados apontando para este endpoint. O receptor aceita os eventos pelo header `X-SyncPay-Event`, pelos campos de evento no JSON, ou pelo parâmetro `?event_type=` na URL.

Guarde os tokens gerados para cada webhook. A função os valida por `Authorization: Bearer <token>`; `tools/update-analytics-events.ps1` pede os tokens em entrada oculta e os grava no segredo `SYNCPAY_WEBHOOK_TOKENS`. Se a entrega não trouxer o nome do evento, configure `event_type` na URL para o evento correspondente.

As categorias reconhecidas são normalizadas para `transaction`, `cash-in`, `cash-out`, `med`, `subscription-activated`, `subscription-overdue`, `subscription-suspended`, `subscription-cancelled`, `subscription-reactivated`, `subscription-renewed` e `subscription-expired`. Outros nomes enviados pela SyncPay também são guardados como eventos próprios e aparecem no painel. Reenvios iguais são deduplicados sem descartar mudanças posteriores de status.

O payload SyncPay é reduzido a campos operacionais permitidos (identificador, status, valor, moeda e horários). Nome, e-mail, CPF/documento, telefone, chave/código Pix e quaisquer outros campos não são armazenados.

## Eventos do agente

O agente pode continuar usando `x-webhook-secret` ou `Authorization: Bearer <segredo>`, com o valor `ANALYTICS_EVENTS_WEBHOOK_SECRET` já configurado no Supabase:

```json
{
  "source": "nome-do-agente",
  "event_id": "evt-123",
  "event_type": "checkout.completed",
  "data": { "example": true }
}
```

Eventos repetidos com o mesmo `source` e `event_id` são ignorados. Limite do corpo: 256 KiB. A função registra eventos; não confirma pagamentos, libera acesso ou envia mensagens.

## Publicar atualização e cadastrar tokens SyncPay

Execute `tools/update-analytics-events.ps1` no PowerShell. O script pede os tokens com entrada oculta, envia os segredos ao projeto e publica apenas esta Edge Function. Não cole tokens no chat nem em arquivos do repositório.

## Dashboard

`/dashboard` mostra, após login de administrador, contagens das últimas 24 horas por evento e os 100 eventos mais recentes. A tela atualiza a cada 15 segundos. Cada registro SyncPay contém apenas os campos operacionais permitidos; dados pessoais e chaves/códigos Pix são descartados pelo receptor.

Resposta aceita: `{"ok":true,"received":true,"event_type":"cash-in"}` ou `cash-out`. Token ausente/incorreto retorna `401`; configuração ausente retorna `503`.
