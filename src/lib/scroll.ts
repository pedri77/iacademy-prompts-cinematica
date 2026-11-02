import Lenis from 'lenis';

/**
 * Un solo bucle requestAnimationFrame para toda la página.
 * Lenis avanza primero y luego cada sección lee su posición y escribe estilos
 * directamente en el DOM. Nada pasa por el estado de React: el scroll no re-renderiza.
 */

type Fotograma = (tiempo: number) => void;

const suscriptores = new Set<Fotograma>();
let lenis: Lenis | null = null;

export function iniciarScroll(movimientoReducido: boolean): () => void {
  if (!movimientoReducido) {
    lenis = new Lenis({lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9});
  }
  let raf = 0;
  const bucle = (t: number) => {
    lenis?.raf(t);
    suscriptores.forEach((fn) => fn(t));
    raf = requestAnimationFrame(bucle);
  };
  raf = requestAnimationFrame(bucle);
  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
}

/** Se suscribe al bucle. Devuelve la función para darse de baja (úsala como cleanup de useEffect). */
export function enCadaFotograma(fn: Fotograma): () => void {
  suscriptores.add(fn);
  return () => void suscriptores.delete(fn);
}

/** Desplazamiento suave a un ancla (`#metodo`) o al inicio (`#inicio`). */
export function irA(hash: string) {
  const destino = hash === '#inicio' ? 0 : document.querySelector<HTMLElement>(hash);
  if (destino === null) return;
  if (lenis) lenis.scrollTo(destino, {duration: 1.4});
  else if (typeof destino === 'number') window.scrollTo({top: 0});
  else destino.scrollIntoView();
  history.replaceState(null, '', hash === '#inicio' ? ' ' : hash);
}

/** Desplazamiento a una posición en px (pasa por Lenis si está activo, para no pelear con él). */
export function irAPosicion(y: number, suave = true) {
  if (lenis) lenis.scrollTo(y, {duration: suave ? 1.1 : 0, immediate: !suave});
  else window.scrollTo({top: y, behavior: suave ? 'smooth' : 'auto'});
}
