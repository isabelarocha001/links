<!-- Rota /chat: abre o quiz ICP do WhatsApp (não o funil/chat antigo). -->
<script setup lang="ts">
/**
 * /chat — deep link de anúncio/Instagram
 * Abre o quiz de qualificação (app.vue → iqStart).
 * NÃO abre o funil WhatsApp antigo (showWaFunnel).
 * /chamada permanece no funil + videochamada.
 * /admin/chat permanece inbox admin.
 */
useSeoMeta({ title: 'Falar comigo', robots: 'noindex, nofollow' })
</script>

<template>
  <div aria-hidden="true" style="display: none" />
</template>
