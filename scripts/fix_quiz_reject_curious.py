#!/usr/bin/env python3
"""Reject 'so olhando' intent - only hot leads reach pressel."""
from pathlib import Path

APP = Path("app.vue")
text = APP.read_text(encoding="utf-8")

old = """  if (gate.value === 3) {
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

new = """  if (gate.value === 3) {
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
      typeThenAsk('Obrigada. Este espaço é pra quem já está pronto pra assinar. Quando decidir, volta aqui.', 1400)
    } else if (key === 'assinar') {
      pushMsg('her', 'Perfeito. Vou te levar pro bot VIP e às opções de compra…')
      setTimeout(() => setGate('pass', true), 800)
    } else {
      // precos / opcoes
      pushMsg('her', 'Perfeito. Entrando nas opções e valores…')
      setTimeout(() => setGate('pass', true), 800)
    }
  }
}"""

if old not in text:
    raise SystemExit('gate 3 block not found - already patched or file changed')
text = text.replace(old, new, 1)
APP.write_text(text, encoding='utf-8')
print('reject curious ok')
