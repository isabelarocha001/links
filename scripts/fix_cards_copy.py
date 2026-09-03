#!/usr/bin/env python3
"""Update card copy + PrivSex portal visual."""
from pathlib import Path

APP = Path("app.vue")
CSS = Path("assets/css/links-page.css")
app = APP.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")

# --- PrivSex card: portal class + new copy ---
old_priv = """          <a class="lux-card lux-card--left" :href="privsexUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('PrivSex', privsexUrl)">
            <div class="card-glow"></div>
            <div class="card-top">
              <span class="card-icon"><img v-if="logoPriv" :src="logoPriv" alt="" class="logo-img" width="28" height="28" /><template v-else>🔥</template></span>
              <span class="card-badge">Privado</span>
            </div>
            <h2 class="card-title">PrivSex</h2>
            <p class="card-desc">Conteúdo exclusivo e experiência premium.</p>
            <span class="card-cta">Entrar →</span>
          </a>"""

new_priv = """          <a class="lux-card lux-card--left lux-card--portal" :href="privsexUrl" target="_blank" rel="noopener noreferrer" @pointerdown.passive="onCardClick('PrivSex', privsexUrl)">
            <div class="portal-ring" aria-hidden="true"></div>
            <div class="portal-core" aria-hidden="true"></div>
            <div class="card-glow"></div>
            <div class="card-top">
              <span class="card-icon"><img v-if="logoPriv" :src="logoPriv" alt="" class="logo-img" width="28" height="28" /><template v-else>🔥</template></span>
              <span class="card-badge">Portal</span>
            </div>
            <h2 class="card-title">PrivSex</h2>
            <p class="card-desc">Aqui você desbloqueia meu conteúdo pago, chat privado, sou tua noiva virtual, faço lives e chamadas de vídeo ao vivo.</p>
            <span class="card-cta">Entrar no portal →</span>
          </a>"""

if old_priv not in app:
    raise SystemExit("PrivSex card block not found")
app = app.replace(old_priv, new_priv, 1)

# --- Canal público copy ---
old_pub = """            <p class="card-desc">Prévias e o primeiro contato com o meu mundo.</p>"""
new_pub = """            <p class="card-desc">Meu canal público onde posto todos os teasers dos meus filmes pagos.</p>"""
if old_pub not in app:
    raise SystemExit("public channel desc not found")
app = app.replace(old_pub, new_pub, 1)

# --- VIP bot desc ---
old_vip = """                <p class="vip-desc">Compra instantânea · sem conversa · acesso imediato</p>"""
new_vip = """                <p class="vip-desc">Assinatura instantânea · acesso imediato ao conteúdo</p>"""
if old_vip not in app:
    raise SystemExit("vip desc not found")
app = app.replace(old_vip, new_vip, 1)

APP.write_text(app, encoding="utf-8")

# --- CSS portal for PrivSex ---
portal_css = """
/* PrivSex as portal */
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

# insert portal CSS after .card-cta rule if not present
if "lux-card--portal" not in css:
    marker = ".card-cta { font-size: 0.75rem; font-weight: 600; color: #c084fc; margin-top: 12px; position: relative; z-index: 1; }"
    if marker not in css:
        raise SystemExit("card-cta marker not found for portal CSS")
    css = css.replace(marker, marker + portal_css, 1)

CSS.write_text(css, encoding="utf-8")
print("cards copy + portal ok")
