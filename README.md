# 🔗 Wanessa Links

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