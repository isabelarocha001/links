#!/usr/bin/env python3
"""Skip IQ welcome screen — open straight on the 4 commercial questions."""
from pathlib import Path
import re

APP = Path(__file__).resolve().parents[1] / "app.vue"

def main() -> None:
    text = APP.read_text(encoding="utf-8")
    changed = False

    if "iqPhase === 'welcome' || (iqPhase === 'quiz' && iqStep === 0)" in text:
        text = text.replace(
            "iqPhase === 'welcome' || (iqPhase === 'quiz' && iqStep === 0)",
            "iqPhase === 'quiz'",
            1,
        )
        changed = True
        print("title condition patched")

    text2, n = re.subn(
        r'(<h3 class="iq-title"[^>]*>)Antes de falar comigo[^<]*(</h3>)',
        r'<h3 class="iq-title" v-if="iqPhase === \'quiz\'">{{ iqHeaderTitle }}</h3>',
        text,
        count=1,
    )
    if n:
        text = text2
        changed = True
        print("title line replaced")

    text = text.replace("{{ iqHeaderTitle }} 💕</h3>", "{{ iqHeaderTitle }}</h3>")
    text = text.replace("{{ iqHeaderTitle }}💕</h3>", "{{ iqHeaderTitle }}</h3>")

    if "iqPhase.value = 'welcome'\n  iqVisible.value = true\n  iqTrack('quiz_started')" in text:
        text = text.replace(
            "iqPhase.value = 'welcome'\n  iqVisible.value = true\n  iqTrack('quiz_started')",
            "iqPhase.value = 'quiz'\n  iqStep.value = 0\n  iqVisible.value = true\n  iqTrack('quiz_started')",
            1,
        )
        changed = True
        print("iqStart patched")
    else:
        print("iqStart already ok or different")

    if "function iqResetState() {\n  iqPhase.value = 'welcome'\n  iqStep.value = 0" in text:
        text = text.replace(
            "function iqResetState() {\n  iqPhase.value = 'welcome'\n  iqStep.value = 0",
            "function iqResetState() {\n  iqPhase.value = 'quiz'\n  iqStep.value = 0",
            1,
        )
        changed = True
        print("reset patched")
    else:
        print("reset already ok")

    APP.write_text(text, encoding="utf-8")
    print("done changed=", changed, "bytes=", len(text))

if __name__ == "__main__":
    main()
