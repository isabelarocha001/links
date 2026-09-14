<template>
  <NuxtPage />
  <AdminChatInbox v-if="isAdminRoute" />
  <div v-else class="page" :class="{ 'page--locked': showLogin || showAdminPanel, 'page--chat-landing': isChatLanding }" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
    <div class="bg-glow" aria-hidden="true"></div>
    <div class="bg-grain" aria-hidden="true"></div>
    <!-- cadeado removido do front: acesso admin só por rota direta (/admin/chat) -->
    <main class="container">
      <section
        v-if="gateReady && (gate === 1 || gate === 2 || gate === 3 || gate === 4 || gate === 'reject')"
        class="wa-shell"
      >
        <header class="wa-header">
          <div class="wa-header-side">
            <span class="wa-back" aria-hidden="true">‹</span>
          </div>
          <div class="wa-header-info">
            <p class="wa-name">{{ t('waName') }}</p>
            <p class="wa-status">
              <span v-if="isTyping" class="wa-status-typing">{{ t('waTyping') }}</span>
              <span v-else class="wa-status-online">{{ t('waOnline') }}</span>
            </p>
          </div>
          <div class="wa-avatar-wrap">
            <img class="wa-avatar" src="/model.jpg" alt="" draggable="false" />
            <span class="wa-online-dot" aria-hidden="true"></span>
          </div>
        </header>

        <div ref="chatBox" class="wa-chat">
          <div class="wa-day">{{ t('waDay') }}</div>
          <div
            v-for="(m, i) in chatMessages"
            :key="i"
            class="wa-row"
            :class="m.from === 'me' ? 'wa-row--me' : 'wa-row--her'"
          >
            <div class="wa-bubble" :class="m.from === 'me' ? 'wa-bubble--me' : 'wa-bubble--her'">
              <p class="wa-text">{{ m.text }}</p>
              <span class="wa-time">{{ m.time }}</span>
            </div>
          </div>
          <div v-if="isTyping" class="wa-row wa-row--her">
            <div class="wa-bubble wa-bubble--her wa-bubble--typing">
              <span class="wa-dot"></span><span class="wa-dot"></span><span class="wa-dot"></span>
            </div>
          </div>
        </div>

        <div v-if="!isTyping && gate !== 'reject' && quizOptions.length" class="wa-quick">
          <button
            v-for="opt in quizOptions"
            :key="opt.key"
            type="button"
            class="wa-quick-btn"
            :class="opt.variant"
            @click="answerQuiz(opt.key)"
          >
            {{ opt.label }}
          </button>
        </div>

        <div class="wa-composer">
          <button type="button" class="wa-emoji" disabled aria-hidden="true">😊</button>
          <input class="wa-input" type="text" disabled :placeholder="t('waPlaceholder')" readonly />
          <button type="button" class="wa-send" disabled aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </section>

      <template v-else-if="gateReady && gate === 'pass'">
        <header class="hero">
          <div class="photo-stage">
            <div class="photo-frame">
              <img v-for="(src, i) in gallery" :key="src + i" :src="src" :class="['hero-photo', { 'is-active': i === photoIndex }]" alt="" decoding="async" draggable="false" />
              <div class="photo-shine" aria-hidden="true"></div>
              <div class="photo-vignette" aria-hidden="true"></div>
            </div>
            <div class="photo-dots" aria-hidden="true">
              <span v-for="(_, i) in gallery" :key="i" class="dot" :class="{ active: i === photoIndex }" />
            </div>
            <!-- CTA principal: WhatsApp — só se link WhatsApp estiver ativo no admin -->
            <button v-if="whatsappLinkEnabled" type="button" class="hero-wa-btn" @click="openWaFunnel('hero_photo')">
              <span class="hero-wa-ico" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </span>
              <span class="hero-wa-copy">
                <span class="hero-wa-title">{{ t('waTitle') }}</span>
                <span class="hero-wa-sub">{{ t('waSub') }}</span>
              </span>
              <span class="hero-wa-arrow" aria-hidden="true">→</span>
            </button>
          </div>
          <!-- identity title removed -->
        </header>
        <section class="main-cards" :class="{ 'main-cards--single': hidePublicChannel }" v-if="configReady">
          <div class="card-col">
            <a class="lux-card lux-card--left lux-card--portal" :href="privsexUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('PrivSex', privsexUrl)">
              <div class="portal-spiral" aria-hidden="true">
                <span class="ps-ring ps-r1"></span>
                <span class="ps-ring ps-r2"></span>
                <span class="ps-ring ps-r3"></span>
                <span class="ps-ring ps-r4"></span>
                <span class="ps-core"></span>
              </div>
              <div class="card-glow"></div>
              <div class="card-top">
                <span class="card-icon"><img v-if="logoPriv" :src="logoPriv" alt="" class="logo-img" width="28" height="28" /><template v-else>🔥</template></span>
                <span class="card-badge">{{ t('portalBadge') }}</span>
              </div>
              <h2 class="card-title">{{ t('privTitle') }}</h2>
              <p class="card-desc">{{ t('privDesc') }}</p>
            </a>
            <a class="card-enter" :href="privsexUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('PrivSex', privsexUrl)">{{ t('privEnter') }}</a>
          </div>
          <div class="card-col" v-if="!hidePublicChannel">
            <!-- BR + canal desativado no admin → bot; gringa SEMPRE canal público (nunca bot) -->
            <template v-if="isPt && !publicChannelEnabled && telegramBotEnabled">
              <a class="lux-card lux-card--right" :href="vipBotUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Bot', vipBotUrl)">
                <div class="card-glow"></div>
                <div class="card-top">
                  <span class="card-icon"><img v-if="logoTg" :src="logoTg" alt="" class="logo-img" width="28" height="28" /><template v-else>⭐</template></span>
                  <span class="card-badge badge-tg">{{ t('tgBadge') }}</span>
                </div>
                <h2 class="card-title">{{ t('vipTitle') }}</h2>
                <p class="card-desc">{{ t('vipDesc') }}</p>
              </a>
              <a class="card-enter" :href="vipBotUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Bot', vipBotUrl)">{{ t('pubEnter') }}</a>
            </template>
            <template v-else>
              <a class="lux-card lux-card--right" :href="telegramPublicUrlActive" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrlActive)">
                <div class="card-glow"></div>
                <div class="card-top">
                  <span class="card-icon"><img v-if="logoTg" :src="logoTg" alt="" class="logo-img" width="28" height="28" /><template v-else>📱</template></span>
                  <span class="card-badge badge-tg">{{ t('tgBadge') }}</span>
                </div>
                <h2 class="card-title">{{ t('pubTitle') }}</h2>
                <p class="card-desc">{{ t('pubDesc') }}</p>
              </a>
              <a class="card-enter" :href="telegramPublicUrlActive" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrlActive)">{{ t('pubEnter') }}</a>
            </template>
          </div>
        </section>
        <!-- Bot Telegram no rodapé quando canal público está na direita -->
        <section class="vip-block" v-if="publicChannelEnabled && telegramBotEnabled && configReady && isPt">
          <a class="vip-card" :href="vipBotUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('VIP Bot', vipBotUrl)">
            <div class="vip-shine"></div>
