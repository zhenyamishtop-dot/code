"""Practical work 3 — two fashion posters: geometric shapes + cut-out photo
that comes out of a shape.

Output: Figma-ready SVG 1080x1350. The cut-out (background removed) photo is
recoloured (duotone) and placed twice-in-one: it is clipped to
"blob ∪ area above the shoulders", so the body sits inside the colour shape
and the head / raised hand come out of it.

Cut-outs in ./photos/cutout-*.png were made with `rembg` (isnet-general-use):
    rembg i photo.webp cutout.png
Run:  python3 generate.py   (needs Pillow)
"""
import base64
import io
from pathlib import Path

from PIL import Image, ImageOps

HERE = Path(__file__).parent
PHOTOS = HERE / "photos"
W, H = 1080, 1350
FONT = "Inter"


# ---------- helpers ----------
def blob(pts):
    """Smooth closed path through points (Catmull-Rom -> cubic Bezier)."""
    n = len(pts)
    d = f"M{pts[0][0]} {pts[0][1]}"
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]} {p2[1]}"
    return d + " Z"


def duotone(im, dark, light, contrast=1.15, alpha_clean=None):
    """Recolour an RGBA cut-out: shadows -> dark, highlights -> light."""
    a = im.getchannel("A")
    if alpha_clean:  # remove faint background leftovers
        lo, hi = alpha_clean
        a = a.point(lambda v: 0 if v < lo else 255 if v > hi else int((v - lo) * 255 / (hi - lo)))
    g = ImageOps.autocontrast(im.convert("L"), cutoff=1)
    g = g.point(lambda v: max(0, min(255, int((v - 128) * contrast + 128))))
    out = ImageOps.colorize(g, dark, light).convert("RGBA")
    out.putalpha(a)
    return out


def png_uri(im):
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def text(x, y, s, size, weight=700, fill="#111", anchor="start", spacing=0, rotate=None, ident=None):
    t = f' transform="rotate({rotate} {x} {y})"' if rotate is not None else ""
    i = f' id="{ident}"' if ident else ""
    ls = f' letter-spacing="{spacing}"' if spacing else ""
    return (f'<text{i} x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}"{ls}{t}>{s}</text>')


def frame_texts(ink, title, number):
    """Shared typographic frame: corners + vertical side lines."""
    return f"""
<g id="Текст">
  {text(40, 64, "НЕДЕЛЯ МОДЫ", 24, 800, ink, spacing=2)}
  {text(40, 94, "@moda_style", 20, 500, ink)}
  {text(1040, 70, "МОДА", 38, 800, ink, "end", 4)}
  {text(1022, 104, "СТИЛЬ", 34, 800, ink, "start", 6, 90)}
  {text(58, 840, "WWW.MODA-STYLE.RU", 20, 700, ink, "start", 4, -90)}
  {text(1032, 470, "WWW.MODA-STYLE.RU", 20, 700, ink, "start", 4, 90)}
  {text(40, 1300, title, 40, 800, ink, spacing=3)}
  {text(1040, 1300, number, 40, 800, ink, "end")}
</g>"""


def poster(name, title, defs, body):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
           f'width="{W}" height="{H}" viewBox="0 0 {W} {H}">\n<title>{title}</title>\n'
           f'<defs>{defs}</defs>\n<rect id="Фон" width="{W}" height="{H}" fill="#FFFFFF"/>\n{body}\n</svg>\n')
    (HERE / name).write_text(svg, encoding="utf-8")
    print("wrote", HERE / name)


def person_layer(cut, x, y, w, clip_shape, cut_y, ident):
    """Place cut-out; visible inside clip_shape OR above cut_y (head comes out)."""
    h = round(cut.height * w / cut.width)
    small = cut.resize((int(w * 1.3), int(h * 1.3)), Image.LANCZOS)
    # one path = shape + rectangle above cut line (same winding -> union)
    clip = f'<clipPath id="clip-{ident}"><path d="{clip_shape} M0 0 H{W} V{cut_y} H0 Z"/></clipPath>'
    img = (f'<g id="Фото (вырезано)"><image x="{x}" y="{y}" width="{w}" height="{h}" '
           f'xlink:href="{png_uri(small)}" clip-path="url(#clip-{ident})"/></g>')
    return clip, img


# =====================================================================
# Poster 1 — coral + light blue, black & white photo
# =====================================================================
def poster_1():
    CORAL, BLUE, INK = "#F0505F", "#A9D6EE", "#111111"
    cut = Image.open(PHOTOS / "cutout-1.png").convert("RGBA")
    cut = duotone(cut, "#151A26", "#FFFFFF", alpha_clean=(140, 230))
    cut = cut.crop(cut.getbbox())

    main = blob([(200, 780), (330, 640), (540, 590), (760, 620), (880, 760),
                 (890, 960), (800, 1085), (520, 1105), (280, 1075), (190, 950)])
    back = blob([(140, 700), (420, 600), (760, 560), (960, 660), (990, 950),
                 (900, 1170), (560, 1220), (250, 1180), (110, 960)])
    corner_tl = blob([(-40, 120), (150, 110), (170, 300), (90, 520), (-40, 560)])
    corner_br = blob([(1120, 1000), (1120, 1390), (620, 1390), (760, 1230), (960, 1120)])
    stripes = "".join(f'<line x1="{x}" y1="420" x2="{x + 300}" y2="120" stroke="{CORAL}" stroke-width="9"/>'
                      for x in range(-60, 420, 24))

    clip, img = person_layer(cut, 160, 150, 760, main, 715, "p1")
    defs = clip + '<clipPath id="stripe-circle"><circle cx="270" cy="290" r="130"/></clipPath>'
    body = f"""
<g id="Голубые фигуры">
  <path d="{corner_tl}" fill="{BLUE}"/>
  <path d="{corner_br}" fill="{BLUE}"/>
  <rect x="330" y="200" width="240" height="380" fill="{BLUE}" opacity="0.6"/>
</g>
<g id="Круг в полоску" clip-path="url(#stripe-circle)">{stripes}</g>
<path id="Коралловая фигура" d="{back}" fill="{CORAL}"/>
<g id="Круги">
  <circle cx="800" cy="420" r="58" fill="{CORAL}"/>
  <circle cx="915" cy="470" r="30" fill="{CORAL}"/>
  <circle cx="62" cy="1035" r="24" fill="{CORAL}"/>
  <circle cx="98" cy="1092" r="15" fill="{CORAL}"/>
  <circle cx="48" cy="1100" r="10" fill="{CORAL}"/>
</g>
{img}
<rect id="Прозрачный квадрат" x="570" y="790" width="230" height="250" fill="{BLUE}" opacity="0.55"/>
{frame_texts(INK, "ЭЛЕГАНТНОСТЬ", "01")}"""
    poster("poster-1-fashion.svg", "Плакат 1 — Мода (коралловый)", defs, body)


# =====================================================================
# Poster 2 — purple + peach, purple duotone photo
# =====================================================================
def poster_2():
    PURPLE, PEACH, INK = "#7442C8", "#F79A7E", "#1A1030"
    cut = Image.open(PHOTOS / "cutout-2.png").convert("RGBA")
    cut = duotone(cut, "#2A1250", "#FBF2FF", alpha_clean=(60, 200))
    cut = cut.crop(cut.getbbox())

    main = blob([(250, 600), (480, 480), (760, 480), (880, 700), (870, 1000),
                 (720, 1120), (450, 1140), (250, 1020), (215, 780)])
    corner_tl = blob([(-40, 130), (170, 140), (200, 280), (110, 360), (-40, 400)])
    corner_br = blob([(1120, 960), (1120, 1390), (520, 1390), (640, 1220), (860, 1160)])

    clip, img = person_layer(cut, 255, 180, 640, main, 560, "p2")
    body = f"""
<g id="Персиковые фигуры">
  <path d="{corner_tl}" fill="{PEACH}"/>
  <path d="{corner_br}" fill="{PEACH}"/>
</g>
<g id="Фиолетовые круги (сзади)">
  <circle cx="330" cy="400" r="150" fill="{PURPLE}"/>
  <circle cx="860" cy="430" r="78" fill="{PURPLE}"/>
</g>
<path id="Персиковая фигура" d="{main}" fill="{PEACH}"/>
{img}
<g id="Круги (спереди)">
  <circle cx="560" cy="200" r="40" fill="{PURPLE}"/>
  <circle cx="930" cy="800" r="62" fill="{PEACH}"/>
  <circle cx="170" cy="980" r="78" fill="{PURPLE}"/>
  <circle cx="270" cy="1120" r="28" fill="{PURPLE}"/>
</g>
{frame_texts(INK, "ВЕЧЕРНИЙ ОБРАЗ", "02")}"""
    poster("poster-2-fashion.svg", "Плакат 2 — Мода (фиолетовый)", "".join([clip]), body)


if __name__ == "__main__":
    poster_1()
    poster_2()
