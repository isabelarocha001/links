#!/usr/bin/env python3
"""Portugal (pt-PT) = international market: intl channel, no VIP bot. UI stays Portuguese."""
from pathlib import Path

I18N = Path("utils/i18n.ts")
APP = Path("app.vue")
i18n = I18N.read_text(encoding="utf-8")
app = APP.read_text(encoding="utf-8")

old_detect = '''export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'pt'
  const list = [...(navigator.languages || []), navigator.language || 'pt']
  for (const raw of list) {
    const code = String(raw || '').toLowerCase().slice(0, 2)
    if (code === 'pt') return 'pt'
    if (code === 'en') return 'en'
    if (code === 'es') return 'es'
    if (code === 'fr') return 'fr'
    if (code === 'de') return 'de'
    if (code === 'it') return 'it'
  }
  return 'pt'
}'''

new_detect = '''export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'pt'
  const list = [...(navigator.languages || []), navigator.language || 'pt']
  for (const raw of list) {
    const code = String(raw || '').toLowerCase().slice(0, 2)
    if (code === 'pt') return 'pt'
    if (code === 'en') return 'en'
    if (code === 'es') return 'es'
    if (code === 'fr') return 'fr'
    if (code === 'de') return 'de'
    if (code === 'it') return 'it'
  }
  return 'pt'
}

/** BR market only: pt-BR (or bare "pt"). Portugal (pt-PT) is international. */
export function isBrazilAudience(): boolean {
  if (typeof navigator === 'undefined') return true
  const list = [...(navigator.languages || []), navigator.language || 'pt-BR'].map((x) =>
    String(x || '').toLowerCase().replace(/_/g, '-'),
  )
  // Prefer explicit region if present
  for (const tag of list) {
    if (tag === 'pt-pt' || tag.startsWith('pt-pt-')) return false
    if (tag === 'pt-br' || tag.startsWith('pt-br-')) return true
  }
  // No explicit BR/PT region: if any Portuguese tag ("pt"), treat as BR (main market)
  for (const tag of list) {
    if (tag === 'pt' || tag.startsWith('pt-')) return true
  }
  return false
}'''

if old_detect not in i18n:
    raise SystemExit("detectLocale block not found")
i18n = i18n.replace(old_detect, new_detect, 1)
I18N.write_text(i18n, encoding="utf-8")

# app.vue: import isBrazilAudience and use for isPt (market flag)
app = app.replace(
    "import { detectLocale, t as tr, type Locale } from '~/utils/i18n'",
    "import { detectLocale, isBrazilAudience, t as tr, type Locale } from '~/utils/i18n'",
    1,
)

# isPt becomes BR audience (name kept to avoid touching all template v-ifs)
old_ispt = "const isPt = computed(() => locale.value === 'pt')"
new_ispt = "const isPt = computed(() => isBrazilAudience()) // true only BR; pt-PT = false (intl)"
if old_ispt not in app:
    # maybe already changed
    if "isBrazilAudience" not in app:
        raise SystemExit("isPt computed not found")
else:
    app = app.replace(old_ispt, new_ispt, 1)

APP.write_text(app, encoding="utf-8")
print("pt-PT intl market ok")
