#!/usr/bin/env python3
"""Restore app.vue if broken, then apply 4-step commercial quiz flow.

Flow:
  0. Age (legal filter)
  1. Interest (pack / sexting / videochamada)
  2. Ticket (accepts R$49,90?)
  3. Moment (now / today / later / browsing)
  4. Purchase intent (yes → QUALIFIED → WhatsApp)
Only fully qualified leads reach commercial WhatsApp.
"""
from __future__ import annotations

import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app.vue"
GOOD_SHA = "71a019c5ce453e583d7cb294b377c57ef7c475d0"
RAW_URL = f"https://raw.githubusercontent.com/isabelarocha001/links/{GOOD_SHA}/app.vue"


def restore_if_needed() -> str:
    text = APP.read_text(encoding="utf-8") if APP.exists() else ""
    # Broken if tiny or missing quiz markers
    if len(text) < 50_000 or "function iqAnswer" not in text:
        print(f"app.vue looks broken (len={len(text)}) — restoring from {GOOD_SHA}")
        try:
            text = subprocess.check_output(
                ["git", "show", f"{GOOD_SHA}:app.vue"],
                cwd=ROOT,
            ).decode("utf-8")
        except Exception:
            print("git show failed, fetching raw…")
            with urllib.request.urlopen(RAW_URL, timeout=60) as r:
                text = r.read().decode("utf-8")
        APP.write_text(text, encoding="utf-8")
        print(f"restored, bytes={len(text)}")
    return text


def apply(text: str) -> str:
    # --- iqAnswers ---
    old = """const iqAnswers = reactive({
  age: '' as string,
  intent: '' as string,
  ticket: '' as string,
  pay: '' as string,
})"""
    new = """const iqAnswers = reactive({
  age: '' as string,
  interest: '' as string,
  ticket: '' as string,
  moment: '' as string,
  purchase: '' as string,
})"""
    if old not in text:
        if "interest: '' as string" in text and "purchase: '' as string" in text:
            print("iqAnswers already patched")
        else:
            raise SystemExit("iqAnswers block not found")
    else:
        text = text.replace(old, new, 1)

    # --- progress / questions / options ---
    old = """const iqProgressLabel = computed(() => `ETAPA ${iqStep.value + 1} DE 4`)
const iqHeaderTitle = computed(() => {
  if (iqPhase.value === 'result') return 'Qualificado'
  if (iqPhase.value === 'reject' || iqPhase.value === 'soft') return 'Aviso'
  return ['Maioridade', 'Intenção', 'Investimento', 'Liberação'][iqStep.value] || ''
})
const iqQuestionText = computed(() => {
  return [
    'Você tem 18 anos ou mais? 🔞',
    'O que você quer comigo? 👀',
    'Meus pacotes começam a partir de R$ 49,90. O que você quer?',
    'Como você quer pagar?',
  ][iqStep.value] || ''
})
const iqCurrentOptions = computed((): IqOpt[] => {
  if (iqStep.value === 0) {
    return [
      { id: 'yes18', label: 'Sim, tenho 18 anos ou mais' },
      { id: 'no18', label: 'Não, sou menor de 18' },
    ]
  }
  if (iqStep.value === 1) {
    return [
      { id: 'private', label: 'Quero ver suas fotos e vídeos' },
      { id: 'custom', label: 'Quero foto/vídeo feito pra mim' },
      { id: 'sexting', label: 'Quero putaria no chat (sexting)' },
      { id: 'call', label: 'Quero chamada de vídeo ou voz' },
      { id: 'company', label: 'Quero só conversar online' },
      { id: 'meet', label: 'Quero te ver pessoalmente' },
      { id: 'looking', label: 'Só estou olhando, não quero nada' },
    ]
  }
  if (iqStep.value === 2) {
    return [
      { id: 'from4990', label: 'Ok, a partir de R$ 49,90' },
      { id: 'custom_pay', label: 'Quero algo especial (pode ser mais)' },
      { id: 'below', label: 'Só tenho menos de R$ 49,90' },
    ]
  }
  return [
    { id: 'pix', label: 'Vou pagar no PIX' },
    { id: 'card', label: 'Vou pagar no cartão' },
    { id: 'chat_first', label: 'Só quero conversar, sem pagar' },
    { id: 'not_buy', label: 'Não quero comprar agora' },
  ]
})"""

    new = """const iqProgressLabel = computed(() => {
  // step 0 = idade (filtro legal); etapas comerciais = 1..4
  if (iqStep.value === 0) return 'ETAPA 0 DE 4'
  return `ETAPA ${iqStep.value} DE 4`
})
const iqHeaderTitle = computed(() => {
  if (iqPhase.value === 'result') return 'Qualificado'
  if (iqPhase.value === 'reject' || iqPhase.value === 'soft') return 'Aviso'
  return ['Maioridade', 'Interesse', 'Ticket', 'Momento', 'Intenção'][iqStep.value] || ''
})
const iqQuestionText = computed(() => {
  return [
    'Você tem 18 anos ou mais? 🔞',
    'O que você quer? 👀',
    'Os acessos começam em R$ 49,90 🧡\\nTudo bem pra você?',
    'Quando você quer comprar? ⏰',
    'Você quer falar comigo para comprar? 🧡',
  ][iqStep.value] || ''
})
const iqCurrentOptions = computed((): IqOpt[] => {
  if (iqStep.value === 0) {
    return [
      { id: 'yes18', label: 'Sim, tenho 18 anos ou mais' },
      { id: 'no18', label: 'Não, sou menor de 18' },
    ]
  }
  // ETAPA 1 — INTERESSE
  if (iqStep.value === 1) {
    return [
      { id: 'photo_video_pack', label: '📸 Pack de fotos e vídeos' },
      { id: 'sexting', label: '💬 Sexting' },
      { id: 'videochamada', label: '📹 Videochamada' },
    ]
  }
  // ETAPA 2 — TICKET
  if (iqStep.value === 2) {
    return [
      { id: 'yes_ticket', label: '✅ Sim' },
      { id: 'no_ticket', label: '❌ Não' },
    ]
  }
  // ETAPA 3 — MOMENTO
  if (iqStep.value === 3) {
    return [
      { id: 'now', label: '🔥 Agora' },
      { id: 'today', label: '🧡 Hoje' },
      { id: 'later', label: '🕐 Outro dia' },
      { id: 'browsing', label: '👀 Só estou olhando' },
    ]
  }
  // ETAPA 4 — INTENÇÃO DE COMPRA
  return [
    { id: 'buy_yes', label: '🔥 Sim, quero comprar' },
    { id: 'buy_no', label: '❌ Não quero comprar agora' },
  ]
})"""

    if old not in text:
        if "photo_video_pack" in text and "buy_yes" in text:
            print("options already patched")
        else:
            raise SystemExit("progress/options block not found")
    else:
        text = text.replace(old, new, 1)

    # --- reset ---
    old = """function iqResetState() {
  iqPhase.value = 'welcome'
  iqStep.value = 0
  iqRejectMsg.value = ''
  iqAnswers.age = ''
  iqAnswers.intent = ''
  iqAnswers.ticket = ''
  iqAnswers.pay = ''
  iqMaxStepReached.value = 0
}"""
    new = """function iqResetState() {
  iqPhase.value = 'welcome'
  iqStep.value = 0
  iqRejectMsg.value = ''
  iqAnswers.age = ''
  iqAnswers.interest = ''
  iqAnswers.ticket = ''
  iqAnswers.moment = ''
  iqAnswers.purchase = ''
  iqMaxStepReached.value = 0
}"""
    if old not in text:
        if "iqAnswers.interest = ''" in text:
            print("reset already patched")
        else:
            raise SystemExit("iqResetState not found")
    else:
        text = text.replace(old, new, 1)

    # --- answer ---
    old = """function iqAnswer(opt: IqOpt) {
  if (iqPhase.value !== 'quiz') return
  if (iqStep.value > iqMaxStepReached.value) iqMaxStepReached.value = iqStep.value
  iqTrack('quiz_answer', { option: opt.id, step: iqStep.value })

  // Etapa 1 — maioridade
  if (iqStep.value === 0) {
    iqAnswers.age = opt.id
    if (opt.id === 'no18') {
      iqDisqualify('disqualified_underage', 'Só pode quem tem 18 anos ou mais. 🔞')
      return
    }
    iqStep.value = 1
    iqMaxStepReached.value = 1
    return
  }

  // Etapa 2 — intenção
  if (iqStep.value === 1) {
    iqAnswers.intent = opt.id
    if (opt.id === 'meet') {
      iqDisqualify(
        'disqualified_meeting',
        'Eu NÃO saio com cliente.\\nNão faço encontro.\\nSó vendo conteúdo pela internet 🧡',
      )
      return
    }
    if (opt.id === 'looking') {
      iqDisqualify(
        'disqualified_browsing',
        'Beleza.\\nQuando quiser comprar conteúdo, volta aqui 💕',
        true,
      )
      return
    }
    // private | custom | sexting | call | company → segue
    iqStep.value = 2
    iqMaxStepReached.value = 2
    return
  }

  // Etapa 3 — ticket
  if (iqStep.value === 2) {
    iqAnswers.ticket = opt.id
    if (opt.id === 'below') {
      iqDisqualify(
        'disqualified_low_ticket',
        'O mínimo é R$ 49,90.\\nMenos que isso eu não atendo.',
      )
      return
    }
    iqStep.value = 3
    iqMaxStepReached.value = 3
    return
  }

  // Etapa 4 — PIX/cartão qualificam; sem compra → soft reject
  if (iqStep.value === 3) {
    iqAnswers.pay = opt.id
    if (opt.id === 'chat_first' || opt.id === 'not_buy') {
      iqDisqualify(
        'disqualified_no_purchase_intent',
        'O WhatsApp é só pra quem vai comprar.\\nOlha o site com calma e volta depois 💕',
        true,
      )
      return
    }
    // pix | card → qualificado
    iqPhase.value = 'result'
    iqTrack('qualified', { answers: { ...iqAnswers } })
  }
}"""

    new = """function iqAnswer(opt: IqOpt) {
  if (iqPhase.value !== 'quiz') return
  if (iqStep.value > iqMaxStepReached.value) iqMaxStepReached.value = iqStep.value
  iqTrack('quiz_answer', { option: opt.id, step: iqStep.value })

  // Filtro legal — maioridade (não conta como etapa comercial)
  if (iqStep.value === 0) {
    iqAnswers.age = opt.id
    if (opt.id === 'no18') {
      iqDisqualify('disqualified_underage', 'Só pode quem tem 18 anos ou mais. 🔞')
      return
    }
    iqStep.value = 1
    iqMaxStepReached.value = 1
    return
  }

  // ETAPA 1 DE 4 — INTERESSE (salva o produto)
  if (iqStep.value === 1) {
    iqAnswers.interest = opt.id
    iqStep.value = 2
    iqMaxStepReached.value = 2
    return
  }

  // ETAPA 2 DE 4 — TICKET
  if (iqStep.value === 2) {
    iqAnswers.ticket = opt.id
    if (opt.id === 'no_ticket') {
      iqDisqualify(
        'disqualified_low_ticket',
        'Os acessos começam em R$ 49,90.\\nAbaixo disso eu não atendo 🧡',
      )
      return
    }
    iqStep.value = 3
    iqMaxStepReached.value = 3
    return
  }

  // ETAPA 3 DE 4 — MOMENTO
  if (iqStep.value === 3) {
    iqAnswers.moment = opt.id
    if (opt.id === 'later') {
      iqDisqualify(
        'disqualified_later',
        'Beleza.\\nQuando for comprar, volta aqui 💕',
        true,
      )
      return
    }
    if (opt.id === 'browsing') {
      iqDisqualify(
        'disqualified_browsing',
        'Beleza.\\nQuando quiser comprar, volta aqui 💕',
        true,
      )
      return
    }
    // now | today → segue
    iqStep.value = 4
    iqMaxStepReached.value = 4
    return
  }

  // ETAPA 4 DE 4 — INTENÇÃO DE COMPRA
  if (iqStep.value === 4) {
    iqAnswers.purchase = opt.id
    if (opt.id === 'buy_no') {
      iqDisqualify(
        'disqualified_no_purchase_intent',
        'O WhatsApp é só pra quem vai comprar.\\nOlha o site com calma e volta depois 💕',
        true,
      )
      return
    }
    // buy_yes → QUALIFIED → WhatsApp
    iqPhase.value = 'result'
    iqTrack('qualified', { answers: { ...iqAnswers } })
  }
}"""

    if old not in text:
        if "ETAPA 1 DE 4 — INTERESSE" in text:
            print("iqAnswer already patched")
        else:
            raise SystemExit("iqAnswer not found")
    else:
        text = text.replace(old, new, 1)

    # --- WA message ---
    old = """function iqBuildWaMessage(): string {
  const intentMap: Record<string, string> = {
    private: 'ver suas fotos e vídeos',
    custom: 'foto/vídeo feito pra mim',
    sexting: 'putaria no chat',
    call: 'chamada de vídeo ou voz',
    company: 'conversar online',
  }
  const ticketMap: Record<string, string> = {
    from4990: 'Aceito a partir de R$49,90',
    custom_pay: 'Quero algo especial',
  }
  const payMap: Record<string, string> = {
    pix: 'Vou pagar no PIX',
    card: 'Vou pagar no cartão',
  }
  const intent = intentMap[iqAnswers.intent] || 'conteúdo'
  const ticket = ticketMap[iqAnswers.ticket] || 'vi que as opções começam em R$49,90'
  const pay = payMap[iqAnswers.pay] || 'quero ver as opções'
  return `Oi 🧡 Vim pelo site. Quero ${intent}. ${ticket}. ${pay}. Me manda as opções.`
}"""

    new = """function iqBuildWaMessage(): string {
  const interestMap: Record<string, string> = {
    photo_video_pack: 'pack de fotos e vídeos',
    sexting: 'sexting',
    videochamada: 'videochamada',
  }
  const momentMap: Record<string, string> = {
    now: 'quero comprar agora',
    today: 'quero comprar hoje',
  }
  const interest = interestMap[iqAnswers.interest] || 'conteúdo'
  const moment = momentMap[iqAnswers.moment] || 'quero comprar'
  return `Oi 🧡 Vim pelo site (lead qualificado). Quero ${interest}. Aceito a partir de R$49,90. ${moment}. Me manda as opções.`
}"""

    if old not in text:
        if "photo_video_pack: 'pack de fotos e vídeos'" in text:
            print("iqBuildWaMessage already patched")
        else:
            raise SystemExit("iqBuildWaMessage not found")
    else:
        text = text.replace(old, new, 1)

    # --- comments ---
    old = """// QUIZ ICP — qualificação antes do WhatsApp (sem pontuação visível)
// ICP: 18+ AND só online AND ticket >= 49,90 AND intenção comercial
// Número/link do WA NÃO fica no HTML inicial — só após qualified + clique"""
    new = """// QUIZ ICP — qualificação antes do WhatsApp (sem pontuação visível)
// Fluxo: 18+ → Interesse → Ticket R$49,90 → Momento (agora/hoje) → Intenção de compra
// Só lead QUALIFIED cai no WhatsApp do comercial. Número/link do WA só após qualified + clique"""
    if old in text:
        text = text.replace(old, new, 1)

    old = "const iqStep = ref(0) // 0 idade, 1 intenção, 2 ticket, 3 pagamento"
    new = "const iqStep = ref(0) // 0 idade, 1 interesse, 2 ticket, 3 momento, 4 intenção de compra"
    if old in text:
        text = text.replace(old, new, 1)

    return text


def main() -> None:
    text = restore_if_needed()
    text = apply(text)
    APP.write_text(text, encoding="utf-8")
    print("quiz 4-step flow applied ok, bytes=", len(text))


if __name__ == "__main__":
    main()
