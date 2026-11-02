import {cierre, marca, nav} from '../content';
import {useAjustarTexto} from '../hooks/useAjustarTexto';
import {useAparecer} from '../hooks/useAparecer';
import {irA} from '../lib/scroll';

export function Cabecera() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6 md:px-[6vw]">
      <a
        href="#inicio"
        onClick={(e) => {
          e.preventDefault();
          irA('#inicio');
        }}
        className="font-display text-[1.375rem] text-texto"
      >
        IAcademy<span className="text-rojo">.</span>
      </a>
      <nav aria-label="Secciones" className="flex items-center gap-1 rounded-full border border-borde bg-superficie/80 p-1 backdrop-blur-sm">
        {nav.map((n) => (
          <a
            key={n.href}
            href={n.href}
            onClick={(e) => {
              e.preventDefault();
              irA(n.href);
            }}
            className="rounded-full px-4 py-1.5 text-[0.8125rem] text-texto-2 transition-colors duration-200 hover:bg-elevado hover:text-texto"
          >
            {n.texto}
          </a>
        ))}
      </nav>
    </header>
  );
}

export function Cierre() {
  const ref = useAparecer<HTMLElement>();
  const marcaRef = useAjustarTexto<HTMLSpanElement>();
  return (
    <footer ref={ref} className="relative overflow-hidden bg-void px-4 pt-[18svh] pb-8 sm:px-6 md:px-[6vw]">
      <div className="mx-auto max-w-4xl text-center">
        <h2 data-aparece className="font-display text-display text-texto">
          {cierre.titulo}
        </h2>
        <a
          data-aparece
          style={{'--i': 1} as React.CSSProperties}
          href={marca.bibliotecas}
          className="mt-10 inline-block rounded-full bg-rojo px-8 py-3.5 font-semibold text-texto shadow-[0_4px_20px_oklch(59%_0.24_27/0.12)] transition-colors duration-200 hover:bg-rojo-profundo"
        >
          {cierre.cta}
        </a>
      </div>
      <div className="mt-[14svh] pb-[0.06em]" aria-hidden="true">
        <span ref={marcaRef} className="inline-block font-display leading-[1] whitespace-nowrap text-superficie">
          IAcademy
        </span>
      </div>
      <p className="mt-6 flex flex-col gap-2 border-t border-borde pt-5 text-[0.75rem] text-texto-3 sm:flex-row sm:justify-between">
        <span>{cierre.aviso}</span>
        <a href={marca.web} className="hover:text-texto">
          iacedemy.com
        </a>
      </p>
    </footer>
  );
}
