<script setup lang="ts">
import { LOGO_PRIVSEX, LOGO_TG_BLUE } from '~/utils/logos'

const PRIVSEX_URL = 'https://privsex.com/juliasalles'
const PUBLIC_CHANNEL_URL = 'https://t.me/+VFz27CGP9IczMmUx'
const AVATAR_URL = '/privsex-platform-avatar.jpg'

useHead({
  title: 'PrivSex | Links oficiais',
  meta: [
    {
      name: 'description',
      content: 'PrivSex é a rede social global que conecta criadores e fãs online.',
    },
    { property: 'og:title', content: 'PrivSex | Links oficiais' },
    {
      property: 'og:description',
      content: 'Conheça as criadoras, converse, acompanhe lives e acesse conteúdo exclusivo no PrivSex.',
    },
  ],
})
</script>

<template>
  <main class="julia-sales-page">
    <div class="julia-sales-glow" aria-hidden="true"></div>
    <div class="julia-sales-grain" aria-hidden="true"></div>

    <section class="julia-sales-shell" aria-labelledby="julia-sales-title">
      <div class="julia-sales-mark" aria-hidden="true">
        <img :src="AVATAR_URL" alt="Logo PrivSex" width="94" height="94" />
      </div>
      <p class="julia-sales-eyebrow">PrivSex</p>
      <h1 id="julia-sales-title">Sua conexão com criadores online</h1>
      <p class="julia-sales-subtitle">Conheça a plataforma e escolha como quer continuar.</p>

      <nav class="julia-sales-links" aria-label="Links oficiais do PrivSex">
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
            <strong>Entrar no PrivSex</strong>
            <small>Encontre criadores, chat e conteúdo exclusivo</small>
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
            <small>Quer conhecer as criadoras? Acesse nosso canal público no Telegram</small>
          </span>
          <span class="julia-sales-link__arrow" aria-hidden="true">↗</span>
        </a>
      </nav>

      <section class="julia-sales-info" aria-labelledby="julia-sales-about">
        <div class="julia-sales-info__block">
          <h2 id="julia-sales-about">O que é o PrivSex?</h2>
          <p>O PrivSex é uma rede social global que conecta criadores a seus fãs online.</p>
        </div>

        <div class="julia-sales-info__block">
          <h2>Como usar a plataforma</h2>
          <p>Crie uma conta com e-mail, Google ou X. Você também pode testar entrando como visitante.</p>
        </div>

        <div class="julia-sales-info__block">
          <h2>O que você encontra</h2>
          <ul>
            <li>Chat com sua criadora favorita</li>
            <li>Conteúdo exclusivo da sua criadora favorita</li>
            <li>Lives ao vivo para inscritos do perfil</li>
            <li>Posts individuais no feed</li>
            <li>Videochamadas</li>
            <li>E muito mais</li>
          </ul>
        </div>
      </section>

      <p class="julia-sales-footer">© 2026 PrivSex. Todos os direitos reservados.</p>
    </section>
  </main>
</template>

<style scoped>
.julia-sales-page {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  max-width: 100vw;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
  padding: max(32px, env(safe-area-inset-top)) 18px max(28px, env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 50% -10%, rgba(255, 255, 255, 0.09), transparent 42%),
    #050505;
  color: #fff;
  font-family: Poppins, Inter, system-ui, sans-serif;
  overflow-wrap: anywhere;
}

.julia-sales-glow {
  position: absolute;
  inset: -28% -20% auto;
  height: 430px;
  pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.08), transparent 66%);
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
  min-width: 0;
  max-width: 100%;
  width: min(100%, 760px);
  margin: 0 auto;
  text-align: center;
}

.julia-sales-mark {
  width: 94px;
  height: 94px;
  display: grid;
  place-items: center;
  margin: 8px auto 18px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 28px;
  background: linear-gradient(145deg, rgba(38, 38, 42, 0.96), rgba(8, 8, 9, 0.98));
  box-shadow: 0 0 34px rgba(0, 0, 0, 0.65), inset 0 1px rgba(255, 255, 255, 0.2);
}

.julia-sales-mark { overflow: hidden; }
.julia-sales-mark img { width: 100%; height: 100%; object-fit: cover; object-position: center; }

.julia-sales-eyebrow {
  margin: 0 0 7px;
  color: #d6d7dc;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1 {
  max-width: 620px;
  margin: 0 auto;
  color: #fff;
  font-size: clamp(1.75rem, 5vw, 2.45rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
}

.julia-sales-subtitle {
  margin: 10px auto 28px;
  color: rgba(245, 240, 255, 0.82);
  font-size: 0.94rem;
}

.julia-sales-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  text-align: left;
}

.julia-sales-link {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 188px;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 18px 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(26, 26, 29, 0.98), rgba(10, 10, 11, 0.99));
  box-shadow: 0 15px 34px rgba(0, 0, 0, 0.25);
  text-decoration: none;
  overflow: hidden;
  overflow-wrap: anywhere;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.julia-sales-link--privsex {
  border-color: rgba(255, 255, 255, 0.48);
  background: linear-gradient(145deg, rgba(42, 42, 46, 0.98), rgba(11, 11, 12, 0.99) 72%);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.52), 0 0 28px rgba(255, 255, 255, 0.06);
}

.julia-sales-link:hover,
.julia-sales-link:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.68);
  box-shadow: 0 20px 42px rgba(0, 0, 0, 0.55), 0 0 28px rgba(255, 255, 255, 0.08);
  outline: none;
}

.julia-sales-link:active { transform: scale(0.985); }
.julia-sales-link--telegram { border-color: rgba(148, 163, 184, 0.34); }

.julia-sales-link__icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.09);
}

.julia-sales-link__icon--telegram { background: rgba(71, 85, 105, 0.28); }
.julia-sales-link__icon img { object-fit: contain; }

.julia-sales-link__copy {
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.julia-sales-link__copy strong { color: #fff; font-size: 1.05rem; line-height: 1.2; }
.julia-sales-link__copy small { color: rgba(245, 240, 255, 0.76); font-size: 0.78rem; line-height: 1.42; }
.julia-sales-link__arrow { position: absolute; top: 18px; right: 18px; color: #e5e7eb; font-size: 1.25rem; font-weight: 700; }

.julia-sales-info {
  display: grid;
  min-width: 0;
  max-width: 100%;
  gap: 17px;
  margin-top: 30px;
  padding: 25px 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: rgba(17, 17, 19, 0.86);
  text-align: left;
}

.julia-sales-info__block + .julia-sales-info__block {
  padding-top: 17px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.julia-sales-info h2 { margin: 0 0 7px; color: #f3f4f6; font-size: 1rem; }
.julia-sales-info p, .julia-sales-info li { color: rgba(245, 240, 255, 0.76); font-size: 0.84rem; line-height: 1.55; }
.julia-sales-info ul { display: grid; gap: 5px; min-width: 0; padding-left: 19px; }
.julia-sales-info li::marker { color: #d1d5db; }

.julia-sales-footer { margin: 25px 0 0; color: rgba(245, 240, 255, 0.48); font-size: 0.72rem; }

@media (max-width: 390px) {
  .julia-sales-page { padding-left: 10px; padding-right: 10px; }
  .julia-sales-links { gap: 9px; }
  .julia-sales-link { min-height: 174px; gap: 12px; padding: 15px 11px 14px; border-radius: 16px; }
  .julia-sales-link__icon { width: 45px; height: 45px; border-radius: 13px; }
  .julia-sales-link__icon img { width: 26px; height: 26px; }
  .julia-sales-link__copy strong { font-size: 0.86rem; }
  .julia-sales-link__copy small { font-size: 0.68rem; line-height: 1.35; }
  .julia-sales-link__arrow { top: 13px; right: 11px; font-size: 1.05rem; }
  .julia-sales-info { padding: 20px 16px; }
}
</style>
