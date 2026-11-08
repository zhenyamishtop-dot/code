"""Two travel posters in one style: STATIC and DYNAMIC composition.

Output: Figma-ready SVG (840x1188, A-format ratio). Photos are embedded,
texts are real <text> layers in the Inter font (available in Figma/Pixso),
every block is a named group. Drag the .svg onto the Figma canvas.

Run:  python3 generate.py   (needs Pillow; source photos in ./photos)
"""
import base64
import io
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
PHOTOS = HERE / "photos"
W, H = 840, 1188

# shared style
TURQ, ORANGE, NAVY, GRAY, LIGHT, WHITE = "#0FB5AE", "#FF9F1C", "#12355B", "#5F6B7A", "#E6F7F6", "#FFFFFF"
FONT = "Inter"

TITLE = "ПУТЕШЕСТВИЯ"
SUBTITLE = "Открой мир вместе с нами"
OFFER = "СКИДКИ ДО 30% НА ЛЕТО"
DESC = ["Морские круизы, походы и авиатуры.",
        "Подберём маршрут под ваш отпуск и бюджет."]
AGENCY = "ТУРАГЕНТСТВО «ГОРИЗОНТ»"
FOOTER = "gorizont-tour.ru   ·   @gorizont_tour   ·   +7 (900) 000-00-00"


def photo(name, focus_x, size):
    """Square crop around focus_x (0..1 of width), returned as base64 JPEG."""
    im = Image.open(PHOTOS / name).convert("RGB")
    w, h = im.size
    side = min(w, h)
    cx = int(focus_x * w)
    left = max(0, min(w - side, cx - side // 2))
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=84)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def text(x, y, s, size, weight=400, fill=NAVY, anchor="start", spacing=0, ident=None):
    i = f' id="{ident}"' if ident else ""
    ls = f' letter-spacing="{spacing}"' if spacing else ""
    return (f'<text{i} x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}"{ls}>{s}</text>')


def pill(cx, cy, length, thick, color, angle=0):
    return (f'<rect x="{cx - length / 2}" y="{cy - thick / 2}" width="{length}" height="{thick}" '
            f'rx="{thick / 2}" fill="{color}" transform="rotate({angle} {cx} {cy})"/>')


def dots(x0, y0, cols, rows, gap, r, color, angle=0, opacity=1):
    c = "".join(f'<circle cx="{x0 + i * gap}" cy="{y0 + j * gap}" r="{r}"/>'
                for i in range(cols) for j in range(rows))
    return (f'<g fill="{color}" opacity="{opacity}" transform="rotate({angle} {x0} {y0})">{c}</g>')


def svg(title, defs, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'width="{W}" height="{H}" viewBox="0 0 {W} {H}">\n<title>{title}</title>\n'
            f'<defs>{defs}</defs>\n{body}\n</svg>\n')


# ---------- icons (centered at 0,0, ~40px) ----------
ICON_SEA = ''.join(
    f'<path d="M-18 {y} q 6 -6 12 0 t 12 0 t 12 0" fill="none" stroke="{WHITE}" stroke-width="4" stroke-linecap="round"/>'
    for y in (-8, 2, 12))
ICON_MOUNT = (f'<polygon points="-20,14 -4,-14 12,14" fill="{WHITE}"/>'
              f'<polygon points="2,14 12,-2 22,14" fill="{WHITE}" opacity="0.7"/>')
ICON_PLANE = (f'<polygon transform="rotate(45)" fill="{WHITE}" points="0,-20 3,-16 3,-5 18,4 18,8 3,4 3,12 '
              f'8,16 8,19 0,17 -8,19 -8,16 -3,12 -3,4 -18,8 -18,4 -3,-5 -3,-16"/>')


# =====================================================================
# Poster 1 — STATIC: central axis, symmetry, circle, horizontals
# =====================================================================
def static_poster():
    sea = photo("sea.webp", 0.45, 900)
    cx, cy, r = 420, 400, 290
    defs = f'<clipPath id="circle-clip"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>'
    cols = [(180, "Море", "круизы и острова", ICON_SEA),
            (420, "Горы", "походы и треккинг", ICON_MOUNT),
            (660, "Перелёты", "билеты по миру", ICON_PLANE)]
    col_svg = "".join(
        f'<g id="Блок {name}"><circle cx="{x}" cy="1000" r="34" fill="{TURQ}"/>'
        f'<g transform="translate({x} 1000)">{icon}</g>'
        + text(x, 1068, name, 20, 700, NAVY, "middle")
        + text(x, 1092, sub, 15, 400, GRAY, "middle") + "</g>"
        for x, name, sub, icon in cols)
    body = f"""
<rect id="Фон" width="{W}" height="{H}" fill="{WHITE}"/>
<g id="Верхняя плашка">
  <rect width="{W}" height="400" fill="{TURQ}"/>
  {dots(40, 150, 4, 6, 22, 4, WHITE, 0, 0.5)}
  {dots(734, 150, 4, 6, 22, 4, WHITE, 0, 0.5)}
  {text(420, 52, AGENCY, 16, 700, WHITE, "middle", 3)}
</g>
<g id="Фото круг">
  <circle cx="{cx}" cy="{cy}" r="{r + 14}" fill="{WHITE}"/>
  <image x="{cx - r}" y="{cy - r}" width="{2 * r}" height="{2 * r}" xlink:href="{sea}" clip-path="url(#circle-clip)"/>
  <circle cx="{cx}" cy="{cy}" r="{r + 26}" fill="none" stroke="{ORANGE}" stroke-width="4"/>
</g>
<g id="Заголовок">
  {text(420, 790, TITLE, 76, 900, NAVY, "middle", 2)}
  {text(420, 836, SUBTITLE, 26, 500, ORANGE, "middle")}
</g>
<g id="Акция">
  {pill(205, 880, 90, 10, ORANGE)}
  {text(420, 888, OFFER, 22, 800, TURQ, "middle", 1)}
  {pill(635, 880, 90, 10, ORANGE)}
</g>
<g id="Описание">
  {text(420, 922, DESC[0], 16, 400, GRAY, "middle")}
  {text(420, 944, DESC[1], 16, 400, GRAY, "middle")}
</g>
{col_svg}
<g id="Подвал">
  <rect y="1124" width="{W}" height="64" fill="{NAVY}"/>
  {text(420, 1162, FOOTER, 14, 500, WHITE, "middle")}
</g>"""
    (HERE / "poster-1-static.svg").write_text(svg("Плакат 1 — Статика", defs, body), encoding="utf-8")


# =====================================================================
# Poster 2 — DYNAMIC: diagonals, rotated photo tiles, asymmetry
# =====================================================================
def dynamic_poster():
    tiles = [  # (id, file, focus, cx, cy, half-diagonal)
        ("Фото море", "sea.webp", 0.45, 330, 330, 280),
        ("Фото туристы", "hikers.png", 0.55, 650, 570, 200),
        ("Фото аэропорт", "airport.webp", 0.45, 200, 740, 180),
    ]
    defs, imgs = [], []
    for i, (name, f, fx, cx, cy, h) in enumerate(tiles):
        pts = f"{cx},{cy - h} {cx + h},{cy} {cx},{cy + h} {cx - h},{cy}"
        defs.append(f'<clipPath id="d{i}"><polygon points="{pts}"/></clipPath>')
        # image square covering the diamond's bounding box
        imgs.append(f'<g id="{name}"><image x="{cx - h}" y="{cy - h}" width="{2 * h}" height="{2 * h}" '
                    f'xlink:href="{photo(f, fx, 2 * h * 2)}" clip-path="url(#d{i})"/></g>')

    def diamond(cx, cy, h, fill, extra=""):
        return f'<polygon points="{cx},{cy - h} {cx + h},{cy} {cx},{cy + h} {cx - h},{cy}" fill="{fill}"{extra}/>'

    body = f"""
<rect id="Фон" width="{W}" height="{H}" fill="{WHITE}"/>
<g id="Цветные ромбы">
  {diamond(560, 140, 120, LIGHT)}
  {diamond(90, 300, 110, ORANGE)}
  {diamond(560, 840, 60, TURQ)}
  {diamond(770, 860, 32, "none", f' stroke="{ORANGE}" stroke-width="5"')}
</g>
{"".join(imgs)}
<g id="Диагональные линии">
  {pill(720, 90, 180, 18, ORANGE, -45)}
  {pill(780, 170, 110, 12, TURQ, -45)}
  {pill(470, 690, 160, 16, ORANGE, -45)}
  {pill(90, 960, 140, 12, TURQ, -45)}
</g>
<g id="Точки">
  {dots(700, 300, 3, 7, 18, 3.5, NAVY, -45, 0.6)}
  {dots(40, 520, 3, 6, 18, 3.5, TURQ, -45)}
</g>
{text(40, 46, AGENCY, 14, 700, NAVY, "start", 2, "Агентство")}
<g id="Заголовок">
  {text(790, 985, TITLE, 76, 900, NAVY, "end", 2)}
  {text(790, 1025, SUBTITLE, 26, 500, ORANGE, "end")}
</g>
<g id="Акция и описание">
  {text(790, 1060, OFFER, 22, 800, TURQ, "end", 1)}
  {text(790, 1088, DESC[0], 16, 400, GRAY, "end")}
  {text(790, 1108, DESC[1], 16, 400, GRAY, "end")}
</g>
<g id="Подвал">
  <rect y="1124" width="{W}" height="64" fill="{NAVY}"/>
  {text(60, 1162, FOOTER, 14, 500, WHITE, "start")}
</g>"""
    (HERE / "poster-2-dynamic.svg").write_text(svg("Плакат 2 — Динамика", "".join(defs), body), encoding="utf-8")


if __name__ == "__main__":
    static_poster()
    dynamic_poster()
    print("ok")
