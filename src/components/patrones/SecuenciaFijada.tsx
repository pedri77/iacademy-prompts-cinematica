import {useEffect, useRef} from 'react';
import {useMovimientoReducido} from '../../hooks/useMovimientoReducido';
import {clamp, progresoFijado, tramo} from '../../lib/math';
import {enCadaFotograma} from '../../lib/scroll';
import {ajustarLienzo, anclaEn, aPantalla, cargarSecuencia, cubrir, type Clave} from '../../lib/secuencia';

/**
 * Patrones 12 y 13: un plano filmado (o renderizado) que el scroll reproduce fotograma a fotograma,
 * con capítulos de texto encima y etiquetas ancladas a puntos que se mueven dentro del plano.
 *
 * Guion de scroll (p):
 *   0.00 – 0.04  el primer fotograma ya está (se carga primero); el precargador se va
 *   0.02 – 0.96  foto = p reescalado a 0…N-1; las dos puntas sujetan el primer y el último fotograma
 *   capítulos    cada uno en su tramo [desde, hasta], entra y sale en 0.03 de p, alternando lado
 *   anclas       existen entre su primera y su última clave; aparecen y se van en 4 fotos
 *
 * Herramienta de autor (solo en `npm run dev`): Alt+clic sobre el plano imprime en consola
 * `[foto, x, y]` en coordenadas de la fuente. Recorre el plano con el scroll, haz Alt+clic sobre el
 * punto a seguir cada 10–20 fotos y pega las claves en content.ts.
 */

export type Ancla = {id: string; etiqueta: string; detalle?: string; claves: Clave[]};
export type Capitulo = {desde: number; hasta: number; titulo: string; texto: string};

type Props = {
  /** Carpeta de las fotos (sin barra final), p. ej. `${BASE}secuencias/d/plano`. */
  base: string;
  /** Carpeta para móvil (encuadre vertical); si falta, usa `base`. */
  baseMovil?: string;
  /**
   * [x0, ancho] del recorte móvil dentro de la fuente de escritorio, en fracciones (lo imprime
   * scripts/secuencia.py). Las anclas se escriben siempre en coordenadas de escritorio y aquí se
   * trasladan al recorte; sin esto, en móvil caen desplazadas.
   */
  recorteMovil?: [number, number];
  n: number;
  ext?: string;
  altoVh?: number;
  /** Punto de la fuente que no debe salir del encuadre al recortar (object-position). */
  foco?: [number, number];
  capitulos?: Capitulo[];
  anclas?: Ancla[];
  /** Foto que se enseña quieta con movimiento reducido (por defecto, la última). */
  fotoQuieta?: number;
  etiqueta: string;
};

const BORDE = 0.03;

export function SecuenciaFijada({base, baseMovil, recorteMovil, n, ext = 'webp', altoVh = 420, foco = [0.5, 0.5], capitulos = [], anclas = [], fotoQuieta, etiqueta}: Props) {
  const raizRef = useRef<HTMLElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const cargaRef = useRef<HTMLDivElement>(null);
  const capRefs = useRef<(HTMLDivElement | null)[]>([]);
  const anclaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducido = useMovimientoReducido();
  const reducidoRef = useRef(reducido);
  reducidoRef.current = reducido;

  useEffect(() => {
    const movil = matchMedia('(max-width: 767px)').matches;
    const enMovil = movil && !!baseMovil;
    const sec = cargarSecuencia(enMovil ? baseMovil! : base, n, ext);
    // fuente de escritorio → fuente que se está pintando
    const [rx0, rw] = enMovil && recorteMovil ? recorteMovil : [0, 1];
    const aFuente = (u: number) => (u - rx0) / rw;
    const deFuente = (u: number) => rx0 + u * rw;
    const lienzo = lienzoRef.current!;
    const ctx = lienzo.getContext('2d')!;
    let ultima = '';

    const quitarAutor = (() => {
      if (!import.meta.env.DEV) return () => undefined;
      const clic = (e: MouseEvent) => {
        if (!e.altKey) return;
        const img = sec.foto(0);
        if (!img) return;
        const r = lienzo.getBoundingClientRect();
        const enc = cubrir(img.naturalWidth, img.naturalHeight, r.width, r.height, foco[0], foco[1]);
        const x = deFuente((e.clientX - r.left - enc.x) / enc.w);
        const y = (e.clientY - r.top - enc.y) / enc.h;
        console.log(`[${lienzo.dataset.foto}, ${x.toFixed(3)}, ${y.toFixed(3)}],`);
      };
      lienzo.addEventListener('click', clic);
      return () => lienzo.removeEventListener('click', clic);
    })();

    const quitarBucle = enCadaFotograma(() => {
      const raiz = raizRef.current;
      if (!raiz) return;
      const {p, visible} = progresoFijado(raiz);
      if (!visible) return;
      const carga = sec.cargadas();
      cargaRef.current!.style.transform = `scaleX(${carga})`;
      cargaRef.current!.parentElement!.style.opacity = String(carga < 1 ? 1 : 0);

      const f = reducidoRef.current ? (fotoQuieta ?? n - 1) : clamp(tramo(p, 0.02, 0.96)) * (n - 1);
      const i = Math.round(f);
      const img = sec.foto(i);
      const dpr = ajustarLienzo(lienzo);
      const w = lienzo.clientWidth;
      const h = lienzo.clientHeight;
      if (img && img.naturalWidth) {
        const clave = `${img.src}|${lienzo.width}x${lienzo.height}`;
        if (clave !== ultima) {
          ultima = clave;
          const e = cubrir(img.naturalWidth, img.naturalHeight, w, h, foco[0], foco[1]);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.drawImage(img, e.x, e.y, e.w, e.h);
          lienzo.dataset.foto = String(i);
        }
        const e = cubrir(img.naturalWidth, img.naturalHeight, w, h, foco[0], foco[1]);
        anclas.forEach((a, k) => {
          const el = anclaRefs.current[k];
          if (!el) return;
          const pos = anclaEn(a.claves, f);
          if (!pos) {
            el.style.opacity = '0';
            return;
          }
          const [x, y] = aPantalla(e, aFuente(pos[0]), pos[1]);
          const f0 = a.claves[0][0];
          const f1 = a.claves[a.claves.length - 1][0];
          // Un punto fuera del encuadre (p. ej. en el recorte móvil) no lleva etiqueta; se apaga en los 24 px del borde.
          const dentro = clamp(Math.min(x, w - x, y, h - y) / 24);
          const vida = Math.min(clamp((f - f0) / 4), clamp((f1 - f) / 4)) * dentro;
          // Lado con sitio para la etiqueta entera; si no cabe en ninguno (móvil), el más amplio y en varias líneas.
          const texto = el.lastElementChild as HTMLElement;
          const largo = w < 600 ? 28 : 64;
          const ancho = Number(texto.dataset.ancho) || texto.offsetWidth;
          texto.dataset.ancho = String(ancho);
          const sitioDer = w - x - largo - 18;
          const sitioIzq = x - largo - 18;
          const izquierda = ancho <= sitioDer ? false : ancho <= sitioIzq ? true : sitioIzq > sitioDer;
          const cabe = ancho <= (izquierda ? sitioIzq : sitioDer);
          el.style.setProperty('--largo', `${largo}px`);
          texto.style.whiteSpace = cabe ? 'nowrap' : 'normal';
          texto.style.width = cabe ? '' : `${Math.max(120, izquierda ? sitioIzq : sitioDer)}px`;
          el.style.opacity = String(vida);
          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          el.dataset.lado = izquierda ? 'izq' : 'der';
        });
      }

      capitulos.forEach((c, k) => {
        const el = capRefs.current[k];
        if (!el) return;
        const o = tramo(p, c.desde, c.desde + BORDE) * (1 - tramo(p, c.hasta - BORDE, c.hasta));
        el.style.opacity = String(o);
        el.style.transform = `translate3d(0, ${(1 - o) * 2}vh, 0)`;
        el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
      });
    });
    return () => {
      quitarBucle();
      quitarAutor();
    };
  }, [base, baseMovil, recorteMovil, n, ext, foco, capitulos, anclas, fotoQuieta]);

  return (
    <section ref={raizRef} aria-label={etiqueta} className="relative" style={{height: `${altoVh}svh`}}>
      <div className="sticky top-0 h-pantalla overflow-hidden bg-void">
        <canvas ref={lienzoRef} aria-hidden="true" className="absolute inset-0 size-full" />
        {/* Velos: la cabecera arriba y los capítulos abajo se leen aunque el plano sea claro ahí. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-void/75 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[48svh] bg-gradient-to-t from-void/90 via-void/55 to-transparent" />
        {/* Precargador real: avanza con las fotos decodificadas, no con un temporizador. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/10 transition-opacity duration-700">
          <div ref={cargaRef} className="h-full origin-left bg-rojo" style={{transform: 'scaleX(0)'}} />
        </div>

        {anclas.map((a, k) => (
          <div
            key={a.id}
            ref={(el) => {
              anclaRefs.current[k] = el;
            }}
            aria-hidden="true"
            className="ancla pointer-events-none absolute left-0 top-0 will-change-transform"
            style={{opacity: 0}}
          >
            <span className="ancla-punto" />
            <span className="ancla-linea" />
            <span className="ancla-texto">
              <b>{a.etiqueta}</b>
              {a.detalle && <small>{a.detalle}</small>}
            </span>
          </div>
        ))}

        {capitulos.map((c, k) => (
          <div
            key={c.titulo}
            ref={(el) => {
              capRefs.current[k] = el;
            }}
            aria-hidden="true"
            className={`absolute bottom-[12svh] max-w-md px-6 md:px-0 ${k % 2 ? 'right-0 md:right-[8vw] md:text-right' : 'left-0 md:left-[8vw]'}`}
            style={{opacity: 0, visibility: 'hidden'}}
          >
            <h2 className="font-display text-display text-texto">{c.titulo}</h2>
            <p className="mt-3 text-lead text-texto-2">{c.texto}</p>
          </div>
        ))}
        {/* Para lectores de pantalla y para quien no hace scroll: todo el texto, en orden. */}
        <div className="sr-only">
          {capitulos.map((c) => (
            <p key={c.titulo}>
              {c.titulo}. {c.texto}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
