import {useEffect, useRef} from 'react';
import {useMovimientoReducido} from '../../hooks/useMovimientoReducido';
import {easeOutCubic, lerp, progresoFijado, tramo} from '../../lib/math';
import {enCadaFotograma} from '../../lib/scroll';

/**
 * Patrón 15: dial que cuenta. Una esfera de 270° (tacómetro, manómetro, medidor) cuya aguja barre con
 * el scroll mientras una ficha de cifras sube una tras otra. La aguja lee la cifra principal: el dial
 * no es decoración, es la misma magnitud dibujada.
 *
 * Guion de scroll (p):
 *   0.00 – 0.10  la esfera se dibuja (arco con stroke-dashoffset) y aparecen las marcas
 *   0.10 – 0.70  la aguja barre de 0 al valor principal (easeOutCubic: arranca rápido, se asienta)
 *   0.10 – 0.70  la cifra principal cuenta a la vez que la aguja
 *   0.30 – 0.85  cada cifra de la ficha cuenta en su tramo, escalonadas
 *   zona roja    desde `rojo` hasta el máximo, siempre visible
 *
 * Cifras con tabular-nums (si no, bailan). Con movimiento reducido: todo en su valor final.
 */

export type Cifra = {etiqueta: string; valor: number; unidad: string; decimales?: number};

type Props = {
  titulo: string;
  principal: Cifra;
  /** Máximo de la escala del dial (en unidades de la cifra principal). */
  maximo: number;
  /** Desde dónde empieza la zona roja (opcional). */
  rojo?: number;
  /** Número de divisiones grandes de la escala. */
  divisiones?: number;
  ficha: Cifra[];
  etiqueta: string;
  altoVh?: number;
};

const A0 = -135;
const A1 = 135;
const R = 140;
const nf = (v: number, d = 0) => v.toLocaleString('es-ES', {minimumFractionDigits: d, maximumFractionDigits: d});

/** Punto del arco en el ángulo a (grados, 0 = arriba). */
const punto = (a: number, r: number) => {
  const rad = ((a - 90) * Math.PI) / 180;
  return [160 + r * Math.cos(rad), 160 + r * Math.sin(rad)] as const;
};
const arco = (a0: number, a1: number, r: number) => {
  const [x0, y0] = punto(a0, r);
  const [x1, y1] = punto(a1, r);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

export function Dial({titulo, principal, maximo, rojo, divisiones = 8, ficha, etiqueta, altoVh = 320}: Props) {
  const raizRef = useRef<HTMLElement>(null);
  const esferaRef = useRef<SVGPathElement>(null);
  const marcasRef = useRef<SVGGElement>(null);
  const agujaRef = useRef<SVGGElement>(null);
  const principalRef = useRef<HTMLSpanElement>(null);
  const fichaRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reducido = useMovimientoReducido();
  const reducidoRef = useRef(reducido);
  reducidoRef.current = reducido;
  const angulo = (v: number) => lerp(A0, A1, Math.min(1, v / maximo));

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

      const dibuja = tramo(q, 0, 0.1);
      esferaRef.current!.style.strokeDashoffset = String(1 - dibuja);
      marcasRef.current!.style.opacity = String(dibuja);
      const k = easeOutCubic(tramo(q, 0.1, 0.7));
      const v = principal.valor * k;
      agujaRef.current!.style.transform = `rotate(${angulo(v)}deg)`;
      principalRef.current!.textContent = nf(v, principal.decimales);
      ficha.forEach((c, i) => {
        const el = fichaRefs.current[i];
        if (!el) return;
        const a = 0.3 + (i / Math.max(1, ficha.length)) * 0.4;
        el.textContent = nf(c.valor * easeOutCubic(tramo(q, a, a + 0.15)), c.decimales);
      });
    });
  }, [principal, ficha, maximo]);

  const marcas = Array.from({length: divisiones * 5 + 1}, (_, i) => {
    const grande = i % 5 === 0;
    const a = lerp(A0, A1, i / (divisiones * 5));
    const [x0, y0] = punto(a, R - (grande ? 16 : 8));
    const [x1, y1] = punto(a, R - 2);
    return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={grande ? 2 : 1} />;
  });
  const numeros = Array.from({length: divisiones + 1}, (_, i) => {
    const [x, y] = punto(lerp(A0, A1, i / divisiones), R - 32);
    return (
      <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
        {nf((maximo / divisiones) * i)}
      </text>
    );
  });

  return (
    <section ref={raizRef} aria-label={etiqueta} className="relative" style={{height: `${altoVh}svh`}}>
      <div className="sticky top-0 flex h-pantalla flex-col items-center justify-center gap-[4svh] overflow-hidden bg-void px-6 md:flex-row md:gap-[6vw]">
        <div className="relative w-[min(78vw,46svh)] md:w-[min(40vw,62svh)]">
          <svg viewBox="0 0 320 320" className="w-full" aria-hidden="true">
            <path ref={esferaRef} d={arco(A0, A1, R)} pathLength={1} strokeDasharray="1 1" fill="none" stroke="var(--color-borde)" strokeWidth={2} />
            {rojo !== undefined && <path d={arco(angulo(rojo), A1, R - 5)} fill="none" stroke="var(--color-rojo)" strokeWidth={8} />}
            <g ref={marcasRef} stroke="var(--color-texto-2)" fill="var(--color-texto-3)" fontSize={11} className="font-mono tabular-nums">
              {marcas}
              <g stroke="none">{numeros}</g>
            </g>
            <g ref={agujaRef} style={{transformOrigin: '160px 160px', transform: `rotate(${A0}deg)`}}>
              <line x1={160} y1={178} x2={160} y2={160 - R + 22} stroke="var(--color-rojo)" strokeWidth={3} strokeLinecap="round" />
            </g>
            <circle cx={160} cy={160} r={9} fill="var(--color-elevado)" stroke="var(--color-texto-2)" />
          </svg>
          <div className="absolute inset-x-0 bottom-[16%] text-center">
            <span ref={principalRef} className="font-cifra text-display tabular-nums text-texto">
              {nf(principal.valor, principal.decimales)}
            </span>
            <span className="ml-1 text-etiqueta uppercase text-texto-2">{principal.unidad}</span>
            <div className="text-etiqueta uppercase text-texto-3">{principal.etiqueta}</div>
          </div>
        </div>
        <div className="w-full max-w-sm">
          <h2 className="font-display text-display text-texto">{titulo}</h2>
          <dl className="mt-[3svh] divide-y divide-borde border-y border-borde">
            {ficha.map((c, i) => (
              <div key={c.etiqueta} className="flex items-baseline justify-between py-2.5">
                <dt className="text-etiqueta uppercase text-texto-2">{c.etiqueta}</dt>
                <dd className="font-cifra text-lead tabular-nums text-texto">
                  <span
                    ref={(el) => {
                      fichaRefs.current[i] = el;
                    }}
                  >
                    {nf(c.valor, c.decimales)}
                  </span>{' '}
                  <span className="text-body text-texto-3">{c.unidad}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
