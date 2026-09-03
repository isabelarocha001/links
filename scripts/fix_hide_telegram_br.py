#!/usr/bin/env python3
"""Restore app.vue/css/i18n from good commit and hide Telegram for Brazilian (isPt) users."""
import subprocess
from pathlib import Path

GOOD = "9f4c4e52c3e7"


def git_show(path: str) -> str:
    return subprocess.check_output(["git", "show", f"{GOOD}:{path}"], text=True)


app = git_show("app.vue")
css = git_show("assets/css/links-page.css")
i18n = git_show("utils/i18n.ts")

# Public Telegram card only for non-BR
old_pub = (
    '          <div class="card-col">\n'
    '            <a class="lux-card lux-card--right" :href="telegramPublicUrlActive"'
)
new_pub = (
    '          <div v-if="!isPt" class="card-col">\n'
    '            <a class="lux-card lux-card--right" :href="telegramPublicUrlActive"'
)
if old_pub not in app:
    raise SystemExit("public card-col not found")
app = app.replace(old_pub, new_pub, 1)

# VIP bot only for foreigners
old_vip = '<section class="vip-block" v-if="configReady && isPt">'
new_vip = '<section class="vip-block" v-if="configReady && !isPt">'
if old_vip not in app:
    raise SystemExit("vip-block not found")
app = app.replace(old_vip, new_vip, 1)

# single column for BR
old_main = '<section class="main-cards" v-if="configReady">'
if old_main in app and "main-cards--single" not in app:
    app = app.replace(
        old_main,
        '<section class="main-cards" :class="{ \'main-cards--single\': isPt }" v-if="configReady">',
        1,
    )

# Hide private Telegram for BR
old_tg = (
    '            <a class="direct-btn direct-tg" :class="{ \'direct-btn--primary\': !isPt }" '
    ':href="telegramPrivateUrl"'
)
new_tg = (
    '            <a v-if="!isPt" class="direct-btn direct-tg direct-btn--primary" '
    ':href="telegramPrivateUrl"'
)
if old_tg not in app:
    raise SystemExit("direct-tg btn not found")
app = app.replace(old_tg, new_tg, 1)

# WhatsApp primary for BR
old_wa = (
    '            <a class="direct-btn direct-wa" :class="{ \'direct-btn--secondary\': !isPt }" '
    ':href="whatsappUrl"'
)
new_wa = (
    '            <a class="direct-btn direct-wa" '
    ':class="{ \'direct-btn--primary\': isPt, \'direct-btn--secondary\': !isPt }" '
    ':href="whatsappUrl"'
)
if old_wa not in app:
    raise SystemExit("direct-wa btn not found")
app = app.replace(old_wa, new_wa, 1)

notice = """
        <div class=\"online-only-notice\" role=\"note\">
          <p class=\"online-only-title\">⚠️ SOMENTE CONTEÚDO ONLINE</p>
          <p class=\"online-only-text\">Não faço encontro presencial. Não faço programada. Não importa o valor — a resposta continua sendo <strong>NÃO</strong>. Vendo só conteúdo digital.</p>
        </div>
"""
if "online-only-notice" not in app:
    needle = "        </section>\n        <section class=\"direct-section\">"
    if needle not in app:
        raise SystemExit("notice insert point not found")
    app = app.replace(
        needle,
        "        </section>\n" + notice + "        <section class=\"direct-section\">",
        1,
    )

Path("app.vue").write_text(app, encoding="utf-8")
Path("utils/i18n.ts").write_text(i18n, encoding="utf-8")

if "main-cards--single" not in css:
    css = css.replace(
        ".main-cards { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; align-items: stretch; }",
        ".main-cards { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; align-items: stretch; }\n.main-cards--single { grid-template-columns: 1fr; max-width: 320px; margin-left: auto; margin-right: auto; }",
        1,
    )

notice_css = """
.online-only-notice {
  width: 100%;
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(127, 29, 29, 0.22));
  border: 1px solid rgba(248, 113, 113, 0.45);
  box-shadow: 0 8px 24px rgba(185, 28, 28, 0.15);
  text-align: center;
}
.online-only-title {
  margin: 0 0 6px;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fecaca;
}
.online-only-text {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: #f3f4f6;
}
.online-only-text strong {
  color: #fca5a5;
  font-weight: 800;
}
"""
if "online-only-notice" not in css:
    css = css.rstrip() + "\n" + notice_css

Path("assets/css/links-page.css").write_text(css, encoding="utf-8")
print("restore+hide-telegram-for-BR ok")
