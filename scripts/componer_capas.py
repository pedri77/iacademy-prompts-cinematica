# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Compone las capas del escenario en local (0 $) a partir de dos renders alineados.

  base.png   escena completa iluminada (ia/capas/base.png)
  fondo.png  la misma sala vacía, ventanal apagado (ia/capas/fondo.png)
  atril.png  edición con la mesa aislada sobre verde (solo se usa su máscara)

Por qué: pedir a un modelo «deja solo X y pinta el resto de verde» no es fiable
(mezcla piezas). Con un «plato limpio» (fondo) y la escena completa, cada capa
sale por diferencia de luz o por zona, siempre alineada al píxel.

Uso: uv run scripts/componer_capas.py   →  ia/capas-png/{fondo,ventanal,estanterias,atril,suelo}.png
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
ENT, SAL = RAIZ / "ia/capas", RAIZ / "ia/capas-png"

# Zonas en fracciones del lienzo (medidas sobre el render base del 02-11).
VENTANA = (0.30, 0.0, 0.70, 0.80)      # x0, y0, x1, y1: arco, luz y haz (la diferencia de luz hace el recorte)
MESA = (0.515, 0.655, 0.82, 0.90)      # tablero, cajones y charco de luz
LAMPARA = (0.605, 0.53, 0.725, 0.665)  # silla y lámpara, a la derecha del ventanal
ALFEIZAR = (0.42, 0.0, 0.58, 0.668)    # parte baja del ventanal que la edición dejó pegada a la mesa
ESTANT_IZQ, ESTANT_DER = 0.282, 0.722  # borde interior de cada estantería
SUELO_Y = 0.86                         # el suelo en primer plano empieza aquí


def cargar(n: str) -> np.ndarray:
    return np.asarray(Image.open(ENT / f"{n}.png").convert("RGB")).astype(np.float32)


def rampa(n: int, a: float, b: float) -> np.ndarray:
    """0 antes de a, 1 después de b (fracciones), lineal entre medias."""
    x = np.linspace(0, 1, n)
    return np.clip((x - a) / max(b - a, 1e-6), 0, 1)


def caja(h: int, w: int, z, suave: float = 0.015) -> np.ndarray:
    x0, y0, x1, y1 = z
    cx = rampa(w, x0 - suave, x0) * (1 - rampa(w, x1, x1 + suave))
    cy = rampa(h, y0 - suave, y0) * (1 - rampa(h, y1, y1 + suave))
    return cy[:, None] * cx[None, :]


def guardar(rgb: np.ndarray, alfa: np.ndarray, n: str):
    a = Image.fromarray((np.clip(alfa, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    im.putalpha(a)
    im.save(SAL / f"{n}.png")
    cobertura = np.asarray(a).mean() / 255
    print(f"✓ {n:<12} cobertura {cobertura:5.1%}")


def main():
    SAL.mkdir(parents=True, exist_ok=True)
    base, fondo = cargar("base"), cargar("fondo")
    h, w, _ = base.shape
    lum = lambda a: a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

    # fondo: opaco, tal cual.
    guardar(fondo, np.ones((h, w)), "fondo")


    # estanterías: los dos laterales del base, con borde interior suave.
    lados = np.maximum(1 - rampa(w, ESTANT_IZQ - 0.006, ESTANT_IZQ), rampa(w, ESTANT_DER, ESTANT_DER + 0.006))
    guardar(base, np.broadcast_to(lados[None, :], (h, w)), "estanterias")

    # atril: máscara de la edición aislada (no verde), limitada a mesa y lámpara y sin el alféizar; color del base.
    ed = np.asarray(Image.open(ENT / "atril.png").convert("RGB").resize((w, h))).astype(np.float32)
    verde = ed[..., 1] - np.maximum(ed[..., 0], ed[..., 2])
    mascara = 1 - np.clip((verde - 30) / 80, 0, 1)
    mesa = np.maximum(caja(h, w, MESA, 0.006), caja(h, w, LAMPARA, 0.006)) * (1 - caja(h, w, ALFEIZAR, 0.002))
    atril = mascara * mesa

    # ventanal: lo que el base tiene de más luz que la sala vacía, salvo donde está la mesa.
    dif = np.clip((lum(base) - lum(fondo) - 6) / 70, 0, 1)
    # El hueco de la mesa se difumina mucho: si fuera nítido, al moverse el atril
    # la neblina de alrededor dibujaría su silueta.
    hueco = np.asarray(Image.fromarray((np.maximum(atril, mesa) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(w * 0.012))).astype(np.float32) / 255
    hueco = np.clip(hueco * 1.6, 0, 1)
    guardar(base, dif * caja(h, w, VENTANA, 0.02) * (1 - hueco), "ventanal")
    guardar(base, atril, "atril")

    # suelo: franja delantera de la sala vacía (sin la mesa), con borde superior suave.
    franja = rampa(h, SUELO_Y - 0.03, SUELO_Y)[:, None] * np.ones((1, w))
    guardar(fondo, franja, "suelo")
    print("Siguiente: uv run ~/.agents/skills/web-cinematica/scripts/capas.py ia/capas-png public/capas")


if __name__ == "__main__":
    main()
