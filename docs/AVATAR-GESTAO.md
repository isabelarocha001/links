# Gestão do avatar da landing

A rota protegida `/gestão` (com o atalho `/gestao`) permite ajustar a imagem
circular do avatar usado na landing `/juliasales`.

O acesso reaproveita a sessão do painel administrativo. Depois de entrar, use
os controles de posição horizontal, posição vertical e zoom para encaixar a
logo na máscara circular. A landing começa com um enquadramento automático
que remove a margem preta da arte retrato sem deformá-la. Salve a posição e
atualize a landing para conferir.

Por segurança, a posição é persistida no `app_secrets` do Supabase pelo endpoint
administrativo e fica em cache no `localStorage` do navegador em uso
(`privsex_avatar_position_v1`). A landing lê o valor público filtrado por
`/api/avatar-position`; nenhuma chave administrativa é exposta ao visitante.
