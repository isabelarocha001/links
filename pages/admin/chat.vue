<script setup lang="ts">
/**
 * Rota /admin/chat — login na própria página (AdminChatInbox).
 * Sem cadeado na home; acesso direto por esta URL.
 */
definePageMeta({
  middleware: ['admin-chat'],
})
</script>

<template>
  <div aria-hidden="true" style="display: none" />
</template>
