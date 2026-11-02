import {useEffect, useRef} from 'react';
import {capas, escenario, extCapas, robot, type Capa} from '../content';
import {useMovimientoReducido} from '../hooks/useMovimientoReducido';
import {clamp, easeOutCubic, lerp, progresoFijado, tramo} from '../lib/math';
import {enCadaFotograma} from '../lib/scroll';

/**
 * Escenario de entrada: una biblioteca a oscuras que aparece al disipar la niebla.
 * Cinco capas recortadas del mismo encuadre, apiladas y fijadas; un único
 * progreso p (0–1) mueve cada una a su ritmo.
 *
 * Guion de scroll (p):
 *   0.00 – 0.20  la niebla se disipa hacia arriba (velo + partículas)
 *   0.00 – 0.50  el fondo se asienta (zoom 1.12 → 1)
 *   0.05 – 0.45  el ventanal se enciende y baja a su sitio
 *   0.00 – 0.08  la invitación «Desliza…» se apaga antes que la niebla
 *   0.12 – 0.30  el titular se escribe letra a letra (sube, gira y se enfoca);
 *                «con método» entra al final, en rojo
 *   0.26 – 0.56  las estanterías se cierran desde fuera: estás dentro
 *   0.32 – 0.60  el atril y el suelo suben (el suelo va por debajo de estanterías y atril)
 *   0.38 – 0.62  el robot sube junto al atril; flota suave y se balancea al saludar
 *   0.52 – 0.68  bocadillo del robot
 *   0.44 – 0.54  el titular cede el sitio al atril
 *   0.70 – 1.00  todo sube; estanterías y atril se desvanecen y el delantal del suelo funde a negro
 * Encima, un HUD: claridad (%), número de prompts y lugar.
 */

const ALTO_VH = 440;
const ENCUADRE = 'absolute inset-0 size-full object-cover';
const BASE = import.meta.env.BASE_URL;

type Mota = {x: number; y: number; r: number; v: number; a: number};

/** Letras visibles de la primera línea (sin espacios): desde aquí empieza «con método». */
const LETRAS_TITULO = escenario.titulo.replace(/\s/g, '').length;

/**
 * Parte un texto en letras animables sin romper palabras: cada palabra va en un
 * bloque sin saltos y cada letra en su propio span. Los lectores de pantalla leen
 * el aria-label del h1, no las letras sueltas.
 */
function Letras({texto, desde, refs}: {texto: string; desde: number; refs: React.RefObject<HTMLSpanElement[]>}) {
  let n = desde;
  return (
    <span aria-hidden="true">
      {texto.split(' ').map((palabra, w) => (
        <span key={w}>
          {w > 0 && ' '}
          <span className="inline-block whitespace-nowrap">
            {[...palabra].map((letra) => {
              const i = n++;
              return (
                <span
                  key={i}
                  ref={(el) => {
                    if (el) refs.current[i] = el;
                  }}
                  className="inline-block origin-bottom-left will-change-transform"
                  style={{opacity: 0}}
                >
                  {letra}
                </span>
              );
            })}
          </span>
        </span>
      ))}
    </span>
  );
}

export function Escenario() {
  const raizRef = useRef<HTMLElement>(null);
  const capaRefs = useRef<Partial<Record<Capa, HTMLDivElement>>>({});
  const veloRef = useRef<HTMLDivElement>(null);
  const invitacionRef = useRef<HTMLDivElement>(null);
  const nieblaRef = useRef<HTMLCanvasElement>(null);
  const tituloRef = useRef<HTMLDivElement>(null);
  const letraRefs = useRef<HTMLSpanElement[]>([]);
  const hudRef = useRef<HTMLDivElement>(null);
  const claridadRef = useRef<HTMLSpanElement>(null);
  const robotRef = useRef<HTMLDivElement>(null);
  const robotImgRef = useRef<HTMLImageElement>(null);
  const bocadilloRef = useRef<HTMLDivElement>(null);
  const reducido = useMovimientoReducido();
  const reducidoRef = useRef(reducido);
  reducidoRef.current = reducido;

  // Tamaño del lienzo de niebla.
  useEffect(() => {
    const c = nieblaRef.current!;
    const sync = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const lienzo = nieblaRef.current!;
    const ctx = lienzo.getContext('2d')!;
    let semilla = 7;
    const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    const motas: Mota[] = Array.from({length: 120}, () => ({x: azar(), y: azar(), r: 0.5 + azar() * 1.8, v: 0.3 + azar(), a: 0.15 + azar() * 0.5}));
    let pAnterior = -1;
    let tAnterior = 0;

    const pon = (n: Capa, y: number, escala = 1, opacidad = 1) => {
      const el = capaRefs.current[n];
      if (!el) return;
      el.style.transform = `translate3d(0, ${y}vh, 0) scale(${escala})`;
      el.style.opacity = String(opacidad);
    };

    return enCadaFotograma((t) => {
      const dt = tAnterior ? Math.min(0.1, (t - tAnterior) / 1000) : 1 / 60;
      tAnterior = t;
      const raiz = raizRef.current;
      if (!raiz) return;
      const {p, rect} = progresoFijado(raiz);
      if (rect.bottom < 0) return;

      // Partículas: se mueven en cada fotograma mientras haya niebla.
      const niebla = 1 - tramo(p, 0, 0.2);
      if (niebla > 0.001) {
        const w = lienzo.clientWidth;
        const h = lienzo.clientHeight;
        const dpr = lienzo.width / Math.max(1, w);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#e8e4f0';
        for (const m of motas) {
          if (!reducidoRef.current) {
            m.x += 0.005 * m.v * dt;
            m.y -= 0.006 * m.v * dt;
            if (m.x > 1) m.x -= 1;
            if (m.y < 0) m.y += 1;
          }
          ctx.globalAlpha = m.a * niebla;
          ctx.beginPath();
          ctx.arc(m.x * w, (m.y - p * 0.7) * h, m.r * (1 + p * 5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Robot: flota con el tiempo (no con el scroll) mientras está en pantalla.
      const r = robotRef.current!;
      const llega = easeOutCubic(tramo(p, 0.38, 0.62));
      const salidaR = tramo(p, 0.7, 1);
      const flota = reducidoRef.current ? 0 : Math.sin(t / 900) * 0.8;
      const saluda = Math.sin(tramo(p, 0.5, 0.7) * Math.PI * 3) * 3 * (1 - tramo(p, 0.66, 0.7));
      r.style.transform = `translate3d(0, ${lerp(42, 0, llega) - salidaR * 60 + flota}vh, 0)`;
      robotImgRef.current!.style.transform = `rotate(${saluda}deg)`;
      r.style.opacity = String(clamp(llega * 1.6) * (1 - tramo(p, 0.74, 0.9)));
      const bocadillo = tramo(p, 0.52, 0.58) * (1 - tramo(p, 0.64, 0.68));
      bocadilloRef.current!.style.opacity = String(bocadillo);
      bocadilloRef.current!.style.transform = `translate3d(0, ${(1 - bocadillo) * 12}px, 0) scale(${lerp(0.92, 1, bocadillo)})`;

      if (Math.abs(p - pAnterior) < 0.00005) return;
      pAnterior = p;

      const salida = tramo(p, 0.7, 1);
      const asienta = easeOutCubic(tramo(p, 0, 0.5));

      veloRef.current!.style.opacity = String(niebla);
      veloRef.current!.style.transform = `translate3d(0, ${-tramo(p, 0, 0.2) * 22}vh, 0) scale(${1 + tramo(p, 0, 0.2) * 0.3})`;
      lienzo.style.opacity = String(niebla);
      invitacionRef.current!.style.opacity = String(1 - tramo(p, 0, 0.08));

      // De lejos a cerca: cada capa más rápida que la de detrás.
      pon('fondo', lerp(0, -5, p), lerp(1.12, 1, asienta));
      const luz = easeOutCubic(tramo(p, 0.05, 0.45));
      pon('ventanal', lerp(-8, 0, luz) - salida * 14, lerp(0.94, 1, luz), lerp(0.25, 1, luz));
      const cierre = easeOutCubic(tramo(p, 0.26, 0.56));
      pon('estanterias', -salida * 34, lerp(1.6, 1, cierre), clamp(cierre * 1.4) * (1 - tramo(p, 0.72, 0.9)));
      const sube = easeOutCubic(tramo(p, 0.32, 0.6));
      pon('atril', lerp(30, 0, sube) - salida * 56, 1, clamp(sube * 2) * (1 - tramo(p, 0.72, 0.88)));
      pon('suelo', lerp(34, 0, sube) - salida * 80);

      // Titular: se resuelve y luego cede.
      const sale = tramo(p, 0.44, 0.54);
      const titulo = tituloRef.current!;
      titulo.style.opacity = String(1 - sale);
      titulo.style.transform = `translate3d(0, ${-p * 8}vh, 0)`;
      // Letra a letra: cada una tiene su propio tramo dentro de 0.12 – 0.30.
      const letras = letraRefs.current;
      letras.forEach((el, i) => {
        const a = 0.12 + (i / letras.length) * 0.12 + (i >= LETRAS_TITULO ? 0.02 : 0);
        const k = easeOutCubic(tramo(p, a, a + 0.06));
        el.style.opacity = String(k);
        el.style.transform = `translate3d(0, ${(1 - k) * 0.35}em, 0) rotate(${(1 - k) * 8}deg)`;
        el.style.filter = k < 0.99 ? `blur(${(1 - k) * 6}px)` : '';
      });

      hudRef.current!.style.opacity = String(tramo(p, 0.02, 0.1) * (1 - tramo(p, 0.62, 0.72)));
      claridadRef.current!.textContent = `${Math.round(asienta * 100)} %`;
    });
  }, []);

  const capa = (n: Capa) => (
    <div
      key={n}
      ref={(el) => {
        if (el) capaRefs.current[n] = el;
      }}
      className="absolute inset-0 will-change-transform"
    >
      <picture>
        <source media="(max-width: 767px)" srcSet={`${BASE}capas/m/${n}.${extCapas}`} />
        <img src={`${BASE}capas/d/${n}.${extCapas}`} alt="" aria-hidden="true" className={ENCUADRE} decoding="async" fetchPriority={n === 'fondo' ? 'high' : 'auto'} />
      </picture>
      {/* El suelo arrastra un delantal oscuro: al subir llena la pantalla y enlaza con la página. */}
      {n === 'suelo' && <div className="absolute inset-x-0 top-full h-[110vh] bg-void" />}
    </div>
  );

  return (
    <section id="inicio" ref={raizRef} aria-label={`${escenario.titulo}, ${escenario.destacado}`} className="relative" style={{height: `${ALTO_VH}svh`}}>
      <div className="sticky top-0 h-pantalla overflow-hidden bg-void">
        {capas.slice(0, 2).map(capa)}

        {/* El titular vive entre el ventanal y las estanterías. */}
        <div ref={tituloRef} className="pointer-events-none absolute inset-x-0 top-[20%] px-4 text-center md:top-[15%]">
          <h1 aria-label={`${escenario.titulo} ${escenario.destacado}`} className="font-display text-[clamp(2.25rem,6.2vw,6.5rem)] leading-[0.98] tracking-[-0.02em] text-texto [text-shadow:0_6px_48px_oklch(8%_0.025_275/0.9)]">
            <Letras texto={escenario.titulo} desde={0} refs={letraRefs} />
            <br />
            <span className="text-rojo">
              <Letras texto={escenario.destacado} desde={LETRAS_TITULO} refs={letraRefs} />
            </span>
          </h1>
        </div>

        {capas.slice(2).map(capa)}

        {/* La mascota, delante del atril. El halo rojo la separa del fondo oscuro. */}
        <div
          ref={robotRef}
          className="pointer-events-none absolute bottom-[7vh] left-[3%] h-[36vh] origin-bottom will-change-transform md:bottom-[7vh] md:left-[31%] md:h-[47vh]"
          style={{opacity: 0}}
        >
          <img
            ref={robotImgRef}
            src={`${BASE}${robot.cuerpo}`}
            alt={robot.alt}
            width={462}
            height={900}
            decoding="async"
            className="h-full w-auto origin-bottom [mask-image:linear-gradient(to_bottom,black_93%,transparent)] [filter:drop-shadow(0_0_32px_oklch(59%_0.24_27/0.35))_drop-shadow(0_24px_24px_oklch(8%_0.025_275/0.8))]"
          />
          <div
            ref={bocadilloRef}
            className="absolute top-[2%] left-[78%] w-max max-w-[13rem] origin-bottom-left rounded-[16px] rounded-bl-[4px] border border-borde bg-superficie px-4 py-3 text-[0.875rem] leading-snug text-texto shadow-[0_4px_20px_oklch(59%_0.24_27/0.12)] md:max-w-[16rem] md:text-[0.9375rem]"
            style={{opacity: 0}}
          >
            {escenario.saludo}
          </div>
        </div>

        {/* Niebla sobre la lente. */}
        <div
          ref={veloRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 35% 40%, oklch(40% 0.03 280 / 0.55), transparent 70%), radial-gradient(50% 60% at 70% 62%, oklch(32% 0.05 20 / 0.45), transparent 70%), radial-gradient(85% 85% at 50% 50%, oklch(14% 0.03 275 / 0.9), oklch(8% 0.025 275 / 0.97))',
          }}
        >
          <div ref={invitacionRef} className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center">
            <p className="antetitulo text-texto-2 uppercase">{escenario.antetitulo}</p>
            <p className="mt-4 font-display text-[1.5rem] text-texto md:text-[2rem]">{escenario.invitacion}</p>
            <span aria-hidden="true" className="mt-6 inline-block animate-bounce text-rojo motion-reduce:animate-none">
              ↓
            </span>
          </div>
        </div>
        <canvas ref={nieblaRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />

        {/* HUD. */}
        <div ref={hudRef} aria-hidden="true" className="pointer-events-none absolute inset-4 font-mono text-[0.625rem] tracking-[0.14em] text-texto-2 uppercase sm:inset-6 md:text-etiqueta" style={{opacity: 0}}>
          <div className="esquinas absolute inset-0 text-texto-3" />
          <div className="absolute top-16 left-3 space-y-1 md:top-20 md:left-4">
            <p>
              Claridad <span ref={claridadRef} className="font-cifra tabular-nums text-texto">0 %</span>
            </p>
            <p className="text-texto-3">Niebla disipada</p>
          </div>
          <div className="absolute top-16 right-3 space-y-1 text-right md:top-20 md:right-4">
            <p>
              {escenario.hud.etiqueta} <span className="font-cifra tabular-nums text-rojo">{escenario.hud.cifra}</span>
            </p>
            <p className="text-texto-3">{escenario.hud.detalle}</p>
          </div>
          <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4">{escenario.lugar}</div>
          <div className="absolute right-3 bottom-3 flex items-center gap-2 md:right-4 md:bottom-4">
            Desliza <span className="inline-block animate-bounce motion-reduce:animate-none">↓</span>
          </div>
        </div>
      </div>
    </section>
  );
}
