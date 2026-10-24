<template>
  <main class="vip-checkout">
    <header class="vip-checkout__top">
      <a class="vip-checkout__brand" href="/" aria-label="Voltar para a página">WANESSA <span>•</span></a>
      <span class="vip-checkout__secure">Canal VIP do Telegram</span>
    </header>
    <section class="vip-checkout__layout">
      <div class="vip-checkout__offer">
        <div class="vip-checkout__creator" aria-label="Canal VIP da Wanessa">
          <button ref="avatarTrigger" class="vip-checkout__avatar-trigger" type="button" aria-label="Ampliar foto da Wanessa" aria-haspopup="dialog" :aria-expanded="avatarOpen" @click="openAvatar">
            <img class="vip-checkout__avatar" src="/wanessa-vip-avatar.jpeg" alt="" width="104" height="104" fetchpriority="high" draggable="false" @contextmenu.prevent @dragstart.prevent>
          </button>
          <div class="vip-checkout__creator-copy">
            <p class="vip-checkout__creator-name">Wanessa</p>
            <p class="vip-checkout__creator-label">Meu Canal VIP</p>
          </div>
        </div>
        <h1>Chega de ver só um pedacinho.</h1>
        <p class="vip-checkout__intro">No VIP, você recebe o link do canal no Telegram 💌🔒<br><br>Também te explico como falar comigo no WhatsApp 📲💗<br><br>Quero ser sua companhia. A gente pode se conhecer melhor, conversar sobre o seu dia ou deixar nosso papo mais quente, do jeitinho que você gosta 😘🔥.</p>
        <ul class="vip-checkout__benefits">
          <li><span aria-hidden="true">✓</span> Conteúdo exclusivo que não publico em outro lugar</li>
          <li><span aria-hidden="true">✓</span> Canal VIP exclusivo no Telegram</li>
          <li><span aria-hidden="true">✓</span> WhatsApp para a gente conversar mais de perto 💌</li>
        </ul>
      </div>
        <div class="vip-checkout__plans-arrow" role="img" aria-label="Veja os planos ao lado">
          <svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="vip-arrow-rgb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff2d95"/><stop offset="35%" stop-color="#9b4dff"/><stop offset="68%" stop-color="#16d9ff"/><stop offset="100%" stop-color="#48f0a2"/></linearGradient></defs><path d="M8 32h45M35 14l18 18-18 18" fill="none" stroke="url(#vip-arrow-rgb)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      <section class="vip-checkout__plans" aria-labelledby="plans-title">
        <h2 id="plans-title">Escolha seu plano</h2>
        <button v-for="plan in visiblePlans" :key="plan.id" class="vip-plan" :class="{ 'vip-plan--selected': selectedPlan === plan.id, 'vip-plan--featured': plan.id === 'monthly' }" type="button" :aria-pressed="selectedPlan === plan.id" :disabled="!canPay(plan) || paymentStarted" @click="selectPlan(plan)">
          <span class="vip-plan__radio" aria-hidden="true"></span>
          <span class="vip-plan__body"><span class="vip-plan__name">{{ plan.name }}</span><span class="vip-plan__detail">{{ plan.detail }}</span></span>
          <span class="vip-plan__price">{{ displayPrice(plan) }}</span>
          <span v-if="plan.badge" class="vip-plan__badge">{{ plan.badge }}</span>
        </button>
        <button class="vip-checkout__cta" type="button" :disabled="!selected || !canPay(selected) || paymentLoading" @click="openCheckoutDialog">
          {{ pixCode ? 'Ver Pix gerado' : 'Assinar agora' }} <span aria-hidden="true">&rarr;</span>
        </button>
        <p v-if="paymentError" class="vip-checkout__fineprint" role="status">{{ paymentError }}</p>
      </section>
    </section>
    <div class="vip-checkout__trust" aria-label="Segurança do pagamento e do site">
      <span class="vip-checkout__trust-seal"><svg class="vip-checkout__pix-symbol" viewBox="0 0 48 48" role="img" aria-label="Pix"><path d="M24 3 33 12 24 21 15 12 24 3ZM36 15 45 24 36 33 27 24 36 15ZM24 27 33 36 24 45 15 36 24 27ZM12 15 21 24 12 33 3 24 12 15Z" fill="currentColor"/></svg><span class="vip-checkout__pix-mark" aria-hidden="true">PIX</span><span>Confirme o pagamento no app do seu banco</span></span>
      <span v-if="usesHttps" class="vip-checkout__trust-seal">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none"><path d="M12 3 5 6v5c0 4.7 2.9 8.1 7 10 4.1-1.9 7-5.3 7-10V6l-7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Conexão protegida por HTTPS</span>
      </span>
    </div>
    <div v-if="avatarOpen" class="vip-avatar-viewer" @click.self="closeAvatar" @keydown.esc.stop="closeAvatar">
      <section class="vip-avatar-viewer__dialog" role="dialog" aria-modal="true" aria-label="Foto da Wanessa em tela cheia" tabindex="-1">
        <button ref="avatarCloseButton" class="vip-avatar-viewer__close" type="button" aria-label="Fechar foto" @click="closeAvatar">&times;</button>
        <img class="vip-avatar-viewer__image" src="/wanessa-vip-avatar.jpeg" alt="Foto da Wanessa" width="900" height="900" draggable="false" @contextmenu.prevent @dragstart.prevent>
      </section>
    </div>
    <div v-if="checkoutDialogOpen" class="vip-modal-backdrop" @click.self="closeCheckoutDialog">
      <section class="vip-modal" role="dialog" aria-modal="true" aria-labelledby="vip-modal-title" @keydown.esc="closeCheckoutDialog">
        <button class="vip-modal__close" type="button" aria-label="Fechar" autofocus @click="closeCheckoutDialog">&times;</button>
        <template v-if="!pixCode">
          <p class="vip-modal__eyebrow">PLANO ESCOLHIDO</p>
          <h2 id="vip-modal-title">{{ selected?.name }}</h2>
          <p class="vip-modal__price">{{ selected ? displayPrice(selected) : '' }}</p>
          <p v-if="selected?.id === 'monthly'" class="vip-modal__note">Cobrança automática pelo Pix a cada 30 dias. Você pode cancelar no app do seu banco.</p>
          <p v-else class="vip-modal__note">Pagamento único. O acesso não tem prazo para terminar.</p>
          <div v-if="selected?.id === 'monthly'" class="vip-payer-form">
            <label for="vip-payer-name">Nome completo</label>
            <input id="vip-payer-name" v-model="payerName" autocomplete="name" maxlength="100" required>
            <label for="vip-payer-email">Seu e-mail</label>
            <input id="vip-payer-email" v-model="payerEmail" type="email" autocomplete="email" maxlength="254" required>
            <label for="vip-payer-cpf">CPF</label>
            <input id="vip-payer-cpf" :value="payerCpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" required @input="setPayerCpf">
          </div>
          <p v-if="paymentError" class="vip-modal__error" role="alert">{{ paymentError }}</p>
          <button class="vip-checkout__cta" type="button" :disabled="!selected || !canPay(selected) || paymentLoading || (selected.id === 'monthly' && !monthlyFormReady)" @click="continueToPayment">
            {{ paymentLoading ? 'Gerando Pix…' : `Gerar Pix · ${selected ? displayPrice(selected) : ''}` }} <span aria-hidden="true">&rarr;</span>
          </button>
        </template>
        <template v-else>
          <p class="vip-modal__eyebrow">PAGAMENTO</p>
          <h2 id="vip-modal-title">Pix de {{ selected ? displayPrice(selected) : '' }}</h2>
          <p v-if="selected?.id === 'monthly'" class="vip-modal__note">Abra o app do seu banco e autorize a cobrança automática a cada 30 dias.</p>
          <div class="vip-pix" role="region" aria-label="Pagamento Pix">
            <img v-if="qrImage" :src="qrImage" alt="QR Code Pix para pagamento" class="vip-pix__qr">
            <label for="vip-pix-code">Pix copia e cola</label>
            <textarea id="vip-pix-code" :value="pixCode" readonly rows="3"></textarea>
            <button type="button" @click="copyPix">{{ copied ? 'Código copiado' : 'Copiar Pix' }}</button>
            <section v-if="selected?.id === 'monthly'" class="vip-pix-tutorial" aria-labelledby="vip-pix-tutorial-title">
              <h3 id="vip-pix-tutorial-title">Quer descobrir o que eu guardo só pros meus assinantes?</h3>
              <p class="vip-pix-tutorial__intro">Este plano é mensal. Você autoriza {{ selected ? displayPrice(selected) : '' }} a cada 30 dias. Não é um Pix único.</p>
              <div class="vip-pix-tutorial__step" :key="pixTutorialStep" aria-live="polite">
                <div class="vip-pix-tutorial__visual" aria-hidden="true">
                  <svg v-if="pixTutorialStep === 0" viewBox="0 0 48 48" fill="none"><path d="M8 19 24 9l16 10H8Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M11 21h26M13 21v14m8-14v14m8-14v14m8-14v14M9 38h30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                  <svg v-else-if="pixTutorialStep === 1" viewBox="0 0 48 48" fill="none"><rect x="11" y="6" width="26" height="36" rx="4" stroke="currentColor" stroke-width="2.5"/><path d="M17 15h14M17 21h14m-14 7h5m-5 6h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                  <svg v-else viewBox="0 0 48 48" fill="none"><path d="M24 5 10 11v10c0 9 5.8 16.5 14 21 8.2-4.5 14-12 14-21V11L24 5Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="m17 24 5 5 10-11" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="vip-pix-tutorial__step-copy">
                  <p class="vip-pix-tutorial__count">Passo {{ pixTutorialStep + 1 }} de 3</p>
                  <h4>{{ pixTutorialSteps[pixTutorialStep].title }}</h4>
                  <p>{{ pixTutorialSteps[pixTutorialStep].message }}</p>
                </div>
              </div>
              <div v-if="pixTutorialStep < 2" class="vip-pix-tutorial__controls">
                <button v-if="pixTutorialStep > 0" type="button" class="vip-pix-tutorial__back" @click="pixTutorialStep--">Voltar</button>
                <button type="button" class="vip-pix-tutorial__next" @click="pixTutorialStep++">Próximo passo</button>
              </div>
              <div v-else class="vip-pix-tutorial__answer">
                <p>Ficou fácil de entender?</p>
                <div class="vip-pix-tutorial__answers">
                  <button type="button" class="vip-pix-tutorial__next" @click="pixTutorialUnderstood = true; pixTutorialNeedsHelp = false">Sim, entendi</button>
                  <button type="button" class="vip-pix-tutorial__back" @click="pixTutorialNeedsHelp = true; pixTutorialUnderstood = false">Não, explica de novo</button>
                </div>
                <p v-if="pixTutorialUnderstood" class="vip-pix-tutorial__feedback" role="status">Certo. Agora autorize no app do seu banco.</p>
                <div v-if="pixTutorialNeedsHelp" class="vip-pix-tutorial__help" role="status">
                  <p>É uma autorização mensal de {{ selected ? displayPrice(selected) : '' }}. Não é um Pix pago uma vez só. Você pode cancelar no app do banco.</p>
                  <button type="button" class="vip-pix-tutorial__back" @click="pixTutorialStep = 0; pixTutorialNeedsHelp = false">Ver os passos de novo</button>
                </div>
                <button v-else-if="pixTutorialUnderstood" type="button" class="vip-pix-tutorial__back" @click="pixTutorialStep = 0; pixTutorialUnderstood = false">Rever os passos</button>
              </div>
            </section>
            <p>{{ pixStatus }}</p>
            <button v-if="!pixPaid" type="button" class="vip-pix__check" :disabled="checkingStatus" @click="checkPayment">{{ checkingStatus ? 'Consultando…' : 'Já paguei · consultar' }}</button>
            <p v-else class="vip-pix__success">{{ selected?.id === 'monthly' ? 'Assinatura confirmada. A liberação do canal depende da configuração do bot VIP.' : 'Pagamento confirmado. A liberação do canal depende da configuração do bot VIP.' }}</p>
          </div>
        </template>
      </section>
    </div>
  </main>
</template>
<script setup lang="ts">
import QRCode from 'qrcode'

const shareUrl = 'https://wanessabsx.vercel.app/assinaturavip'
const shareImage = 'https://wanessabsx.vercel.app/og-assinatura-vip.jpg'
const shareTitle = 'Assine o Canal VIP da Wanessa no Telegram'
const shareDescription = 'Este é o espaço para assinar o Canal VIP da Wanessa no Telegram. Confira os planos e escolha seu acesso.'

useSeoMeta({
  title: shareTitle,
  description: shareDescription,
  robots: 'index, follow',
  ogTitle: shareTitle,
  ogDescription: shareDescription,
  ogType: 'website',
  ogUrl: shareUrl,
  ogSiteName: 'Wanessa',
  ogLocale: 'pt_BR',
  ogImage: shareImage,
  ogImageSecureUrl: shareImage,
  ogImageType: 'image/jpeg',
  ogImageWidth: '1200',
  ogImageHeight: '630',
  ogImageAlt: 'Ícone de assinatura do Canal VIP da Wanessa no Telegram',
  twitterCard: 'summary_large_image',
  twitterTitle: shareTitle,
  twitterDescription: shareDescription,
  twitterImage: shareImage,
  twitterImageAlt: 'Ícone de assinatura do Canal VIP da Wanessa no Telegram',
})

useHead({
  link: [{ rel: 'canonical', href: shareUrl }],
})

type Currency = 'BRL' | 'USD' | 'EUR'
type Prices = Record<Currency, number | null>
type Plan = { id: string; name: string; detail: string; prices: Prices; enabled: boolean; badge?: string; price?: number }
type CheckoutSettings = { plans: Plan[] }
const STORAGE_KEY = 'wanessa-vip-checkout-settings-v1'
const defaultSettings: CheckoutSettings = {
  plans: [
    { id: 'monthly', name: 'Mensal', detail: 'Cobrança automática a cada 30 dias', prices: { BRL: 29.9, USD: null, EUR: null }, enabled: true, badge: 'OFERTA' },
    { id: 'lifetime', name: 'Vitalício', detail: 'Pagamento único, sem prazo para terminar', prices: { BRL: 109.9, USD: null, EUR: null }, enabled: true, badge: 'PAGUE UMA VEZ' },
  ],
}
const settings = ref<CheckoutSettings>(defaultSettings)
const selectedPlan = ref('monthly')
const checkoutDialogOpen = ref(false)
const avatarOpen = ref(false)
const avatarTrigger = ref<HTMLButtonElement | null>(null)
const avatarCloseButton = ref<HTMLButtonElement | null>(null)
const usesHttps = ref(false)
const paymentLoading = ref(false)
const paymentStarted = ref(false)
const paymentError = ref('')
const currency = ref<Currency>('BRL')
const locale = ref('pt-BR')
const pixCode = ref('')
const qrImage = ref('')
const paymentId = ref('')
const pixStatus = ref('Aguardando pagamento?')
const pixPaid = ref(false)
const checkingStatus = ref(false)
const copied = ref(false)
const payerName = ref('')
const payerEmail = ref('')
const payerCpf = ref('')
const pixTutorialSteps = [
  { title: 'Abra o app do seu banco', message: 'Leia o QR que apareceu aqui ou cole o código Pix.' },
  { title: 'Confira antes de aceitar', message: 'Veja se aparece o valor do plano e a cobrança mensal, a cada 30 dias.' },
  { title: 'Autorize sua assinatura', message: 'Quando o banco confirmar, seu acesso ao VIP fica liberado. Aí te espero por lá. Se mudar de ideia, você pode cancelar pelo app do banco.' },
]
const pixTutorialStep = ref(0)
const pixTutorialUnderstood = ref(false)
const pixTutorialNeedsHelp = ref(false)
const pendingPixExitTracked = ref(false)
const monthlyFormReady = computed(() => payerName.value.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail.value.trim()) && payerCpf.value.replace(/\D/g, '').length === 11)
const visiblePlans = computed(() => settings.value.plans.filter(plan => plan.enabled))
const selected = computed(() => visiblePlans.value.find(plan => plan.id === selectedPlan.value) || visiblePlans.value[0])
const selectedPrice = computed(() => selected.value ? selected.value.prices?.[currency.value] ?? null : null)
function priceFor(plan: Plan): number | null {
  const value = plan.prices?.[currency.value]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}
function canPay(plan: Plan) { return currency.value === 'BRL' && priceFor(plan) !== null }
function displayPrice(plan: Plan) { const value = priceFor(plan); return value === null ? 'Indisponível' : formatPrice(value) }
function formatPrice(value: number) { return new Intl.NumberFormat(locale.value, { style: 'currency', currency: currency.value }).format(value) }
function normalizePlan(raw: any, fallback: Plan): Plan {
  const saved = raw?.prices && typeof raw.prices === 'object' ? raw.prices : {}
  const clean = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
  return { ...fallback, ...raw, prices: { BRL: clean(saved.BRL) ?? clean(raw?.price) ?? fallback.prices.BRL, USD: clean(saved.USD), EUR: clean(saved.EUR) } }
}
function detectCurrency() {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  locale.value = languages.find(Boolean) || 'pt-BR'
  let region = ''
  for (const language of languages) { try { region = new Intl.Locale(language).maximize().region || ''; if (region) break } catch { /* Ignore malformed browser locale tags. */ } }
  const euroRegions = new Set(['AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK','BG'])
  currency.value = region === 'BR' ? 'BRL' : euroRegions.has(region) ? 'EUR' : 'USD'
}
function selectPlan(plan: Plan) {
  if (canPay(plan) && !paymentStarted.value) {
    selectedPlan.value = plan.id
    paymentError.value = ''
    trackVip('vip_plan_selected', plan.id)
  }
}
function openCheckoutDialog() {
  if (selected.value && canPay(selected.value)) {
    paymentError.value = ''
    checkoutDialogOpen.value = true
    trackVip('vip_subscribe_clicked', selected.value.id)
  }
}
function trackPendingPixExit() {
  if (!pixCode.value || pixPaid.value || pendingPixExitTracked.value) return
  pendingPixExitTracked.value = true
  trackVip('vip_pix_pending_exit', selected.value?.id)
}
function closeCheckoutDialog() {
  if (checkoutDialogOpen.value && pixCode.value && !pixPaid.value) trackPendingPixExit()
  checkoutDialogOpen.value = false
}
async function openAvatar() { avatarOpen.value = true; await nextTick(); avatarCloseButton.value?.focus() }
function closeAvatar() { avatarOpen.value = false; nextTick(() => avatarTrigger.value?.focus()) }
function getVipVisitorId() {
  const key = 'vip-checkout-visitor-id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}
function trackVip(eventName: string, planKey?: string) {
  try {
    const metadata = ['monthly', 'lifetime'].includes(String(planKey)) ? { plan_key: planKey } : {}
    const body = JSON.stringify({
      event_name: eventName,
      visitor_id: getVipVisitorId(),
      offer_slug: 'vip_telegram',
      metadata,
    })
    const beaconBody = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon('/api/track', beaconBody)) return
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch { /* Tracking must never interrupt checkout actions. */ }
}
function onPageHide() {
  if (checkoutDialogOpen.value) trackPendingPixExit()
}
function setPayerCpf(event: Event) {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 11)
  payerCpf.value = digits.length > 9 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` : digits.length > 6 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}` : digits.length > 3 ? `${digits.slice(0, 3)}.${digits.slice(3)}` : digits
}
async function continueToPayment() {
  if (!selected.value || !canPay(selected.value) || paymentLoading.value) return
  paymentLoading.value = true
  paymentError.value = ''
  try {
    if (selected.value.id === 'monthly') {
      const response = await $fetch<any>('/api/checkout/vip-monthly', { method: 'POST', body: {
        name: payerName.value.trim(),
        email: payerEmail.value.trim(),
        document: payerCpf.value.replace(/\D/g, ''),
        visitor_id: getVipVisitorId(),
        accepted_recurring: true,
      } })
      if (!response?.ok || !response.pix_code || !response.payment_id) throw new Error('Não foi possível iniciar a autorização do Pix. Tente novamente.')
      pixCode.value = response.pix_code
      qrImage.value = await QRCode.toDataURL(response.pix_code, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      paymentId.value = response.payment_id
      pixTutorialStep.value = 0
      pixTutorialUnderstood.value = false
      pixTutorialNeedsHelp.value = false
      pixStatus.value = response.mandate_status === 'ACTIVE' ? 'Autorização recebida; aguardando confirmação da assinatura.' : 'Abra o app do seu banco e autorize o Pix Automático.'
      pixPaid.value = false
      paymentStarted.value = true
      pendingPixExitTracked.value = false
      trackVip('vip_pix_generated', selected.value.id)
      return
    }

    const response = await $fetch<any>('/api/checkout/pix', { method: 'POST', body: {
      plan_key: selected.value.id === 'monthly' ? 'vip_monthly' : 'vip_lifetime',
      source: 'assinaturavip', visitor_id: getVipVisitorId(),
    } })
    if (!response?.ok || !response.pix_code) throw new Error('Não foi possível gerar o Pix. Tente novamente.')
    pixCode.value = response.pix_code
    qrImage.value = response.qr_image || ''
    paymentId.value = response.payment_id || response.external_id || ''
    pixStatus.value = 'Aguardando pagamento?'
    pixPaid.value = false
    paymentStarted.value = true
    pendingPixExitTracked.value = false
    trackVip('vip_pix_generated', selected.value.id)
  } catch (error: any) {
    paymentError.value = error?.data?.statusMessage || error?.data?.message || error?.message || 'Não foi possível gerar o Pix. Tente novamente.'
  } finally { paymentLoading.value = false }
}
async function copyPix() {
  trackVip('vip_pix_copy_clicked', selected.value?.id)
  try { await navigator.clipboard.writeText(pixCode.value); copied.value = true; window.setTimeout(() => { copied.value = false }, 1800) }
  catch { paymentError.value = 'Não consegui copiar automaticamente. Selecione e copie o código Pix.' }
}
async function checkPayment() {
  if (!paymentId.value || checkingStatus.value) return
  checkingStatus.value = true
  try {
    const result = await $fetch<any>('/api/checkout/status', { query: { id: paymentId.value } })
    if (['approved', 'paid', 'completed'].includes(String(result?.status).toLowerCase())) { pixPaid.value = true; pixStatus.value = 'Assinatura confirmada.' }
    else if (String(result?.mandate_status || '').toLowerCase() === 'active') pixStatus.value = 'Autorização confirmada. Aguardando a primeira cobrança.'
    else pixStatus.value = 'Abra o app do seu banco e autorize o Pix Automático. Depois, consulte novamente.'
  } catch { pixStatus.value = 'Não consegui consultar agora. Tente novamente em instantes.' }
  finally { checkingStatus.value = false }
}
onMounted(() => {
  usesHttps.value = window.location.protocol === 'https:'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      settings.value = {
        plans: defaultSettings.plans,
      }
    }
  } catch { /* Keep the safe defaults when local settings are invalid. */ }
  detectCurrency()
  if (selectedPrice.value === null) { const available = visiblePlans.value.find(plan => priceFor(plan) !== null); selectedPlan.value = available?.id || visiblePlans.value[0]?.id || '' }
  trackVip('vip_checkout_view')
  window.addEventListener('pagehide', onPageHide)
})
onBeforeUnmount(() => window.removeEventListener('pagehide', onPageHide))
</script>
<style scoped>
.vip-checkout{--ink:#f8f5fa;--muted:#c5bdca;--line:rgba(255,255,255,.14);min-height:100vh;background:#100d13;color:var(--ink);font-family:inherit;padding:0 22px 28px}.vip-checkout__top{max-width:1120px;margin:auto;height:68px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.vip-checkout__brand{color:#fff;text-decoration:none;font-weight:900;letter-spacing:.12em}.vip-checkout__brand span{color:#cf9cf5}.vip-checkout__secure{font-size:.82rem;color:#d7d0dc}.vip-checkout__layout{max-width:1020px;margin:42px auto 0;display:grid;grid-template-columns:minmax(0,1.02fr) minmax(360px,.98fr);gap:58px;align-items:start}.vip-checkout__eyebrow{margin:25px 0 8px;color:#e3baff;font-size:.72rem;font-weight:800;letter-spacing:.14em}.vip-checkout__offer h1{max-width:540px;margin:0;font-size:clamp(2rem,4vw,3.25rem);line-height:1.02;letter-spacing:-.04em}.vip-checkout__intro{max-width:470px;color:var(--muted);font-size:1.04rem;line-height:1.6}.vip-checkout__benefits{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:13px;color:#eee8f1}.vip-checkout__benefits li{display:flex;gap:11px;align-items:flex-start;line-height:1.4}.vip-checkout__benefits li span{color:#d8a9f6;font-weight:900}.vip-checkout__privacy{margin-top:25px;color:#e4d1ef;font-size:.88rem}.vip-checkout__plans{padding:26px;background:#19151d;border:1px solid var(--line);border-radius:18px;box-shadow:0 16px 50px rgba(0,0,0,.22)}.vip-checkout__plans .vip-checkout__eyebrow{margin:0 0 9px}.vip-checkout__plans h2{font-size:1.5rem;margin:0 0 20px;letter-spacing:-.025em}.vip-plan{width:100%;min-height:85px;text-align:left;position:relative;display:flex;align-items:center;gap:13px;padding:15px 14px;margin-top:12px;color:var(--ink);background:#211c25;border:1px solid rgba(255,255,255,.16);border-radius:12px;cursor:pointer}.vip-plan--selected{border-color:#d4a2f2;box-shadow:0 0 0 1px #d4a2f2 inset}.vip-plan__radio{width:18px;height:18px;border-radius:50%;border:1px solid #bcb3c0;flex:none}.vip-plan--selected .vip-plan__radio{border:5px solid #d6a5f1;background:#fff}.vip-plan__body{display:grid;gap:5px;flex:1}.vip-plan__name{font-weight:800;font-size:1rem}.vip-plan__detail{font-size:.8rem;color:#d0c7d4}.vip-plan__price{font-weight:850;white-space:nowrap}.vip-plan__badge{position:absolute;top:-9px;right:12px;background:#e0b9f8;color:#24132e;font-size:.61rem;font-weight:900;letter-spacing:.08em;padding:4px 7px;border-radius:4px}.vip-checkout__cta{width:100%;border:0;border-radius:9px;background:#dcb2f4;color:#211129;min-height:54px;padding:13px 18px;margin-top:18px;font-size:1rem;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:space-between}.vip-checkout__cta:disabled{opacity:.5;cursor:not-allowed}.vip-checkout__fineprint{color:#c9c0ce;font-size:.78rem;line-height:1.5;margin:10px 0}.vip-next-step{display:grid;grid-template-columns:32px 1fr;gap:12px;background:#211a27;border:1px solid rgba(212,162,242,.55);padding:16px;border-radius:11px;margin-top:16px}.vip-next-step__icon{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#dcb2f4;color:#24132e;font-weight:900}.vip-next-step h3{font-size:1rem;margin:1px 0 6px}.vip-next-step p{margin:0;color:#ded6e2;font-size:.84rem;line-height:1.55}.vip-next-step__telegram{margin-top:12px;display:inline-flex;gap:9px;color:#fff;font-weight:800;text-decoration:none;border-bottom:1px solid #dcb2f4;padding-bottom:3px}.vip-checkout__faq{border-top:1px solid var(--line);padding:13px 0;color:#f5eff7;font-size:.88rem}.vip-checkout__faq:first-of-type{margin-top:15px}.vip-checkout__faq summary{font-weight:750;cursor:pointer}.vip-checkout__faq p{color:#d1c8d5;line-height:1.55;margin:9px 0 0}.vip-checkout__footer{max-width:1020px;margin:38px auto 0;text-align:center;color:#a99eae;font-size:.75rem}
.vip-checkout__creator{display:flex;align-items:center;gap:15px;margin:0 0 22px}.vip-checkout__avatar-trigger{display:block;flex:none;padding:0;border:0;border-radius:50%;background:transparent;line-height:0;cursor:zoom-in}.vip-checkout__avatar-trigger:focus-visible{outline:3px solid #fff;outline-offset:5px}.vip-checkout__avatar{display:block;width:104px;height:104px;object-fit:cover;object-position:40% center;border:3px solid #d7a7f2;border-radius:50%;box-shadow:0 0 0 5px rgba(215,167,242,.12);transition:transform .18s ease;user-select:none;-webkit-user-drag:none}.vip-checkout__avatar-trigger:hover .vip-checkout__avatar{transform:scale(1.04)}.vip-checkout__creator-copy{display:grid;gap:4px}.vip-checkout__creator-name{margin:0;color:#fff;font-size:1.2rem;font-weight:900;letter-spacing:-.02em}.vip-checkout__creator-label{margin:0;color:#ded3e4;font-size:.9rem}.vip-checkout__choose-cta{display:inline-flex;align-items:center;gap:12px;min-height:48px;margin-top:21px;padding:0 20px;border:0;border-radius:9px;background:#dcb2f4;color:#211129;font-weight:900;text-decoration:none}.vip-checkout__choose-cta:focus-visible{outline:3px solid #fff;outline-offset:3px}.vip-checkout__choose-cta span{font-size:1.2rem;line-height:1}.vip-checkout__trust{max-width:1020px;margin:14px auto 0;display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}.vip-checkout__trust-seal{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:7px 11px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:#19151d;color:#e8e0eb;font-size:.72rem;line-height:1.25}.vip-checkout__trust-seal svg{flex:none;color:#9fe0ad}.vip-checkout__pix-mark{color:#9fe0ad;font-weight:950;letter-spacing:.02em}.vip-avatar-viewer{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:20px;background:rgba(5,3,8,.94);backdrop-filter:blur(8px)}.vip-avatar-viewer__dialog{position:relative;width:min(88vw,82dvh,680px);aspect-ratio:1/1;outline:none}.vip-avatar-viewer__image{display:block;width:100%;height:100%;object-fit:cover;object-position:40% center;border:4px solid #d7a7f2;border-radius:50%;box-shadow:0 20px 90px rgba(0,0,0,.6);user-select:none;-webkit-user-drag:none}.vip-avatar-viewer__close{position:fixed;top:max(16px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));width:46px;height:46px;border:1px solid rgba(255,255,255,.45);border-radius:50%;background:#211c25;color:#fff;font-size:1.8rem;line-height:1;cursor:pointer}.vip-avatar-viewer__close:focus-visible{outline:3px solid #fff;outline-offset:3px}
@media(max-width:760px){.vip-checkout{padding:0 15px 24px}.vip-checkout__top{height:58px}.vip-checkout__secure{font-size:.72rem}.vip-checkout__layout{margin:20px auto 0;grid-template-columns:1fr;gap:22px}.vip-checkout__creator{gap:13px;margin-bottom:18px}.vip-checkout__avatar{width:88px;height:88px}.vip-checkout__creator-name{font-size:1.08rem}.vip-checkout__creator-label{font-size:.84rem}.vip-checkout__offer .vip-checkout__eyebrow{margin-top:17px}.vip-checkout__offer h1{font-size:2.25rem}.vip-checkout__intro{font-size:.96rem;margin-bottom:0}.vip-checkout__benefits{margin-top:17px;gap:10px;font-size:.9rem}.vip-checkout__privacy{margin:15px 0 0}.vip-checkout__plans{padding:20px 15px}.vip-checkout__plans h2{font-size:1.3rem}.vip-plan{gap:10px;padding:13px 10px}.vip-plan__detail{font-size:.74rem}.vip-plan__price{font-size:.9rem}.vip-checkout__footer{margin-top:24px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
.vip-next-step__telegram{margin-top:12px;display:inline-flex;gap:9px;color:#fff;font-weight:800;text-decoration:none;border-bottom:1px solid #dcb2f4;padding:0 0 3px;background:transparent;border-top:0;border-left:0;border-right:0;font:inherit;font-weight:800}.vip-next-step__telegram:disabled{opacity:.72;cursor:not-allowed}
/* Mobile-first safeguards for narrow phones, zoomed text, and safe areas. */
.vip-checkout{box-sizing:border-box;width:100%;max-width:100vw;padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right));overflow-x:clip}
.vip-checkout *, .vip-checkout *::before, .vip-checkout *::after{box-sizing:border-box}
.vip-checkout__top,.vip-checkout__layout,.vip-checkout__offer,.vip-checkout__plans{min-width:0}
.vip-checkout__layout{grid-template-columns:minmax(0,1fr) minmax(0,.98fr)}
.vip-plan{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center}
.vip-plan__body{min-width:0;overflow-wrap:anywhere}
.vip-plan__detail,.vip-checkout__intro,.vip-checkout__fineprint,.vip-next-step p,.vip-checkout__faq p{overflow-wrap:anywhere}
.vip-checkout__cta{min-height:48px;gap:8px}
.vip-checkout__footer{padding-bottom:max(0px,env(safe-area-inset-bottom))}
@media(max-width:760px){
  .vip-checkout{padding-top:env(safe-area-inset-top)}
  .vip-checkout__layout{grid-template-columns:minmax(0,1fr);width:100%;gap:20px}
  .vip-checkout__offer h1{font-size:clamp(1.85rem,8.5vw,2.25rem);overflow-wrap:anywhere}

  .vip-checkout__plans{width:100%;padding:clamp(14px,4.5vw,20px)}
  .vip-plan{min-height:76px;gap:9px;padding:13px 10px}
  .vip-plan__price{font-size:clamp(.82rem,3.7vw,.95rem)}
  .vip-plan__detail{line-height:1.35}
}
@media(max-width:360px){
  .vip-checkout{padding-left:max(10px,env(safe-area-inset-left));padding-right:max(10px,env(safe-area-inset-right))}
  .vip-checkout__top{height:54px}
  .vip-checkout__secure{font-size:.68rem}
  .vip-checkout__offer h1{font-size:1.82rem}

  .vip-checkout__plans{padding:13px 11px}
  .vip-checkout__plans h2{font-size:1.16rem}
  .vip-plan{grid-template-columns:16px minmax(0,1fr) auto;gap:7px;padding:12px 8px}
  .vip-plan__radio{width:16px;height:16px}
  .vip-plan__name{font-size:.9rem}
  .vip-plan__detail{font-size:.7rem}
  .vip-plan__price{font-size:.78rem}
  .vip-checkout__cta{padding:12px;font-size:.9rem}
}




</style>
<style scoped>
.vip-checkout__offer{font-family:'Poppins',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.vip-checkout__reassurance{display:flex;align-items:center;gap:8px;margin:12px 0 0;color:#cfc5d4;font-size:.8rem;line-height:1.4}
.vip-plan--featured{background:#261c2c}
.vip-pix{display:grid;gap:10px;padding:16px;margin:15px 0;background:#110f14;border:1px solid rgba(255,255,255,.2);border-radius:10px}
.vip-pix__qr{width:190px;height:190px;object-fit:contain;justify-self:center;background:white;border-radius:6px}
.vip-pix label{font-size:.85rem;font-weight:800}
.vip-pix textarea{width:100%;box-sizing:border-box;resize:vertical;padding:10px;color:#fff;background:#211c25;border:1px solid rgba(255,255,255,.2);border-radius:6px;font:.75rem/1.4 monospace;overflow-wrap:anywhere}
.vip-pix button{min-height:42px;padding:10px 12px;border:1px solid rgba(255,255,255,.25);border-radius:7px;background:#29222e;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.vip-pix button:disabled,.vip-plan:disabled{opacity:.55;cursor:not-allowed}
.vip-pix p{margin:0;color:#ded6e2;font-size:.83rem;line-height:1.45}
.vip-pix .vip-pix__check{background:#dcb2f4;color:#211129;border:0}
.vip-pix .vip-pix__success{color:#d5f0db}
.vip-pix-tutorial{display:grid;gap:12px;padding:16px;background:#19151d;border:1px solid rgba(220,178,244,.34);border-radius:10px;perspective:900px}
.vip-pix-tutorial h3{max-width:34ch;margin:0;color:#fff;font-size:1.08rem;line-height:1.3}
.vip-pix-tutorial__intro{margin:0;color:#f3eaf7;font-size:.9rem;line-height:1.5}
.vip-pix-tutorial__step{display:grid;grid-template-columns:84px minmax(0,1fr);align-items:center;gap:16px;min-width:0;padding:16px;background:linear-gradient(135deg,#29212f,#1c1820 72%);border:1px solid rgba(255,255,255,.14);border-radius:9px;transform:rotateX(0deg);transform-style:preserve-3d;box-shadow:0 7px 0 rgba(0,0,0,.2);animation:vip-tutorial-enter .28s ease-out both}
.vip-pix-tutorial__visual{display:grid;place-items:center;width:76px;height:76px;color:#f0d8ff;background:#382744;border:1px solid rgba(220,178,244,.44);border-radius:18px;transform:translateZ(14px) rotate(-3deg);box-shadow:5px 6px 0 rgba(0,0,0,.22)}
.vip-pix-tutorial__visual svg{width:42px;height:42px}
.vip-pix-tutorial__step-copy{min-width:0}
.vip-pix-tutorial__count{margin:0 0 5px!important;color:#e6baff!important;font-size:.78rem!important;font-weight:850;letter-spacing:.04em}
.vip-pix-tutorial__step-copy h4{margin:0;color:#fff;font-size:1.05rem;line-height:1.3}
.vip-pix-tutorial__step-copy>p:last-child{margin:6px 0 0;color:#f0eaf2;font-size:.92rem;line-height:1.5;overflow-wrap:anywhere}
.vip-pix-tutorial__controls,.vip-pix-tutorial__answers{display:flex;flex-wrap:wrap;gap:9px}
.vip-pix-tutorial__controls{justify-content:space-between}
.vip-pix-tutorial__answer{display:grid;gap:9px}
.vip-pix-tutorial__answer>p:first-child{margin:0;color:#fff;font-size:.95rem;font-weight:800}
.vip-pix-tutorial__answers>*{flex:1 1 155px}
.vip-pix-tutorial .vip-pix-tutorial__next,.vip-pix-tutorial .vip-pix-tutorial__back{min-height:46px;padding:11px 14px;border:1px solid rgba(255,255,255,.28);border-radius:7px;font:inherit;font-size:.9rem;font-weight:800;line-height:1.25;cursor:pointer}
.vip-pix-tutorial .vip-pix-tutorial__next{color:#211129;background:#e3baff;border-color:#e3baff}
.vip-pix-tutorial .vip-pix-tutorial__back{color:#fff;background:#29222e}
.vip-pix-tutorial button:focus-visible{outline:3px solid #fff;outline-offset:3px}
.vip-pix-tutorial .vip-pix-tutorial__feedback,.vip-pix-tutorial__help{padding:11px;background:#211b26;border-left:3px solid #dcb2f4;border-radius:4px;color:#fff}
.vip-pix-tutorial__help{display:grid;gap:9px}
.vip-pix-tutorial__help p{margin:0;color:#fff;font-size:.9rem;line-height:1.5}
.vip-pix-tutorial__image{display:block;width:100%;height:auto;border-radius:6px}
@keyframes vip-tutorial-enter{from{opacity:0;transform:rotateY(-8deg) translateY(5px)}to{opacity:1;transform:rotateY(0) translateY(0)}}

.vip-payer-form{display:grid;gap:9px;margin-top:16px;padding:14px;background:#110f14;border:1px solid rgba(255,255,255,.16);border-radius:10px}.vip-payer-form>p{margin:0 0 3px;color:#e8dfee;font-size:.84rem;line-height:1.4}.vip-payer-form>label:not(.vip-payer-form__consent){font-size:.8rem;font-weight:750;color:#f5eff7}.vip-payer-form>input{width:100%;min-height:43px;padding:10px 11px;color:#fff;background:#211c25;border:1px solid rgba(255,255,255,.2);border-radius:7px;font:inherit}.vip-payer-form>input:focus{outline:2px solid #dcb2f4;outline-offset:1px}.vip-payer-form__consent{display:flex;gap:9px;align-items:flex-start;margin-top:4px;color:#f3edf5;font-size:.8rem;line-height:1.45}.vip-payer-form__consent input{margin:2px 0 0;accent-color:#dcb2f4;flex:none}.vip-payer-form>small{color:#c9c0ce;font-size:.72rem;line-height:1.4}
.vip-modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.78);overscroll-behavior:contain}
.vip-modal{position:relative;width:min(100%,500px);max-height:min(92dvh,850px);overflow-y:auto;padding:24px;background:#19151d;color:#f8f5fa;border:1px solid rgba(255,255,255,.2);border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.vip-modal__close{position:absolute;top:10px;right:12px;width:40px;height:40px;border:0;border-radius:50%;background:#29222e;color:#fff;font-size:1.6rem;cursor:pointer}
.vip-modal__eyebrow{margin:0 42px 8px 0;color:#e3baff;font-size:.7rem;font-weight:850;letter-spacing:.12em}
.vip-modal h2{margin:0;font-size:1.35rem;line-height:1.25}
.vip-modal__price{margin:8px 0 0;font-size:1.8rem;font-weight:900}
.vip-modal__note{margin:8px 0 0;color:#ded6e2;font-size:.88rem;line-height:1.45}
.vip-modal__error{margin:12px 0 0;color:#ffb6b6;font-size:.85rem;line-height:1.4}
.vip-modal .vip-checkout__cta{margin-top:16px}
@media(max-width:520px){.vip-modal-backdrop{padding:10px;align-items:end}.vip-modal{width:100%;max-height:calc(100dvh - 20px);padding:21px 16px max(18px,env(safe-area-inset-bottom));border-radius:16px 16px 12px 12px}.vip-modal .vip-payer-form{padding:12px}.vip-modal .vip-pix{padding:12px}.vip-modal .vip-pix__qr{width:min(190px,58vw);height:min(190px,58vw)}.vip-pix-tutorial{gap:10px;padding:12px}.vip-pix-tutorial h3{font-size:1rem}.vip-pix-tutorial__intro{font-size:.85rem}.vip-pix-tutorial__step{grid-template-columns:56px minmax(0,1fr);gap:12px;padding:12px}.vip-pix-tutorial__visual{width:52px;height:52px;border-radius:13px}.vip-pix-tutorial__visual svg{width:32px;height:32px}.vip-pix-tutorial__step-copy h4{font-size:.97rem}.vip-pix-tutorial__step-copy>p:last-child{font-size:.86rem}.vip-pix-tutorial__controls>*{flex:1}.vip-pix-tutorial__answers>*{flex-basis:100%}}
@media(prefers-reduced-motion:reduce){.vip-pix-tutorial__step{animation:none}}
@media(max-width:760px){.vip-checkout__trust{justify-content:center}.vip-checkout__trust-seal{flex:1 1 155px;justify-content:center}}
.vip-checkout__layout{grid-template-columns:minmax(0,1fr) 42px minmax(0,.98fr);gap:18px}
.vip-checkout__plans-arrow{display:grid;place-items:center;align-self:center;min-width:0;min-height:58px;animation:vip-arrow-pulse 1.15s ease-in-out infinite alternate}
.vip-checkout__plans-arrow svg{display:block;width:52px;height:52px;overflow:visible;filter:drop-shadow(0 0 7px rgba(111,103,255,.7))}
.vip-checkout__pix-symbol{width:27px;height:27px;flex:none;color:#8decc1}
@keyframes vip-arrow-pulse{from{opacity:.72;filter:drop-shadow(0 0 2px rgba(255,45,149,.5))}to{opacity:1;filter:drop-shadow(0 0 11px rgba(22,217,255,.8))}}
@media(max-width:760px){.vip-checkout__layout{grid-template-columns:minmax(0,1fr);gap:16px}.vip-checkout__plans-arrow{min-height:34px}.vip-checkout__plans-arrow svg{width:42px;height:42px;transform:rotate(90deg)}}
@media(prefers-reduced-motion:reduce){.vip-checkout__plans-arrow{animation:none}}</style>
