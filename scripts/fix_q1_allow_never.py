#!/usr/bin/env python3
"""Q1: both answers continue; never subscribed is NOT a reject."""
from pathlib import Path

APP = Path("app.vue")
app = APP.read_text(encoding="utf-8")

old = '''  if (gate.value === 1) {
    quizAnswers.value.q1 = key === 'yes' ? 'assinou_sim' : 'assinou_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk(t('rejectNever'), 1400)
    } else {
      setGate(2)
      typeThenAsk(questionText(2), 1100)
    }
    return
  }'''

new = '''  if (gate.value === 1) {
    // Nunca assinou NAO bloqueia — lead novo tambem pode comprar; so registra
    quizAnswers.value.q1 = key === 'yes' ? 'assinou_sim' : 'assinou_nao'
    setGate(2)
    typeThenAsk(questionText(2), 1100)
    return
  }'''

if old not in app:
    raise SystemExit('q1 block not found')
app = app.replace(old, new, 1)
APP.write_text(app, encoding='utf-8')
print('q1 allow never ok')
