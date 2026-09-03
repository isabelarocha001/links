#!/usr/bin/env python3
"""Add intent question (VIP / precos / so olhando) as gate 3."""
from pathlib import Path

APP = Path("app.vue")
text = APP.read_text(encoding="utf-8")

# template v-if
old_vif = 'v-if="gateReady && (gate === 1 || gate === 2 || gate === \'reject\')"'
new_vif = 'v-if="gateReady && (gate === 1 || gate === 2 || gate === 3 || gate === \'reject\')"'
if old_vif not in text:
    raise SystemExit("template v-if not found")
text = text.replace(old_vif, new_vif, 1)

# gate ref type
old_gate = "const gate = ref<1 | 2 | 'pass' | 'reject' | null>(null)"
new_gate = "const gate = ref<1 | 2 | 3 | 'pass' | 'reject' | null>(null)"
if old_gate not in text:
    raise SystemExit("gate ref not found")
text = text.replace(old_gate, new_gate, 1)

# setGate type
old_sg = "function setGate(next: 1 | 2 | 'pass' | 'reject', persistServer = false)"
new_sg = "function setGate(next: 1 | 2 | 3 | 'pass' | 'reject', persistServer = false)"
if old_sg not in text:
    raise SystemExit("setGate not found")
text = text.replace(old_sg, new_sg, 1)

# questionText
old_qt = """const questionText = (g: 1 | 2) => {
  if (g === 1) return 'Oi 😊 Você já assinou Privacy, PrivSex ou VIP de alguma criadora?'
  return 'Você já me conhece pelo Instagram?'
}"""
new_qt = """const questionText = (g: 1 | 2 | 3) => {
  if (g === 1) return 'Oi 😊 Você já assinou Privacy, PrivSex ou VIP de alguma criadora?'
  if (g === 2) return 'Você já me conhece pelo Instagram?'
  return 'O que você busca aqui agora?'
}"""
if old_qt not in text:
    raise SystemExit("questionText not found")
text = text.replace(old_qt, new_qt, 1)

# quizOptions
old_qo = """const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: 'Sim, já assinei', variant: 'wa-quick--yes' }, { key: 'no', label: 'Nunca assinei nada', variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: 'Sim', variant: 'wa-quick--yes' }, { key: 'no', label: 'Não', variant: 'wa-quick--no' }]
  return []
})"""
new_qo = """const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: 'Sim, já assinei', variant: 'wa-quick--yes' }, { key: 'no', label: 'Nunca assinei nada', variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: 'Sim', variant: 'wa-quick--yes' }, { key: 'no', label: 'Não', variant: 'wa-quick--no' }]
  if (gate.value === 3) return [
    { key: 'assinar', label: 'Quero assinar o VIP hoje', variant: 'wa-quick--yes' },
    { key: 'precos', label: 'Quero ver preços / opções', variant: 'wa-quick--yes' },
    { key: 'olhando', label: 'Só estou olhando', variant: 'wa-quick--no' },
  ]
  return []
})"""
if old_qo not in text:
    raise SystemExit("quizOptions not found")
text = text.replace(old_qo, new_qo, 1)

# answerQuiz
old_aq = """function answerQuiz(key: string) {
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
      setGate(3)
      typeThenAsk(questionText(3), 1100)
    }
    return
  }
  if (gate.value === 3) {
    const intentMap: Record<string, string> = {
      assinar: 'intent_assinar_hoje',
      precos: 'intent_ver_precos',
      olhando: 'intent_so_olhando',
    }
    quizAnswers.value.q3 = intentMap[key] || key
    try { localStorage.setItem('wanessa_intent', quizAnswers.value.q3) } catch {}
    if (key === 'olhando') {
      // Lead frio: libera página, mas avisa que o foco é quem compra
      pushMsg('her', 'Beleza. Vou te mostrar as opções — o VIP e o privado são pra quem já decide.')
      setTimeout(() => setGate('pass', true), 900)
    } else if (key === 'assinar') {
      pushMsg('her', 'Perfeito. Vou te levar pro bot VIP e às opções de compra…')
      setTimeout(() => setGate('pass', true), 800)
    } else {
      pushMsg('her', 'Perfeito. Entrando nas opções e valores…')
      setTimeout(() => setGate('pass', true), 800)
    }
  }
}"""
if old_aq not in text:
    raise SystemExit("answerQuiz not found")
text = text.replace(old_aq, new_aq, 1)

# restore progress
old_restore = """  if (restored === 'pass' || restored === 'reject') gate.value = restored
  else if (restored === '1' || restored === '2') gate.value = Number(restored) as 1 | 2
  else if (restored === '3' || restored === '4') gate.value = 1 // old multi-step progress -> restart simplified flow"""
new_restore = """  if (restored === 'pass' || restored === 'reject') gate.value = restored
  else if (restored === '1' || restored === '2' || restored === '3') gate.value = Number(restored) as 1 | 2 | 3
  else if (restored === '4') gate.value = 1 // legacy progress -> restart"""
if old_restore not in text:
    raise SystemExit("restore block not found")
text = text.replace(old_restore, new_restore, 1)

# onMounted start
old_start = """  if (gate.value === 1 || gate.value === 2) {
    chatMessages.value = []
    typeThenAsk(questionText(gate.value as 1 | 2), 800)
  } else if (gate.value === 'reject') {"""
new_start = """  if (gate.value === 1 || gate.value === 2 || gate.value === 3) {
    chatMessages.value = []
    typeThenAsk(questionText(gate.value as 1 | 2 | 3), 800)
  } else if (gate.value === 'reject') {"""
if old_start not in text:
    raise SystemExit("start block not found")
text = text.replace(old_start, new_start, 1)

APP.write_text(text, encoding="utf-8")
print("intent question added ok")
