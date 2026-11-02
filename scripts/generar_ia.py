# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Genera con fal las imágenes reales del piloto: capas del escenario y personajes.

  uv run scripts/generar_ia.py presupuesto          # no llama a nada, solo calcula
  uv run scripts/generar_ia.py personajes           # 5 personas 3D estilo Nora
  uv run scripts/generar_ia.py capas                # render base + 5 capas
  uv run scripts/generar_ia.py capas --solo atril   # generar una sola pieza
  uv run scripts/generar_ia.py personajes --solo rrhh --rehacer   # borrar lo guardado y volver a generar
  uv run scripts/generar_ia.py video --solo entrada  # plano de entrada a la biblioteca (patrones 12 y 13)
  uv run scripts/generar_ia.py video --solo triptico # plano cenital para el tríptico (patrón 14)

La clave se lee de la variable de entorno FAL_KEY y nunca se imprime.
Cada pieza ya generada en ia/ se reutiliza: repetir el comando no vuelve a pagar.
--max-usd corta antes de pasarse del tope (por defecto, el del presupuesto).
Precios publicados por fal (02-11-2026): Nano Banana Pro 0,15 $ a 1K/2K, 0,30 $ a 4K;
BiRefNet v2 0 $ por segundo de cómputo; Kling v3 Pro imagen a vídeo 0,112 $/s sin audio
(0,168 $/s con audio: aquí siempre generate_audio=false). Pueden cambiar.
"""
import argparse
import base64
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
IA = RAIZ / "ia"
NORA = Path.home() / "Dev/Claude_proyectos/Claude/personajes/piloto-nora/raw/base.png"

T2I = "fal-ai/nano-banana-pro"
EDIT = "fal-ai/nano-banana-pro/edit"
BIREFNET = "fal-ai/birefnet/v2"
PRECIO = {"1K": 0.15, "2K": 0.15, "4K": 0.30}
I2V = "fal-ai/kling-video/v3/pro/image-to-video"
PRECIO_VIDEO_S = 0.112  # sin audio

# ---------------------------------------------------------------- personajes
ESTILO = (
    "Use the reference image ONLY as the art-style reference (high-quality stylised 3D cartoon render, "
    "Pixar-like, soft subsurface skin, clean shapes, slightly exaggerated proportions). Create a NEW, "
    "clearly different fictional person, not the one in the reference: {d}. Half-body portrait from the "
    "waist up, body slightly turned, looking at the camera with a warm, confident expression. Plain flat "
    "light grey background (#cfcfcf), soft studio light, no text, no logos, no watermark."
)
PERSONAJES = {
    "docentes": "a teacher in her late forties with short silver hair and round glasses, mustard cardigan over a white blouse, holding a stack of notebooks and a tablet against her chest",
    "legal": "a lawyer in his early forties with a neatly trimmed dark beard and medium-brown skin, navy suit and open-collar white shirt, holding a thick folder of documents",
    "autonomos": "a freelancer in her late twenties with curly copper hair in a loose bun, denim shirt with rolled sleeves, a laptop under one arm and a takeaway coffee cup in the other hand",
    "rrhh": "a human-resources manager in his mid thirties, East Asian, friendly smile, light grey knit sweater, a lanyard with a plain blank badge card (no text, no letters, no photo on it), holding a clipboard",
    "claude": "a young tech trainer in her early thirties with long dark braids and warm brown skin, burgundy hoodie, holding a tablet that shows a simple chat interface with no readable text",
    "marketing": "a digital marketer in his late twenties with a short curly afro and dark skin, mustard-yellow overshirt over a black t-shirt, holding a smartphone in one hand and a small handheld microphone for social video in the other",
    "contabilidad": "an accountant in her early fifties with a neat grey-blonde bob and light skin, teal blouse and thin gold-rimmed glasses, holding a closed ledger and a calculator, friendly and precise",
}

# ---------------------------------------------------------------- capas
BASE = (
    "Cinematic stylised 3D illustration of a dark, quiet old library at night, seen from the centre aisle, "
    "symmetrical composition, 16:9. Centre: a tall gothic arched window with dark mullions and warm light "
    "(cream fading to soft red at the bottom) glowing through the glass. Left and right edges: tall dark "
    "wooden bookshelves full of books framing the view, each occupying about the outer 22% of the image, "
    "from top to bottom. Lower centre: a wooden reading desk with an open book and a small desk lamp with a "
    "red shade casting a warm pool of light. Foreground: dark wooden floorboards in perspective. Keep the "
    "upper-centre area above and around the top of the window calm for a headline, and leave clear empty "
    "floor to the left of the desk for a standing character. Palette: deep blue-violet night shadows "
    "(#0f0f18, #1a1a2e, #2a2a3d), warm cream light, red accents (#EF4444) used sparingly. Soft volumetric "
    "light, a little dust in the air. No people, no text, no logos."
)
SOLO = (
    "Same image, exactly the same framing, camera, perspective and lighting. Keep ONLY {x}, pixel-aligned "
    "where it already is. Replace absolutely everything else with flat pure chroma green #00FF00, with no "
    "shadows or gradients on the green."
)
CAPAS = {
    "fondo": (
        "Same image, exactly the same framing, camera and perspective. Remove the bookshelves, the desk, the "
        "book and the lamp, and extend the back wall, the window wall and the floor naturally where they were. "
        "Make the window UNLIT: dark night-blue glass with only a faint cold glow, no warm light. Keep the "
        "window frame and everything else in the same place.",
        False,
    ),
    "ventanal": (SOLO.format(x="the gothic window: its frame, mullions and the warm glowing glass"), True),
    "estanterias": (SOLO.format(x="the bookshelves on the left and right edges with their books"), True),
    "atril": (SOLO.format(x="the reading desk with the open book, the lamp and the pool of light on the desk"), True),
    "suelo": (SOLO.format(x="the dark wooden floorboards in the foreground, from the base of the shelves to the bottom edge"), True),
}

# ---------------------------------------------------------------- vídeo
# Cada plano: fotograma inicial (el render base o una imagen nueva), fotograma final editado desde el
# inicial (fija el movimiento de cámara: sin él el modelo improvisa) y el vídeo entre ambos.
CAMARA_FIJA = (
    " Smooth continuous camera move, no cuts, no shake, no zoom pumping. The library itself stays still: "
    "nothing moves except the camera, faint dust motes drifting in the light and a very slight flicker of "
    "the lamp. No people, no characters, no text, no logos appear at any moment."
)
PLANOS = {
    "entrada": {
        "inicio": None,  # el render base de las capas
        "inicio_prompt": None,
        "fin_prompt": (
            "Same library, same style, palette and lighting. The camera has moved straight forward down the "
            "centre aisle and now stands just in front of the reading desk, slightly above it: the desk, the "
            "open book and the red-shaded lamp fill the lower half of the frame, the lit gothic window rises "
            "behind, and the bookshelves have left the frame on both sides. No people, no text."
        ),
        "video_prompt": "Slow, steady dolly-in down the centre aisle of a quiet old library at night, toward the reading desk under the lit gothic window." + CAMARA_FIJA,
        "segundos": 8,
    },
    # Tres mesas, tres profesiones de los kits gratis (docentes, legal, autónomos), en el mismo orden que
    # el abanico. Cada mesa ocupa un tercio exacto del 16:9: el tríptico corta por esas líneas, así que la
    # cámara NO se desplaza de lado (cada profesión se quedaría a caballo entre dos paneles): baja despacio.
    "triptico": {
        "inicio": "triptico-inicio.png",
        "inicio_prompt": (
            "Same library, same stylised 3D style, palette and night lighting, now seen from directly above, "
            "looking straight down. Three identical dark wooden reading tables side by side, each one centred in "
            "exactly one third of the image width (left third, middle third, right third), separated by narrow "
            "strips of dark floorboards, each table lit by its own small red-shaded lamp. Left table, a teacher's "
            "desk: stacked notebooks, an open grading rubric, red pen, an apple. Middle table, a lawyer's desk: "
            "thick case files with ribbons, a fountain pen, a small brass scale, a closed law book. Right table, "
            "a freelancer's desk: an open laptop with a blank screen, a takeaway coffee cup, a small stack of "
            "invoices, a phone. Symmetrical, calm, tidy. No people, no hands, no text, no readable writing, "
            "no logos."
        ),
        "fin_prompt": (
            "Exactly the same top-down view of the same three tables, same objects in the same places, same "
            "style and lighting, but the camera has descended slightly closer, so each table fills a little "
            "more of its third. Each table stays centred in its own third. No people, no text."
        ),
        "video_prompt": (
            "Slow, steady top-down crane move descending gently toward three reading tables in a quiet library "
            "at night; the composition stays centred and each table stays in its own third of the frame."
            + CAMARA_FIJA
        ),
        "segundos": 6,
    },
}

# Presupuesto: piezas × precio × factor de reintentos razonable.
PRESUPUESTO = {
    "personajes": {"llamadas": len(PERSONAJES), "res": "1K", "reintentos": 1.0, "tope": 10},
    "capas": {"llamadas": 1 + len(CAPAS), "res": "4K", "reintentos": 0.5, "tope": 10},
}
# Vídeo: imágenes a 2K más segundos de vídeo; un reintento típico por pieza, tope de 6 $.
VIDEO_TOPE_USD = 6.0


def coste_plano(nombre: str) -> float:
    pl = PLANOS[nombre]
    imagenes = (1 if pl["inicio_prompt"] else 0) + 1
    return imagenes * PRECIO["2K"] + pl["segundos"] * PRECIO_VIDEO_S


class Gasto:
    def __init__(self, maximo: float):
        self.maximo, self.total = maximo, 0.0

    def antes(self, usd: float, que: str):
        if self.total + usd > self.maximo + 1e-9:
            sys.exit(f"Tope alcanzado: {self.total:.2f} $ gastados, «{que}» costaría {usd:.2f} $ (máx. {self.maximo:.2f} $).")
        self.total += usd
        print(f"  … {que}: {usd:.2f} $ (acumulado {self.total:.2f} $)", flush=True)


def clave() -> str:
    k = os.environ.get("FAL_KEY")
    if not k:
        sys.exit("Falta FAL_KEY en el entorno de este comando.")
    return k


def pedir(url: str, datos: dict | None = None) -> dict:
    req = urllib.request.Request(url, method="POST" if datos is not None else "GET")
    req.add_header("Authorization", f"Key {clave()}")
    if datos is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(datos).encode()
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        # fal explica el motivo en el cuerpo (saldo agotado, clave sin permiso, entrada no válida). Nunca incluye la clave.
        cuerpo = e.read().decode(errors="replace")[:600]
        pista = {401: "clave no válida", 403: "saldo agotado o clave sin permiso (mira fal.ai/dashboard/billing)", 422: "entrada no válida"}.get(e.code, "")
        sys.exit(f"fal respondió {e.code} ({pista}) en {url.split('?')[0]}:\n{cuerpo}\nNo se ha generado nada en esta llamada.")


def fal(modelo: str, entrada: dict, pendiente: Path | None = None) -> dict:
    """Envía a la cola de fal y espera. Con `pendiente`, guarda la petición en disco antes de esperar:
    si el script se corta o se agota el tiempo, la siguiente ejecución la retoma en vez de pagar otra."""
    if pendiente and pendiente.exists():
        sub = json.loads(pendiente.read_text())
        print(f"  retomo la petición guardada en {pendiente.name}", flush=True)
    else:
        sub = pedir(f"https://queue.fal.run/{modelo}", entrada)
        if pendiente:
            pendiente.write_text(json.dumps({k: sub[k] for k in ("request_id", "status_url", "response_url") if k in sub}))
    estado, respuesta = sub["status_url"], sub["response_url"]
    ultimo = ""
    for i in range(1200):  # hasta 60 min: un vídeo puede pasar mucho rato en cola
        s = pedir(estado)
        st = s.get("status")
        if st != ultimo or i % 20 == 0:
            extra = f" (posición {s['queue_position']})" if s.get("queue_position") is not None else ""
            print(f"  {modelo}: {st}{extra} · {i * 3 // 60} min", flush=True)
            ultimo = st
        if st == "COMPLETED":
            r = pedir(respuesta)
            if pendiente:
                pendiente.unlink(missing_ok=True)
            return r
        if st not in ("IN_QUEUE", "IN_PROGRESS"):
            sys.exit(f"fal devolvió estado {st} para {modelo}")
        time.sleep(3)
    sys.exit(f"Tiempo agotado esperando a {modelo}. La petición sigue guardada en {pendiente}: vuelve a lanzar el comando para retomarla sin pagar otra." if pendiente else f"Tiempo agotado esperando a {modelo}")


def data_uri(p: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()


def jpg_uri(p: Path, ancho: int = 1920) -> str:
    """Imagen reducida a JPEG en data URI: un PNG 4K en base64 pasa del límite de la petición."""
    im = Image.open(p).convert("RGB")
    if im.width > ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, "JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


def descargar_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=300) as r:
        return r.read()


def descargar(url: str) -> Image.Image:
    if url.startswith("data:"):
        return Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1])))
    with urllib.request.urlopen(url, timeout=120) as r:
        return Image.open(io.BytesIO(r.read()))


def croma(img: Image.Image) -> Image.Image:
    """Quita el verde #00FF00 con borde suave y elimina el reflejo verde."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dominio = g - np.maximum(r, b)
    alfa = 1 - np.clip((dominio - 40) / 90, 0, 1)
    g = np.where(dominio > 0, np.maximum(r, b), g)  # quita el reflejo verde de los bordes
    rgba = np.dstack([r, g, b, alfa * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def presupuesto():
    total = tope = 0.0
    print(f"{'tarea':<12}{'llamadas':>9}{'res':>5}{'típico':>9}{'tope':>8}")
    for t, c in PRESUPUESTO.items():
        precio = PRECIO[c["res"]]
        tipico = c["llamadas"] * (1 + c["reintentos"]) * precio
        maximo = c["tope"] * precio
        total += tipico
        tope += maximo
        print(f"{t:<12}{c['llamadas']:>9}{c['res']:>5}{tipico:>8.2f}${maximo:>7.2f}$")
    print(f"{'total':<26}{total:>8.2f}${tope:>7.2f}$")
    print("Recorte de fondo (BiRefNet) y verde: 0 $. Precios de fal a 02-11-2026.")
    print()
    print(f"{'vídeo':<12}{'una toma':>10}{'típico':>9}  (Kling v3 Pro sin audio, {PRECIO_VIDEO_S} $/s; tope {VIDEO_TOPE_USD:.2f} $)")
    for n, pl in PLANOS.items():
        c = coste_plano(n)
        print(f"{n:<12}{c:>9.2f}${2 * c:>8.2f}$  ({pl['segundos']} s)")


def personajes(gasto: Gasto, solo: str | None):
    if not NORA.exists():
        sys.exit(f"No encuentro la referencia de estilo {NORA}")
    crudos, salida = IA / "personajes", RAIZ / "public/personajes"
    crudos.mkdir(parents=True, exist_ok=True)
    salida.mkdir(parents=True, exist_ok=True)
    for nombre, desc in PERSONAJES.items():
        if solo and nombre != solo:
            continue
        crudo = crudos / f"{nombre}.png"
        if not crudo.exists():
            gasto.antes(PRECIO["1K"], f"personaje {nombre}")
            r = fal(EDIT, {"prompt": ESTILO.format(d=desc), "image_urls": [data_uri(NORA)], "aspect_ratio": "4:5", "resolution": "1K", "output_format": "png"})
            descargar(r["images"][0]["url"]).save(crudo)
        recorte = crudos / f"{nombre}-recorte.png"
        if not recorte.exists():
            r = fal(BIREFNET, {"image_url": data_uri(crudo)})
            descargar(r["image"]["url"]).convert("RGBA").save(recorte)
        im = Image.open(recorte)
        im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox())
        im.thumbnail((720, 900), Image.LANCZOS)
        im.save(salida / f"{nombre}.webp", "WEBP", quality=82, method=6)
        print(f"✓ {nombre}: public/personajes/{nombre}.webp {im.size}")


def capas(gasto: Gasto, solo: str | None):
    crudos, listas = IA / "capas", IA / "capas-png"
    crudos.mkdir(parents=True, exist_ok=True)
    listas.mkdir(parents=True, exist_ok=True)
    base = crudos / "base.png"
    if not base.exists():
        gasto.antes(PRECIO["4K"], "render base")
        r = fal(T2I, {"prompt": BASE, "aspect_ratio": "16:9", "resolution": "4K", "output_format": "png"})
        descargar(r["images"][0]["url"]).save(base)
        print(f"✓ base: {base}. Revísalo antes de seguir si quieres (Ctrl+C ahora y vuelve a lanzar).")
    tam = Image.open(base).size
    for nombre, (prompt, transparente) in CAPAS.items():
        if solo and nombre != solo:
            continue
        crudo = crudos / f"{nombre}.png"
        if not crudo.exists():
            gasto.antes(PRECIO["4K"], f"capa {nombre}")
            r = fal(EDIT, {"prompt": prompt, "image_urls": [data_uri(base)], "aspect_ratio": "16:9", "resolution": "4K", "output_format": "png"})
            descargar(r["images"][0]["url"]).save(crudo)
        im = Image.open(crudo)
        if im.size != tam:
            im = im.resize(tam, Image.LANCZOS)
        (croma(im) if transparente else im.convert("RGBA")).save(listas / f"{nombre}.png")
        print(f"✓ {nombre}: {listas / (nombre + '.png')}")
    print("Siguiente: uv run ~/.agents/skills/web-cinematica/scripts/capas.py ia/capas-png public/capas")


def video(gasto: Gasto, solo: str | None):
    carpeta = IA / "video"
    carpeta.mkdir(parents=True, exist_ok=True)
    base = IA / "capas" / "base.png"
    for nombre, pl in PLANOS.items():
        if solo and nombre != solo:
            continue
        # 1. fotograma inicial
        if pl["inicio"] is None:
            if not base.exists():
                sys.exit("Falta ia/capas/base.png (el render base de las capas).")
            inicio = base
        else:
            inicio = carpeta / pl["inicio"]
            if not inicio.exists():
                if not base.exists():
                    sys.exit("Falta ia/capas/base.png: es la referencia de estilo del plano.")
                gasto.antes(PRECIO["2K"], f"{nombre}: fotograma inicial")
                r = fal(EDIT, {"prompt": pl["inicio_prompt"], "image_urls": [jpg_uri(base)], "aspect_ratio": "16:9", "resolution": "2K", "output_format": "png"})
                descargar(r["images"][0]["url"]).save(inicio)
                print(f"✓ {inicio.relative_to(RAIZ)}")
        # 2. fotograma final, editado desde el inicial para que sea el mismo lugar
        fin = carpeta / f"{nombre}-fin.png"
        if not fin.exists():
            gasto.antes(PRECIO["2K"], f"{nombre}: fotograma final")
            r = fal(EDIT, {"prompt": pl["fin_prompt"], "image_urls": [jpg_uri(inicio)], "aspect_ratio": "16:9", "resolution": "2K", "output_format": "png"})
            descargar(r["images"][0]["url"]).save(fin)
            print(f"✓ {fin.relative_to(RAIZ)}  ← míralo: si no es el mismo lugar, --rehacer antes de pagar el vídeo")
        # 3. el vídeo entre los dos
        mp4 = carpeta / f"{nombre}.mp4"
        pendiente = carpeta / f"{nombre}.pendiente.json"
        if not mp4.exists():
            if not pendiente.exists():  # retomar una petición ya enviada no se vuelve a cobrar
                gasto.antes(pl["segundos"] * PRECIO_VIDEO_S, f"{nombre}: vídeo de {pl['segundos']} s")
            r = fal(I2V, {
                "prompt": pl["video_prompt"],
                "start_image_url": jpg_uri(inicio),
                "end_image_url": jpg_uri(fin),
                "duration": str(pl["segundos"]),
                "generate_audio": False,
                "negative_prompt": "people, person, character, text, letters, cuts, camera shake, morphing, warping, blur, low quality",
                "cfg_scale": 0.5,
            }, pendiente)
            mp4.write_bytes(descargar_bytes(r["video"]["url"]))
            print(f"✓ {mp4.relative_to(RAIZ)}")
        print(f"Siguiente: python3 ~/.agents/skills/web-cinematica/scripts/secuencia.py {mp4.relative_to(RAIZ)} public/secuencias/{nombre} --n 120")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tarea", choices=["presupuesto", "personajes", "capas", "video"])
    ap.add_argument("--solo", help="trabajar solo con esta pieza")
    ap.add_argument("--rehacer", action="store_true", help="con --solo: borra lo guardado de esa pieza y la vuelve a generar")
    ap.add_argument("--max-usd", type=float)
    a = ap.parse_args()
    if a.tarea == "presupuesto":
        return presupuesto()
    if a.solo and a.tarea == "video" and a.solo not in PLANOS:
        sys.exit(f"Plano desconocido: {a.solo}. Opciones: {', '.join(PLANOS)}")
    if a.rehacer:
        if not a.solo:
            sys.exit("--rehacer necesita --solo <pieza>, para no volver a pagar todo.")
        carpeta = IA / {"personajes": "personajes", "capas": "capas", "video": "video"}[a.tarea]
        for p in carpeta.glob(f"{a.solo}*.png"):
            p.unlink()
            print(f"  borrado {p.relative_to(RAIZ)}")
    if a.tarea == "video":
        gasto = Gasto(a.max_usd if a.max_usd is not None else VIDEO_TOPE_USD)
        video(gasto, a.solo)
    else:
        c = PRESUPUESTO[a.tarea]
        gasto = Gasto(a.max_usd if a.max_usd is not None else c["tope"] * PRECIO[c["res"]])
        (personajes if a.tarea == "personajes" else capas)(gasto, a.solo)
    print(f"Gasto de esta ejecución: {gasto.total:.2f} $")


if __name__ == "__main__":
    main()
