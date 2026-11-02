import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useMovimientoReducido} from '../../hooks/useMovimientoReducido';
import {clamp, easeOutCubic, lerp, progresoFijado, tramo} from '../../lib/math';
import {enCadaFotograma} from '../../lib/scroll';

/**
 * Patrón 19: plantilla que se rellena con el scroll. Un texto real con huecos [entre corchetes]: cada hueco
 * se enciende y luego se transforma en un valor de ejemplo; el ancho del hueco pasa del ancho del marcador
 * al del valor, así el párrafo se recoloca solo, sin saltos. Al final aparece «Copiar», que copia el texto
 * completo ya rellenado. Sirve para cualquier producto cuyo valor sea «rellenas y listo»: prompts,
 * plantillas, contratos, formularios.
 *
 * Guion de scroll (p), con N huecos:
 *   0.00 – 0.10  la tarjeta entra (sube 4 vh y se enciende)
 *   hueco i      a = 0.14 + i · (0.66 / N): se enciende en [a, a + 0.05] (borde de acento y halo)
 *                y se rellena en [a + 0.06, a + 0.06 + 0.07]: el marcador se apaga, entra el valor y el
 *                ancho pasa de uno a otro (easeOutCubic)
 *   0.84 – 0.94  «Copiar», el aviso de privacidad y el enlace aparecen; contador «N / N huecos»
 *
 * Movimiento reducido: todo relleno desde el principio. Lectores de pantalla: el texto completo rellenado
 * va en un bloque sr-only; la animación es aria-hidden.
 */

export type Trozo = string | {hueco: string; valor: string};

type Props = {
  id?: string;
  etiqueta: string;
  antetitulo?: string;
  titulo: string;
  ficha?: string;
  trozos: Trozo[];
  /** Texto que sigue al fragmento visible, para copiar el original completo. */
  resto?: string;
  copiar: string;
  copiado: string;
  privacidad?: string;
  enlace?: {texto: string; href: string};
  altoVh?: number;
};

export function PromptRelleno({id, etiqueta, antetitulo, titulo, ficha, trozos, resto = '', copiar, copiado, privacidad, enlace, altoVh = 320}: Props) {
  const raizRef = useRef<HTMLElement>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const huecoRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const finalRef = useRef<HTMLDivElement>(null);
  const cuentaRef = useRef<HTMLSpanElement>(null);
  const anchos = useRef<[number, number][]>([]);
  const [hecho, setHecho] = useState(false);
  const reducido = useMovimientoReducido();
  const reducidoRef = useRef(reducido);
  reducidoRef.current = reducido;

  const huecos = trozos.filter((t): t is {hueco: string; valor: string} => typeof t !== 'string');
  const N = huecos.length;
  const relleno = trozos.map((t) => (typeof t === 'string' ? t : t.valor)).join('').replace(/…$/, '') + resto;

  // Anchos naturales de marcador y valor de cada hueco; se vuelven a medir al cargar fuentes y al redimensionar.
  useLayoutEffect(() => {
    const medir = () => {
      anchos.current = huecoRefs.current.map((el) => {
        if (!el) return [0, 0];
        const [m, v] = el.children as unknown as HTMLElement[];
        return [m.offsetWidth, v.offsetWidth];
      });
    };
    medir();
    document.fonts?.ready.then(medir);
    addEventListener('resize', medir);
    return () => removeEventListener('resize', medir);
  }, [trozos]);

  useEffect(() => {
    let pAnterior = -1;
    return enCadaFotograma(() => {
      const raiz = raizRef.current;
      if (!raiz) return;
      const {p, visible} = progresoFijado(raiz);
      if (!visible) return;
      const q = reducidoRef.current ? 1 : p;
      if (Math.abs(q - pAnterior) < 0.0002) return;
      pAnterior = q;

      const entra = easeOutCubic(tramo(q, 0, 0.1));
      tarjetaRef.current!.style.opacity = String(lerp(0.25, 1, entra));
      tarjetaRef.current!.style.transform = `translate3d(0, ${(1 - entra) * 4}vh, 0)`;

      let llenos = 0;
      huecoRefs.current.forEach((el, i) => {
        if (!el) return;
        const a = 0.14 + i * (0.66 / N);
        const luz = tramo(q, a, a + 0.05);
        const k = easeOutCubic(tramo(q, a + 0.06, a + 0.13));
        const [wm, wv] = anchos.current[i] ?? [0, 0];
        if (wm && wv) el.style.width = `${lerp(wm, wv, k)}px`;
        const [m, v] = el.children as unknown as HTMLElement[];
        m.style.opacity = String(1 - k);
        v.style.opacity = String(k);
        el.style.setProperty('--luz', String(clamp(luz * (1 - k * 0.6))));
        if (k > 0.99) llenos++;
      });
      cuentaRef.current!.textContent = `${llenos} / ${N}`;
      const fin = tramo(q, 0.84, 0.94);
      finalRef.current!.style.opacity = String(fin);
      finalRef.current!.style.visibility = fin > 0.01 ? 'visible' : 'hidden';
    });
  }, [N]);

  let h = -1;
  return (
    <section ref={raizRef} id={id} aria-label={etiqueta} className="relative" style={{height: `${altoVh}svh`}}>
      <div className="sticky top-0 flex h-pantalla flex-col items-center justify-center overflow-hidden bg-void px-4 sm:px-6">
        <div className="w-full max-w-3xl">
          {antetitulo && <p className="antetitulo text-center text-rojo uppercase">{antetitulo}</p>}
          <h2 className="mt-3 text-center font-display text-display text-texto">{titulo}</h2>

          <div ref={tarjetaRef} className="mt-[5svh] rounded-2xl border border-borde bg-superficie p-5 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] md:p-8" style={{opacity: 0.25}}>
            <div className="flex items-center justify-between gap-4 border-b border-borde pb-3 text-[0.75rem] text-texto-3">
              <span className="truncate">{ficha}</span>
              <span className="shrink-0 font-mono tabular-nums" aria-hidden="true">
                <span ref={cuentaRef} className="text-texto">0 / {N}</span> huecos
              </span>
            </div>
            <p aria-hidden="true" className="mt-4 text-[0.95rem] leading-[1.9] text-texto-2 md:text-[1.0625rem]">
              {trozos.map((t, i) => {
                if (typeof t === 'string') return <span key={i}>{t}</span>;
                h++;
                const j = h;
                return (
                  <span
                    key={i}
                    ref={(el) => {
                      huecoRefs.current[j] = el;
                    }}
                    className="hueco"
                  >
                    <span className="hueco-marcador">[{t.hueco}]</span>
                    <span className="hueco-valor" style={{opacity: 0}}>
                      {t.valor}
                    </span>
                  </span>
                );
              })}
            </p>
            <p className="sr-only">{relleno}</p>

            <div ref={finalRef} className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between" style={{opacity: 0, visibility: 'hidden'}}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(relleno).then(() => {
                    setHecho(true);
                    setTimeout(() => setHecho(false), 2200);
                  });
                }}
                className="rounded-full bg-rojo px-6 py-2.5 text-[0.9375rem] font-semibold text-texto transition-colors duration-200 hover:bg-rojo-profundo"
              >
                {hecho ? copiado : copiar}
              </button>
              {privacidad && <span className="text-[0.75rem] text-texto-3">{privacidad}</span>}
            </div>
          </div>
          {enlace && (
            <p className="mt-4 text-center text-[0.875rem]">
              <a href={enlace.href} className="text-texto-2 underline decoration-borde underline-offset-4 hover:text-texto">
                {enlace.texto} →
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
