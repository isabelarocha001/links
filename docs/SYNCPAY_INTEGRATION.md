# Integração SyncPay: guia de operação e auditoria

> Documento de referência para desenvolvedores e LLMs que analisam este repositório. Descreve o comportamento encontrado no código em `2026-10-24`; não descreve uma arquitetura desejada. Antes de concluir uma auditoria, confira novamente os arquivos listados abaixo, pois o código é a fonte de verdade.

## Instruções para LLMs que forem auditar este projeto

1. Leia esta página e depois confira os arquivos de origem citados em cada seção. Não conclua que uma proteção existe só porque está descrita aqui.
2. Separe os fluxos de **Pix avulso** (`/api/checkout/pix`) e **Pix Automático mensal** (`/api/checkout/vip-monthly`). Eles usam endpoints, identificadores e semânticas de status diferentes.
3. O cliente web não chama a SyncPay diretamente. As chamadas passam pelas rotas Nitro do Nuxt. O Supabase é usado pelo servidor para buscar segredos e gravar/consultar pagamentos.
4. Não procure nem reproduza valores de credenciais. Não leia `.env.local` nem arquivos de `supabase/.temp/` para fins de documentação. Não exponha `service_role`, `client_secret`, tokens de plano ou segredo de webhook.
5. **Não implemente gerador de CPF, documento sintético, e-mail inventado ou dados de outra pessoa para matrícula/cobrança.** O Pix Automático identifica o pagador com `name`, `email` e `document` enviados à SyncPay. Um CPF que apenas passa no cálculo dos dígitos não prova que pertence ao comprador. Não use dados falsos para contornar os campos do provedor. Prefira checkout hospedado pelo provedor, autofill do navegador ou redução de campos somente se a SyncPay oficialmente permitir.
6. A documentação não substitui a verificação do ambiente remoto. Sem consultar o painel/API da SyncPay e o projeto Supabase correto, não afirme que um plano, segredo, webhook, status ou política RLS está ativo em produção.
7. Preserve autorização do comprador, confirmação de pagamento no servidor, integridade de valores, tratamento de recorrência, minimização de dados e validação de assinatura dos webhooks. Nunca libere acesso com base em estado alterável no navegador.

## Resumo da arquitetura

O projeto é um app Nuxt 3 com rotas de servidor Nitro em `server/api/`. A página `/assinaturavip` faz chamadas same-origin para essas rotas. O servidor autentica na API Partner da SyncPay, recebe QR/código Pix e consulta atualizações. O servidor usa `useServiceSupabase()` para acessar o Supabase.

Não há uma Edge Function SyncPay rastreável no diretório versionado `supabase/` deste checkout. O diretório encontrado contém somente arquivos `.temp` do CLI. Portanto, no código deste repositório, a integração está implementada nas rotas Nitro, e não em uma Edge Function Supabase. O deploy dessas rotas depende do backend Nuxt hospedado na Vercel.

### Fronteiras entre componentes

| Componente | Responsabilidade observada |
|---|---|
| `pages/assinaturavip.vue` | Escolhe plano, recolhe dados para o mensal, chama endpoints internos, mostra QR/copia e cola e consulta status quando o visitante pede. |
| `server/api/checkout/*` | Mantém credenciais no servidor, chama SyncPay e grava/consulta linhas em `payments`. |
| `server/api/webhooks/syncpay.post.ts` | Recebe notificações de transação e atualiza ou cria linhas de `payments`. |
| `server/utils/supabase.ts` | Cria cliente Supabase server-side e define o cliente de serviço usado pelas rotas. |
| Supabase `app_secrets` | Fonte alternativa server-side para segredos e token do plano mensal. |
| Supabase `payments` | Registro local de pagamentos, identificadores externos, estados e metadados. |

## Fluxo A: plano mensal VIP com Pix Automático

### No navegador

1. `pages/assinaturavip.vue` deixa o visitante escolher o plano mensal.
2. O formulário do modal pede nome, e-mail e CPF. O CPF é formatado para exibição no cliente. Isso não substitui a validação do servidor.
3. Ao clicar em gerar, o cliente envia `POST /api/checkout/vip-monthly` com `name`, `email`, `document`, um `visitor_id` UUID v4 guardado em `localStorage` e `accepted_recurring: true`.
4. O front-end não envia a chave da SyncPay nem chama a API da SyncPay diretamente.
5. Se a resposta trouxer QR/código Pix, o QR é renderizado no próprio cliente com a biblioteca `qrcode`. O código também fica disponível para copiar.
6. A página não consulta o status automaticamente nesse fluxo. A consulta acontece quando o visitante usa o botão de consultar; então o navegador chama `GET /api/checkout/status?id=<payment_id>`.
7. Nome, e-mail e CPF são enviados pelo servidor à SyncPay no pedido de matrícula. O código local não os inclui na inserção inicial em `payments`; a tabela recebe identificador do visitante, plano e dados de acompanhamento do mandato. Confirme a retenção real no ambiente remoto antes de afirmar que não existe cópia em outros sistemas/logs.

### No servidor

Arquivo principal: `server/api/checkout/vip-monthly.post.ts`.

1. Aplica limite em memória de uma tentativa a cada 20 segundos por IP. Esse mapa é local a cada instância serverless, não um limite global compartilhado.
2. Valida nome, formato básico de e-mail, checksum do CPF, UUID v4 do visitante e `accepted_recurring === true`.
3. Carrega `SYNCPAY_VIP_MONTHLY_PLAN_TOKEN` primeiro do ambiente, depois de `app_secrets`.
4. Obtém Bearer Token por `POST https://api.syncpayments.com.br/api/partner/v1/auth-token`, usando `client_id` e `client_secret`.
5. Consulta `GET /subscription-plans/{token}` e exige `billing_method = pix_automatico`, `status = active`, `amount = 29.90` e `periodicity_days = 30`.
6. Insere primeiro uma linha `pending` em `payments`, com método `pix_automatico` e metadados de origem/plano/visitante. Não grava nome, e-mail ou documento nessa inserção.
7. Envia `POST /subscription-plans/{token}/enroll` com `{ name, email, document }`.
8. Exige na resposta token da assinatura, ID do mandato e QR/código Pix. Se a resposta estiver incompleta, marca o registro como `failed` e devolve erro.
9. Atualiza `payments.external_id` para o token da assinatura, `pix_qr_code` para o código recebido e `metadata` com `subscription_token`, `mandate_id`, estados e método de cobrança.
10. Retorna `payment_id`, dados do mandato e código Pix ao navegador. Se a chamada à SyncPay funcionar mas a gravação posterior falhar, devolve erro explícito porque o acompanhamento do mandato não foi salvo.

O servidor valida o CPF pelo algoritmo dos dígitos verificadores. Essa validação só detecta formato/checksum; não confirma identidade ou titularidade.

### Consulta de status mensal

Em `server/api/checkout/status.get.ts`, o servidor procura primeiro `payments.id`, depois `payments.external_id`. Se `metadata.billing_method` for `pix_automatico` e houver `subscription_token`, consulta `GET /subscriptions/{subscription_token}` na SyncPay, interpreta estados de cobrança, assinatura e mandato e atualiza os metadados/estado local quando aplicável.

O código considera a assinatura confirmada quando encontra uma cobrança aprovada ou estados de assinatura `active`, `approved` ou `paid`. Em falha/expiração/cancelamento, mapeia o estado correspondente. Se não conseguir consultar a SyncPay, retorna o estado local e a mensagem de aguardando. O endpoint aplica um limite em memória de uma consulta por 4 segundos por combinação de IP e ID.

### Endpoint público auxiliar de plano mensal

`GET /api/checkout/vip-monthly` lê o token do plano, consulta a SyncPay, valida que o `checkout_url` é HTTPS e pertence a `app.syncpayments.com.br`, valida tipo/estado do plano e mantém o resultado em cache por cinco minutos. A página atual `/assinaturavip` não chama esse endpoint; ela usa o fluxo de matrícula próprio via `POST /api/checkout/vip-monthly`.

## Fluxo B: Pix avulso / cash-in

Arquivos principais: `server/api/checkout/pix.post.ts` e `server/api/checkout/status.get.ts`.

1. O front-end envia `POST /api/checkout/pix` com chave do plano, origem e `visitor_id`.
2. O servidor resolve preço por chave conhecida. Para chaves `vip_*`, ignora o valor enviado pelo cliente e usa o valor fixo do servidor. Outros planos aceitam `amount` enviado pelo cliente quando válido ou usam o fallback definido no arquivo.
3. Obtém Bearer Token da SyncPay e envia `POST /cash-in` com valor, descrição, dados do cliente e, quando disponível, URL de webhook.
4. Extrai identificador, código Pix e imagem do QR. Se não vier uma imagem, o servidor constrói uma URL de serviço externo de QR a partir do código.
5. Insere `payments` com `status = pending`, `payment_method = pix`, `amount`, `currency = BRL`, `pix_qr_code` e metadados, incluindo a resposta recebida da SyncPay.
6. Retorna os identificadores e o código ao navegador.
7. `GET /api/checkout/status` consulta a transação individual em `GET /transaction/{external_id}` e atualiza a linha local para `approved` quando a resposta confirma pagamento.

### Atenção: dados sintéticos no cash-in atual

O corpo montado por `server/api/checkout/pix.post.ts` contém atualmente nome fixo, e-mail fabricado com timestamp, CPF fixo e telefone fixo. Isso é diferente do fluxo mensal e representa um risco de dados incorretos/de outra pessoa enviados ao provedor. Não copie esse padrão para o Pix Automático nem o generalize como solução de usabilidade. Antes de ampliar ou reaproveitar cash-in, confirme com a SyncPay qual dado do pagador é obrigatório e use dados verdadeiros fornecidos pelo próprio comprador ou um checkout hospedado pelo provedor.

## Fluxo C: webhook SyncPay

Arquivo: `server/api/webhooks/syncpay.post.ts`.

- `GET /api/webhooks/syncpay` responde um sinal simples de disponibilidade.
- `POST` lê o corpo bruto, tenta obter assinatura dos cabeçalhos `x-syncpay-signature` ou `x-signature`, interpreta payloads planos, arrays e `data` aninhado, e tenta extrair ID, status, código Pix e valor.
- Se encontrar uma linha com o mesmo `external_id`, atualiza status, timestamps, valor/código e mescla o payload em `metadata`.
- Se não encontrar, cria uma nova linha em `payments`. Isso pode gerar linha sem metadados de plano/visitante quando o evento chega antes de um registro correspondente ou usa outro ID.
- Para pagamentos aprovados que pareçam desbloquear chat, tenta marcar `wa_funnel_conversations.metadata.chat_unlocked` para o `visitor_id`.
- O webhook de cash-in pode ser definido por `SYNCPAY_WEBHOOK_URL`; caso contrário, `pix.post.ts` tenta usar a origem da requisição mais `/api/webhooks/syncpay`, exceto em localhost.

### Limitações de segurança do webhook observadas

- Se `SYNCPAY_WEBHOOK_SECRET` não estiver configurado, `verifySyncPaySignature()` aceita a chamada sem assinatura. Isso significa que a verificação é opcional no código atual.
- A rota grava `metadata.signature_ok = true` mesmo quando não havia segredo configurado e a assinatura não foi validada. Esse campo não deve ser tratado como evidência auditável de verificação.
- O parser interpreta status de forma permissiva e a rota não exige uma allowlist de tipos de evento antes de alterar o registro.
- Não há deduplicação explícita por ID do evento; a atualização procura por `external_id`. Eventos repetidos tendem a atualizar a mesma linha, mas eventos sem linha correspondente podem inserir linhas repetidas dependendo do identificador enviado.
- O caminho de Pix Automático da matrícula não inclui `webhook_url` no pedido `enroll`; acompanhamento do primeiro pagamento/status depende também da consulta de assinatura em `status.get.ts` e da configuração do plano/provedor.

Esses pontos descrevem o comportamento atual; precisam ser tratados como itens de auditoria, não como recomendações.

### Achados prioritários registrados para auditorias

| Prioridade | Evidência no código | O que uma auditoria deve considerar |
|---|---|---|
| **P0** | `nuxt.config.ts` contém um valor literal de service-role como fallback de `runtimeConfig`. | Considerar a credencial exposta por estar no código versionado. Não reproduzir o valor. Rotacionar no Supabase e remover o fallback em mudança autorizada. |
| **P0** | `verifySyncPaySignature()` retorna sucesso quando não há segredo configurado. | Webhook pode aceitar evento sem autenticação se a configuração estiver ausente. Verificar configuração real e exigir assinatura válida em produção. |
| **P0** | `pix.post.ts` envia nome, e-mail, CPF e telefone sintéticos/fixos no cash-in. | Não replicar esse padrão. Avaliar a obrigação de dados corretos do pagador, rejeições e risco de associar a transação à identidade errada. |
| **P1** | `accepted_recurring` é enviado como `true` fixo pelo cliente; o servidor só valida o booleano. | O campo não comprova por si só uma ação afirmativa separada do comprador. Conferir o texto e a interação de consentimento visíveis antes da matrícula. |
| **P1** | Os limites de matrícula e consulta usam `Map` em memória. | Em Vercel/serverless, valores são por instância e podem ser reiniciados; não representam limite global. |
| **P1** | Não há migrations de `payments` ou `app_secrets` no diretório versionado observado. | Não inferir RLS, grants, constraints ou retenção a partir deste repositório; conferir o banco remoto. |

## Credenciais e configuração

### Segredos SyncPay lidos pelo servidor

| Chave | Usada para | Fonte atual |
|---|---|---|
| `SYNCPAY_CLIENT_ID` | Autenticação da API Partner | Runtime config/ambiente e, em algumas rotas, fallback em `app_secrets`. |
| `SYNCPAY_CLIENT_SECRET` | Autenticação da API Partner | Runtime config/ambiente e, em algumas rotas, fallback em `app_secrets`. |
| `SYNCPAY_VIP_MONTHLY_PLAN_TOKEN` | Identificar plano de R$ 29,90 a cada 30 dias | Ambiente primeiro, depois `app_secrets`. |
| `SYNCPAY_WEBHOOK_SECRET` | Validar assinatura do webhook | Runtime config/ambiente primeiro, depois `app_secrets`. |
| `SYNCPAY_WEBHOOK_URL` | Sobrescrever URL de webhook para cash-in | Runtime config/ambiente. |

O token Bearer retornado pelo endpoint `auth-token` é armazenado somente em variável de memória no processo Node, com validade baseada em `expires_in` e margem de 30 segundos. Em serverless, diferentes instâncias podem manter caches independentes.

O cliente Supabase usado pelas rotas é criado por `useServiceSupabase()` em `server/utils/supabase.ts`. Ele usa `supabaseServiceKey`, mas o helper atualmente cai para a chave anon caso a service key esteja vazia. O código de configuração em `nuxt.config.ts` também contém um valor literal para fallback da chave de serviço. **Não copie o valor para documentação, logs ou respostas. Trate uma chave service-role embutida no repositório como exposta: rotacione-a no Supabase e remova o fallback do código em uma correção separada.**

## Dados usados no Supabase

Não há migrations versionadas neste checkout que definam o esquema de pagamentos. Os campos abaixo foram inferidos das consultas e gravações do código; confirme tipos, defaults, RLS, grants, índices e constraints no projeto Supabase antes de alterar banco.

### `app_secrets`

Consultado pelo servidor por pares `key`/`value`. Guarda chaves de integração e token de plano quando a configuração não está disponível no ambiente. Nunca deve ser lido pelo cliente público.

### `payments`

Campos usados no código: `id`, `external_id`, `payment_method`, `status`, `amount`, `currency`, `pix_qr_code`, `metadata`, `approved_at`, `failed_at`, `updated_at`.

Metadados relevantes observados:

- Pix avulso: `source`, `plan_key`, `title`, `visitor_id`, `provider`, payload `syncpay`; em alguns planos também `call_style`/`quiz`.
- Pix Automático: `source = assinaturavip`, `plan_key = vip_monthly`, `visitor_id`, `billing_method`, `subscription_token`, `mandate_id`, `mandate_status`, `subscription_status`, e durante consultas `charge_status`/`status_checked_at`.
- Webhook: `source = webhook`, payload `syncpay`, `webhook_at` e `signature_ok` (este último não é confiável enquanto a verificação puder ser omitida).

O fluxo mensal não grava explicitamente nome, e-mail e CPF na linha inicial de pagamento. O cash-in atual guarda a resposta completa do provedor em `metadata.syncpay`; confirme quais dados pessoais a resposta contém e a política de retenção antes de considerar o registro livre de PII.

### `wa_funnel_conversations`

O status de pagamento aprovado de planos de chat pode atualizar o JSON `metadata` com `chat_unlocked`, horário, origem e plano. Esse desbloqueio é específico do funil de chat; não equivale, por si só, à liberação do canal VIP do Telegram.

## Configuração e arquivos de origem

- UI pública e payloads: `pages/assinaturavip.vue`
- Credenciais SyncPay e token em memória: `server/api/checkout/warm.get.ts`
- Pix avulso: `server/api/checkout/pix.post.ts`
- Status de transação/assinatura: `server/api/checkout/status.get.ts`
- Leitura/validação do plano mensal: `server/api/checkout/vip-monthly.get.ts`
- Matrícula Pix Automático: `server/api/checkout/vip-monthly.post.ts`
- Webhook de transação: `server/api/webhooks/syncpay.post.ts`
- Cliente Supabase server-side: `server/utils/supabase.ts`
- Runtime config: `nuxt.config.ts`
- Mapa resumido existente: `docs/CODEMAP.md`

## Checklist rápido para futuras auditorias

- Confirmar se a service-role key já foi rotacionada e remover qualquer fallback secreto do código.
- Confirmar no Supabase a tabela `payments`, suas policies/RLS, constraints e quais campos/metadados retêm PII.
- Confirmar que `app_secrets` não é acessível ao cliente anon/authenticated.
- Confirmar configuração de plano mensal, valor, periodicidade e estado direto na SyncPay.
- Fazer teste controlado no ambiente sandbox ou com autorização explícita antes de criar cobrança real.
- Exigir assinatura de webhook válida em produção e não marcar evento não verificado como `signature_ok`.
- Verificar como o provedor identifica eventos de primeira autorização, cobrança recorrente, falha, atraso, cancelamento e reembolso.
- Garantir que a liberação de acesso VIP deriva de estado confirmado no servidor e que o fluxo de expiração/cancelamento está implementado e coberto.
- Rever rate limits: os limites atuais de matrícula/status usam mapas em memória por instância.
- Confirmar que o cash-in usa dados verdadeiros do pagador, conforme os requisitos oficiais do provedor.
