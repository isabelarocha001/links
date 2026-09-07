/**
 * Moeda por país/idioma do navegador.
 * O valor numérico do plano é o mesmo (ex.: 9.90); só a moeda muda (USD/EUR/…).
 * Sem conversão cambial no checkout.
 */

export type MoneyLocale = {
  currency: string
  region: string
  /** Unidades menores por 1 unidade (100 = centavos; 1 = JPY/KRW) */
  zeroDecimal?: boolean
}

/** locale tag (en-US, pt-BR, …) ou só idioma → moeda */
export function currencyFromLocaleTag(tag: string): MoneyLocale {
  const t = String(tag || '').toLowerCase().replace(/_/g, '-')
  const exact: Record<string, MoneyLocale> = {
    'pt-br': { currency: 'brl', region: 'BR' },
    'pt-pt': { currency: 'eur', region: 'PT' },
    'en-us': { currency: 'usd', region: 'US' },
    'en-gb': { currency: 'gbp', region: 'GB' },
    'en-au': { currency: 'aud', region: 'AU' },
    'en-ca': { currency: 'cad', region: 'CA' },
    'en-nz': { currency: 'nzd', region: 'NZ' },
    'en-ie': { currency: 'eur', region: 'IE' },
    'en-za': { currency: 'zar', region: 'ZA' },
    'es-es': { currency: 'eur', region: 'ES' },
    'es-mx': { currency: 'mxn', region: 'MX' },
    'es-ar': { currency: 'ars', region: 'AR' },
    'es-co': { currency: 'cop', region: 'CO' },
    'es-cl': { currency: 'clp', region: 'CL', zeroDecimal: true },
    'es-pe': { currency: 'pen', region: 'PE' },
    'es-uy': { currency: 'uyu', region: 'UY' },
    'fr-fr': { currency: 'eur', region: 'FR' },
    'fr-ca': { currency: 'cad', region: 'CA' },
    'fr-be': { currency: 'eur', region: 'BE' },
    'fr-ch': { currency: 'chf', region: 'CH' },
    'de-de': { currency: 'eur', region: 'DE' },
    'de-at': { currency: 'eur', region: 'AT' },
    'de-ch': { currency: 'chf', region: 'CH' },
    'it-it': { currency: 'eur', region: 'IT' },
    'it-ch': { currency: 'chf', region: 'CH' },
    'nl-nl': { currency: 'eur', region: 'NL' },
    'nl-be': { currency: 'eur', region: 'BE' },
    'ja-jp': { currency: 'jpy', region: 'JP', zeroDecimal: true },
    'ko-kr': { currency: 'krw', region: 'KR', zeroDecimal: true },
    'zh-cn': { currency: 'cny', region: 'CN' },
    'zh-tw': { currency: 'twd', region: 'TW' },
    'zh-hk': { currency: 'hkd', region: 'HK' },
    'ru-ru': { currency: 'rub', region: 'RU' },
    'pl-pl': { currency: 'pln', region: 'PL' },
    'tr-tr': { currency: 'try', region: 'TR' },
    'sv-se': { currency: 'sek', region: 'SE' },
    'nb-no': { currency: 'nok', region: 'NO' },
    'nn-no': { currency: 'nok', region: 'NO' },
    'da-dk': { currency: 'dkk', region: 'DK' },
    'fi-fi': { currency: 'eur', region: 'FI' },
    'cs-cz': { currency: 'czk', region: 'CZ' },
    'ro-ro': { currency: 'ron', region: 'RO' },
    'hu-hu': { currency: 'huf', region: 'HU', zeroDecimal: true },
    'in-in': { currency: 'inr', region: 'IN' },
    'hi-in': { currency: 'inr', region: 'IN' },
    'th-th': { currency: 'thb', region: 'TH' },
    'vi-vn': { currency: 'vnd', region: 'VN', zeroDecimal: true },
    'id-id': { currency: 'idr', region: 'ID', zeroDecimal: true },
    'ms-my': { currency: 'myr', region: 'MY' },
    'fil-ph': { currency: 'php', region: 'PH' },
    'en-ph': { currency: 'php', region: 'PH' },
    'en-sg': { currency: 'sgd', region: 'SG' },
    'en-in': { currency: 'inr', region: 'IN' },
  }
  if (exact[t]) return exact[t]

  // region after -
  const parts = t.split('-')
  if (parts.length >= 2) {
    const region = parts[parts.length - 1]
    const byRegion: Record<string, MoneyLocale> = {
      br: { currency: 'brl', region: 'BR' },
      us: { currency: 'usd', region: 'US' },
      gb: { currency: 'gbp', region: 'GB' },
      uk: { currency: 'gbp', region: 'GB' },
      au: { currency: 'aud', region: 'AU' },
      ca: { currency: 'cad', region: 'CA' },
      nz: { currency: 'nzd', region: 'NZ' },
      mx: { currency: 'mxn', region: 'MX' },
      ar: { currency: 'ars', region: 'AR' },
      co: { currency: 'cop', region: 'CO' },
      cl: { currency: 'clp', region: 'CL', zeroDecimal: true },
      pe: { currency: 'pen', region: 'PE' },
      jp: { currency: 'jpy', region: 'JP', zeroDecimal: true },
      kr: { currency: 'krw', region: 'KR', zeroDecimal: true },
      cn: { currency: 'cny', region: 'CN' },
      tw: { currency: 'twd', region: 'TW' },
      hk: { currency: 'hkd', region: 'HK' },
      in: { currency: 'inr', region: 'IN' },
      sg: { currency: 'sgd', region: 'SG' },
      ch: { currency: 'chf', region: 'CH' },
      se: { currency: 'sek', region: 'SE' },
      no: { currency: 'nok', region: 'NO' },
      dk: { currency: 'dkk', region: 'DK' },
      pl: { currency: 'pln', region: 'PL' },
      tr: { currency: 'try', region: 'TR' },
      ru: { currency: 'rub', region: 'RU' },
      za: { currency: 'zar', region: 'ZA' },
      pt: { currency: 'eur', region: 'PT' },
      es: { currency: 'eur', region: 'ES' },
      fr: { currency: 'eur', region: 'FR' },
      de: { currency: 'eur', region: 'DE' },
      it: { currency: 'eur', region: 'IT' },
      nl: { currency: 'eur', region: 'NL' },
      ie: { currency: 'eur', region: 'IE' },
      at: { currency: 'eur', region: 'AT' },
      be: { currency: 'eur', region: 'BE' },
      fi: { currency: 'eur', region: 'FI' },
    }
    if (byRegion[region]) return byRegion[region]
  }

  const lang = parts[0]
  const byLang: Record<string, MoneyLocale> = {
    pt: { currency: 'brl', region: 'BR' },
    en: { currency: 'usd', region: 'US' },
    es: { currency: 'eur', region: 'ES' },
    fr: { currency: 'eur', region: 'FR' },
    de: { currency: 'eur', region: 'DE' },
    it: { currency: 'eur', region: 'IT' },
    nl: { currency: 'eur', region: 'NL' },
    ja: { currency: 'jpy', region: 'JP', zeroDecimal: true },
    ko: { currency: 'krw', region: 'KR', zeroDecimal: true },
    zh: { currency: 'cny', region: 'CN' },
    ru: { currency: 'rub', region: 'RU' },
    pl: { currency: 'pln', region: 'PL' },
    tr: { currency: 'try', region: 'TR' },
    hi: { currency: 'inr', region: 'IN' },
    th: { currency: 'thb', region: 'TH' },
    vi: { currency: 'vnd', region: 'VN', zeroDecimal: true },
    id: { currency: 'idr', region: 'ID', zeroDecimal: true },
  }
  return byLang[lang] || { currency: 'usd', region: 'US' }
}

/** Detecta a partir de navigator.languages / language */
export function detectBrowserMoney(): MoneyLocale & { localeTag: string } {
  if (typeof navigator === 'undefined') {
    return { currency: 'usd', region: 'US', localeTag: 'en-US' }
  }
  const list = [...(navigator.languages || []), navigator.language || 'en-US']
  for (const raw of list) {
    const tag = String(raw || '').trim()
    if (!tag) continue
    const m = currencyFromLocaleTag(tag)
    // se só "en" sem região, continua procurando tag com região
    if (tag.includes('-') || tag.includes('_')) {
      return { ...m, localeTag: tag }
    }
  }
  const fallback = String(navigator.language || 'en-US')
  return { ...currencyFromLocaleTag(fallback), localeTag: fallback }
}

/**
 * 1 BRL → quanto em cada moeda (aprox.).
 * Atualize quando quiser; não depende de API externa.
 */
export const BRL_TO: Record<string, number> = {
  brl: 1,
  usd: 0.18,
  eur: 0.17,
  gbp: 0.14,
  aud: 0.28,
  cad: 0.25,
  nzd: 0.30,
  mxn: 3.5,
  ars: 180,
  cop: 750,
  clp: 170,
  pen: 0.68,
  uyu: 7.5,
  chf: 0.16,
  jpy: 27,
  krw: 250,
  cny: 1.3,
  twd: 5.8,
  hkd: 1.4,
  rub: 17,
  pln: 0.72,
  try: 6.5,
  sek: 1.9,
  nok: 1.95,
  dkk: 1.25,
  czk: 4.2,
  ron: 0.85,
  huf: 70,
  inr: 15,
  thb: 6.5,
  vnd: 4500,
  idr: 2900,
  myr: 0.85,
  php: 10.5,
  sgd: 0.24,
  zar: 3.3,
}

const ZERO_DECIMAL = new Set(['jpy', 'krw', 'clp', 'vnd', 'idr', 'huf', 'ugx', 'xaf', 'xof'])

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL.has(String(currency || '').toLowerCase())
}

/** Converte valor em BRL → moeda alvo */
export function convertFromBrl(amountBrl: number, currency: string): number {
  const cur = String(currency || 'usd').toLowerCase()
  const rate = BRL_TO[cur] ?? BRL_TO.usd
  const raw = Number(amountBrl) * rate
  if (isZeroDecimalCurrency(cur)) {
    return Math.max(1, Math.round(raw))
  }
  return Math.max(0.5, Math.round(raw * 100) / 100)
}

/** Valor para a API Stripe (centavos ou unidade inteira) */
export function toStripeUnitAmount(amount: number, currency: string): number {
  const cur = String(currency || 'usd').toLowerCase()
  if (isZeroDecimalCurrency(cur)) {
    return Math.max(1, Math.round(amount))
  }
  return Math.max(50, Math.round(amount * 100)) // mínimo ~0.50 na maioria
}

export function formatMoney(amount: number, currency: string, localeTag = 'en'): string {
  const cur = String(currency || 'usd').toUpperCase()
  try {
    return new Intl.NumberFormat(localeTag || 'en', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: isZeroDecimalCurrency(cur.toLowerCase()) ? 0 : 2,
    }).format(amount)
  } catch {
    return `${cur} ${amount}`
  }
}
