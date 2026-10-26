# Integração Stripe no checkout VIP: instruções para o Grok

Este documento é a especificação de implementação do cartão Stripe em `/assinaturavip`. Leia antes de editar qualquer arquivo. A integração ainda não está ativa neste checkout; o marcador `#vip-stripe-checkout-mount` em `pages/assinaturavip.vue` é apenas um ponto de encaixe oculto, sem chamadas Stripe ou efeito visual.

## Resultado esperado

Adicionar pagamento com cartão ao checkout VIP mantendo o checkout Pix atual funcionando. A pessoa escolhe um plano, vê apenas métodos de pagamento realmente configurados para aquela moeda, e conclui o cartão dentro do pop-up existente. A confirmação e qualquer liberação de acesso vêm do servidor após confirmação verificável da Stripe.

Os planos têm naturezas diferentes:

| Chave interna | Produto | Tipo Stripe | Preço conhecido hoje |
|---|---|---|---|
| `monthly` / `vip_monthly` | Canal VIP mensal | Assinatura recorrente, ciclo de 30 dias | BRL/USD/EUR 29,90 em cada moeda |
| `lifetime` / `vip_lifetime` | Acesso vitalício | Pagamento único | BRL/USD/EUR 109,90 em cada moeda |

Os valores numéricos de BRL, USD e EUR são iguais por decisão do responsável; não converter BRL por câmbio. Cada moeda continua indisponível até que exista um Price Stripe ativo, validado e cadastrado no segredo correspondente. A dashboard atual é uma demonstração local via `localStorage`, não é um catálogo de produção nem fonte confiável de preço.

## Arquitetura atual que deve ser preservada

- Aplicação Nuxt 3, Vue 3, TypeScript, Nitro e Supabase.
- Página do checkout: `pages/assinaturavip.vue`.
- Textos e idiomas: `utils/vip-checkout-i18n.ts` (português, inglês, espanhol, italiano, neerlandês e francês).
- Pix vitalício: `POST /api/checkout/pix` com `plan_key: vip_lifetime`.
- Pix Automático mensal: `POST /api/checkout/vip-monthly`, com `visitor_id` e `accepted_recurring: true`.
- Consulta do pagamento Pix: `GET /api/checkout/status`.
- Chaves de pagamento já usadas pelo servidor ficam em `app_secrets` do Supabase. A chave publicável pode ser entregue ao navegador; chave secreta e segredo de webhook nunca.
- O frontend gera eventos de funil pela integração existente `/api/track`. Preserve os eventos já existentes de seleção de plano, clique para assinar, Pix gerado, cópia do Pix e abandono de Pix. Acrescente eventos de cartão com nomes próprios, sem registrar dados de cartão ou dados pessoais.
- O identificador `vip-checkout-visitor-id` é um identificador de análise/continuidade do navegador. Não é identidade verificada, prova de compra, id do Telegram nem autorização de acesso.

O ponto `#vip-stripe-checkout-mount` aparece somente no estado inicial do pop-up em `pages/assinaturavip.vue`. Ao implementar, transforme o modal numa escolha explícita de método e monte o Stripe Embedded Checkout ali apenas depois de a sessão ser criada no servidor. Não mostre um formulário falso ou botão de cartão que ainda não processa pagamento.

## Stripe já existente: não confundir com o checkout VIP

Há integração Stripe anterior para itens do funil de conversa em `app.vue`:

- `POST /api/checkout/stripe-intent` cria um PaymentIntent para aqueles itens.
- `POST /api/checkout/stripe-session` cria Checkout Session embutida, mas usa `mode=payment` e aceita `amount`, `currency` e `title` do navegador.
- `POST /api/webhooks/stripe` também atende esses pagamentos e pode liberar o chat.

Esses endpoints não são seguros como catálogo do VIP: o preço e a moeda chegam do cliente, o endpoint de sessão está configurado para compra única e o webhook mistura efeitos do chat. Não use `source: links_stripe`, não passe `vip_monthly` para a lógica antiga e não altere a UX do `app.vue` para implementar o VIP. Prefira endpoints isolados para a oferta VIP. Se optar por consolidar endpoints, primeiro separe os efeitos por origem/plano e demonstre que o chat antigo não muda.

## Desenho de interface

1. Mantenha a página de oferta, o avatar, a copy e os dois planos como estão.
2. Ao tocar em **Assinar agora**, abra o pop-up existente com o plano, preço, termos corretos e métodos disponíveis para aquela moeda.
3. No Brasil, mantenha Pix como hoje. Cartão pode ser oferecido somente se também estiver configurado; nunca troque Pix por Stripe automaticamente sem escolha clara.
4. Fora do Brasil, ofereça cartão Stripe somente quando existir preço ativo para o plano e a moeda selecionados. Não apresente valores fictícios, indisponíveis como se fossem pagáveis, ou rótulos em moeda diferente do preço cobrado.
5. Ao escolher Stripe, carregue o Embedded Checkout dentro do espaço `#vip-stripe-checkout-mount`, sem sair do pop-up. Mostre estado de carregamento, erro recuperável, botão de voltar para métodos, e permita desmontar/limpar o componente ao fechar o modal ou trocar de plano.
6. Preserve largura móvel, rolagem interna do pop-up, foco, Escape, leitor de tela e os textos já simplificados. Todos os novos rótulos e mensagens precisam das seis traduções existentes.
7. Exiba a periodicidade antes da confirmação: mensal = cobrança recorrente a cada 30 dias; vitalício = cobrança única. O resumo, a moeda e o valor devem coincidir com a sessão que o servidor realmente criou.

## Backend e fonte confiável de preço

Crie um endpoint VIP próprio, por exemplo `POST /api/checkout/stripe-vip-session`. O cliente pode enviar somente uma chave de plano permitida, moeda escolhida entre as suportadas e metadados mínimos, como `visitor_id` válido. Ele nunca pode decidir o valor cobrado.

O endpoint deve:

1. Validar plano contra enum fechado: apenas `monthly` e `lifetime` (mapear internamente para `vip_monthly` e `vip_lifetime`). Rejeitar `custom`, títulos livres, valores livres, moeda arbitrária e price IDs recebidos do browser.
2. Resolver no servidor um `price_id` Stripe ativo para o par plano/moeda a partir de configuração persistida e protegida. Não usar `localStorage`, `defaultSettings` da página, `amount`, `title`, `currency` ou qualquer valor de UI como fonte de preço.
3. Manter preço BRL, USD e EUR isolado. O país/locale do navegador pode sugerir uma moeda para a interface, mas não altera o valor e não dá autoridade ao cliente. Se a moeda solicitada não estiver explicitamente configurada para aquele plano, responder indisponível sem fallback para BRL.
4. Confirmar que o `price_id` está ativo, na moeda esperada e tem o tipo esperado: recorrente para `monthly`; sem recorrência para `lifetime`. Há uma nuance importante: `interval=month` cobra por mês de calendário e as datas podem variar em meses curtos; não significa sempre 30 dias corridos. A copy atual do Pix fala em 30 dias. Antes de publicar Stripe, alinhe o Price/cadência e o texto mostrado: se a oferta promete exatamente 30 dias, configure uma cadência compatível e confirme-a na conta Stripe; se usar mensalidade de calendário, ajuste a copy para dizer “todo mês”. Nunca prometa uma cadência diferente da que o Stripe realmente cobrará. A configuração deve guardar também o valor exibido e comparar com o Price do Stripe, ou recuperar o Price do Stripe no servidor e devolver seu preço formatado para a UI.
5. Criar um registro interno de pagamento pendente com um UUID próprio antes de criar a sessão. Colocar esse UUID, plano, origem (`vip_telegram`) e moeda no metadata da Checkout Session e, para `subscription`, também no metadata de assinatura quando aplicável. Depois salvar `session.id`, Customer/Subscription IDs se disponíveis e o estado. Se a criação Stripe falhar, marcar o registro falho; se não for possível persistir a associação, não retornar `client_secret` como se a compra estivesse rastreada.
6. Usar chave de idempotência por tentativa de compra no servidor e rate limit adequado. Um clique duplo/retry de rede não pode criar duas assinaturas. Não confiar num idempotency key do cliente como autorização; vincule-o a registro interno e visitante.
7. Limitar origens de retorno a `wanessabsx.vercel.app` e aos hosts locais de desenvolvimento explicitamente permitidos. Não aceite `return_origin` aberto do cliente, pois isso permite redirecionamento externo.
8. Não registrar `client_secret`, chaves Stripe, dados de cartão, CPF, e-mail ou payloads completos de Stripe nos logs. Registre IDs internos/Stripe e erros sanitizados.

Não há hoje um catálogo Stripe VIP persistente. Antes de ativar Stripe, implemente e documente uma fonte de configuração do servidor. Pode ser tabela/configuração Supabase com acesso administrativo protegido ou `price_id`s e preços em configuração de servidor. Se criar tabela/migration, use RLS apropriada, não deixe escrita pública, documente como o admin altera preços e trate alterações de preço sem quebrar sessões existentes. A UI não deve editar preço real por `localStorage`.

## Sessões e experiência de cartão

Use Checkout Sessions do Stripe em modo embutido para manter a experiência no pop-up, e configure `mode` conforme o produto:

- `subscription` para `vip_monthly`, usando um Price recorrente criado/configurado no Stripe.
- `payment` para `vip_lifetime`, usando um Price de pagamento único.

Envie `line_items[0][price]` com o Price ID escolhido pelo servidor. Não crie uma assinatura com um Price de pagamento único, nem tente fazer “mensal” com uma cobrança única repetida pelo frontend. A Stripe deve administrar o ciclo e o estado da assinatura.

O navegador recebe apenas o `client_secret` efêmero necessário para montar o componente, a chave publicável e um resumo não autoritativo do pedido. Não envie a chave secreta. Não crie campos HTML próprios para número do cartão, validade ou CVC; não leia nem persista dados de cartão. O checkout hospedado/embutido da Stripe deve coletar diretamente os dados de pagamento. Não use `PaymentIntent` genérico para representar a assinatura mensal.

Não pré-preencha nome, e-mail, telefone ou CPF com dados inventados. O Stripe Checkout pode pedir e-mail para criar/gerenciar Customer ou enviar recibo; se o fluxo precisar desse dado, deixe a Stripe solicitar ao comprador ou use somente dado real fornecido voluntariamente. O checkout VIP via Stripe não chama as rotas de pessoa/CPF.

## Segurança vista por DevTools e pentest

Não tente esconder os endpoints. Qualquer rota chamada pelo navegador aparece em Network/DevTools e pode ser chamada também por `curl` ou por um script. Minificar JavaScript, trocar nomes de rotas, bloquear o menu de contexto ou restringir CORS não impede um pentester. A segurança deve existir no servidor, mesmo que o atacante conheça a URL e envie qualquer corpo HTTP.

É normal que o navegador veja:

- a URL pública do endpoint de criação de sessão VIP;
- `plan_key` e moeda escolhidos, como dados de entrada não confiáveis;
- a chave publicável `pk_...`, o `client_secret` da sessão embutida e IDs públicos/aleatórios necessários para exibir ou acompanhar a própria compra;
- chamadas de rede feitas pelo componente hospedado/embutido da Stripe.

Ver esses itens, isoladamente, não deve permitir alterar o valor, ler compras alheias, aprovar um pagamento ou entrar no canal. Trate o `client_secret` como credencial temporária da sessão: retorne somente ao comprador que iniciou aquela tentativa, não grave em `localStorage`, não envie ao analytics, não inclua em URL, log, erro ou metadata, e descarte-o ao fechar/expirar a sessão.

Nunca pode chegar ao navegador, ao bundle público, aos arquivos do repositório, ao GitHub, a logs ou a uma resposta HTTP:

- `STRIPE_SECRET_KEY` (`sk_...`) ou chave restrita (`rk_...`);
- segredo de assinatura de webhook (`whsec_...`), token de bot do Telegram, Supabase `service_role`/service key ou credenciais de banco;
- arquivos `.env` reais, JSON de credenciais, dumps, tokens copiados do painel ou valores secretos em screenshots/documentação.

Regra absoluta para variáveis sensíveis: segredo só em armazenamento de secrets do servidor (por exemplo, Supabase `app_secrets` lido exclusivamente por código server-side, ou configuração privada da Vercel). Não prefixar com `NUXT_PUBLIC_`, `NEXT_PUBLIC_`, `VITE_` ou qualquer prefixo que publique o valor. Não commitar `.env`, `.env.local`, arquivos de configuração com valores reais nem `.env.example` preenchido com credenciais; `.env.example` pode conter apenas nomes e placeholders claramente falsos. Adicionar arquivos reais ao `.gitignore`, mas não confiar só nisso: antes do commit, procurar segredos no diff staged e no histórico recente. Se um segredo já foi commitado, removê-lo do arquivo não basta: revogar/rotacionar imediatamente e tratar a limpeza do histórico separadamente.

O endpoint público de criação de sessão precisa ser seguro sem login, pois o lead ainda não tem conta. Isso significa permissão mínima: só pode criar uma tentativa pendente de um produto permitido. Cada chamada deve:

1. Validar corpo com schema estrito e limites de tamanho. Aceitar somente campos necessários; rejeitar propriedades inesperadas ou ignorá-las sem usá-las. Não aceitar `amount`, preço, `price_id`, título, `source`, `status`, `paid`, `provider`, `livemode`, Subscription ID ou `return_url` arbitrários do navegador.
2. Recalcular plano, moeda, preço, modo Stripe e metadados no servidor. Alterar `amount=0.01`, mandar `plan_key=custom`, `currency=BRL`, um `price_id` de outro produto ou `status=approved` pelo DevTools não pode mudar a cobrança nem liberar benefício.
3. Tratar `visitor_id` como dado controlado pelo cliente. Validar apenas formato e tamanho; nunca usá-lo sozinho para autenticar, recuperar cadastro, conceder acesso, provar compra, vincular Telegram ou decidir autorização.
4. Criar uma ordem interna pendente e associá-la à Session do Stripe. Uma Session paga só pode atualizar aquela ordem quando ID, plano, moeda, valor, ambiente e origem coincidirem com a configuração do servidor.
5. Retornar o mínimo necessário: estado de criação, resumo calculado pelo servidor, ID não sequencial/aleatório e o segredo efêmero exigido para montar a sessão. Nunca retornar service role, chaves secretas, dados de outros compradores, conteúdo bruto de `app_secrets` ou resposta completa da API Stripe.
6. Usar idempotência persistente e limitação de requisições compartilhada entre instâncias. Rate limit em memória não é suficiente na Vercel/serverless. Definir limites para criação de sessões, reenvios e consulta de status; usar sinais adicionais contra abuso sem bloquear compradores legítimos.
7. Usar erros simples para o visitante; detalhes sanitizados no servidor. Não devolver stack trace, SQL, nome de tabela, configuração, token ou resposta bruta do provedor.

Não use CORS ou `Origin` como autorização: ferramentas de pentest não precisam obedecer às regras do navegador e conseguem forjar cabeçalhos. Pode haver allowlist de origem como camada adicional e para reduzir CSRF, mas validação, autorização, limites e assinatura continuam obrigatórios. Não abra CORS com `*` junto de credenciais. Valide também `Host` e o destino de retorno no servidor para impedir open redirect.

### Condições e limites de rate limit

Implementar limites no servidor com contador atômico em armazenamento compartilhado entre instâncias (Redis/Upstash ou RPC transacional protegido no Postgres). Não usar apenas `Map` ou memória do processo: instâncias serverless reiniciam e cada réplica teria um contador diferente. Armazenar HMAC/hash dos identificadores e TTL curto, evitando guardar IP bruto. Só confiar no IP encaminhado pela cadeia de proxy confiável da Vercel.

Limites iniciais recomendados para implementar e calibrar em staging:

| Operação | Limite inicial | Chaves aplicadas em conjunto | Comportamento ao exceder |
|---|---|---|---|
| Criar sessão Stripe VIP | 5 tentativas por 10 min por visitante e 10 por 10 min por IP | HMAC de `visitor_id` válido + HMAC do IP | `429` com `Retry-After`; não criar sessão nem cobrança |
| Sessões pendentes | Até 3 por visitante + plano + moeda | visitor + plano + moeda | Reutilizar uma sessão idempotente ainda válida ou pedir para aguardar; não criar cobranças duplicadas |
| Consultar status da tentativa | 5 consultas por minuto por capability da compra e 20 por 10 min por IP | token opaco de posse + IP hash | `429` com `Retry-After`; frontend interrompe polling até a janela permitir nova tentativa |
| Receber webhook Stripe | Sem cota baixa por usuário/IP; corpo máximo inicial 1 MB, timeout e concorrência global controlados | Após validar, deduplicar por `event.id` | Evento repetido retorna 2xx sem repetir efeitos; falha de persistência retorna 5xx para permitir retry Stripe |

Esses números são defaults de partida, não garantem segurança sozinhos. Testar em staging com clique duplo, retries de rede e usuários atrás do mesmo NAT; ajustar para reduzir abuso sem bloquear uma rede inteira. Respostas 429 não devem dizer qual identificador atingiu o limite. Requisições repetidas da mesma tentativa usam idempotência e reaproveitam a Session; novas tentativas continuam sujeitas à cota. Se o armazenamento compartilhado do rate limit estiver indisponível, não liberar a operação sem limite: retornar erro temporário seguro ou aplicar um fallback restritivo documentado.

Webhook não pode receber rate limit baixo: Stripe envia retries legítimos e eventos podem chegar em rajada. A proteção principal é assinatura válida, corpo limitado, timeout, concorrência controlada e idempotência. Rate limit de borda pode mitigar DoS, mas deve permitir retries Stripe e nunca substituir a validação criptográfica.

### Consulta de status e IDOR

Não transforme `GET /api/checkout/status?id=...` do Pix em consulta Stripe nem exponha uma busca que aceite qualquer `payment_id` e devolva detalhes de qualquer pedido. Um UUID difícil de adivinhar reduz enumeração, mas sozinho não é autorização. Use um identificador de pedido aleatório e uma capability/token assinado com escopo para consultar apenas aquele pedido, ou outra prova de posse vinculada à tentativa. Responda só `pending`, `paid`, `failed` ou `expired` e dados mínimos da própria compra; nunca e-mail, nome, CPF, IDs de Customer/Subscription, metadata interna ou segredo.

A consulta de status nunca aceita `paid=true` nem atualiza pagamento. Ela lê o estado que o webhook verificado persistiu. Rate limit e backoff devem funcionar entre réplicas; não consulte a Stripe a cada render ou em loop rápido do navegador.

#### Falha encontrada no fluxo existente; não repetir

No código atual de Pix, `payments.status` não é prova independente de pagamento:

- Em `server/api/checkout/status.get.ts`, transações avulsas cujo registro já esteja `approved` são retornadas como aprovadas antes de consultar a SyncPay. Se alguém com permissão de escrita no banco mudar `payments.status` de `pending` para `approved`, o checkout pode mostrar sucesso sem a confirmação remota naquele pedido de status.
- Na mesma rota, quando a consulta SyncPay falha ou não há credenciais, alguns caminhos retornam o `row.status` salvo. O caminho mensal também trata assinatura `active` como paga mesmo sem exigir explicitamente que a primeira cobrança esteja confirmada. Não copiar esses comportamentos para Stripe/VIP.
- `pages/assinaturavip.vue` usa esse retorno para mostrar a mensagem local de pagamento confirmado. O código inspecionado não mostra a concessão do acesso ao canal VIP a partir dessa resposta; portanto a alteração pode falsificar a confirmação visual, mas não encontrei um fluxo atual que admita automaticamente a pessoa no canal por esse caminho.
- `server/api/webhooks/syncpay.post.ts` aceita assinatura quando `SYNCPAY_WEBHOOK_SECRET` está ausente (`verifySyncPaySignature` retorna `true`). A rota Stripe antiga também deixa passar a requisição quando `whsec` está vazio. Webhook de produção precisa falhar fechado quando faltar segredo.

Antes de ativar Stripe ou usar o status para liberar VIP, corrigir/documentar estes pontos. O status persistido deve ser apenas uma projeção/reconciliação; o critério de concessão deve verificar a fonte externa de pagamento. Para Pix, consultar a SyncPay no servidor e conferir ID da transação, valor, moeda, plano e estado pago. Para Stripe, validar evento assinado e confirmar Session/PaymentIntent/Invoice na Stripe, associando ao pedido interno, antes de liberar. Se o provedor estiver indisponível, mostrar “aguardando confirmação” ou erro temporário; nunca converter um `status=approved` do banco em pagamento confirmado por fallback.

Para Pix Automático, autorização/mandato `active` sozinha não prova a primeira cobrança liquidada. Exigir a cobrança inicial em estado pago confirmado. Renovações podem estender o período apenas após cada cobrança paga confirmada; eventos de mandato ou assinatura sem cobrança não concedem período.

RLS/grants devem impedir que `anon` e clientes `authenticated` alterem `payments.status`, `approved_at`, `metadata`, preços ou entitlements. Mas RLS **não impede** alguém com acesso de owner/SQL/service role ao Supabase; `service_role` ignora RLS. Para que a aplicação não confie numa edição manual, verificar o estado no provedor antes de qualquer liberação e reconciliar status divergente. Registrar concessões em trilha idempotente e auditável. Uma liberação manual de admin deve ser uma ação separada, protegida e auditada, nunca uma edição de `payments.status`.

### Acesso ao banco e às configurações

- Nenhum cliente do navegador pode ler/escrever `app_secrets`, catálogo Stripe privado, registros internos de pagamentos, eventos de webhook ou entitlements diretamente.
- Se o front usa Supabase anon/public key, essa chave é pública por natureza: RLS precisa negar leitura e escrita indevidas. Nunca colocar a service role no cliente.
- Rotas do servidor usam o privilégio mínimo possível e consultam somente as linhas/colunas necessárias. Configuração e alteração de preços exigem autenticação e autorização admin no servidor; ocultar uma tela admin no front não protege a API.
- Toda associação de uma ordem a Customer, Subscription, Session, usuário do Telegram ou visitor precisa ser checada no servidor. Não confie em IDs ou metadata enviados pelo browser.

### Supabase RLS e permissões: regra obrigatória

**O checkout VIP ainda não tem a integração Stripe implementada e este repositório não contém migrations Supabase para confirmar as políticas atuais do projeto remoto.** Portanto, as regras abaixo são o modelo obrigatório para a implementação futura, não uma afirmação de que a produção já esteja protegida. Antes de criar tabelas ou deploy, o Grok deve inspecionar o projeto Supabase correto, as permissões/grants atuais, as políticas e o Data API. Não sobrescrever políticas existentes às cegas.

No Postgres, **GRANT e RLS são duas barreiras diferentes**: primeiro o papel precisa ter privilégio de tabela; depois uma policy decide quais linhas/operações são permitidas. Ativar RLS sem revogar grants antigos pode deixar caminhos de escrita. RLS também não substitui autorização na API. A chave secreta/service role tem `BYPASSRLS`, então toda rota que a usa precisa fazer suas próprias checagens de posse, plano, estado e origem; nunca confiar que RLS limitará uma consulta feita com essa chave.

#### Matriz de acesso esperada

| Tabela/dados | `anon` | `authenticated` (cliente) | Servidor/service role | Regra |
|---|---|---|---|---|
| `app_secrets` e credenciais | Sem `SELECT`, `INSERT`, `UPDATE` ou `DELETE`; nenhuma policy pública | Sem acesso direto | Somente rotas servidoras necessárias | Nunca entregar valor de segredo por endpoint, view ou RPC |
| `payments` e tentativas Stripe/Pix | Sem acesso direto | Sem acesso direto, mesmo se usuário autenticado | Rotas server-side e webhook, após validação explícita | Consulta pública de status é feita por API com capability de posse e resposta mínima; não abrir tabela |
| Catálogo privado de `price_id`s/configuração Stripe | Sem acesso | Sem acesso | API server-side; escrita só por processo admin autorizado | `price_id`, estado interno e metadata permanecem privados |
| Preços que podem aparecer na oferta | Só leitura dos campos realmente públicos, se a UI precisar | Só leitura dos campos públicos | Servidor administra | Preferir endpoint público que devolva DTO mínimo; nunca expor a tabela privada inteira |
| `stripe_webhook_events`/deduplicação | Sem acesso | Sem acesso | Somente webhook/servidor | `event.id` único; payload bruto e headers não ficam públicos |
| `vip_entitlements`, associação Telegram e tokens de resgate | Sem acesso | Sem acesso direto | Bot e servidor, com validação de estado e uso único | Nunca deixar o browser conceder ou ler acesso de outra pessoa |
| `rate_limits`/contadores internos | Sem acesso | Sem acesso | Serviço de rate limit | Usar armazenamento compartilhado; não expor IP hash ou contadores |

Para tabelas internas em schema `public`, exigir `ENABLE ROW LEVEL SECURITY` e remover privilégios desnecessários de `anon`, `authenticated` e `PUBLIC`; sem necessidade real de cliente, não criar policies para esses papéis. Exemplo de intenção (revisar grants e owner no projeto real antes de aplicar):

```sql
alter table public.payments enable row level security;
revoke all on table public.payments from public, anon, authenticated;
```

Aplicar o mesmo padrão às tabelas internas novas de preço, eventos, entitlement e rate limit. Se uma tabela não precisa da Data API, não conceder acesso REST/GraphQL ao cliente. Avaliar desligar a Data API somente se o restante do app não depender dela; não desligar globalmente sem auditar os outros fluxos.

Se a UI precisar consultar preço sem passar pelo Nitro, não dar `SELECT` em `app_secrets`, `payments` ou no catálogo privado. Criar uma superfície separada com apenas `plan_key`, moeda, valor público, periodicidade e disponibilidade. Views do Postgres podem ignorar RLS por padrão; usar `security_invoker = true` (Postgres 15+) e grants/policies mínimos, ou mais simplesmente devolver um DTO filtrado por endpoint server-side. Nunca incluir `price_id`, chaves, metadata interna ou campos de Customer/Subscription nesse DTO.

Se houver administração de preços por painel, esconder o botão não é autorização. Cada chamada administrativa deve autenticar e autorizar no servidor. Se policy usar Supabase Auth, exigir o papel `authenticated` **e** uma verificação de dono/admin baseada em fonte confiável (por exemplo, `auth.uid()` comparado com tabela protegida ou claim de `app_metadata` controlada pelo servidor). Não autorizar por `user_metadata` editável pelo usuário. Policies `UPDATE` precisam de `USING` e `WITH CHECK` para impedir que alguém altere a linha e transfira a propriedade. Não criar policy ampla `TO authenticated USING (true)`.

Não usar `visitor_id`, fingerprint, IP, `payment_id` ou UUID enviado pelo browser como identidade para RLS. Esta oferta é pública e pode não ter login Supabase; esses valores não provam posse. Para status, usar token aleatório/capability assinado e com escopo, validado pela rota server-side. A chamada ao banco com service role ainda precisa filtrar pelo token/ordem correta e retornar somente a compra que aquele token pode consultar.

RLS não protege automaticamente views, funções RPC, Edge Functions ou rotas Nitro. Para views, definir `security_invoker` ou negar acesso público. Para RPC, conceder `EXECUTE` apenas aos papéis necessários, revisar `SECURITY DEFINER`, `search_path` e autorização interna. `SECURITY DEFINER` não deve ser usado para contornar policy; se for indispensável, restringir schema, grants e checagem de usuário dentro da função.

#### Testes de permissões que o Grok deve incluir

Para cada migration/policy, testar com roles/chaves reais de teste e validar grants e políticas, não apenas chamadas pelo service role:

1. `anon` não lê nem escreve `app_secrets`, `payments`, configuração privada, eventos, entitlements, tokens Telegram ou rate limits.
2. `authenticated` comum também não consegue consultar pagamentos ou alterar preço/estado de outro usuário; autenticado não significa admin.
3. Uma conta admin autorizada altera somente o catálogo permitido pela rota/policy admin. Uma conta comum, `anon`, `user_metadata` adulterado ou chamada direta à API não consegue fazer a mesma alteração.
4. Um cliente não consegue mudar `payment.status`, marcar `paid`, trocar `visitor_id`, mover uma ordem para outra conta, fornecer `price_id` próprio ou vincular outro Telegram ID.
5. A interface consegue exibir apenas preço público e disponibilidade, sem receber service role, secrets, IDs privados Stripe ou metadata.
6. O webhook acessa linhas internas pelo servidor, mas só efetiva a linha associada à Session confirmada e ao evento validado.
7. Conferir também `GRANT`, policies existentes, views/RPC e configuração de exposição da Data API. Rodar `supabase test db`/testes RLS apropriados e revisar advisors antes do deploy.

Não considerar o teste aprovado só porque `service_role` consegue ler tudo: esse papel ignora RLS e serve apenas para demonstrar o caminho do servidor. O teste de bloqueio precisa usar `anon` e `authenticated` sem privilégios especiais.

### Proteção de webhook e prevenção de replay

- Webhook recebe chamadas da Stripe, não do navegador; o DevTools não é a origem de autoridade. Verificar assinatura com corpo bruto e segredo daquele endpoint, tolerância de timestamp e ambiente correto; falhar fechado se a chave estiver ausente.
- Persistir `event.id` com unicidade. Repetir o mesmo evento, reordenar eventos antigos ou reenviar um evento de outro ambiente não pode duplicar cobrança, estender duas vezes a assinatura ou conceder acesso indevido.
- Não aceitar um POST público com `status=paid` como substituto do webhook. A página de retorno chama apenas uma consulta limitada; fulfillment sempre no servidor.
- Isolar o webhook VIP da regra antiga de desbloqueio do chat. Uma compra VIP não pode liberar chat ou outra oferta por coincidência de `source`/metadata.

### Como revisar a exposição sem confundir visibilidade com falha

No DevTools, é esperado ver a URL e dados públicos do fluxo. Verifique que não aparecem respostas com `sk_`, `rk_`, `whsec_`, service role, e-mail/CPF sintético, payload bruto do Stripe ou metadata privada. Em um teste autorizado, repita chamadas fora do navegador e adultere cada campo: preço, moeda, plano, `price_id`, status, visitor/order ID, origem e URL de retorno. Resultado correto é a API recusar ou ignorar o campo e manter preço e estado definidos pelo servidor.

Teste também: consultar pedido de outra sessão (IDOR), repetir criação e webhook (replay), chamar webhook sem assinatura/assinatura incorreta, expirar ou cancelar o Checkout, tentar trocar de test mode para live, exceder rate limit e enviar JSON muito grande/campos desconhecidos. Nenhum desses testes pode mudar a compra para paga ou conceder acesso. Não faça pentest contra produção sem autorização e janela combinada; usar Stripe Test Mode e um ambiente de staging.

Use HTTPS, security headers e CSP como defesa em profundidade. Ao permitir Stripe no CSP, inclua apenas os domínios oficiais estritamente necessários para script/frame/conexão; não desative CSP globalmente para fazer o embed funcionar. Essas medidas ajudam, mas não substituem as validações server-side.

## Separação obrigatória do Pix e do auto-preenchimento protegido

- Pix Automático mensal continua em `server/api/checkout/vip-monthly.post.ts` e Pix vitalício em `server/api/checkout/pix.post.ts`.
- Preserve integralmente o bloco de auto-preenchimento por `visitor_id` que o usuário escreveu para o Pix Automático. Não reescreva nem mova esse trecho.
- A Stripe não chama `/api/fake-person`, `/api/cpf` ou `/api/cpf/validate`, nem usa nome, e-mail ou CPF sintético. Não derive esses dados de `visitor_id`.
- Não altere `server/utils/fake-person.ts`, `server/api/cpf/index.get.ts`, `server/api/cpf/validate.get.ts`, `server/api/fake-person.get.ts` ou `docs/FAKE-PERSON-CPF.md`.
- Não misture estado de Pix (`pixCode`, QR, mandato) com estado Stripe (Session, Subscription, `client_secret`). Um fechamento do modal de Pix não deve cancelar ou apagar uma sessão Stripe, e vice-versa.
- Pix continua disponível onde já está ativo. Se Stripe falhar, mostre erro e opção de tentar novamente ou voltar; nunca simule pagamento aprovado nem converta silenciosamente para Pix.

## Webhook, idempotência e confirmação

Crie a rota em `server/api/webhooks/stripe-vip.post.ts`, publicada como `POST /api/webhooks/stripe-vip`, com signing secret próprio. A rota é pública por desenho, mas só uma requisição com assinatura Stripe válida pode alterar pagamento. Não use a página de sucesso, query string, `client_secret`, armazenamento local ou resposta do browser para aprovar compra. Não criar `GET` que revele configuração/estado interno.

#### Configurar o endpoint de webhook

1. No **Stripe Workbench → Webhooks**, crie primeiro um destino no modo Test para `https://wanessabsx.vercel.app/api/webhooks/stripe-vip`. Não reutilize o destino antigo que também libera o chat.
2. Selecione apenas estes eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` e `customer.subscription.deleted`. Adicione eventos de reembolso/disputa somente quando a política de reembolso estiver implementada; não assine todos os eventos.
3. Copie o signing secret `whsec_...` daquele destino para o armazenamento de secrets do ambiente Test. Ele é diferente da API secret key (`sk_...`) e do ID do destino (`we_...`). Nunca coloque o valor no Git, DevTools, prompt ou documentação.
4. Para Live, configure destino e segredo Live separados. Não aceitar `livemode` do cliente para escolher segredo ou modo; o modo esperado vem da configuração privada do servidor. Nunca misturar `whsec_` de Test com Live.
5. Para local, use Stripe CLI, por exemplo `stripe listen --forward-to http://127.0.0.1:3000/api/webhooks/stripe-vip`. O `whsec_...` emitido pelo CLI é local e não serve no Workbench/produção.
6. Disparar um evento de teste assinado, confirmar persistência, reenviar o mesmo `event.id` e confirmar que nenhum efeito duplica. Testar assinatura inválida e banco indisponível: inválida não altera nada; falha transitória antes de persistir responde 5xx para retry.

A rota aceita somente POST. Ler o corpo HTTP bruto uma vez e validar `Stripe-Signature` antes de parsear o JSON, usando `constructEvent` da biblioteca oficial Stripe quando possível. Verificar timestamp, ambiente esperado, tipos permitidos, associação da Session ao pagamento pendente e valores/plano contra o catálogo do servidor. Depois de persistir de modo idempotente, responder 2xx rapidamente. Sem segredo, com assinatura inválida ou corpo alterado, falhar fechado e não mutar banco; se a persistência falhar, responder 5xx em vez de confirmar recebimento.

- Verifique `Stripe-Signature` com o corpo HTTP bruto, sem parsear/reformatar o JSON antes da verificação, usando a biblioteca oficial `stripe` e `constructEvent` quando viável.
- Falhe fechado: se o segredo `whsec_...` estiver ausente, assinatura inválida, timestamp fora da tolerância, corpo inválido ou evento de outra conta/modo, não atualize o pagamento nem libere acesso. O webhook atual `/api/webhooks/stripe` tem uma ramificação que aceita sem assinatura se o segredo estiver vazio; não copiar esse comportamento.
- Salve `event.id` com restrição única/idempotência antes de aplicar efeitos. A Stripe reenvia eventos; repetição deve retornar sucesso sem conceder novo acesso ou estender período novamente.
- Valide metadata, `livemode`, moeda, plano, preço/valor, Session ID e associação com o pagamento pendente local. Busque a Session/Subscription no Stripe se precisar confirmar campos ausentes; não confie só em metadata recebida.
- Para compra vitalícia, só considerar paga após evento confirmado e `payment_status=paid`; liberar uma vez e sem expiração.
- Para assinatura mensal, confirmar a primeira cobrança paga antes de conceder o período. Acompanhar renovações por `invoice.paid` e falhas por `invoice.payment_failed`; acompanhar cancelamento/estado por `customer.subscription.updated` e `customer.subscription.deleted`. Definir acesso até `current_period_end` quando houver cancelamento no fim do ciclo e política explícita para atraso/falha, em vez de apagar acesso por evento fora de ordem.
- Escopo inicial recomendado de eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Se métodos de pagamento assíncronos não forem habilitados, ainda assim trate `payment_status` corretamente.
- Responder 2xx rapidamente depois de persistir o evento e enfileirar efeitos demorados. Retentar efeitos de concessão sem reprocessar o pagamento financeiro.
- Dar suporte a estorno/chargeback (`charge.refunded`, `charge.dispute.created`) com estado de revisão/revogação segundo política definida. Não marcar como novo pagamento.

## Entrega do acesso ao Telegram

Pagamento aprovado na Stripe não revela automaticamente o `telegram_user_id`: `visitor_id` do navegador não é o ID do Telegram. Antes de liberar o canal, localize a integração de bot e associação de compra já existente. Se não existir associação segura, implemente vínculo com token aleatório, curto, de uso único e validade limitada (por exemplo, retornar um deep link para o bot com token opaco assinado/armazenado no servidor). O bot associa esse token ao Telegram user ID somente quando a pessoa inicia conversa; só então o servidor valida a compra paga e aprova a solicitação de entrada.

- Não devolver link genérico permanente do canal VIP na resposta de criação da sessão, página de sucesso ou código cliente.
- Use convite individual/aprovado pelo bot, com `creates_join_request`/fluxo equivalente que o bot já usa, e associe a solicitação ao Telegram user ID após validar o token e o entitlement.
- Em assinatura recorrente, renovações estendem o fim do acesso; cancelamento impede a próxima cobrança, mas não deve cortar o período já pago se a política e a Stripe indicarem acesso até o fim do ciclo. Falha de renovação, reembolso e chargeback precisam de regras explícitas e efeitos idempotentes.
- Em plano vitalício, não expirar o entitlement. Nunca rebaixar um vitalício por evento de assinatura mensal.
- Não prometa acesso automático até que o webhook e a ligação com o bot tenham sido testados de ponta a ponta.

## Segredos e configuração

Hoje as rotas existentes leem `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` e `STRIPE_WEBHOOK_SECRET` de `app_secrets` no Supabase. Antes de usar isso no VIP, decida se a configuração será compartilhada ou separada; para endpoint/webhook isolados, prefira chaves explícitas como `STRIPE_VIP_WEBHOOK_SECRET` ou nome equivalente, sem quebrar a integração antiga. Restrinja leitura a rotas de servidor com service role e nunca exponha a tabela ou valores ao cliente.

- Use chaves `sk_test_...` + webhook de teste durante desenvolvimento; valores de produção só depois de testes completos.
- `pk_test_...`/`pk_live_...` pode ser exposta ao browser conforme o uso da Stripe.js.
- `sk_...`, `rk_...` e `whsec_...` são segredos. Não cole no Git, código, `.env` versionado, navegador, logs, documentação ou chat.
- Não faça deploy com credenciais de teste ou com configuração ausente; mantenha o método de cartão indisponível até todos os campos de configuração necessários existirem.
- O signing secret pertence a um endpoint e a um modo (Test/Live) específicos. Use secrets separados por ambiente; nunca escolha qual segredo usar a partir de um parâmetro do navegador.

## Eventos de tracking

Manter os eventos Pix existentes. Adicionar eventos distintos, sem PII, por exemplo:

- `vip_card_method_selected`
- `vip_stripe_session_created`
- `vip_stripe_checkout_opened`
- `vip_stripe_checkout_error`
- `vip_stripe_payment_confirmed` (somente após webhook confirmado; não ao carregar página de sucesso)
- `vip_stripe_subscription_renewed`
- `vip_stripe_subscription_past_due`
- `vip_stripe_subscription_canceled`

Evite contar uma Session repetida como nova compra. Identifique por payment ID/Stripe event ID no lado servidor; no tracking público envie apenas dados agregados e metadados mínimos (`plan_key`, moeda, origem), nunca e-mail, nome, CPF, token, `client_secret` ou dados de cartão.

## Testes de aceitação antes de ativar em produção

Use Stripe Test Mode e teste com eventos de webhook assinados pelo Stripe CLI ou pelo Workbench. Não faça cobranças reais durante desenvolvimento.

1. BRL mensal via Pix segue exatamente o fluxo atual; BRL vitalício via Pix segue exatamente o fluxo atual.
2. Plano mensal Stripe cria Session `subscription` com preço/intervalo mensal correto; vitalício cria Session `payment` com preço único correto.
3. Uma requisição adulterada com valor menor, currency não suportada, `price_id` próprio, plano desconhecido ou título arbitrário não muda o preço e falha com erro seguro.
4. USD/EUR permanecem indisponíveis até os preços respectivos serem configurados; não ocorre conversão de BRL nem fallback.
5. Clique duplo, retry após timeout e webhook duplicado não criam cobranças/assinaturas ou concessões duplicadas.
6. Checkout cancelado, expirado, recusado, com autenticação 3DS e com falha de pagamento não libera acesso; webhooks válidos atualizam o estado corretamente.
7. Falta de segredo, assinatura errada, corpo alterado, evento de teste em modo live e evento Stripe não relacionado são rejeitados/ignorados sem liberar acesso.
8. Renovação paga estende período; falha/cancelamento aplica a política documentada; evento antigo não regride o estado mais recente.
9. O browser não chama endpoints de CPF/pessoa no fluxo Stripe e nenhum dado de cartão aparece em requests do app, banco, analytics ou logs do servidor.
10. Testar o pop-up em Chrome desktop e largura móvel: monta, fecha e reabre sem duplicar iframe/listeners, sem overflow e sem perder foco; testar inglês, espanhol, italiano, neerlandês e francês.
11. Confirmar que o fluxo Stripe de chat em `app.vue` continua funcional, sem unlock indevido de chat por compra VIP.
12. Confirmar que a página de retorno sozinha nunca muda `payments.status` para aprovado.
13. Inspecionar Network/DevTools e confirmar que nenhum segredo (`sk_`, `rk_`, `whsec_`, service role) ou PII desnecessária chega ao browser, logs ou analytics.
14. Repetir os testes de adulteração e IDOR descritos na seção “Segurança vista por DevTools e pentest”; rotas públicas continuam seguras quando chamadas diretamente fora do browser.
15. Confirmar limites em várias instâncias, respostas 429/`Retry-After`, retries idempotentes e que o limite não bloqueia webhooks legítimos nem seus retries após 5xx.
16. Confirmar no Workbench que o destino Test aponta à rota VIP, recebe apenas os eventos necessários e usa segredo Test separado do endpoint antigo e do Live.
17. Em staging, mudar manualmente `payments.status` de `pending` para `approved` sem pagamento no provedor: status público deve continuar não pago/aguardando e nenhum acesso/convite deve ser criado. Repetir com SyncPay/Stripe indisponível: nunca aceitar o valor manual do banco como fallback.
18. Remover temporariamente o segredo de webhook em staging e confirmar que requisições sem assinatura são recusadas; assinatura inválida, evento duplicado, mandato ativo sem primeira cobrança e valor/moeda divergente também não podem liberar acesso.

Antes do deploy, revisar `git diff`, executar lint/build disponíveis, conferir visualmente a rota no Chrome e comparar os textos removidos descritos em `AGENTS.md`. Não publicar ou enviar para GitHub sem autorização explícita nesta tarefa.

## Arquivos esperados e escopo

O Grok deve revisar e, se necessário, criar/adaptar poucos arquivos: `pages/assinaturavip.vue`, `utils/vip-checkout-i18n.ts`, endpoint dedicado de sessão Stripe VIP, webhook Stripe VIP, persistência segura de catálogo/eventos e documentação. Não modificar o fluxo de conversa em `app.vue` sem necessidade comprovada.

Proteções imutáveis nesta tarefa:

- Não mexer em `server/utils/fake-person.ts`, `server/api/cpf/index.get.ts`, `server/api/cpf/validate.get.ts`, `server/api/fake-person.get.ts` e `docs/FAKE-PERSON-CPF.md`.
- Preservar literalmente a seção de auto-preenchimento por `visitor_id` em `server/api/checkout/vip-monthly.post.ts`.
- Ler `AGENTS.md` e comparar com o `main` atual antes de editar. Não restaurar versão antiga do checkout nem reintroduzir texto removido.
- Não publicar, trocar credenciais ou fazer deploy até a integração estar completa, testada e revisada.

## Referências oficiais

- [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions): `mode=payment` para compra única e `mode=subscription` para recorrência; a Session tem status e `payment_status` distintos.
- [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object): Embedded Checkout usa `client_secret`; a Session pode estar `complete` sem ainda estar paga.
- [Stripe Price API](https://docs.stripe.com/api/prices/create): preços recorrentes têm `interval` (`day`, `week`, `month` ou `year`) e `interval_count`; validar a frequência real contra o texto da oferta.
- [Embedded Checkout quickstart](https://docs.stripe.com/checkout/embedded/quickstart): criar Session no servidor e montar o checkout embutido usando o client secret.
- [Webhooks](https://docs.stripe.com/webhooks): validar assinatura usando corpo bruto e o segredo próprio do endpoint.
- [Fulfillment](https://docs.stripe.com/checkout/fulfillment): conceder o produto no servidor por webhook, não depender do redirecionamento de sucesso.
- [Idempotent requests](https://docs.stripe.com/api/idempotent_requests): usar chave de idempotência em operações de criação que podem ser repetidas.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): usar políticas para manter tabelas/configurações fora do alcance público do cliente.
- [Supabase Securing your API](https://supabase.com/docs/guides/api/securing-your-api): GRANT, exposição da Data API, RLS, views e funções precisam ser revisados juntos.
