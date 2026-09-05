# Restaurar CSS da página de links

## Sintoma

A página fica quebrada no layout:

- fotos empilhadas em tamanho cheio (várias `/model.jpg` uma embaixo da outra)
- cards (PrivSex, Telegram, etc.) sem estilo
- fundo roxo sem o hero centralizado

Isso quase sempre significa que o arquivo **`assets/css/links-page.css`** foi **truncado** (ficou só com ~2–3 KB em vez de ~48 KB).

## Causa conhecida

Scripts ou edições manuais que sobrescrevem o CSS e salvam só um trecho (ex.: só regras do header do chat WhatsApp).

Tamanhos de referência:

| Estado | Tamanho aproximado |
|--------|--------------------|
| **Quebrado** | ~2.500 bytes |
| **Saudável** | ~47.000–48.000 bytes |

## Como conferir se está truncado

```bash
# Local
wc -c assets/css/links-page.css

# Ou no GitHub (raw da main)
curl -sL "https://raw.githubusercontent.com/isabelarocha001/links/main/assets/css/links-page.css" | wc -c
```

Se o número for bem menor que **20000**, o arquivo está incompleto.

Confira também se existem classes essenciais:

```bash
grep -E "hero-photo|photo-frame|lux-card|main-cards" assets/css/links-page.css
```

Se não achar `hero-photo` / `lux-card`, o CSS da home foi perdido.

## Restauração rápida (recomendado)

Último commit conhecido com CSS completo (antes da truncagem):

- **SHA:** `8b59f0f`
- **Arquivo:** `assets/css/links-page.css`

### Opção A — curl + commit

```bash
cd /caminho/do/repo/links

# Baixa a versão boa
curl -fsSL \
  "https://raw.githubusercontent.com/isabelarocha001/links/8b59f0f/assets/css/links-page.css" \
  -o assets/css/links-page.css

# (opcional) status "digitando" em branco no header do chat
python3 - <<'PY'
p = "assets/css/links-page.css"
css = open(p).read()
old = ".wa-status-typing { color: #25d366; font-style: italic; }"
new = """.wa-status-typing { color: #ffffff; font-style: italic; }
.wa-funnel-header .wa-status-typing,
.wa-header .wa-status-typing { color: #fff !important; }"""
if old in css:
    open(p, "w").write(css.replace(old, new, 1))
    print("typing status -> branco")
else:
    print("ja estava ok ou padrao mudou")
print("size", len(open(p).read()))
PY

git add assets/css/links-page.css
git commit -m "fix: restaurar CSS completo da pagina de links"
git push
```

A Vercel redeploya sozinha após o push.

### Opção B — git show (com histórico local)

```bash
git fetch origin
git show 8b59f0f:assets/css/links-page.css > assets/css/links-page.css
# depois o mesmo commit/push da Opção A
```

### Opção C — API do GitHub (com PAT)

Requer token com permissão de `contents: write`.

```bash
export GITHUB_TOKEN="seu_token_aqui"

# 1) Baixa CSS bom
curl -fsSL \
  "https://raw.githubusercontent.com/isabelarocha001/links/8b59f0f/assets/css/links-page.css" \
  -o /tmp/links-page.css

# 2) Pega SHA atual do arquivo na main
export SHA=$(curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/isabelarocha001/links/contents/assets/css/links-page.css?ref=main" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

# 3) Envia o arquivo restaurado
python3 <<'PY'
import os, json, base64, urllib.request
token = os.environ["GITHUB_TOKEN"]
css = open("/tmp/links-page.css", "rb").read()
sha = os.environ["SHA"]
body = json.dumps({
    "message": "fix: restaurar CSS completo da pagina de links",
    "content": base64.b64encode(css).decode(),
    "sha": sha,
    "branch": "main",
}).encode()
req = urllib.request.Request(
    "https://api.github.com/repos/isabelarocha001/links/contents/assets/css/links-page.css",
    data=body, method="PUT",
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "css-restore",
    },
)
print(urllib.request.urlopen(req).status)
print("OK")
PY
```

## O que o CSS deve conter (checklist)

Depois de restaurar, o arquivo deve ter, entre outras:

- **Home / links:** `.page`, `.container`, `.hero`, `.photo-stage`, `.photo-frame`, `.hero-photo`, `.hero-photo.is-active`, `.main-cards`, `.lux-card`, `.card-enter`, portal (`.lux-card--portal`, `.portal-spiral`)
- **VIP / CTAs:** `.vip-card`, `.direct-btn`, `.direct-wa`
- **Quiz estilo WhatsApp:** `.wa-shell`, `.wa-header`, `.wa-chat`, `.wa-bubble`, `.wa-quick`
- **Funil WhatsApp:** `.wa-funnel-overlay`, `.wa-funnel-shell`, planos/PIX, midia, menu de mensagem

O CSS e importado em `app.vue`:

```ts
import '~/assets/css/links-page.css'
```

Nao remova esse import.

## Prevencao

1. **Nao** sobrescrever `links-page.css` inteiro com um trecho pequeno (scripts de "fix de uma linha" costumam fazer isso).
2. Se um script precisar mudar so o status "digitando", use **replace de string** no arquivo completo, nunca reescreva o arquivo do zero.
3. Antes de commitar CSS, rode: `wc -c assets/css/links-page.css` e confirme que esta perto de **48 KB**.
4. Se for editar CSS no GitHub web, confira o diff: se o arquivo "some" milhares de linhas, **nao faca commit**.

## Historico do incidente

- **Data:** 2026-09-05
- **Problema:** commits `style: digitando status em branco no header do chat` truncaram o CSS (~2,5 KB).
- **Commit de referencia com CSS completo:** `8b59f0f`
- **Restauracao:** conteudo de `8b59f0f` + ajuste de `.wa-status-typing` para branco.

## URLs uteis

- Site: https://wanessabsx.vercel.app
- Repo: https://github.com/isabelarocha001/links
- CSS na main: https://github.com/isabelarocha001/links/blob/main/assets/css/links-page.css
- CSS bom (referencia): https://github.com/isabelarocha001/links/blob/8b59f0f/assets/css/links-page.css
'''