<template>
  <div class="page">
    <div class="bg-glow"></div>

    <main class="container">
      <!-- Avatar -->
      <div class="avatar-wrap">
        <img
          src="https://i.pravatar.cc/200?img=5"
          alt="Wanessa"
          class="avatar"
          width="120"
          height="120"
        >
        <div class="avatar-ring"></div>
      </div>

      <!-- Nome e bio -->
      <h1 class="name">Wanessa</h1>
      <p class="bio">Creator • Conteúdo & Links</p>

      <!-- Links -->
      <div class="links">
        <a
          v-for="link in links"
          :key="link.label"
          :href="link.url"
          class="link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="link-icon">{{ link.icon }}</span>
          <span class="link-label">{{ link.label }}</span>
          <span class="link-arrow">→</span>
        </a>
      </div>

      <footer class="footer">
        Feito com ❤️
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
const links = [
  { label: 'Prévia Telegram', icon: '📱', url: '#' },
  { label: 'Telegram VIP', icon: '⭐', url: '#' },
  { label: 'PrivSex', icon: '🔥', url: 'https://privsex.com' }
]
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 48px 16px 32px;
  position: relative;
  overflow: hidden;
}

.bg-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255, 77, 109, 0.15) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

/* Avatar */
.avatar-wrap {
  position: relative;
  margin-bottom: 8px;
}

.avatar {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.avatar-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: linear-gradient(135deg, #ff4d6d, #c44dff, #4d9fff) border-box;
  -webkit-mask:
    linear-gradient(#fff 0 0) padding-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.7;
  animation: spin 8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Texto */
.name {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  text-align: center;
}

.bio {
  font-size: 0.9rem;
  color: #a0a0a0;
  text-align: center;
  margin-bottom: 16px;
}

/* Links */
.links {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 15px 18px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.link::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 77, 109, 0.2), rgba(196, 77, 255, 0.15));
  opacity: 0;
  transition: opacity 0.25s ease;
}

.link:hover {
  transform: translateY(-2px) scale(1.01);
  border-color: rgba(255, 77, 109, 0.4);
  box-shadow: 0 8px 24px rgba(255, 77, 109, 0.15);
}

.link:hover::before {
  opacity: 1;
}

.link:active {
  transform: translateY(0) scale(0.99);
}

.link-icon {
  font-size: 1.2rem;
  position: relative;
  z-index: 1;
}

.link-label {
  flex: 1;
  position: relative;
  z-index: 1;
}

.link-arrow {
  font-size: 1rem;
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.25s ease;
  position: relative;
  z-index: 1;
  color: #ff4d6d;
}

.link:hover .link-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* Footer */
.footer {
  margin-top: 36px;
  font-size: 0.8rem;
  color: #666;
  text-align: center;
}

@media (max-width: 480px) {
  .page {
    padding: 32px 14px 24px;
  }

  .avatar {
    width: 96px;
    height: 96px;
  }

  .name {
    font-size: 1.4rem;
  }
}
</style>
