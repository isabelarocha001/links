#!/usr/bin/env python3
"""Add pay-willingness question: yes continue, no reject. Intent becomes gate 4."""
from pathlib import Path

APP = Path("app.vue")
I18N = Path("utils/i18n.ts")
app = APP.read_text(encoding="utf-8")
i18n = I18N.read_text(encoding="utf-8")

# --- i18n keys (pt + en; other langs inherit en via spread already for some — add to pt and en at minimum) ---
pt_keys = """  q3olhando: 'Só estou olhando',
  rejectNever:"""

if "qPay:" not in i18n:
    # Insert after q3olhando in pt block
    needle = "  q3olhando: 'Só estou olhando',\n"
    if needle not in i18n:
        raise SystemExit("pt q3olhando not found")
    i18n = i18n.replace(
        needle,
        "  q3olhando: 'Só estou olhando',\n"
        "  qPay: 'Você estaria disposto a pagar por conteúdo exclusivo de uma criadora como eu?',\n"
        "  qPayYes: 'Sim, estou disposto',\n"
        "  qPayNo: 'Não, não pagaria',\n"
        "  rejectPay: 'Obrigada. Este espaço é só pra quem valoriza e investe em conteúdo exclusivo.',\n",
        1,
    )
    needle_en = "  q3olhando: 'Just browsing',\n"
    if needle_en not in i18n:
        raise SystemExit("en q3olhando not found")
    i18n = i18n.replace(
        needle_en,
        "  q3olhando: 'Just browsing',\n"
        "  qPay: 'Would you be willing to pay for exclusive content from a creator like me?',\n"
        "  qPayYes: 'Yes, I would',\n"
        "  qPayNo: 'No, I would not pay',\n"
        "  rejectPay: 'Thanks. This space is only for people who value and invest in exclusive content.',\n",
        1,
    )
    # Spanish
    if "  q3olhando: 'Solo estoy mirando',\n" in i18n:
        i18n = i18n.replace(
            "  q3olhando: 'Solo estoy mirando',\n",
            "  q3olhando: 'Solo estoy mirando',\n"
            "  qPay: '¿Estarías dispuesto a pagar por contenido exclusivo de una creadora como yo?',\n"
            "  qPayYes: 'Sí, estaría dispuesto',\n"
            "  qPayNo: 'No, no pagaría',\n"
            "  rejectPay: 'Gracias. Este espacio es solo para quien valora e invierte en contenido exclusivo.',\n",
            1,
        )
    I18N.write_text(i18n, encoding="utf-8")

# --- template gate condition ---
app = app.replace(
    "v-if=\"gateReady && (gate === 1 || gate === 2 || gate === 3 || gate === 'reject')\"",
    "v-if=\"gateReady && (gate === 1 || gate === 2 || gate === 3 || gate === 4 || gate === 'reject')\"",
    1,
)

# gate type
app = app.replace(
    "const gate = ref<1 | 2 | 3 | 'pass' | 'reject' | null>(null)",
    "const gate = ref<1 | 2 | 3 | 4 | 'pass' | 'reject' | null>(null)",
    1,
)

# questionText
old_qt = """const questionText = (g: 1 | 2 | 3) => {
  if (g === 1) return t('q1')
  if (g === 2) return t('q2')
  return t('q3')
}"""
new_qt = """const questionText = (g: 1 | 2 | 3 | 4) => {
  if (g === 1) return t('q1')
  if (g === 2) return t('q2')
  if (g === 3) return t('qPay')
  return t('q3')
}"""
if old_qt not in app:
    raise SystemExit("questionText not found")
app = app.replace(old_qt, new_qt, 1)

# quizOptions
old_opt = """const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: t('q1yes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('q1no'), variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: t('q2yes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('q2no'), variant: 'wa-quick--no' }]
  if (gate.value === 3) return [
    { key: 'assinar', label: t('q3assinar'), variant: 'wa-quick--yes' },
    { key: 'precos', label: t('q3precos'), variant: 'wa-quick--yes' },
    { key: 'olhando', label: t('q3olhando'), variant: 'wa-quick--no' },
  ]
  return []
})"""
new_opt = """const quizOptions = computed(() => {
  if (gate.value === 1) return [{ key: 'yes', label: t('q1yes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('q1no'), variant: 'wa-quick--no' }]
  if (gate.value === 2) return [{ key: 'yes', label: t('q2yes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('q2no'), variant: 'wa-quick--no' }]
  if (gate.value === 3) return [{ key: 'yes', label: t('qPayYes'), variant: 'wa-quick--yes' }, { key: 'no', label: t('qPayNo'), variant: 'wa-quick--no' }]
  if (gate.value === 4) return [
    { key: 'assinar', label: t('q3assinar'), variant: 'wa-quick--yes' },
    { key: 'precos', label: t('q3precos'), variant: 'wa-quick--yes' },
    { key: 'olhando', label: t('q3olhando'), variant: 'wa-quick--no' },
  ]
  return []
})"""
if old_opt not in app:
    raise SystemExit("quizOptions not found")
app = app.replace(old_opt, new_opt, 1)

# setGate type
app = app.replace(
    "function setGate(next: 1 | 2 | 3 | 'pass' | 'reject', persistServer = false)",
    "function setGate(next: 1 | 2 | 3 | 4 | 'pass' | 'reject', persistServer = false)",
    1,
)

# answerQuiz: after gate 2 success go to 3 (pay); add gate 3 pay logic; gate 4 = old intent
old_g2 = """  if (gate.value === 2) {
    quizAnswers.value.q2 = key === 'yes' ? 'conhece_sim' : 'conhece_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk(t('rejectIg'), 1200)
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
    // 3a pergunta = filtro final: so curiosos nao entram na pressel
    if (key === 'olhando') {
      setGate('reject', true)
      typeThenAsk(t('rejectCurious'), 1400)
    } else if (key === 'assinar') {
      pushMsg('her', t('passAssinar'))
      setTimeout(() => setGate('pass', true), 800)
    } else {
      // precos / opcoes
      pushMsg('her', t('passPrecos'))
      setTimeout(() => setGate('pass', true), 800)
    }
  }
}"""

new_g2 = """  if (gate.value === 2) {
    quizAnswers.value.q2 = key === 'yes' ? 'conhece_sim' : 'conhece_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk(t('rejectIg'), 1200)
    } else {
      setGate(3)
      typeThenAsk(questionText(3), 1100)
    }
    return
  }
  if (gate.value === 3) {
    // Disposto a pagar? Sim -> segue | Nao -> bloqueia
    quizAnswers.value.q_pay = key === 'yes' ? 'pago_sim' : 'pago_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk(t('rejectPay'), 1400)
    } else {
      setGate(4)
      typeThenAsk(questionText(4), 1100)
    }
    return
  }
  if (gate.value === 4) {
    const intentMap: Record<string, string> = {
      assinar: 'intent_assinar_hoje',
      precos: 'intent_ver_precos',
      olhando: 'intent_so_olhando',
    }
    quizAnswers.value.q3 = intentMap[key] || key
    try { localStorage.setItem('wanessa_intent', quizAnswers.value.q3) } catch {}
    if (key === 'olhando') {
      setGate('reject', true)
      typeThenAsk(t('rejectCurious'), 1400)
    } else if (key === 'assinar') {
      pushMsg('her', t('passAssinar'))
      setTimeout(() => setGate('pass', true), 800)
    } else {
      pushMsg('her', t('passPrecos'))
      setTimeout(() => setGate('pass', true), 800)
    }
  }
}"""

if old_g2 not in app:
    raise SystemExit("answerQuiz g2/g3 block not found")
app = app.replace(old_g2, new_g2, 1)

# restore gate 4 from localStorage
app = app.replace(
    "else if (restored === '1' || restored === '2' || restored === '3') gate.value = Number(restored) as 1 | 2 | 3",
    "else if (restored === '1' || restored === '2' || restored === '3' || restored === '4') gate.value = Number(restored) as 1 | 2 | 3 | 4",
    1,
)

app = app.replace(
    "if (gate.value === 1 || gate.value === 2 || gate.value === 3) {",
    "if (gate.value === 1 || gate.value === 2 || gate.value === 3 || gate.value === 4) {",
    1,
)

app = app.replace(
    "typeThenAsk(questionText(gate.value as 1 | 2 | 3), 800)",
    "typeThenAsk(questionText(gate.value as 1 | 2 | 3 | 4), 800)",
    1,
)

APP.write_text(app, encoding="utf-8")
print("pay willingness question ok")
