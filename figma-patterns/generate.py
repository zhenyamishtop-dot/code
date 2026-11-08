"""Generate two geometric tile patterns as Figma-ready SVG files.

Each pattern is a 4x4 grid of 300x300 tiles (1200x1200 total).
Every tile is a named group (the `id` becomes the layer name in Figma),
clipped to its square, built only from simple vector shapes so it stays
fully editable after import (File -> Import, or drag the .svg into Figma).

Run:  python3 generate.py
"""
import math
from pathlib import Path

S = 300  # tile size
N = 4    # tiles per row/column
OUT = Path(__file__).parent


# ---------- helpers ----------
def star(cx, cy, r_out, r_in, n, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(rot + i * 180 / n)
        pts.append(f"{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}")
    return " ".join(pts)


def sparkle(cx, cy, r, fill):
    """Four-point star."""
    return f'<polygon points="{star(cx, cy, r, r * 0.28, 4)}" fill="{fill}"/>'


def wave(y, x0, x1, amp, step, color, width):
    d = f"M{x0} {y} q {step / 2} {-amp} {step} 0"
    x = x0 + step
    while x < x1:
        d += f" t {step} 0"
        x += step
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
            f'stroke-linecap="round"/>')


def build(name, title, tiles, bg_default):
    defs, body = [], []
    for idx, (label, bg, inner) in enumerate(tiles):
        r, c = divmod(idx, N)
        x, y = c * S, r * S
        cid = f"clip-{idx + 1}"
        defs.append(f'<clipPath id="{cid}"><rect width="{S}" height="{S}"/></clipPath>')
        body.append(
            f'<g id="{idx + 1:02d} {label}" transform="translate({x} {y})" clip-path="url(#{cid})">\n'
            f'  <rect id="bg" width="{S}" height="{S}" fill="{bg}"/>\n  {inner}\n</g>'
        )
    W = S * N
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{W}" viewBox="0 0 {W} {W}">\n'
        f'<title>{title}</title>\n<defs>\n' + "\n".join(defs) + "\n</defs>\n"
        f'<rect width="{W}" height="{W}" fill="{bg_default}"/>\n'
        + "\n".join(body) + "\n</svg>\n"
    )
    (OUT / name).write_text(svg, encoding="utf-8")
    print("wrote", OUT / name)


# =====================================================================
# Pattern 1 — "Морской закат" (sea sunset): coral / mustard / teal / navy
# =====================================================================
CORAL, MUST, TEAL, NAVY, CREAM, SKY = "#FF6B57", "#FFC94A", "#0E9384", "#12355B", "#FFF4DC", "#8FD3E8"


def sea_tiles():
    t = []

    # 1 sunset over the sea
    waves = "".join(wave(y, 15, 285, 14, 45, CREAM, 8) for y in (225, 258, 290))
    t.append(("Закат", CREAM,
              f'<circle cx="150" cy="190" r="100" fill="{CORAL}"/>'
              f'<circle cx="150" cy="190" r="62" fill="{MUST}"/>'
              f'<rect y="190" width="300" height="110" fill="{TEAL}"/>{waves}'))

    # 2 quarter rainbow
    rings = "".join(f'<circle cx="0" cy="300" r="{r}" fill="{c}"/>'
                    for r, c in ((270, MUST), (215, CREAM), (160, CORAL), (105, NAVY), (50, CREAM)))
    t.append(("Радуга", TEAL, rings))

    # 3 fish
    t.append(("Рыба", NAVY,
              f'<polygon points="200,150 268,92 268,208" fill="{CORAL}"/>'
              f'<polygon points="110,105 175,70 175,110" fill="{TEAL}"/>'
              f'<ellipse cx="135" cy="150" rx="95" ry="58" fill="{MUST}"/>'
              f'<path d="M150 104 Q175 150 150 196" fill="none" stroke="{NAVY}" stroke-width="8" stroke-linecap="round"/>'
              f'<path d="M172 115 Q192 150 172 185" fill="none" stroke="{CORAL}" stroke-width="8" stroke-linecap="round"/>'
              f'<circle cx="88" cy="135" r="14" fill="{CREAM}"/><circle cx="91" cy="135" r="6" fill="{NAVY}"/>'))

    # 4 diagonal stripes
    lines = "".join(f'<line x1="{-300 + i * 70}" y1="300" x2="{i * 70}" y2="0" stroke="{CREAM}" stroke-width="26"/>'
                    for i in range(0, 10))
    t.append(("Полосы", MUST, lines))

    # 5 fish scales
    sc = []
    for row in range(10):
        off = 37.5 if row % 2 else 0
        col = CORAL if row % 2 else TEAL
        for k in range(-1, 6):
            sc.append(f'<circle cx="{k * 75 + off}" cy="{row * 37.5}" r="37.5" fill="{col}" stroke="{NAVY}" stroke-width="6"/>')
    t.append(("Чешуя", NAVY, "".join(sc)))

    # 6 target
    t.append(("Мишень", MUST, "".join(
        f'<circle cx="150" cy="150" r="{r}" fill="{c}"/>'
        for r, c in ((128, NAVY), (100, CREAM), (72, CORAL), (44, TEAL), (16, NAVY)))))

    # 7 sailboat
    t.append(("Парусник", SKY,
              f'<circle cx="235" cy="65" r="34" fill="{MUST}"/>'
              f'<rect x="146" y="45" width="8" height="170" fill="{NAVY}"/>'
              f'<polygon points="142,55 142,200 62,200" fill="{CREAM}"/>'
              f'<polygon points="158,75 158,200 232,200" fill="{CORAL}"/>'
              f'<path d="M45 212 H255 L218 258 H82 Z" fill="{NAVY}"/>'
              f'<rect y="262" width="300" height="38" fill="{TEAL}"/>'
              + wave(262, 0, 300, 10, 30, SKY, 6)))

    # 8 diamond keys (lines with diamond / circle ends)
    keys = []
    for i, y in enumerate((60, 120, 180, 240)):
        left = i % 2 == 0
        x0, x1 = (40, 220) if left else (80, 260)
        keys.append(f'<rect x="{x0}" y="{y - 9}" width="{x1 - x0}" height="18" fill="{CREAM}"/>')
        ex = x1 if left else x0
        if i == 1:
            keys.append(f'<circle cx="{ex}" cy="{y}" r="30" fill="{CREAM}"/>')
        else:
            keys.append(f'<rect x="{ex - 24}" y="{y - 24}" width="48" height="48" fill="{CREAM}" transform="rotate(45 {ex} {y})"/>')
    t.append(("Ключи", CORAL, "".join(keys)))

    # 9 triangles
    tri = []
    for r in range(2):
        for k in range(-1, 5):
            x = k * 75 + (37.5 if r else 0)
            y0 = r * 150
            tri.append(f'<polygon points="{x},{y0 + 150} {x + 75},{y0 + 150} {x + 37.5},{y0}" fill="{NAVY if (k + r) % 2 else CORAL}"/>')
    t.append(("Треугольники", CREAM, "".join(tri)))

    # 10 shell
    rays = "".join(
        f'<line x1="150" y1="210" x2="{150 + 115 * math.cos(math.radians(a)):.1f}" y2="{210 - 115 * math.sin(math.radians(a)):.1f}" '
        f'stroke="{CREAM}" stroke-width="7" stroke-linecap="round"/>'
        for a in range(20, 170, 20))
    t.append(("Ракушка", SKY,
              f'<path d="M30 210 A120 120 0 0 1 270 210 Z" fill="{CORAL}"/>{rays}'
              f'<path d="M120 210 H180 L170 250 H130 Z" fill="{NAVY}"/>'))

    # 11 starfish
    dots = "".join(f'<circle cx="{150 + r * math.cos(math.radians(-90 + i * 72)):.1f}" '
                   f'cy="{155 + r * math.sin(math.radians(-90 + i * 72)):.1f}" r="8" fill="{CORAL}"/>'
                   for i in range(5) for r in (45, 80))
    t.append(("Морская звезда", TEAL,
              f'<polygon points="{star(150, 155, 130, 52, 5)}" fill="{MUST}" stroke="{MUST}" stroke-width="14" stroke-linejoin="round"/>{dots}'))

    # 12 seagulls
    def gull(x, y, s, w=8):
        return (f'<path d="M{x} {y} q {20 * s} {-26 * s} {40 * s} 0 q {20 * s} {-26 * s} {40 * s} 0" '
                f'fill="none" stroke="{NAVY}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    t.append(("Чайки", MUST,
              f'<circle cx="150" cy="300" r="110" fill="{CORAL}"/>'
              + gull(40, 95, 1.2) + gull(170, 70, 0.9) + gull(150, 160, 0.7, 7) + gull(60, 185, 0.6, 6)))

    # 13 four-petal flower
    t.append(("Цветок", TEAL,
              "".join(f'<circle cx="{150 + dx}" cy="{150 + dy}" r="62" fill="{CORAL}"/>'
                      for dx, dy in ((-62, 0), (62, 0), (0, -62), (0, 62)))
              + f'<rect x="88" y="88" width="124" height="124" fill="{CORAL}"/>'
              + f'<rect x="115" y="115" width="70" height="70" fill="{CREAM}" transform="rotate(45 150 150)"/>'))

    # 14 pills
    pills = "".join(f'<rect x="{x}" y="{y}" width="56" height="{h}" rx="28" fill="{c}"/>'
                    for x, y, h, c in ((22, 40, 220, CORAL), (94, 90, 180, MUST), (166, 20, 200, SKY), (238, 110, 170, CREAM)))
    t.append(("Капсулы", NAVY, pills))

    # 15 hourglass
    t.append(("Песочные часы", MUST,
              f'<polygon points="40,30 260,30 150,150" fill="{TEAL}"/>'
              f'<polygon points="40,270 260,270 150,150" fill="{NAVY}"/>'
              f'<polygon points="95,30 205,30 150,90" fill="{CREAM}"/>'
              f'<polygon points="95,270 205,270 150,210" fill="{CORAL}"/>'))

    # 16 dots
    dts = "".join(f'<circle cx="{30 + i * 60}" cy="{30 + j * 60}" r="{14 if (i + j) % 2 else 20}" '
                  f'fill="{CREAM if (i + j) % 2 else MUST}"/>' for i in range(5) for j in range(5))
    t.append(("Точки", CORAL, dts))
    return t


# =====================================================================
# Pattern 2 — "Космос" (space): night / violet / pink / peach / mint
# =====================================================================
NIGHT, VIO, PINK, PEACH, LILAC, CRM, MINT = "#241A4A", "#5B3E96", "#F48FB1", "#FFB37A", "#C9B6F2", "#FFF3E3", "#6FD6C0"


def space_tiles():
    t = []

    # 1 moon
    t.append(("Луна", NIGHT,
              f'<circle cx="140" cy="150" r="95" fill="{CRM}"/>'
              f'<circle cx="180" cy="125" r="85" fill="{NIGHT}"/>'
              + sparkle(250, 245, 24, PEACH) + sparkle(250, 70, 14, PINK) + sparkle(60, 50, 10, MINT)))

    # 2 ringed planet
    t.append(("Планета", VIO,
              f'<g transform="translate(150 150) rotate(-20)">'
              f'<ellipse rx="128" ry="32" fill="none" stroke="{CRM}" stroke-width="14"/>'
              f'<circle r="72" fill="{PEACH}"/>'
              f'<path d="M-72 -14 H72 V8 H-72 Z" fill="{PINK}"/>'
              f'<path d="M-128 0 A128 32 0 0 0 128 0" fill="none" stroke="{CRM}" stroke-width="14"/></g>'
              + sparkle(45, 255, 12, LILAC)))

    # 3 rainbow arches
    t.append(("Арка", PINK, "".join(
        f'<circle cx="150" cy="300" r="{r}" fill="{c}"/>'
        for r, c in ((135, NIGHT), (105, LILAC), (75, CRM), (45, MINT)))
        + sparkle(60, 60, 18, CRM) + sparkle(240, 50, 12, NIGHT)))

    # 4 constellation
    pts = [(50, 230), (95, 150), (160, 175), (210, 95), (255, 55), (240, 200)]
    poly = " ".join(f"{x},{y}" for x, y in pts[:5])
    t.append(("Созвездие", NIGHT,
              f'<polyline points="{poly}" fill="none" stroke="{LILAC}" stroke-width="4"/>'
              f'<line x1="160" y1="175" x2="240" y2="200" stroke="{LILAC}" stroke-width="4"/>'
              + "".join(f'<circle cx="{x}" cy="{y}" r="{12 if i % 2 else 8}" fill="{CRM if i % 2 else PEACH}"/>'
                        for i, (x, y) in enumerate(pts))
              + "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="{LILAC}"/>' for x, y in ((40, 40), (130, 60), (90, 270), (270, 270), (200, 250)))))

    # 5 rocket
    t.append(("Ракета", MINT,
              f'<g transform="rotate(35 150 150)">'
              f'<polygon points="125,185 150,280 175,185" fill="{PEACH}"/>'
              f'<polygon points="137,185 150,245 163,185" fill="{PINK}"/>'
              f'<path d="M110 150 L82 205 H120 Z" fill="{VIO}"/><path d="M190 150 L218 205 H180 Z" fill="{VIO}"/>'
              f'<path d="M150 25 C195 65 195 140 185 195 H115 C105 140 105 65 150 25 Z" fill="{CRM}"/>'
              f'<path d="M150 25 C170 42 180 58 186 75 H114 C120 58 130 42 150 25 Z" fill="{PINK}"/>'
              f'<circle cx="150" cy="125" r="22" fill="{NIGHT}"/><circle cx="150" cy="125" r="12" fill="{LILAC}"/></g>'))

    # 6 sparkles
    t.append(("Искры", PEACH,
              sparkle(150, 150, 95, NIGHT) + sparkle(150, 150, 35, PEACH)
              + sparkle(55, 60, 30, VIO) + sparkle(250, 245, 34, PINK)
              + sparkle(250, 55, 16, CRM) + sparkle(50, 250, 18, CRM)))

    # 7 diamond lattice
    dia = []
    for r in range(-1, 5):
        for k in range(-1, 5):
            cx, cy = k * 75 + (37.5 if r % 2 else 0), r * 75
            dia.append(f'<polygon points="{cx},{cy - 37.5} {cx + 37.5},{cy} {cx},{cy + 37.5} {cx - 37.5},{cy}" '
                       f'fill="{VIO if (k + r) % 2 else LILAC}"/>')
            dia.append(f'<circle cx="{cx}" cy="{cy}" r="7" fill="{CRM}"/>')
    t.append(("Ромбы", LILAC, "".join(dia)))

    # 8 comet
    tail = "".join(f'<line x1="{205 + dx}" y1="{95 + dy}" x2="{40 + dx}" y2="{260 + dy}" stroke="{c}" stroke-width="22" stroke-linecap="round"/>'
                   for dx, dy, c in ((-22, -22, PINK), (0, 0, PEACH), (22, 22, MINT)))
    t.append(("Комета", VIO, tail + f'<circle cx="215" cy="85" r="48" fill="{CRM}"/>'
              + sparkle(70, 70, 16, CRM) + sparkle(255, 235, 12, LILAC)))

    # 9 sunburst
    rays = "".join(
        f'<polygon points="150,150 {150 + 240 * math.cos(math.radians(a - 7.5)):.1f},{150 + 240 * math.sin(math.radians(a - 7.5)):.1f} '
        f'{150 + 240 * math.cos(math.radians(a + 7.5)):.1f},{150 + 240 * math.sin(math.radians(a + 7.5)):.1f}" fill="{PEACH}"/>'
        for a in range(0, 360, 30))
    t.append(("Солнце", PINK, rays + f'<circle cx="150" cy="150" r="78" fill="{CRM}"/><circle cx="150" cy="150" r="42" fill="{VIO}"/>'))

    # 10 portal arches
    def arch(w, top, color):
        x0, x1, rr = 150 - w / 2, 150 + w / 2, w / 2
        return f'<path d="M{x0} 300 V{top + rr} A{rr} {rr} 0 0 1 {x1} {top + rr} V300 Z" fill="{color}"/>'
    t.append(("Портал", NIGHT,
              arch(220, 40, VIO) + arch(170, 75, PINK) + arch(120, 110, PEACH) + arch(70, 145, CRM)
              + sparkle(150, 210, 16, NIGHT)))

    # 11 waves
    wv = "".join(wave(y, -10, 320, 22, 60, c, 18)
                 for y, c in ((55, NIGHT), (110, PINK), (165, NIGHT), (220, PINK), (275, NIGHT)))
    t.append(("Волны", MINT, wv))

    # 12 UFO
    t.append(("НЛО", NIGHT,
              f'<polygon points="115,160 185,160 245,300 55,300" fill="{LILAC}" opacity="0.45"/>'
              f'<path d="M100 140 A50 50 0 0 1 200 140 Z" fill="{MINT}"/>'
              f'<ellipse cx="150" cy="148" rx="105" ry="26" fill="{PINK}"/>'
              + "".join(f'<circle cx="{x}" cy="150" r="7" fill="{CRM}"/>' for x in (85, 118, 150, 182, 215))
              + sparkle(50, 60, 14, PEACH) + sparkle(255, 45, 10, CRM)))

    # 13 corner quarter circles
    t.append(("Лепестки", VIO,
              "".join(f'<circle cx="{x}" cy="{y}" r="140" fill="{c}"/>'
                      for x, y, c in ((0, 0, PINK), (300, 0, PEACH), (300, 300, MINT), (0, 300, CRM)))
              + f'<circle cx="150" cy="150" r="22" fill="{NIGHT}"/>'))

    # 14 orbits
    orb = "".join(f'<circle cx="150" cy="150" r="{r}" fill="none" stroke="{VIO}" stroke-width="4"/>' for r in (50, 90, 130))
    t.append(("Орбиты", CRM, orb + f'<circle cx="150" cy="150" r="28" fill="{PEACH}"/>'
              f'<circle cx="185" cy="115" r="14" fill="{PINK}"/>'
              f'<circle cx="64" cy="187" r="18" fill="{MINT}"/>'
              f'<circle cx="242" cy="242" r="22" fill="{NIGHT}"/>'))

    # 15 chevrons
    ch = "".join(f'<polyline points="-10,{y + 40} 50,{y} 110,{y + 40} 170,{y} 230,{y + 40} 290,{y} 350,{y + 40}" '
                 f'fill="none" stroke="{c}" stroke-width="20" stroke-linejoin="miter"/>'
                 for y, c in ((20, NIGHT), (80, CRM), (140, NIGHT), (200, CRM), (260, NIGHT)))
    t.append(("Зигзаг", PINK, ch))

    # 16 big star
    t.append(("Звезда", LILAC,
              f'<polygon points="{star(150, 150, 135, 60, 8, -90)}" fill="{PEACH}"/>'
              f'<polygon points="{star(150, 150, 80, 38, 8, -67.5)}" fill="{PINK}"/>'
              f'<circle cx="150" cy="150" r="28" fill="{NIGHT}"/>'))
    return t


if __name__ == "__main__":
    build("pattern-1-sea.svg", "Паттерн 1 — Морской закат", sea_tiles(), CREAM)
    build("pattern-2-space.svg", "Паттерн 2 — Космос", space_tiles(), NIGHT)
