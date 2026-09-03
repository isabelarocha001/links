#!/usr/bin/env python3
"""Non-PT leads see public channel with intl invite link."""
from pathlib import Path

APP = Path("app.vue")
app = APP.read_text(encoding="utf-8")

# Ensure intl URL constant exists
if "telegramPublicUrlIntl" not in app:
    old = "const telegramPublicUrl = 'https://t.me/+yA5Y1pAWx5RlMWIx'"
    new = (
        "const telegramPublicUrl = 'https://t.me/+yA5Y1pAWx5RlMWIx'\n"
        "const telegramPublicUrlIntl = 'https://t.me/+2bYvtb_AA0AzMTcx'\n"
        "const telegramPublicUrlActive = computed(() => isPt.value ? telegramPublicUrl : telegramPublicUrlIntl)"
    )
    if old not in app:
        raise SystemExit("telegramPublicUrl not found")
    # isPt must exist before this computed — currently isPt is after locale which is after urls
    # Order in file: privsexUrl, telegramPublicUrl, vipBotUrl, locale, isPt, t, whatsappUrl
    # So telegramPublicUrlActive depending on isPt must come AFTER isPt definition.
    app = app.replace(old, "const telegramPublicUrl = 'https://t.me/+yA5Y1pAWx5RlMWIx'\nconst telegramPublicUrlIntl = 'https://t.me/+2bYvtb_AA0AzMTcx'", 1)

# Add computed after isPt
if "telegramPublicUrlActive" not in app:
    needle = "const isPt = computed(() => locale.value === 'pt')\nfunction t(key: string) { return tr(locale.value, key) }"
    if needle not in app:
        raise SystemExit("isPt block not found")
    app = app.replace(
        needle,
        "const isPt = computed(() => locale.value === 'pt')\n"
        "const telegramPublicUrlActive = computed(() => isPt.value ? telegramPublicUrl : telegramPublicUrlIntl)\n"
        "function t(key: string) { return tr(locale.value, key) }",
        1,
    )

# Show public channel for everyone again (remove v-if="isPt")
app = app.replace(
    '<div v-if="isPt" class="card-col">\n            <a class="lux-card lux-card--right" :href="telegramPublicUrl"',
    '<div class="card-col">\n            <a class="lux-card lux-card--right" :href="telegramPublicUrlActive"',
    1,
)

# Enter button under public card
app = app.replace(
    '''            <a class="card-enter" :href="telegramPublicUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrl)">{{ t('pubEnter') }}</a>''',
    '''            <a class="card-enter" :href="telegramPublicUrlActive" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrlActive)">{{ t('pubEnter') }}</a>''',
    1,
)

# Also fix onCardClick on the card itself if still using plain telegramPublicUrl
app = app.replace(
    ''':href="telegramPublicUrlActive" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrl)"''',
    ''':href="telegramPublicUrlActive" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('Telegram Público', telegramPublicUrlActive)"''',
    1,
)

# Remove single-column only for non-pt (both cards show again)
app = app.replace(
    '<section class="main-cards" :class="{ \'main-cards--single\': !isPt }" v-if="configReady">',
    '<section class="main-cards" v-if="configReady">',
    1,
)

APP.write_text(app, encoding="utf-8")
print("intl public channel ok")
