<template>
  <main class="vip-checkout">
    <header class="vip-checkout__top">
      <a class="vip-checkout__brand" href="/" :aria-label="checkoutText('back')">WANESSA <span>•</span></a>
      <span class="vip-checkout__secure">{{ checkoutText('header') }}</span>
    </header>
    <section class="vip-checkout__layout">
      <div class="vip-checkout__offer">
        <div class="vip-checkout__creator" :aria-label="checkoutText('header') + ' — Wanessa'">
          <button ref="avatarTrigger" class="vip-checkout__avatar-trigger" type="button" :aria-label="checkoutText('avatarExpand')" aria-haspopup="dialog" :aria-expanded="avatarOpen" @click="openAvatar">
            <img class="vip-checkout__avatar" src="/wanessa-vip-avatar.jpeg" alt="" width="104" height="104" fetchpriority="high" draggable="false" @contextmenu.prevent @dragstart.prevent>
          </button>
          <div class="vip-checkout__creator-copy">
            <p class="vip-checkout__creator-name">Wanessa</p>
            <p class="vip-checkout__creator-label">{{ checkoutText('creatorLabel') }}</p>
          </div>
        </div>
        <h1>{{ checkoutText('headline') }}</h1>
        <section class="vip-checkout__intro" aria-labelledby="vip-offer-title">
          <h2 id="vip-offer-title">{{ checkoutText('receiveTitle') }}</h2>
          <ul class="vip-checkout__intro-list">
            <li><strong>{{ checkoutText('benefit1Title') }}</strong><span> {{ checkoutText('benefit1Body') }}</span></li>
            <li><strong>{{ checkoutText('benefit2Title') }}</strong><span> {{ checkoutText('benefit2Body') }}</span></li>
            <li><strong>{{ checkoutText('benefit3Title') }}</strong><span> {{ checkoutText('benefit3Body') }}</span></li>
          </ul>
        </section>
        <div class="vip-checkout__plans-cta">
          <span class="vip-checkout__rgb-arrow" aria-hidden="true">↓</span>
          <button class="vip-checkout__cta vip-checkout__plans-trigger" type="button" :disabled="paymentLoading || pixPaid || stripePaid" @click="handleOfferCta">
            {{ pixCode ? checkoutText('viewPix') : checkoutText('choosePlans') }} <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </section>
    <div class="vip-checkout__trust" :aria-label="checkoutText('trustLabel')">
      <span v-if="currency === 'BRL'" class="vip-checkout__trust-seal" aria-label="Pix"><img class="vip-checkout__pix-logo" src="/pix-logo.png" alt="Pix" width="377" height="126"></span>
      <span v-if="usesHttps" class="vip-checkout__trust-seal">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none"><path d="M12 3 5 6v5c0 4.7 2.9 8.1 7 10 4.1-1.9 7-5.3 7-10V6l-7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>{{ checkoutText('https') }}</span>
      </span>
    </div>
    <div v-if="avatarOpen" class="vip-avatar-viewer" @click.self="closeAvatar" @keydown.esc.stop="closeAvatar">
      <section class="vip-avatar-viewer__dialog" role="dialog" aria-modal="true" :aria-label="checkoutText('avatarDialog')" tabindex="-1">
        <button ref="avatarCloseButton" class="vip-avatar-viewer__close" type="button" :aria-label="checkoutText('closePhoto')" @click="closeAvatar">&times;</button>
        <img class="vip-avatar-viewer__image" src="/wanessa-vip-avatar.jpeg" :alt="checkoutText('avatarAlt')" width="900" height="900" draggable="false" @contextmenu.prevent @dragstart.prevent>
      </section>
    </div>
    <div v-if="plansDialogOpen" class="vip-modal-backdrop" @click.self="closePlansDialog">
      <section class="vip-modal vip-plan-modal" role="dialog" aria-modal="true" aria-labelledby="plans-title" @keydown.esc="closePlansDialog">
        <button class="vip-modal__close" type="button" :aria-label="checkoutText('planClose')" autofocus @click="closePlansDialog">&times;</button>
        <p class="vip-modal__eyebrow">{{ checkoutText('planEyebrow') }}</p>
        <h2 id="plans-title">{{ checkoutText('planTitle') }}</h2>
        <button v-for="plan in visiblePlans" :key="plan.id" class="vip-plan" :class="{ 'vip-plan--selected': selectedPlan === plan.id, 'vip-plan--featured': plan.id === 'monthly' }" type="button" :aria-pressed="selectedPlan === plan.id" :disabled="!canPay(plan) || pixPaid || stripePaid" @click="selectPlan(plan)">
          <span class="vip-plan__radio" aria-hidden="true"></span>
          <span class="vip-plan__body"><span class="vip-plan__name">{{ planName(plan) }}</span><span class="vip-plan__detail">{{ planDetail(plan) }}</span></span>
          <span class="vip-plan__price">{{ displayPrice(plan) }}</span>
          <span v-if="plan.badge" class="vip-plan__badge">{{ planBadge(plan) }}</span>
        </button>
        <p v-if="paymentError" class="vip-checkout__fineprint" role="status">{{ paymentError }}</p>
        <button class="vip-checkout__cta" type="button" :disabled="!selected || !canPay(selected) || paymentLoading" @click="continueFromPlans">
          {{ pixCode ? checkoutText('continuePlan') : checkoutText('subscribe') }} <span aria-hidden="true">&rarr;</span>
        </button>
      </section>
    </div>
    <div v-if="checkoutDialogOpen" class="vip-modal-backdrop" @click.self="closeCheckoutDialog">
      <section class="vip-modal" role="dialog" aria-modal="true" aria-labelledby="vip-modal-title" @keydown.esc="closeCheckoutDialog">
        <button class="vip-modal__close" type="button" :aria-label="checkoutText('closeDialog')" autofocus @click="closeCheckoutDialog">&times;</button>
        <template v-if="cpfDialogOpen">
          <p class="vip-modal__eyebrow">{{ checkoutText('chosenPlan') }}</p>
          <h2 id="vip-modal-title">{{ checkoutText('cpfTitle') }}</h2>
          <p class="vip-modal__note">{{ checkoutText('cpfHelp') }}</p>
          <form class="vip-payer-form" @submit.prevent="submitCpfForPix">
            <label for="vip-pix-cpf">{{ checkoutText('cpfLabel') }}</label>
            <input id="vip-pix-cpf" :value="cpfInput" type="text" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" :aria-invalid="!!cpfError" :aria-describedby="cpfError ? 'vip-pix-cpf-help vip-pix-cpf-error' : 'vip-pix-cpf-help'" autofocus @input="updateCpfInput">
            <small id="vip-pix-cpf-help">{{ checkoutText('cpfPrivacy') }}</small>
            <p v-if="cpfError" id="vip-pix-cpf-error" class="vip-modal__error" role="alert">{{ cpfError }}</p>
            <button class="vip-checkout__cta" type="submit">{{ checkoutText('cpfSubmit') }} <span aria-hidden="true">&rarr;</span></button>
          </form>
        </template>
        <template v-else-if="!pixCode && !stripePaid">
          <p class="vip-modal__eyebrow">{{ checkoutText('chosenPlan') }}</p>
          <h2 id="vip-modal-title">{{ selected ? planName(selected) : '' }}</h2>
          <p class="vip-modal__price">{{ selected ? displayPrice(selected) : '' }}</p>
          <p v-if="selected?.id === 'monthly' && paymentMethod !== 'card'" class="vip-modal__note">{{ checkoutText('monthlyTerms') }}</p>
          <p v-else-if="selected?.id === 'lifetime' && paymentMethod !== 'card'" class="vip-modal__note">{{ checkoutText('lifetimeTerms') }}</p>
          <p v-else-if="paymentMethod === 'card'" class="vip-modal__note">{{ cardTermsText }}</p>

          <div v-if="!paymentMethod && !paymentLoading && showPixOption && cardAvailableForSelected" class="vip-pay-methods" role="group" :aria-label="checkoutText('chooseMethod')">
            <p class="vip-modal__note">{{ checkoutText('chooseMethod') }}</p>
            <button class="vip-checkout__cta" type="button" :disabled="!selected || !canPay(selected)" @click="choosePix">
              {{ checkoutText('payWithPix') }} <span aria-hidden="true">&rarr;</span>
            </button>
            <button
              class="vip-checkout__cta vip-checkout__cta--secondary"
              type="button"
              :disabled="!selected || !canPay(selected)"
              @click="chooseCard"
            >
              {{ checkoutText('payWithCard') }} <span aria-hidden="true">&rarr;</span>
            </button>
          </div>

          <p v-if="paymentError" class="vip-modal__error" role="alert">{{ paymentError }}</p>
          <p v-if="paymentLoading && paymentMethod === 'pix'" class="vip-modal__note">{{ checkoutText('paymentLoading') }}</p>
          <p v-if="paymentLoading && paymentMethod === 'card' && !stripeMounted" class="vip-modal__note">{{ checkoutText('cardLoading') }}</p>

          <div
            v-show="paymentMethod === 'card'"
            data-integration="stripe-vip"
            class="vip-stripe-mount"
          >
            <div id="vip-stripe-payment-element" class="vip-stripe-element"></div>
            <button
              v-if="stripeMounted && !stripePaid"
              class="vip-checkout__cta"
              type="button"
              :disabled="paymentLoading || stripeConfirming"
              @click="confirmStripePayment"
            >
              {{ stripeConfirming ? checkoutText('cardLoading') : checkoutText('payWithCard') }}
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>

          <button v-if="paymentError && paymentMethod === 'pix'" class="vip-checkout__cta" type="button" :disabled="!selected || !canPay(selected) || paymentLoading" @click="continueToPayment">
            {{ checkoutText('retry') }} <span aria-hidden="true">&rarr;</span>
          </button>
          <button v-if="paymentError && paymentMethod === 'card' && !stripeMounted" class="vip-checkout__cta" type="button" :disabled="!selected || !canPay(selected) || paymentLoading" @click="startStripeVipCheckout">
            {{ checkoutText('retry') }} <span aria-hidden="true">&rarr;</span>
          </button>
        </template>
        <template v-else-if="stripePaid">
          <p class="vip-modal__eyebrow">{{ checkoutText('payment') }}</p>
          <p class="vip-pix__success">{{ checkoutText('cardSuccess') }}</p>
        </template>
        <template v-else>
          <p class="vip-modal__eyebrow">{{ checkoutText('payment') }}</p>
          <h2 id="vip-modal-title">{{ checkoutText('pixFor', { price: selected ? displayPrice(selected) : '' }) }}</h2>
          <p v-if="selected?.id === 'monthly'" class="vip-modal__note">{{ checkoutText('monthlyAuthorize') }}</p>
          <div class="vip-pix" role="region" :aria-label="checkoutText('pixRegion')">
            <img v-if="qrImage" :src="qrImage" :alt="checkoutText('qrAlt')" class="vip-pix__qr">
            <label for="vip-pix-code">{{ checkoutText('pixCopyLabel') }}</label>
            <textarea id="vip-pix-code" :value="pixCode" readonly rows="3"></textarea>
            <button type="button" @click="copyPix">{{ copied ? checkoutText('copied') : checkoutText('copyPix') }}</button>
            <section v-if="selected?.id === 'monthly'" class="vip-pix-tutorial" aria-labelledby="vip-pix-tutorial-title">
              <h3 id="vip-pix-tutorial-title">{{ checkoutText('tutorialTitle') }}</h3>
              <p class="vip-pix-tutorial__intro">{{ checkoutText('tutorialIntro', { price: selected ? displayPrice(selected) : '' }) }}</p>
              <div class="vip-pix-tutorial__step" :key="pixTutorialStep" aria-live="polite">
                <div class="vip-pix-tutorial__visual" aria-hidden="true">
                  <svg v-if="pixTutorialStep === 0" viewBox="0 0 48 48" fill="none"><path d="M8 19 24 9l16 10H8Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M11 21h26M13 21v14m8-14v14m8-14v14m8-14v14M9 38h30" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                  <svg v-else-if="pixTutorialStep === 1" viewBox="0 0 48 48" fill="none"><rect x="11" y="6" width="26" height="36" rx="4" stroke="currentColor" stroke-width="2.5"/><path d="M17 15h14M17 21h14m-14 7h5m-5 6h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                  <svg v-else viewBox="0 0 48 48" fill="none"><path d="M24 5 10 11v10c0 9 5.8 16.5 14 21 8.2-4.5 14-12 14-21V11L24 5Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="m17 24 5 5 10-11" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="vip-pix-tutorial__step-copy">
                  <p class="vip-pix-tutorial__count">{{ checkoutText('stepCount', { current: pixTutorialStep + 1 }) }}</p>
                  <h4>{{ pixTutorialSteps[pixTutorialStep].title }}</h4>
                  <p>{{ pixTutorialSteps[pixTutorialStep].message }}</p>
                </div>
              </div>
              <div v-if="pixTutorialStep < 2" class="vip-pix-tutorial__controls">
                <button v-if="pixTutorialStep > 0" type="button" class="vip-pix-tutorial__back" @click="pixTutorialStep--">{{ checkoutText('backStep') }}</button>
                <button type="button" class="vip-pix-tutorial__next" @click="pixTutorialStep++">{{ checkoutText('nextStep') }}</button>
              </div>
              <div v-else class="vip-pix-tutorial__answer">
                <p>{{ checkoutText('understoodQuestion') }}</p>
                <div class="vip-pix-tutorial__answers">
                  <button type="button" class="vip-pix-tutorial__next" @click="pixTutorialUnderstood = true; pixTutorialNeedsHelp = false">{{ checkoutText('yesUnderstood') }}</button>
                  <button type="button" class="vip-pix-tutorial__back" @click="pixTutorialNeedsHelp = true; pixTutorialUnderstood = false">{{ checkoutText('noUnderstood') }}</button>
                </div>
                <p v-if="pixTutorialUnderstood" class="vip-pix-tutorial__feedback" role="status">{{ checkoutText('tutorialFeedback') }}</p>
                <div v-if="pixTutorialNeedsHelp" class="vip-pix-tutorial__help" role="status">
                  <p>{{ checkoutText('tutorialHelp', { price: selected ? displayPrice(selected) : '' }) }}</p>
                  <button type="button" class="vip-pix-tutorial__back" @click="pixTutorialStep = 0; pixTutorialNeedsHelp = false">{{ checkoutText('seeStepsAgain') }}</button>
                </div>
                <button v-else-if="pixTutorialUnderstood" type="button" class="vip-pix-tutorial__back" @click="pixTutorialStep = 0; pixTutorialUnderstood = false">{{ checkoutText('reviewSteps') }}</button>
              </div>
            </section>
            <p>{{ pixStatus }}</p>
            <button v-if="!pixPaid" type="button" class="vip-pix__check" :disabled="checkingStatus" @click="checkPayment">{{ checkingStatus ? checkoutText('checking') : checkoutText('checkPayment') }}</button>
            <p v-else class="vip-pix__success">{{ checkoutText(selected?.id === 'monthly' ? 'monthlySuccess' : 'lifetimeSuccess') }}</p>
          </div>
        </template>
      </section>
    </div>
  </main>
</template>
<script setup lang="ts">
import QRCode from 'qrcode'
import { VIP_CHECKOUT_COPY, detectVipCheckoutLanguage, type VipCheckoutLanguage } from '~/utils/vip-checkout-i18n'

const checkoutLanguage = ref<VipCheckoutLanguage>('pt')
const checkoutCopy = computed(() => VIP_CHECKOUT_COPY[checkoutLanguage.value])
const htmlLanguage = computed(() => ({ pt: 'pt-BR', en: 'en', es: 'es', it: 'it', nl: 'nl', fr: 'fr' })[checkoutLanguage.value])
function checkoutText(key: string, values: Record<string, string | number> = {}) {
  const template = checkoutCopy.value[key] || VIP_CHECKOUT_COPY.en[key] || key
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? ''))
}
const shareUrl = 'https://wanessabsx.vercel.app/assinaturavip'
const shareImage = 'https://wanessabsx.vercel.app/og-assinatura-vip.jpg'
const shareTitle = computed(() => checkoutText('seoTitle'))
const shareDescription = computed(() => checkoutText('seoDescription'))
const shareImageAlt = computed(() => checkoutText('seoImageAlt'))
const socialLocale = computed(() => ({ pt: 'pt_BR', en: 'en_US', es: 'es_ES', it: 'it_IT', nl: 'nl_NL', fr: 'fr_FR' })[checkoutLanguage.value])

useSeoMeta({
  title: shareTitle,
  description: shareDescription,
  robots: 'index, follow',
  ogTitle: shareTitle,
  ogDescription: shareDescription,
  ogType: 'website',
  ogUrl: shareUrl,
  ogSiteName: 'Wanessa',
  ogLocale: socialLocale,
  ogImage: shareImage,
  ogImageSecureUrl: shareImage,
  ogImageType: 'image/jpeg',
  ogImageWidth: '1200',
  ogImageHeight: '630',
  ogImageAlt: shareImageAlt,
  twitterCard: 'summary_large_image',
  twitterTitle: shareTitle,
  twitterDescription: shareDescription,
  twitterImage: shareImage,
  twitterImageAlt: shareImageAlt,
})

useHead({
  link: [{ rel: 'canonical', href: shareUrl }],
})

type Currency = 'BRL' | 'USD' | 'EUR'
type Prices = Record<Currency, number | null>
type Plan = { id: string; name: string; detail: string; prices: Prices; enabled: boolean; badge?: string; price?: number }
type CheckoutSettings = { plans: Plan[] }
const STORAGE_KEY = 'wanessa-vip-checkout-settings-v1'
const CPF_STORAGE_KEY = 'wanessa-vip-pix-auto-cpf-v1'
const defaultSettings: CheckoutSettings = {
  plans: [
    { id: 'monthly', name: 'Mensal', detail: 'Cobrança automática a cada 30 dias', prices: { BRL: 29.9, USD: 29.9, EUR: 29.9 }, enabled: true, badge: 'OFERTA' },
    { id: 'lifetime', name: 'Vitalício', detail: 'Pagamento único, sem prazo para terminar', prices: { BRL: 109.9, USD: 109.9, EUR: 109.9 }, enabled: true, badge: 'PAGUE UMA VEZ' },
  ],
}
const settings = ref<CheckoutSettings>(defaultSettings)
const selectedPlan = ref('monthly')
const plansDialogOpen = ref(false)
const checkoutDialogOpen = ref(false)
const avatarOpen = ref(false)
const avatarTrigger = ref<HTMLButtonElement | null>(null)
const avatarCloseButton = ref<HTMLButtonElement | null>(null)
const usesHttps = ref(false)
const paymentLoading = ref(false)
const paymentStarted = ref(false)
const paymentError = ref('')
const paymentMethod = ref<'pix' | 'card' | null>(null)
const cpfDialogOpen = ref(false)
const cpfInput = ref('')
const cpfForPix = ref('')
const cpfError = ref('')
const cardAvailability = ref<{ plan: string; currency: string }[]>([])
const stripeMounted = ref(false)
const stripePaid = ref(false)
const stripeCapability = ref('')
const stripeRecurrence = ref('')
const stripeConfirming = ref(false)
let stripeInstance: any = null
let stripeElements: any = null
let stripePaymentElement: any = null
let stripeReturnUrl = ''
type StripePrefetch = {
  plan: string
  currency: string
  client_secret: string
  publishable_key: string
  payment_id: string
  capability_token: string
  recurrence: string
  return_url: string
  fetchedAt: number
}
let stripePrefetchCache: StripePrefetch | null = null
let stripePrefetchInFlight: Promise<StripePrefetch | null> | null = null
const STRIPE_PREFETCH_TTL_MS = 8 * 60 * 1000
const currency = ref<Currency>('BRL')
const locale = ref('pt-BR')
const pixCode = ref('')
const qrImage = ref('')
const paymentId = ref('')
const pixStatus = ref('')
const pixPaid = ref(false)
const checkingStatus = ref(false)
const copied = ref(false)
const pixTutorialSteps = computed(() => [
  { title: checkoutText('step1Title'), message: checkoutText('step1Body') },
  { title: checkoutText('step2Title'), message: checkoutText('step2Body') },
  { title: checkoutText('step3Title'), message: checkoutText('step3Body') },
])
const pixTutorialStep = ref(0)
const pixTutorialUnderstood = ref(false)
const pixTutorialNeedsHelp = ref(false)
const pendingPixExitTracked = ref(false)
const visiblePlans = computed(() => settings.value.plans.filter(plan => plan.enabled))
const selected = computed(() => visiblePlans.value.find(plan => plan.id === selectedPlan.value) || visiblePlans.value[0])
const selectedPrice = computed(() => selected.value ? selected.value.prices?.[currency.value] ?? null : null)
function priceFor(plan: Plan): number | null {
  const value = plan.prices?.[currency.value]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}
function canPay(plan: Plan) {
  if (priceFor(plan) === null) return false
  if (currency.value === 'BRL') return true
  return cardAvailability.value.some((method) => method.plan === plan.id && method.currency === currency.value)
}
function displayPrice(plan: Plan) { const value = priceFor(plan); return value === null ? checkoutText('unavailable') : formatPrice(value) }
function planName(plan: Plan) { return checkoutText(plan.id === 'monthly' ? 'monthlyName' : plan.id === 'lifetime' ? 'lifetimeName' : plan.name) }
function planDetail(plan: Plan) { return checkoutText(plan.id === 'monthly' ? 'monthlyDetail' : plan.id === 'lifetime' ? 'lifetimeDetail' : plan.detail) }
function planBadge(plan: Plan) { return checkoutText(plan.id === 'monthly' ? 'monthlyBadge' : plan.id === 'lifetime' ? 'lifetimeBadge' : plan.badge || '') }
function formatPrice(value: number) { return new Intl.NumberFormat(locale.value, { style: 'currency', currency: currency.value }).format(value) }
function normalizePlan(raw: any, fallback: Plan): Plan {
  // Preços do checkout são fixos e validados no servidor; localStorage não pode alterá-los.
  return { ...fallback, ...raw, prices: { ...fallback.prices } }
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
  if (!canPay(plan) || pixPaid.value || stripePaid.value) return
  // Trocar de plano reinicia checkout incompleto (Pix/cartão pendente)
  if (selectedPlan.value !== plan.id && paymentStarted.value) {
    resetIncompleteCheckout()
  }
  if (selectedPlan.value !== plan.id) {
    stripePrefetchCache = null
  }
  selectedPlan.value = plan.id
  paymentError.value = ''
  trackVip('vip_plan_selected', plan.id)
  void loadStripeJs().catch(() => {})
  void prefetchStripeSession().catch(() => {})
}
function handleOfferCta() {
  void loadStripeJs().catch(() => {})
  void prefetchStripeSession().catch(() => {})
  if (pixPaid.value || stripePaid.value) {
    openCheckoutDialog()
    return
  }
  // Sempre permite reabrir planos (mesmo após tentativa de cartão/Pix)
  if (pixCode.value) {
    openCheckoutDialog()
    return
  }
  plansDialogOpen.value = true
}
function closePlansDialog() { plansDialogOpen.value = false }
function continueFromPlans() {
  if (!selected.value || !canPay(selected.value)) return
  void loadStripeJs().catch(() => {})
  void prefetchStripeSession().catch(() => {})
  plansDialogOpen.value = false
  void startCheckout()
}
function openCheckoutDialog() {
  if (selected.value && canPay(selected.value)) {
    paymentError.value = ''
    checkoutDialogOpen.value = true
    trackVip('vip_subscribe_clicked', selected.value.id)
  }
}
const cardAvailableForSelected = computed(() => {
  if (!selected.value) return false
  const plan = selected.value.id
  return cardAvailability.value.some((m) => m.plan === plan && m.currency === currency.value)
})
/** Pix só para público BR em português (ou BRL sem cartão como fallback). */
const isPortugueseLocale = computed(() => {
  const tags = [
    String(locale.value || ''),
    String(checkoutLanguage.value || ''),
    ...(typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language]) : []),
  ]
  return tags.some((t) => String(t).toLowerCase().startsWith('pt'))
})
const showPixOption = computed(() => {
  if (currency.value !== 'BRL') return false
  if (isPortugueseLocale.value) return true
  // Idioma não-pt: não oferece Pix se cartão estiver disponível
  return !cardAvailableForSelected.value
})
const cardTermsText = computed(() => {
  if (selected.value?.id === 'lifetime') return checkoutText('cardTermsLifetime')
  if (stripeRecurrence.value === 'every_30_days') return checkoutText('cardTermsMonth30')
  return checkoutText('cardTermsMonth')
})

async function refreshCardAvailability() {
  try {
    const res = await $fetch<{ ok?: boolean; card_enabled?: boolean; methods?: { plan: string; currency: string }[] }>('/api/checkout/stripe-vip-availability')
    cardAvailability.value = res?.card_enabled && Array.isArray(res.methods) ? res.methods : []
  } catch {
    cardAvailability.value = []
  }
}

function destroyStripeCheckout() {
  try { stripePaymentElement?.unmount?.() } catch { /* ignore */ }
  stripePaymentElement = null
  stripeElements = null
  stripeInstance = null
  stripeMounted.value = false
  stripeConfirming.value = false
  const el = document.getElementById('vip-stripe-payment-element')
  if (el) el.innerHTML = ''
}

function choosePix() {
  paymentMethod.value = 'pix'
  paymentError.value = ''
  void continueToPayment()
}
function formatCpfInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}
function updateCpfInput(event: Event) {
  cpfInput.value = formatCpfInput((event.target as HTMLInputElement).value)
  cpfError.value = ''
}
function isValidCpfInput(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!/^\d{11}$/.test(digits) || /^([0-9])\1{10}$/.test(digits)) return false
  const digit = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index++) sum += Number(digits[index]) * (length + 1 - index)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(9) === Number(digits[9]) && digit(10) === Number(digits[10])
}
function submitCpfForPix() {
  const digits = cpfInput.value.replace(/\D/g, '')
  if (!isValidCpfInput(digits)) {
    cpfError.value = checkoutText('cpfInvalid')
    return
  }
  cpfForPix.value = digits
  try { localStorage.setItem(CPF_STORAGE_KEY, digits) } catch { /* Keep the CPF in memory for this checkout if storage is unavailable. */ }
  cpfError.value = ''
  cpfDialogOpen.value = false
  void continueToPayment()
}
async function chooseCard() {
  if (!cardAvailableForSelected.value) return
  paymentMethod.value = 'card'
  paymentError.value = ''
  await nextTick()
  await startStripeVipCheckout()
}

/** Abre o modal: se só Pix, gera na hora; se cartão disponível, pede o método. */
async function startCheckout() {
  if (!selected.value || !canPay(selected.value) || paymentLoading.value) return
  if (pixCode.value || stripePaid.value) {
    checkoutDialogOpen.value = true
    return
  }
  paymentMethod.value = null
  destroyStripeCheckout()
  openCheckoutDialog()
  await refreshCardAvailability()

  const canCard = cardAvailableForSelected.value
  const canPix = showPixOption.value

  // Só cartão (USD/EUR ou BRL em idioma não-pt com cartão)
  if (canCard && !canPix) {
    paymentMethod.value = 'card'
    await startStripeVipCheckout()
    return
  }
  // Só Pix
  if (canPix && !canCard) {
    paymentMethod.value = 'pix'
    await continueToPayment()
    return
  }
  // BRL + pt: deixa escolher no modal (Pix e cartão)
  if (canPix && canCard) return

  paymentError.value = checkoutText('cardNotConfigured')
}

let stripeJsPromise: Promise<any> | null = null
async function loadStripeJs(): Promise<any> {
  if (typeof window === 'undefined') return null
  const w = window as any
  if (w.Stripe) return w.Stripe
  if (!stripeJsPromise) {
    stripeJsPromise = new Promise<any>((resolve, reject) => {
      const existing = document.querySelector('script[data-stripe-js]') as HTMLScriptElement | null
      if (existing) {
        if (w.Stripe) return resolve(w.Stripe)
        existing.addEventListener('load', () => resolve(w.Stripe))
        existing.addEventListener('error', () => reject(new Error('stripe_js')))
        return
      }
      const s = document.createElement('script')
      s.src = 'https://js.stripe.com/v3/'
      s.async = true
      s.dataset.stripeJs = '1'
      s.onload = () => resolve((window as any).Stripe)
      s.onerror = () => {
        stripeJsPromise = null
        reject(new Error('stripe_js'))
      }
      document.head.appendChild(s)
    })
  }
  return stripeJsPromise
}

async function prefetchStripeSession(force = false): Promise<StripePrefetch | null> {
  if (!selected.value || !canPay(selected.value)) return null
  if (!cardAvailableForSelected.value) return null
  const plan = selected.value.id
  const cur = currency.value
  const now = Date.now()
  if (
    !force
    && stripePrefetchCache
    && stripePrefetchCache.plan === plan
    && stripePrefetchCache.currency === cur
    && now - stripePrefetchCache.fetchedAt < STRIPE_PREFETCH_TTL_MS
  ) {
    return stripePrefetchCache
  }
  if (stripePrefetchInFlight) return stripePrefetchInFlight
  stripePrefetchInFlight = (async () => {
    try {
      await loadStripeJs()
      const response = await $fetch<any>('/api/checkout/stripe-vip-session', {
        method: 'POST',
        body: {
          plan,
          currency: cur,
          visitor_id: getVipVisitorId(),
          return_origin: window.location.origin,
        },
      })
      if (!response?.ok || !response.client_secret || !response.publishable_key || !response.payment_id) {
        return null
      }
      stripePrefetchCache = {
        plan,
        currency: cur,
        client_secret: response.client_secret,
        publishable_key: response.publishable_key,
        payment_id: response.payment_id,
        capability_token: response.capability_token || '',
        recurrence: response.recurrence || '',
        return_url: response.return_url || `${window.location.origin}/assinaturavip?stripe_vip=1&payment_id=${response.payment_id}`,
        fetchedAt: Date.now(),
      }
      return stripePrefetchCache
    } catch {
      return null
    } finally {
      stripePrefetchInFlight = null
    }
  })()
  return stripePrefetchInFlight
}

async function mountStripePaymentElement(pre: StripePrefetch) {
  const StripeCtor = await loadStripeJs()
  if (!StripeCtor) throw new Error('stripe_js')
  const stripe = StripeCtor(pre.publishable_key)
  const elements = stripe.elements({
    clientSecret: pre.client_secret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#f472b6',
        colorBackground: '#141016',
        colorText: '#f8f4f6',
        colorDanger: '#fb7185',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        borderRadius: '12px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          backgroundColor: '#1c161c',
          border: '1px solid rgba(255,255,255,0.12)',
        },
        '.Input:focus': {
          border: '1px solid #f472b6',
          boxShadow: '0 0 0 1px #f472b6',
        },
        '.Label': { color: 'rgba(248,244,246,0.75)' },
      },
    },
  })
  const paymentElement = elements.create('payment', {
    layout: 'tabs',
    business: { name: 'Privsex' },
  })
  await nextTick()
  await nextTick()
  const mount = document.getElementById('vip-stripe-payment-element')
  if (!mount) throw new Error('mount_missing')
  paymentElement.mount('#vip-stripe-payment-element')
  stripeInstance = stripe
  stripeElements = elements
  stripePaymentElement = paymentElement
  stripeMounted.value = true
  paymentId.value = pre.payment_id
  stripeCapability.value = pre.capability_token
  stripeRecurrence.value = pre.recurrence
  stripeReturnUrl = pre.return_url
  paymentStarted.value = true
  trackVip('vip_card_checkout_mounted', selected.value?.id)
  void pollStripeStatus()
}

async function startStripeVipCheckout() {
  if (!selected.value || !canPay(selected.value) || paymentLoading.value) return
  if (!cardAvailableForSelected.value) {
    paymentError.value = checkoutText('cardNotConfigured')
    return
  }
  paymentMethod.value = 'card'
  paymentError.value = ''
  const ready =
    !!stripePrefetchCache
    && stripePrefetchCache.plan === selected.value.id
    && stripePrefetchCache.currency === currency.value
    && Date.now() - stripePrefetchCache.fetchedAt < STRIPE_PREFETCH_TTL_MS
  if (!ready) paymentLoading.value = true
  try {
    destroyStripeCheckout()
    const pre = ready ? stripePrefetchCache! : await prefetchStripeSession()
    if (!pre) throw new Error('card_session_failed')
    trackVip('vip_card_session_created', selected.value.id)
    await nextTick()
    await mountStripePaymentElement(pre)
    stripePrefetchCache = null
  } catch (error: any) {
    paymentError.value = error?.data?.statusMessage || error?.data?.message || checkoutText('cardError')
    trackVip('vip_card_session_error', selected.value?.id)
    void prefetchStripeSession(true)
  } finally {
    paymentLoading.value = false
  }
}

async function confirmStripePayment() {
  if (!stripeInstance || !stripeElements || stripeConfirming.value || stripePaid.value) return
  stripeConfirming.value = true
  paymentError.value = ''
  try {
    const { error, paymentIntent } = await stripeInstance.confirmPayment({
      elements: stripeElements,
      confirmParams: {
        return_url: stripeReturnUrl || `${window.location.origin}/assinaturavip`,
      },
      redirect: 'if_required',
    })
    if (error) {
      paymentError.value = error.message || checkoutText('cardError')
      trackVip('vip_card_confirm_error', selected.value?.id)
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      stripePaid.value = true
      destroyStripeCheckout()
      trackVip('vip_card_paid', selected.value?.id)
      return
    }
    void pollStripeStatus()
  } catch (e: any) {
    paymentError.value = e?.message || checkoutText('cardError')
  } finally {
    stripeConfirming.value = false
  }
}

async function pollStripeStatus() {
  if (!paymentId.value || !stripeCapability.value) return
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    if (!checkoutDialogOpen.value || paymentMethod.value !== 'card') return
    try {
      const st = await $fetch<any>('/api/checkout/stripe-vip-status', {
        query: { payment_id: paymentId.value, capability: stripeCapability.value },
      })
      if (st?.paid) {
        stripePaid.value = true
        destroyStripeCheckout()
        trackVip('vip_card_paid', selected.value?.id)
        return
      }
      if (st?.status === 'failed') {
        paymentError.value = checkoutText('cardError')
        return
      }
    } catch {
      /* retry */
    }
  }
}
function trackPendingPixExit() {
  if (!pixCode.value || pixPaid.value || pendingPixExitTracked.value) return
  pendingPixExitTracked.value = true
  trackVip('vip_pix_pending_exit', selected.value?.id)
}
function resetIncompleteCheckout() {
  destroyStripeCheckout()
  // Mantém prefetch se for do mesmo plano; invalida se trocar depois
  paymentStarted.value = false
  paymentLoading.value = false
  paymentError.value = ''
  paymentMethod.value = null
  cpfDialogOpen.value = false
  cpfError.value = ''
  stripePaid.value = false
  stripeCapability.value = ''
  stripeRecurrence.value = ''
  stripeConfirming.value = false
  stripeReturnUrl = ''
  pixCode.value = ''
  qrImage.value = ''
  paymentId.value = ''
  pixPaid.value = false
  pixStatus.value = checkoutText('waitingStatus')
  pendingPixExitTracked.value = false
  copied.value = false
}

function closeCheckoutDialog() {
  if (checkoutDialogOpen.value && pixCode.value && !pixPaid.value) trackPendingPixExit()
  if (paymentMethod.value === 'card' && !stripePaid.value) trackVip('vip_card_pending_exit', selected.value?.id)
  // Se ainda não pagou, libera escolha de plano e novo checkout
  if (!pixPaid.value && !stripePaid.value) {
    resetIncompleteCheckout()
  } else {
    destroyStripeCheckout()
  }
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
async function continueToPayment() {
  if (!selected.value || !canPay(selected.value) || paymentLoading.value) return
  paymentMethod.value = 'pix'
  if (selected.value.id === 'monthly' && !cpfForPix.value) {
    cpfDialogOpen.value = true
    return
  }
  paymentLoading.value = true
  paymentError.value = ''
  try {
    if (selected.value.id === 'monthly') {
      const response = await $fetch<any>('/api/checkout/vip-monthly', { method: 'POST', body: {
        visitor_id: getVipVisitorId(),
        accepted_recurring: true,
        document: cpfForPix.value,
      } })
      if (!response?.ok || !response.pix_code || !response.payment_id) throw new Error('payment_failed')
      pixCode.value = response.pix_code
      qrImage.value = await QRCode.toDataURL(response.pix_code, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      paymentId.value = response.payment_id
      pixTutorialStep.value = 0
      pixTutorialUnderstood.value = false
      pixTutorialNeedsHelp.value = false
      pixStatus.value = response.mandate_status === 'ACTIVE' ? checkoutText('authorizedStatus') : checkoutText('authorizeInBank')
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
    if (!response?.ok || !response.pix_code) throw new Error('payment_failed')
    pixCode.value = response.pix_code
    qrImage.value = response.qr_image || ''
    paymentId.value = response.payment_id || response.external_id || ''
    pixStatus.value = checkoutText('waitingStatus')
    pixPaid.value = false
    paymentStarted.value = true
    pendingPixExitTracked.value = false
    trackVip('vip_pix_generated', selected.value.id)
  } catch (error: any) {
    paymentError.value = String(error?.data?.statusMessage || error?.data?.message || error?.statusMessage || checkoutText('paymentError'))
  } finally { paymentLoading.value = false }
}
async function copyPix() {
  trackVip('vip_pix_copy_clicked', selected.value?.id)
  try { await navigator.clipboard.writeText(pixCode.value); copied.value = true; window.setTimeout(() => { copied.value = false }, 1800) }
  catch { paymentError.value = checkoutText('copiedError') }
}
async function checkPayment() {
  if (!paymentId.value || checkingStatus.value) return
  checkingStatus.value = true
  try {
    const result = await $fetch<any>('/api/checkout/status', { query: { id: paymentId.value } })
    if (['approved', 'paid', 'completed'].includes(String(result?.status).toLowerCase())) { pixPaid.value = true; pixStatus.value = checkoutText('statusPaid') }
    else if (String(result?.mandate_status || '').toLowerCase() === 'active') pixStatus.value = checkoutText('statusAuthorized')
    else pixStatus.value = checkoutText('statusAuthorizeAgain')
  } catch { pixStatus.value = checkoutText('statusError') }
  finally { checkingStatus.value = false }
}
onMounted(() => {
  checkoutLanguage.value = detectVipCheckoutLanguage()
  document.documentElement.lang = htmlLanguage.value
  document.documentElement.classList.add('vip-checkout-page')
  document.body.classList.add('vip-checkout-page')
  usesHttps.value = window.location.protocol === 'https:'
  // Pré-aquece Stripe.js + sessão de cartão enquanto o usuário ainda está na página
  try {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'script'
    link.href = 'https://js.stripe.com/v3/'
    document.head.appendChild(link)
  } catch { /* ignore */ }
  void (async () => {
    try {
      await loadStripeJs()
      await refreshCardAvailability()
      if (cardAvailableForSelected.value) {
        await prefetchStripeSession()
      }
    } catch { /* warm best-effort */ }
  })()
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      settings.value = {
        plans: defaultSettings.plans,
      }
    }
  } catch { /* Keep the safe defaults when local settings are invalid. */ }
  try {
    const savedCpf = String(localStorage.getItem(CPF_STORAGE_KEY) || '').replace(/\D/g, '')
    if (isValidCpfInput(savedCpf)) {
      cpfForPix.value = savedCpf
      cpfInput.value = formatCpfInput(savedCpf)
    } else if (savedCpf) {
      localStorage.removeItem(CPF_STORAGE_KEY)
    }
  } catch { /* CPF can still be entered and kept in memory if browser storage is blocked. */ }
  detectCurrency()
  void refreshCardAvailability()
  pixStatus.value = checkoutText('waitingStatus')
  if (selectedPrice.value === null) { const available = visiblePlans.value.find(plan => priceFor(plan) !== null); selectedPlan.value = available?.id || visiblePlans.value[0]?.id || '' }
  trackVip('vip_checkout_view')
  window.addEventListener('pagehide', onPageHide)
})
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', onPageHide)
  document.documentElement.classList.remove('vip-checkout-page')
  document.body.classList.remove('vip-checkout-page')
})
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
.vip-checkout__layout{max-width:520px;grid-template-columns:minmax(0,1fr);margin-top:42px}
.vip-checkout__trust{width:min(100%,520px);max-width:520px;justify-content:center;margin:24px auto 0;padding:16px 0 max(24px,env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.14)}
:global(html.vip-checkout-page),:global(body.vip-checkout-page){background:#100d13}
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
.vip-checkout__layout{max-width:760px;grid-template-columns:minmax(0,1fr);gap:18px}
.vip-checkout__plans-trigger{max-width:520px}
.vip-plan-modal h2{margin-bottom:20px}
.vip-plan-modal .vip-plan{margin-top:14px}
.vip-checkout__pix-logo{display:block;width:86px;height:auto;flex:none}
@media(max-width:760px){.vip-checkout__layout{grid-template-columns:minmax(0,1fr);gap:16px}.vip-checkout__plans-trigger{max-width:none}}
.vip-checkout__intro{max-width:520px;margin:22px 0 0;padding:19px 20px;background:#1c1720;border:1px solid rgba(220,178,244,.52);border-left:4px solid #e3baff;border-radius:12px;color:#fff}
.vip-checkout__intro h2{margin:0 0 13px;color:#fff;font-size:1.05rem;font-weight:900;line-height:1.3}
.vip-checkout__intro-list{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.vip-checkout__intro-list li{display:grid;gap:3px;color:#fff;font-size:.98rem;line-height:1.45}
.vip-checkout__intro-list strong{color:#fff;font-weight:850}
.vip-checkout__intro-list span{color:#f0eaf2}
.vip-checkout__intro-personal{margin:15px 0 0;padding-top:13px;border-top:1px solid rgba(255,255,255,.16);color:#fff;font-size:.94rem;font-weight:600;line-height:1.55}
.vip-checkout__plans-cta{display:grid;justify-items:center;gap:3px;max-width:520px;margin-top:18px}
.vip-checkout__plans-cta .vip-checkout__cta{margin-top:0}
.vip-checkout__rgb-arrow{font-size:30px;font-weight:950;line-height:.9;color:transparent;background:linear-gradient(90deg,#ff3158,#ffdb39,#37f3a4,#26c9ff,#bc52ff,#ff3158);background-size:250% 100%;background-clip:text;-webkit-background-clip:text;filter:drop-shadow(0 0 7px rgba(38,201,255,.7)) drop-shadow(0 0 11px rgba(188,82,255,.45));animation:vip-rgb-arrow 2.4s linear infinite,vip-rgb-point 1.1s ease-in-out infinite}
.vip-checkout__plans-trigger{min-height:58px;border:1px solid rgba(255,255,255,.55);background:linear-gradient(105deg,#f0c8ff 0%,#dba5f5 48%,#c8f3ff 100%);box-shadow:0 0 0 2px rgba(215,167,242,.18),0 0 22px rgba(188,82,255,.38),0 7px 24px rgba(38,201,255,.18);animation:vip-cta-glow 2.8s ease-in-out infinite}
.vip-checkout__plans-trigger:hover{filter:brightness(1.08)}
.vip-checkout__plans-trigger:active{transform:translateY(1px);filter:brightness(.98)}
@keyframes vip-rgb-arrow{to{background-position:250% 0}}
@keyframes vip-rgb-point{50%{transform:translateY(4px)}}
@keyframes vip-cta-glow{50%{box-shadow:0 0 0 3px rgba(215,167,242,.26),0 0 30px rgba(188,82,255,.56),0 8px 28px rgba(38,201,255,.28)}}
@media(prefers-reduced-motion:reduce){.vip-checkout__rgb-arrow,.vip-checkout__plans-trigger{animation:none}}
@media(max-width:760px){.vip-checkout__intro{max-width:none;margin-top:18px;padding:16px 15px}.vip-checkout__intro h2{font-size:1rem}.vip-checkout__intro-list li{font-size:.95rem}.vip-checkout__intro-personal{font-size:.92rem}}
</style>
