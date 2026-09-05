#!/usr/bin/env python3
"""Restore full app.vue and make video_consult honor typed duration (10 min)."""
from pathlib import Path
import subprocess

APP = Path("app.vue")
GOOD = "f4db22a4fcaae6060f1841b65fc049d3a147ed4a"


def restore_full_app() -> str:
    raw = subprocess.check_output(["git", "show", f"{GOOD}:app.vue"], text=True)
    if "sendFunnelFreeText" not in raw or len(raw) < 10000:
        raise SystemExit("restored app.vue looks truncated")
    return raw


def apply_video_consult_fix(s: str) -> str:
    old_parse = """  if (/\\b30\\s*min/.test(t) || /\\bmeia\\s*hora\\b/.test(t) || /\\b30m\\b/.test(t) || t.trim() === '30') {
    return { key: 'vid_30', label: 'Videochamada 30 min', price: '229,90', min: 30 }
  }
  if (/\\b20\\s*min/.test(t) || /\\b20m\\b/.test(t) || t.trim() === '20') {
    return { key: 'vid_20', label: 'Videochamada 20 min', price: '149,90', min: 20 }
  }
  if (/\\b10\\s*min/.test(t) || /\\b10m\\b/.test(t) || t.trim() === '10') {
    return { key: 'vid_10', label: 'Videochamada 10 min', price: '99,90', min: 10 }
  }"""

    new_parse = """  const bareDur = (n: string) => new RegExp(
    '(?:^|\\b)(?:so(?:\\s+o)?\\s+|quero(?:\\s+o)?\\s+|vou(?:\\s+de)?\\s+)?' + n + '(?:\\s*min(?:utos?)?|min|m)?\\b'
  )
  if (/\\b30\\s*min/.test(t) || /\\bmeia\\s*hora\\b/.test(t) || /\\b30m\\b/.test(t) || /\\b30min\\b/.test(t) || t.trim() === '30' || bareDur('30').test(t)) {
    return { key: 'vid_30', label: 'Videochamada 30 min', price: '229,90', min: 30 }
  }
  if (/\\b20\\s*min/.test(t) || /\\b20m\\b/.test(t) || /\\b20min\\b/.test(t) || t.trim() === '20' || bareDur('20').test(t)) {
    return { key: 'vid_20', label: 'Videochamada 20 min', price: '149,90', min: 20 }
  }
  if (/\\b10\\s*min/.test(t) || /\\b10m\\b/.test(t) || /\\b10min\\b/.test(t) || t.trim() === '10' || bareDur('10').test(t)) {
    return { key: 'vid_10', label: 'Videochamada 10 min', price: '99,90', min: 10 }
  }"""

    if old_parse not in s:
        if "video_consult_typed" in s and "bareDur" in s:
            print("parse already patched")
        else:
            raise SystemExit("parse 10/20/30 block not found")
    else:
        s = s.replace(old_parse, new_parse, 1)

    old_consult = """  if (funnelStep.value === 'video_consult') {
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

    new_consult = """  if (funnelStep.value === 'video_consult') {
    const choice = resolveVideoChoiceFromContext(lower) || parseVideoCallChoice(lower)
    if (choice) {
      selectedPack.value = { key: choice.key, label: choice.label, price: choice.price }
      videoCallPurchasedMin.value = choice.min
      track('whatsapp_funnel_select', { offer_slug: choice.key, source: 'video_consult_typed' })
      await funnelTypeParts(`Fechado: ${choice.label} por R$ ${choice.price}.|||Vou preparar o PIX pra você.`, 1000)
      await startFunnelCheckout()
      return
    }
    // only if NO duration in message:
    funnelStep.value = 'video'
    await funnelType(
      'Entendi o clima que você quer 😈\\n\\nPra gente fazer isso ao vivo, escolhe o tempo:\\n\\n• 10 min  R$ 99,90\\n• 20 min  R$ 149,90\\n• 30 min  R$ 229,90\\n• 1 hora  R$ 399,90\\n• 90 min  R$ 549,90\\n• 2 horas  R$ 699,90\\n• 3 horas  R$ 999,90\\n\\nMe fala qual encaixa melhor pra você agora — ou se prefere outro tempo.',
      1800,
    )
    return
  }"""

    if old_consult not in s:
        if "source: 'video_consult_typed'" in s:
            print("video_consult already patched")
        else:
            raise SystemExit("video_consult block not found")
    else:
        s = s.replace(old_consult, new_consult, 1)
    return s


def main() -> None:
    s = restore_full_app()
    s = apply_video_consult_fix(s)
    APP.write_text(s, encoding="utf-8")
    print(f"wrote app.vue ({len(s)} bytes)")


if __name__ == "__main__":
    main()
