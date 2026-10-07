# Gestão do avatar da landing

A rota protegida `/gestão` (com o atalho `/gestao`) permite ajustar a imagem
circular do avatar usado na landing `/juliasales`.

O acesso reaproveita a sessão do painel administrativo. Depois de entrar, use
os controles de posição horizontal, posição vertical e zoom para encaixar a
logo na máscara circular. Salve a posição e atualize a landing para conferir.

Por segurança, a posição é armazenada no `localStorage` do navegador em uso
(`privsex_avatar_position_v1`); ela não é uma senha nem é enviada ao código
fonte. Se o ajuste precisar ser compartilhado entre navegadores/dispositivos,
será necessário persistir esses valores no backend em uma etapa posterior.
