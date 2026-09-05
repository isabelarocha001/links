#!/usr/bin/env python3
"""Restore app.vue if truncated, then apply agreed-duration funnel fix."""
from __future__ import annotations
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app.vue"
GOOD_SHA = "c3bb7c032afb28a2252fb45d0d33f1f1059cde56"


def git_show(path: str) -> str:
    return subprocess.check_output(["git", "show", f"{GOOD_SHA}:{path}"], cwd=ROOT).decode()


def main() -> None:
    text = APP.read_text() if APP.exists() else ""
    if "sendFunnelFreeText" not in text or "parseVideoCallChoice" not in text:
        print("app.vue looks truncated — restoring from", GOOD_SHA)
        text = git_show("app.vue")

    old1 = """  if (funnelStep.value === 'video') {
    return [
      { key: 'vid_10', label: '10 min  R$ 99,90', variant: 'wa-quick--yes' },
"""
    new1 = """  if (funnelStep.value === 'video') {
    // Tempo já combinado: não reoferece a lista — só PIX ou mudar tempo
    if ((selectedPack.value?.key || '').startsWith('vid_')) {
      return [
        { key: 'pix_yes', label: 'Sim, pode mandar o PIX', variant: 'wa-quick--yes' },
        { key: 'change_time', label: 'Mudar tempo', variant: 'wa-quick--no' },
      ]
    }
    return [
      { key: 'vid_10', label: '10 min  R$ 99,90', variant: 'wa-quick--yes' },
"""

    old2 = """      } else if (step === 'video_consult') {
        funnelStep.value = 'video_consult'
      } else if (step === 'video_avulso') {
"""
    new2 = """      } else if (step === 'video_consult') {
        const agreed = parseVideoCallChoice(lower)
        if (agreed || (selectedPack.value?.key || '').startsWith('vid_')) {
          if (agreed) {
            selectedPack.value = { key: agreed.key, label: agreed.label, price: agreed.price }
            videoCallPurchasedMin.value = agreed.min
          }
          try { saveFunnelState() } catch {}
          await startFunnelCheckout()
          return
        }
        funnelStep.value = 'video_consult'
      } else if (step === 'video_avulso') {
"""

    old3 = """  // Depois da consultoria da videochamada: lead descreveu o que quer → aí sim oferece tempo/preço
  if (funnelStep.value === 'video_consult') {
    const consultChoice = parseVideoCallChoice(lower)
    if (consultChoice) {
      await quoteSpecificVideoDuration(consultChoice)
      try { saveFunnelState() } catch {}
      return
    }
"""
    new3 = """  // Depois da consultoria da videochamada: parseia duração ANTES de listar tempos
  if (funnelStep.value === 'video_consult') {
    const consultChoice = parseVideoCallChoice(lower)
    if (consultChoice || (selectedPack.value?.key || '').startsWith('vid_')) {
      if (consultChoice) {
        selectedPack.value = { key: consultChoice.key, label: consultChoice.label, price: consultChoice.price }
        videoCallPurchasedMin.value = consultChoice.min
      }
      try { saveFunnelState() } catch {}
      await startFunnelCheckout()
      return
    }
"""

    old3b = """  // Depois da consultoria da videochamada: lead descreveu o que quer → aí sim oferece tempo/preço
  if (funnelStep.value === 'video_consult') {
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
"""
    new3b = """  // Depois da consultoria da videochamada: parseia duração ANTES de listar tempos
  if (funnelStep.value === 'video_consult') {
    const choice = resolveVideoChoiceFromContext(lower) || parseVideoCallChoice(lower)
    if (choice || (selectedPack.value?.key || '').startsWith('vid_')) {
      if (choice) {
        selectedPack.value = { key: choice.key, label: choice.label, price: choice.price }
        videoCallPurchasedMin.value = choice.min
        track('whatsapp_funnel_select', { offer_slug: choice.key, source: 'video_consult_typed' })
        await funnelTypeParts(`Fechado: ${choice.label} por R$ ${choice.price}.|||Vou preparar o PIX pra você.`, 1000)
      }
      try { saveFunnelState() } catch {}
      await startFunnelCheckout()
      return
    }
    // only if NO duration was agreed yet:
    funnelStep.value = 'video'
"""

    old4 = """    if (step === 'video_consult') funnelStep.value = 'video_consult'
    else if (step === 'video_avulso') funnelStep.value = 'video_avulso'
"""
    new4 = """    if (step === 'video_consult') {
      const agreed = parseVideoCallChoice(lower)
      if (agreed || (selectedPack.value?.key || '').startsWith('vid_')) {
        if (agreed) {
          selectedPack.value = { key: agreed.key, label: agreed.label, price: agreed.price }
          videoCallPurchasedMin.value = agreed.min
        }
        try { saveFunnelState() } catch {}
        await startFunnelCheckout()
        return
      }
      funnelStep.value = 'video_consult'
    }
    else if (step === 'video_avulso') funnelStep.value = 'video_avulso'
"""

    old5 = """  if (opt.key === 'pix_yes') {
"""
    new5 = """  if (opt.key === 'change_time') {
    selectedPack.value = null
    videoCallPurchasedMin.value = 0
    funnelStep.value = 'video'
    await funnelType(
      'Beleza, escolhe o tempo de novo:\\n\\n• 10 min  R$ 99,90\\n• 20 min  R$ 149,90\\n• 30 min  R$ 229,90\\n• 1 hora  R$ 399,90\\n• 90 min  R$ 549,90\\n• 2 horas  R$ 699,90\\n• 3 horas  R$ 999,90',
      1000,
    )
    return
  }

  if (opt.key === 'pix_yes') {
"""

    replacements = [
        (old1, new1, True),
        (old2, new2, True),
        (old3, new3, False),
        (old3b, new3b, False),
        (old4, new4, True),
        (old5, new5, False),
    ]

    for old, new, required in replacements:
        if old in text:
            text = text.replace(old, new, 1)
        elif new.strip()[:40] in text:
            print("already applied:", old[:50])
        elif required:
            raise SystemExit(f"pattern not found: {old[:80]!r}")

    APP.write_text(text)
    print("wrote", APP, "bytes", len(text))


if __name__ == "__main__":
    main()
