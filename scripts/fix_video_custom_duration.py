#!/usr/bin/env python3
"""Quote 90min/2h/3h videochamada prices instead of dumping preset buttons."""
from pathlib import Path

APP = Path("app.vue")


def apply(s: str) -> str:
    old_parse_3h = """  if (/\\b(3|tres|tr[eê]s)\\s*horas?\\b/.test(t) || /\\b180\\s*min/.test(t) || /\\b3\\s*h\\b/.test(t)) {
    return { key: 'vid_180', label: 'Videochamada 3 horas', price: '999,90', min: 180 }
  }"""
    new_parse_3h = """  if (/\\b(3|tres|tr[eê]s)\\s*h(ora)?s?\\b/.test(t) || /\\b180\\s*min/.test(t) || /\\b3\\s*h(r|rs)?\\b/.test(t) || /\\b3hrs?\\b/.test(t)) {
    return { key: 'vid_180', label: 'Videochamada 3 horas', price: '999,90', min: 180 }
  }"""
    if old_parse_3h in s:
        s = s.replace(old_parse_3h, new_parse_3h, 1)
        print("patched 3h parse")
    elif "vid_180" in s:
        print("3h parse already flexible or present")
    else:
        raise SystemExit("3h parse block missing")

    old_parse_2h = """  if (/\\b(2|duas|dois)\\s*horas?\\b/.test(t) || /\\b120\\s*min/.test(t) || /\\b2\\s*h\\b/.test(t)) {
    return { key: 'vid_120', label: 'Videochamada 2 horas', price: '699,90', min: 120 }
  }"""
    new_parse_2h = """  if (/\\b(2|duas|dois)\\s*h(ora)?s?\\b/.test(t) || /\\b120\\s*min/.test(t) || /\\b2\\s*h(r|rs)?\\b/.test(t) || /\\b2hrs?\\b/.test(t)) {
    return { key: 'vid_120', label: 'Videochamada 2 horas', price: '699,90', min: 120 }
  }"""
    if old_parse_2h in s:
        s = s.replace(old_parse_2h, new_parse_2h, 1)
        print("patched 2h parse")
    elif "vid_120" in s:
        print("2h parse already flexible or present")
    else:
        raise SystemExit("2h parse block missing")

    old_ask = "  const asksPrice = /quanto|custa|pre[cç]o|valor|cobra|fica quanto|qto/.test(t)"
    new_ask = "  const asksPrice = /quanto|custa|pre[cç]o|valor|cobra|fica quanto|qto|q custa|qn?to/.test(t)"
    if old_ask in s:
        s = s.replace(old_ask, new_ask, 1)
        print("patched asksPrice")
    else:
        print("asksPrice already patched or different")

    old_vc = """  if (funnelStep.value === 'video_consult') {
    const choice = resolveVideoChoiceFromContext(lower) || parseVideoCallChoice(lower)
    if (choice) {
      selectedPack.value = { key: choice.key, label: choice.label, price: choice.price }
      videoCallPurchasedMin.value = choice.min
      track('whatsapp_funnel_select', { offer_slug: choice.key, source: 'video_consult_typed' })
      await funnelTypeParts(`Fechado: ${choice.label} por R$ ${choice.price}.|||Vou preparar o PIX pra você.`, 1000)
      await startFunnelCheckout()
      return
    }"""
    new_vc = """  if (funnelStep.value === 'video_consult') {
    const choice = resolveVideoChoiceFromContext(lower) || parseVideoCallChoice(lower)
    if (choice) {
      // duração específica: cotar aquele tempo (não listar 10/20/30/60)
      await quoteSpecificVideoDuration(choice)
      try { saveFunnelState() } catch {}
      return
    }"""
    if old_vc in s:
        s = s.replace(old_vc, new_vc, 1)
        print("patched video_consult to quote specific duration")
    elif "quoteSpecificVideoDuration(choice)" in s:
        print("video_consult already quotes specific duration")
    else:
        print("video_consult block variant — leaving as-is if early handler exists")

    old_opts = """  if (funnelStep.value === 'video') {
    // Tempo já combinado: não reoferece a lista — só PIX ou mudar tempo"""
    new_opts = """  if (funnelStep.value === 'video_consult') {
    if ((selectedPack.value?.key || '').startsWith('vid_')) {
      return [
        { key: 'pix_yes', label: 'Sim, pode mandar o PIX 💚', variant: 'wa-quick--yes' },
        { key: 'change_time', label: 'Mudar tempo', variant: 'wa-quick--no' },
      ]
    }
    return []
  }
  if (funnelStep.value === 'video') {
    // Tempo já combinado: não reoferece a lista — só PIX ou mudar tempo"""
    marker = "if (funnelStep.value === 'video_consult') {\n    if ((selectedPack.value?.key || '').startsWith('vid_'))"
    if marker not in s:
        if old_opts in s:
            s = s.replace(old_opts, new_opts, 1)
            print("patched funnelOptions for video_consult")
        else:
            print("video options anchor not found")
    else:
        print("video_consult options already present")

    if "EARLY: duração específica" not in s:
        raise SystemExit("missing EARLY duration+price handler")
    return s


def main() -> None:
    s = APP.read_text(encoding="utf-8")
    if "sendFunnelFreeText" not in s or len(s) < 10000:
        raise SystemExit("app.vue looks truncated")
    s = apply(s)
    APP.write_text(s, encoding="utf-8")
    print(f"wrote app.vue ({len(s)} bytes)")


if __name__ == "__main__":
    main()
