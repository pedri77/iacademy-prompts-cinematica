import {bibliotecas} from '../content';
import {Abanico} from './patrones/Abanico';

/**
 * Las cinco bibliotecas como abanico de cartas (patrón 17): el scroll gira la mano y la carta enfocada se
 * levanta. Clic en otra carta la enfoca; clic en la enfocada abre la biblioteca. Cada carta lleva su
 * personaje (ficticio, generado con IA; aviso visible en la cabecera) y su número de prompts.
 */
export function Bibliotecas() {
  const base = import.meta.env.BASE_URL;
  return (
    <Abanico
      id="bibliotecas"
      etiqueta={bibliotecas.titulo}
      altoVh={420}
      tamano="h-[min(52svh,31rem)] w-[min(66vw,34svh,19rem)]"
      cabecera={
        <>
          <p className="antetitulo text-rojo uppercase">{bibliotecas.antetitulo}</p>
          <h2 className="mt-3 font-display text-display text-texto">{bibliotecas.titulo}</h2>
          <p className="mt-2 text-[0.75rem] text-texto-3">{bibliotecas.avisoPersonajes}</p>
        </>
      }
      cartas={bibliotecas.lista.map((b, i) => ({
        id: b.personaje,
        etiqueta: `${b.titulo}: ${b.n} prompts. ${b.cuerpo}`,
        href: b.href,
        contenido: (
          <span className="flex size-full flex-col">
            <span className="relative block flex-1 overflow-hidden bg-void">
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{background: `radial-gradient(70% 60% at ${30 + i * 12}% 30%, oklch(59% 0.24 27 / 0.28), transparent 70%)`}}
              />
              <img
                src={`${base}personajes/${b.personaje}.webp`}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                onError={(e) => (e.currentTarget.style.display = 'none')}
                className="absolute bottom-0 left-1/2 h-[94%] w-auto max-w-none -translate-x-1/2 object-contain [filter:drop-shadow(0_12px_24px_oklch(8%_0.025_275/0.7))]"
              />
              <span className="absolute top-3 left-3 rounded-full bg-elevado px-3 py-1 antetitulo text-[0.625rem] text-texto uppercase">{b.etiqueta}</span>
              <span className="absolute top-2 right-3 font-cifra text-[2rem] leading-none text-texto tabular-nums [text-shadow:0_2px_12px_oklch(8%_0.025_275/0.9)]">
                {b.n}
              </span>
            </span>
            <span className="block px-4 pt-3 pb-4">
              <span className="block font-display text-[1.15rem] leading-tight text-texto">{b.titulo}</span>
              <span className="mt-1 block text-[0.8125rem] leading-snug text-texto-2">{b.cuerpo}</span>
              <span className="mt-2 inline-block text-[0.8125rem] font-semibold text-rojo">Abrir la biblioteca →</span>
            </span>
          </span>
        ),
      }))}
    />
  );
}
