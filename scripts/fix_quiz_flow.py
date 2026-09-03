#!/usr/bin/env python3
"""Simplify qualification quiz: first question is Privacy/PrivSex/VIP only."""
from pathlib import Path

APP = Path("app.vue")
text = APP.read_text(encoding="utf-8")

# --- questionText ---
old_qt = """const questionText = (g: 1 | 2 | 3 | 4) => {
  if (g === 1) return 'Oi 😊 Você já pagou por conteúdo de alguma criadora?'
  if (g === 2) return 'Você costuma ver só as prévias grátis ou já tem costume de entrar no VIP?'
  if (g === 3) return 'Você já me conhece pelo Instagram?'
  return 'Você já assinou Privacy, PrivSex ou VIP de alguma criadora?'
}"""
new_qt = """const questionText = (g: 1 | 2) => {
  if (g === 1) return 'Oi 😊 Você já assinou Privacy, PrivSex ou VIP de alguma criadora?'
  return 'Você já me conhece pelo Instagram?'
}"""
if old_qt not in text:
    raise SystemExit('questionText block not found')
text = text.replace(old_qt, new_qt, 1)

# --- quizOptions ---
old_qo = """const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: 'Sim, já paguei', variant: 'wa-quick--yes' }, { key: 'no', label: 'Nunca paguei', variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'vip', label: 'Já entro / quero VIP', variant: 'wa-quick--yes' }, { key: 'previas', label: 'Só vejo prévia grátis', variant: 'wa-quick--no' }]
  if (gate.value === 3) return [{ key: 'yes', label: 'Sim', variant: 'wa-quick--yes' }, { key: 'no', label: 'Não', variant: 'wa-quick--no' }]
  if (gate.value === 4) return [{ key: 'yes', label: 'Sim, já assinei', variant: 'wa-quick--yes' }, { key: 'no', label: 'Nunca assinei nada', variant: 'wa-quick--no' }]
  return []
})"""
new_qo = """const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: 'Sim, já assinei', variant: 'wa-quick--yes' }, { key: 'no', label: 'Nunca assinei nada', variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: 'Sim', variant: 'wa-quick--yes' }, { key: 'no', label: 'Não', variant: 'wa-quick--no' }]
  return []
})"""
if old_qo not in text:
    raise SystemExit('quizOptions block not found')
text = text.replace(old_qo, new_qo, 1)

# --- answerQuiz ---
old_aq = """function answerQuiz(key: string) {
  if (isTyping.value) return
  const label = quizOptions.value.find((o) => o.key === key)?.label || key
  pushMsg('me', label)
  if (gate.value === 1) {
    quizAnswers.value.q1 = key === 'yes' ? 'pagou_sim' : 'pagou_nao'
    const next = key === 'yes' ? 3 : 2
    setGate(next as 2 | 3)
    typeThenAsk(questionText(next as 2 | 3), 1100)
    return
  }
  if (gate.value === 2) {
    quizAnswers.value.q2 = key === 'previas' ? 'so_previas' : 'desejo_vip'
    if (key === 'previas') {
      setGate('reject', true)
      typeThenAsk('Obrigada. Este espaço é só pra quem compra. Quem só quer prévia grátis não é o perfil que eu atendo.', 1400)
    } else {
      setGate(3)
      typeThenAsk(questionText(3), 1100)
    }
    return
  }
  if (gate.value === 3) {
    quizAnswers.value.q3 = key === 'yes' ? 'conhece_sim' : 'conhece_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk('Obrigada. Você não é o tipo de pessoa que estou procurando.', 1200)
    } else {
      setGate(4)
      typeThenAsk(questionText(4), 1100)
    }
    return
  }
  if (gate.value === 4) {
    quizAnswers.value.q4 = key === 'yes' ? 'assinou_sim' : 'assinou_nao'
    if (key === 'yes') {
      pushMsg('her', 'Perfeito. Entrando…')
      setTimeout(() => setGate('pass', true), 700)
    } else {
      setGate('reject', true)
      typeThenAsk('Obrigada. Este espaço é exclusivo pra quem já valoriza conteúdo pago. Não libero acesso pra quem nunca assinou nada.', 1400)
    }
  }
}"""
new_aq = """function answerQuiz(key: string) {
  if (isTyping.value) return
  const label = quizOptions.value.find((o) => o.key === key)?.label || key
  pushMsg('me', label)
  if (gate.value === 1) {
    quizAnswers.value.q1 = key === 'yes' ? 'assinou_sim' : 'assinou_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk('Obrigada. Este espaço é exclusivo pra quem já valoriza conteúdo pago. Não libero acesso pra quem nunca assinou nada.', 1400)
    } else {
      setGate(2)
      typeThenAsk(questionText(2), 1100)
    }
    return
  }
  if (gate.value === 2) {
    quizAnswers.value.q2 = key === 'yes' ? 'conhece_sim' : 'conhece_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk('Obrigada. Você não é o tipo de pessoa que estou procurando.', 1200)
    } else {
      pushMsg('her', 'Perfeito. Entrando…')
      setTimeout(() => setGate('pass', true), 700)
    }
  }
}"""
if old_aq not in text:
    raise SystemExit('answerQuiz block not found')
text = text.replace(old_aq, new_aq, 1)

# --- gate type refs (simplify 1|2|3|4 -> 1|2 where safe) ---
text = text.replace(
    "const gate = ref<1 | 2 | 3 | 4 | 'pass' | 'reject' | null>(null)",
    "const gate = ref<1 | 2 | 'pass' | 'reject' | null>(null)",
    1,
)
text = text.replace(
    "function setGate(next: 1 | 2 | 3 | 4 | 'pass' | 'reject', persistServer = false)",
    "function setGate(next: 1 | 2 | 'pass' | 'reject', persistServer = false)",
    1,
)

# Template: only gates 1 and 2 (not 3/4)
old_v_if = "v-if=\"gateReady && (gate === 1 || gate === 2 || gate === 3 || gate === 4 || gate === 'reject')\""
new_v_if = "v-if=\"gateReady && (gate === 1 || gate === 2 || gate === 'reject')\""
if old_v_if not in text:
    raise SystemExit('template gate v-if not found')
text = text.replace(old_v_if, new_v_if, 1)

# onMounted restore + start
old_restore = """  if (restored === 'pass' || restored === 'reject') gate.value = restored
  else if (restored === '1' || restored === '2' || restored === '3' || restored === '4') gate.value = Number(restored) as 1 | 2 | 3 | 4"""
new_restore = """  if (restored === 'pass' || restored === 'reject') gate.value = restored
  else if (restored === '1' || restored === '2') gate.value = Number(restored) as 1 | 2
  else if (restored === '3' || restored === '4') gate.value = 1 // old multi-step progress -> restart simplified flow"""
if old_restore not in text:
    raise SystemExit('restore block not found')
text = text.replace(old_restore, new_restore, 1)

old_start = """  if (gate.value === 1 || gate.value === 2 || gate.value === 3 || gate.value === 4) {
    chatMessages.value = []
    typeThenAsk(questionText(gate.value as 1 | 2 | 3 | 4), 800)
  } else if (gate.value === 'reject') {"""
new_start = """  if (gate.value === 1 || gate.value === 2) {
    chatMessages.value = []
    typeThenAsk(questionText(gate.value as 1 | 2), 800)
  } else if (gate.value === 'reject') {"""
if old_start not in text:
    raise SystemExit('start block not found')
text = text.replace(old_start, new_start, 1)

APP.write_text(text, encoding="utf-8")
print("quiz flow simplified ok")
