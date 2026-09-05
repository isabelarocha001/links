# 🔗 Wanessa Links

> ## ⚠️ Política obrigatória de mudanças (ler antes de editar)
>
> **Toda alteração de código neste repositório precisa ser documentada e auditável.**
>
> ### O que fazer em cada mudança
> 1. **Documentar** o que mudou e por quê (mensagem de commit clara; se for fix grande ou risco de regressão, atualizar `docs/`).
> 2. **Auditar** o diff antes do push: conferir tamanho de arquivos críticos (ex.: CSS), classes/imports e se a página principal não quebrou.
> 3. **Não commitar** mudança “cega” (script que reescreve arquivo inteiro sem revisão, patch parcial que apaga o resto do arquivo, etc.).
>
> ### O que NÃO documentar nem versionar
> - Variáveis de ambiente (`.env`, secrets da Vercel/host)
> - Credenciais, tokens, PATs, chaves de API
> - Segredos de banco de dados, connection strings, service keys
> - Senhas, webhooks secrets, chaves privadas
>
> Esses dados ficam **somente** no ambiente de deploy / secrets do provedor — **nunca** em `docs/`, README, commits ou issues.
>
> ### Referências úteis
> - Restaurar CSS se a página quebrar: [`docs/CSS_RESTORE.md`](docs/CSS_RESTORE.md)
>
> ---

Página de links com **Nuxt 3** (Vue) — sem React.

## ✨ Stack

- Nuxt 3
- Vue 3
- CSS puro (design glass + gradiente)
- Geração estática (rápido)

## 🚀 Desenvolvimento local

```bash
npm install
npm run dev
```

## 🌐 Deploy

Já conectado na Vercel: **https://wanessa-links.vercel.app**

Para atualizar: só faça push na branch `main`.

<!-- force redeploy 2026-09-05 -->

## ✏️ Editar links

Abra `app.vue` e altere o array `links`:

```ts
const links = [
  { label: 'Instagram', icon: '📸', url: 'https://instagram.com/seuuser' },
  // ...
]
```

Também troque a foto e o nome no template.

## 📁 Estrutura

```
links/
├── app.vue           ← página principal
├── nuxt.config.ts
├── assets/css/
├── package.json
└── README.md
```