import {useEffect, useRef, type ReactNode} from 'react';
import {useMovimientoReducido} from '../../hooks/useMovimientoReducido';
import {clamp, lerp, progresoFijado} from '../../lib/math';
import {enCadaFotograma, irAPosicion} from '../../lib/scroll';

/**
 * Patrón 17: abanico de cartas. Una mano de cartas repartida desde un pivote común muy por debajo del
 * marco; el scroll gira el abanico y la carta enfocada se LEVANTA: sale de la escala de sus vecinas
 * (más grande, más arriba, recta, por delante). Por eso se lee «cogida», no solo «la más cercana».
 *
 * Geometría: cada carta es una sola rotación alrededor del pivote (transform-origin en 50% + RADIO px
 * por debajo). Posición e inclinación salen de ese único ángulo: no hay trigonometría por carta.
 *
 * Guion de scroll (p):
 *   0.00 – 0.12  el abanico se abre desde cerrado (paso 0 → PASO grados)
 *   0.08 – 0.92  foco = p reescalado a 0…N-1; el abanico gira para dejar la enfocada arriba
 *   foco         |i − foco| < 1: sube LEVANTA px, escala 1.12, se endereza, z-index arriba
 *   título       z-index por encima de las cartas y 10 svh de aire; el bloque va desde arriba (no centrado), porque las cartas giradas caen hacia abajo: la carta levantada crece hacia él
 *   resto        escala 0.92, opacidad 1 − 0.12·distancia (mínimo 0.45)
 *
 * También responde a flechas y a clic en una carta (salta el scroll a su tramo). Si la carta lleva `href`,
 * el clic en una carta NO enfocada la enfoca; en la enfocada, sigue el enlace (es un <a> de verdad:
 * funciona con teclado, clic central y lectores de pantalla).
 */

export type Carta = {id: string; contenido: ReactNode; etiqueta: string; href?: string};

type Props = {
  cartas: Carta[];
  titulo?: string;
  /** Cabecera libre (antetítulo, título con id, avisos); sustituye a `titulo`. */
  cabecera?: ReactNode;
  etiqueta: string;
  /** id de la sección (ancla de navegación). */
  id?: string;
  altoVh?: number;
  /** Clases de tamaño del mazo (alto y ancho de una carta). */
  tamano?: string;
};

const PASO = 9;
const RADIO = 1100;
const LEVANTA = 30;

export function Abanico({cartas, titulo, cabecera, etiqueta, id, altoVh = 380, tamano = 'h-[40svh] w-[min(56vw,26svh)]'}: Props) {
  const raizRef = useRef<HTMLElement>(null);
  const cartaRefs = useRef<(HTMLElement | null)[]>([]);
  const contadorRef = useRef<HTMLSpanElement>(null);
  const reducido = useMovimientoReducido();
  const reducidoRef = useRef(reducido);
  reducidoRef.current = reducido;
  const N = cartas.length;

  /** Lleva el scroll al punto en que la carta i queda enfocada. */
  const ir = (i: number) => {
    const raiz = raizRef.current;
    if (!raiz) return;
    const recorrido = raiz.offsetHeight - window.innerHeight;
    const p = 0.08 + (clamp(i, 0, N - 1) / Math.max(1, N - 1)) * 0.84;
    irAPosicion(raiz.offsetTop + p * recorrido, !reducidoRef.current);
  };

  useEffect(() => {
    let pAnterior = -1;
    return enCadaFotograma(() => {
      const raiz = raizRef.current;
      if (!raiz) return;
      const {p, visible} = progresoFijado(raiz);
      if (!visible || Math.abs(p - pAnterior) < 0.0002) return;
      pAnterior = p;
      const abre = reducidoRef.current ? 1 : clamp(p / 0.12);
      const foco = clamp((p - 0.08) / 0.84) * (N - 1);
      const paso = PASO * abre;
      cartaRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = i - foco;
        const cerca = clamp(1 - Math.abs(d));
        const a = d * paso * (1 - cerca * 0.9);
        const escala = lerp(0.92, 1.12, cerca);
        // giro sobre el pivote lejano (botón) y levantar/escalar sobre el centro de la carta (hijo):
        // si la escala usara el pivote, la carta subiría ~(RADIO + alto)·0,12 px de más.
        el.style.transform = `rotate(${a}deg)`;
        (el.firstElementChild as HTMLElement).style.transform = `translate3d(0, ${-LEVANTA * cerca}px, 0) scale(${escala})`;
        el.style.opacity = String(Math.max(0.45, 1 - 0.12 * Math.abs(d)));
        el.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
        el.setAttribute('aria-current', Math.abs(d) < 0.5 ? 'true' : 'false');
      });
      contadorRef.current!.textContent = `${String(Math.round(foco) + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    });
  }, [N]);

  return (
    <section ref={raizRef} id={id} aria-label={etiqueta} className="relative" style={{height: `${altoVh}svh`}}>
      <div className="sticky top-0 flex h-pantalla flex-col items-center overflow-hidden bg-void pt-[9svh]">
        {cabecera ? (
          <div className="relative z-[200] mb-[10svh] px-6 text-center">{cabecera}</div>
        ) : (
          titulo && <h2 className="relative z-[200] mb-[10svh] px-6 text-center font-display text-display text-texto">{titulo}</h2>
        )}
        <div
          className={`relative ${tamano}`}
          onKeyDown={(e) => {
            const actual = cartaRefs.current.findIndex((c) => c?.getAttribute('aria-current') === 'true');
            if (e.key === 'ArrowRight') ir(actual + 1);
            else if (e.key === 'ArrowLeft') ir(actual - 1);
            else return;
            e.preventDefault();
          }}
        >
          {cartas.map((c, i) => {
            const ref = (el: HTMLElement | null) => {
              cartaRefs.current[i] = el;
            };
            const clase = 'absolute inset-0 block cursor-pointer text-left will-change-transform';
            const estilo = {transformOrigin: `50% calc(100% + ${RADIO}px)`};
            const cara = (
              <span className="block size-full overflow-hidden rounded-2xl border border-borde bg-superficie shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)] will-change-transform">
                {c.contenido}
              </span>
            );
            return c.href ? (
              <a
                key={c.id}
                ref={ref}
                href={c.href}
                aria-label={c.etiqueta}
                onClick={(e) => {
                  if (e.currentTarget.getAttribute('aria-current') === 'true') return;
                  e.preventDefault();
                  ir(i);
                }}
                className={clase}
                style={estilo}
              >
                {cara}
              </a>
            ) : (
              <button key={c.id} ref={ref} type="button" aria-label={c.etiqueta} onClick={() => ir(i)} className={clase} style={estilo}>
                {cara}
              </button>
            );
          })}
        </div>
        <span ref={contadorRef} className="absolute bottom-[3svh] z-[200] font-mono text-etiqueta tabular-nums text-texto-2" aria-hidden="true" />
      </div>
    </section>
  );
}
