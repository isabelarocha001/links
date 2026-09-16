<!-- Rota /quiz: abre o quiz ICP do WhatsApp (lógica em app.vue). -->
<script setup lang="ts">
// Deep link: app.vue observa path /quiz e chama iqStart()
useSeoMeta({
  title: 'Falar comigo',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="quiz-route-fallback" aria-live="polite">
    <p>Abrindo…</p>
  </div>
</template>

<style scoped>
.quiz-route-fallback {
  min-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.6);
  font-size: 0.95rem;
}
</style>
