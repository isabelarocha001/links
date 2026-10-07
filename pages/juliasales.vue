<script setup lang="ts">
import { LOGO_PRIVSEX, LOGO_TG_BLUE } from '~/utils/logos'

const PRIVSEX_URL = 'https://privsex.com/juliasalles'
const PUBLIC_CHANNEL_URL = 'https://t.me/+VFz27CGP9IczMmUx'

useHead({
  title: 'Julia | Links oficiais',
  meta: [
    {
      name: 'description',
      content: 'Acesse o perfil oficial da Julia no PrivSex ou entre no canal público de prévias.',
    },
    { property: 'og:title', content: 'Julia | Links oficiais' },
    {
      property: 'og:description',
      content: 'Perfil oficial no PrivSex e canal público de prévias da Julia.',
    },
  ],
})
</script>

<template>
  <main class="julia-sales-page">
    <div class="julia-sales-glow" aria-hidden="true"></div>
    <div class="julia-sales-grain" aria-hidden="true"></div>

    <section class="julia-sales-shell" aria-labelledby="julia-sales-title">
      <div class="julia-sales-mark" aria-hidden="true">J</div>
      <p class="julia-sales-eyebrow">Links oficiais</p>
      <h1 id="julia-sales-title">Julia</h1>
      <p class="julia-sales-subtitle">Escolha por onde quer continuar.</p>

      <nav class="julia-sales-links" aria-label="Links oficiais da Julia">
        <a
          class="julia-sales-link julia-sales-link--privsex"
          :href="PRIVSEX_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="julia-sales-link__icon julia-sales-link__icon--privsex">
            <img :src="LOGO_PRIVSEX" alt="" width="30" height="30" />
          </span>
          <span class="julia-sales-link__copy">
            <strong>PrivSex</strong>
            <small>Meu perfil oficial e conteúdo exclusivo</small>
          </span>
          <span class="julia-sales-link__arrow" aria-hidden="true">↗</span>
        </a>

        <a
          class="julia-sales-link julia-sales-link--telegram"
          :href="PUBLIC_CHANNEL_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="julia-sales-link__icon julia-sales-link__icon--telegram">
            <img :src="LOGO_TG_BLUE" alt="" width="30" height="30" />
          </span>
          <span class="julia-sales-link__copy">
            <strong>Canal Público</strong>
            <small>Prévias e novidades grátis no Telegram</small>
          </span>
          <span class="julia-sales-link__arrow" aria-hidden="true">↗</span>
        </a>
      </nav>

      <p class="julia-sales-footer">Acompanhe a Julia pelos canais oficiais.</p>
    </section>
  </main>
</template>

<style scoped>
.julia-sales-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
  padding: max(32px, env(safe-area-inset-top)) 18px max(28px, env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 50% -10%, rgba(168, 85, 247, 0.26), transparent 42%),
    #100817;
  color: #fff;
  font-family: Poppins, Inter, system-ui, sans-serif;
}

.julia-sales-glow {
  position: absolute;
  inset: -28% -20% auto;
  height: 430px;
  pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(192, 132, 252, 0.18), transparent 66%);
  filter: blur(12px);
}

.julia-sales-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.julia-sales-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 440px);
  margin: 0 auto;
  text-align: center;
}

.julia-sales-mark {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  margin: 8px auto 18px;
  border: 1px solid rgba(216, 180, 254, 0.45);
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(168, 85, 247, 0.52), rgba(88, 28, 135, 0.72));
  box-shadow: 0 0 34px rgba(168, 85, 247, 0.3), inset 0 1px rgba(255, 255, 255, 0.22);
  color: #fff;
  font-family: Georgia, serif;
  font-size: 2rem;
  font-style: italic;
}

.julia-sales-eyebrow {
  margin: 0 0 7px;
  color: #d8b4fe;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(1.75rem, 8vw, 2.25rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
}

.julia-sales-subtitle {
  margin: 9px auto 27px;
  color: rgba(245, 240, 255, 0.82);
  font-size: 0.92rem;
}

.julia-sales-links {
  display: grid;
  gap: 14px;
}

.julia-sales-link {
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 86px;
  padding: 15px 16px;
  border: 1px solid rgba(192, 132, 252, 0.28);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(46, 24, 65, 0.97), rgba(24, 12, 37, 0.98));
  box-shadow: 0 15px 34px rgba(0, 0, 0, 0.25);
  text-align: left;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.julia-sales-link:hover,
.julia-sales-link:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(216, 180, 254, 0.72);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.34), 0 0 25px rgba(168, 85, 247, 0.18);
  outline: none;
}

.julia-sales-link:active { transform: scale(0.985); }

.julia-sales-link--telegram { border-color: rgba(96, 165, 250, 0.3); }

.julia-sales-link__icon {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  flex: 0 0 50px;
  border-radius: 15px;
  background: rgba(126, 34, 206, 0.32);
}

.julia-sales-link__icon--telegram { background: rgba(37, 99, 235, 0.22); }
.julia-sales-link__icon img { object-fit: contain; }

.julia-sales-link__copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.julia-sales-link__copy strong { color: #fff; font-size: 1rem; line-height: 1.2; }
.julia-sales-link__copy small { color: rgba(245, 240, 255, 0.7); font-size: 0.76rem; line-height: 1.35; }
.julia-sales-link__arrow { flex: 0 0 auto; color: #d8b4fe; font-size: 1.2rem; font-weight: 700; }

.julia-sales-footer { margin: 25px 0 0; color: rgba(245, 240, 255, 0.48); font-size: 0.72rem; }

@media (max-width: 380px) {
  .julia-sales-page { padding-left: 12px; padding-right: 12px; }
  .julia-sales-link { min-height: 80px; padding: 13px; }
  .julia-sales-link__icon { width: 45px; height: 45px; flex-basis: 45px; }
  .julia-sales-link__copy small { font-size: 0.7rem; }
}
</style>
