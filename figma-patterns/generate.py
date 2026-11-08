"""Generate two simple geometric tile patterns as Figma-ready SVG files.

Each pattern is a 4x4 grid of 300x300 tiles (1200x1200 total).
Every tile is a named group (the `id` becomes the layer name in Figma),
clipped to its square, and holds only one or two basic shapes:
circles, half/quarter circles, triangles, squares, stripes.

Run:  python3 generate.py
"""
from pathlib import Path

S = 300  # tile size
N = 4    # tiles per row/column
OUT = Path(__file__).parent


def build(name, title, tiles):
    defs, body = [], []
    for idx, (label, bg, inner) in enumerate(tiles):
        r, c = divmod(idx, N)
        cid = f"clip-{idx + 1}"
        defs.append(f'<clipPath id="{cid}"><rect width="{S}" height="{S}"/></clipPath>')
        body.append(
            f'<g id="{idx + 1:02d} {label}" transform="translate({c * S} {r * S})" clip-path="url(#{cid})">\n'
            f'  <rect id="bg" width="{S}" height="{S}" fill="{bg}"/>\n  {inner}\n</g>'
        )
    W = S * N
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{W}" viewBox="0 0 {W} {W}">\n'
        f'<title>{title}</title>\n<defs>\n' + "\n".join(defs) + "\n</defs>\n"
        + "\n".join(body) + "\n</svg>\n"
    )
    (OUT / name).write_text(svg, encoding="utf-8")
    print("wrote", OUT / name)


def circle(cx, cy, r, fill):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>'


def poly(points, fill):
    return f'<polygon points="{points}" fill="{fill}"/>'


def rect(x, y, w, h, fill, rx=0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"/>'


# =====================================================================
# Pattern 1 — "Тёплый": коралловый / горчичный / бирюзовый / кремовый
# =====================================================================
CORAL, MUST, TEAL, CREAM = "#FF6B57", "#FFC94A", "#0E9384", "#FFF4DC"


def warm_tiles():
    return [
        ("Полукруг", CREAM, circle(150, 300, 120, CORAL)),
        ("Четверть круга", TEAL, circle(0, 0, 240, MUST)),
        ("Круг", CORAL, circle(150, 150, 100, CREAM)),
        ("Полосы", MUST, "".join(rect(0, y, 300, 40, CREAM) for y in (40, 130, 220))),

        ("Треугольник", TEAL, poly("150,50 260,250 40,250", CREAM)),
        ("Ромб", CREAM, poly("150,40 260,150 150,260 40,150", TEAL)),
        ("Кольцо", MUST, circle(150, 150, 110, CORAL) + circle(150, 150, 55, MUST)),
        ("Четверть круга 2", CORAL, circle(300, 300, 240, CREAM)),

        ("Диагональ", MUST, poly("0,0 300,0 0,300", CORAL)),
        ("Квадрат", CORAL, rect(75, 75, 150, 150, MUST)),
        ("Капсулы", CREAM, "".join(rect(x, 40, 60, 220, TEAL, 30) for x in (45, 195))),
        ("Полукруг сверху", TEAL, circle(150, 0, 130, CORAL)),

        ("Точки", CORAL, "".join(circle(x, y, 35, CREAM) for x in (85, 215) for y in (85, 215))),
        ("Треугольник вниз", MUST, poly("40,60 260,60 150,250", CORAL)),
        ("Половинки", TEAL, circle(150, 150, 110, CREAM) + rect(150, 0, 150, 300, TEAL) + f'<path d="M150 40 A110 110 0 0 1 150 260 Z" fill="{MUST}"/>'),
        ("Круг 2", CREAM, circle(150, 150, 100, TEAL)),
    ]


# =====================================================================
# Pattern 2 — "Ночной": тёмно-фиолетовый / розовый / мятный / кремовый
# =====================================================================
NIGHT, PINK, MINT, CRM = "#241A4A", "#F48FB1", "#6FD6C0", "#FFF3E3"


def night_tiles():
    arch = lambda w, top, c: (f'<path d="M{150 - w / 2} 300 V{top + w / 2} A{w / 2} {w / 2} 0 0 1 '
                              f'{150 + w / 2} {top + w / 2} V300 Z" fill="{c}"/>')
    return [
        ("Арка", NIGHT, arch(180, 60, PINK)),
        ("Луна", PINK, circle(140, 150, 100, CRM) + circle(185, 120, 85, PINK)),
        ("Плюс", MINT, rect(120, 50, 60, 200, NIGHT) + rect(50, 120, 200, 60, NIGHT)),
        ("Песочные часы", CRM, poly("50,40 250,40 150,150", NIGHT) + poly("50,260 250,260 150,150", PINK)),

        ("Лист", CRM, f'<path d="M50 250 A200 200 0 0 1 250 50 A200 200 0 0 1 50 250 Z" fill="{MINT}"/>'),
        ("Круг", NIGHT, circle(150, 150, 100, MINT)),
        ("Три круга", PINK, "".join(circle(x, 150, 40, CRM) for x in (60, 150, 240))),
        ("Ромб", MINT, poly("150,40 260,150 150,260 40,150", CRM)),

        ("Шахматка", PINK, rect(0, 0, 150, 150, NIGHT) + rect(150, 150, 150, 150, NIGHT)),
        ("Радуга", CRM, circle(150, 300, 140, PINK) + circle(150, 300, 90, CRM) + circle(150, 300, 45, MINT)),
        ("Четверть круга", NIGHT, circle(300, 0, 240, MINT)),
        ("Звезда", PINK, poly("150,40 178,122 260,150 178,178 150,260 122,178 40,150 122,122", NIGHT)),

        ("Кольцо", PINK, circle(150, 150, 110, CRM) + circle(150, 150, 60, PINK)),
        ("Треугольник", NIGHT, poly("150,50 260,250 40,250", MINT)),
        ("Полосы", MINT, "".join(rect(x, 0, 40, 300, CRM) for x in (40, 130, 220))),
        ("Арка 2", CRM, arch(180, 60, NIGHT)),
    ]


if __name__ == "__main__":
    build("pattern-1-warm.svg", "Паттерн 1 — Тёплый", warm_tiles())
    build("pattern-2-night.svg", "Паттерн 2 — Ночной", night_tiles())
