# Regras de trabalho do repositório

## Preservar o checkout VIP

- O checkout publicado em `https://wanessabsx.vercel.app/assinaturavip` está em produção. Antes de editar, leia esta página e compare com a versão atual do `main`.
- Não restaure cópias antigas de `pages/assinaturavip.vue` nem traga textos removidos de commits antigos. Em especial, não reintroduza os rótulos `Pix Automático mensal · Pix único vitalício` e `UM ESPAÇO MAIS PRÓXIMO`, o bloco explicando a SyncPay, os três selos longos de pagamento, nem a nota sobre preço escolhido pela região do navegador.
- Preserve o layout atual do checkout: avatar circular, benefícios, seleção de plano e formulário/pagamento em pop-up. Só mude esses elementos quando o usuário pedir explicitamente.
- Faça alterações pequenas. Antes de enviar, revise o diff para confirmar que nenhum texto ou comportamento removido voltou por engano.

## Código de CPF e auto-preenchimento

- O código de pessoa/CPF foi escrito pelo usuário e é protegido. Não altere, mova, reformate, substitua nem apague estes arquivos sem pedido explícito do usuário:
  - `server/utils/fake-person.ts`
  - `server/api/cpf/index.get.ts`
  - `server/api/cpf/validate.get.ts`
  - `server/api/fake-person.get.ts`
  - `docs/FAKE-PERSON-CPF.md`
  - a seção de auto-preenchimento por `visitor_id` em `server/api/checkout/vip-monthly.post.ts`
- Ao trabalhar no checkout mensal, preserve essa seção exatamente e confira o diff antes do commit.
- Não faça deploy a partir de uma branch ou cópia antiga que não contenha as alterações atuais do `main`.

## GitHub, Vercel e conferência

- Repositório: `isabelarocha001/links`.
- Projeto Vercel de produção: `links` (`privsex1`). Domínio de produção: `wanessabsx.vercel.app`.
- Antes de editar ou enviar commits, verifique `git status`, atualize a referência do `main` e confirme a base do trabalho. Não use `git push --force`.
- Antes do deploy, confira o diff completo e confirme que o commit publicado contém o checkout atual e preserva os arquivos protegidos acima.
- Após mudanças de interface, confira a página no Chrome. Após deploy, confirme que a Vercel publicou o commit esperado e abra a rota de produção para verificar os textos.
