#!/usr/bin/env python3
from pathlib import Path
APP = Path(__file__).resolve().parents[1] / "app.vue"
text = APP.read_text(encoding="utf-8")
bad = "iqPhase === \\'quiz\\'"
# actual file may contain backslash-quote as two chars
bad2 = "iqPhase === \\\'quiz\\\'"
fixed = False
if "iqPhase === \\\'quiz\\\'" in text or "iqPhase === \\'quiz\\'" in repr(text):
    pass
# Simple approach: replace the known bad substring character by character
import re
text2, n = re.subn(r"iqPhase === \\'quiz\\'", "iqPhase === 'quiz'", text)
if n:
    text = text2
    fixed = True
    print("fixed via regex", n)
# also try raw file pattern as stored
if "\\\\'quiz\\\\'" in repr(open(APP, encoding='utf-8').read()):
    pass
# brute force line fix
lines = text.splitlines(keepends=True)
out = []
for line in lines:
    if "iq-title" in line and "quiz" in line and "\\" in line:
        line = line.replace("\\'", "'")
        fixed = True
        print("line fixed:", line.strip()[:80])
    out.append(line)
text = "".join(out)
APP.write_text(text, encoding="utf-8")
print("done fixed=", fixed)
