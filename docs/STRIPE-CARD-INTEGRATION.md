# Regra para a futura integração de cartão com Stripe

## Separação dos fluxos

- O pagamento por cartão via Stripe deve ter fluxo e integração próprios. Não reutilize o fluxo de Pix Automático da SyncPay.
- Não use o auto-preenchimento de pessoa/CPF no pagamento por cartão. Em particular, o fluxo Stripe não deve chamar `/api/fake-person`, `/api/cpf` ou derivar nome, e-mail ou CPF sintéticos do `visitor_id`.
- Preserve o auto-preenchimento existente apenas no fluxo atual de Pix Automático, sem alterar ou remover seus arquivos e endpoints protegidos.
- Implemente o cartão usando a API e os componentes oficiais da Stripe, coletando os dados exigidos pelo fluxo de pagamento da Stripe. Nunca armazene dados completos do cartão no app.
- Mantenha chaves secretas da Stripe no servidor e valide a confirmação do pagamento por webhook antes de liberar qualquer acesso.

Esta regra deve ser lida antes de implementar pagamentos com cartão. A integração Stripe ainda não está implementada por este documento.
