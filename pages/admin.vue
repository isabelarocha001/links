<script setup lang="ts">
// Layout pai da rota /admin/* — só encaminha o filho via NuxtPage
</script>

<template>
  <div class="admin-root">
    <NuxtPage />
  </div>
</template>

<style scoped>
.admin-root {
  min-height: 100dvh;
  background: #0b141a;
}
</style>
