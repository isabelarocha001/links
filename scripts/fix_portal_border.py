#!/usr/bin/env python3
"""Portal = animated border around card, black interior, white text."""
from pathlib import Path

APP = Path("app.vue")
CSS = Path("assets/css/links-page.css")
app = APP.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")

# Remove portal-ring and portal-core from HTML
app = app.replace('            <div class="portal-ring" aria-hidden="true"></div>\n', '')
app = app.replace('            <div class="portal-core" aria-hidden="true"></div>\n', '')
APP.write_text(app, encoding="utf-8")

old_portal = """/* PrivSex as portal */
.lux-card--portal {
  border-color: rgba(192, 132, 252, 0.55);
  background:
    radial-gradient(ellipse 90% 70% at 50% 40%, rgba(168, 85, 247, 0.35) 0%, transparent 55%),
    linear-gradient(165deg, rgba(55, 25, 80, 0.98), rgba(18, 8, 32, 0.99));
  box-shadow:
    0 0 0 1px rgba(192, 132, 252, 0.25),
    0 0 28px rgba(168, 85, 247, 0.28),
    inset 0 0 40px rgba(126, 34, 206, 0.2);
  min-height: 168px;
}
.lux-card--portal:hover {
  border-color: rgba(216, 180, 254, 0.75);
  box-shadow:
    0 0 0 1px rgba(216, 180, 254, 0.35),
    0 14px 40px rgba(0,0,0,0.45),
    0 0 48px rgba(168, 85, 247, 0.4),
    inset 0 0 50px rgba(168, 85, 247, 0.25);
}
.portal-ring {
  position: absolute;
  left: 50%;
  top: 42%;
  width: 120px;
  height: 120px;
  margin-left: -60px;
  margin-top: -60px;
  border-radius: 50%;
  border: 2px solid rgba(192, 132, 252, 0.45);
  box-shadow:
    0 0 18px rgba(168, 85, 247, 0.5),
    inset 0 0 22px rgba(168, 85, 247, 0.35);
  pointer-events: none;
  z-index: 0;
  animation: portal-spin 10s linear infinite;
  opacity: 0.85;
}
.portal-core {
  position: absolute;
  left: 50%;
  top: 42%;
  width: 56px;
  height: 56px;
  margin-left: -28px;
  margin-top: -28px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(233, 213, 255, 0.55) 0%, rgba(168, 85, 247, 0.35) 40%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  animation: portal-pulse 2.6s ease-in-out infinite;
}
@keyframes portal-spin {
  from { transform: rotate(0deg) scale(1); }
  to { transform: rotate(360deg) scale(1); }
}
@keyframes portal-pulse {
  0%, 100% { opacity: 0.55; transform: scale(0.92); }
  50% { opacity: 1; transform: scale(1.08); }
}
.lux-card--portal .card-top,
.lux-card--portal .card-title,
.lux-card--portal .card-desc,
.lux-card--portal .card-cta {
  position: relative;
  z-index: 1;
}
.lux-card--portal .card-desc {
  font-size: 0.68rem;
  line-height: 1.4;
}
"""

new_portal = """/* PrivSex portal: fundo preto (entrar) + borda animada gamificada */
.lux-card--portal {
  isolation: isolate;
  border: 1px solid transparent;
  background:
    linear-gradient(#050308, #050308) padding-box,
    linear-gradient(130deg, #c084fc, #7c3aed, #2aabee, #c084fc, #a855f7) border-box;
  background-size: 100% 100%, 300% 300%;
  animation: portal-border-flow 4s linear infinite;
  box-shadow:
    0 0 0 1px rgba(192, 132, 252, 0.2),
    0 0 22px rgba(168, 85, 247, 0.35),
    inset 0 0 28px rgba(0, 0, 0, 0.85);
  min-height: 168px;
  overflow: visible;
}
.lux-card--portal::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 17px;
  padding: 2px;
  background: linear-gradient(130deg, #e9d5ff, #a855f7, #2aabee, #7c3aed, #c084fc, #e9d5ff);
  background-size: 300% 300%;
  animation: portal-border-flow 3.2s linear infinite;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 0;
  opacity: 0.95;
}
.lux-card--portal::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 15px;
  background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(168, 85, 247, 0.12) 0%, transparent 55%);
  pointer-events: none;
  z-index: 0;
}
.lux-card--portal:hover {
  transform: translateY(-3px);
  box-shadow:
    0 0 0 1px rgba(216, 180, 254, 0.35),
    0 14px 36px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(168, 85, 247, 0.45),
    inset 0 0 32px rgba(0, 0, 0, 0.9);
}
.lux-card--portal .card-glow {
  display: none;
}
.lux-card--portal .card-top,
.lux-card--portal .card-title,
.lux-card--portal .card-desc,
.lux-card--portal .card-cta {
  position: relative;
  z-index: 1;
}
.lux-card--portal .card-title {
  color: #ffffff;
}
.lux-card--portal .card-desc {
  font-size: 0.68rem;
  line-height: 1.4;
  color: #ffffff;
}
.lux-card--portal .card-cta {
  color: #e9d5ff;
}
@keyframes portal-border-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
"""

if old_portal not in css:
    raise SystemExit("old portal CSS block not found")
css = css.replace(old_portal, new_portal, 1)
CSS.write_text(css, encoding="utf-8")
print("portal border fix ok")
