<script setup lang="ts">
/**
 * Rota /admin/chat — exige sessão admin (middleware admin-chat → 404 se não logado).
 * UI em components/AdminChatInbox.vue via app.vue.
 */
definePageMeta({
  middleware: ['admin-chat'],
})
</script>

<template>
  <div aria-hidden="true" style="display: none" />
</template>
