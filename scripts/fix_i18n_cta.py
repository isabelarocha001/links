#!/usr/bin/env python3
"""Wire i18n into app.vue + move Enter CTA below cards."""
from pathlib import Path

APP = Path("app.vue")
CSS = Path("assets/css/links-page.css")
app = APP.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")

# --- Template: quiz chrome ---
replacements = [
(
'''            <p class="wa-name">Criadora de conteúdo · Wanessa</p>
            <p class="wa-status">
              <span v-if="isTyping" class="wa-status-typing">digitando…</span>
              <span v-else class="wa-status-online">online</span>
            </p>''',
'''            <p class="wa-name">{{ t('waName') }}</p>
            <p class="wa-status">
              <span v-if="isTyping" class="wa-status-typing">{{ t('waTyping') }}</span>
              <span v-else class="wa-status-online">{{ t('waOnline') }}</span>
            </p>'''
),
('          <div class="wa-day">Hoje</div>', '          <div class="wa-day">{{ t(\'waDay\') }}</div>'),
('placeholder="Responda pelos botões acima"', ':placeholder="t(\'waPlaceholder\')"'),
]

# --- main cards with CTA below ---
old_cards = '''        <section class="main-cards" v-if="configReady">
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
              <span class="card-badge">Portal</span>
            </div>
            <h2 class="card-title">PrivSex</h2>
            <p class="card-desc">Aqui você desbloqueia meu conteúdo pago, chat privado, sou tua noiva virtual, faço lives e chamadas de vídeo ao vivo.</p>
            <span class="card-cta">Entrar no portal →</span>
          </a>
          <a class="lux-card lux-card--right" :href="telegramPublicUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrl)">
            <div class="card-glow"></div>
            <div class="card-top">
              <span class="card-icon"><img v-if="logoTg" :src="logoTg" alt="" class="logo-img" width="28" height="28" /><template v-else>📱</template></span>
              <span class="card-badge badge-tg">Telegram</span>
            </div>
            <h2 class="card-title">Canal Público</h2>
            <p class="card-desc">Meu canal público onde posto todos os teasers dos meus filmes pagos.</p>
            <span class="card-cta">Entrar →</span>
          </a>
        </section>'''

new_cards = '''        <section class="main-cards" v-if="configReady">
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
            <a class="lux-card lux-card--right" :href="telegramPublicUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrl)">
              <div class="card-glow"></div>
              <div class="card-top">
                <span class="card-icon"><img v-if="logoTg" :src="logoTg" alt="" class="logo-img" width="28" height="28" /><template v-else>📱</template></span>
                <span class="card-badge badge-tg">{{ t('tgBadge') }}</span>
              </div>
              <h2 class="card-title">{{ t('pubTitle') }}</h2>
              <p class="card-desc">{{ t('pubDesc') }}</p>
            </a>
            <a class="card-enter" :href="telegramPublicUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrl)">{{ t('pubEnter') }}</a>
          </div>
        </section>'''

if old_cards not in app:
    raise SystemExit('main-cards block not found')
app = app.replace(old_cards, new_cards, 1)

for a, b in replacements:
    if a not in app:
        raise SystemExit(f'template piece not found: {a[:40]}')
    app = app.replace(a, b, 1)

# VIP + direct + bio
app = app.replace(
    '<h3 class="vip-title">Bot pra assinar o VIP no Telegram</h3>\n                <p class="vip-desc">Assinatura instantânea · acesso imediato ao conteúdo</p>',
    '<h3 class="vip-title">{{ t(\'vipTitle\') }}</h3>\n                <p class="vip-desc">{{ t(\'vipDesc\') }}</p>',
    1,
)
app = app.replace(
    '<p class="direct-label">Privado · somente venda de conteúdo</p>',
    '<p class="direct-label">{{ t(\'directLabel\') }}</p>',
    1,
)
app = app.replace(
    '<span class="d-btn-title">WhatsApp privado</span><span class="d-btn-sub">Só venda de conteúdo</span>',
    '<span class="d-btn-title">{{ t(\'waTitle\') }}</span><span class="d-btn-sub">{{ t(\'waSub\') }}</span>',
    1,
)
app = app.replace(
    '<span class="d-btn-title">Telegram privado</span><span class="d-btn-sub">Só venda de conteúdo</span>',
    '<span class="d-btn-title">{{ t(\'tgPrivTitle\') }}</span><span class="d-btn-sub">{{ t(\'tgPrivSub\') }}</span>',
    1,
)
app = app.replace(
    '''                <span><b>22</b> posts</span>
                <span><b>32,2 mil</b> seguidores</span>
                <span><b>53</b> seguindo</span>''',
    '''                <span><b>22</b> {{ t('posts') }}</span>
                <span><b>{{ t('followersCount') }}</b> {{ t('followers') }}</span>
                <span><b>53</b> {{ t('following') }}</span>''',
    1,
)
app = app.replace(
    '<p class="bio-meta">Criadora de conteúdo · Catarinense · 22 anos</p>\n          <p class="bio-text">Presença digital com mais de 30 mil pessoas. O que você encontra aqui é o que não cabe no Instagram.</p>',
    '<p class="bio-meta">{{ t(\'bioMeta\') }}</p>\n          <p class="bio-text">{{ t(\'bioText\') }}</p>',
    1,
)

# Script: import + locale + t + rewrite quiz helpers
if "from '~/utils/i18n'" not in app and 'from "~/utils/i18n"' not in app:
    app = app.replace(
        "import { IG_PROFILE_SRC as igProfileSrc } from '~/utils/ig-profile'\n",
        "import { IG_PROFILE_SRC as igProfileSrc } from '~/utils/ig-profile'\nimport { detectLocale, t as tr, type Locale } from '~/utils/i18n'\n",
        1,
    )

# locale + whatsapp reactive after constants
old_wa = "const whatsappUrl = 'https://wa.me/5547992750967?text=' + encodeURIComponent('Quero mais informaçoes sobre o seu conteudo vip')"
new_wa = """const locale = ref<Locale>('pt')
function t(key: string) { return tr(locale.value, key) }
const whatsappUrl = computed(() => 'https://wa.me/5547992750967?text=' + encodeURIComponent(t('waPrefill')))"""
if old_wa not in app:
    raise SystemExit('whatsappUrl const not found')
app = app.replace(old_wa, new_wa, 1)

# Fix href bindings that used whatsappUrl string - template :href="whatsappUrl" still works with computed

old_qt = """const questionText = (g: 1 | 2 | 3) => {
  if (g === 1) return 'Oi 😊 Você já assinou Privacy, PrivSex ou VIP de alguma criadora?'
  if (g === 2) return 'Você já me conhece pelo Instagram?'
  return 'O que você busca aqui agora?'
}
const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: 'Sim, já assinei', variant: 'wa-quick--yes' }, { key: 'no', label: 'Nunca assinei nada', variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: 'Sim', variant: 'wa-quick--yes' }, { key: 'no', label: 'Não', variant: 'wa-quick--no' }]
  if (gate.value === 3) return [
    { key: 'assinar', label: 'Quero assinar o VIP hoje', variant: 'wa-quick--yes' },
    { key: 'precos', label: 'Quero ver preços / opções', variant: 'wa-quick--yes' },
    { key: 'olhando', label: 'Só estou olhando', variant: 'wa-quick--no' },
  ]
  return []
})"""

new_qt = """const questionText = (g: 1 | 2 | 3) => {
  if (g === 1) return t('q1')
  if (g === 2) return t('q2')
  return t('q3')
}
const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: t('q1yes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('q1no'), variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: t('q2yes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('q2no'), variant: 'wa-quick--no' }]
  if (gate.value === 3) return [
    { key: 'assinar', label: t('q3assinar'), variant: 'wa-quick--yes' },
    { key: 'precos', label: t('q3precos'), variant: 'wa-quick--yes' },
    { key: 'olhando', label: t('q3olhando'), variant: 'wa-quick--no' },
  ]
  return []
})"""
if old_qt not in app:
    raise SystemExit('questionText block not found')
app = app.replace(old_qt, new_qt, 1)

# answerQuiz messages
app = app.replace(
    "typeThenAsk('Obrigada. Este espaço é exclusivo pra quem já valoriza conteúdo pago. Não libero acesso pra quem nunca assinou nada.', 1400)",
    "typeThenAsk(t('rejectNever'), 1400)",
    1,
)
app = app.replace(
    "typeThenAsk('Obrigada. Você não é o tipo de pessoa que estou procurando.', 1200)",
    "typeThenAsk(t('rejectIg'), 1200)",
    1,
)
app = app.replace(
    "typeThenAsk('Obrigada. Este espaço é pra quem já está pronto pra assinar. Quando decidir, volta aqui.', 1400)",
    "typeThenAsk(t('rejectCurious'), 1400)",
    1,
)
app = app.replace(
    "pushMsg('her', 'Perfeito. Vou te levar pro bot VIP e às opções de compra…')",
    "pushMsg('her', t('passAssinar'))",
    1,
)
app = app.replace(
    "pushMsg('her', 'Perfeito. Entrando nas opções e valores…')",
    "pushMsg('her', t('passPrecos'))",
    1,
)
app = app.replace(
    "pushMsg('her', 'Obrigada. Você não é o tipo de pessoa que estou procurando.')",
    "pushMsg('her', t('rejectIg'))",
    1,
)

# detect locale early in onMounted
if 'locale.value = detectLocale()' not in app:
    app = app.replace(
        'onMounted(async () => {\n  const visitor_id = getOrCreateVisitorId()',
        "onMounted(async () => {\n  locale.value = detectLocale()\n  try { document.documentElement.lang = locale.value } catch {}\n  const visitor_id = getOrCreateVisitorId()",
        1,
    )

APP.write_text(app, encoding='utf-8')

# CSS for card-col + enter below
if '.card-col' not in css:
    css = css.replace(
        '.main-cards { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }',
        '''.main-cards { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; align-items: stretch; }
.card-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.card-col .lux-card { flex: 1; min-height: 148px; }
.card-enter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  color: #f5f0ff;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(126, 34, 206, 0.22));
  border: 1px solid rgba(192, 132, 252, 0.45);
  box-sizing: border-box;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}
.card-enter:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.5), rgba(126, 34, 206, 0.32));
  box-shadow: 0 8px 20px rgba(168, 85, 247, 0.25);
}
.card-enter:active { transform: scale(0.98); }''',
        1,
    )
    CSS.write_text(css, encoding='utf-8')

print('i18n + cta below ok')
