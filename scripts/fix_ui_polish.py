#!/usr/bin/env python3
"""UI polish: robot holding Telegram, remove Modelo de Luxo, bio text no black bg."""
from pathlib import Path

APP = Path("app.vue")
CSS = Path("assets/css/links-page.css")
app = APP.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")

# --- app.vue: remove Modelo de Luxo block ---
old_id = """          <div class="identity">
            <p class="eyebrow">Modelo de Luxo</p>
            <div class="accent-line" aria-hidden="true"></div>
          </div>"""
new_id = """          <!-- identity title removed -->"""
if old_id not in app:
    raise SystemExit("identity block not found")
app = app.replace(old_id, new_id, 1)

# VIP icon: robot main + telegram held bottom-right
old_vip = """              <span class="vip-icon vip-icon-stack" aria-hidden="true">
                <span class="vip-robot">🤖</span>
                <img class="vip-tg-logo" :src="logoTgPurple" alt="" width="26" height="26" />
              </span>"""
new_vip = """              <span class="vip-icon vip-icon-stack" aria-hidden="true" title="Bot Telegram">
                <span class="vip-robot">🤖</span>
                <img class="vip-tg-logo" :src="logoTgPurple" alt="Telegram" width="18" height="18" />
              </span>"""
if old_vip not in app:
    raise SystemExit("vip icon block not found")
app = app.replace(old_vip, new_vip, 1)

# page title
app = app.replace("title: 'Modelo de Luxo'", "title: 'Wanessa'", 1)

APP.write_text(app, encoding="utf-8")

# --- CSS: robot holds telegram (robot front/large, TG small bottom-right) ---
old_stack = """.vip-icon-stack {
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

new_stack = """.vip-icon-stack {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}
/* Robo em destaque; Telegram pequeno na mao (canto inferior direito) */
.vip-robot {
  position: relative;
  z-index: 1;
  font-size: 1.85rem;
  line-height: 1;
  opacity: 1;
  filter: none;
  transform: none;
  animation: vip-robot-pulse 2.8s ease-in-out infinite;
}
.vip-tg-logo {
  position: absolute;
  right: -2px;
  bottom: -2px;
  z-index: 2;
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 50%;
  background: #1a0f24;
  box-shadow: 0 0 0 2px rgba(42, 171, 238, 0.55), 0 2px 8px rgba(42, 171, 238, 0.35);
  animation: vip-tg-float 2.4s ease-in-out infinite;
}
@keyframes vip-tg-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-1px) scale(1.08); }
}
@keyframes vip-robot-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}"""

if old_stack not in css:
    raise SystemExit("vip-icon-stack CSS not found")
css = css.replace(old_stack, new_stack, 1)

# bio-text: remove black background, plain text only
old_bio = """.bio-text {
  margin: 0 auto 14px;
  padding: 12px 14px;
  font-size: 0.82rem;
  line-height: 1.55;
  color: #ffffff;
  background: #000000;
  border-radius: 10px;
  max-width: 340px;
  box-sizing: border-box;
}"""
new_bio = """.bio-text {
  margin: 0 auto 14px;
  padding: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: rgba(245, 240, 255, 0.78);
  background: transparent;
  border-radius: 0;
  max-width: 340px;
  box-sizing: border-box;
}"""
if old_bio not in css:
    raise SystemExit("bio-text CSS not found")
css = css.replace(old_bio, new_bio, 1)

CSS.write_text(css, encoding="utf-8")
print("ui polish ok")
