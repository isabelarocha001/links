#!/usr/bin/env python3
from pathlib import Path
APP = Path("app.vue")
app = APP.read_text(encoding="utf-8")
old = '''  if (gate.value === 2) {
    quizAnswers.value.q2 = key === 'yes' ? 'conhece_sim' : 'conhece_nao'
    if (key === 'no') {
      setGate('reject', true)
      typeThenAsk(t('rejectIg'), 1200)
    } else {
      setGate(3)
      typeThenAsk(questionText(3), 1100)
    }
    return
  }'''
new = '''  if (gate.value === 2) {
    // Nao conhecer pelo Instagram NAO bloqueia — so registra
    quizAnswers.value.q2 = key === 'yes' ? 'conhece_sim' : 'conhece_nao'
    setGate(3)
    typeThenAsk(questionText(3), 1100)
    return
  }'''
if old not in app:
    raise SystemExit('q2 block not found')
app = app.replace(old, new, 1)
APP.write_text(app, encoding='utf-8')
print('q2 allow unknown ok')
