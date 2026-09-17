#!/usr/bin/env python3
"""Skip IQ welcome screen — open straight on the 4 commercial questions."""
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app.vue"

def main() -> None:
    text = APP.read_text(encoding="utf-8")

    old_title = (
        '                <h3 class="iq-title" v-if="iqPhase === \'welcome\' || (iqPhase === \'quiz\' && iqStep === 0)">Antes de falar comigo 💕</h3>\n'
        '                <h3 class="iq-title" v-else-if="iqPhase === \'result\'">Pode seguir 🧡</h3>\n'
        '                <h3 class="iq-title" v-else-if="iqPhase === \'reject\' || iqPhase === \'soft\'">Oi</h3>\n'
        '                <p class="iq-kicker" v-if="iqPhase === \'quiz\'">{{ iqProgressLabel }}</p>'
    )
    new_title = (
        '                <h3 class="iq-title" v-if="iqPhase === \'quiz\'">{{ iqHeaderTitle }}</h3>\n'
        '                <h3 class="iq-title" v-else-if="iqPhase === \'result\'">Pode seguir 🧡</h3>\n'
        '                <h3 class="iq-title" v-else-if="iqPhase === \'reject\' || iqPhase === \'soft\'">Oi</h3>\n'
        '                <p class="iq-kicker" v-if="iqPhase === \'quiz\'">{{ iqProgressLabel }}</p>'
    )
    if old_title in text:
        text = text.replace(old_title, new_title, 1)
        print("title patched")
    elif 'v-if="iqPhase === \'quiz\'">{{ iqHeaderTitle }}' in text:
        print("title already patched")
    else:
        if "Antes de falar comigo" in text and "iqPhase === 'welcome'" in text:
            text = text.replace(
                "iqPhase === 'welcome' || (iqPhase === 'quiz' && iqStep === 0)">Antes de falar comigo 💕",
                "iqPhase === 'quiz'">{{ iqHeaderTitle }}",
                1,
            )
            print("title soft-patched")
        else:
            print("title: no change needed or unknown state")

    old_start = """  iqResetState()
  iqPhase.value = 'welcome'
  iqVisible.value = true
  iqTrack('quiz_started')
}"""
    new_start = """  iqResetState()
  iqPhase.value = 'quiz'
  iqStep.value = 0
  iqVisible.value = true
  iqTrack('quiz_started')
}"""
    if old_start in text:
        text = text.replace(old_start, new_start, 1)
        print("iqStart patched")
    elif "iqPhase.value = 'quiz'\n  iqStep.value = 0\n  iqVisible.value = true\n  iqTrack('quiz_started')" in text:
        print("iqStart already patched")
    else:
        text = text.replace("iqPhase.value = 'welcome'\n  iqVisible.value = true\n  iqTrack('quiz_started')",
                            "iqPhase.value = 'quiz'\n  iqStep.value = 0\n  iqVisible.value = true\n  iqTrack('quiz_started')", 1)
        print("iqStart soft-patched")

    old_reset = """function iqResetState() {
  iqPhase.value = 'welcome'
  iqStep.value = 0"""
    new_reset = """function iqResetState() {
  iqPhase.value = 'quiz'
  iqStep.value = 0"""
    if old_reset in text:
        text = text.replace(old_reset, new_reset, 1)
        print("reset patched")
    else:
        print("reset already ok or different")

    APP.write_text(text, encoding="utf-8")
    print("done, bytes=", len(text))

if __name__ == "__main__":
    main()
