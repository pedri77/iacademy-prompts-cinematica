"""Genera las capas provisionales del escenario en SVG (coste 0).

Cada capa comparte lienzo y encuadre, así encajan a cualquier viewport con
object-cover. Cuando lleguen los renders con IA se sustituyen por WebP con
los mismos nombres (ver content.ts: extCapas).

Uso: python3 -I scripts/capas_provisionales.py public/capas
"""
import random
import sys
from pathlib import Path

VOID = "#0f0f18"
SUP = "#1a1a2e"
ELEV = "#2a2a3d"
BORDE = "#3a3a50"
ROJO = "#EF4444"
CALIDO = "#f3e2c4"

FORMATOS = {
    # nombre: (ancho, alto, cx ventanal, ancho ventanal, y arriba, y abajo, ancho estantería)
    "d": dict(W=2400, H=1350, cx=1200, vw=520, vt=150, vb=930, sw=600, mesa=(860, 1540), ym=1010, ys=1160),
    "m": dict(W=1080, H=1920, cx=540, vw=430, vt=420, vb=1300, sw=190, mesa=(220, 860), ym=1470, ys=1650),
}


def svg(W, H, cuerpo, defs=""):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        f'preserveAspectRatio="xMidYMid slice"><defs>{defs}</defs>{cuerpo}</svg>\n'
    )


def fondo(f, rnd):
    W, H, cx = f["W"], f["H"], f["cx"]
    defs = (
        f'<radialGradient id="g" cx="{cx / W:.3f}" cy="0.38" r="0.75">'
        f'<stop offset="0" stop-color="#2b2140"/><stop offset="0.45" stop-color="{SUP}"/>'
        f'<stop offset="1" stop-color="{VOID}"/></radialGradient>'
        f'<radialGradient id="r" cx="{cx / W:.3f}" cy="0.4" r="0.32">'
        f'<stop offset="0" stop-color="{ROJO}" stop-opacity="0.22"/><stop offset="1" stop-color="{ROJO}" stop-opacity="0"/></radialGradient>'
    )
    motas = "".join(
        f'<circle cx="{rnd.random() * W:.0f}" cy="{rnd.random() * H * 0.8:.0f}" r="{0.6 + rnd.random() * 1.6:.1f}" '
        f'fill="#fff" opacity="{0.05 + rnd.random() * 0.25:.2f}"/>'
        for _ in range(160)
    )
    return svg(W, H, f'<rect width="{W}" height="{H}" fill="url(#g)"/><rect width="{W}" height="{H}" fill="url(#r)"/>{motas}', defs)


def arco(cx, w, top, bottom):
    """Ventanal ojival: dos arcos que se cruzan arriba."""
    l, r = cx - w / 2, cx + w / 2
    hombro = top + w * 0.75
    return f"M{l} {bottom} L{l} {hombro} Q{l} {top + w * 0.15} {cx} {top} Q{r} {top + w * 0.15} {r} {hombro} L{r} {bottom} Z"


def ventanal(f, rnd):
    W, H, cx, w, t, b = f["W"], f["H"], f["cx"], f["vw"], f["vt"], f["vb"]
    defs = (
        f'<linearGradient id="luz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{CALIDO}" stop-opacity="0.95"/>'
        f'<stop offset="0.7" stop-color="#e9a77f" stop-opacity="0.75"/><stop offset="1" stop-color="{ROJO}" stop-opacity="0.55"/></linearGradient>'
        f'<linearGradient id="haz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{CALIDO}" stop-opacity="0.16"/>'
        f'<stop offset="1" stop-color="{CALIDO}" stop-opacity="0"/></linearGradient>'
    )
    marco = arco(cx, w + 60, t - 40, b + 30)
    vidrio = arco(cx, w, t, b)
    parteluz = "".join(
        f'<rect x="{cx - w / 2 + w * k / 4 - 5:.0f}" y="{t + w * 0.2:.0f}" width="10" height="{b - t - w * 0.2:.0f}" fill="{SUP}"/>' for k in (1, 2, 3)
    )
    travesanos = "".join(
        f'<rect x="{cx - w / 2:.0f}" y="{t + (b - t) * k:.0f}" width="{w}" height="8" fill="{SUP}"/>' for k in (0.45, 0.72)
    )
    haz = f'<path d="M{cx - w / 2} {b} L{cx + w / 2} {b} L{cx + w * 1.6} {H} L{cx - w * 1.6} {H} Z" fill="url(#haz)"/>'
    cuerpo = f'{haz}<path d="{marco}" fill="{ELEV}"/><path d="{vidrio}" fill="url(#luz)"/>{parteluz}{travesanos}'
    return svg(W, H, cuerpo, defs)


def estanteria(x0, x1, H, rnd, lado):
    partes = [f'<rect x="{x0}" y="0" width="{x1 - x0}" height="{H}" fill="{VOID}"/>']
    baldas = range(80, H, 230)
    for y in baldas:
        partes.append(f'<rect x="{x0}" y="{y + 190}" width="{x1 - x0}" height="14" fill="{ELEV}"/>')
        x = x0 + 14
        while x < x1 - 30:
            ancho = rnd.randint(18, 46)
            alto = rnd.randint(110, 185)
            color = rnd.choice([SUP, ELEV, BORDE, "#24243a", "#3b2230" if rnd.random() < 0.15 else SUP])
            inclinado = rnd.random() < 0.06
            tr = f' transform="rotate({8 if lado == "i" else -8} {x} {y + 190})"' if inclinado else ""
            partes.append(f'<rect x="{x}" y="{y + 190 - alto}" width="{ancho}" height="{alto}" rx="2" fill="{color}"{tr}/>')
            if rnd.random() < 0.12:
                partes.append(f'<rect x="{x}" y="{y + 190 - alto + 18}" width="{ancho}" height="3" fill="{ROJO}" opacity="0.6"/>')
            x += ancho + rnd.randint(1, 5)
    # Canto interior iluminado por el ventanal.
    borde = x1 - 6 if lado == "i" else x0
    partes.append(f'<rect x="{borde}" y="0" width="6" height="{H}" fill="{BORDE}"/>')
    return "".join(partes)


def estanterias(f, rnd):
    W, H, sw = f["W"], f["H"], f["sw"]
    return svg(W, H, estanteria(0, sw, H, rnd, "i") + estanteria(W - sw, W, H, rnd, "d"))


def atril(f, rnd):
    W, H = f["W"], f["H"]
    x0, x1 = f["mesa"]
    y = f["ym"]
    cx = (x0 + x1) / 2
    lw = (x1 - x0)
    defs = (
        f'<radialGradient id="lampara" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="{CALIDO}" stop-opacity="0.55"/>'
        f'<stop offset="1" stop-color="{CALIDO}" stop-opacity="0"/></radialGradient>'
    )
    libro_w = lw * 0.42
    lx = cx - libro_w / 2
    lamp_x = x1 - lw * 0.14
    cuerpo = (
        f'<ellipse cx="{lamp_x}" cy="{y - 40}" rx="{lw * 0.45}" ry="{lw * 0.3}" fill="url(#lampara)"/>'
        f'<rect x="{x0}" y="{y}" width="{lw}" height="26" rx="6" fill="{ELEV}"/>'
        f'<rect x="{x0 + 30}" y="{y + 26}" width="{lw - 60}" height="{H - y}" fill="{SUP}"/>'
        # Libro abierto.
        f'<path d="M{lx} {y} Q{lx + libro_w * 0.25} {y - 34} {cx} {y - 10} Q{cx + libro_w * 0.25} {y - 34} {lx + libro_w} {y} Z" fill="{CALIDO}" opacity="0.92"/>'
        f'<path d="M{cx} {y - 10} L{cx} {y}" stroke="{BORDE}" stroke-width="3"/>'
        + "".join(
            f'<rect x="{lx + 20 + (0 if k < 4 else libro_w / 2)}" y="{y - 22 + (k % 4) * 5}" width="{libro_w / 2 - 50}" height="1.6" fill="{BORDE}" opacity="0.5"/>'
            for k in range(8)
        )
        # Lámpara de pie de mesa.
        + f'<rect x="{lamp_x - 4}" y="{y - 130}" width="8" height="130" fill="{BORDE}"/>'
        f'<path d="M{lamp_x - 48} {y - 120} L{lamp_x + 48} {y - 120} L{lamp_x + 28} {y - 168} L{lamp_x - 28} {y - 168} Z" fill="{ROJO}"/>'
        f'<rect x="{lamp_x - 40}" y="{y - 6}" width="80" height="8" rx="4" fill="{BORDE}"/>'
    )
    return svg(W, H, cuerpo, defs)


def suelo(f, rnd):
    W, H, ys = f["W"], f["H"], f["ys"]
    defs = (
        f'<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SUP}"/>'
        f'<stop offset="0.35" stop-color="{VOID}"/></linearGradient>'
    )
    tablas = "".join(
        f'<line x1="{W / 2 + (k - 6) * W / 8:.0f}" y1="{ys}" x2="{W / 2 + (k - 6) * W / 3:.0f}" y2="{H}" stroke="{ELEV}" stroke-width="2" opacity="0.5"/>'
        for k in range(13)
    )
    return svg(W, H, f'<path d="M0 {ys} L{W} {ys} L{W} {H} L0 {H} Z" fill="url(#s)"/>{tablas}', defs)


CAPAS = {"fondo": fondo, "ventanal": ventanal, "estanterias": estanterias, "atril": atril, "suelo": suelo}


def main(destino: str):
    for nombre_f, f in FORMATOS.items():
        carpeta = Path(destino) / nombre_f
        carpeta.mkdir(parents=True, exist_ok=True)
        for nombre, fn in CAPAS.items():
            rnd = random.Random(f"{nombre_f}-{nombre}")
            (carpeta / f"{nombre}.svg").write_text(fn(f, rnd))
    print("capas generadas en", destino)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "public/capas")
