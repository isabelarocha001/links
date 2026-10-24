<template>
  <main class="vip-dashboard">
    <header class="vip-dashboard__header">
      <div><p class="eyebrow">PRÉVIA LOCAL · NÃO PUBLICAR</p><h1>Configurar Canal VIP</h1><p class="sub">Ajustes salvos somente neste navegador, para revisar o fluxo.</p></div>
      <a href="/assinaturavip" target="_blank" rel="noopener">Ver checkout <span aria-hidden="true">↗</span></a>
    </header>
    <section class="panel events-panel" aria-labelledby="events-title">
      <div class="panel__heading"><div><p class="eyebrow">SYNCPAY · ÚLTIMAS 24 HORAS</p><h2 id="events-title">Eventos de pagamento</h2></div><span class="tag">{{ eventStatus }}</span></div>
      <form v-if="!eventsAuthed" class="events-login" @submit.prevent="loginEvents">
        <p>Entre com a senha do painel para ver os eventos e valores recebidos.</p>
        <label class="field"><span>Senha do painel</span><input v-model="adminPassword" type="password" autocomplete="current-password" required></label>
        <button class="save" type="submit" :disabled="eventsLoading">{{ eventsLoading ? 'Entrando…' : 'Entrar no painel' }}</button>
      </form>
      <template v-else>
        <p v-if="eventsError" class="events-error" role="alert">{{ eventsError }}</p>
        <div class="metrics events-metrics">
          <article><span>Total de eventos</span><strong>{{ eventTotal }}</strong><small>Recebidos nas últimas 24 horas</small></article>
          <article v-for="item in eventCounts" :key="item.event_type"><span>{{ eventLabel(item.event_type) }}</span><strong>{{ item.count }}</strong><small>Últimas 24 horas</small></article>
        </div>
        <div class="events-table-wrap">
          <table class="events-table">
            <thead><tr><th>Evento</th><th>Status</th><th>Valor</th><th>Recebido</th></tr></thead>
            <tbody>
              <tr v-for="row in recentEvents" :key="`${row.event_type}-${row.event_id}-${row.received_at}`">
                <td>{{ eventLabel(row.event_type) }}</td>
                <td>{{ payloadValue(row, ['status']) || '—' }}</td>
                <td>{{ eventAmount(row) }}</td>
                <td>{{ eventTime(row.received_at) }}</td>
              </tr>
              <tr v-if="!recentEvents.length"><td colspan="4" class="empty-events">Nenhum evento SyncPay recebido ainda.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="events-footnote">Atualização automática a cada 15 segundos. Última consulta: {{ lastEventsUpdate || '—' }}.</p>
      </template>
    </section>
    <div v-if="!isLocalDev" class="local-only" role="alert">
      <h2>Painel de demonstração</h2><p>Esta tela de configuração foi preparada para revisão local. Abra o projeto pelo servidor de desenvolvimento para editar os valores.</p>
    </div>
    <template v-else>
      <section class="metrics" aria-label="Métricas demonstrativas">
        <article v-for="metric in metrics" :key="metric.label"><span>{{ metric.label }}</span><strong>—</strong><small>Dados reais serão ligados depois</small></article>
      </section>
      <section class="panel">
        <div class="panel__heading"><div><p class="eyebrow">OFERTA PRINCIPAL</p><h2>Planos</h2></div><span class="tag">Prévia local</span></div>
        <div class="plans-editor">
          <article v-for="(plan, index) in settings.plans" :key="plan.id" class="plan-editor">
            <label class="toggle"><input v-model="plan.enabled" type="checkbox"><span></span><b>{{ plan.name }}</b></label>
            <label class="field"><span>Nome do plano</span><input v-model.trim="plan.name" type="text" maxlength="32"></label>
            <label class="field"><span>Descrição curta</span><input v-model.trim="plan.detail" type="text" maxlength="80"></label>
            <div class="currency-fields"><label v-for="currency in currencies" :key="currency.code" class="field"><span>{{ currency.label }}</span><div class="money-input"><span>{{ currency.symbol }}</span><input v-model.number="settings.plans[index].prices[currency.code]" type="number" min="0" step="0.01" inputmode="decimal" :placeholder="currency.code === 'BRL' ? '29,90' : 'Defina'" /></div></label></div>
          </article>
        </div>
      </section>
      <section class="panel">
        <div class="panel__heading"><div><p class="eyebrow">APÓS O PAGAMENTO</p><h2>Ofertas adicionais</h2></div><span class="tag">Até 2</span></div>
        <p class="hint">Defina cada moeda separadamente; o checkout escolhe a moeda pela região do navegador. Não há conversão cambial. Configure as ofertas para aparecerem depois da confirmação. Nesta prévia, nenhuma cobrança acontece.</p>
        <div class="plans-editor">
          <article v-for="(upsell, index) in settings.upsells" :key="index" class="plan-editor upsell-editor">
            <label class="toggle"><input v-model="upsell.enabled" type="checkbox"><span></span><b>Upsell {{ index + 1 }}</b></label>
            <label class="field"><span>Nome da oferta</span><input v-model.trim="upsell.name" type="text" maxlength="48" placeholder="Ex.: Conteúdo especial"></label>
            <label class="field"><span>O que inclui</span><textarea v-model.trim="upsell.description" maxlength="150" rows="2" placeholder="Descreva de forma direta"></textarea></label>
            <div class="currency-fields"><label v-for="currency in currencies" :key="currency.code" class="field"><span>{{ currency.label }}</span><div class="money-input"><span>{{ currency.symbol }}</span><input v-model.number="upsell.prices[currency.code]" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Defina" /></div></label></div>
          </article>
        </div>
      </section>
      <div class="actions"><button type="button" class="save" @click="save">Salvar prévia neste navegador</button><button type="button" class="reset" @click="reset">Restaurar valores iniciais</button><span v-if="saved" role="status">Salvo neste navegador.</span></div>
      <p class="notice"><strong>Importante:</strong> os números são demonstração. Este painel não consulta pagamentos, não envia dados ao Supabase e não cria cobranças reais.</p>
    </template>
  </main>
</template>
<script setup lang="ts">
type Currency = 'BRL' | 'USD' | 'EUR'
type Prices = Record<Currency, number | null>
type Plan = { id: string; name: string; detail: string; prices: Prices; enabled: boolean; badge?: string; price?: number }
type Upsell = { name: string; description: string; prices: Prices; enabled: boolean; price?: number }
type Settings = { plans: Plan[]; upsells: Upsell[] }
const STORAGE_KEY = 'wanessa-vip-checkout-settings-v1'
const defaults: Settings = {
  plans: [
    { id: 'monthly', name: 'Mensal', detail: '30 dias de acesso ao canal VIP', prices: { BRL: 29.9, USD: null, EUR: null }, enabled: true },
    { id: 'lifetime', name: 'Vitalício', detail: 'Acesso sem prazo para terminar', prices: { BRL: 109.9, USD: null, EUR: null }, enabled: true, badge: 'PAGUE UMA VEZ' },
  ],
  upsells: [
    { name: '', description: '', prices: { BRL: null, USD: null, EUR: null }, enabled: false },
    { name: '', description: '', prices: { BRL: null, USD: null, EUR: null }, enabled: false },
  ],
}
const settings = ref<Settings>(structuredClone(defaults))
const saved = ref(false)
type SyncPayEventCount = { event_type: string; count: number }
type SyncPayEventRow = { event_type: string; event_id: string | null; payload: Record<string, unknown>; received_at: string }
const eventsAuthed = ref(false)
const eventsLoading = ref(false)
const eventsError = ref('')
const adminPassword = ref('')
const eventTotal = ref(0)
const eventCounts = ref<SyncPayEventCount[]>([])
const recentEvents = ref<SyncPayEventRow[]>([])
const lastEventsUpdate = ref('')
let eventsInterval: ReturnType<typeof setInterval> | undefined
const currencies = [
  { code: 'BRL' as const, label: 'Preço em reais', symbol: 'R$' },
  { code: 'USD' as const, label: 'Preço em dólares', symbol: 'US$' },
  { code: 'EUR' as const, label: 'Preço em euros', symbol: '€' },
]
const isLocalDev = import.meta.dev
const metrics = [
  { label: 'Visitas à oferta' }, { label: 'Pix gerados' }, { label: 'Pix copiados' }, { label: 'Aguardando pagamento' },
]
function normalizePrices(raw: any, oldPrice: any, fallback: Prices): Prices {
  const values = raw && typeof raw === 'object' ? raw : {}
  const valid = (value: any) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
  return { BRL: valid(values.BRL) ?? valid(oldPrice) ?? fallback.BRL, USD: valid(values.USD), EUR: valid(values.EUR) }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 2500)
}
function reset() {
  settings.value = structuredClone(defaults)
  localStorage.removeItem(STORAGE_KEY)
  saved.value = false
}
const eventLabels: Record<string, string> = {
  transaction: 'Transação criada/atualizada',
  'cash-in': 'Recebimento · Cash In',
  'cash-out': 'Transação · Cash Out',
  med: 'MED',
  'subscription-activated': 'Assinatura · Ativada',
  'subscription-overdue': 'Assinatura · Em atraso',
  'subscription-suspended': 'Assinatura · Suspensa',
  'subscription-cancelled': 'Assinatura · Cancelada',
  'subscription-reactivated': 'Assinatura · Reativada',
  'subscription-renewed': 'Assinatura · Renovada',
  'subscription-expired': 'Assinatura · Expirada',
}
const eventStatus = computed(() => eventsLoading.value ? 'Carregando…' : eventsAuthed.value ? 'Atualizado ao vivo' : 'Acesso restrito')
function eventLabel(type: string) { return eventLabels[type] || type.replace(/[-_.]/g, ' ') }
async function loadEvents() {
  try {
    const data = await $fetch<{ total: number; counts: SyncPayEventCount[]; recent: SyncPayEventRow[]; updated_at: string }>('/api/admin/analytics-events')
    eventTotal.value = data.total
    eventCounts.value = data.counts
    recentEvents.value = data.recent
    lastEventsUpdate.value = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(data.updated_at))
    eventsError.value = ''
  } catch (error: any) {
    if (error?.statusCode === 401 || error?.status === 401) eventsAuthed.value = false
    eventsError.value = error?.data?.statusMessage || 'Não consegui carregar os eventos agora.'
  }
}
async function loginEvents() {
  eventsLoading.value = true
  eventsError.value = ''
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: adminPassword.value } })
    eventsAuthed.value = true
    adminPassword.value = ''
    await loadEvents()
    if (!eventsInterval) eventsInterval = setInterval(loadEvents, 15_000)
  } catch (error: any) {
    eventsError.value = error?.data?.statusMessage || 'Senha incorreta.'
  } finally {
    eventsLoading.value = false
  }
}
function payloadValue(row: SyncPayEventRow, keys: string[]) {
  for (const key of keys) {
    const value = row.payload?.[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value)
  }
  return ''
}
function eventAmount(row: SyncPayEventRow) {
  const amount = row.payload?.amount ?? row.payload?.value
  if (amount === undefined || amount === null || amount === '') return '—'
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return String(amount)
  const currency = String(row.payload?.currency || 'BRL').toUpperCase()
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(numeric) }
  catch { return `${numeric.toFixed(2)} ${currency}` }
}
function eventTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
onMounted(() => {
  $fetch('/api/admin/session').then(async () => {
    eventsAuthed.value = true
    eventsLoading.value = true
    await loadEvents()
    eventsLoading.value = false
    eventsInterval = setInterval(loadEvents, 15_000)
  }).catch(() => { eventsAuthed.value = false })
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      settings.value = {
        ...structuredClone(defaults), ...parsed,
        plans: defaults.plans.map((fallback, index) => {
          const raw = parsed.plans?.[index] || fallback
          return { ...fallback, ...raw, prices: normalizePrices(raw.prices, raw.price, fallback.prices) }
        }),
        upsells: defaults.upsells.map((fallback, index) => {
          const raw = parsed.upsells?.[index] || fallback
          return { ...fallback, ...raw, prices: normalizePrices(raw.prices, raw.price, fallback.prices) }
        }),
      }
    }
  } catch { settings.value = structuredClone(defaults) }
})
onBeforeUnmount(() => { if (eventsInterval) clearInterval(eventsInterval) })
</script>
<style scoped>
.vip-dashboard{--bg:#100d13;--panel:#19151d;--line:rgba(255,255,255,.14);--text:#faf7fc;--muted:#c3bac9;min-height:100vh;background:var(--bg);color:var(--text);padding:34px max(18px,calc((100vw - 1080px)/2));font-family:inherit}.vip-dashboard__header{display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:1px solid var(--line);padding-bottom:24px}.eyebrow{color:#e3baff;font-size:.7rem;font-weight:850;letter-spacing:.13em;margin:0 0 7px}.vip-dashboard h1{font-size:clamp(1.8rem,4vw,2.55rem);letter-spacing:-.04em;margin:0}.sub{margin:8px 0 0;color:var(--muted)}.vip-dashboard__header>a{color:#24132e;background:#dfb7f4;text-decoration:none;padding:12px 15px;border-radius:8px;font-weight:850;white-space:nowrap}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.metrics article,.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px}.metrics article{padding:15px;display:grid;gap:7px}.metrics span,.metrics small{color:var(--muted);font-size:.8rem}.metrics strong{font-size:1.7rem}.panel{padding:22px;margin:16px 0}.panel__heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.panel h2{font-size:1.35rem;margin:0}.tag{color:#e5c4f8;border:1px solid rgba(220,178,244,.45);padding:5px 8px;border-radius:5px;font-size:.72rem}.field{display:grid;gap:7px;color:#eee8f1;font-size:.86rem;font-weight:700}.field input,.field textarea{width:100%;box-sizing:border-box;background:#100d13;border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:7px;padding:11px 12px;font:inherit;font-weight:450;outline:none}.field input:focus,.field textarea:focus{border-color:#dcb2f4;box-shadow:0 0 0 2px rgba(220,178,244,.18)}.field textarea{resize:vertical}.hint{color:var(--muted);font-size:.8rem;line-height:1.5;margin:8px 0 15px}.plans-editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:16px}.plan-editor{display:grid;align-content:start;gap:13px;padding:16px;background:#211c25;border:1px solid var(--line);border-radius:10px}.toggle{display:flex;align-items:center;gap:9px;font-size:.95rem}.toggle input{accent-color:#dcb2f4;width:17px;height:17px}.money-input{display:flex;align-items:center;background:#100d13;border:1px solid rgba(255,255,255,.2);border-radius:7px;padding-left:11px}.money-input>span{color:#c9bdcf}.money-input input{border:0;background:transparent}.money-input:focus-within{border-color:#dcb2f4}.currency-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.currency-fields .field{min-width:0}.currency-fields .field>span{font-size:.76rem}.currency-fields .money-input{min-width:0}.currency-fields .money-input>span{font-size:.78rem;white-space:nowrap}.currency-fields .money-input input{min-width:0;padding-left:7px;padding-right:6px}.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:20px 0}.actions button{min-height:44px;border-radius:7px;padding:10px 15px;font:inherit;font-weight:800;cursor:pointer}.save{border:0;background:#dcb2f4;color:#24132e}.reset{border:1px solid var(--line);background:transparent;color:#eee}.actions span{color:#c9efcf;font-size:.85rem}.notice{border-left:3px solid #dcb2f4;background:#201923;padding:13px 15px;color:#d4cbd8;font-size:.82rem;line-height:1.55}.local-only{max-width:600px;margin:60px auto;padding:22px;border:1px solid var(--line);background:var(--panel);border-radius:12px}.local-only p{color:var(--muted);line-height:1.55}
.events-login{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:14px;max-width:650px}.events-login p{grid-column:1/-1;color:var(--muted);margin:0}.events-login button{min-height:43px;border:0;border-radius:7px;padding:10px 15px;font:inherit;font-weight:800;cursor:pointer}.events-login button:disabled{opacity:.6;cursor:wait}.events-error{color:#ffb4b4;background:#321d22;border:1px solid #6d333b;padding:11px 13px;border-radius:7px}.events-metrics{grid-template-columns:repeat(4,minmax(0,1fr));margin:18px 0}.events-table-wrap{overflow-x:auto}.events-table{width:100%;border-collapse:collapse;min-width:560px;text-align:left}.events-table th,.events-table td{padding:11px 10px;border-bottom:1px solid var(--line);font-size:.87rem}.events-table th{color:var(--muted);font-weight:700}.events-table td{color:var(--text)}.empty-events{text-align:center;color:var(--muted)!important;padding:24px!important}.events-footnote{font-size:.78rem;color:var(--muted);margin:14px 0 0}
@media(max-width:700px){.currency-fields{grid-template-columns:1fr}.vip-dashboard{padding:22px 14px}.vip-dashboard__header{align-items:flex-start;flex-direction:column}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.events-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.events-login{grid-template-columns:1fr}.events-login p{grid-column:auto}.plans-editor{grid-template-columns:1fr}.panel{padding:17px 13px}}
</style>
