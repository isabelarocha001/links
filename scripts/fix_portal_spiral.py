#!/usr/bin/env python3
"""Portal as black-hole spiral suck-in effect."""
from pathlib import Path

APP = Path("app.vue")
CSS = Path("assets/css/links-page.css")
app = APP.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")

# Ensure spiral layers exist in HTML (after portal class opening)
marker = '<a class="lux-card lux-card--left lux-card--portal"'
if marker not in app:
    raise SystemExit("portal card not found")

if "portal-spiral" not in app:
    old = """          <a class="lux-card lux-card--left lux-card--portal" :href="privsexUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('PrivSex', privsexUrl)">
            <div class="card-glow"></div>"""
    new = """          <a class="lux-card lux-card--left lux-card--portal" :href="privsexUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('PrivSex', privsexUrl)">
            <div class="portal-spiral" aria-hidden="true">
              <span class="ps-ring ps-r1"></span>
              <span class="ps-ring ps-r2"></span>
              <span class="ps-ring ps-r3"></span>
              <span class="ps-ring ps-r4"></span>
              <span class="ps-core"></span>
            </div>
            <div class="card-glow"></div>"""
    if old not in app:
        raise SystemExit("portal card open block not found for spiral inject")
    app = app.replace(old, new, 1)
    APP.write_text(app, encoding="utf-8")

# Replace portal CSS block
start = css.find("/* PrivSex portal:")
if start < 0:
    start = css.find(".lux-card--portal {")
if start < 0:
    raise SystemExit("portal CSS start not found")
end = css.find(".vip-block", start)
if end < 0:
    raise SystemExit("vip-block after portal not found")

new_css = """/* PrivSex portal: buraco negro / espiral sugando */
.lux-card--portal {
  isolation: isolate;
  border: 1px solid rgba(168, 85, 247, 0.4);
  background: #030106;
  box-shadow:
    0 0 0 1px rgba(192, 132, 252, 0.15),
    0 0 28px rgba(126, 34, 206, 0.35),
    inset 0 0 40px rgba(0, 0, 0, 0.95);
  min-height: 168px;
  overflow: hidden;
}
.lux-card--portal:hover {
  transform: translateY(-3px);
  box-shadow:
    0 0 0 1px rgba(216, 180, 254, 0.35),
    0 14px 36px rgba(0, 0, 0, 0.55),
    0 0 48px rgba(168, 85, 247, 0.45),
    inset 0 0 50px rgba(0, 0, 0, 1);
}
.lux-card--portal .card-glow { display: none; }

.portal-spiral {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.ps-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: rgba(192, 132, 252, 0.85);
  border-right-color: rgba(168, 85, 247, 0.35);
  border-bottom-color: rgba(42, 171, 238, 0.25);
  border-left-color: rgba(126, 34, 206, 0.5);
  box-shadow:
    0 0 12px rgba(168, 85, 247, 0.35),
    inset 0 0 10px rgba(168, 85, 247, 0.15);
  transform: translate(-50%, -50%) rotate(0deg);
  animation: portal-suck 3.2s linear infinite;
}
.ps-r1 { width: 42px;  height: 42px;  animation-duration: 2.2s; opacity: 0.95; border-width: 2px; }
.ps-r2 { width: 72px;  height: 72px;  animation-duration: 2.8s; animation-direction: reverse; opacity: 0.75; }
.ps-r3 { width: 108px; height: 108px; animation-duration: 3.6s; opacity: 0.55; }
.ps-r4 { width: 148px; height: 148px; animation-duration: 4.4s; animation-direction: reverse; opacity: 0.35; }
.ps-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border-radius: 50%;
  background: radial-gradient(circle, #1a0a2e 0%, #000 55%, #000 100%);
  box-shadow:
    0 0 16px 6px rgba(168, 85, 247, 0.55),
    0 0 40px 12px rgba(126, 34, 206, 0.35),
    inset 0 0 8px #000;
  animation: portal-core-pulse 1.8s ease-in-out infinite;
}
@keyframes portal-suck {
  0%   { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
  50%  { transform: translate(-50%, -50%) rotate(180deg) scale(0.92); }
  100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
}
@keyframes portal-core-pulse {
  0%, 100% { transform: scale(0.85); box-shadow: 0 0 12px 4px rgba(168, 85, 247, 0.4), 0 0 28px 8px rgba(126, 34, 206, 0.25), inset 0 0 8px #000; }
  50%      { transform: scale(1.15); box-shadow: 0 0 22px 8px rgba(192, 132, 252, 0.7), 0 0 48px 16px rgba(168, 85, 247, 0.4), inset 0 0 10px #000; }
}

.lux-card--portal .card-top,
.lux-card--portal .card-title,
.lux-card--portal .card-desc,
.lux-card--portal .card-cta {
  position: relative;
  z-index: 1;
}
.lux-card--portal .card-title { color: #ffffff; text-shadow: 0 1px 8px rgba(0,0,0,0.9); }
.lux-card--portal .card-desc {
  font-size: 0.68rem;
  line-height: 1.4;
  color: #ffffff;
  text-shadow: 0 1px 6px rgba(0,0,0,0.95);
}
.lux-card--portal .card-cta { color: #e9d5ff; text-shadow: 0 1px 6px rgba(0,0,0,0.9); }

"""

css = css[:start] + new_css + css[end:]
CSS.write_text(css, encoding="utf-8")
print("spiral black-hole portal ok")
