# Layout dos links

**Status:** alteração preparada na branch `feat/cards-vip-whatsapp`, sem publicação.

Na página principal (`app.vue`), a foto é seguida pelo título "Sua musa dos sonhos proibidos" e pela frase "Escolha onde prefere me ter, amor". A primeira linha mantém PrivSex à esquerda e canal público à direita. A segunda linha coloca o bot VIP do Telegram à esquerda e o WhatsApp à direita, ambos como cards verticais com botão de ação abaixo.

O CSS de `assets/css/links-page.css` preserva duas colunas no mobile. Se somente um dos cards secundários estiver disponível, ele usa uma coluna centralizada. O clique do WhatsApp continua abrindo o fluxo existente; o do Telegram continua apontando para o bot VIP.

**Risco:** textos longos vindos da configuração ou traduções podem aumentar a altura de um card. Conferir o alinhamento visual nas larguras pequenas antes de publicar. A compilação ainda não foi executada porque as dependências não estão instaladas nesta cópia local.
