<template>
  <div class="page" :class="{ 'page--locked': showLogin || isAdmin }" @copy.prevent @cut.prevent @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
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
        <section class="main-cards" v-if="configReady">
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
          <div class="card-col">
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
        <div class="wa-funnel-shell" role="dialog" aria-modal="true" :style="funnelShellStyle" @click.stop>
          <header class="wa-header wa-funnel-header">
            <button type="button" class="wa-avatar-btn" aria-label="Ver foto de perfil" @click="showFunnelPhoto = true">
              <span class="wa-avatar-wrap wa-avatar-wrap--lg">
                <img class="wa-avatar" src="/model.jpg" alt="Wanessa" draggable="false" />
                <span class="wa-online-dot" aria-hidden="true"></span>
              </span>
            </button>
            <button type="button" class="wa-header-info wa-header-info-btn" @click="showFunnelProfile = true">
              <p class="wa-name">Wanessa</p>
              <p class="wa-status">
                <span v-if="funnelTyping" class="wa-status-typing">digitando…</span>
                <span v-else class="wa-status-online">online</span>
              </p>
            </button>
            <button type="button" class="wa-close-btn" aria-label="Fechar chat" @click="closeWaFunnel">✕</button>
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
                <span class="wa-profile-row-value">Conteúdo online · sem encontro presencial</span>
              </div>
            </div>
          </div>

          <div ref="funnelChatBox" class="wa-chat wa-funnel-chat">
            <div class="wa-day">Hoje</div>
            <div
              v-for="(m, i) in funnelMessages"
              :key="i"
              class="wa-row"
              :class="m.from === 'me' ? 'wa-row--me' : 'wa-row--her'"
            >
              <div class="wa-bubble" :class="m.from === 'me' ? 'wa-bubble--me' : 'wa-bubble--her'">
                <p class="wa-text" v-html="m.html || escapeHtml(m.text)"></p>
                <span class="wa-time">{{ m.time }}</span>
              </div>
            </div>
            <div v-if="funnelTyping" class="wa-row wa-row--her">
              <div class="wa-bubble wa-bubble--her wa-bubble--typing">
                <span class="wa-dot"></span><span class="wa-dot"></span><span class="wa-dot"></span>
              </div>
            </div>
          </div>

          <div class="wa-quick wa-funnel-quick" :class="{ 'wa-funnel-quick--busy': funnelTyping || !funnelOptions.length }">
            <button
              v-for="opt in funnelOptions"
              :key="opt.key"
              type="button"
              class="wa-quick-btn"
              :class="opt.variant || 'wa-quick--yes'"
              :disabled="funnelTyping"
              @click="answerFunnel(opt)"
            >
              {{ opt.label }}
            </button>
            <div v-if="funnelTyping || !funnelOptions.length" class="wa-funnel-quick-placeholder" aria-hidden="true"></div>
          </div>

          <div class="wa-composer wa-funnel-composer wa-funnel-composer--locked" @click="openChatPlans">
            <button type="button" class="wa-emoji" disabled aria-hidden="true">😊</button>
            <div class="wa-input wa-input--locked" role="button" tabindex="0" aria-label="Chat bloqueado — toque para desbloquear">
              <svg class="wa-lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Chat bloqueado — desbloquear</span>
            </div>
            <button type="button" class="wa-send wa-send--locked" aria-label="Chat bloqueado" @click.stop="openChatPlans">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Planos low-ticket do chat (SyncPay) -->
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
              {{ pixStatusLoading ? 'Consultando…' : 'Consultar status da transação' }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="showLogin && !isAdmin" class="wl-overlay" @click.self="showLogin = false">
        <div class="wl-card" role="dialog" aria-modal="true" @click.stop>
          <h2>Acesso admin</h2>
          <input ref="passInput" v-model="password" type="password" placeholder="Senha" autocomplete="current-password" class="wl-input" @keyup.enter="doLogin" />
          <p v-if="loginError" class="wl-error">{{ loginError }}</p>
          <button type="button" class="wl-btn wl-btn-primary" :disabled="loading" @click="doLogin">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
          <button type="button" class="wl-btn wl-btn-ghost" @click="showLogin = false">Cancelar</button>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="isAdmin" class="wl-overlay" @click.self="closeAdmin">
        <div class="wl-card" role="dialog" aria-modal="true" @click.stop>
          <div class="wl-head"><h2>Editar apresentação</h2><button type="button" class="wl-x" @click="closeAdmin">×</button></div>
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
const showFunnelPhoto = ref(false)

const funnelInput = ref('')
const funnelShellStyle = ref<Record<string, string>>({})

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
function closePixModal() {
  showPixModal.value = false
  if (pixPollTimer) { clearInterval(pixPollTimer); pixPollTimer = null }
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
      pixStatusText.value = 'Pagamento confirmado! ✅'
      if (pixPollTimer) { clearInterval(pixPollTimer); pixPollTimer = null }
      try { track('chat_plan_paid', { offer_slug: selectedChatPlan.value?.key || 'chat' }) } catch {}
    } else if (!silent) {
      pixStatusText.value = st?.message || 'Ainda pendente — aguardando PIX'
    } else if (status === 'pending') {
      pixStatusText.value = 'Aguardando pagamento…'
    }
  } catch (e: any) {
    if (!silent) {
      pixStatusText.value = e?.data?.statusMessage || e?.message || 'Erro ao consultar status'
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
const funnelStep = ref<'menu' | 'packs' | 'video' | 'webnamoro' | 'chat' | 'pix' | 'awaiting_payment' | 'paid' | 'redirect' | 'other'>('menu')
const funnelMessages = ref<{ from: 'her' | 'me'; text: string; html?: string; time: string }[]>([])
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
    `<b>PIX gerado — R$ ${priceLabel}</b><br>` +
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
    try { await navigator.clipboard.writeText(res.pix_code) } catch {}
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

async function startFunnelCheckout() {
  const pack = selectedPack.value
  if (!pack) return
  await funnelType(
    `Fechado 🔥 ${pack.label} por R$ ${pack.price}.\n\nVou gerar o PIX aqui na conversa pra você pagar — assim que confirmar, eu te passo o WhatsApp pra eu te entregar 💕`,
    1400,
  )
  const ok = await generateFunnelPix()
  if (!ok) {
    funnelStep.value = 'menu'
    return
  }
  await funnelType('Prontinho, amor 💚', 900, pixBubbleHtml(funnelPixCode.value, pack.price))
  funnelStep.value = 'awaiting_payment'
  stopFunnelPayPoll()
  let tries = 0
  funnelPayPoll = setInterval(() => {
    tries++
    checkFunnelPayment(true)
    if (tries > 60) stopFunnelPayPoll()
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
      await onFunnelPaid()
    } else if (!silent) {
      await funnelType('Ainda não caiu aqui, amor… assim que o PIX confirmar eu te aviso 👀', 1200)
    }
  } catch {
    if (!silent) await funnelType('Não consegui consultar agora. Tenta de novo em alguns segundos 💚', 1000)
  }
}

async function onFunnelPaid() {
  const pack = selectedPack.value
  funnelStep.value = 'paid'
  track('whatsapp_funnel_paid', { offer_slug: pack?.key || 'paid' })
  const isChat = !!(pack?.key || '').startsWith('chat_')
  const isVideo = !!(pack?.key || '').startsWith('vid_')
  const isPack = !!(pack?.key || '').startsWith('pack_')
  const isWeb = !!(pack?.key || '').startsWith('web_')

  await funnelType('Recebi o PIX aqui, meu amor ✅', 1200)

  if (isChat) {
    await funnelType(
      'Pronto 🔥 O chat tá liberado aqui mesmo pra gente conversar.\n\nMe conta o que você quer em especial… sexting, uma conversa bem picante, trocar fotinhos… o que te deixa mais louco? Assim eu já entro no clima certo pra você 😏',
      2200,
    )
    funnelStep.value = 'other'
    return
  }

  if (isVideo) {
    await funnelType(
      `Recebi o PIX, amor 🔥\n\nAgora me chama no WhatsApp que eu já tô toda molhadinha te esperando pra fazer uma videochamada bem gostosa (${pack?.label || 'ao vivo'})…\n\nMeu número: +55 47 992750967\n\nClica em Abrir WhatsApp e me chama agora. Não me deixa esperando 😈`,
      2200,
    )
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

function pushFunnel(from: 'her' | 'me', text: string, html?: string) {
  funnelMessages.value.push({ from, text, html, time: nowTime() })
  scrollFunnel()
  // grava no Supabase (lead = me, bot = her)
  logFunnelMessage(from === 'me' ? 'lead' : 'bot', text, { has_html: !!html })
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
  // NÃO zera opções ao digitar — evita o chat "encolher"
  if (funnelStep.value === 'menu') {
    return [
      { key: 'video', label: '📹 Videochamada', variant: 'wa-quick--yes' },
      { key: 'pack', label: '🔥 Pack de conteúdo', variant: 'wa-quick--yes' },
      { key: 'webnamoro', label: '💕 Webnamoro', variant: 'wa-quick--yes' },
      { key: 'conversar', label: '💬 Só conversar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'packs') {
    return [
      { key: 'pack_basic', label: 'Pack gostinho — R$ 29,90', variant: 'wa-quick--yes' },
      { key: 'pack_gold', label: 'Pack Gold solo — R$ 79,90', variant: 'wa-quick--yes' },
      { key: 'pack_combo', label: 'Combo completo — R$ 109,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'video') {
    return [
      { key: 'vid_10', label: '10 min — R$ 99,90', variant: 'wa-quick--yes' },
      { key: 'vid_20', label: '20 min — R$ 149,90', variant: 'wa-quick--yes' },
      { key: 'vid_30', label: '30 min — R$ 229,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'webnamoro') {
    return [
      { key: 'web_7', label: '7 dias — R$ 179,90', variant: 'wa-quick--yes' },
      { key: 'web_15', label: '15 dias — R$ 299,90', variant: 'wa-quick--yes' },
      { key: 'web_30', label: '30 dias — R$ 499,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'chat') {
    return [
      { key: 'chat_basic', label: 'Chat 30–40 min — R$ 49,90', variant: 'wa-quick--yes' },
      { key: 'chat_midia', label: 'Chat + fotos/vídeos — R$ 79,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'pix') {
    return [
      { key: 'pix_generate', label: 'Gerar PIX agora 💚', variant: 'wa-quick--yes' },
      { key: 'pix_no', label: 'Agora não', variant: 'wa-quick--no' },
    ]
  }
  if (funnelStep.value === 'awaiting_payment') {
    return [
      { key: 'pix_check', label: 'Já paguei — verificar ✅', variant: 'wa-quick--yes' },
      { key: 'pix_copy', label: 'Copiar código PIX', variant: 'wa-quick--yes' },
      { key: 'pix_regen', label: 'Gerar PIX de novo', variant: 'wa-quick--no' },
    ]
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
  return []
})


const FUNNEL_STORAGE_KEY = 'wanessa_wa_funnel_v1'
const FUNNEL_SESSION_KEY = 'wanessa_wa_funnel_session'

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

function logFunnelMessage(direction: 'lead' | 'bot', message: string, extra: Record<string, any> = {}) {
  try {
    const visitor_id = getOrCreateVisitorId()
    const payload = {
      visitor_id,
      session_id: getFunnelSessionId(),
      direction,
      message: String(message || '').slice(0, 2000),
      step: funnelStep.value,
      selected_offer: selectedPack.value?.key || selectedPack.value?.label || null,
      selected_price: selectedPack.value?.price || null,
      metadata: extra,
    }
    const json = JSON.stringify(payload)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' })
      navigator.sendBeacon('/api/funnel-chat', blob)
      return
    }
    fetch('/api/funnel-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
    }).catch(() => {})
  } catch {}
}


function saveFunnelState() {
  try {
    localStorage.setItem(
      FUNNEL_STORAGE_KEY,
      JSON.stringify({
        step: funnelStep.value,
        messages: funnelMessages.value,
        selectedPack: selectedPack.value,
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
    return true
  } catch {
    return false
  }
}

function clearFunnelState() {
  try { localStorage.removeItem(FUNNEL_STORAGE_KEY) } catch {}
  funnelStep.value = 'menu'
  funnelMessages.value = []
  selectedPack.value = null
}

function openWaFunnel() {
  track('whatsapp_funnel_open', { offer_slug: 'whatsapp' })
  onCardClick('WhatsApp Funnel', whatsappUrl.value)
  try { logFunnelMessage('lead', '[abriu o chat]', { event: 'open' }) } catch {}
  showWaFunnel.value = true
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

  funnelStep.value = 'menu'
  funnelMessages.value = []
  selectedPack.value = null
  nextTick(async () => {
    await funnelType('Bem-vindo, amor 😘 O que você gostaria de ter de mim hoje?', 1200)
    saveFunnelState()
  })
}

function closeWaFunnel() {
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
}

function buildWaLink(prefill: string) {
  return 'https://wa.me/5547992750967?text=' + encodeURIComponent(prefill)
}


async function sendFunnelFreeText() {
  // Chat bloqueado — redireciona para planos
  openChatPlans()
  return
  const text = (funnelInput.value || '').trim()
  if (!text || funnelTyping.value) return
  funnelInput.value = ''
  pushFunnel('me', text)
  try { saveFunnelState() } catch {}
  try { track('whatsapp_funnel_free_text', { offer_slug: 'whatsapp', message: text.slice(0, 120) }) } catch {}

  const lower = text.toLowerCase()

  if (/pack|pacote|conte[uú]do|combo|gold/.test(lower)) {
    funnelStep.value = 'packs'
    await funnelType(
      'Tenho packs sim, amor 🔥\n\n• R$ 29,90 — gostinho\n• R$ 79,90 — Gold solo\n• R$ 109,90 — Combo completo\n\nQual você quer? Ou continua falando comigo aqui 😘',
      1200,
    )
    return
  }
  if (/video|chamada|call|cam/.test(lower)) {
    funnelStep.value = 'video'
    await funnelType(
      'Videochamada eu faço sim 🔥\n\n• 10 min — R$ 99,90\n• 20 min — R$ 149,90\n• 30 min — R$ 229,90\n\nQual tempo você quer?',
      1200,
    )
    return
  }
  if (/webnamoro|namoro|namorada|exclusiv/.test(lower)) {
    funnelStep.value = 'webnamoro'
    await funnelType(
      'Webnamoro é exclusividade comigo 💕\n\n• 7 dias — R$ 179,90\n• 15 dias — R$ 299,90\n• 30 dias — R$ 499,90\n\nQual pacote te interessa?',
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
  if (/oi|ol[aá]|bom dia|boa tarde|boa noite|e a[ií]|hey|hello/.test(lower)) {
    await funnelType('Oi amor 😘 Me conta o que você quer de mim hoje — pack, videochamada, webnamoro ou só um papo safado?', 1100)
    return
  }
  if (/encont|presencial|sair|te encontrar|programad/.test(lower)) {
    await funnelType(
      'Amor, eu só faço conteúdo e experiências online — sem encontro presencial, ok? Posso te oferecer pack, call ou webnamoro 💕',
      1200,
    )
    return
  }

  const replies = [
    'Hmm entendi… me conta melhor o que você quer, amor 😏 Pode escolher pelos botões ou escrever: pack, videochamada, webnamoro...',
    'Tô aqui 🔥 Quer conteúdo, call ao vivo ou webnamoro? Pode digitar ou usar os botões.',
    'Gostei de você falando comigo 😘 O que te deixa mais louco: pack, videochamada ou ser meu webnamorado?',
  ]
  const reply = replies[Math.floor(Math.random() * replies.length)]
  await funnelType(reply, 1100)
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
      'Tenho 3 packs pra você, amor:\n\n• R$ 29,90 — um gostinho pra me conhecer melhor\n• R$ 79,90 — Pack Gold: solos longos, bem safadinha\n• R$ 109,90 — Combo completo: solo, transando, com outras mulheres, cosplay e tudo\n\nQual você quer?',
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

  if (opt.key === 'pix_yes' || opt.key === 'pix_generate') {
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
    funnelStep.value = 'video'
    await funnelType(
      'Videochamada ao vivo comigo, amor 🔥 Escolhe o tempo:\n\n• 10 min — R$ 99,90\n• 20 min — R$ 149,90\n• 30 min — R$ 229,90\n\nQual combina com você?',
      1300,
    )
    return
  }

  if (opt.key === 'vid_10' || opt.key === 'vid_20' || opt.key === 'vid_30') {
    const map: Record<string, { label: string; price: string; desc: string }> = {
      vid_10: { label: 'Videochamada 10 min', price: '99,90', desc: 'chamada ao vivo rápida e safada' },
      vid_20: { label: 'Videochamada 20 min', price: '149,90', desc: 'tempo pra gozar com calma' },
      vid_30: { label: 'Videochamada 30 min', price: '229,90', desc: 'sessão completa comigo' },
    }
    const p = map[opt.key]
    selectedPack.value = { key: opt.key, label: p.label, price: p.price }
    track('whatsapp_funnel_select', { offer_slug: opt.key })
    await startFunnelCheckout()
    return
  }

  if (opt.key === 'webnamoro') {
    track('whatsapp_funnel_intent', { offer_slug: 'webnamoro' })
    funnelStep.value = 'webnamoro'
    await funnelType(
      'Webnamoro é pra quem quer exclusividade comigo 💕\n\n• 7 dias — R$ 179,90 (chat diário + áudios + 1 call curta)\n• 15 dias — R$ 299,90 (+ calls e conteúdo exclusivo)\n• 30 dias — R$ 499,90 (namorada virtual completa)\n\nQual pacote você quer?',
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
      'Chat comigo também tem valor, amor 😘\n\n• R$ 49,90 — chat safado 30–40 min\n• R$ 79,90 — chat + fotos e vídeos no momento\n\nO que você prefere?',
      1200,
    )
    return
  }

  if (opt.key === 'chat_basic' || opt.key === 'chat_midia') {
    const map: Record<string, { label: string; price: string; desc: string }> = {
      chat_basic: { label: 'Chat 30–40 min', price: '49,90', desc: 'papo safado só nosso' },
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
const password = ref('')
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
onMounted(async () => {
  locale.value = detectLocale()
  try { document.documentElement.lang = locale.value } catch {}
  const visitor_id = getOrCreateVisitorId()
  if (!alreadyViewedToday()) {
    markViewedToday()
    track('page_view', { offer_slug: 'wanessa_links' })
  }
  let restored: string | null = null
  try { restored = localStorage.getItem(GATE_KEY) } catch {}
  if (restored === 'pass' || restored === 'reject') gate.value = restored
  else if (restored === '1' || restored === '2' || restored === '3' || restored === '4') gate.value = Number(restored) as 1 | 2 | 3 | 4
  else if (restored === '4') gate.value = 1 // legacy progress -> restart
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
  // Quiz desativado temporariamente (toggle no admin)
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
  photoTimer = setInterval(() => { photoIndex.value = (photoIndex.value + 1) % gallery.length }, 4200)
})
onUnmounted(() => {
  if (photoTimer) clearInterval(photoTimer)
  if (typingTimer) clearTimeout(typingTimer)
})
function openLogin() { password.value = ''; loginError.value = ''; showLogin.value = true; nextTick(() => passInput.value?.focus()) }
function openEdit() {
  edit.name = config.name; edit.bio = config.bio; edit.highlight_label = config.highlight_label || DEFAULT_HIGHLIGHT
  edit.quiz_enabled = config.quiz_enabled === true
  edit.links = config.links.map((l) => ({ label: l.label, icon: l.icon, url: l.url, desc: l.desc || '', enabled: l.enabled !== false }))
  if (!edit.links.length) edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true })
}
function closeAdmin() { isAdmin.value = false; saveMsg.value = ''; saveError.value = '' }
function addLink() { edit.links.push({ label: '', icon: '🔗', url: '', desc: '', enabled: true }) }
function removeLink(i: number) { edit.links.splice(i, 1) }
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
