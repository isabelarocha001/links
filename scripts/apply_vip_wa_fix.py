#!/usr/bin/env python3
from pathlib import Path

def main() -> None:
    app = Path("app.vue")
    text = app.read_text(encoding="utf-8")

    old_icon = '              <span class="vip-icon">⭐</span>'
    new_icon = (
        '              <span class="vip-icon vip-icon-stack" aria-hidden="true">\n'
        '                <span class="vip-robot">🤖</span>\n'
        '                <img class="vip-tg-logo" :src="logoTgPurple" alt="" width="26" height="26" />\n'
        '              </span>'
    )
    if old_icon not in text:
        raise SystemExit("vip-icon marker not found in app.vue")
    text = text.replace(old_icon, new_icon, 1)

    old_wa = "const whatsappUrl = 'https://wa.me/5547992750967'"
    new_wa = (
        "const whatsappUrl = 'https://wa.me/5547992750967?text=' + "
        "encodeURIComponent('Quero mais informaçoes sobre o seu conteudo vip')"
    )
    if old_wa not in text:
        raise SystemExit("whatsappUrl marker not found in app.vue")
    text = text.replace(old_wa, new_wa, 1)

    old_logo = "const logoTg = LOGO_TG_BLUE"
    new_logo = "const logoTg = LOGO_TG_BLUE\nconst logoTgPurple = LOGO_TG_PURPLE"
    if old_logo not in text:
        raise SystemExit("logoTg marker not found in app.vue")
    text = text.replace(old_logo, new_logo, 1)

    app.write_text(text, encoding="utf-8")

    css = Path("assets/css/links-page.css")
    ctext = css.read_text(encoding="utf-8")
    old_css = ".vip-icon { font-size: 1.4rem; }"
    new_css = """.vip-icon { font-size: 1.4rem; }
.vip-icon-stack {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}
.vip-robot {
  position: absolute;
  font-size: 1.55rem;
  line-height: 1;
  opacity: 0.55;
  transform: translate(-4px, 2px) scale(1.05);
  filter: grayscale(0.15);
  z-index: 0;
  animation: vip-robot-pulse 2.8s ease-in-out infinite;
}
.vip-tg-logo {
  position: relative;
  z-index: 1;
  width: 26px;
  height: 26px;
  object-fit: contain;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(42, 171, 238, 0.35), 0 2px 10px rgba(42, 171, 238, 0.25);
  animation: vip-tg-float 2.4s ease-in-out infinite;
}
@keyframes vip-tg-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-2px) scale(1.06); }
}
@keyframes vip-robot-pulse {
  0%, 100% { opacity: 0.45; transform: translate(-4px, 2px) scale(1.02); }
  50% { opacity: 0.7; transform: translate(-5px, 1px) scale(1.08); }
}"""
    if old_css not in ctext:
        raise SystemExit("vip-icon css marker not found")
    css.write_text(ctext.replace(old_css, new_css, 1), encoding="utf-8")
    print("patched ok")

if __name__ == "__main__":
    main()
