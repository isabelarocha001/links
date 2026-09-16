<!-- Rota /whatsapp: abre o quiz ICP (mesma lógica de /chat e /quiz). -->
<script setup lang="ts">
/**
 * /whatsapp — deep link Instagram/anúncios
 * Abre quiz de qualificação (app.vue → iqStart).
 * Não abre o funil/chat antigo. /chamada permanece separado.
 */
useSeoMeta({ title: 'WhatsApp', robots: 'noindex, nofollow' })
</script>

<template>
  <div aria-hidden="true" style="display: none" />
</template>
