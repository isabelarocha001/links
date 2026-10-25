# Stripe no projeto

Há código Stripe antigo para compras do funil de conversa em `app.vue`. Ele não é a integração do checkout VIP em `/assinaturavip`.

## Estado atual

- `/api/checkout/stripe-intent` e `/api/checkout/stripe-session` atendem fluxos anteriores do funil. Não reutilize esses endpoints para o VIP sem primeiro corrigir a confiança em valores enviados pelo cliente e sem preservar o comportamento atual do chat.
- O endpoint `stripe-session` usa `mode=payment` e recebe preço, moeda e título do navegador. Não serve diretamente para uma assinatura mensal recorrente.
- O endpoint `stripe-intent` recebe valores do cliente e cria PaymentIntent. A UI em `app.vue` usa campos Stripe Elements para outros produtos.
- `/api/webhooks/stripe` também atualiza pagamentos do chat e tem lógica ampla de desbloqueio. Não o altere para liberar o VIP sem isolamento explícito, verificação fail-closed da assinatura e tratamento idempotente dos eventos.
- `/assinaturavip` continua com o checkout Pix atual. Há um ponto de montagem oculto `#vip-stripe-checkout-mount`; ele é somente um marcador de implementação, não inicia Stripe nem mostra um método de pagamento.

## Documentação de implementação do VIP

Leia [`STRIPE-VIP-GROK-HANDOFF.md`](./STRIPE-VIP-GROK-HANDOFF.md) antes de alterar o checkout. O documento descreve a arquitetura, catálogo confiável de preços, modal, assinatura mensal versus compra vitalícia, webhooks, acesso ao Telegram, testes de pentest/DevTools e arquivos protegidos. Ele explica que endpoints públicos ficam visíveis no navegador e define como protegê-los no servidor.

## Segredos

As rotas Stripe existentes leem chaves do Supabase `app_secrets`. A chave publicável `pk_...` pode chegar ao navegador; a chave secreta (`sk_...` ou chave restrita suportada) e os segredos de assinatura `whsec_...` ficam somente no servidor. Nunca registre valores de chaves em logs, código, documentação ou respostas da API.
