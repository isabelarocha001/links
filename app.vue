<template>
  <NuxtPage />
  <AdminChatInbox v-if="isAdminRoute" />
  <div v-else class="page" :class="{ 'page--locked': showLogin || showAdminPanel, 'page--chat-landing': isChatLanding }" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
    <div class="bg-glow" aria-hidden="true"></div>
    <div class="bg-grain" aria-hidden="true"></div>
    <button class="lock-btn" type="button" aria-label="Editar página" @click="openLogin">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    </button>
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
          </div>
        </section>
        <section class="vip-block" v-if="configReady && isPt">
          <a class="vip-card" :href="vipBotUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('VIP Bot', vipBotUrl)">
            <div class="vip-shine"></div>
            <div class="vip-content">
              <span class="vip-icon vip-icon-stack" aria-hidden="true" title="Bot Telegram">
                <span class="vip-robot">🤖</span>
                <img class="vip-tg-logo" :src="logoTgPurple" alt="Telegram" width="18" height="18" />
              </span>
              <div>
                <h3 class="vip-title">{{ t('vipTitle') }}</h3>
                <p class="vip-desc">{{ t('vipDesc') }}</p>
              </div>
            </div>
            <span class="vip-arrow">→</span>
          </a>
        </section>
        <section class="direct-section">
          <p class="direct-label">{{ t('directLabel') }}</p>
          <div class="direct-stack" :class="{ 'direct-stack--intl': !isPt }">
            <!-- Telegram primeiro na gringa (CTA principal) -->
            <a v-if="!isPt" class="direct-btn direct-tg direct-btn--primary" :href="telegramPrivateUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Privado', telegramPrivateUrl)">
              <span class="d-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></span>
              <span class="d-btn-text"><span class="d-btn-title">{{ t('tgPrivTitle') }}</span><span class="d-btn-sub">{{ t('tgPrivSub') }}</span></span>
            </a>
            <button type="button" class="direct-btn direct-wa" :class="{ 'direct-btn--primary': isPt, 'direct-btn--secondary': !isPt }" @click="openWaFunnel">
              <span class="d-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></span>
              <span class="d-btn-text"><span class="d-btn-title">{{ t('waTitle') }}</span><span class="d-btn-sub">{{ t('waSub') }}</span></span>
            </button>
          </div>
        </section>
        <footer class="bio-block">
          <div class="ig-card">
            <img class="ig-avatar" :src="igProfileSrc" alt="" width="72" height="72" draggable="false" />
            <div class="ig-info">
              <p class="ig-user">wanessabsx_</p>
              <p class="ig-name">Wanessa Borges</p>
              <div class="ig-stats">
                <span><b>22</b> {{ t('posts') }}</span>
                <span><b>{{ t('followersCount') }}</b> {{ t('followers') }}</span>
                <span><b>53</b> {{ t('following') }}</span>
              </div>
            </div>
          </div>
          <p class="bio-meta">{{ t('bioMeta') }}</p>
          <p class="bio-text">{{ t('bioText') }}</p>
          <p class="bio-copy">© Wanessa</p>
        </footer>
      </template>
    </main>
  </div>

  <ClientOnly>
    <Teleport to="body">

      <div v-if="showWaFunnel" class="wa-funnel-overlay" @click.self="closeWaFunnel">
        <div class="wa-funnel-shell" role="dialog" aria-modal="true" :style="funnelShellStyle" style="position:relative" @click.stop>
          <header class="wa-header wa-funnel-header">
            <button
              v-if="!leadBlockedWanessa"
              type="button"
              class="wa-avatar-btn"
              aria-label="Ver foto de perfil"
              @click="showFunnelPhoto = true"
            >
              <span class="wa-avatar-wrap wa-avatar-wrap--lg">
                <img class="wa-avatar" src="/model.jpg" alt="Wanessa" draggable="false" />
                <span
                  v-if="adminPresenceOnline"
                  class="wa-online-dot"
                  aria-hidden="true"
                ></span>
              </span>
            </button>
            <div v-else class="wa-avatar-wrap wa-avatar-wrap--lg wa-avatar-wrap--blocked" aria-hidden="true">
              <span class="wa-avatar-blocked-ph">?</span>
            </div>
            <button
              type="button"
              class="wa-header-info wa-header-info-btn"
              :disabled="leadBlockedWanessa"
              @click="!leadBlockedWanessa && (showFunnelProfile = true)"
            >
              <p class="wa-name">{{ leadBlockedWanessa ? 'Contato bloqueado' : 'Wanessa' }}</p>
              <p class="wa-status">
                <span v-if="leadBlockedWanessa" class="wa-status-last">você bloqueou este contato</span>
                <span v-else-if="funnelTyping" class="wa-status-typing">digitando…</span>
                <span v-else-if="adminPresenceOnline" class="wa-status-online">online</span>
                <span v-else class="wa-status-last">{{ adminPresenceLabel }}</span>
              </p>
            </button>
            <div class="wa-header-actions">
              <button
                type="button"
                class="wa-header-icon-btn wa-header-icon-btn--gift"
                aria-label="Enviar mimo"
                title="Enviar mimo"
                :disabled="blockedUnlockLoading"
                @click="onFunnelGiftMimo"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="8" width="18" height="4" rx="1"/>
                  <path d="M12 8v13"/>
                  <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
                  <path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5"/>
                </svg>
              </button>
              <button type="button" class="wa-header-icon-btn" aria-label="Videochamada" @click="onFunnelVideoCall">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              </button>
              <button type="button" class="wa-header-icon-btn" aria-label="Mais opcoes" @click="showFunnelMoreMenu = true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
              </button>
              <button type="button" class="wa-close-btn" aria-label="Fechar chat" @click="closeWaFunnel">✕</button>
            </div>
            <input ref="funnelCameraInput" type="file" accept="image/*" capture="environment" class="wa-file-hidden" @change="onFunnelMediaPicked($event, 'photo')" />
            <input ref="funnelPhotoInput" type="file" accept="image/*" class="wa-file-hidden" @change="onFunnelMediaPicked($event, 'photo')" />
            <input ref="funnelVideoInput" type="file" accept="video/*" class="wa-file-hidden" @change="onFunnelMediaPicked($event, 'video')" />
            <input ref="funnelAudioInput" type="file" accept="audio/*" class="wa-file-hidden" @change="onFunnelMediaPicked($event, 'audio')" />
            <input ref="funnelDocInput" type="file" accept=".pdf,.doc,.docx,.txt,image/*,application/*" class="wa-file-hidden" @change="onFunnelMediaPicked($event, 'doc')" />
          </header>

          <!-- Foto de perfil em círculo (estilo WhatsApp) -->
          <div v-if="showFunnelPhoto" class="wa-profile-photo-overlay" @click.self="showFunnelPhoto = false">
            <button type="button" class="wa-profile-photo-close" aria-label="Fechar" @click="showFunnelPhoto = false">✕</button>
            <div class="wa-profile-photo-circle">
              <img src="/model.jpg" alt="Wanessa" draggable="false" />
            </div>
            <p class="wa-profile-photo-name">Wanessa</p>
          </div>

          <!-- Perfil / bio (estilo WhatsApp) -->
          <div v-if="showFunnelProfile" class="wa-profile-panel">
            <header class="wa-profile-panel-top">
              <button type="button" class="wa-close-btn" aria-label="Voltar" @click="showFunnelProfile = false">‹</button>
              <span class="wa-profile-panel-title">Dados do contato</span>
              <span class="wa-profile-panel-spacer"></span>
            </header>
            <div class="wa-profile-panel-body">
              <button type="button" class="wa-profile-big-avatar" @click="showFunnelPhoto = true">
                <img src="/model.jpg" alt="Wanessa" draggable="false" />
              </button>
              <h2 class="wa-profile-name">Wanessa</h2>
              <p class="wa-profile-about-label">Recado</p>
              <p class="wa-profile-about">Criadora de conteúdo</p>
              <div class="wa-profile-row">
                <span class="wa-profile-row-label">Localização</span>
                <span class="wa-profile-row-value">Balneário Camboriú, Santa Catarina, Brasil</span>
              </div>
              <div class="wa-profile-row">
                <span class="wa-profile-row-label">Sobre</span>
                <span class="wa-profile-row-value">Eu não faço encontros. Não faço programa. Não adianta oferecer valor alto: a resposta continua sendo não. Só conteúdo e atendimento online.</span>
              </div>
            </div>
          </div>

          <div ref="funnelChatBox" class="wa-chat wa-funnel-chat">
            <div class="wa-day">Hoje</div>
            <div
              v-for="(m, i) in funnelMessages"
              :key="m.id || i"
              class="wa-row"
              :class="m.from === 'me' ? 'wa-row--me' : 'wa-row--her'"
            >
              <div
                class="wa-bubble"
                :class="[
                  m.from === 'me' ? 'wa-bubble--me' : 'wa-bubble--her',
                  m.mediaKind ? 'wa-bubble--media' : '',
                  m.deleted ? 'wa-bubble--deleted' : '',
                ]"
                @contextmenu.prevent="m.from === 'me' && !m.deleted && openFunnelMsgMenu(i)"
                @touchstart.passive="m.from === 'me' && !m.deleted && onFunnelMsgTouchStart(i, $event)"
                @touchend.passive="onFunnelMsgTouchEnd"
                @touchmove.passive="onFunnelMsgTouchEnd"
              >
                <template v-if="m.deleted">
                  <p class="wa-text wa-text--deleted">Mensagem apagada</p>
                </template>
                <template v-else-if="funnelEditingIdx === i">
                  <div class="wa-edit-box">
                    <input v-model="funnelEditDraft" class="wa-edit-input" type="text" @keydown.enter.prevent="saveFunnelMsgEdit" />
                    <div class="wa-edit-actions">
                      <button type="button" class="wa-edit-btn" @click="cancelFunnelMsgEdit">Cancelar</button>
                      <button type="button" class="wa-edit-btn wa-edit-btn--ok" @click="saveFunnelMsgEdit">Salvar</button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div v-if="m.html" class="wa-media" v-html="m.html"></div>
                  <p v-else class="wa-text">{{ m.text }}</p>
                  <span v-if="m.edited" class="wa-edited">editada</span>
                </template>
                <span class="wa-meta">
                  <span class="wa-time">{{ m.time }}</span>
                  <span
                    v-if="m.from === 'me' && !m.deleted"
                    class="wa-ticks"
                    :class="{
                      'wa-ticks--sent': !m.status || m.status === 'sent',
                      'wa-ticks--delivered': m.status === 'delivered',
                      'wa-ticks--read': m.status === 'read',
                    }"
                    aria-hidden="true"
                  >
                    <svg class="wa-tick" viewBox="0 0 16 11" width="16" height="11"><path d="M5.6 10.2L0.8 5.4l1.3-1.3 3.5 3.5L13.5.7 14.8 2z" fill="currentColor"/></svg>
                    <svg class="wa-tick wa-tick--second" viewBox="0 0 16 11" width="16" height="11"><path d="M5.6 10.2L0.8 5.4l1.3-1.3 3.5 3.5L13.5.7 14.8 2z" fill="currentColor"/></svg>
                  </span>
                </span>
                <button
                  v-if="m.from === 'me' && !m.deleted && funnelEditingIdx !== i"
                  type="button"
                  class="wa-msg-menu-btn"
                  aria-label="Opções da mensagem"
                  @click.stop="openFunnelMsgMenu(i)"
                >⋮</button>
              </div>
              <div v-if="m.from === 'me' && m.status === 'read' && !m.deleted" class="wa-read-label">Visualizado</div>
            </div>

            <!-- Menu editar / apagar mensagem -->
            <div v-if="funnelMsgMenuIdx !== null" class="wa-msg-sheet-overlay" @click.self="funnelMsgMenuIdx = null">
              <div class="wa-msg-sheet" role="dialog">
                <button type="button" class="wa-msg-sheet-item" @click="startFunnelMsgEdit">Editar mensagem</button>
                <button type="button" class="wa-msg-sheet-item wa-msg-sheet-item--danger" @click="deleteFunnelMsg">Apagar mensagem</button>
                <button type="button" class="wa-msg-sheet-item wa-msg-sheet-item--cancel" @click="funnelMsgMenuIdx = null">Cancelar</button>
              </div>
            </div>
            <div v-if="funnelTyping" class="wa-row wa-row--her">
              <div class="wa-bubble wa-bubble--her wa-bubble--typing">
                <span class="wa-dot"></span><span class="wa-dot"></span><span class="wa-dot"></span>
              </div>
            </div>
          </div>

          <div class="wa-quick wa-funnel-quick" :class="{ 'wa-funnel-quick--busy': funnelTyping, 'wa-funnel-quick--empty': !funnelTyping && !funnelOptions.length }">
            <template v-if="!funnelTyping && funnelOptions.length">
              <button
                v-for="opt in funnelOptions"
                :key="opt.key"
                type="button"
                class="wa-quick-btn"
                :class="opt.variant || 'wa-quick--yes'"
                @click="answerFunnel(opt)"
              >
                {{ opt.label }}
              </button>
            </template>
            <div v-else class="wa-funnel-quick-placeholder" aria-hidden="true"></div>
          </div>


          <!-- Balão flutuante: lead descreve o vídeo avulso -->
          <div
            v-if="funnelStep === 'video_avulso' && !funnelTyping"
            class="wa-float-reply"
            style="position:absolute;left:12px;right:12px;bottom:72px;z-index:30;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:16px;background:rgba(17,24,28,.96);border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 40px rgba(0,0,0,.45)"
          >
            <p style="margin:0;font-size:13px;opacity:.9;line-height:1.35">✏️ Descreve como você quer o vídeo…</p>
            <textarea
              v-model="funnelInput"
              rows="3"
              placeholder="Ex: quero você de lingerie vermelha, gemendo meu nome…"
              style="width:100%;resize:vertical;min-height:72px;max-height:140px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;padding:10px 12px;font-size:14px;line-height:1.4;outline:none;box-sizing:border-box"
              @keydown.enter.exact.prevent="sendFunnelFreeText"
            ></textarea>
            <button
              type="button"
              :disabled="!funnelInput.trim() || funnelTyping"
              @click="sendFunnelFreeText"
              style="align-self:flex-end;border:0;border-radius:999px;padding:10px 18px;font-weight:600;font-size:14px;cursor:pointer;background:#25d366;color:#06280f;opacity:1"
              :style="{ opacity: (!funnelInput.trim() || funnelTyping) ? 0.5 : 1 }"
            >
              Enviar pedido
            </button>
          </div>

          <!-- Painel de emojis -->
          <div v-if="showFunnelEmojiPicker && !funnelBlocked" class="wa-emoji-panel" @click.stop>
            <button
              v-for="em in FUNNEL_EMOJIS"
              :key="em"
              type="button"
              class="wa-emoji-item"
              @click="insertFunnelEmoji(em)"
            >{{ em }}</button>
          </div>

          <!-- Preview áudio: após parar gravação → descartar ou enviar -->
          <div v-if="funnelAudioPreviewUrl" class="wa-audio-preview">
            <audio :src="funnelAudioPreviewUrl" controls preload="metadata"></audio>
            <button type="button" class="wa-audio-preview-btn wa-audio-preview-btn--discard" @click="discardFunnelAudio">Descartar</button>
            <button type="button" class="wa-audio-preview-btn wa-audio-preview-btn--send" @click="sendFunnelAudioPreview">Enviar</button>
          </div>

          <div
            class="wa-composer wa-funnel-composer"
            :class="{ 'wa-composer--blocked': funnelBlocked }"
            @click.capture="funnelBlocked && onFunnelComposerInteract($event)"
          >
            <!-- overlay: 1 toque abre o popup (mobile não precisa segurar) -->
            <button
              v-if="funnelBlocked"
              type="button"
              class="wa-composer-block-hit"
              aria-label="Desbloquear chat"
              @click.stop.prevent="onFunnelComposerInteract"
            ></button>
            <button type="button" class="wa-composer-icon" aria-label="Emoji" tabindex="-1" @click="funnelBlocked ? onFunnelComposerInteract() : onFunnelEmoji()">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </button>
            <input
              v-model="funnelInput"
              class="wa-input"
              type="text"
              :placeholder="funnelBlocked ? 'Toque para desbloquear' : 'Mensagem'"
              :disabled="funnelBlocked || funnelTyping"
              @focus="!funnelBlocked && onFunnelComposerInteract()"
              @click="!funnelBlocked && onFunnelComposerInteract()"
              @keydown="onFunnelComposerKey"
              @keydown.enter.prevent="sendFunnelFreeText"
            />
            <button type="button" class="wa-composer-icon" aria-label="Anexar" tabindex="-1" @click="funnelBlocked ? onFunnelComposerInteract() : onFunnelAttach()">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button type="button" class="wa-composer-icon" aria-label="Camera" tabindex="-1" @click="funnelBlocked ? onFunnelComposerInteract() : onFunnelCamera()">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
            <button
              type="button"
              class="wa-composer-icon wa-composer-mic"
              :class="{ 'is-rec': funnelRecording }"
              aria-label="Audio"
              tabindex="-1"
              @click="funnelBlocked ? onFunnelComposerInteract() : onFunnelAudio()"
            >
              <svg v-if="!funnelRecording" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
              <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            </button>
            <button
              v-if="!funnelBlocked"
              type="button"
              class="wa-send"
              aria-label="Enviar"
              :disabled="!funnelInput.trim() || funnelTyping"
              @click="sendFunnelFreeText"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>

          <!-- Menu anexos estilo WhatsApp -->
          <div v-if="showFunnelAttachMenu" class="wa-attach-menu" @click.self="showFunnelAttachMenu = false">
            <div class="wa-attach-sheet wa-attach-sheet--grid">
              <p class="wa-attach-title">Anexar</p>
              <div class="wa-attach-grid">
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('doc')"><span class="wa-attach-ico wa-attach-ico--doc">📄</span><span>Documento</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('camera')"><span class="wa-attach-ico wa-attach-ico--cam">📷</span><span>Câmera</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('gallery')"><span class="wa-attach-ico wa-attach-ico--gal">🖼️</span><span>Galeria</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('audio')"><span class="wa-attach-ico wa-attach-ico--aud">🎧</span><span>Áudio</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('location')"><span class="wa-attach-ico wa-attach-ico--loc">📍</span><span>Localização</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('contact')"><span class="wa-attach-ico wa-attach-ico--ct">👤</span><span>Contato</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('poll')"><span class="wa-attach-ico wa-attach-ico--poll">📊</span><span>Enquete</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('event')"><span class="wa-attach-ico wa-attach-ico--ev">📅</span><span>Evento</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('sticker')"><span class="wa-attach-ico wa-attach-ico--stk">✨</span><span>Figurinha</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('pix')"><span class="wa-attach-ico wa-attach-ico--pix">💚</span><span>Chave PIX</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('form')"><span class="wa-attach-ico wa-attach-ico--form">📋</span><span>Formulário</span></button>
                <button type="button" class="wa-attach-tile" @click="onFunnelAttachAction('quick')"><span class="wa-attach-ico wa-attach-ico--quick">⚡</span><span>Respostas rápidas</span></button>
              </div>
              <button type="button" class="wa-attach-item wa-attach-item--cancel" @click="showFunnelAttachMenu = false">Cancelar</button>
            </div>
          </div>

          <!-- Menu ⋮ mais opções -->
          <div v-if="showFunnelMoreMenu" class="wa-more-menu" @click.self="showFunnelMoreMenu = false">
            <div class="wa-more-sheet">
              <div class="wa-more-sheet-head">
                <span class="wa-more-sheet-title">Opções</span>
                <button type="button" class="wa-more-x" aria-label="Fechar opções" @click="showFunnelMoreMenu = false">✕</button>
              </div>
              <button type="button" class="wa-more-item" @click="onFunnelMoreAction('ai')">Respostas da IA</button>
              <button type="button" class="wa-more-item" @click="onFunnelMoreAction('charge')">Cobrar cliente</button>
              <button type="button" class="wa-more-item" @click="onFunnelMoreAction('media')">Mídia, links e docs</button>
              <button type="button" class="wa-more-item" @click="onFunnelMoreAction('search')">Pesquisar</button>
              <button type="button" class="wa-more-item" @click="onFunnelMoreAction('mute')">Silenciar notificações</button>
              <button type="button" class="wa-more-item" @click="onFunnelMoreAction('clear')">Limpar conversa</button>
              <button type="button" class="wa-more-item wa-more-item--danger" @click="onFunnelMoreAction('block')">Bloquear</button>
              <button type="button" class="wa-more-item wa-more-item--cancel" @click="showFunnelMoreMenu = false">Fechar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Planos low-ticket do chat (SyncPay) -->
      

      <!-- Chamada entrando -->
      <div v-if="showIncomingCall" class="vc-incoming" style="position:fixed;inset:0;z-index:40000;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:48px 24px 40px;background:rgba(6,8,12,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)">
        <div style="text-align:center;margin-top:24px">
          <p style="margin:0;font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.75;color:#fff">Chamada de vídeo</p>
          <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff">Wanessa está te ligando…</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
          <div style="width:148px;height:148px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,.35);box-shadow:0 0 0 10px rgba(37,211,102,.12),0 20px 50px rgba(0,0,0,.45)">
            <img src="/model.jpg" alt="Wanessa" style="width:100%;height:100%;object-fit:cover" draggable="false" />
          </div>
          <p style="margin:0;color:#fff;opacity:.85;font-size:15px">tocando…</p>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:48px;width:100%;max-width:360px;margin-bottom:12px">
          <button type="button" @click="declineIncomingCall" style="display:flex;flex-direction:column;align-items:center;gap:8px;background:transparent;border:0;color:#fff;cursor:pointer">
            <span style="width:68px;height:68px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(239,68,68,.4)">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M16 8l-8 8M8 8l8 8"/></svg>
            </span>
            <span style="font-size:13px;opacity:.9">Recusar</span>
          </button>
          <button type="button" @click="acceptIncomingCall" style="display:flex;flex-direction:column;align-items:center;gap:8px;background:transparent;border:0;color:#fff;cursor:pointer">
            <span style="width:68px;height:68px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(34,197,94,.45)">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.22.35-.61.23-1.01-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
            </span>
            <span style="font-size:13px;opacity:.9">Atender</span>
          </button>
        </div>
      </div>

      <!-- Por que recusou -->
      <div v-if="showDeclineWhy" class="chat-plans-overlay" style="z-index:40001" @click.self="showDeclineWhy = false">
        <div class="chat-plans-sheet" role="dialog" @click.stop style="max-width:400px">
          <div class="chat-plans-head">
            <div>
              <p class="chat-plans-kicker">Pode falar</p>
              <h3>Por que recusou?</h3>
              <p class="chat-plans-sub">Pode ser sincero, sem julgar 💕</p>
            </div>
            <button type="button" class="chat-plans-x" @click="showDeclineWhy = false">✕</button>
          </div>
          <div style="padding:0 4px 12px;display:flex;flex-direction:column;gap:10px">
            <textarea v-model="declineWhyText" rows="3" placeholder="Ex: tá caro, agora não posso, tenho vergonha…" style="width:100%;box-sizing:border-box;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;padding:10px 12px;font-size:14px;resize:vertical"></textarea>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              <button type="button" class="wa-quick wa-quick--no" style="font-size:12px" @click="declineWhyText = 'Tá caro agora'; submitDeclineWhy()">Tá caro</button>
              <button type="button" class="wa-quick wa-quick--no" style="font-size:12px" @click="declineWhyText = 'Agora não posso'; submitDeclineWhy()">Agora não</button>
              <button type="button" class="wa-quick wa-quick--no" style="font-size:12px" @click="declineWhyText = 'Tenho vergonha'; submitDeclineWhy()">Vergonha</button>
            </div>
            <button type="button" class="wl-btn wl-btn-primary" @click="submitDeclineWhy">Enviar</button>
          </div>
        </div>
      </div>

      <!-- Videochamada ao vivo (após pagamento) -->
      <div v-if="showVideoCallPlayer" class="vc-live" style="position:fixed;inset:0;z-index:40000;background:#0a0a0c;display:flex;flex-direction:column">
        <div style="position:absolute;top:0;left:0;right:0;padding:16px 16px 8px;display:flex;justify-content:space-between;align-items:center;z-index:2;background:linear-gradient(to bottom,rgba(0,0,0,.65),transparent)">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="/model.jpg" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.3)" />
            <div>
              <p style="margin:0;color:#fff;font-weight:600;font-size:14px">Wanessa · ao vivo</p>
              <p style="margin:0;color:#4ade80;font-size:12px">{{ formatCallClock(videoCallSecondsUsed) }} · resta {{ formatCallClock(videoCallSecondsLeft) }}</p>
            </div>
          </div>
          <button type="button" @click="endLiveVideoCall('hangup')" style="border:0;border-radius:999px;padding:8px 14px;background:#ef4444;color:#fff;font-weight:600;cursor:pointer">Encerrar</button>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;background:#000">
          <video
            v-if="videoCallVideos[videoCallIndex]"
            :key="videoCallVideos[videoCallIndex]"
            :src="videoCallVideos[videoCallIndex]"
            autoplay
            playsinline
            @ended="onVideoCallMediaEnded"
            style="width:100%;height:100%;max-height:100vh;object-fit:contain;background:#000"
          ></video>
          <div v-else style="color:#fff;opacity:.8;text-align:center;padding:24px">
            <img src="/model.jpg" alt="" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin-bottom:12px;border:3px solid rgba(255,255,255,.25)" />
            <p>Videochamada ao vivo</p>
            <p style="font-size:13px;opacity:.7">Configure os vídeos no painel admin</p>
          </div>
        </div>
        <div style="padding:16px;display:flex;justify-content:center;background:linear-gradient(to top,rgba(0,0,0,.8),transparent)">
          <button type="button" @click="endLiveVideoCall('hangup')" style="width:64px;height:64px;border-radius:50%;border:0;background:#ef4444;color:#fff;cursor:pointer;box-shadow:0 8px 24px rgba(239,68,68,.45)">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M16 8l-8 8M8 8l8 8"/></svg>
          </button>
        </div>
      </div>


      <!-- Unlock após bloqueio (programa/presencial) -->
      <!-- Mimo / presente (fluxo separado do bloqueio) -->
      <div v-if="showMimoGiftModal" class="chat-plans-overlay mimo-gift-overlay" style="z-index:40060" @click.self="closeMimoGiftModal">
        <div class="mimo-gift-card" @click.stop>
          <button type="button" class="chat-plans-x mimo-gift-x" aria-label="Fechar" @click="closeMimoGiftModal">✕</button>
          <img class="mimo-gift-avatar" src="/model.jpg" alt="Wanessa" draggable="false" />
          <p class="mimo-gift-name">Wanessa</p>
          <label class="mimo-gift-label" for="mimo-gift-amount">Digite o valor do mimo pra Wanessa</label>
          <div class="mimo-gift-amount-wrap">
            <span class="mimo-gift-currency">R$</span>
            <input
              id="mimo-gift-amount"
              v-model="mimoGiftAmount"
              class="mimo-gift-amount"
              type="text"
              inputmode="decimal"
              placeholder="0,00"
              autocomplete="off"
            />
          </div>
          <label class="mimo-gift-label mimo-gift-label--msg" for="mimo-gift-msg">Mensagem (opcional)</label>
          <textarea
            id="mimo-gift-msg"
            v-model="mimoGiftMessage"
            class="mimo-gift-msg"
            rows="3"
            maxlength="300"
            placeholder="Escreva algo… ou deixe em branco"
          ></textarea>
          <p v-if="mimoGiftError" class="mimo-gift-error">{{ mimoGiftError }}</p>
          <button
            type="button"
            class="mimo-gift-send"
            :disabled="mimoGiftLoading"
            @click="sendMimoGift"
          >
            {{ mimoGiftLoading ? 'Gerando PIX…' : 'Enviar mimo' }}
          </button>
        </div>
      </div>

      <!-- Lead bloqueou Wanessa: justificativa obrigatória -->
      <div v-if="showBlockReasonModal" class="chat-plans-overlay" style="z-index:40070" @click.self="closeBlockReasonModal">
        <div class="block-reason-card" @click.stop>
          <button type="button" class="chat-plans-x" aria-label="Fechar" @click="closeBlockReasonModal">✕</button>
          <p class="block-reason-title">Por que você quer bloquear essa pessoa?</p>
          <p class="block-reason-sub">A justificativa é obrigatória para o sistema registrar o bloqueio.</p>
          <textarea
            v-model="blockReasonDraft"
            class="block-reason-input"
            rows="4"
            maxlength="400"
            placeholder="Explique o motivo…"
          ></textarea>
          <p v-if="blockReasonError" class="block-reason-error">{{ blockReasonError }}</p>
          <button type="button" class="block-reason-confirm" @click="confirmLeadBlock">
            Confirmar bloqueio
          </button>
        </div>
      </div>

      <!-- Lead bloqueou Wanessa (tela dele) -->
      <div v-if="leadBlockedWanessa && showWaFunnel" class="wa-perm-block-overlay" @click.stop>
        <div class="wa-perm-block-card">
          <p class="wa-perm-block-title">Você bloqueou Wanessa</p>
          <p class="wa-perm-block-sub">Você não poderá mais mandar mensagem pra ela nem ela pra você.</p>
          <p v-if="leadBlockReason" class="wa-perm-block-sub" style="opacity:.75">Motivo: {{ leadBlockReason }}</p>
        </div>
      </div>

      <!-- Admin/sistema bloqueou o lead (Wanessa te bloqueou) + segunda chance -->
      <div v-if="funnelPermBlocked && !leadBlockedWanessa && showWaFunnel" class="wa-perm-block-overlay" @click.stop>
        <div class="wa-perm-block-card">
          <p class="wa-perm-block-title">Wanessa te bloqueou permanentemente</p>
          <p class="wa-perm-block-sub">Você não pode digitar, enviar áudio, emoji, mídia nem fazer chamadas.</p>
          <p class="wa-perm-block-sub">Ainda quer uma segunda chance? Envie um mimo para desbloqueio automático.</p>
          <button type="button" class="wa-perm-block-btn" :disabled="blockedUnlockLoading" @click="startSegundaChanceMimo">
            {{ blockedUnlockLoading ? 'Gerando PIX…' : 'Enviar mimo · R$ 29,90' }}
          </button>
        </div>
      </div>

      <div v-if="showBlockedUnlock" class="chat-plans-overlay" style="z-index:40050" @click.self="showBlockedUnlock = false">
        <div class="chat-plans-sheet" role="dialog" aria-modal="true" @click.stop>
          <div class="chat-plans-handle" aria-hidden="true"></div>
          <div class="chat-plans-head">
            <div>
              <p class="chat-plans-kicker">Chat bloqueado</p>
              <h3>Desbloquear conversa</h3>
              <p class="chat-plans-sub">Você pode liberar o chat de novo por R$ 49,90 e continuar falando comigo 🔥</p>
            </div>
            <button type="button" class="chat-plans-x" aria-label="Fechar" @click="showBlockedUnlock = false">✕</button>
          </div>
          <button
            type="button"
            class="chat-plan-card chat-plan-card--hot"
            :disabled="blockedUnlockLoading"
            @click="buyBlockedUnlock"
          >
            <div class="chat-plan-left">
              <span class="chat-plan-badge">Desbloqueio</span>
              <span class="chat-plan-title">Liberar chat</span>
              <span class="chat-plan-desc">volta a digitar e conversar</span>
            </div>
            <div class="chat-plan-right">
              <span class="chat-plan-price">R$ 49,90</span>
              <span class="chat-plan-cta">{{ blockedUnlockLoading ? 'Gerando PIX…' : 'Pagar' }}</span>
            </div>
          </button>
          <p v-if="blockedUnlockError" class="chat-plans-error">{{ blockedUnlockError }}</p>
          <p class="chat-plans-note">Pagamento via PIX · libera na hora</p>
        </div>
      </div>

      <div v-if="showChatPlans" class="chat-plans-overlay" @click.self="closeChatPlans">
        <div class="chat-plans-sheet" role="dialog" aria-modal="true" @click.stop>
          <div class="chat-plans-handle" aria-hidden="true"></div>
          <div class="chat-plans-head">
            <div>
              <p class="chat-plans-kicker">Chat privado</p>
              <h3>Desbloqueie a conversa</h3>
              <p class="chat-plans-sub">Escolhe um plano e fala comigo agora 🔥</p>
            </div>
            <button type="button" class="chat-plans-x" aria-label="Fechar" @click="closeChatPlans">✕</button>
          </div>
          <button
            v-if="isAdmin"
            type="button"
            class="chat-plan-card"
            style="border-color:rgba(34,197,94,.45);margin-bottom:10px"
            :disabled="!!chatPayLoading"
            @click="adminUnlockChat"
          >
            <div class="chat-plan-left">
              <span class="chat-plan-title">🛠 Saldo admin (∞)</span>
              <span class="chat-plan-desc">Desbloqueia o chat sem PIX (teste)</span>
            </div>
            <div class="chat-plan-right">
              <span class="chat-plan-price" style="color:#4ade80">∞</span>
              <span class="chat-plan-cta">{{ chatPayLoading === 'admin' ? 'Liberando…' : 'Usar saldo' }}</span>
            </div>
          </button>
          <div class="chat-plans-list">
            <button
              v-for="p in chatPlans"
              :key="p.key"
              type="button"
              class="chat-plan-card"
              :class="{ 'chat-plan-card--hot': p.hot, 'is-loading': chatPayLoading === p.key }"
              :disabled="!!chatPayLoading"
              @click="buyChatPlan(p)"
            >
              <div class="chat-plan-left">
                <span class="chat-plan-badge" v-if="p.hot">Mais vendido</span>
                <span class="chat-plan-title">{{ p.title }}</span>
                <span class="chat-plan-desc">{{ p.desc }}</span>
              </div>
              <div class="chat-plan-right">
                <span class="chat-plan-price">R$ {{ p.priceLabel }}</span>
                <span class="chat-plan-cta">{{ chatPayLoading === p.key ? 'Gerando PIX…' : 'Pagar' }}</span>
              </div>
            </button>
          </div>
          <p v-if="chatPayError" class="chat-plans-error">{{ chatPayError }}</p>
          <p class="chat-plans-note">Pagamento via PIX · libera na hora</p>
        </div>
      </div>

      <!-- Modal PIX gerado -->
      <div v-if="showPixModal" class="chat-plans-overlay" @click.self="closePixModal">
        <div class="chat-plans-sheet chat-pix-sheet" role="dialog" aria-modal="true" @click.stop>
          <div class="chat-plans-handle" aria-hidden="true"></div>
          <div class="chat-plans-head">
            <div>
              <p class="chat-plans-kicker">PIX gerado</p>
              <h3>{{ selectedChatPlan?.title || 'Chat' }}</h3>
              <p class="chat-plans-sub">R$ {{ selectedChatPlan?.priceLabel }} · pague e me chama</p>
            </div>
            <button type="button" class="chat-plans-x" aria-label="Fechar" @click="closePixModal">✕</button>
          </div>
          <div class="chat-pix-body">
            <div v-if="pixQrImage && pixIsEmv" class="chat-pix-qr-wrap">
              <img :src="pixQrImage" alt="QR Code PIX" class="chat-pix-qr" />
            </div>
            <p class="chat-pix-hint">Copia e cola PIX (SyncPay):</p>
            <textarea class="chat-pix-code chat-pix-code--area" readonly rows="3" :value="pixCopyCode" />
            <div class="chat-pix-copy-row">
              <button type="button" class="chat-pix-copy-btn chat-pix-copy-btn--full" @click="copyPixCode">{{ pixCopied ? 'Código copiado!' : 'Copiar código PIX' }}</button>
            </div>
            <p class="chat-pix-status" :class="{ 'is-ok': pixPaid }">{{ pixStatusText }}</p>
            <button type="button" class="chat-pix-status-btn" :disabled="pixStatusLoading" @click="checkPixStatus">
              {{ pixStatusLoading ? 'Consultando Banco Central…' : 'Consultar status da transação' }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="showLogin && !isAdmin" class="wl-overlay" @click.self="showLogin = false">
        <div class="wl-card" role="dialog" aria-modal="true" @click.stop>
          <h2>Acesso admin</h2>
          <div class="wl-pass-wrap" style="position:relative;display:flex;align-items:center">
            <input
              ref="passInput"
              v-model="password"
              :type="showAdminPass ? 'text' : 'password'"
              placeholder="Senha"
              autocomplete="current-password"
              class="wl-input wl-input-pass" style="padding-right:44px;width:100%"
              @keyup.enter="doLogin"
            />
            <button
              type="button"
              class="wl-pass-eye" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:0;padding:4px;cursor:pointer;color:rgba(255,255,255,0.65);display:flex;align-items:center;justify-content:center"
              :aria-label="showAdminPass ? 'Ocultar senha' : 'Mostrar senha'"
              @click="showAdminPass = !showAdminPass"
            >
              <svg v-if="!showAdminPass" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <p v-if="loginError" class="wl-error">{{ loginError }}</p>
          <button type="button" class="wl-btn wl-btn-primary" :disabled="loading" @click="doLogin">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
          <button type="button" class="wl-btn wl-btn-ghost" @click="showLogin = false">Cancelar</button>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="isAdmin && showAdminPanel" class="wl-overlay" @click.self="closeAdmin">
        <div class="wl-card" role="dialog" aria-modal="true" @click.stop>
          <div class="wl-head"><h2>Editar apresentação</h2><div class="wl-head-actions" style="display:flex;gap:8px;align-items:center"><button type="button" class="wl-x" style="width:auto;min-width:52px;padding:0 10px;font-size:13px" @click="doLogout">Sair</button><button type="button" class="wl-x" @click="closeAdmin">×</button></div></div>
          <label class="wl-label">Nome</label>
          <input v-model="edit.name" type="text" maxlength="80" class="wl-input" />
          <label class="wl-label">Tagline / Bio</label>
          <input v-model="edit.bio" type="text" maxlength="200" class="wl-input" />
          <label class="wl-label">Botão em destaque (RGB)</label>
          <select v-model="edit.highlight_label" class="wl-input wl-select">
            <option value="">Nenhum</option>
            <option v-for="l in edit.links.filter((x) => x.label.trim())" :key="l.label" :value="l.label">{{ l.label }}</option>
          </select>
          <label class="wl-label" style="margin-top:14px">Quiz / Funil de entrada</label>
          <label class="wl-toggle" style="margin-bottom:12px">
            <input type="checkbox" :checked="edit.quiz_enabled === true" @change="edit.quiz_enabled = ($event.target as HTMLInputElement).checked" />
            <span>{{ edit.quiz_enabled ? 'Ativado' : 'Desativado (temporário)' }}</span>
          </label>
          <div class="wl-links-head"><span class="wl-label" style="margin:0">Links (admin)</span><button type="button" class="wl-btn wl-btn-sm wl-btn-primary" @click="addLink">+ Adicionar</button></div>
          <div v-for="(l, i) in edit.links" :key="i" class="wl-link-edit" :class="{ 'is-off': l.enabled === false }">
            <div class="wl-link-row"><input v-model="l.icon" class="wl-input wl-icon" placeholder="🔥" /><input v-model="l.label" class="wl-input" placeholder="Título" /></div>
            <input v-model="l.url" class="wl-input" placeholder="https://..." />
            <textarea v-model="l.desc" class="wl-input wl-textarea" placeholder="Texto acima do botão (opcional)" maxlength="300" rows="3" />
            <div class="wl-link-actions">
              <label class="wl-toggle"><input type="checkbox" :checked="l.enabled !== false" @change="l.enabled = ($event.target as HTMLInputElement).checked" /><span>{{ l.enabled === false ? 'Desativado' : 'Ativo' }}</span></label>
              <button type="button" class="wl-btn wl-btn-sm wl-btn-danger" @click="removeLink(i)">Remover</button>
            </div>
          </div>
          <p v-if="saveMsg" class="wl-ok">{{ saveMsg }}</p>
          <p v-if="saveError" class="wl-error">{{ saveError }}</p>
          <div class="wl-row">
            
          <label class="wl-label">Vídeos da videochamada (URLs, um por linha)</label>
          <textarea v-model="editVideoCallUrls" class="wl-input" rows="3" placeholder="https://.../video1.mp4" style="min-height:72px;resize:vertical"></textarea>
          <p class="wl-hint" style="opacity:.7;font-size:12px;margin:4px 0 12px">Depois do PIX da videochamada, o lead assiste esses vídeos aqui no chat (não vai pro WhatsApp).</p>

          <button type="button" class="wl-btn wl-btn-primary" :disabled="loading" @click="doSave">{{ loading ? 'Salvando...' : 'Salvar' }}</button>
            <button type="button" class="wl-btn wl-btn-ghost" @click="closeAdmin">Fechar</button>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
type LinkItem = { label: string; icon: string; url: string; desc?: string; logo?: string; enabled?: boolean }
type ChatMsg = { from: 'her' | 'me'; text: string; time: string }
import { LOGO_TG_BLUE, LOGO_TG_PURPLE, LOGO_PRIVSEX } from '~/utils/logos'
import { getDeviceFingerprint } from '~/utils/fingerprint'
import { IG_PROFILE_SRC as igProfileSrc } from '~/utils/ig-profile'
import { detectLocale, isBrazilAudience, t as tr, type Locale } from '~/utils/i18n'

/** Lead veio de /CanalPublico (tráfego do canal) → esconde botão do canal público (checkout direto) */
const route = useRoute()
const isAdminRoute = computed(() => {
  const p = String(route.path || '').toLowerCase().replace(/\/+$/, '')
  return p === '/admin/chat' || p.endsWith('/admin/chat')
})
const hidePublicChannel = computed(() => {
  const raw = (route.path || '') + ' ' + (route.fullPath || '')
  const p = raw.toLowerCase().replace(/\/+$/, '')
  return (
    p.includes('/canalpublico') ||
    p.includes('canalpublico') ||
    (typeof window !== 'undefined' && /\/canalpublico/i.test(window.location.pathname || ''))
  )
})
import '~/assets/css/links-page.css'

const DEFAULT_HIGHLIGHT = 'PrivSex'
const VID_KEY = 'wanessa_vid'
const VIEW_DAY_KEY = 'wanessa_view_day'
const CLICK_DAY_PREFIX = 'wanessa_click_'
const GATE_KEY = 'wanessa_gate_v1'

const privsexUrl = 'https://privsex.com/wanessa'
const telegramPublicUrl = 'https://t.me/+yA5Y1pAWx5RlMWIx'
const telegramPublicUrlIntl = 'https://t.me/+2bYvtb_AA0AzMTcx'
const vipBotUrl = 'https://t.me/wanessaavipbot?start=Pressel'
const locale = ref<Locale>('pt')
const isPt = computed(() => isBrazilAudience()) // true only BR; pt-PT = false (intl)
const telegramPublicUrlActive = computed(() => isPt.value ? telegramPublicUrl : telegramPublicUrlIntl)
function t(key: string) { return tr(locale.value, key) }
const whatsappUrl = computed(() => 'https://wa.me/5547992750967?text=' + encodeURIComponent(t('waPrefill')))

const PIX_KEY = '47992750967'
const showWaFunnel = ref(false)
const isChatLanding = ref(false)
const showFunnelPhoto = ref(false)

const funnelInput = ref('')
const funnelShellStyle = ref<Record<string, string>>({})
const funnelChatUnlocked = ref(false)
const funnelBlocked = ref(false) // lead insistiu em programa/encontro presencial
const funnelPermBlocked = ref(false) // Wanessa bloqueou o lead (sistema/admin)
const leadBlockedWanessa = ref(false) // lead bloqueou Wanessa (com justificativa)
const leadBlockReason = ref('')
const showBlockReasonModal = ref(false)
const blockReasonDraft = ref('')
const blockReasonError = ref('')
const showBlockedUnlock = ref(false)
const PERM_BLOCK_KEY = 'wanessa_perm_block_v1'
const LEAD_BLOCK_KEY = 'wanessa_lead_block_v1'
const SEGUNDA_CHANCE_PLAN = { key: 'chat_unlock_segunda_chance', title: 'Segunda chance', desc: 'mimo para desbloquear o chat', price: 29.9, priceLabel: '29,90' }
const showMimoGiftModal = ref(false)
const mimoGiftAmount = ref('')
const mimoGiftMessage = ref('')
const mimoGiftError = ref('')
const mimoGiftLoading = ref(false)
const funnelMsgMenuIdx = ref<number | null>(null)
const funnelEditingIdx = ref<number | null>(null)
const funnelEditDraft = ref('')

const blockedUnlockLoading = ref(false)
const blockedUnlockError = ref('')
const BLOCKED_UNLOCK_PLAN = { key: 'chat_unlock_blocked', title: 'Desbloquear chat', desc: 'libera a conversa de novo', price: 49.9, priceLabel: '49,90' }
const funnelRecording = ref(false)
const funnelAudioPreviewUrl = ref('')
const showFunnelEmojiPicker = ref(false)
const FUNNEL_EMOJIS = ['😀','😂','😍','😘','😏','🔥','❤️','💕','😈','🫣','😋','🤤','💦','🍑','🍆','💋','😊','😉','🥰','😮','😢','🙏','👍','👏','🎉','✨','💯','🔞','🫣','😳','🥵','🛏️']
const showFunnelAttachMenu = ref(false)
const showFunnelMoreMenu = ref(false)
const funnelCameraInput = ref<HTMLInputElement | null>(null)
const funnelPhotoInput = ref<HTMLInputElement | null>(null)
const funnelVideoInput = ref<HTMLInputElement | null>(null)
const funnelAudioInput = ref<HTMLInputElement | null>(null)
const funnelDocInput = ref<HTMLInputElement | null>(null)
let funnelMediaRecorder: MediaRecorder | null = null
let funnelAudioChunks: BlobPart[] = []

function requireFunnelChatOrPay(): boolean {
  // Digitar mensagens é livre. Cobra só por packs, vídeo, mídia, etc.
  return true
}
function onFunnelComposerInteract(e?: Event) {
  if (leadBlockedWanessa.value || funnelPermBlocked.value) {
    try { e?.preventDefault?.(); e?.stopPropagation?.() } catch {}
    return
  }
  if (!funnelBlocked.value) return
  try { e?.preventDefault?.(); e?.stopPropagation?.() } catch {}
  blockedUnlockError.value = ''
  showBlockedUnlock.value = true
  try { track('chat_blocked_unlock_open', { offer_slug: 'chat_unlock_blocked' }) } catch {}
}
function onFunnelComposerKey(e: KeyboardEvent) {
  // Digitar é livre
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    // send handled elsewhere if needed
  }
}

function onFunnelCamera() {
  if (!requireFunnelChatOrPay()) return
  funnelCameraInput.value?.click()
}
function onFunnelAttach() {
  if (!requireFunnelChatOrPay()) return
  showFunnelEmojiPicker.value = false
  showFunnelAttachMenu.value = true
}
function onFunnelEmoji() {
  if (!requireFunnelChatOrPay()) return
  if (funnelBlocked.value) {
    onFunnelComposerInteract()
    return
  }
  showFunnelEmojiPicker.value = !showFunnelEmojiPicker.value
}
function insertFunnelEmoji(em: string) {
  funnelInput.value = (funnelInput.value || '') + em
}
function closeFunnelEmojiPicker() {
  showFunnelEmojiPicker.value = false
}
function onFunnelVideoCall() {
  showFunnelMoreMenu.value = false
  if (funnelPermBlocked.value || leadBlockedWanessa.value) return
  if (videoCallUnlocked.value || isAdmin.value) {
    openVideoCallPlayer()
    return
  }
  startIncomingVideoCall()
}
function onFunnelVoiceCall() {
  if (!requireFunnelChatOrPay()) return
  pushFunnel('me', 'Chamada de voz')
  setTimeout(() => {
    funnelType('Chamada de voz também rola… mas ao vivo fica bem mais gostoso. Prefere vídeo ou só áudio? 😏', 900)
  }, 300)
}
function pickFunnelMedia(kind: 'photo' | 'video' | 'audio' | 'doc') {
  showFunnelAttachMenu.value = false
  if (kind === 'photo') funnelPhotoInput.value?.click()
  else if (kind === 'video') funnelVideoInput.value?.click()
  else if (kind === 'doc') funnelDocInput.value?.click()
  else funnelAudioInput.value?.click()
}
function onFunnelAttachAction(kind: string) {
  showFunnelAttachMenu.value = false
  if (!requireFunnelChatOrPay()) return
  if (kind === 'camera') { onFunnelCamera(); return }
  if (kind === 'gallery') { pickFunnelMedia('photo'); return }
  if (kind === 'audio') { pickFunnelMedia('audio'); return }
  if (kind === 'doc') { pickFunnelMedia('doc'); return }
  if (kind === 'pix') {
    pushFunnel('me', 'Chave PIX')
    setTimeout(() => {
      funnelType('Quer pagar por PIX? Me diz o que você quer (pack, chat, videochamada…) que eu gero o código aqui 💚', 900)
      funnelStep.value = 'menu'
    }, 300)
    return
  }
  const labels: Record<string, string> = {
    location: 'Localização',
    contact: 'Contato',
    poll: 'Enquete',
    event: 'Evento',
    sticker: 'Figurinha',
    form: 'Formulário',
    quick: 'Respostas rápidas',
  }
  const label = labels[kind] || kind
  pushFunnel('me', label)
  setTimeout(() => {
    funnelType(`Vi que você mandou ${label.toLowerCase()}… me conta melhor o que você quer, amor 😏`, 900)
  }, 300)
}
function onFunnelMoreAction(kind: string) {
  showFunnelMoreMenu.value = false
  if (kind === 'ai') {
    if (!requireFunnelChatOrPay()) return
    setTimeout(() => {
      funnelType('Posso te sugerir o que fazer… pack, chat safado ou videochamada. O que te deixa mais louco agora? 🔥', 900)
    }, 200)
    return
  }
  if (kind === 'charge') {
    openChatPlans()
    return
  }
  if (kind === 'clear') {
    funnelMessages.value = []
    funnelStep.value = 'greeting'
    funnelBlocked.value = false
    selectedPack.value = null
    funnelInput.value = ''
    try { clearFunnelState() } catch {}
    try { saveFunnelState() } catch {}
    setTimeout(() => {
      funnelType('Conversa limpa. Pode falar de novo quando quiser.', 900)
    }, 200)
    return
  }
  if (kind === 'block') {
    openBlockReasonModal()
    return
  }
  if (kind === 'mute' || kind === 'search' || kind === 'media') {
    return
  }
}

function openBlockReasonModal() {
  showFunnelMoreMenu.value = false
  if (leadBlockedWanessa.value) return
  blockReasonDraft.value = ''
  blockReasonError.value = ''
  showBlockReasonModal.value = true
}

function closeBlockReasonModal() {
  showBlockReasonModal.value = false
  blockReasonError.value = ''
}

function confirmLeadBlock() {
  const reason = String(blockReasonDraft.value || '').trim()
  if (reason.length < 5) {
    blockReasonError.value = 'Escreva o motivo (mín. 5 caracteres) para confirmar o bloqueio.'
    return
  }
  leadBlockedWanessa.value = true
  leadBlockReason.value = reason.slice(0, 400)
  funnelBlocked.value = true
  showBlockReasonModal.value = false
  showFunnelEmojiPicker.value = false
  showFunnelAttachMenu.value = false
  showFunnelMoreMenu.value = false
  showFunnelPhoto.value = false
  showFunnelProfile.value = false
  try {
    const vid = getOrCreateVisitorId()
    localStorage.setItem(
      LEAD_BLOCK_KEY,
      JSON.stringify({ visitor_id: vid, reason: leadBlockReason.value, at: Date.now() }),
    )
  } catch {}
  try { saveFunnelState() } catch {}
  try { track('funnel_lead_block', { offer_slug: 'lead_block' }) } catch {}
  // Mensagem que o admin vê no inbox
  try {
    logFunnelMessage(
      'lead',
      `Lead te bloqueou: ${leadBlockReason.value}`,
      {
        event: 'lead_blocked',
        block_reason: leadBlockReason.value,
        blocked_by: 'lead',
      },
    )
  } catch {}
}

function applyPermanentBlock() {
  // Bloqueio do lado Wanessa → lead (sistema)
  funnelPermBlocked.value = true
  funnelBlocked.value = true
  showFunnelEmojiPicker.value = false
  showFunnelAttachMenu.value = false
  showFunnelMoreMenu.value = false
  try {
    const vid = getOrCreateVisitorId()
    localStorage.setItem(PERM_BLOCK_KEY, JSON.stringify({ visitor_id: vid, at: Date.now() }))
  } catch {}
  try { saveFunnelState() } catch {}
  try { track('funnel_perm_block', { offer_slug: 'block' }) } catch {}
  try { logFunnelMessage('bot', '[bloqueio permanente]', { event: 'perm_block' }) } catch {}
}

function clearPermanentBlock() {
  funnelPermBlocked.value = false
  try { localStorage.removeItem(PERM_BLOCK_KEY) } catch {}
  try { saveFunnelState() } catch {}
}

function loadPermanentBlock() {
  try {
    const raw = localStorage.getItem(PERM_BLOCK_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    const vid = getOrCreateVisitorId()
    if (data?.visitor_id && data.visitor_id === vid) {
      funnelPermBlocked.value = true
      funnelBlocked.value = true
    }
  } catch {}
  try {
    const raw = localStorage.getItem(LEAD_BLOCK_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    const vid = getOrCreateVisitorId()
    if (data?.visitor_id && data.visitor_id === vid) {
      leadBlockedWanessa.value = true
      leadBlockReason.value = String(data.reason || '')
      funnelBlocked.value = true
    }
  } catch {}
}

function onFunnelGiftMimo() {
  if (funnelPermBlocked.value || leadBlockedWanessa.value) return
  mimoGiftError.value = ''
  mimoGiftAmount.value = ''
  mimoGiftMessage.value = ''
  showMimoGiftModal.value = true
  try { track('funnel_gift_mimo_open', { offer_slug: 'mimo_gift' }) } catch {}
}

function closeMimoGiftModal() {
  if (mimoGiftLoading.value) return
  showMimoGiftModal.value = false
  mimoGiftError.value = ''
}

function parseMimoAmount(raw: string): number {
  const s = String(raw || '').trim().replace(/R\$\s?/gi, '').replace(/\s/g, '')
  if (!s) return 0
  // 10,50 or 10.50 or 10
  if (s.includes(',') && s.includes('.')) {
    // 1.234,56
    const n = Number(s.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  if (s.includes(',')) {
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

async function sendMimoGift() {
  if (mimoGiftLoading.value) return
  mimoGiftError.value = ''
  const amount = parseMimoAmount(mimoGiftAmount.value)
  if (amount < 1) {
    mimoGiftError.value = 'Digite um valor de pelo menos R$ 1,00'
    return
  }
  if (amount > 5000) {
    mimoGiftError.value = 'Valor máximo R$ 5.000,00'
    return
  }
  const msg = String(mimoGiftMessage.value || '').trim().slice(0, 300)
  const priceLabel = amount.toFixed(2).replace('.', ',')
  mimoGiftLoading.value = true
  selectedChatPlan.value = {
    key: 'mimo_gift',
    title: 'Mimo pra Wanessa',
    desc: msg || 'presente',
    price: amount,
    priceLabel,
  }
  selectedPack.value = {
    key: 'mimo_gift',
    label: 'Mimo pra Wanessa',
    price: priceLabel,
  }
  try {
    let visitor_id: string | null = null
    try { visitor_id = getOrCreateVisitorId() } catch { visitor_id = null }
    const res = await $fetch<{
      ok: boolean
      pix_code?: string
      qr_image?: string
      payment_id?: string
      external_id?: string
      error?: string
    }>('/api/checkout/pix', {
      method: 'POST',
      body: {
        plan_key: 'mimo_gift',
        amount,
        title: msg ? `Mimo: ${msg.slice(0, 80)}` : 'Mimo pra Wanessa',
        visitor_id,
        source: 'links_mimo_gift',
        metadata: { message: msg || null },
      },
    })
    if (!res?.ok || !res.pix_code) throw new Error(res?.error || 'Falha ao gerar PIX')
    pixPaid.value = false
    pixCopyCode.value = res.pix_code
    funnelPixCode.value = res.pix_code
    const isEmv = /^000201/.test(res.pix_code)
    pixQrImage.value = isEmv
      ? (res.qr_image || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(res.pix_code)}`)
      : ''
    pixPaymentId.value = res.payment_id || ''
    pixExternalId.value = res.external_id || res.payment_id || ''
    funnelPaymentId.value = pixPaymentId.value
    funnelExternalId.value = pixExternalId.value
    showMimoGiftModal.value = false
    showPixModal.value = true
    funnelStep.value = 'awaiting_payment'
    if (msg) {
      try { pushFunnel('me', msg) } catch {}
    }
    try { pushFunnel('me', `🎁 Mimo de R$ ${priceLabel}`) } catch {}
    try { track('mimo_gift_checkout', { offer_slug: 'mimo_gift', amount }) } catch {}
    if (pixExternalId.value || pixPaymentId.value) {
      if (pixPollTimer) clearInterval(pixPollTimer)
      let tries = 0
      pixPollTimer = setInterval(() => {
        checkPixStatus(true)
        tries++
        if (tries > 45 && pixPollTimer) {
          clearInterval(pixPollTimer)
          pixPollTimer = null
        }
      }, 5000)
    }
  } catch (e: any) {
    mimoGiftError.value = e?.data?.statusMessage || e?.message || 'Não deu pra gerar o PIX agora'
  } finally {
    mimoGiftLoading.value = false
  }
}

function startSegundaChanceMimo() {
  if (blockedUnlockLoading.value) return
  try { track('segunda_chance_mimo_open', { offer_slug: SEGUNDA_CHANCE_PLAN.key }) } catch {}
  buySegundaChanceMimo()
}

async function buySegundaChanceMimo() {
  blockedUnlockError.value = ''
  blockedUnlockLoading.value = true
  selectedChatPlan.value = {
    key: SEGUNDA_CHANCE_PLAN.key,
    title: SEGUNDA_CHANCE_PLAN.title,
    desc: SEGUNDA_CHANCE_PLAN.desc,
    price: SEGUNDA_CHANCE_PLAN.price,
    priceLabel: SEGUNDA_CHANCE_PLAN.priceLabel,
  }
  selectedPack.value = {
    key: SEGUNDA_CHANCE_PLAN.key,
    label: SEGUNDA_CHANCE_PLAN.title,
    price: SEGUNDA_CHANCE_PLAN.priceLabel,
  }
  try {
    let visitor_id: string | null = null
    try { visitor_id = getOrCreateVisitorId() } catch { visitor_id = null }
    const res = await $fetch<{
      ok: boolean
      pix_code?: string
      qr_image?: string
      payment_id?: string
      external_id?: string
      error?: string
    }>('/api/checkout/pix', {
      method: 'POST',
      body: {
        plan_key: SEGUNDA_CHANCE_PLAN.key,
        amount: SEGUNDA_CHANCE_PLAN.price,
        title: SEGUNDA_CHANCE_PLAN.title,
        visitor_id,
        source: 'links_segunda_chance',
      },
    })
    if (!res?.ok || !res.pix_code) throw new Error(res?.error || 'Falha ao gerar PIX')
    pixPaid.value = false
    pixCopyCode.value = res.pix_code
    funnelPixCode.value = res.pix_code
    const isEmv = /^000201/.test(res.pix_code)
    pixQrImage.value = isEmv
      ? (res.qr_image || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(res.pix_code)}`)
      : ''
    pixPaymentId.value = res.payment_id || ''
    pixExternalId.value = res.external_id || res.payment_id || ''
    funnelPaymentId.value = pixPaymentId.value
    funnelExternalId.value = pixExternalId.value
    showPixModal.value = true
    funnelStep.value = 'awaiting_payment'
    try { track('segunda_chance_checkout', { offer_slug: SEGUNDA_CHANCE_PLAN.key, amount: 29.9 }) } catch {}
    if (pixExternalId.value || pixPaymentId.value) {
      if (pixPollTimer) clearInterval(pixPollTimer)
      let tries = 0
      pixPollTimer = setInterval(() => {
        checkPixStatus(true)
        tries++
        if (tries > 45 && pixPollTimer) {
          clearInterval(pixPollTimer)
          pixPollTimer = null
        }
      }, 5000)
    }
  } catch (e: any) {
    blockedUnlockError.value = e?.data?.statusMessage || e?.message || 'Não deu pra gerar o PIX agora'
    try { alert(blockedUnlockError.value) } catch {}
  } finally {
    blockedUnlockLoading.value = false
  }
}

function onFunnelMediaPicked(ev: Event, kind: 'photo' | 'video' | 'audio' | 'doc') {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (funnelBlocked.value) {
    onFunnelComposerInteract()
    return
  }
  const url = URL.createObjectURL(file)
  if (kind === 'photo') {
    pushFunnel('me', 'Foto', `<img class="wa-media-img" src="${url}" alt="foto" />`, { mediaKind: 'photo' })
  } else if (kind === 'video') {
    pushFunnel('me', 'Video', `<video class="wa-media-video" src="${url}" controls playsinline preload="metadata"></video>`, { mediaKind: 'video' })
  } else if (kind === 'doc') {
    pushFunnel('me', 'Documento', `<div class="wa-media-doc">📄 ${file.name || 'documento'}</div>`, { mediaKind: 'doc' })
  } else {
    pushFunnel('me', 'Audio', `<div class="wa-media-audio"><audio src="${url}" controls preload="metadata"></audio></div>`, { mediaKind: 'audio' })
  }
  try { track('funnel_media_sent', { kind }) } catch {}
  setTimeout(() => { funnelType('Recebi aqui, amor… me conta o que você quer que eu faça com isso 😏', 800) }, 400)
}
async function onFunnelAudio() {
  if (!requireFunnelChatOrPay()) return
  if (funnelBlocked.value) {
    onFunnelComposerInteract()
    return
  }
  // Já gravando → parar (NÃO envia; abre preview para descartar ou enviar)
  if (funnelRecording.value) {
    try { funnelMediaRecorder?.stop() } catch {}
    return
  }
  // Se já tem preview, não inicia outra gravação
  if (funnelAudioPreviewUrl.value) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    funnelAudioChunks = []
    const rec = new MediaRecorder(stream)
    funnelMediaRecorder = rec
    rec.ondataavailable = (e) => { if (e.data.size) funnelAudioChunks.push(e.data) }
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      funnelRecording.value = false
      const blob = new Blob(funnelAudioChunks, { type: 'audio/webm' })
      if (!blob.size) return
      try {
        if (funnelAudioPreviewUrl.value) URL.revokeObjectURL(funnelAudioPreviewUrl.value)
      } catch {}
      funnelAudioPreviewUrl.value = URL.createObjectURL(blob)
    }
    rec.start()
    funnelRecording.value = true
  } catch {
    funnelAudioInput.value?.click()
  }
}
function discardFunnelAudio() {
  try {
    if (funnelAudioPreviewUrl.value) URL.revokeObjectURL(funnelAudioPreviewUrl.value)
  } catch {}
  funnelAudioPreviewUrl.value = ''
  funnelAudioChunks = []
  funnelMediaRecorder = null
}
function sendFunnelAudioPreview() {
  const url = funnelAudioPreviewUrl.value
  if (!url) return
  pushFunnel('me', 'Audio', `<div class="wa-media-audio"><audio src="${url}" controls preload="metadata"></audio></div>`, { mediaKind: 'audio' })
  funnelAudioPreviewUrl.value = ''
  funnelAudioChunks = []
  funnelMediaRecorder = null
  try { track('funnel_media_sent', { kind: 'audio_record' }) } catch {}
  setTimeout(() => { funnelType('Recebi seu áudio. Ainda não consigo ouvir o conteúdo por aqui. Pode escrever o que você quer?', 900) }, 400)
}


// Chat bloqueado + planos low-ticket (SyncPay)
const showChatPlans = ref(false)
const showPixModal = ref(false)
const chatPayLoading = ref<string | null>(null)
const chatPayError = ref('')
const selectedChatPlan = ref<{ key: string; title: string; desc: string; price: number; priceLabel: string; hot?: boolean } | null>(null)
const pixCopyCode = ref('')
const pixQrImage = ref('')
const pixPaymentId = ref('')
const pixExternalId = ref('')
const pixCopied = ref(false)
const pixStatusText = ref('Aguardando pagamento…')
const pixStatusLoading = ref(false)
const pixPaid = ref(false)
const pixIsEmv = computed(() => /^000201/.test(pixCopyCode.value || ''))
let pixPollTimer: ReturnType<typeof setInterval> | null = null

const chatPlans = [
  { key: 'chat_quick', title: 'Chat rápido', desc: '10 min de papo safado', price: 9.9, priceLabel: '9,90' },
  { key: 'chat_basic', title: 'Chat 30 min', desc: 'conversa completa só nosso', price: 19.9, priceLabel: '19,90', hot: true },
  { key: 'chat_midia', title: 'Chat + mídias', desc: 'fotos e vídeos no momento', price: 29.9, priceLabel: '29,90' },
]

function openChatPlans() {
  chatPayError.value = ''
  showChatPlans.value = true
  try { track('chat_lock_open', { offer_slug: 'chat_plans' }) } catch {}
}
function closeChatPlans() {
  if (chatPayLoading.value) return
  showChatPlans.value = false
}
function openPreparedPixForUser() {
  const code = funnelPixCode.value || pixCopyCode.value
  if (!code || !/^000201/.test(code)) {
    funnelType('Ainda não tenho o PIX gerado… escolhe de novo o que você quer que eu gero 💚', 1000)
    return
  }
  ;(window as any).__pixAskedOnce = true
  ;(window as any).__pixCodeShown = true
  showPixModal.value = true
  funnelStep.value = 'awaiting_payment'
  const price = selectedPack.value?.price || selectedChatPlan.value?.priceLabel || ''
  funnelType(`Pronto, amor 💚 Aqui está o PIX de R$ ${price}.\n\nPaga e toca em consultar status quando concluir.`, 1200)
  // também manda no chat
  showPixCodeInChat(code, price)
  // poll de pagamento
  stopFunnelPayPoll()
  let tries = 0
  funnelPayPoll = setInterval(() => {
    tries++
    if (tries > 90) { stopFunnelPayPoll(); return }
    checkFunnelPayment(true).catch(() => {})
  }, 4000)
}

function pushPixIntoFunnelChat() {
  // NUNCA joga o código sem o lead pedir. Só pergunta e espera resposta.
  const code = funnelPixCode.value || pixCopyCode.value
  const price = selectedPack.value?.price || selectedChatPlan.value?.priceLabel || ''
  if (!code || !/^000201/.test(code)) return

  // Já mostrou o código → não insiste
  if ((window as any).__pixCodeShown) return

  // Já perguntou e ainda espera resposta → não repete spam
  if ((window as any).__pixAskedOnce) return

  ;(window as any).__pixAskedOnce = true
  pushFunnel(
    'her',
    'Posso te passar a chave PIX agora? 💚\n\nMe responde "pode", "manda" ou "sim" que eu te envio o código na hora.\n\nSe não quiser agora, sem problema — a gente continua conversando.'
  )
  // Sem setTimeout. Só mostra quando o lead confirmar em sendFunnelFreeText.
}

function showPixCodeInChat(code: string, price: string) {
  if ((window as any).__pixCodeShown) return
  ;(window as any).__pixCodeShown = true
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`
  const safe = code.replace(/</g, '&lt;')
  const html =
    `<div style="line-height:1.4">` +
    `<b>PIX R$ ${price}</b><br>` +
    `<img src="${qr}" alt="QR PIX" style="width:180px;height:180px;border-radius:10px;background:#fff;padding:6px;margin:8px 0;display:block" />` +
    `<span style="opacity:.85">Copia e cola:</span><br>` +
    `<code style="display:block;word-break:break-all;font-size:0.68em;background:rgba(0,0,0,.22);padding:8px;border-radius:8px;margin-top:4px">${safe}</code>` +
    `<br><span style="opacity:.9">Toque em <b>Copiar código PIX</b> abaixo 👇</span>` +
    `</div>`
  pushFunnel('her', `Aqui está o PIX R$ ${price} 💚`, html)
}

function closePixModal() {
  showPixModal.value = false
  // Se fechou sem autorizar antes, só lembra que pode pedir — não joga código
  if (!(window as any).__pixCodeShown && (funnelPixCode.value || pixCopyCode.value)) {
    funnelStep.value = 'pix_ask'
    funnelType('Quando quiser, toca em "Sim, pode mandar o PIX" que eu te envio a chave 💚', 1000)
  }
}
async function copyPixCode() {
  try {
    await navigator.clipboard.writeText(pixCopyCode.value)
    pixCopied.value = true
    setTimeout(() => { pixCopied.value = false }, 2000)
  } catch {
    // fallback
    try {
      const ta = document.createElement('textarea')
      ta.value = pixCopyCode.value
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      pixCopied.value = true
      setTimeout(() => { pixCopied.value = false }, 2000)
    } catch {}
  }
}

async function adminUnlockChat() {
  chatPayError.value = ''
  chatPayLoading.value = 'admin'
  try {
    await $fetch('/api/admin/test-pay', { method: 'POST' })
  } catch {
    isAdmin.value = false
    chatPayError.value = 'Só admin logado pode usar saldo da carteira.'
    chatPayLoading.value = ''
    return
  }
  isAdmin.value = true
  funnelChatUnlocked.value = true
  funnelBlocked.value = false
    startLiveChatPoll()
  showChatPlans.value = false
  chatPayLoading.value = ''
  try {
    await funnelType('Chat liberado com saldo admin (∞) ✅ Pode testar à vontade.', 900)
  } catch {}
}


async function buyBlockedUnlock() {
  blockedUnlockError.value = ''
  blockedUnlockLoading.value = true
  selectedChatPlan.value = {
    key: BLOCKED_UNLOCK_PLAN.key,
    title: BLOCKED_UNLOCK_PLAN.title,
    desc: BLOCKED_UNLOCK_PLAN.desc,
    price: BLOCKED_UNLOCK_PLAN.price,
    priceLabel: BLOCKED_UNLOCK_PLAN.priceLabel,
  }
  selectedPack.value = {
    key: BLOCKED_UNLOCK_PLAN.key,
    label: BLOCKED_UNLOCK_PLAN.title,
    price: BLOCKED_UNLOCK_PLAN.priceLabel,
  }
  try {
    let visitor_id: string | null = null
    try { visitor_id = getOrCreateVisitorId() } catch { visitor_id = null }
    const res = await $fetch<{
      ok: boolean
      pix_code?: string
      qr_image?: string
      payment_id?: string
      external_id?: string
      hint?: string
      error?: string
    }>('/api/checkout/pix', {
      method: 'POST',
      body: {
        plan_key: BLOCKED_UNLOCK_PLAN.key,
        amount: BLOCKED_UNLOCK_PLAN.price,
        title: BLOCKED_UNLOCK_PLAN.title,
        visitor_id,
        source: 'links_blocked_unlock',
      },
    })
    if (!res?.ok || !res.pix_code) {
      throw new Error(res?.error || 'Falha ao gerar PIX')
    }
    pixPaid.value = false
    pixCopyCode.value = res.pix_code
    funnelPixCode.value = res.pix_code
    const isEmv = /^000201/.test(res.pix_code)
    pixQrImage.value = isEmv
      ? (res.qr_image || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(res.pix_code)}`)
      : ''
    pixPaymentId.value = res.payment_id || ''
    pixExternalId.value = res.external_id || res.payment_id || ''
    funnelPaymentId.value = pixPaymentId.value
    funnelExternalId.value = pixExternalId.value
    pixStatusText.value = isEmv
      ? 'Aguardando pagamento… use o QR ou o copia e cola'
      : (res.hint || 'Pague o PIX e confirme o status')
    showBlockedUnlock.value = false
    showPixModal.value = true
    funnelStep.value = 'awaiting_payment'
    try { track('chat_blocked_unlock_checkout', { offer_slug: 'chat_unlock_blocked', amount: 49.9 }) } catch {}
    // poll
    if (pixExternalId.value || pixPaymentId.value) {
      if (pixPollTimer) clearInterval(pixPollTimer)
      let tries = 0
      pixPollTimer = setInterval(() => {
        checkPixStatus(true)
        tries++
        if (tries > 45 && pixPollTimer) {
          clearInterval(pixPollTimer)
          pixPollTimer = null
        }
      }, 5000)
    }
  } catch (e: any) {
    blockedUnlockError.value =
      e?.data?.statusMessage || e?.data?.message || e?.message || 'Não deu pra gerar o PIX agora'
  } finally {
    blockedUnlockLoading.value = false
  }
}

async function buyChatPlan(p: typeof chatPlans[number]) {
  chatPayError.value = ''
  chatPayLoading.value = p.key
  selectedChatPlan.value = p
  try {
    let visitor_id: string | null = null
    try { visitor_id = getOrCreateVisitorId() } catch { visitor_id = null }
    const res = await $fetch<{
      ok: boolean
      mode?: string
      pix_code?: string
      qr_image?: string
      payment_id?: string
      external_id?: string
      hint?: string
      amount_label?: string
      credentials_found?: boolean
      error?: string
    }>('/api/checkout/pix', {
      method: 'POST',
      body: {
        plan_key: p.key,
        amount: p.price,
        title: p.title,
        visitor_id,
        source: 'links_chat_lock',
      },
    })
    if (!res?.ok || !res.pix_code) {
      throw new Error(res?.error || 'Falha ao gerar PIX')
    }
    pixPaid.value = false
    pixCopyCode.value = res.pix_code
    const isEmv = /^000201/.test(res.pix_code)
    pixQrImage.value = isEmv
      ? (res.qr_image || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(res.pix_code)}`)
      : ''
    pixPaymentId.value = res.payment_id || ''
    pixExternalId.value = res.external_id || res.payment_id || ''
    pixStatusText.value = isEmv
      ? 'Aguardando pagamento… use o QR ou o copia e cola'
      : (res.hint || 'Pague o PIX e confirme o status')
    showChatPlans.value = false
    showPixModal.value = true
    try { track('chat_plan_checkout', { offer_slug: p.key, amount: p.price, mode: res.mode || 'unknown' }) } catch {}
    if (pixExternalId.value || pixPaymentId.value) {
      if (pixPollTimer) clearInterval(pixPollTimer)
      let tries = 0
      pixPollTimer = setInterval(() => { checkPixStatus(true); tries++; if (tries > 45 && pixPollTimer) { clearInterval(pixPollTimer); pixPollTimer = null } }, 5000)
    }
  } catch (e: any) {
    const msg =
      e?.data?.statusMessage ||
      e?.data?.message ||
      e?.statusMessage ||
      e?.message ||
      'Erro ao gerar cobrança. Tenta de novo.'
    chatPayError.value = String(msg)
    console.error('[buyChatPlan]', e)
  } finally {
    chatPayLoading.value = null
  }
}
async function checkPixStatus(silent = false) {
  const id = pixPaymentId.value || pixExternalId.value
  if (!id) {
    if (!silent) pixStatusText.value = 'Sem ID de transação para consultar'
    return
  }
  if (!silent) pixStatusLoading.value = true
  try {
    const st = await $fetch<{ status?: string; message?: string }>('/api/checkout/status', {
      query: { id },
    })
    const status = String(st?.status || '').toLowerCase()
    if (['approved', 'paid', 'completed'].includes(status)) {
      pixPaid.value = true
      pixStatusText.value = 'Pagamento confirmado junto ao Banco Central do Brasil ✅'
      if (pixPollTimer) { clearInterval(pixPollTimer); pixPollTimer = null }
      try { track('chat_plan_paid', { offer_slug: selectedChatPlan.value?.key || selectedPack.value?.key || 'chat' }) } catch {}
      if (funnelStep.value === 'awaiting_payment' || funnelStep.value === 'pix') {
        stopFunnelPayPoll()
        showPixModal.value = false
        onFunnelPaid()
      }
    } else if (!silent) {
      pixStatusText.value = 'Consultamos o status do PIX junto ao Banco Central do Brasil: ainda pendente. Assim que cair, libera na hora.'
    } else if (status === 'pending') {
      pixStatusText.value = 'Aguardando confirmação do PIX no Banco Central…'
    }
  } catch (e: any) {
    if (!silent) {
      pixStatusText.value = e?.data?.statusMessage || e?.message || 'Não foi possível consultar o status agora'
    }
  } finally {
    if (!silent) pixStatusLoading.value = false
  }
}


function syncFunnelViewport() {
  try {
    const vv = window.visualViewport
    if (!vv) {
      funnelShellStyle.value = { height: '100dvh' }
      return
    }
    // altura real visível (desconta teclado)
    const h = Math.round(vv.height)
    const top = Math.round(vv.offsetTop)
    funnelShellStyle.value = {
      height: h + 'px',
      top: top + 'px',
      maxHeight: h + 'px',
    }
  } catch {
    funnelShellStyle.value = {}
  }
}

function onFunnelInputFocus() {
  syncFunnelViewport()
  // iOS às vezes atrasa o resize do teclado
  setTimeout(syncFunnelViewport, 150)
  setTimeout(syncFunnelViewport, 350)
  nextTick(() => scrollFunnel())
}

function onFunnelInputBlur() {
  setTimeout(syncFunnelViewport, 100)
}

let funnelVvClean: (() => void) | null = null
function bindFunnelViewport() {
  unbindFunnelViewport()
  syncFunnelViewport()
  const vv = window.visualViewport
  const handler = () => syncFunnelViewport()
  if (vv) {
    vv.addEventListener('resize', handler)
    vv.addEventListener('scroll', handler)
  }
  window.addEventListener('resize', handler)
  funnelVvClean = () => {
    if (vv) {
      vv.removeEventListener('resize', handler)
      vv.removeEventListener('scroll', handler)
    }
    window.removeEventListener('resize', handler)
  }
}
function unbindFunnelViewport() {
  if (funnelVvClean) {
    funnelVvClean()
    funnelVvClean = null
  }
}

const showFunnelProfile = ref(false)
const funnelStep = ref<'greeting' | 'menu' | 'packs' | 'video' | 'webnamoro' | 'chat' | 'pix' | 'awaiting_payment' | 'paid' | 'redirect' | 'other' | 'video_consult' | 'video_avulso' | string>('greeting')
const funnelMessages = ref<{ id: string; from: 'her' | 'me'; text: string; html?: string; time: string; status?: 'sent' | 'delivered' | 'read'; mediaKind?: 'photo' | 'video' | 'audio' | 'doc' | null; edited?: boolean; deleted?: boolean }[]>([])
const funnelTyping = ref(false)
const funnelChatBox = ref<HTMLElement | null>(null)
const selectedPack = ref<{ key: string; label: string; price: string } | null>(null)
const funnelPixCode = ref('')
const funnelPaymentId = ref('')
const funnelExternalId = ref('')
let funnelPayPoll: ReturnType<typeof setInterval> | null = null

function priceToNumber(price: string): number {
  return Number(String(price).replace(',', '.').replace(/[^0-9.]/g, '')) || 0
}

function stopFunnelPayPoll() {
  if (funnelPayPoll) {
    clearInterval(funnelPayPoll)
    funnelPayPoll = null
  }
}

function pixBubbleHtml(code: string, priceLabel: string) {
  const safe = String(code).replace(/</g, '&lt;')
  return (
    `<div style="line-height:1.45">` +
    `<b>PIX gerado  R$ ${priceLabel}</b><br>` +
    `<span style="opacity:.85">Copia e cola no app do banco:</span><br><br>` +
    `<code style="display:block;word-break:break-all;font-size:0.72em;background:rgba(0,0,0,.25);padding:8px;border-radius:8px">${safe}</code><br>` +
    `Paga aí e toca em <b>Já paguei</b> que eu libero o próximo passo 💚` +
    `</div>`
  )
}

async function generateFunnelPix() {
  const pack = selectedPack.value
  if (!pack) return false
  const amount = priceToNumber(pack.price)
  try {
    const visitor_id = (() => { try { return getOrCreateVisitorId() } catch { return null } })()
    const res = await $fetch<{
      ok: boolean
      pix_code?: string
      payment_id?: string
      external_id?: string
      error?: string
    }>('/api/checkout/pix', {
      method: 'POST',
      body: {
        plan_key: pack.key,
        amount,
        title: pack.label,
        visitor_id,
        source: 'links_wa_funnel',
      },
    })
    if (!res?.ok || !res.pix_code || !/^000201/.test(res.pix_code)) {
      throw new Error(res?.error || 'Falha ao gerar PIX')
    }
    funnelPixCode.value = res.pix_code
    funnelPaymentId.value = res.payment_id || ''
    funnelExternalId.value = res.external_id || res.payment_id || ''
    return true
  } catch (e: any) {
    console.error('[funnel pix]', e)
    await funnelType(
      'Amor, deu um probleminha pra gerar o PIX agora 😢 Tenta de novo em instantes ou escolhe outra opção.',
      1200,
    )
    return false
  }
}




function stopVideoCallTimer() {
  if (videoCallTimer) {
    clearInterval(videoCallTimer)
    videoCallTimer = null
  }
}

// --- Som de chamada entrando (ringtone sintetizado, sem arquivo externo) ---
let incomingRingCtx: AudioContext | null = null
let incomingRingTimer: ReturnType<typeof setInterval> | null = null
let incomingRingOsc: OscillatorNode[] = []

function stopIncomingRingtone() {
  try {
    if (incomingRingTimer) {
      clearInterval(incomingRingTimer)
      incomingRingTimer = null
    }
    for (const o of incomingRingOsc) {
      try { o.stop() } catch {}
    }
    incomingRingOsc = []
    if (incomingRingCtx) {
      try { incomingRingCtx.close() } catch {}
      incomingRingCtx = null
    }
  } catch {}
}

function playIncomingRingtone() {
  stopIncomingRingtone()
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    incomingRingCtx = ctx

    const ringOnce = () => {
      if (!incomingRingCtx) return
      // Tom clássico de telefone: dois tons alternando (440Hz + 480Hz style)
      const freqs = [440, 480]
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = f
        gain.gain.value = 0.0001
        osc.connect(gain)
        gain.connect(ctx.destination)
        const t0 = ctx.currentTime + i * 0.02
        // envelope: sobe, segura, desce (padrão de toque)
        gain.gain.setValueAtTime(0.0001, t0)
        gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.05)
        gain.gain.setValueAtTime(0.12, t0 + 0.35)
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45)
        osc.start(t0)
        osc.stop(t0 + 0.5)
        incomingRingOsc.push(osc)
      })
    }

    // primeiro toque imediato
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    ringOnce()
    // repete a cada ~1.4s enquanto a tela de chamada estiver aberta
    incomingRingTimer = setInterval(() => {
      if (!showIncomingCall.value) {
        stopIncomingRingtone()
        return
      }
      incomingRingOsc = []
      ringOnce()
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([180, 80, 180])
      } catch {}
    }, 1400)
  } catch (e) {
    console.warn('[ringtone]', e)
  }
}

function startIncomingVideoCall() {
  showDeclineWhy.value = false
  declineWhyText.value = ''
  videoCallEndedUpsell.value = false
  showIncomingCall.value = true
  playIncomingRingtone()
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200])
  } catch {}
}

function acceptIncomingCall() {
  stopIncomingRingtone()
  showIncomingCall.value = false
  funnelStep.value = 'video_consult'
  // Não joga preço. Primeiro cria desejo e pergunta como o lead quer a chamada.
  funnelType(
    'Que bom que atendeu, amor 🔥\n\nImagina a gente ao vivo: eu do outro lado da tela, olhando pra você, falando baixo, fazendo o que você pedir no momento… sem pressa, sem roteiro engessado.\n\nDepois que pagar, a chamada libera aqui mesmo no chat e a gente entra na hora.\n\nMe conta como você quer essa chamada: mais safada, mais carinhosa, só te olhar, te mandar fazer algo… o que te deixa mais louco?',
    2200,
  )
}

function declineIncomingCall() {
  stopIncomingRingtone()
  showIncomingCall.value = false
  showDeclineWhy.value = true
  funnelStep.value = 'video_declined'
  funnelType(
    'Poxa… você recusou minha chamada 🥺\n\nFica tranquilo, sem pressão. Me conta o que te segurou? Às vezes é só o horário ou o valor — a gente ajeita.',
    1400,
  )
}

async function submitDeclineWhy() {
  const why = (declineWhyText.value || '').trim()
  showDeclineWhy.value = false
  if (why) {
    pushFunnel('me', why)
    track('whatsapp_funnel_call_declined', { message: why.slice(0, 160) })
  }
  const lower = why.toLowerCase()
  let reply =
    'Entendi, amor. Se mudar de ideia é só tocar no ícone de vídeo que eu te ligo de novo 💕\n\nEnquanto isso posso te mostrar packs ou um vídeo avulso bem safado…'
  if (/caro|pre[cç]o|valor|dinheiro|saldo/.test(lower)) {
    reply =
      'Sobre o valor: o de 10 min já dá pra sentir o clima todinho 🔥\n\nMuita gente começa pelo menor e depois aumenta. Quer que eu te mostre de novo os tempos?'
    funnelStep.value = 'video'
  } else if (/hora|agora|depois|trabalho|ocupado|momento/.test(lower)) {
    reply =
      'Sem problema, amor. Quando liberar você me chama que eu te ligo de novo na hora 😘\n\nPosso te deixar um pack pra você ir se aquecendo enquanto isso?'
  } else if (/medo|vergonha|insegur|n[aã]o sei/.test(lower)) {
    reply =
      'Relaxa… aqui é só nós dois, sem gravação pra fora e no seu ritmo 😌\n\nSe quiser só 10 min pra testar, eu te recebo bem gostoso. Atende na próxima?'
  } else if (/whats|zap|ligar|telefone/.test(lower)) {
    reply =
      'A chamada é aqui mesmo no chat, com vídeo liberado depois do PIX — mais discreto que WhatsApp 🔒\n\nQuer tentar de novo?'
  }
  await funnelType(reply, 1600)
  if (funnelStep.value === 'video') {
    // opções de preço já no step video
  } else {
    funnelStep.value = 'menu'
  }
}

function formatCallClock(totalSec: number) {
  const m = Math.floor(Math.max(0, totalSec) / 60)
  const s = Math.max(0, totalSec) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function beginLiveVideoCall() {
  showVideoCallPlayer.value = true
  videoCallActive.value = true
  videoCallEndedUpsell.value = false
  videoCallIndex.value = 0
  const mins = videoCallPurchasedMin.value || 10
  videoCallSecondsLeft.value = mins * 60
  videoCallSecondsUsed.value = 0
  stopVideoCallTimer()
  videoCallTimer = setInterval(() => {
    videoCallSecondsUsed.value += 1
    videoCallSecondsLeft.value = Math.max(0, mins * 60 - videoCallSecondsUsed.value)
    if (videoCallSecondsLeft.value <= 0) {
      endLiveVideoCall('timer')
    }
  }, 1000)
}

function endLiveVideoCall(reason: 'timer' | 'video_end' | 'hangup' = 'hangup') {
  stopVideoCallTimer()
  videoCallActive.value = false
  showVideoCallPlayer.value = false
  videoCallEndedUpsell.value = true
  funnelStep.value = 'video_upsell'
  const used = formatCallClock(videoCallSecondsUsed.value)
  funnelType(
    reason === 'timer' || reason === 'video_end'
      ? `Seu tempo de chamada acabou, amor ⏱ (${used})\n\nSe quiser continuar comigo, assina mais minutos:\n\n• +10 min  R$ 99,90\n• +20 min  R$ 149,90\n• +30 min  R$ 229,90\n\nBora prorrogar?`
      : `Chamada encerrada (${used}). Se quiser voltar pra mim, é só assinar mais minutos 🔥`,
    1600,
  )
}

function onVideoCallMediaEnded() {
  // acabou o arquivo de vídeo: tenta próximo; se não houver, encerra
  if (videoCallIndex.value < videoCallVideos.value.length - 1) {
    videoCallIndex.value += 1
    return
  }
  endLiveVideoCall('video_end')
}

function openVideoCallPlayer() {
  if (!videoCallUnlocked.value && !isAdmin.value) {
    startIncomingVideoCall()
    return
  }
  if (!videoCallVideos.value.length && !isAdmin.value) {
    funnelType('Ainda não subi os vídeos da chamada… tenta de novo em instantes 😘', 1000)
    return
  }
  beginLiveVideoCall()
}
function closeVideoCallPlayer() {
  if (videoCallActive.value) {
    endLiveVideoCall('hangup')
    return
  }
  showVideoCallPlayer.value = false
}
function nextVideoCallClip() {
  if (videoCallIndex.value < videoCallVideos.value.length - 1) {
    videoCallIndex.value += 1
  }
}
function prevVideoCallClip() {
  if (videoCallIndex.value > 0) videoCallIndex.value -= 1
}

async function adminPayWithBalance() {
  // Botão só aparece com isAdmin no UI — mas isAdmin no browser pode ser forjado.
  // Liberação SÓ após o servidor validar o cookie httpOnly admin_token.
  const pack = selectedPack.value
  if (!pack) {
    await funnelType('Nenhum produto selecionado pra testar 😅', 800)
    return
  }
  try {
    await $fetch('/api/admin/test-pay', { method: 'POST' })
  } catch {
    isAdmin.value = false
    await funnelType('Essa opção é só pra admin logado 🔒', 900)
    return
  }
  isAdmin.value = true
  track('whatsapp_funnel_admin_pay', { offer_slug: pack.key || 'admin' })
  try {
    pixPaid.value = true
    showPixModal.value = false
  } catch {}
  funnelChatUnlocked.value = true
  funnelBlocked.value = false
    startLiveChatPoll()
  if ((pack.key || '').startsWith('vid_') || pack.key === 'video_avulso') {
    videoCallUnlocked.value = true
  }
  funnelStep.value = (pack.key || '').startsWith('vid_') ? 'video_call_ready' : 'paid'
  await funnelType(
    `✅ Pago com saldo admin (∞)\n\n${pack.label} R$ ${pack.price} liberado em modo teste.`,
    1000,
  )
  if ((pack.key || '').startsWith('vid_')) {
    await funnelType('Toque em Iniciar videochamada pra testar os vídeos 📹', 900)
  } else {
    await funnelType('Pode continuar testando o chat por aqui 😘', 800)
  }
}

async function startFunnelCheckout() {
  const pack = selectedPack.value
  if (!pack) return
  // Admin: oferece saldo infinito pra testar sem PIX real
  if (isAdmin.value) {
    funnelStep.value = 'pix'
    await funnelType(
      `Fechado 🔥 ${pack.label} por R$ ${pack.price}.\n\nVocê está como admin — pode pagar com saldo (∞) pra testar ou gerar PIX real.`,
      1200,
    )
    return
  }
  await funnelType(
    `Fechado 🔥 ${pack.label} por R$ ${pack.price}.\n\nVou abrir o PIX pra você pagar agora. Assim que confirmar eu te falo o próximo passo 💕`,
    1400,
  )
  const ok = await generateFunnelPix()
  if (!ok) {
    funnelStep.value = 'menu'
    return
  }

  // Prepara o PIX internamente — NÃO abre modal nem joga código na cara
  selectedChatPlan.value = {
    key: pack.key,
    title: pack.label,
    desc: '',
    price: priceToNumber(pack.price),
    priceLabel: pack.price,
  }
  pixPaid.value = false
  pixCopyCode.value = funnelPixCode.value
  const isEmv = /^000201/.test(funnelPixCode.value)
  pixQrImage.value = isEmv
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(funnelPixCode.value)}`
    : ''
  pixPaymentId.value = funnelPaymentId.value
  pixExternalId.value = funnelExternalId.value
  pixStatusText.value = 'Aguardando pagamento… use o QR ou o copia e cola'
  // guarda pronto, mas só mostra quando o lead autorizar
  ;(window as any).__pixAskedOnce = false
  ;(window as any).__pixCodeShown = false
  funnelStep.value = 'pix_ask'
  await funnelType(
    `Fechado: ${pack.label} por R$ ${pack.price} 💕\n\nPosso te mandar a chave PIX agora pra você pagar?\n\nToque no botão abaixo 👇`,
    1600,
  )

  stopFunnelPayPoll()
  let tries = 0
  funnelPayPoll = setInterval(() => {
    tries++
    checkFunnelPayment(true)
    if (tries > 60) stopFunnelPayPoll()
  }, 5000)
  if (pixPollTimer) clearInterval(pixPollTimer)
  let tries2 = 0
  pixPollTimer = setInterval(() => {
    checkPixStatus(true)
    tries2++
    if (tries2 > 45 && pixPollTimer) {
      clearInterval(pixPollTimer)
      pixPollTimer = null
    }
  }, 5000)
}

async function checkFunnelPayment(silent = false) {
  const id = funnelPaymentId.value || funnelExternalId.value
  if (!id) {
    if (!silent) await funnelType('Ainda não tenho o ID do pagamento… gera o PIX de novo 😘', 1000)
    return
  }
  try {
    const st = await $fetch<{ status?: string; message?: string }>('/api/checkout/status', { query: { id } })
    const status = String(st?.status || '').toLowerCase()
    if (['approved', 'paid', 'completed'].includes(status)) {
      stopFunnelPayPoll()
      if (pixPollTimer) { clearInterval(pixPollTimer); pixPollTimer = null }
      showPixModal.value = false
      pixPaid.value = true
      await onFunnelPaid()
    } else if (!silent) {
      await funnelType('Consultei o PIX junto ao Banco Central… ainda não caiu, amor. Assim que confirmar eu te libero 👀', 1200)
    }
  } catch {
    if (!silent) await funnelType('Não consegui consultar agora. Tenta de novo em alguns segundos 💚', 1000)
  }
}

async function onFunnelPaid() {
  const pack = selectedPack.value
  const planKey = String(pack?.key || selectedChatPlan.value?.key || '')
  funnelStep.value = 'paid'
  track('whatsapp_funnel_paid', { offer_slug: planKey || 'paid' })
  const isSegunda = planKey === 'chat_unlock_segunda_chance' || planKey === 'chat_unlock_blocked'
  const isChat = planKey.startsWith('chat_')
  const isVideo = planKey.startsWith('vid_')
  const isPack = planKey.startsWith('pack_')
  const isWeb = planKey.startsWith('web_')

  await funnelType('Recebi o PIX aqui, meu amor ✅', 1200)

  if (planKey === 'mimo_gift') {
    showPixModal.value = false
    await funnelType('Recebi seu mimo, obrigada 🎁💚 Fiquei feliz de verdade…', 1600)
    funnelStep.value = 'other'
    return
  }

  if (isSegunda) {
    clearPermanentBlock()
    funnelBlocked.value = false
    funnelChatUnlocked.value = true
    startLiveChatPoll()
    showPixModal.value = false
    showBlockedUnlock.value = false
    await funnelType('Segunda chance aceita 💚 Chat liberado de novo. Se comporta, hein…', 1600)
    funnelStep.value = 'other'
    return
  }

  if (isChat) {
    funnelChatUnlocked.value = true
    funnelBlocked.value = false
    startLiveChatPoll()
    await funnelType(
      'Recebi 🔥 Agora a gente pode ir mais fundo…\n\nMe conta o que você quer em especial: sexting, fotos, vídeo, videochamada… o que te deixa mais louco? Assim eu já entro no clima certo pra você 😏',
      2200,
    )
    funnelStep.value = 'other'
    return
  }

    if (isVideo) {
    videoCallUnlocked.value = true
    await funnelType(
      `Recebi o PIX, amor 🔥\n\nSua videochamada (${pack?.label || 'ao vivo'}) tá liberada aqui no chat.\n\nToque em Iniciar videochamada pra me ver agora 😈`,
      1800,
    )
    funnelStep.value = 'video_call_ready'
  } else if (isPack) {
    await funnelType(
      'Recebi o PIX aqui meu amor 🔥 Me chama no WhatsApp que eu já vou te mandar os meus conteúdos. Garanto que você vai amar 😋',
      2000,
    )
  } else if (isWeb) {
    await funnelType(
      `Pronto meu amor 💕 Vou te passar meu WhatsApp e você vai poder conversar comigo como sua namoradinha pelo tempo do seu plano (${pack?.label || 'webnamoro'}).\n\nQuero te dar atenção de verdade… me chama no +55 47 992750967 e eu fico só sua 🥰`,
      2200,
    )
  } else {
    await funnelType(
      'Recebi o PIX meu amor 💚 Me chama no WhatsApp +55 47 992750967 que eu te atendo agora.',
      1600,
    )
  }
  funnelStep.value = 'redirect'
}

let funnelTimer: ReturnType<typeof setTimeout> | null = null

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function scrollFunnel() {
  nextTick(() => {
    const el = funnelChatBox.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function markLastLeadMessage(status: 'delivered' | 'read') {
  const order = { sent: 0, delivered: 1, read: 2 }
  // marca da mais recente para trás até achar um já no status alvo (todas as do lead ficam visualizadas)
  for (let i = funnelMessages.value.length - 1; i >= 0; i--) {
    const msg = funnelMessages.value[i]
    if (msg.from !== 'me') continue
    const cur = order[msg.status || 'sent'] || 0
    if (order[status] >= cur) msg.status = status
    if (status === 'delivered') break // entregue só a última enviada
  }
}

function pushFunnel(from: 'her' | 'me', text: string, html?: string, opts?: { skipLog?: boolean; mediaKind?: 'photo' | 'video' | 'audio' | 'doc' | null }) {
  const row: { id: string; from: 'her' | 'me'; text: string; html?: string; time: string; status?: 'sent' | 'delivered' | 'read'; mediaKind?: 'photo' | 'video' | 'audio' | 'doc' | null; edited?: boolean; deleted?: boolean } = {
    id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    from,
    text,
    html,
    time: nowTime(),
    mediaKind: (opts as any)?.mediaKind || null,
  }
  if (from === 'me') row.status = 'sent'
  funnelMessages.value.push(row)
  if (from === 'me') {
    // entregue
    setTimeout(() => {
      markLastLeadMessage('delivered')
      try { saveFunnelState() } catch {}
    }, 400 + Math.random() * 500)
  }
  if (from === 'her') {
    // quando ela responde, mensagens do lead ficam visualizadas
    markLastLeadMessage('read')
  }
  scrollFunnel()
  // grava no Supabase (lead = me, bot = her)
  if (!opts?.skipLog) {
    logFunnelMessage(from === 'me' ? 'lead' : 'bot', text, { has_html: !!html })
  }
}

/** Delay humano: lê o tamanho da msg + jitter (evita parecer bot) */
function humanDelay(text: string, base = 0): number {
  const len = (text || '').replace(/\s+/g, ' ').trim().length
  // ~38ms por caractere, piso 1.8s, teto 5.8s + jitter 200–900ms
  const reading = Math.min(5800, Math.max(1800, Math.round(len * 38)))
  const jitter = 200 + Math.floor(Math.random() * 700)
  const extra = base > 0 ? Math.round(base * 0.35) : 0
  return reading + jitter + extra
}

function funnelType(text: string, delay = 0, html?: string) {
  markLastLeadMessage('read')
  return new Promise<void>((resolve) => {
    funnelTyping.value = true
    scrollFunnel()
    if (funnelTimer) clearTimeout(funnelTimer)
    const wait = humanDelay(text, delay)
    funnelTimer = setTimeout(() => {
      funnelTyping.value = false
      pushFunnel('her', text, html)
      saveFunnelState()
      resolve()
    }, wait)
  })
}

const funnelOptions = computed(() => {
  // greeting / bloqueado: sem botões
  if (funnelBlocked.value || funnelStep.value === 'greeting' || funnelStep.value === 'closed_offline') {
    return []
  }
  // NÃO zera opções ao digitar — evita o chat "encolher"
  if (funnelStep.value === 'menu') {
    return [
      { key: 'video', label: '📹 Videochamada', variant: 'wa-quick--yes' },
      { key: 'video_avulso', label: '🎬 Vídeo avulso', variant: 'wa-quick--yes' },
      { key: 'pack', label: '🔥 Pack de conteúdo', variant: 'wa-quick--yes' },
      { key: 'webnamoro', label: '💕 Webnamoro', variant: 'wa-quick--yes' },
      { key: 'conversar', label: '💬 Só conversar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'packs') {
    return [
      { key: 'pack_basic', label: 'Pack gostinho  R$ 29,90', variant: 'wa-quick--yes' },
      { key: 'pack_gold', label: 'Pack Gold solo  R$ 79,90', variant: 'wa-quick--yes' },
      { key: 'pack_combo', label: 'Combo completo  R$ 109,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'video') {
    // Tempo já combinado: não reoferece a lista — só PIX ou mudar tempo
    if ((selectedPack.value?.key || '').startsWith('vid_')) {
      return [
        { key: 'pix_yes', label: 'Sim, pode mandar o PIX', variant: 'wa-quick--yes' },
        { key: 'change_time', label: 'Mudar tempo', variant: 'wa-quick--no' },
      ]
    }
    return [
      { key: 'vid_10', label: '10 min  R$ 99,90', variant: 'wa-quick--yes' },
      { key: 'vid_20', label: '20 min  R$ 149,90', variant: 'wa-quick--yes' },
      { key: 'vid_30', label: '30 min  R$ 229,90', variant: 'wa-quick--yes' },
      { key: 'vid_60', label: '1 hora  R$ 399,90', variant: 'wa-quick--yes' },
      { key: 'vid_90', label: '90 min  R$ 549,90', variant: 'wa-quick--yes' },
      { key: 'vid_120', label: '2 horas  R$ 699,90', variant: 'wa-quick--yes' },
      { key: 'vid_180', label: '3 horas  R$ 999,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'pix_ask' || funnelStep.value === 'pix_ask_hour') {
    return [
      { key: 'pix_yes', label: 'Sim, pode mandar o PIX 💚', variant: 'wa-quick--yes' },
      { key: 'pix_no', label: 'Ainda não', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'webnamoro') {
    return [
      { key: 'web_7', label: '7 dias  R$ 179,90', variant: 'wa-quick--yes' },
      { key: 'web_15', label: '15 dias  R$ 299,90', variant: 'wa-quick--yes' },
      { key: 'web_30', label: '30 dias  R$ 499,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'chat') {
    return [
      { key: 'chat_basic', label: 'Chat 30-40 min  R$ 49,90', variant: 'wa-quick--yes' },
      { key: 'chat_midia', label: 'Chat + fotos/vídeos  R$ 79,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'video_upsell') {
    return [
      { key: 'vid_10', label: '+10 min  R$ 99,90', variant: 'wa-quick--yes' },
      { key: 'vid_20', label: '+20 min  R$ 149,90', variant: 'wa-quick--yes' },
      { key: 'vid_30', label: '+30 min  R$ 229,90', variant: 'wa-quick--yes' },
      { key: 'upsell_no', label: 'Agora não', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'video_call_ready') {
    return [
      { key: 'start_video_call', label: '📹 Iniciar videochamada', variant: 'wa-quick--yes' },
    ]
  }

    if (funnelStep.value === 'pix') {
    const opts = [
      { key: 'pix_generate', label: 'Gerar PIX agora 💚', variant: 'wa-quick--yes' },
      { key: 'pix_no', label: 'Agora não', variant: 'wa-quick--no' },
    ]
    if (isAdmin.value) {
      opts.unshift({ key: 'admin_pay', label: '🛠 Pagar com saldo admin (∞)', variant: 'wa-quick--yes' })
    }
    return opts
  }
  if (funnelStep.value === 'awaiting_payment') {
    const opts = [
      { key: 'pix_copy', label: 'Copiar código PIX 📋', variant: 'wa-quick--yes' },
      { key: 'pix_check', label: 'Já paguei verificar ✅', variant: 'wa-quick--yes' },
    ]
    if (isAdmin.value) {
      opts.unshift({ key: 'admin_pay', label: '🛠 Pagar com saldo admin (∞)', variant: 'wa-quick--yes' })
    }
    return opts
  }
  if (funnelStep.value === 'paid' || funnelStep.value === 'redirect') {
    return [
      { key: 'go_wa', label: 'Abrir WhatsApp agora →', variant: 'wa-quick--yes' },
      { key: 'back_menu', label: '← Menu', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'other') {
    return [
      { key: 'go_wa', label: 'Falar no WhatsApp →', variant: 'wa-quick--yes' },
      { key: 'back_menu', label: '← Ver outras opções', variant: 'wa-quick--no' },
    ]
  }
  
  if (funnelStep.value === 'video_avulso_confirm') {
    const opts = [
      { key: 'pix_yes', label: 'Sim, gera o PIX 💚', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
    if (isAdmin.value) {
      opts.unshift({ key: 'admin_pay', label: '🛠 Pagar com saldo admin (∞)', variant: 'wa-quick--yes' })
    }
    return opts
  }

  return []
})


const FUNNEL_STORAGE_KEY = 'wanessa_wa_funnel_v1'
const FUNNEL_SESSION_KEY = 'wanessa_wa_funnel_session'
const FUNNEL_CONV_KEY = 'wanessa_wa_funnel_conversation'

const funnelConversationId = ref('')
const funnelAccessToken = ref('')

function getFunnelSessionId(): string {
  try {
    let id = sessionStorage.getItem(FUNNEL_SESSION_KEY) || ''
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `fs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(FUNNEL_SESSION_KEY, id)
    }
    return id
  } catch {
    return `fs_${Date.now().toString(36)}`
  }
}

function loadFunnelConversationLocal() {
  try {
    const raw = localStorage.getItem(FUNNEL_CONV_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data?.conversation_id && data?.access_token && data?.visitor_id === getOrCreateVisitorId()) {
      funnelConversationId.value = data.conversation_id
      funnelAccessToken.value = data.access_token
    }
  } catch {}
}

function saveFunnelConversationLocal(conversation_id: string, access_token: string) {
  try {
    funnelConversationId.value = conversation_id
    funnelAccessToken.value = access_token
    localStorage.setItem(
      FUNNEL_CONV_KEY,
      JSON.stringify({
        conversation_id,
        access_token,
        visitor_id: getOrCreateVisitorId(),
        savedAt: Date.now(),
      }),
    )
  } catch {}
}

function logFunnelMessage(direction: 'lead' | 'bot', message: string, extra: Record<string, any> = {}) {
  try {
    const visitor_id = getOrCreateVisitorId()
    if (!funnelConversationId.value) loadFunnelConversationLocal()
    const unlocked = !!funnelChatUnlocked.value
    const payload = {
      visitor_id,
      session_id: getFunnelSessionId(),
      conversation_id: funnelConversationId.value || null,
      access_token: funnelAccessToken.value || null,
      creator_slug: 'wanessabsx',
      direction,
      message: String(message || '').slice(0, 2000),
      step: funnelStep.value,
      selected_offer: selectedPack.value?.key || selectedPack.value?.label || null,
      selected_price: selectedPack.value?.price || null,
      chat_unlocked: unlocked,
      unlocked,
      metadata: { ...extra, chat_unlocked: unlocked },
    }
    const json = JSON.stringify(payload)
    const handleRes = async (res: any) => {
      try {
        if (res?.conversation_id && res?.access_token) {
          saveFunnelConversationLocal(res.conversation_id, res.access_token)
        }
      } catch {}
    }
    // Com chat desbloqueado sempre fetch (notifica Telegram no server)
    // sendBeacon só no funil automático sem unlock
    if (
      !unlocked &&
      funnelConversationId.value &&
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([json], { type: 'application/json' })
      navigator.sendBeacon('/api/funnel-chat', blob)
      return
    }
    fetch('/api/funnel-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
    })
      .then((r) => r.json().catch(() => ({})))
      .then(handleRes)
      .catch(() => {})
  } catch {}
}

const adminPresenceOnline = ref(false)
const adminPresenceLabel = ref('visto por último recentemente')
let presencePollTimer: ReturnType<typeof setInterval> | null = null

async function pullAdminPresence() {
  try {
    const res = await $fetch<{ online?: boolean; label?: string }>('/api/presence')
    adminPresenceOnline.value = !!res?.online
    const lbl = String(res?.label || '').trim()
    if (res?.online) {
      adminPresenceLabel.value = 'online'
    } else if (lbl && lbl !== 'offline' && lbl !== 'online') {
      adminPresenceLabel.value = lbl
    } else {
      adminPresenceLabel.value = 'visto por último recentemente'
    }
  } catch {
    adminPresenceOnline.value = false
    adminPresenceLabel.value = 'visto por último recentemente'
  }
}
function startPresencePoll() {
  stopPresencePoll()
  pullAdminPresence()
  presencePollTimer = setInterval(pullAdminPresence, 8000)
}
function stopPresencePoll() {
  if (presencePollTimer) {
    clearInterval(presencePollTimer)
    presencePollTimer = null
  }
}

let liveChatPollTimer: ReturnType<typeof setInterval> | null = null
const seenLiveMsgIds = ref<Record<string, true>>({})

function stopLiveChatPoll() {
  if (liveChatPollTimer) {
    clearInterval(liveChatPollTimer)
    liveChatPollTimer = null
  }
  stopPresencePoll()
}

async function pullLiveAdminReplies() {
  if (!funnelChatUnlocked.value) return
  if (!funnelConversationId.value || !funnelAccessToken.value) return
  try {
    const visitor_id = getOrCreateVisitorId()
    const res = await $fetch<{
      ok?: boolean
      messages?: Array<{ id: string; direction: string; message: string; created_at?: string }>
    }>('/api/funnel-chat', {
      query: {
        conversation_id: funnelConversationId.value,
        access_token: funnelAccessToken.value,
        visitor_id,
      },
    })
    const list = res?.messages || []
    for (const m of list) {
      if (m.direction !== 'bot') continue
      if (!m.id || seenLiveMsgIds.value[m.id]) continue
      // evita duplicar mensagens automáticas antigas do funil: só live_admin ou novas após unlock
      const text = String(m.message || '').trim()
      if (!text) continue
      seenLiveMsgIds.value[m.id] = true
      // se já existe texto idêntico no final, pula
      const last = funnelMessages.value[funnelMessages.value.length - 1]
      if (last?.from === 'her' && last.text === text) continue
      pushFunnel('her', text, undefined, { skipLog: true })
    }
  } catch {}
}

function startLiveChatPoll() {
  stopLiveChatPoll()
  startPresencePoll()
  if (!funnelChatUnlocked.value) return
  pullLiveAdminReplies()
  liveChatPollTimer = setInterval(() => {
    pullLiveAdminReplies()
  }, 3000)
}



function saveFunnelState() {
  try {
    localStorage.setItem(
      FUNNEL_STORAGE_KEY,
      JSON.stringify({
        step: funnelStep.value,
        messages: funnelMessages.value,
        selectedPack: selectedPack.value,
        blocked: funnelBlocked.value,
        permBlocked: funnelPermBlocked.value,
        savedAt: Date.now(),
      }),
    )
  } catch {}
}

function loadFunnelState(): boolean {
  try {
    const raw = localStorage.getItem(FUNNEL_STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    // expira em 24h
    if (!data || !data.savedAt || Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(FUNNEL_STORAGE_KEY)
      return false
    }
    if (!Array.isArray(data.messages) || data.messages.length === 0) return false
    funnelStep.value = data.step || 'menu'
    funnelMessages.value = data.messages
    selectedPack.value = data.selectedPack || null
    funnelBlocked.value = !!data.blocked || data.step === 'closed_offline'
    return true
  } catch {
    return false
  }
}

function clearFunnelState() {
  try { localStorage.removeItem(FUNNEL_STORAGE_KEY) } catch {}
  funnelStep.value = 'greeting'
  funnelMessages.value = []
  selectedPack.value = null
  funnelBlocked.value = false
}

function openWaFunnel(source = 'whatsapp') {
  warmSyncPay()
  loadFunnelConversationLocal()
  loadPermanentBlock()

  track('whatsapp_funnel_open', { offer_slug: source || 'whatsapp' })
  try { onCardClick('WhatsApp Funnel', whatsappUrl.value) } catch {}
  try { logFunnelMessage('lead', '[abriu o chat]', { event: 'open', source }) } catch {}
  showWaFunnel.value = true
  startPresencePoll()
  showFunnelPhoto.value = false
  showFunnelProfile.value = false
  funnelTyping.value = false
  nextTick(() => bindFunnelViewport())
  if (funnelTimer) clearTimeout(funnelTimer)

  const restored = loadFunnelState()
  if (restored) {
    nextTick(() => scrollFunnel())
    return
  }

  funnelStep.value = 'greeting'
  funnelMessages.value = []
  selectedPack.value = null
  funnelBlocked.value = false
  nextTick(async () => {
    // Abertura natural: sem menu, sem pressionar escolha
    await funnelType('Oi amor 😘 Que bom que você veio. Pode falar comigo, estou aqui.', 1400)
    saveFunnelState()
  })
}

function closeWaFunnel() {
  stopLiveChatPoll()
  stopFunnelPayPoll()
  if (funnelTimer) clearTimeout(funnelTimer)
  funnelTyping.value = false
  unbindFunnelViewport()
  // salva progresso antes de fechar
  if (funnelMessages.value.length) saveFunnelState()
  showWaFunnel.value = false
  showFunnelPhoto.value = false
  showFunnelProfile.value = false
  funnelShellStyle.value = {}
  // Se entrou pela rota /chat/*, ao fechar mostra a home (senão fica tela roxa vazia)
  if (isChatLanding.value) {
    isChatLanding.value = false
    try {
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState({}, '', '/')
      }
    } catch {}
  }
}

function buildWaLink(prefill: string) {
  return 'https://wa.me/5547992750967?text=' + encodeURIComponent(prefill)
}



function scoreVideoComplexity(text: string): number {
  let score = 1
  const t = text.toLowerCase()
  // duração / quantidade
  if (/longo|demora|v[aá]rios|mais de|minut|hora/.test(t)) score += 1
  // elementos
  if (/brinquedo|consolo|vibrador|plug|algema|corda/.test(t)) score += 1
  if (/cosplay|fantasia|uniforme|lingerie|salto/.test(t)) score += 1
  if (/outra|amigo|casal|menage|com ela|com ele/.test(t)) score += 2
  if (/anal|dp|goz|squirt|fisting/.test(t)) score += 1
  if (/ao ar livre|carro|banheiro|publico|janela/.test(t)) score += 1
  if (/nome|gemendo meu|falando meu nome|pedido especial/.test(t)) score += 1
  if (t.length > 120) score += 1
  if (t.length > 220) score += 1
  return Math.min(score, 6)
}

function suggestVideoAvulsoPrice(complexity: number): number {
  // sempre > 49.90
  const bands: [number, number][] = [
    [54.9, 69.9],   // 1 simples
    [74.9, 89.9],   // 2
    [94.9, 119.9],  // 3
    [129.9, 149.9], // 4
    [159.9, 179.9], // 5
    [189.9, 219.9], // 6 muito complexo
  ]
  const idx = Math.max(0, Math.min(complexity - 1, bands.length - 1))
  const [min, max] = bands[idx]
  // valor "aleatório" mas estável o suficiente dentro da faixa
  const raw = min + Math.random() * (max - min)
  // arredonda para .90
  const base = Math.floor(raw)
  return base + 0.9
}




function isOfflineOrProgramaIntent(raw: string): boolean {
  const t = String(raw || '').toLowerCase()
  // Oferta ONLINE: nunca bloquear (preço de call, pack, chat, etc.)
  if (/chamada|videochamad|v[ií]deo\s*call|\bcall\b|\bpack\b|webnamoro|\bchat\b|\bmin\b|minuto|\bhora\b|pix|assinatura|conte[uú]do|ao vivo|online/.test(t)) {
    return false
  }
  // Só bloqueia se for claramente presencial / programa / sair
  return /encont[rro] presencial|te encontrar pessoal|sair junto|sair comigo|sa[ií]r com (voc[eê]|vc)|presencial|na vida real|fazer programa|(^|[^a-z])programa([^a-z]|$)|(^|[^a-z])gp([^a-z]|$)|acompanhante|cobra pra (sair|transar|fazer)|quanto (voc[eê] )?cobra pra (sair|transar)|te pagar pra (sair|te ver|transar)|pagar pra (sair|te ver)|me encontra|vir (aqui|a[ií]) te|ir (a[ií]|ai) te ver|hotel|motel|airbnb|transar pessoal|sexo presencial|te ver pessoalmente|ficar comigo (pessoal|de verdade)|vem pra c[aá]|valor pra sair|pre[cç]o pra sair/.test(t)
}

async function blockFunnelForOfflineIntent() {
  funnelBlocked.value = true
  funnelStep.value = 'closed_offline'
  funnelInput.value = ''
  const msg = 'Ok, não tenho interesse no que você está me oferecendo.'
  await funnelType(msg, 900)
  try { logFunnelMessage('bot', msg, { event: 'blocked_offline_intent' }) } catch {}
  try { track('whatsapp_funnel_blocked', { offer_slug: 'offline_intent' }) } catch {}
  try { saveFunnelState() } catch {}
}


async function funnelTypeParts(raw: string, baseDelay = 900) {
  const cleaned = String(raw || '')
    .replace(/\.{2,}/g, '.') // tira reticências
    .replace(/\s[-–—]\s/g, ' ') // evita travessão de lista
    .trim()
  if (!cleaned) return
  const parts = cleaned
    .split(/\|\|\||\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
  // se ainda for textão num único bloco, quebra por frase
  const finalParts: string[] = []
  for (const part of parts) {
    if (part.length > 160) {
      const sentences = part.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
      if (sentences.length > 1) {
        finalParts.push(...sentences.slice(0, 4))
        continue
      }
    }
    finalParts.push(part)
  }
  const use = finalParts.slice(0, 4)
  for (let i = 0; i < use.length; i++) {
    await funnelType(use[i], i === 0 ? baseDelay : 700 + i * 200)
  }
}


function parseVideoCallChoice(lower: string): { key: string; label: string; price: string; min: number } | null {
  const t = String(lower || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  // ordem: mais específico primeiro (2h/3h/90min antes de 1h)
  if (/\b(3|tres|tr[eê]s)\s*horas?\b/.test(t) || /\b180\s*min/.test(t) || /\b3\s*h\b/.test(t)) {
    return { key: 'vid_180', label: 'Videochamada 3 horas', price: '999,90', min: 180 }
  }
  if (/\b(2|duas|dois)\s*horas?\b/.test(t) || /\b120\s*min/.test(t) || /\b2\s*h\b/.test(t)) {
    return { key: 'vid_120', label: 'Videochamada 2 horas', price: '699,90', min: 120 }
  }
  if (/\b90\s*min/.test(t) || /\bhora e meia\b/.test(t) || /\b1[,.]5\s*h/.test(t)) {
    return { key: 'vid_90', label: 'Videochamada 90 min', price: '549,90', min: 90 }
  }
  if (/\b(1|uma)\s*hora\b/.test(t) || /\b60\s*min/.test(t) || /\b1\s*h\b/.test(t) || t.includes('1hr') || t.includes('1 hr') || t.includes('uma hr')) {
    return { key: 'vid_60', label: 'Videochamada 1 hora', price: '399,90', min: 60 }
  }
  const bareDur = (n: string) => new RegExp(
    '(?:^|\b)(?:so(?:\s+o)?\s+|quero(?:\s+o)?\s+|vou(?:\s+de)?\s+)?' + n + '(?:\s*min(?:utos?)?|min|m)?\b'
  )
  if (/\b30\s*min/.test(t) || /\bmeia\s*hora\b/.test(t) || /\b30m\b/.test(t) || /\b30min\b/.test(t) || t.trim() === '30' || bareDur('30').test(t)) {
    return { key: 'vid_30', label: 'Videochamada 30 min', price: '229,90', min: 30 }
  }
  if (/\b20\s*min/.test(t) || /\b20m\b/.test(t) || /\b20min\b/.test(t) || t.trim() === '20' || bareDur('20').test(t)) {
    return { key: 'vid_20', label: 'Videochamada 20 min', price: '149,90', min: 20 }
  }
  if (/\b10\s*min/.test(t) || /\b10m\b/.test(t) || /\b10min\b/.test(t) || t.trim() === '10' || bareDur('10').test(t)) {
    return { key: 'vid_10', label: 'Videochamada 10 min', price: '99,90', min: 10 }
  }
  // "quero o de 20", "o de 10", "vou de 30"
  if (/\b(de\s*)?20\b/.test(t) && /min|quero|vou|esse|esse de|pega|fecha|bora/.test(t)) {
    return { key: 'vid_20', label: 'Videochamada 20 min', price: '149,90', min: 20 }
  }
  if (/\b(de\s*)?30\b/.test(t) && /min|quero|vou|esse|esse de|pega|fecha|bora/.test(t)) {
    return { key: 'vid_30', label: 'Videochamada 30 min', price: '229,90', min: 30 }
  }
  if (/\b(de\s*)?10\b/.test(t) && /min|quero|vou|esse|esse de|pega|fecha|bora/.test(t)) {
    return { key: 'vid_10', label: 'Videochamada 10 min', price: '99,90', min: 10 }
  }
  return null
}



function parseCustomVideoDuration(lower: string) {
  return parseVideoCallChoice(lower)
}

function isVideoDurationPriceAsk(lower: string): boolean {
  const t = String(lower || '').toLowerCase()
  const choice = parseVideoCallChoice(t)
  if (!choice) return false
  const asksPrice = /quanto|custa|pre[cç]o|valor|cobra|fica quanto|qto/.test(t)
  const wantsDur = /quero|queria|vamos|bora|fecha|fechado|pode ser|topa|faz|fazer/.test(t)
  const longCustom = choice.min >= 90
  return asksPrice || wantsDur || longCustom
}

async function quoteSpecificVideoDuration(choice: { key: string; label: string; price: string; min: number }) {
  selectedPack.value = { key: choice.key, label: choice.label, price: choice.price }
  videoCallPurchasedMin.value = choice.min
  funnelStep.value = 'pix_ask_hour'
  track('whatsapp_funnel_select', { offer_slug: choice.key, source: 'typed_custom_duration' })
  await funnelType(
    `Pra ${choice.label.toLowerCase()} fica R$ ${choice.price}, amor 💕\n\nÉ ao vivo comigo esse tempo todinho. Quer que eu te mande o PIX pra gente marcar?`,
    1400,
  )
}

function recentFunnelText(n = 8): string {
  return funnelMessages.value
    .slice(-n)
    .map((m) => `${m.from === 'me' ? 'Lead' : 'Wanessa'}: ${m.text}`)
    .join('\n')
    .toLowerCase()
}

function conversationAboutVideoCall(): boolean {
  const ctx = recentFunnelText(10)
  return /videochamad|chamada|call|10 min|20 min|30 min|99,?90|149,?90|229,?90|399,?90/.test(ctx)
}

/** Confirma escolha de tempo mesmo sem repetir "min" (ex: "quero só o de 10 mesmo") */
function resolveVideoChoiceFromContext(lower: string): { key: string; label: string; price: string; min: number } | null {
  const direct = parseVideoCallChoice(lower)
  if (direct) return direct
  if (!conversationAboutVideoCall()) return null
  // confirmação vaga apontando para opção já citada
  const conf = /(quero|vou|fecha|fechado|pega|bora|pode ser|esse|dessa|só|so|mesmo|isso|vamos|manda|pix)/.test(lower)
  if (!conf && !/\b(10|20|30|60)\b/.test(lower)) return null
  if (/\b10\b/.test(lower) || /de dez|s[oó] (o )?10|o de 10/.test(lower)) {
    return { key: 'vid_10', label: 'Videochamada 10 min', price: '99,90', min: 10 }
  }
  if (/\b20\b/.test(lower) || /de vinte|s[oó] (o )?20|o de 20/.test(lower)) {
    return { key: 'vid_20', label: 'Videochamada 20 min', price: '149,90', min: 20 }
  }
  if (/\b30\b/.test(lower) || /de trinta|s[oó] (o )?30|o de 30/.test(lower)) {
    return { key: 'vid_30', label: 'Videochamada 30 min', price: '229,90', min: 30 }
  }
  if (/\b(1|uma)\s*hora\b|\b60\b/.test(lower)) {
    return { key: 'vid_60', label: 'Videochamada 1 hora', price: '399,90', min: 60 }
  }
  // "quero só esse" / "pode ser" depois de ela ter falado só de 10 min no último texto dela
  const lastHer = [...funnelMessages.value].reverse().find((m) => m.from === 'her')
  if (lastHer && conf) {
    const ht = String(lastHer.text || '').toLowerCase()
    if (/10 min|99,?90/.test(ht) && !/20 min|30 min|1 hora/.test(ht)) {
      return { key: 'vid_10', label: 'Videochamada 10 min', price: '99,90', min: 10 }
    }
  }
  return null
}


let funnelMsgLongPressTimer: ReturnType<typeof setTimeout> | null = null
function onFunnelMsgTouchStart(i: number, _e: TouchEvent) {
  if (funnelMsgLongPressTimer) clearTimeout(funnelMsgLongPressTimer)
  funnelMsgLongPressTimer = setTimeout(() => openFunnelMsgMenu(i), 450)
}
function onFunnelMsgTouchEnd() {
  if (funnelMsgLongPressTimer) {
    clearTimeout(funnelMsgLongPressTimer)
    funnelMsgLongPressTimer = null
  }
}
function openFunnelMsgMenu(i: number) {
  const m = funnelMessages.value[i]
  if (!m || m.from !== 'me' || m.deleted) return
  funnelMsgMenuIdx.value = i
}
function startFunnelMsgEdit() {
  const i = funnelMsgMenuIdx.value
  funnelMsgMenuIdx.value = null
  if (i === null) return
  const m = funnelMessages.value[i]
  if (!m || m.from !== 'me' || m.deleted) return
  // foto/vídeo/áudio: não edita conteúdo, só apaga pelo outro botão
  if (m.mediaKind) {
    return
  }
  funnelEditingIdx.value = i
  funnelEditDraft.value = m.text || ''
}
function cancelFunnelMsgEdit() {
  funnelEditingIdx.value = null
  funnelEditDraft.value = ''
}
function saveFunnelMsgEdit() {
  const i = funnelEditingIdx.value
  if (i === null) return
  const m = funnelMessages.value[i]
  if (!m || m.from !== 'me' || m.deleted) return
  const next = (funnelEditDraft.value || '').trim()
  if (!next) return
  m.text = next
  m.html = undefined
  m.edited = true
  m.time = nowTime()
  funnelEditingIdx.value = null
  funnelEditDraft.value = ''
  try { saveFunnelState() } catch {}
}
function deleteFunnelMsg() {
  const i = funnelMsgMenuIdx.value
  funnelMsgMenuIdx.value = null
  if (i === null) return
  const m = funnelMessages.value[i]
  if (!m || m.from !== 'me') return
  m.deleted = true
  m.text = ''
  m.html = undefined
  m.mediaKind = null
  try { saveFunnelState() } catch {}
}

async function sendFunnelFreeText() {
  // Digitar mensagens é sempre livre. Cobra só por packs / vídeo / mídia / etc.
  if (funnelBlocked.value) return
  const text = (funnelInput.value || '').trim()
  if (!text || funnelTyping.value) return
  funnelInput.value = ''
  pushFunnel('me', text)
  try { saveFunnelState() } catch {}
  try { track('whatsapp_funnel_free_text', { offer_slug: 'whatsapp', message: text.slice(0, 120) }) } catch {}

  // Filtro offline/programa ANTES de qualquer resposta (Gemini ou script)
  if (isOfflineOrProgramaIntent(text)) {
    await blockFunnelForOfflineIntent()
    return
  }

  const lower = text.toLowerCase()

  // EARLY: duração específica + preço (ex: "eu quero 2 horas amor quanto custa")
  // antes do Gemini, do dump de video_consult e do handler genérico de "quanto custa"
  {
    const customChoice = parseVideoCallChoice(lower)
    if (customChoice && isVideoDurationPriceAsk(lower)) {
      await quoteSpecificVideoDuration(customChoice)
      try { saveFunnelState() } catch {}
      return
    }
  }

  // --- Conversação natural com Gemini (greeting + papo + saudações) ---
  const isGreetingMsg = /^(oi|ol[aá]|oie|oii+|hey|hello|bom dia|boa tarde|boa noite|e a[ií]|tudo bem|td bem|blz|beleza|oi amor|ola amor)\b/i.test(text.trim())
  if (funnelStep.value === 'greeting' || funnelStep.value === 'papo' || (isGreetingMsg && !['pix', 'awaiting_payment', 'video_avulso', 'video_avulso_confirm', 'pix_ask', 'pix_ask_hour'].includes(String(funnelStep.value)))) {
    try { logFunnelMessage('lead', text, { event: 'free_text_greeting' }) } catch {}
    try {
      const history = [
        `[step=${funnelStep.value}]`,
        ...funnelMessages.value.slice(-14).map((m) => `${m.from === 'me' ? 'Lead' : 'Wanessa'}: ${m.text}`),
      ]
      const res = await $fetch<{
        ok?: boolean
        intent?: string
        reply?: string
        show_menu?: boolean
        suggest_step?: string | null
        confidence?: number
      }>('/api/funnel-intent', {
        method: 'POST',
        body: {
          message: text,
          history,
          visitor_id: getOrCreateVisitorId(),
          step: funnelStep.value,
        },
      })
      const reply = (res?.reply || 'Me fala o que você quer, amor.').slice(0, 600)
      const intent = String(res?.intent || 'unknown')
      const step = res?.suggest_step ? String(res.suggest_step) : null
      const showMenu = !!res?.show_menu

      await funnelTypeParts(reply, 1100)

      if (intent === 'encontros' || step === 'closed_offline') {
        // Lead quer programa / presencial → encerra e bloqueia digitação
        funnelBlocked.value = true
        funnelStep.value = 'closed_offline'
        funnelInput.value = ''
        // reply já veio do Gemini/local com a mensagem de recusa
        try { logFunnelMessage('bot', reply, { event: 'blocked_offline_intent', intent }) } catch {}
        try { track('whatsapp_funnel_blocked', { offer_slug: 'offline_intent' }) } catch {}
        try { saveFunnelState() } catch {}
        return
      } else if (step === 'video_consult') {
        const agreed = parseVideoCallChoice(lower)
        if (agreed || (selectedPack.value?.key || '').startsWith('vid_')) {
          if (agreed) {
            selectedPack.value = { key: agreed.key, label: agreed.label, price: agreed.price }
            videoCallPurchasedMin.value = agreed.min
          }
          try { saveFunnelState() } catch {}
          await startFunnelCheckout()
          return
        }
        funnelStep.value = 'video_consult'
      } else if (step === 'video_avulso') {
        funnelStep.value = 'video_avulso'
      } else if (step === 'packs') {
        funnelStep.value = 'packs'
      } else if (step === 'webnamoro') {
        funnelStep.value = 'webnamoro'
      } else if (step === 'chat') {
        funnelStep.value = 'chat'
      } else if (showMenu || step === 'menu') {
        funnelStep.value = 'menu'
      } else if (intent === 'papo' || intent === 'unknown') {
        // continua ouvindo, sem botões
        funnelStep.value = 'greeting'
      } else {
        funnelStep.value = 'greeting'
      }
      try { saveFunnelState() } catch {}
      try { logFunnelMessage('bot', reply, { event: 'intent_reply', intent, step: funnelStep.value }) } catch {}
      return
    } catch (e) {
      console.warn('[funnel intent]', e)
      await funnelType('Pode falar comigo… me conta o que você tá a fim 😘', 1000)
      funnelStep.value = 'greeting'
      return
    }
  }

  // Se a gente perguntou "posso passar o PIX?" e o lead confirma → mostra o código na hora
  if (
    (window as any).__pixAskedOnce &&
    !(window as any).__pixCodeShown &&
    (funnelPixCode.value || pixCopyCode.value)
  ) {
    const confirmWords = ['pode', 'manda', 'sim', 'quero', 'passa', 'envia', 'ok', 'manda aí', 'pode mandar', 'pode passar']
    if (confirmWords.some((w) => lower === w || lower.includes(w))) {
      const code = funnelPixCode.value || pixCopyCode.value
      const price = selectedPack.value?.price || selectedChatPlan.value?.priceLabel || ''
      showPixCodeInChat(code, price)
      return
    }
  }

  // Depois da consultoria da videochamada: lead descreveu o que quer → aí sim oferece tempo/preço
  if (funnelStep.value === 'video_consult') {
    const choice = resolveVideoChoiceFromContext(lower) || parseVideoCallChoice(lower)
    if (choice) {
      selectedPack.value = { key: choice.key, label: choice.label, price: choice.price }
      videoCallPurchasedMin.value = choice.min
      track('whatsapp_funnel_select', { offer_slug: choice.key, source: 'video_consult_typed' })
      await funnelTypeParts(`Fechado: ${choice.label} por R$ ${choice.price}.|||Vou preparar o PIX pra você.`, 1000)
      await startFunnelCheckout()
      return
    }
    // only if NO duration in message:
    funnelStep.value = 'video'
    await funnelType(
      'Entendi o clima que você quer 😈\n\nPra gente fazer isso ao vivo, escolhe o tempo:\n\n• 10 min  R$ 99,90\n• 20 min  R$ 149,90\n• 30 min  R$ 229,90\n• 1 hora  R$ 399,90\n• 90 min  R$ 549,90\n• 2 horas  R$ 699,90\n• 3 horas  R$ 999,90\n\nMe fala qual encaixa melhor pra você agora — ou se prefere outro tempo.',
      1800,
    )
    return
  }

  // Lead digitou o tempo da videochamada (10/20/30/60) em vez de clicar no botão
  // Também quando a conversa já é sobre chamada (mesmo em greeting/menu)
  {
    const choice = resolveVideoChoiceFromContext(lower)
    if (choice && (funnelStep.value === 'video' || funnelStep.value === 'video_consult' || funnelStep.value === 'video_upsell' || funnelStep.value === 'menu' || funnelStep.value === 'greeting' || conversationAboutVideoCall())) {
      selectedPack.value = { key: choice.key, label: choice.label, price: choice.price }
      videoCallPurchasedMin.value = choice.min
      track('whatsapp_funnel_select', { offer_slug: choice.key, source: 'typed_time' })
      await funnelTypeParts(
        `Fechado: ${choice.label} por R$ ${choice.price}.|||Vou preparar o PIX pra você.`,
        1000,
      )
      await startFunnelCheckout()
      return
    }
  }


  // Vídeo avulso: lead descreveu o que quer → sugere preço por complexidade
  if (funnelStep.value === 'video_avulso') {
    const complexity = scoreVideoComplexity(lower)
    const price = suggestVideoAvulsoPrice(complexity)
    const priceLabel = price.toFixed(2).replace('.', ',')
    selectedPack.value = {
      key: 'video_avulso',
      label: 'Vídeo avulso personalizado',
      price: priceLabel,
    }
    track('whatsapp_funnel_video_avulso', {
      offer_slug: 'video_avulso',
      metric_value: price,
      message: text.slice(0, 160),
    })
    await funnelType(
      `Entendi, amor 🔥\n\nPro que você pediu eu faço por R$ ${priceLabel}.\n\nQuer que eu gere o PIX pra você garantir o vídeo?`,
      1400,
    )
    funnelStep.value = 'video_avulso_confirm'
    return
  }

  if (funnelStep.value === 'video_avulso_confirm') {
    if (/sim|quero|pode|gera|pix|pagar|fechado|bora|vai|claro|ss|s/.test(lower)) {
      await startFunnelCheckout()
      return
    }
    if (/n[aã]o|depois|cancel|voltar|outro/.test(lower)) {
      funnelStep.value = 'menu'
      await funnelType('Beleza… me diz o que você prefere então 😘', 900)
      return
    }
    // se mandar mais detalhe, recalcula
    const complexity = scoreVideoComplexity(lower)
    const price = suggestVideoAvulsoPrice(complexity)
    const priceLabel = price.toFixed(2).replace('.', ',')
    selectedPack.value = {
      key: 'video_avulso',
      label: 'Vídeo avulso personalizado',
      price: priceLabel,
    }
    await funnelType(
      `Atualizei pro que você pediu: R$ ${priceLabel} 💕\n\nGero o PIX?`,
      1100,
    )
    return
  }


  if (/pack|pacote|conte[uú]do|combo|gold/.test(lower)) {
    funnelStep.value = 'packs'
    await funnelType(
      'Tenho packs sim, amor 🔥\n\n• R$ 29,90 gostinho\n• R$ 79,90 Gold solo\n• R$ 109,90 Combo completo\n\nQual você quer? Ou continua falando comigo aqui 😘',
      1200,
    )
    return
  }
    if (/v[ií]deo\s*avulso|video\s*personalizado|v[ií]deo\s*sob\s*medida|v[ií]deo\s*custom/.test(lower)) {
    funnelStep.value = 'video_avulso'
    await funnelType(
      'Como você quer seu vídeo avulso, amor? 🎬\n\nMe conta o que você imagina… quanto mais detalhado, mais gostoso eu faço 😏',
      1200,
    )
    return
  }
  if (/video|chamada|call|cam/.test(lower)) {
    startIncomingVideoCall()
    return
  }
  if (/webnamoro|namoro|namorada|exclusiv/.test(lower)) {
    funnelStep.value = 'webnamoro'
    await funnelType(
      'Webnamoro é exclusividade comigo 💕\n\n• 7 dias  R$ 179,90\n• 15 dias  R$ 299,90\n• 30 dias  R$ 499,90\n\nQual pacote te interessa?',
      1200,
    )
    return
  }
  if (/pix|pagar|pre[cç]o|valor|quanto/.test(lower)) {
    if (selectedPack.value) {
      funnelStep.value = 'pix'
      await funnelType(
        `O ${selectedPack.value.label} fica R$ ${selectedPack.value.price}. Posso gerar o PIX aqui na conversa agora?`,
        1100,
      )
    } else {
      await funnelType(
        'Depende do que você quer, amor 😘 Pack, videochamada, webnamoro ou chat — me diz qual e eu te passo o valor.',
        1100,
      )
    }
    return
  }
  // saudações (oi, bom dia, etc.) vão pro Gemini abaixo — leads gostam de conexão antes de comprar
  if (/encont|presencial|sair com|te encontrar|programad|programa com|quanto.*sair|cobra.*sair|me encontra|ficar comigo pessoal|vir aqui|ir a[ií] te ver|hotel|motel|jantar e/.test(lower)) {
    await blockFunnelForOfflineIntent()
    return
  }

  // Resposta real via Gemini (não genérica)
  try {
    const history = [
      `[step=${funnelStep.value}]`,
      ...funnelMessages.value.slice(-14).map((m) => `${m.from === 'me' ? 'Lead' : 'Wanessa'}: ${m.text}`),
    ]
    const res = await $fetch<{
      ok?: boolean
      intent?: string
      reply?: string
      show_menu?: boolean
      suggest_step?: string | null
    }>('/api/funnel-intent', {
      method: 'POST',
      body: {
        message: text,
        history,
        visitor_id: getOrCreateVisitorId(),
        step: funnelStep.value,
      },
    })
    const reply = (res?.reply || '').trim()
    const intent = String(res?.intent || 'unknown')
    const step = res?.suggest_step ? String(res.suggest_step) : null

    if (intent === 'encontros' || step === 'closed_offline') {
      funnelBlocked.value = true
      funnelStep.value = 'closed_offline'
      funnelInput.value = ''
      await funnelType(reply || 'Ok, não tenho interesse no que você está me oferecendo.', 900)
      try { logFunnelMessage('bot', reply || 'blocked', { event: 'blocked_offline_intent', intent }) } catch {}
      try { saveFunnelState() } catch {}
      return
    }

    await funnelTypeParts(reply || 'Me fala de novo o que você quer, amor.', 1100)

    if (step === 'video_consult') {
      const agreed = parseVideoCallChoice(lower)
      if (agreed || (selectedPack.value?.key || '').startsWith('vid_')) {
        if (agreed) {
          selectedPack.value = { key: agreed.key, label: agreed.label, price: agreed.price }
          videoCallPurchasedMin.value = agreed.min
        }
        try { saveFunnelState() } catch {}
        await startFunnelCheckout()
        return
      }
      funnelStep.value = 'video_consult'
    }
    else if (step === 'video_avulso') funnelStep.value = 'video_avulso'
    else if (step === 'packs') funnelStep.value = 'packs'
    else if (step === 'webnamoro') funnelStep.value = 'webnamoro'
    else if (step === 'chat') funnelStep.value = 'chat'
    else if (res?.show_menu || step === 'menu') funnelStep.value = 'menu'

    try { logFunnelMessage('bot', reply || '', { event: 'gemini_reply', intent, step: funnelStep.value }) } catch {}
    try { saveFunnelState() } catch {}
  } catch (e) {
    console.warn('[funnel gemini fallback]', e)
    await funnelType('Pode escrever de novo o que você quer? Assim eu te respondo certinho.', 1000)
  }
}

async function answerFunnel(opt: { key: string; label: string }) {
  if (funnelTyping.value) return
  pushFunnel('me', opt.label)
  saveFunnelState()

  if (opt.key === 'back' || opt.key === 'back_menu') {
    const k = selectedPack.value?.key || ''
    if (funnelStep.value === 'redirect' || funnelStep.value === 'pix') {
      if (k.startsWith('vid_')) {
        funnelStep.value = 'video'
        await funnelType('Beleza… escolhe de novo o tempo da videochamada 🔥', 900)
      } else if (k.startsWith('web_')) {
        funnelStep.value = 'webnamoro'
        await funnelType('Beleza… escolhe de novo o plano de webnamoro 💕', 900)
      } else if (k.startsWith('chat_')) {
        funnelStep.value = 'chat'
        await funnelType('Beleza… escolhe de novo o chat 😘', 900)
      } else if (k.startsWith('pack_')) {
        funnelStep.value = 'packs'
        await funnelType('Beleza… escolhe de novo o pack 🔥', 900)
      } else {
        funnelStep.value = 'menu'
        await funnelType('Beleza… então me conta: o que você quer de mim hoje? 😏', 900)
      }
      return
    }
    funnelStep.value = 'menu'
    await funnelType('Beleza… então me conta: o que você quer de mim hoje? 😏', 900)
    return
  }

  if (opt.key === 'pack') {
    track('whatsapp_funnel_pack', { offer_slug: 'pack' })
    funnelStep.value = 'packs'
    await funnelType(
      'Tenho 3 packs pra você, amor:\n\n• R$ 29,90 um gostinho pra me conhecer melhor\n• R$ 79,90 Pack Gold: solos longos, bem safadinha\n• R$ 109,90 Combo completo: solo, transando, com outras mulheres, cosplay e tudo\n\nQual você quer?',
      1400,
    )
    return
  }

  if (opt.key === 'pack_basic' || opt.key === 'pack_gold' || opt.key === 'pack_combo') {
    const map: Record<string, { label: string; price: string; desc: string }> = {
      pack_basic: {
        label: 'Pack gostinho',
        price: '29,90',
        desc: 'conteúdos pra você me conhecer melhor, um gostinho delicioso',
      },
      pack_gold: {
        label: 'Pack Gold',
        price: '79,90',
        desc: 'solos de maior duração, bem íntimos e safados',
      },
      pack_combo: {
        label: 'Combo completo',
        price: '109,90',
        desc: 'todos os conteúdos: solo, transando, com outras mulheres, cosplay e muito mais',
      },
    }
    const p = map[opt.key]
    selectedPack.value = { key: opt.key, label: p.label, price: p.price }
    track('whatsapp_funnel_pack_select', { offer_slug: opt.key, metric_value: Number(p.price.replace(',', '.')) })
    await startFunnelCheckout()
    return
  }

  if (opt.key === 'upsell_no') {
    showDeclineWhy.value = true
    declineWhyText.value = ''
    await funnelType('Tudo bem, amor. Me conta rapidinho o que te fez parar? Assim eu te atendo melhor da próxima 💕', 1200)
    return
  }

  if (opt.key === 'start_video_call') {
    openVideoCallPlayer()
    return
  }

  if (opt.key === 'admin_pay') {
    await adminPayWithBalance()
    return
  }

  if (opt.key === 'change_time') {
    selectedPack.value = null
    videoCallPurchasedMin.value = 0
    funnelStep.value = 'video'
    await funnelType(
      'Beleza, escolhe o tempo de novo:\n\n• 10 min  R$ 99,90\n• 20 min  R$ 149,90\n• 30 min  R$ 229,90\n• 1 hora  R$ 399,90\n• 90 min  R$ 549,90\n• 2 horas  R$ 699,90\n• 3 horas  R$ 999,90',
      1000,
    )
    return
  }

  if (opt.key === 'pix_yes') {
    track('whatsapp_funnel_pix', { offer_slug: selectedPack.value?.key || 'pack' })
    // Código já gerado → só libera na tela/chat. Senão gera (ex.: confirmou 1h).
    if (funnelPixCode.value || pixCopyCode.value) {
      openPreparedPixForUser()
    } else {
      await startFunnelCheckout()
    }
    return
  }
  if (opt.key === 'pix_no') {
    await funnelType(
      'Tranquilo 💚 Sem pressa.\n\nQuando quiser pagar, é só tocar em pedir o PIX que eu mando a chave. Pode continuar falando comigo.',
      1400,
    )
    return
  }
  if (opt.key === 'pix_generate') {
    track('whatsapp_funnel_pix', { offer_slug: selectedPack.value?.key || 'pack' })
    await startFunnelCheckout()
    return
  }

  if (opt.key === 'pix_check') {
    await checkFunnelPayment(false)
    return
  }

  if (opt.key === 'pix_copy') {
    if (funnelPixCode.value) {
      try { await navigator.clipboard.writeText(funnelPixCode.value) } catch {}
      await funnelType('Código PIX copiado! Cola no app do banco e paga 💚', 900)
    } else {
      await funnelType('Ainda não tenho o código… toca em Gerar PIX de novo', 900)
    }
    return
  }

  if (opt.key === 'pix_regen') {
    await startFunnelCheckout()
    return
  }

  if (opt.key === 'pix_no') {
    const k = selectedPack.value?.key || ''
    if (k.startsWith('vid_')) funnelStep.value = 'video'
    else if (k.startsWith('web_')) funnelStep.value = 'webnamoro'
    else if (k.startsWith('chat_')) funnelStep.value = 'chat'
    else funnelStep.value = 'packs'
    await funnelType('Sem pressa… quando quiser, é só escolher de novo 😘', 1000)
    return
  }

    if (opt.key === 'video') {
    track('whatsapp_funnel_intent', { offer_slug: 'videochamada' })
    startIncomingVideoCall()
    return
  }


  
  if (opt.key === 'video_avulso') {
    track('whatsapp_funnel_intent', { offer_slug: 'video_avulso' })
    funnelStep.value = 'video_avulso'
    await funnelType(
      'Como você quer seu vídeo avulso, amor? 🎬\n\nMe conta o que você imagina… quanto mais detalhado, mais gostoso eu faço 😏',
      1200,
    )
    return
  }

if (opt.key === 'vid_10' || opt.key === 'vid_20' || opt.key === 'vid_30' || opt.key === 'vid_60' || opt.key === 'vid_90' || opt.key === 'vid_120' || opt.key === 'vid_180') {
    const map: Record<string, { label: string; price: string; desc: string; min: number }> = {
      vid_10: { label: 'Videochamada 10 min', price: '99,90', desc: 'chamada ao vivo rápida e safada', min: 10 },
      vid_20: { label: 'Videochamada 20 min', price: '149,90', desc: 'tempo pra gozar com calma', min: 20 },
      vid_30: { label: 'Videochamada 30 min', price: '229,90', desc: 'sessão completa comigo', min: 30 },
      vid_60: { label: 'Videochamada 1 hora', price: '399,90', desc: 'uma hora inteira só nossa', min: 60 },
      vid_90: { label: 'Videochamada 90 min', price: '549,90', desc: 'hora e meia ao vivo comigo', min: 90 },
      vid_120: { label: 'Videochamada 2 horas', price: '699,90', desc: 'duas horas só nossas', min: 120 },
      vid_180: { label: 'Videochamada 3 horas', price: '999,90', desc: 'três horas de chamada ao vivo', min: 180 },
    }
    const p = map[opt.key]
    selectedPack.value = { key: opt.key, label: p.label, price: p.price }
    videoCallPurchasedMin.value = p.min
    track('whatsapp_funnel_select', { offer_slug: opt.key })
    await startFunnelCheckout()
    return
  }

  if (opt.key === 'webnamoro') {
    track('whatsapp_funnel_intent', { offer_slug: 'webnamoro' })
    funnelStep.value = 'webnamoro'
    await funnelType(
      'Webnamoro é pra quem quer exclusividade comigo 💕\n\n• 7 dias  R$ 179,90 (chat diário + áudios + 1 call curta)\n• 15 dias  R$ 299,90 (+ calls e conteúdo exclusivo)\n• 30 dias  R$ 499,90 (namorada virtual completa)\n\nQual pacote você quer?',
      1400,
    )
    return
  }

  if (opt.key === 'web_7' || opt.key === 'web_15' || opt.key === 'web_30') {
    const map: Record<string, { label: string; price: string; desc: string }> = {
      web_7: { label: 'Webnamoro 7 dias', price: '179,90', desc: 'chat diário, áudios e 1 call curta' },
      web_15: { label: 'Webnamoro 15 dias', price: '299,90', desc: 'calls + conteúdo exclusivo' },
      web_30: { label: 'Webnamoro 30 dias', price: '499,90', desc: 'experiência completa de namorada virtual' },
    }
    const p = map[opt.key]
    selectedPack.value = { key: opt.key, label: p.label, price: p.price }
    track('whatsapp_funnel_select', { offer_slug: opt.key })
    await startFunnelCheckout()
    return
  }

  if (opt.key === 'conversar') {
    track('whatsapp_funnel_intent', { offer_slug: 'conversar' })
    funnelStep.value = 'chat'
    await funnelType(
      'Chat comigo também tem valor, amor 😘\n\n• R$ 49,90 chat safado 30-40 min\n• R$ 79,90 chat + fotos e vídeos no momento\n\nO que você prefere?',
      1200,
    )
    return
  }

  if (opt.key === 'chat_basic' || opt.key === 'chat_midia') {
    const map: Record<string, { label: string; price: string; desc: string }> = {
      chat_basic: { label: 'Chat 30-40 min', price: '49,90', desc: 'papo safado só nosso' },
      chat_midia: { label: 'Chat + mídia', price: '79,90', desc: 'chat com fotos e vídeos no momento' },
    }
    const p = map[opt.key]
    selectedPack.value = { key: opt.key, label: p.label, price: p.price }
    track('whatsapp_funnel_select', { offer_slug: opt.key })
    await startFunnelCheckout()
    return
  }

  if (opt.key === 'go_wa') {
    const pack = selectedPack.value
    let prefill = 'Oi Wanessa! Vim do site e quero falar com você.'
    if (pack) {
      prefill = `Oi Wanessa! Já paguei o ${pack.label} (R$ ${pack.price}) no PIX do site. Pode me liberar?`
    }
    track('whatsapp_funnel_redirect', { offer_slug: pack?.key || 'whatsapp' })
    const url = buildWaLink(prefill)
    stopFunnelPayPoll()
    clearFunnelState()
    window.open(url, '_blank', 'noopener,noreferrer')
    showWaFunnel.value = false
    showFunnelPhoto.value = false
    showFunnelProfile.value = false
    if (funnelTimer) clearTimeout(funnelTimer)
    funnelTyping.value = false
  }
}

const telegramPrivateUrl = 'https://t.me/wanessabsx'
const logoPriv = LOGO_PRIVSEX
const logoTg = LOGO_TG_BLUE
const logoTgPurple = LOGO_TG_PURPLE
const gallery = ['/model.jpg', '/model.jpg', '/model.jpg']
const photoIndex = ref(0)
let photoTimer: ReturnType<typeof setInterval> | null = null

const gate = ref<1 | 2 | 3 | 4 | 'pass' | 'reject' | null>(null)
const quizAnswers = ref<Record<string, string>>({})
const gateReady = ref(false)
const chatMessages = ref<ChatMsg[]>([])
const isTyping = ref(false)
const chatBox = ref<HTMLElement | null>(null)
let typingTimer: ReturnType<typeof setTimeout> | null = null

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function scrollChat() {
  nextTick(() => {
    const el = chatBox.value
    if (el) el.scrollTop = el.scrollHeight
  })
}
function pushMsg(from: 'her' | 'me', text: string) {
  chatMessages.value.push({ from, text, time: nowTime() })
  scrollChat()
}
function typeThenAsk(text: string, delay = 0) {
  isTyping.value = true
  scrollChat()
  if (typingTimer) clearTimeout(typingTimer)
  const wait = humanDelay(text, delay)
  typingTimer = setTimeout(() => {
    isTyping.value = false
    pushMsg('her', text)
  }, wait)
}
const questionText = (g: 1 | 2 | 3 | 4) => {
  if (g === 1) return t('q1')
  if (g === 2) return t('q2')
  if (g === 3) return t('qPay')
  return t('q3')
}
const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: t('q1yes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('q1no'), variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: t('q2yes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('q2no'), variant: 'wa-quick--no' }]
  if (gate.value === 3) return [{ key: 'yes', label: t('qPayYes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('qPayNo'), variant: 'wa-quick--no' }]
  if (gate.value === 4) return [
    { key: 'assinar', label: t('q3assinar'), variant: 'wa-quick--yes' },
    { key: 'precos', label: t('q3precos'), variant: 'wa-quick--yes' },
    { key: 'olhando', label: t('q3olhando'), variant: 'wa-quick--no' },
  ]
  return []
})
function setGate(next: 1 | 2 | 3 | 4 | 'pass' | 'reject', persistServer = false) {
  gate.value = next
  try { localStorage.setItem(GATE_KEY, String(next)) } catch {}
  if (persistServer && (next === 'pass' || next === 'reject')) {
    const visitor_id = getOrCreateVisitorId()
    getDeviceFingerprint().then((fingerprint) => {
      try {
        fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitor_id, fingerprint, status: next, answers: { ...quizAnswers.value } }),
          keepalive: true,
        }).catch(() => {})
      } catch {}
    })
  }
}
function answerQuiz(key: string) {
  if (isTyping.value) return
  const label = quizOptions.value.find((o) => o.key === key)?.label || key
  pushMsg('me', label)
  if (gate.value === 1) {
    // Nunca assinou NAO bloqueia — lead novo tambem pode comprar; so registra
    quizAnswers.value.q1 = key === 'yes' ? 'assinou_sim' : 'assinou_nao'
    setGate(2)
    typeThenAsk(questionText(2), 1100)
    return
  }
  if (gate.value === 2) {
    // Nao conhecer pelo Instagram NAO bloqueia — so registra
    quizAnswers.value.q2 = key === 'yes' ? 'conhece_sim' : 'conhece_nao'
    setGate(3)
    typeThenAsk(questionText(3), 1100)
    return
  }
  if (gate.value === 3) {
    // Disposto a pagar? Sim -> segue | Nao -> bloqueia
    quizAnswers.value.q_pay = key === 'yes' ? 'pago_sim' : 'pago_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk(t('rejectPay'), 1400)
    } else {
      setGate(4)
      typeThenAsk(questionText(4), 1100)
    }
    return
  }
  if (gate.value === 4) {
    const intentMap: Record<string, string> = {
      assinar: 'intent_assinar_hoje',
      precos: 'intent_ver_precos',
      olhando: 'intent_so_olhando',
    }
    quizAnswers.value.q3 = intentMap[key] || key
    try { localStorage.setItem('wanessa_intent', quizAnswers.value.q3) } catch {}
    if (key === 'olhando') {
      setGate('reject', true)
      typeThenAsk(t('rejectCurious'), 1400)
    } else if (key === 'assinar') {
      pushMsg('her', t('passAssinar'))
      setTimeout(() => setGate('pass', true), 800)
    } else {
      pushMsg('her', t('passPrecos'))
      setTimeout(() => setGate('pass', true), 800)
    }
  }
}
const DEFAULT_LINKS: LinkItem[] = [
  { label: 'PrivSex', icon: '🔥', url: privsexUrl, enabled: true },
  { label: 'Telegram VIP', icon: '⭐', url: vipBotUrl, enabled: true },
  { label: 'Canal de prévias', icon: '📱', url: telegramPublicUrl, enabled: true },
]
const config = reactive({ name: '', bio: '', links: [] as LinkItem[], highlight_label: DEFAULT_HIGHLIGHT, quiz_enabled: false })
const configReady = ref(false)
const showLogin = ref(false)
const isAdmin = ref(false)
const showAdminPanel = ref(false)
const videoCallVideos = ref<string[]>([])
const showVideoCallPlayer = ref(false)
const videoCallIndex = ref(0)
const videoCallUnlocked = ref(false)
const editVideoCallUrls = ref('')
const showIncomingCall = ref(false)
const showDeclineWhy = ref(false)
const declineWhyText = ref('')
const videoCallActive = ref(false)
const videoCallSecondsLeft = ref(0)
const videoCallSecondsUsed = ref(0)
const videoCallPurchasedMin = ref(10)
let videoCallTimer: ReturnType<typeof setInterval> | null = null
const videoCallEndedUpsell = ref(false)
const password = ref('')
const showAdminPass = ref(false)
const loginError = ref('')
const saveMsg = ref('')
const saveError = ref('')
const loading = ref(false)
const passInput = ref<HTMLInputElement | null>(null)
const edit = reactive({ name: '', bio: '', links: [] as LinkItem[], highlight_label: DEFAULT_HIGHLIGHT, quiz_enabled: false })
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(VID_KEY) || ''
    if (!id || id.length < 8) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(VID_KEY, id)
    }
    document.cookie = `vid=${encodeURIComponent(id)};path=/;max-age=31536000;SameSite=Lax;Secure`
    return id
  } catch { return `v_${Date.now().toString(36)}` }
}
function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function alreadyViewedToday() { try { return localStorage.getItem(VIEW_DAY_KEY) === todayKey() } catch { return false } }
function markViewedToday() { try { localStorage.setItem(VIEW_DAY_KEY, todayKey()) } catch {} }
function alreadyClickedToday(slug: string) { try { return localStorage.getItem(CLICK_DAY_PREFIX + slug) === todayKey() } catch { return false } }
function markClickedToday(slug: string) { try { localStorage.setItem(CLICK_DAY_PREFIX + slug, todayKey()) } catch {} }
function readUtms() {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  return { utm_source: p.get('utm_source'), utm_medium: p.get('utm_medium'), utm_campaign: p.get('utm_campaign'), utm_content: p.get('utm_content'), utm_term: p.get('utm_term'), src: p.get('src'), sck: p.get('sck') }
}
function offerFromLabel(label: string) {
  const lower = label.toLowerCase()
  if (/pr[eé]via|canal|público/i.test(lower)) return 'previa_telegram'
  if (/vip/i.test(lower)) return 'telegram_vip'
  if (/priv/i.test(lower)) return 'privsex'
  if (/whats/i.test(lower)) return 'whatsapp'
  if (/telegram.*priv|conteúdo no telegram/i.test(lower)) return 'telegram_privado'
  return label.toLowerCase().replace(/\s+/g, '_').slice(0, 40)
}
function track(eventName: string, extra: Record<string, any> = {}) {
  const visitor_id = getOrCreateVisitorId()
  const payload = { event_name: eventName, path: '/links/wanessa', visitor_id, ...readUtms(), ...extra }
  const json = JSON.stringify(payload)
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' })
      if (navigator.sendBeacon('/api/track', blob)) return
    }
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }).catch(() => {})
  } catch {}
}
function onCardClick(label: string, url: string) {
  const slug = offerFromLabel(label)
  if (alreadyClickedToday(slug)) return
  markClickedToday(slug)
  track('outbound_click', { label, url, offer_slug: slug })
}
function attachLogo(l: LinkItem): LinkItem {
  const lab = (l.label || '').toLowerCase()
  let logo: string | undefined
  if (/pr[eé]via|canal|público/i.test(lab)) logo = LOGO_TG_BLUE
  else if (/vip/i.test(lab)) logo = LOGO_TG_PURPLE
  else if (/priv/i.test(lab)) logo = LOGO_PRIVSEX
  return { ...l, logo, enabled: l.enabled !== false }
}
function applyServerConfig(data: any) {
  if (!data) return
  config.name = data.name || config.name
  const incomingBio = (data.bio || '').trim()
  const isGeneric = /creator|conteúdo\s*&?\s*links|content\s*&?\s*links|língua\s*bifurcada|resto\s*tu\s*descobre/i.test(incomingBio)
  config.bio = !incomingBio || isGeneric ? '' : incomingBio
  config.highlight_label = String(data.highlight_label || '').trim() || DEFAULT_HIGHLIGHT
  config.quiz_enabled = data.quiz_enabled === true
  if (Array.isArray(data.links) && data.links.length) {
    config.links = data.links.filter((l: any) => l && l.label).map((l: any) => attachLogo({ label: String(l.label || ''), icon: String(l.icon || '🔗'), url: String(l.url || '#'), desc: String(l.desc || ''), enabled: l.enabled !== false }))
  } else config.links = DEFAULT_LINKS.map(attachLogo)
}
const { data: remoteConfig } = await useAsyncData('link-page-config', () => $fetch<any>('/api/config').catch(() => null))
if (remoteConfig.value) applyServerConfig(remoteConfig.value)
else config.links = DEFAULT_LINKS.map(attachLogo)
configReady.value = true
async function warmSyncPay() {
  try { await $fetch('/api/checkout/warm') } catch {}
}
onMounted(async () => {
  // restaura sessão admin se o cookie ainda for válido (não bloqueia o chat)
  restoreAdminSession()
  // 1) PRIMEIRO: landing do chat (Telegram / ads) — antes de qualquer await
  let openChatDirect = false
  let chatSlug = 'wanessabsx'
  try {
    const path = (window.location.pathname || '').replace(/\/+$/, '') || '/'
    const m = path.match(/\/chat\/([^/]+)/i)
    if (m) {
      chatSlug = decodeURIComponent(m[1] || '').toLowerCase()
      if (chatSlug === 'wanessabsx' || chatSlug === 'wanessa') openChatDirect = true
    }
    const q = new URLSearchParams(window.location.search || '')
    const cq = (q.get('chat') || q.get('open') || '').toLowerCase()
    if (cq === 'wanessabsx' || cq === 'wanessa' || cq === '1' || cq === 'true' || cq === 'whatsapp') {
      openChatDirect = true
      if (cq !== '1' && cq !== 'true' && cq !== 'whatsapp') chatSlug = cq
    }
    // hash fallback #chat
    if ((window.location.hash || '').toLowerCase().includes('chat')) openChatDirect = true
  } catch {}

  if (openChatDirect) {
    isChatLanding.value = true
    gate.value = 'pass'
    gateReady.value = true
    try { localStorage.setItem(GATE_KEY, 'pass') } catch {}
    try { track('page_view', { offer_slug: 'chat_' + chatSlug }) } catch {}
    loadFunnelConversationLocal()
    openWaFunnel('chat_' + chatSlug)
    // reforço (Telegram WebView às vezes atrasa o paint)
    setTimeout(() => {
      if (!showWaFunnel.value) openWaFunnel('chat_' + chatSlug)
    }, 300)
    setTimeout(() => {
      if (!showWaFunnel.value) openWaFunnel('chat_' + chatSlug)
    }, 1000)
  }

  warmSyncPay()

  locale.value = detectLocale()
  try { document.documentElement.lang = locale.value } catch {}
  const visitor_id = getOrCreateVisitorId()
  if (!alreadyViewedToday() && !openChatDirect) {
    markViewedToday()
    track('page_view', { offer_slug: 'wanessa_links' })
  }

  if (!openChatDirect) {
    let restored: string | null = null
    try { restored = localStorage.getItem(GATE_KEY) } catch {}
    if (restored === 'pass' || restored === 'reject') gate.value = restored
    else if (restored === '1' || restored === '2' || restored === '3' || restored === '4') gate.value = Number(restored) as 1 | 2 | 3 | 4
    else if (restored === '4') gate.value = 1
    try {
      const fingerprint = await getDeviceFingerprint()
      if (gate.value !== 'pass' && gate.value !== 'reject') {
        try {
          const res = await $fetch<{ status: string | null }>('/api/quiz', { query: { visitor_id, fingerprint } })
          if (res?.status === 'pass' || res?.status === 'reject') {
            gate.value = res.status
            try { localStorage.setItem(GATE_KEY, res.status) } catch {}
          }
        } catch {}
      } else if (visitor_id && (gate.value === 'pass' || gate.value === 'reject')) {
        try {
          fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor_id, fingerprint, status: gate.value }), keepalive: true }).catch(() => {})
        } catch {}
      }
    } catch {}
    if (!config.quiz_enabled) {
      gate.value = 'pass'
      try { localStorage.setItem(GATE_KEY, 'pass') } catch {}
    }
    if (gate.value == null) gate.value = 1
    gateReady.value = true
    if (gate.value === 1 || gate.value === 2 || gate.value === 3 || gate.value === 4) {
      chatMessages.value = []
      typeThenAsk(questionText(gate.value as 1 | 2 | 3 | 4), 800)
    } else if (gate.value === 'reject') {
      chatMessages.value = []
      pushMsg('her', t('rejectIg'))
    }
  }

  photoTimer = setInterval(() => { photoIndex.value = (photoIndex.value + 1) % gallery.length }, 4200)
})
onUnmounted(() => {
  if (photoTimer) clearInterval(photoTimer)
  if (typingTimer) clearTimeout(typingTimer)
})
function openLogin() {
  if (isAdmin.value) {
    openEdit()
    return
  }
  password.value = ''
  showAdminPass.value = false
  loginError.value = ''
  showLogin.value = true
  nextTick(() => passInput.value?.focus())
}
function openEdit() {
  showAdminPanel.value = true
  editVideoCallUrls.value = videoCallVideos.value.join('\n')
  edit.name = config.name; edit.bio = config.bio; edit.highlight_label = config.highlight_label || DEFAULT_HIGHLIGHT
  edit.quiz_enabled = config.quiz_enabled === true
  edit.links = config.links.map((l) => ({ label: l.label, icon: l.icon, url: l.url, desc: l.desc || '', enabled: l.enabled !== false }))
  if (!edit.links.length) edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true })
}
function closeAdmin() {
  // fecha só o painel — sessão admin continua até Sair
  showAdminPanel.value = false
  saveMsg.value = ''
  saveError.value = ''
}
async function doLogout() {
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
  } catch {}
  isAdmin.value = false
  showAdminPanel.value = false
  saveMsg.value = ''
  saveError.value = ''
}

function addLink() { edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true }) }
function removeLink(i: number) { edit.links.splice(i, 1) }


function loadVideoCallVideos() {
  try {
    const raw = localStorage.getItem('wanessa_video_call_urls')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) videoCallVideos.value = arr.filter((u: any) => typeof u === 'string' && u.trim())
    }
  } catch {}
}
function saveVideoCallVideos() {
  const urls = editVideoCallUrls.value
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
  videoCallVideos.value = urls
  try { localStorage.setItem('wanessa_video_call_urls', JSON.stringify(urls)) } catch {}
}

async function restoreAdminSession() {
  try {
    await $fetch('/api/admin/session')
    isAdmin.value = true
  } catch {
    isAdmin.value = false
  }
}

async function doLogin() {
  loginError.value = ''; loading.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    password.value = ''; showLogin.value = false; isAdmin.value = true; openEdit()
  } catch (e: any) { loginError.value = e?.data?.statusMessage || e?.statusMessage || 'Senha inválida' }
  finally { loading.value = false }
}
async function doSave() {
  saveMsg.value = ''; saveError.value = ''; loading.value = true
  try {
    const payload = {
      name: edit.name || config.name || '', bio: edit.bio, avatar_url: '',
      highlight_label: (edit.highlight_label || '').trim() || DEFAULT_HIGHLIGHT,
      quiz_enabled: edit.quiz_enabled === true,
      links: edit.links.filter((l) => l.label.trim()).map((l) => ({ label: l.label.trim(), icon: l.icon || '🔗', url: l.url || '#', desc: (l.desc || '').trim(), enabled: l.enabled !== false })),
    }
    await $fetch('/api/admin/update', { method: 'POST', body: payload })
    config.name = payload.name; config.bio = payload.bio; config.highlight_label = payload.highlight_label
    config.quiz_enabled = payload.quiz_enabled
    config.links = payload.links.map((l) => attachLogo(l))
    saveMsg.value = 'Salvo!'; setTimeout(() => { saveMsg.value = '' }, 2500)
  } catch (e: any) { saveError.value = e?.data?.statusMessage || 'Erro ao salvar' }
  finally { loading.value = false }
}
useHead({
  title: 'Wanessa',
  meta: [{ name: 'description', content: 'Acesso restrito — privacidade e alto nível.' }, { name: 'theme-color', content: '#12081a' }],
})
</script>
