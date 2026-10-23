<template>
  <main class="vip-checkout">
    <header class="vip-checkout__top">
      <a class="vip-checkout__brand" href="/" aria-label="Voltar para a página">WANESSA <span>•</span></a>
      <div class="vip-checkout__channel" aria-label="Canal VIP no Telegram">
        <svg class="vip-checkout__channel-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.7 3.4 18.6 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.8l-4.9-1.5c-1.1-.3-1.1-1.1.2-1.6L20.5 3c.9-.3 1.7.2 1.2.4Z" />
        </svg>
        <span>Canal VIP no Telegram</span>
      </div>
    </header>
    <section class="vip-checkout__layout">
      <div class="vip-checkout__offer">
        <figure class="vip-checkout__image"><img class="vip-checkout__image-photo" :src="imageSrc" alt="Oferta do Canal VIP"></figure>
        <p class="vip-checkout__intro">Minhas fotos e vídeos mais provocantes ficam no VIP. Também tem chat exclusivo comigo e acesso ao meu WhatsApp pessoal.</p>
        <ul class="vip-checkout__benefits">
          <li><span aria-hidden="true">✓</span> Fotos e vídeos exclusivos no canal VIP do Telegram</li>
          <li><span aria-hidden="true">✓</span> Chat exclusivo comigo</li>
          <li><span aria-hidden="true">✓</span> Acesso ao meu WhatsApp pessoal</li>
</ul>
      </div>
      <section class="vip-checkout__plans" aria-labelledby="plans-title">
        <p class="vip-checkout__eyebrow">ESCOLHA SEU ACESSO</p>
        <h2 id="plans-title">Como voc&ecirc; prefere entrar?</h2>
        <p v-if="selectedRecurring && selectedRecurringAvailable && pricesReady" class="vip-checkout__subscription-note">{{ selected?.name }}: {{ formatPrice(selectedPrice ?? 0) }} pelo Pix Automático a cada {{ selectedPeriodLabel }}. Cancele quando quiser.</p>
        <p v-if="pricingError" class="vip-checkout__price-error" role="alert">{{ pricingError }}</p>
        <button v-for="plan in visiblePlans" :key="plan.id" class="vip-plan" :class="{ 'vip-plan--selected': selectedPlan === plan.id, 'vip-plan--featured': plan.id === 'lifetime' }" type="button" :aria-pressed="selectedPlan === plan.id" :disabled="!canPay(plan)" @click="selectPlan(plan)">
          <span class="vip-plan__radio" aria-hidden="true"></span>
          <span class="vip-plan__body"><span class="vip-plan__name">{{ plan.name }}</span><span class="vip-plan__detail">{{ isRecurring(plan) && !recurringPlanAvailable(plan) ? (checkingPlanAvailability ? 'Verificando disponibilidade…' : 'Assinatura em breve') : plan.detail }}</span></span>
          <span class="vip-plan__price">{{ displayPrice(plan) }}</span>
          <span v-if="plan.badge" class="vip-plan__badge">{{ plan.badge }}</span>
          <span v-else-if="isRecurring(plan) && !recurringPlanAvailable(plan) && !checkingPlanAvailability" class="vip-plan__badge">EM BREVE</span>
        </button>
        <p class="vip-checkout__payment-note">Você confere e autoriza o pagamento no app do seu banco.</p>
        <button class="vip-checkout__cta" type="button" :disabled="!selected || !canPay(selected) || paymentLoading" @click="handleCheckoutClick">
          {{ paymentLoading ? 'Gerando Pix?' : paymentStarted && selected?.id === paymentPlanKey && !pixExpired ? 'Ver meu Pix' : buttonLabel }} <span aria-hidden="true">&rarr;</span>
        </button>
        <p class="vip-checkout__fineprint" role="status">{{ paymentError || (paymentStarted ? (selectedRecurring ? `Abra o app do seu banco e autorize o Pix Automático. A cobrança se repete a cada ${selectedPeriodLabel}.` : 'Pix criado pela SyncPay. A confirmação pode levar alguns instantes.') : currency === 'BRL' ? 'A entrada no canal só será liberada após a confirmação do pagamento.' : 'O pagamento nessa moeda ainda não está habilitado.') }}</p>
        <details class="vip-checkout__faq"><summary>Como recebo o acesso?</summary><p>Depois da confirmação do pagamento, o bot do Telegram vai identificar sua conta e liberar a entrada. A conexão do bot VIP será configurada antes do lançamento.</p></details>
        <details class="vip-checkout__faq"><summary>Como funcionam os planos?</summary><p>O mensal cobra {{ formatPrice(monthlyPrice) }} a cada 30 dias. O plano de 6 meses cobra {{ formatPrice(sixMonthPrice) }} a cada 180 dias. Os dois usam Pix Automático e podem ser cancelados pelo banco. O vitalício custa {{ formatPrice(lifetimePrice) }} e não tem cobranças recorrentes.</p></details>
      </section>
    </section>
    <div v-if="payerModalOpen" class="vip-payer-modal-backdrop" @click.self="closePayerModal" @keydown.esc.stop.prevent="closePayerModal">
      <section class="vip-payer-modal" role="dialog" aria-modal="true" aria-labelledby="vip-payer-modal-title" aria-describedby="vip-payer-modal-description" tabindex="-1">
        <header class="vip-payer-modal__header">
          <div>
            <h2 id="vip-payer-modal-title">Confirmar Pix Automático</h2>
            <p id="vip-payer-modal-description">Informe seus dados para autorizar {{ selected?.name?.toLowerCase() }} por {{ selectedPrice === null ? '' : formatPrice(selectedPrice) }} a cada {{ selectedPeriodLabel }}.</p>
          </div>
          <button type="button" class="vip-payer-modal__close" aria-label="Fechar" :disabled="paymentLoading" @click="closePayerModal">&times;</button>
        </header>
        <form class="vip-payer-form vip-payer-modal__form" @submit.prevent="continueToPayment">
          <label for="vip-payer-name">Nome completo</label>
          <input id="vip-payer-name" v-model="payerName" autocomplete="name" maxlength="100" required autofocus>
          <label for="vip-payer-email">Seu e-mail</label>
          <input id="vip-payer-email" v-model="payerEmail" type="email" autocomplete="email" maxlength="254" required>
          <label for="vip-payer-cpf">CPF</label>
          <input id="vip-payer-cpf" :value="payerCpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" required @input="setPayerCpf">
          <label class="vip-payer-form__consent"><input v-model="recurringConsent" type="checkbox"><span>Autorizo a cobrança pelo Pix Automático a cada {{ selectedPeriodLabel }}. Posso cancelar pelo app do meu banco.</span></label>
          <p v-if="paymentError" class="vip-payer-modal__error" role="alert">{{ paymentError }}</p>
          <div class="vip-payer-modal__actions">
            <button type="button" class="vip-payer-modal__cancel" :disabled="paymentLoading" @click="closePayerModal">Voltar</button>
            <button type="submit" class="vip-checkout__cta" :disabled="!monthlyFormReady || paymentLoading">{{ paymentLoading ? 'Gerando Pix…' : 'Gerar chave Pix' }}</button>
          </div>
        </form>
      </section>
    </div>
    <div v-if="pixModalOpen" class="vip-payer-modal-backdrop" @click.self="closePixModal" @keydown.esc.stop.prevent="closePixModal">
      <section class="vip-payer-modal vip-pix-modal" role="dialog" aria-modal="true" aria-labelledby="vip-pix-modal-title" tabindex="-1">
        <header class="vip-payer-modal__header">
          <div>
            <h2 id="vip-pix-modal-title">{{ pixPaid ? 'Pagamento confirmado' : pixExpired ? 'Este Pix expirou' : 'Pague pelo Pix' }}</h2>
            <p>{{ paymentPlanName }}<template v-if="paymentAmount !== null"> · {{ formatPrice(paymentAmount) }}</template></p>
          </div>
          <button type="button" class="vip-payer-modal__close" aria-label="Fechar" @click="closePixModal">&times;</button>
        </header>
        <div class="vip-pix" role="region" aria-label="Pagamento Pix">
          <p v-if="pixExpired && !pixPaid" class="vip-pix__expired">O código anterior não vale mais. Feche esta janela e gere um novo Pix.</p>
          <template v-else>
            <img v-if="qrImage" :src="qrImage" alt="QR Code Pix para pagamento" class="vip-pix__qr">
            <p v-if="paymentRecurring" class="vip-pix__recurring-note">Este Pix autoriza {{ paymentPlanName.toLowerCase() }} com cobrança automática a cada {{ paymentPeriodLabel }}. Você pode cancelar quando quiser.</p>
            <label for="vip-pix-code">Pix copia e cola</label>
            <textarea id="vip-pix-code" :value="pixCode" readonly rows="3"></textarea>
            <button type="button" :disabled="pixPaid" @click="copyPix">{{ copied ? 'Código copiado' : 'Copiar Pix' }}</button>
            <p v-if="pixExpiresAt && !pixPaid" class="vip-pix__expiry">Expira em {{ expiryCountdown }}</p>
          </template>
          <p>{{ pixStatus }}</p>
          <button v-if="!pixPaid && !pixExpired" type="button" class="vip-pix__check" :disabled="checkingStatus" @click="checkPayment">{{ checkingStatus ? 'Consultando…' : 'Já paguei · consultar' }}</button>
          <p v-else-if="pixPaid" class="vip-pix__success">{{ paymentRecurring ? 'Autorização confirmada. A liberação do canal depende da configuração do bot VIP.' : 'Pagamento confirmado. A liberação do canal depende da configuração do bot VIP.' }}</p>
        </div>
      </section>
    </div>
    <footer class="vip-checkout__footer">Privacidade respeitada &middot; Acesso digital pelo Telegram</footer>
  </main>
</template>
<script setup lang="ts">
import QRCode from 'qrcode'

type Currency = 'BRL' | 'USD' | 'EUR'
type Prices = Record<Currency, number | null>
type Plan = { id: string; name: string; detail: string; prices: Prices; enabled: boolean; badge?: string; price?: number }
type CheckoutSettings = { imageUrl: string; plans: Plan[] }
const STORAGE_KEY = 'wanessa-vip-checkout-settings-v1'
const defaultSettings: CheckoutSettings = {
  imageUrl: '/vip-offer.jpg',
  plans: [
    { id: 'monthly', name: 'Mensal', detail: '30 dias de acesso ao canal VIP', prices: { BRL: 29.9, USD: null, EUR: null }, enabled: true },
    { id: 'six_months', name: '6 meses', detail: 'Cobrança automática a cada 180 dias', prices: { BRL: 59.9, USD: null, EUR: null }, enabled: true },
    { id: 'lifetime', name: 'Vitalício', detail: 'Acesso sem prazo para terminar', prices: { BRL: 109.9, USD: null, EUR: null }, enabled: true, badge: 'PAGUE UMA VEZ' },
  ],
}
const settings = ref<CheckoutSettings>(defaultSettings)
const selectedPlan = ref('monthly')
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
const pixModalOpen = ref(false)
const pixExpiresAt = ref('')
const pixExpired = ref(false)
const expiryCountdown = ref('')
const paymentPlanName = ref('Canal VIP')
const paymentPlanKey = ref('')
const paymentAmount = ref<number | null>(null)
const paymentRecurring = ref(false)
const paymentPeriodLabel = ref('')
const checkingStatus = ref(false)
const copied = ref(false)
const payerName = ref('')
const payerEmail = ref('')
const payerCpf = ref('')
const recurringConsent = ref(false)
const payerModalOpen = ref(false)
let expiryTimer: number | undefined
const monthlyPlanAvailable = ref(false)
const sixMonthPlanAvailable = ref(false)
const checkingMonthlyPlan = ref(true)
const checkingSixMonthPlan = ref(true)
const pricesReady = ref(false)
const pricingError = ref('')
const monthlyFormReady = computed(() => payerName.value.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail.value.trim()) && payerCpf.value.replace(/\D/g, '').length === 11 && recurringConsent.value)
const visiblePlans = computed(() => settings.value.plans.filter(plan => plan.enabled))
const selected = computed(() => visiblePlans.value.find(plan => plan.id === selectedPlan.value) || visiblePlans.value[0])
const selectedPrice = computed(() => selected.value ? selected.value.prices?.[currency.value] ?? null : null)
const monthlyPrice = computed(() => settings.value.plans.find(plan => plan.id === 'monthly')?.prices?.BRL ?? null)
const sixMonthPrice = computed(() => settings.value.plans.find(plan => plan.id === 'six_months')?.prices?.BRL ?? null)
const lifetimePrice = computed(() => settings.value.plans.find(plan => plan.id === 'lifetime')?.prices?.BRL ?? null)
const selectedRecurring = computed(() => !!selected.value && isRecurring(selected.value))
const selectedPeriodDays = computed(() => selected.value?.id === 'six_months' ? 180 : 30)
const selectedPeriodLabel = computed(() => selectedPeriodDays.value === 180 ? '6 meses' : '30 dias')
const selectedRecurringAvailable = computed(() => !!selected.value && recurringPlanAvailable(selected.value))
const checkingPlanAvailability = computed(() => selected.value?.id === 'six_months' ? checkingSixMonthPlan.value : checkingMonthlyPlan.value)
const buttonLabel = computed(() => currency.value !== 'BRL' ? `Pagamento em ${currency.value} indisponível` : selectedPrice.value === null ? `Preço em ${currency.value} não cadastrado` : selectedRecurring.value ? `Assinar ${selected.value?.name?.toLowerCase()} · ${formatPrice(selectedPrice.value)}` : `Pagar uma vez · ${formatPrice(selectedPrice.value)}`)
const imageSrc = computed(() => {
  const raw = settings.value.imageUrl.trim()
  if (!raw) return '/vip-offer.jpg'
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  try { const parsed = new URL(raw); return parsed.protocol === 'https:' ? parsed.href : '/vip-offer.jpg' } catch { return '/vip-offer.jpg' }
})
function priceFor(plan: Plan): number | null {
  const value = plan.prices?.[currency.value]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}
function isRecurring(plan: Plan) { return plan.id === 'monthly' || plan.id === 'six_months' }
function recurringPlanAvailable(plan: Plan) { return plan.id === 'six_months' ? sixMonthPlanAvailable.value : plan.id === 'monthly' ? monthlyPlanAvailable.value : true }
function canPay(plan: Plan) { return pricesReady.value && currency.value === 'BRL' && priceFor(plan) !== null && (!isRecurring(plan) || recurringPlanAvailable(plan)) }
function displayPrice(plan: Plan) {
  if (!pricesReady.value) return checkingPlanAvailability.value ? 'Carregando…' : 'Indisponível'
  if (isRecurring(plan) && (plan.id === 'six_months' ? checkingSixMonthPlan.value : checkingMonthlyPlan.value)) return 'Verificando…'
  if (isRecurring(plan) && !recurringPlanAvailable(plan)) return 'Em breve'
  const value = priceFor(plan)
  return value === null ? 'Indisponível' : formatPrice(value)
}
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
function selectPlan(plan: Plan) { if (canPay(plan)) selectedPlan.value = plan.id }
function handleCheckoutClick() {
  if (!selected.value || !canPay(selected.value) || paymentLoading.value) return
  if (paymentStarted.value && selected.value.id === paymentPlanKey.value && pixCode.value && !pixExpired.value) { pixModalOpen.value = true; return }
  paymentError.value = ''
  if (selectedRecurring.value) { payerModalOpen.value = true; return }
  void continueToPayment()
}
function closePayerModal() { if (!paymentLoading.value) payerModalOpen.value = false }
function closePixModal() { pixModalOpen.value = false }
function formatExpiryCountdown() {
  if (pixPaid.value) return
  if (!pixExpiresAt.value) { expiryCountdown.value = ''; return }
  const remaining = new Date(pixExpiresAt.value).getTime() - Date.now()
  if (remaining <= 0) {
    pixExpired.value = true
    expiryCountdown.value = 'expirado'
    pixStatus.value = 'Este código Pix expirou. Gere um novo para continuar.'
    return
  }
  const totalSeconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  expiryCountdown.value = `${minutes}:${String(seconds).padStart(2, '0')}`
}
function getVipVisitorId() {
  const key = 'vip-checkout-visitor-id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}
function setPayerCpf(event: Event) {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 11)
  payerCpf.value = digits.length > 9 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` : digits.length > 6 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}` : digits.length > 3 ? `${digits.slice(0, 3)}.${digits.slice(3)}` : digits
}
async function continueToPayment() {
  if (!selected.value || !canPay(selected.value) || paymentLoading.value) return
  if (selectedRecurring.value && !monthlyFormReady.value) return
  paymentLoading.value = true
  paymentError.value = ''
  if (pixExpired.value) {
    pixCode.value = ''
    qrImage.value = ''
    paymentId.value = ''
    pixPaid.value = false
    paymentStarted.value = false
    pixExpired.value = false
    pixExpiresAt.value = ''
  }
  try {
    if (selectedRecurring.value) {
      const response = await $fetch<any>('/api/checkout/vip-monthly', { method: 'POST', body: {
        plan_key: selected.value.id,
        name: payerName.value.trim(),
        email: payerEmail.value.trim(),
        document: payerCpf.value.replace(/\D/g, ''),
        visitor_id: getVipVisitorId(),
        accepted_recurring: recurringConsent.value,
      } })
      if (!response?.ok || !response.pix_code || !response.payment_id) throw new Error('A SyncPay não retornou os dados da autorização.')
      pixCode.value = response.pix_code
      qrImage.value = await QRCode.toDataURL(response.pix_code, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      paymentId.value = response.payment_id
      paymentPlanKey.value = selected.value.id
      paymentPlanName.value = selected.value.name
      paymentAmount.value = Number(response.amount)
      paymentRecurring.value = true
      paymentPeriodLabel.value = selectedPeriodLabel.value
      pixExpiresAt.value = String(response.expires_at || '')
      pixExpired.value = false
      formatExpiryCountdown()
      pixPaid.value = ['approved', 'paid', 'completed'].includes(String(response.status || '').toLowerCase())
      pixStatus.value = pixPaid.value ? 'Pagamento confirmado.' : response.mandate_status === 'ACTIVE' ? 'Autorização recebida; aguardando confirmação da assinatura.' : `Abra o app do seu banco e autorize o Pix Automático a cada ${selectedPeriodLabel.value}.`
      paymentStarted.value = true
      payerModalOpen.value = false
      pixModalOpen.value = true
      return
    }

    const response = await $fetch<any>('/api/checkout/pix', { method: 'POST', body: {
      plan_key: 'vip_lifetime',
      source: 'assinaturavip', visitor_id: getVipVisitorId(),
    } })
    if (!response?.ok || !response.pix_code) throw new Error('A SyncPay não retornou o código Pix.')
    pixCode.value = response.pix_code
    qrImage.value = response.qr_image || ''
    paymentId.value = response.payment_id || response.external_id || ''
    paymentPlanKey.value = 'lifetime'
    paymentPlanName.value = 'Canal VIP vitalício'
    paymentAmount.value = Number(response.amount)
    paymentRecurring.value = false
    paymentPeriodLabel.value = ''
    pixExpiresAt.value = String(response.expires_at || '')
    pixExpired.value = false
    formatExpiryCountdown()
    pixPaid.value = ['approved', 'paid', 'completed'].includes(String(response.status || '').toLowerCase())
    pixStatus.value = pixPaid.value ? 'Pagamento confirmado.' : 'Aguardando pagamento.'
    paymentStarted.value = true
    pixModalOpen.value = true
  } catch (error: any) {
    paymentError.value = error?.data?.statusMessage || error?.data?.message || error?.message || 'Não foi possível gerar o Pix. Tente novamente.'
  } finally { paymentLoading.value = false }
}
async function copyPix() {
  try { await navigator.clipboard.writeText(pixCode.value); copied.value = true; window.setTimeout(() => { copied.value = false }, 1800) }
  catch { paymentError.value = 'Não consegui copiar automaticamente. Selecione e copie o código Pix.' }
}
async function checkPayment() {
  if (!paymentId.value || checkingStatus.value) return
  checkingStatus.value = true
  try {
    const result = await $fetch<any>('/api/checkout/status', { query: { id: paymentId.value } })
    if (['approved', 'paid', 'completed'].includes(String(result?.status).toLowerCase())) { pixPaid.value = true; pixExpired.value = false; pixStatus.value = 'Pagamento confirmado.' }
    else if (['expired', 'failed', 'cancelled', 'canceled'].includes(String(result?.status).toLowerCase())) { pixExpired.value = true; pixStatus.value = 'Este Pix expirou ou foi cancelado. Gere um novo para continuar.' }
    else if (String(result?.mandate_status || '').toLowerCase() === 'active') pixStatus.value = 'Autorização confirmada. Aguardando a primeira cobrança.'
    else pixStatus.value = 'Abra o app do seu banco e autorize o Pix Automático. Depois, consulte novamente.'
  } catch { pixStatus.value = 'Não consegui consultar agora. Tente novamente em instantes.' }
  finally { checkingStatus.value = false }
}
onMounted(async () => {
  expiryTimer = window.setInterval(formatExpiryCountdown, 1000)
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      settings.value = {
        imageUrl: typeof parsed.imageUrl === 'string' && parsed.imageUrl.trim() ? parsed.imageUrl : defaultSettings.imageUrl,
        plans: defaultSettings.plans,
      }
    }
  } catch { /* Keep the safe defaults when local settings are invalid. */ }
  detectCurrency()
  const [priceResult, monthlyResult, sixMonthResult] = await Promise.allSettled([
    $fetch<{ ok?: boolean; monthly?: { amount?: number }; six_months?: { amount?: number }; lifetime?: { amount?: number } }>('/api/checkout/vip-prices'),
    $fetch<{ ok?: boolean }>('/api/checkout/vip-monthly', { query: { plan_key: 'monthly' } }),
    $fetch<{ ok?: boolean }>('/api/checkout/vip-monthly', { query: { plan_key: 'six_months' } }),
  ])
  if (priceResult.status === 'fulfilled' && priceResult.value?.ok === true) {
    const monthly = Number(priceResult.value.monthly?.amount)
    const sixMonths = Number(priceResult.value.six_months?.amount)
    const lifetime = Number(priceResult.value.lifetime?.amount)
    if (Number.isFinite(monthly) && monthly > 0 && Number.isFinite(sixMonths) && sixMonths > 0 && Number.isFinite(lifetime) && lifetime > 0) {
      settings.value = {
        ...settings.value,
        plans: settings.value.plans.map(plan => ({
          ...plan,
          prices: {
            ...plan.prices,
            BRL: plan.id === 'monthly' ? monthly : plan.id === 'six_months' ? sixMonths : lifetime,
          },
        })),
      }
      pricesReady.value = true
    }
  }
  if (!pricesReady.value) pricingError.value = 'Não consegui carregar os preços agora. Atualize a página e tente novamente.'
  monthlyPlanAvailable.value = monthlyResult.status === 'fulfilled' && monthlyResult.value?.ok === true
  sixMonthPlanAvailable.value = sixMonthResult.status === 'fulfilled' && sixMonthResult.value?.ok === true
  checkingMonthlyPlan.value = false
  checkingSixMonthPlan.value = false
  if (!selected.value || !canPay(selected.value)) {
    selectedPlan.value = visiblePlans.value.find(canPay)?.id || ''
  }
})
onBeforeUnmount(() => { if (expiryTimer !== undefined) window.clearInterval(expiryTimer) })
</script>
<style scoped>
.vip-checkout{--ink:#f8f5fa;--muted:#c5bdca;--line:rgba(255,255,255,.14);min-height:100vh;background:#100d13;color:var(--ink);font-family:inherit;padding:0 22px 28px}.vip-checkout__top{max-width:1120px;margin:auto;height:68px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.vip-checkout__brand{color:#fff;text-decoration:none;font-weight:900;letter-spacing:.12em}.vip-checkout__brand span{color:#cf9cf5}.vip-checkout__secure{font-size:.82rem;color:#d7d0dc}.vip-checkout__layout{max-width:1020px;margin:42px auto 0;display:grid;grid-template-columns:minmax(0,1.02fr) minmax(360px,.98fr);gap:58px;align-items:start}.vip-checkout__image{height:290px;border-radius:18px;background:linear-gradient(145deg,#392741,#17131b 68%);background-size:cover;background-position:center;position:relative;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.13);overflow:hidden}.vip-checkout__image-hint{color:#ddd2e3;font-size:.92rem}.vip-checkout__image-label{position:absolute;left:18px;bottom:16px;padding:7px 10px;border:1px solid rgba(255,255,255,.3);border-radius:5px;background:rgba(12,9,14,.6);font-size:.68rem;font-weight:800;letter-spacing:.12em}.vip-checkout__eyebrow{margin:25px 0 8px;color:#e3baff;font-size:.72rem;font-weight:800;letter-spacing:.14em}.vip-checkout__offer h1{max-width:540px;margin:0;font-size:clamp(2rem,4vw,3.25rem);line-height:1.02;letter-spacing:-.04em}.vip-checkout__intro{max-width:470px;color:var(--muted);font-size:1.04rem;line-height:1.6}.vip-checkout__benefits{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:13px;color:#eee8f1}.vip-checkout__benefits li{display:flex;gap:11px;align-items:flex-start;line-height:1.4}.vip-checkout__benefits li span{color:#d8a9f6;font-weight:900}.vip-checkout__privacy{margin-top:25px;color:#e4d1ef;font-size:.88rem}.vip-checkout__plans{padding:26px;background:#19151d;border:1px solid var(--line);border-radius:18px;box-shadow:0 16px 50px rgba(0,0,0,.22)}.vip-checkout__plans .vip-checkout__eyebrow{margin:0 0 9px}.vip-checkout__plans h2{font-size:1.5rem;margin:0 0 20px;letter-spacing:-.025em}.vip-plan{width:100%;min-height:85px;text-align:left;position:relative;display:flex;align-items:center;gap:13px;padding:15px 14px;margin-top:12px;color:var(--ink);background:#211c25;border:1px solid rgba(255,255,255,.16);border-radius:12px;cursor:pointer}.vip-plan--selected{border-color:#d4a2f2;box-shadow:0 0 0 1px #d4a2f2 inset}.vip-plan__radio{width:18px;height:18px;border-radius:50%;border:1px solid #bcb3c0;flex:none}.vip-plan--selected .vip-plan__radio{border:5px solid #d6a5f1;background:#fff}.vip-plan__body{display:grid;gap:5px;flex:1}.vip-plan__name{font-weight:800;font-size:1rem}.vip-plan__detail{font-size:.8rem;color:#d0c7d4}.vip-plan__price{font-weight:850;white-space:nowrap}.vip-plan__badge{position:absolute;top:-9px;right:12px;background:#e0b9f8;color:#24132e;font-size:.61rem;font-weight:900;letter-spacing:.08em;padding:4px 7px;border-radius:4px}.vip-checkout__cta{width:100%;border:0;border-radius:9px;background:#dcb2f4;color:#211129;min-height:54px;padding:13px 18px;margin-top:18px;font-size:1rem;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:space-between}.vip-checkout__cta:disabled{opacity:.5;cursor:not-allowed}.vip-checkout__fineprint{color:#c9c0ce;font-size:.78rem;line-height:1.5;margin:10px 0}.vip-next-step{display:grid;grid-template-columns:32px 1fr;gap:12px;background:#211a27;border:1px solid rgba(212,162,242,.55);padding:16px;border-radius:11px;margin-top:16px}.vip-next-step__icon{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#dcb2f4;color:#24132e;font-weight:900}.vip-next-step h3{font-size:1rem;margin:1px 0 6px}.vip-next-step p{margin:0;color:#ded6e2;font-size:.84rem;line-height:1.55}.vip-next-step__telegram{margin-top:12px;display:inline-flex;gap:9px;color:#fff;font-weight:800;text-decoration:none;border-bottom:1px solid #dcb2f4;padding-bottom:3px}.vip-checkout__faq{border-top:1px solid var(--line);padding:13px 0;color:#f5eff7;font-size:.88rem}.vip-checkout__faq:first-of-type{margin-top:15px}.vip-checkout__faq summary{font-weight:750;cursor:pointer}.vip-checkout__faq p{color:#d1c8d5;line-height:1.55;margin:9px 0 0}.vip-checkout__footer{max-width:1020px;margin:38px auto 0;text-align:center;color:#a99eae;font-size:.75rem}
@media(max-width:760px){.vip-checkout{padding:0 15px 24px}.vip-checkout__top{height:58px}.vip-checkout__secure{font-size:.72rem}.vip-checkout__layout{margin:20px auto 0;grid-template-columns:1fr;gap:22px}.vip-checkout__image{height:220px;border-radius:14px}.vip-checkout__offer .vip-checkout__eyebrow{margin-top:17px}.vip-checkout__offer h1{font-size:2.25rem}.vip-checkout__intro{font-size:.96rem;margin-bottom:0}.vip-checkout__benefits{margin-top:17px;gap:10px;font-size:.9rem}.vip-checkout__privacy{margin:15px 0 0}.vip-checkout__plans{padding:20px 15px}.vip-checkout__plans h2{font-size:1.3rem}.vip-plan{gap:10px;padding:13px 10px}.vip-plan__detail{font-size:.74rem}.vip-plan__price{font-size:.9rem}.vip-checkout__footer{margin-top:24px}}
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
  .vip-checkout__image{width:100%;height:auto;aspect-ratio:16/9;min-height:170px;max-height:260px}
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
  .vip-checkout__image{min-height:155px}
  .vip-checkout__plans{padding:13px 11px}
  .vip-checkout__plans h2{font-size:1.16rem}
  .vip-plan{grid-template-columns:16px minmax(0,1fr) auto;gap:7px;padding:12px 8px}
  .vip-plan__radio{width:16px;height:16px}
  .vip-plan__name{font-size:.9rem}
  .vip-plan__detail{font-size:.7rem}
  .vip-plan__price{font-size:.78rem}
  .vip-checkout__cta{padding:12px;font-size:.9rem}
}
.vip-checkout__image{display:block;width:auto;height:min(50vw,70svh,680px);max-width:100%;aspect-ratio:9/16;margin:0 auto;background:#0d0b11;overflow:hidden}
.vip-checkout__image-photo{display:block;width:100%;height:100%;object-fit:contain;object-position:center}
@media(max-width:760px){
  .vip-checkout__image{width:auto;height:min(145vw,68svh,620px);aspect-ratio:9/16;min-height:0;max-height:620px}
}
@media(max-width:360px){
  .vip-checkout__image{height:min(145vw,68svh,500px)}
}
</style>
<style scoped>
.vip-checkout__currency-note{margin:-12px 0 14px;color:#d5cbd9;font-size:.82rem;line-height:1.45}
.vip-trust{list-style:none;padding:14px;margin:20px 0 0;display:grid;gap:12px;background:#17141a;border:1px solid rgba(255,255,255,.16);border-radius:10px}
.vip-trust li{display:flex;align-items:center;gap:10px}
.vip-trust li>span:first-child{width:28px;height:28px;flex:none;display:grid;place-items:center;border-radius:50%;background:#24202a;color:#e7c9f8;font-weight:800}
.vip-trust li>span:last-child{display:grid;gap:2px}
.vip-trust strong{font-size:.82rem;color:#fff}
.vip-trust small{font-size:.72rem;color:#d0c8d4;line-height:1.3}
.vip-pix{display:grid;gap:10px;padding:16px;margin:15px 0;background:#110f14;border:1px solid rgba(255,255,255,.2);border-radius:10px}
.vip-pix__qr{width:190px;height:190px;object-fit:contain;justify-self:center;background:white;border-radius:6px}
.vip-pix label{font-size:.85rem;font-weight:800}
.vip-pix textarea{width:100%;box-sizing:border-box;resize:vertical;padding:10px;color:#fff;background:#211c25;border:1px solid rgba(255,255,255,.2);border-radius:6px;font:.75rem/1.4 monospace;overflow-wrap:anywhere}
.vip-pix button{min-height:42px;padding:10px 12px;border:1px solid rgba(255,255,255,.25);border-radius:7px;background:#29222e;color:#fff;font:inherit;font-weight:800;cursor:pointer}
.vip-pix button:disabled,.vip-plan:disabled{opacity:.55;cursor:not-allowed}
.vip-pix p{margin:0;color:#ded6e2;font-size:.83rem;line-height:1.45}
.vip-pix .vip-pix__check{background:#dcb2f4;color:#211129;border:0}
.vip-pix .vip-pix__success{color:#d5f0db}
.vip-pix__expiry{justify-self:center;color:#e8d2f6!important;font-weight:750}
.vip-pix__expired{padding:12px;border:1px solid rgba(255,190,190,.4);border-radius:8px;background:rgba(130,35,45,.16);color:#ffd7dc!important;text-align:center}
.vip-pix-modal .vip-pix{margin:0}
.vip-pix-modal .vip-pix__qr{width:min(240px,68vw);height:auto;aspect-ratio:1}
.vip-pix-tutorial{display:grid;gap:8px;padding:12px;background:#19151d;border-radius:7px}
.vip-pix-tutorial h3{margin:0;font-size:.95rem}
.vip-pix-tutorial ol{padding-left:20px;margin:0;color:#e5dfe8;font-size:.8rem;line-height:1.55}
.vip-pix-tutorial__image{display:block;width:100%;height:auto;border-radius:6px}

.vip-payer-form{display:grid;gap:9px;margin-top:16px;padding:14px;background:#110f14;border:1px solid rgba(255,255,255,.16);border-radius:10px}.vip-payer-form>p{margin:0 0 3px;color:#e8dfee;font-size:.84rem;line-height:1.4}.vip-payer-form>label:not(.vip-payer-form__consent){font-size:.8rem;font-weight:750;color:#f5eff7}.vip-payer-form>input{width:100%;min-height:43px;padding:10px 11px;color:#fff;background:#211c25;border:1px solid rgba(255,255,255,.2);border-radius:7px;font:inherit}.vip-payer-form>input:focus{outline:2px solid #dcb2f4;outline-offset:1px}.vip-payer-form__consent{display:flex;gap:9px;align-items:flex-start;margin-top:4px;color:#f3edf5;font-size:.8rem;line-height:1.45}.vip-payer-form__consent input{margin:2px 0 0;accent-color:#dcb2f4;flex:none}.vip-payer-form>small{color:#c9c0ce;font-size:.72rem;line-height:1.4}
.vip-checkout__channel{display:inline-flex;align-items:center;gap:9px;color:#f8f5fa;font-size:.88rem;font-weight:800;white-space:nowrap}
.vip-checkout__channel-icon{display:block;width:32px;height:32px;padding:7px;border-radius:50%;background:#229ed9;fill:#fff;flex:none}
.vip-checkout__payment-note{margin:15px 0 0;color:#d7cedb;font-size:.8rem;line-height:1.45}
.vip-checkout__price-error{margin:0 0 14px;color:#ffd3d3;font-size:.88rem;line-height:1.45}
.vip-payer-modal-backdrop{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:max(20px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:rgba(8,6,10,.78);backdrop-filter:blur(5px);overscroll-behavior:contain}
.vip-payer-modal{width:min(100%,480px);max-height:min(90vh,720px);max-height:min(90dvh,720px);overflow:auto;padding:24px;background:#19151d;color:#f8f5fa;border:1px solid rgba(255,255,255,.2);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.55);overscroll-behavior:contain}
.vip-payer-modal__header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}
.vip-payer-modal__header h2{margin:0;font-size:1.25rem;line-height:1.25}
.vip-payer-modal__header p{margin:7px 0 0;color:#d2c8d7;font-size:.88rem;line-height:1.45}
.vip-payer-modal__close{width:38px;height:38px;flex:none;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:#211c25;color:#fff;font-size:1.4rem;line-height:1;cursor:pointer}
.vip-payer-modal__close:disabled,.vip-payer-modal__cancel:disabled{opacity:.55;cursor:not-allowed}
.vip-payer-modal__form{margin:0;padding:0;background:transparent;border:0}
.vip-payer-modal__error{margin:0;color:#ffb4b4;font-size:.84rem;line-height:1.4}
.vip-payer-modal__actions{display:flex;align-items:center;gap:10px;margin-top:8px}
.vip-payer-modal__cancel{min-height:48px;padding:12px 18px;border:1px solid rgba(255,255,255,.25);border-radius:9px;background:transparent;color:#fff;font:inherit;font-weight:750;cursor:pointer}
.vip-payer-modal__actions .vip-checkout__cta{width:auto;min-height:48px;flex:1;margin:0;padding:12px 14px;font-size:.9rem}
@media(max-width:360px){.vip-checkout__channel{gap:6px;font-size:.76rem}.vip-checkout__channel-icon{width:28px;height:28px;padding:6px}}
@media(max-width:480px){.vip-payer-modal-backdrop{padding:12px max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}.vip-payer-modal{width:100%;max-height:calc(100dvh - 24px);padding:19px;border-radius:15px}.vip-payer-modal__header{gap:10px;margin-bottom:16px}.vip-payer-modal__header h2{font-size:1.12rem}.vip-payer-modal__header p{font-size:.82rem}.vip-payer-modal__actions{flex-direction:column-reverse;align-items:stretch}.vip-payer-modal__actions .vip-checkout__cta,.vip-payer-modal__cancel{width:100%;min-height:46px}}
</style>
