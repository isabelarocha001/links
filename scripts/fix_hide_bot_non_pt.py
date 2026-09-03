#!/usr/bin/env python3
"""Hide Telegram VIP bot + public channel when locale is not Portuguese."""
from pathlib import Path

APP = Path("app.vue")
app = APP.read_text(encoding="utf-8")

# Public channel card-col: wrap visibility
old_pub = '''          <div class="card-col">
            <a class="lux-card lux-card--right" :href="telegramPublicUrl"'''

new_pub = '''          <div v-if="isPt" class="card-col">
            <a class="lux-card lux-card--right" :href="telegramPublicUrl"'''

if old_pub not in app:
    raise SystemExit("public card-col not found")
app = app.replace(old_pub, new_pub, 1)

# VIP block
old_vip = '<section class="vip-block" v-if="configReady">'
new_vip = '<section class="vip-block" v-if="configReady && isPt">'
if old_vip not in app:
    raise SystemExit("vip-block not found")
app = app.replace(old_vip, new_vip, 1)

# main-cards: when non-pt only PrivSex shows — make grid single column for non-pt
old_main = '<section class="main-cards" v-if="configReady">'
new_main = '<section class="main-cards" :class="{ \'main-cards--single\': !isPt }" v-if="configReady">'
if old_main not in app:
    raise SystemExit("main-cards not found")
app = app.replace(old_main, new_main, 1)

# Add isPt computed near locale
if "const isPt" not in app:
    needle = "const locale = ref<Locale>('pt')\nfunction t(key: string) { return tr(locale.value, key) }"
    insert = "const locale = ref<Locale>('pt')\nconst isPt = computed(() => locale.value === 'pt')\nfunction t(key: string) { return tr(locale.value, key) }"
    if needle not in app:
        raise SystemExit("locale block not found")
    app = app.replace(needle, insert, 1)

APP.write_text(app, encoding="utf-8")

CSS = Path("assets/css/links-page.css")
css = CSS.read_text(encoding="utf-8")
if "main-cards--single" not in css:
    css = css.replace(
        ".main-cards { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; align-items: stretch; }",
        ".main-cards { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; align-items: stretch; }\n.main-cards--single { grid-template-columns: 1fr; max-width: 320px; margin-left: auto; margin-right: auto; }",
        1,
    )
    CSS.write_text(css, encoding="utf-8")

print("hide bot/public for non-pt ok")
