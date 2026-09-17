#!/usr/bin/env python3
"""Remove age gate from ICP quiz — ads already target 18+.

Steps become exactly:
  0 Interest
  1 Ticket R$49,90
  2 Moment
  3 Purchase intent → QUALIFIED → WhatsApp
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app.vue"


def main() -> None:
    text = APP.read_text(encoding="utf-8")

    # --- iqAnswers: drop age ---
    old = """const iqAnswers = reactive({
  age: '' as string,
  interest: '' as string,
  ticket: '' as string,
  moment: '' as string,
  purchase: '' as string,
})"""
    new = """const iqAnswers = reactive({
  interest: '' as string,
  ticket: '' as string,
  moment: '' as string,
  purchase: '' as string,
})"""
    if old in text:
        text = text.replace(old, new, 1)
    elif "age: '' as string" in text and "interest: '' as string" in text:
        text = text.replace("  age: '' as string,\n", "", 1)
    else:
        print("iqAnswers: skip or already without age")

    # --- step comment ---
    for old_c, new_c in [
        (
            "const iqStep = ref(0) // 0 idade, 1 interesse, 2 ticket, 3 momento, 4 intenção de compra",
            "const iqStep = ref(0) // 0 interesse, 1 ticket, 2 momento, 3 intenção de compra",
        ),
        (
            "const iqStep = ref(0) // 0 idade, 1 intenção, 2 ticket, 3 pagamento",
            "const iqStep = ref(0) // 0 interesse, 1 ticket, 2 momento, 3 intenção de compra",
        ),
    ]:
        if old_c in text:
            text = text.replace(old_c, new_c, 1)

    # --- progress / questions / options ---
    start = text.find("const iqProgressLabel = computed")
    if start < 0:
        raise SystemExit("iqProgressLabel not found")
    end = text.find("function iqTrack", start)
    if end < 0:
        end = text.find("function iqResetState", start)
    if end < 0:
        raise SystemExit("end marker not found after options")

    new_block = """const iqProgressLabel = computed(() => `ETAPA ${iqStep.value + 1} DE 4`)
const iqHeaderTitle = computed(() => {
  if (iqPhase.value === 'result') return 'Qualificado'
  if (iqPhase.value === 'reject' || iqPhase.value === 'soft') return 'Aviso'
  return ['Interesse', 'Ticket', 'Momento', 'Intenção'][iqStep.value] || ''
})
const iqQuestionText = computed(() => {
  return [
    'O que você quer? 👀',
    'Os acessos começam em R$ 49,90 🧡\\nTudo bem pra você?',
    'Quando você quer comprar? ⏰',
    'Você quer falar comigo para comprar? 🧡',
  ][iqStep.value] || ''
})
const iqCurrentOptions = computed((): IqOpt[] => {
  // ETAPA 1 — INTERESSE
  if (iqStep.value === 0) {
    return [
      { id: 'photo_video_pack', label: '📸 Pack de fotos e vídeos' },
      { id: 'sexting', label: '💬 Sexting' },
      { id: 'videochamada', label: '📹 Videochamada' },
    ]
  }
  // ETAPA 2 — TICKET
  if (iqStep.value === 1) {
    return [
      { id: 'yes_ticket', label: '✅ Sim' },
      { id: 'no_ticket', label: '❌ Não' },
    ]
  }
  // ETAPA 3 — MOMENTO
  if (iqStep.value === 2) {
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
})

"""
    text = text[:start] + new_block + text[end:]

    # --- reset: drop age ---
    old = """function iqResetState() {
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
    new = """function iqResetState() {
  iqPhase.value = 'welcome'
  iqStep.value = 0
  iqRejectMsg.value = ''
  iqAnswers.interest = ''
  iqAnswers.ticket = ''
  iqAnswers.moment = ''
  iqAnswers.purchase = ''
  iqMaxStepReached.value = 0
}"""
    if old in text:
        text = text.replace(old, new, 1)
    else:
        text = text.replace("  iqAnswers.age = ''\n", "")

    # --- iqAnswer ---
    start = text.find("function iqAnswer(opt: IqOpt)")
    if start < 0:
        raise SystemExit("iqAnswer not found")
    end = text.find("function iqBuildWaMessage", start)
    if end < 0:
        raise SystemExit("iqBuildWaMessage not found after iqAnswer")

    new_answer = """function iqAnswer(opt: IqOpt) {
  if (iqPhase.value !== 'quiz') return
  if (iqStep.value > iqMaxStepReached.value) iqMaxStepReached.value = iqStep.value
  iqTrack('quiz_answer', { option: opt.id, step: iqStep.value })

  // ETAPA 1 DE 4 — INTERESSE (salva o produto)
  if (iqStep.value === 0) {
    iqAnswers.interest = opt.id
    iqStep.value = 1
    iqMaxStepReached.value = 1
    return
  }

  // ETAPA 2 DE 4 — TICKET
  if (iqStep.value === 1) {
    iqAnswers.ticket = opt.id
    if (opt.id === 'no_ticket') {
      iqDisqualify(
        'disqualified_low_ticket',
        'Os acessos começam em R$ 49,90.\\nAbaixo disso eu não atendo 🧡',
      )
      return
    }
    iqStep.value = 2
    iqMaxStepReached.value = 2
    return
  }

  // ETAPA 3 DE 4 — MOMENTO
  if (iqStep.value === 2) {
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
    iqStep.value = 3
    iqMaxStepReached.value = 3
    return
  }

  // ETAPA 4 DE 4 — INTENÇÃO DE COMPRA
  if (iqStep.value === 3) {
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
}

"""
    text = text[:start] + new_answer + text[end:]

    text = text.replace(
        "// Fluxo: 18+ → Interesse → Ticket R$49,90 → Momento (agora/hoje) → Intenção de compra",
        "// Fluxo: Interesse → Ticket R$49,90 → Momento (agora/hoje) → Intenção de compra (anúncio já filtra 18+)",
    )
    text = text.replace(
        "// ICP: 18+ AND só online AND ticket >= 49,90 AND intenção comercial",
        "// ICP: ticket >= 49,90 AND intenção comercial (anúncio já filtra 18+)",
    )

    APP.write_text(text, encoding="utf-8")
    print("age gate removed ok, bytes=", len(text))
    assert "photo_video_pack" in text
    print("sanity ok")


if __name__ == "__main__":
    main()
