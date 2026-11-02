/**
 * Secuencia de fotogramas ligada al scroll, pintada en un canvas.
 *
 * Por qué no un <video> con currentTime: los navegadores solo saltan bien a fotogramas clave, así que
 * un vídeo «scrubbed» va a tirones y en Safari móvil a veces ni pinta. N imágenes WebP decodificadas
 * por adelantado dan un scrub exacto, ida y vuelta. Se generan con scripts/secuencia.py.
 *
 * Coordenadas: las anclas y recortes se expresan en la imagen FUENTE normalizada (0–1). `cubrir()`
 * devuelve cómo cae la fuente en la pantalla (object-fit: cover), así un punto de la fuente sigue en
 * su sitio con cualquier recorte o tamaño de ventana.
 */

export type Secuencia = {
  fotos: HTMLImageElement[];
  /** 0–1: cuántas están decodificadas (para un precargador real). */
  cargadas: () => number;
  /** Última foto decodificada en o antes de i (si la i aún no está, no se pinta un hueco). */
  foto: (i: number) => HTMLImageElement | null;
};

/** Ruta de la foto i: `${base}/${pad(i)}.${ext}` con 3 cifras, desde 001. */
export const rutaFoto = (base: string, i: number, ext = 'webp') => `${base}/${String(i + 1).padStart(3, '0')}.${ext}`;

/**
 * Carga N fotos en orden de prioridad: primero la 1.ª y la última (lo que se ve sin scroll y al soltar),
 * luego cada 8.ª, luego el resto. Así un scroll rápido nunca encuentra la pantalla vacía.
 */
export function cargarSecuencia(base: string, n: number, ext = 'webp'): Secuencia {
  const fotos: HTMLImageElement[] = new Array(n);
  const listas = new Uint8Array(n);
  let hechas = 0;
  const orden: number[] = [];
  const visto = new Set<number>();
  const pon = (i: number) => {
    if (i >= 0 && i < n && !visto.has(i)) {
      visto.add(i);
      orden.push(i);
    }
  };
  pon(0);
  pon(n - 1);
  for (let i = 0; i < n; i += 8) pon(i);
  for (let i = 0; i < n; i++) pon(i);

  let cola = 0;
  const siguiente = () => {
    if (cola >= orden.length) return;
    const i = orden[cola++];
    const img = new Image();
    img.decoding = 'async';
    img.src = rutaFoto(base, i, ext);
    fotos[i] = img;
    img
      .decode()
      .catch(() => undefined)
      .finally(() => {
        listas[i] = 1;
        hechas++;
        siguiente();
      });
  };
  // 6 descargas en paralelo: más satura la red móvil sin ganar tiempo.
  for (let k = 0; k < 6; k++) siguiente();

  return {
    fotos,
    cargadas: () => hechas / n,
    foto: (i) => {
      for (let j = Math.max(0, Math.min(n - 1, i)); j >= 0; j--) if (listas[j]) return fotos[j];
      return null;
    },
  };
}

export type Encaje = {escala: number; x: number; y: number; w: number; h: number};

/** object-fit: cover de una fuente sw×sh en un marco w×h, con el foco (0–1) que debe quedar visible. */
export function cubrir(sw: number, sh: number, w: number, h: number, focoX = 0.5, focoY = 0.5): Encaje {
  const escala = Math.max(w / sw, h / sh);
  const dw = sw * escala;
  const dh = sh * escala;
  return {escala, x: (w - dw) * focoX, y: (h - dh) * focoY, w: dw, h: dh};
}

/** Punto normalizado de la fuente → píxel CSS del marco. */
export const aPantalla = (e: Encaje, u: number, v: number) => [e.x + u * e.w, e.y + v * e.h] as const;

/** Ajusta el canvas a su tamaño CSS × DPR (≤ 2). Devuelve el DPR usado. */
export function ajustarLienzo(c: HTMLCanvasElement): number {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(c.clientWidth * dpr);
  const h = Math.round(c.clientHeight * dpr);
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return dpr;
}

/** Fotograma clave de un ancla: en la foto `f`, el punto está en (x, y) de la fuente normalizada. */
export type Clave = [f: number, x: number, y: number];

/**
 * Posición de un ancla en la foto f (puede ser fraccionaria), interpolando entre sus claves.
 * Fuera de su primera y última clave devuelve null: el ancla no existe en esa parte del plano.
 */
export function anclaEn(claves: Clave[], f: number): [number, number] | null {
  if (!claves.length || f < claves[0][0] || f > claves[claves.length - 1][0]) return null;
  // Catmull-Rom: pasa por cada clave sin frenar en ella (lineal da quiebros, smoothstep se para en cada clave).
  const cr = (a: number, b: number, c: number, d: number, t: number) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  for (let k = 0; k < claves.length - 1; k++) {
    const [f0] = claves[k];
    const [f1] = claves[k + 1];
    if (f <= f1) {
      const t = f1 > f0 ? (f - f0) / (f1 - f0) : 0;
      const a = claves[Math.max(0, k - 1)];
      const b = claves[k];
      const c = claves[k + 1];
      const d = claves[Math.min(claves.length - 1, k + 2)];
      return [cr(a[1], b[1], c[1], d[1], t), cr(a[2], b[2], c[2], d[2], t)];
    }
  }
  const u = claves[claves.length - 1];
  return [u[1], u[2]];
}
