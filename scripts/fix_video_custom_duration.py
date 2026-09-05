#!/usr/bin/env python3
"""Quote 90min / 2h / 3h videochamada prices instead of dumping preset buttons."""
from pathlib import Path

APP = Path("app.vue")


def main() -> None:
    s = APP.read_text(encoding="utf-8")
    if "vid_120" in s and "quoteSpecificVideoDuration" in s:
        print("already applied")
        return

    old_parse = """function parseVideoCallChoice(lower: string): { key: string; label: string; price: string; min: number } | null {
  const t = String(lower || '').toLowerCase()
  // ordem: mais específico primeiro
  if (/\\b(1|uma)\\s*hora\\b/.test(t) || /\\b60\\s*min/.test(t) || /\\b1\\s*h\\b/.test(t) || t.includes('1hr') || t.includes('1 hr') || t.includes('uma hr')) {
    return { key: 'vid_60', label: 'Videochamada 1 hora', price: '399,90', min: 60 }
  }"""

    new_parse = """function parseVideoCallChoice(lower: string): { key: string; label: string; price: string; min: number } | null {
  const t = String(lower || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
  // ordem: mais específico primeiro (2h/3h/90min antes de 1h)
  if (/\\b(3|tres|tr[eê]s)\\s*horas?\\b/.test(t) || /\\b180\\s*min/.test(t) || /\\b3\\s*h\\b/.test(t)) {
    return { key: 'vid_180', label: 'Videochamada 3 horas', price: '999,90', min: 180 }
  }
  if (/\\b(2|duas|dois)\\s*horas?\\b/.test(t) || /\\b120\\s*min/.test(t) || /\\b2\\s*h\\b/.test(t)) {
    return { key: 'vid_120', label: 'Videochamada 2 horas', price: '699,90', min: 120 }
  }
  if (/\\b90\\s*min/.test(t) || /\\bhora e meia\\b/.test(t) || /\\b1[,.]5\\s*h/.test(t)) {
    return { key: 'vid_90', label: 'Videochamada 90 min', price: '549,90', min: 90 }
  }
  if (/\\b(1|uma)\\s*hora\\b/.test(t) || /\\b60\\s*min/.test(t) || /\\b1\\s*h\\b/.test(t) || t.includes('1hr') || t.includes('1 hr') || t.includes('uma hr')) {
    return { key: 'vid_60', label: 'Videochamada 1 hora', price: '399,90', min: 60 }
  }"""

    if old_parse not in s:
        raise SystemExit("parse block not found")
    s = s.replace(old_parse, new_parse, 1)

    old_opts = """      { key: 'vid_60', label: '1 hora  R$ 399,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },"""
    new_opts = """      { key: 'vid_60', label: '1 hora  R$ 399,90', variant: 'wa-quick--yes' },
      { key: 'vid_90', label: '90 min  R$ 549,90', variant: 'wa-quick--yes' },
      { key: 'vid_120', label: '2 horas  R$ 699,90', variant: 'wa-quick--yes' },
      { key: 'vid_180', label: '3 horas  R$ 999,90', variant: 'wa-quick--yes' },
      { key: 'back', label: '← Voltar', variant: 'wa-quick--no' },"""
    if old_opts not in s:
        raise SystemExit("options block not found")
    s = s.replace(old_opts, new_opts, 1)

    helper = """
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
    `Pra ${choice.label.toLowerCase()} fica R$ ${choice.price}, amor 💕\\n\\nÉ ao vivo comigo esse tempo todinho. Quer que eu te mande o PIX pra gente marcar?`,
    1400,
  )
}

"""
    if "function parseCustomVideoDuration" not in s:
        s = s.replace(
            "function recentFunnelText(n = 8): string {",
            helper + "function recentFunnelText(n = 8): string {",
            1,
        )

    old_early = """  const lower = text.toLowerCase()

  // --- Conversação natural com Gemini (greeting + papo + saudações) ---"""
    new_early = """  const lower = text.toLowerCase()

  // EARLY: duração específica + preço (ex: \"eu quero 2 horas amor quanto custa\")
  // antes do Gemini, do dump de video_consult e do handler genérico de \"quanto custa\"
  {
    const customChoice = parseVideoCallChoice(lower)
    if (customChoice && isVideoDurationPriceAsk(lower)) {
      await quoteSpecificVideoDuration(customChoice)
      try { saveFunnelState() } catch {}
      return
    }
  }

  // --- Conversação natural com Gemini (greeting + papo + saudações) ---"""
    if old_early not in s:
        raise SystemExit("early insert point not found")
    s = s.replace(old_early, new_early, 1)

    old_consult = """  if (funnelStep.value === 'video_consult') {
    funnelStep.value = 'video'
    await funnelType(
      'Entendi o clima que você quer 😈\\n\\nPra gente fazer isso ao vivo, escolhe o tempo:\\n\\n• 10 min  R$ 99,90\\n• 20 min  R$ 149,90\\n• 30 min  R$ 229,90\\n• 1 hora  R$ 399,90\\n\\nMe fala qual encaixa melhor pra você agora — ou se prefere outro tempo.',
      1800,
    )
    return
  }"""
    new_consult = """  if (funnelStep.value === 'video_consult') {
    const consultChoice = parseVideoCallChoice(lower)
    if (consultChoice) {
      await quoteSpecificVideoDuration(consultChoice)
      try { saveFunnelState() } catch {}
      return
    }
    funnelStep.value = 'video'
    await funnelType(
      'Entendi o clima que você quer 😈\\n\\nPra gente fazer isso ao vivo, escolhe o tempo:\\n\\n• 10 min  R$ 99,90\\n• 20 min  R$ 149,90\\n• 30 min  R$ 229,90\\n• 1 hora  R$ 399,90\\n• 90 min  R$ 549,90\\n• 2 horas  R$ 699,90\\n• 3 horas  R$ 999,90\\n\\nMe fala qual encaixa melhor pra você agora — ou se prefere outro tempo.',
      1800,
    )
    return
  }"""
    if old_consult not in s:
        raise SystemExit("video_consult block not found")
    s = s.replace(old_consult, new_consult, 1)

    old_map = """if (opt.key === 'vid_10' || opt.key === 'vid_20' || opt.key === 'vid_30' || opt.key === 'vid_60') {
    const map: Record<string, { label: string; price: string; desc: string; min: number }> = {
      vid_10: { label: 'Videochamada 10 min', price: '99,90', desc: 'chamada ao vivo rápida e safada', min: 10 },
      vid_20: { label: 'Videochamada 20 min', price: '149,90', desc: 'tempo pra gozar com calma', min: 20 },
      vid_30: { label: 'Videochamada 30 min', price: '229,90', desc: 'sessão completa comigo', min: 30 },
      vid_60: { label: 'Videochamada 1 hora', price: '399,90', desc: 'uma hora inteira só nossa', min: 60 },
    }"""
    new_map = """if (opt.key === 'vid_10' || opt.key === 'vid_20' || opt.key === 'vid_30' || opt.key === 'vid_60' || opt.key === 'vid_90' || opt.key === 'vid_120' || opt.key === 'vid_180') {
    const map: Record<string, { label: string; price: string; desc: string; min: number }> = {
      vid_10: { label: 'Videochamada 10 min', price: '99,90', desc: 'chamada ao vivo rápida e safada', min: 10 },
      vid_20: { label: 'Videochamada 20 min', price: '149,90', desc: 'tempo pra gozar com calma', min: 20 },
      vid_30: { label: 'Videochamada 30 min', price: '229,90', desc: 'sessão completa comigo', min: 30 },
      vid_60: { label: 'Videochamada 1 hora', price: '399,90', desc: 'uma hora inteira só nossa', min: 60 },
      vid_90: { label: 'Videochamada 90 min', price: '549,90', desc: 'hora e meia ao vivo comigo', min: 90 },
      vid_120: { label: 'Videochamada 2 horas', price: '699,90', desc: 'duas horas só nossas', min: 120 },
      vid_180: { label: 'Videochamada 3 horas', price: '999,90', desc: 'três horas de chamada ao vivo', min: 180 },
    }"""
    if old_map not in s:
        raise SystemExit("answerFunnel map not found")
    s = s.replace(old_map, new_map, 1)

    APP.write_text(s, encoding="utf-8")
    print("patched app.vue")


if __name__ == "__main__":
    main()
