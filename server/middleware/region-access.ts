import { getHeader, getRequestURL, setHeader, setResponseStatus } from 'h3'

// Primary browser languages excluded by the requested audience policy.
// Korean (ko) is intentionally not on this list.
const BLOCKED_LANGUAGE_CODES = new Set([
  'ar', // Arabic
  'bn', // Bengali
  'cmn', 'zh', // Mandarin / Chinese tags
  'fa', // Persian / Farsi
  'fil', 'tl', // Filipino / Tagalog
  'he', 'iw', // Hebrew (current and legacy tags)
  'hi', // Hindi
  'id', // Indonesian
  'ja', // Japanese
  'km', // Khmer
  'lo', // Lao
  'mn', // Mongolian
  'ms', // Malay
  'my', // Burmese
  'ne', // Nepali
  'pa', // Punjabi
  'ru', // Russian
  'ta', // Tamil
  'te', // Telugu
  'th', // Thai
  'tr', // Turkish
  'ur', // Urdu
  'vi', // Vietnamese
])

function primaryLanguage(header: string): string {
  return header
    .split(',')
    .map((entry, index) => {
      const [tag = '', ...params] = entry.trim().split(';')
      const qParam = params.find((param) => /^\s*q=/i.test(param))
      const quality = qParam ? Number(qParam.split('=')[1]) : 1
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0, index }
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)[0]?.tag || ''
}

export default defineEventHandler((event) => {
  // Limit only the public landing page. Checkout, admin and other routes keep
  // their existing access rules.
  if (getRequestURL(event).pathname !== '/') return

  const language = primaryLanguage(getHeader(event, 'accept-language') || '')
  const languageCode = language.split('-')[0]

  // Do not use IP geolocation here: browser language is the only restriction.
  if (!BLOCKED_LANGUAGE_CODES.has(languageCode)) return

  event.context.regionUnavailable = true
  setResponseStatus(event, 404, 'This page is not available in your region')
  setHeader(event, 'Vary', 'Accept-Language')
})
