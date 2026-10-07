# Gestão do avatar da landing

A rota protegida `/gestão` (com o atalho `/gestao`) permite ajustar a imagem
circular do avatar usado na landing `/juliasales`.

O acesso reaproveita a sessão do painel administrativo. Depois de entrar, use
os controles de posição horizontal, posição vertical e zoom para encaixar a
logo na máscara circular. Salve a posição e atualize a landing para conferir.

O arquivo do avatar fica salvo no `app_secrets` do Supabase sob a chave
`PRIVSEX_LINKS_AVATAR_IMAGE` e é servido pelo endpoint `/api/avatar-image`.
A posição é persistida no `app_secrets` sob `PRIVSEX_AVATAR_POSITION`.
Nada do avatar ou da posição é salvo em `localStorage`; nenhuma chave
administrativa é exposta ao visitante.

O botão de salvar relê o valor logo depois da gravação e só mostra confirmação
quando o Supabase devolve a mesma configuração persistida.
