#!/usr/bin/env python3
import base64, subprocess, os, sys

UP = "/root/.claude/uploads/0719ad5f-7ab1-5efe-9e30-7dbbaba90dcd"
OUT = "/tmp/claude-0/-home-user-Nutrition-App/0719ad5f-7ab1-5efe-9e30-7dbbaba90dcd/scratchpad/shots"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
os.makedirs(OUT, exist_ok=True)

# 6.9" iPhone App Store size
W, H = 1284, 2778

# Brand tokens
BG = "#F5F2EC"        # app background
INK = "#1A1A18"
MUTED = "#8A8070"
GREEN = "#4CAF50"
AMBER = "#F5A623"
RED = "#E53935"
PINK = "#E85D9E"      # froyo accent

def data_uri(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()

# (source file, caption, accent color)
SHOTS = [
    ("01a511e0-IMG_4873.png", "See live bar waits<br>across NYC", INK),
    ("0c3a181f-IMG_4874.png", "Know the wait<br>before you go", GREEN),
    ("54fb8219-IMG_4875.png", "See where<br>friends are out", INK),
    ("5a2d837b-IMG_4876.png", "Save your<br>favorite spots", AMBER),
]

TEMPLATE = """<!doctype html><html><head><meta charset="utf-8"><style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html,body {{ width:{W}px; height:{H}px; }}
.stage {{
  width:{W}px; height:{H}px; position:relative; overflow:hidden;
  background: radial-gradient(120% 80% at 50% 0%, #FBF9F4 0%, {BG} 55%, #ECE6DA 100%);
  font-family: 'Helvetica Neue', Arial, 'Liberation Sans', sans-serif;
  display:flex; flex-direction:column; align-items:center;
}}
.eyebrow {{
  margin-top:150px; letter-spacing:.32em; font-size:34px; font-weight:700;
  color:{MUTED}; text-transform:uppercase;
}}
.dots {{ display:inline-flex; gap:10px; vertical-align:middle; margin-left:16px; }}
.dot {{ width:20px; height:20px; border-radius:50%; display:inline-block; }}
.caption {{
  margin-top:30px; font-size:96px; line-height:1.06; font-weight:800;
  color:{INK}; text-align:center; letter-spacing:-.02em;
}}
.accent {{ height:12px; width:120px; border-radius:99px; background:{ACCENT}; margin-top:44px; }}
.phone {{
  margin-top:70px; width:1010px; border-radius:62px; overflow:hidden;
  box-shadow: 0 50px 90px -20px rgba(26,26,24,.45), 0 0 0 12px #fff, 0 0 0 15px rgba(0,0,0,.06);
}}
.phone img {{ width:100%; display:block; }}
</style></head><body>
<div class="stage">
  <div class="eyebrow">NYC Lines
    <span class="dots"><span class="dot" style="background:{GREEN}"></span><span class="dot" style="background:{AMBER}"></span><span class="dot" style="background:{RED}"></span></span>
  </div>
  <div class="caption">{CAPTION}</div>
  <div class="accent"></div>
  <div class="phone"><img src="{IMG}"></div>
</div>
</body></html>"""

for i, (src, caption, accent) in enumerate(SHOTS, 1):
    html = TEMPLATE.format(W=W, H=H, BG=BG, INK=INK, MUTED=MUTED,
                           GREEN=GREEN, AMBER=AMBER, RED=RED,
                           ACCENT=accent, CAPTION=caption,
                           IMG=data_uri(os.path.join(UP, src)))
    hp = os.path.join(OUT, f"page{i}.html")
    op = os.path.join(OUT, f"appstore_{i}.png")
    with open(hp, "w") as f:
        f.write(html)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                    "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={W},{H}", f"--screenshot={op}",
                    f"file://{hp}"], capture_output=True)
    ok = os.path.exists(op)
    print(f"{op} {'OK' if ok else 'FAILED'} {os.path.getsize(op) if ok else ''}")
