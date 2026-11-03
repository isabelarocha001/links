<!-- Rota /: página principal (conteúdo real vive em app.vue). -->
<script setup lang="ts">
// Home — UI principal em app.vue
const homeTitle = 'Links das minhas redes sociais pagas | Wanessa'
const homeDescription = 'Acesse minhas redes sociais e plataformas em um só lugar.'

useSeoMeta({
  title: homeTitle,
  description: homeDescription,
  ogType: 'website',
  ogSiteName: 'Links das minhas redes sociais pagas',
  ogTitle: homeTitle,
  ogDescription: homeDescription,
  ogUrl: 'https://wanessabsx.vercel.app/',
  ogImage: 'https://wanessabsx.vercel.app/og-links.jpg',
  ogImageWidth: '1200',
  ogImageHeight: '630',
  ogImageType: 'image/jpeg',
  ogImageAlt: 'Ícone de links e o título Links das minhas redes sociais pagas',
  twitterCard: 'summary_large_image',
  twitterTitle: homeTitle,
  twitterDescription: homeDescription,
  twitterImage: 'https://wanessabsx.vercel.app/og-links.jpg',
  twitterImageAlt: 'Ícone de links e o título Links das minhas redes sociais pagas',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://wanessabsx.vercel.app/' }],
})
</script>

<template>
  <div aria-hidden="true" style="display: none" />
</template>
