import {useLayoutEffect, useRef} from 'react';

/**
 * Ajusta una línea de texto (inline-block + whitespace-nowrap) para que ocupe
 * exactamente el ancho útil de su padre. Mide con un tamaño de prueba y escala;
 * vuelve a medir cuando carga la fuente y cuando cambia el ancho.
 */
export function useAjustarTexto<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const padre = el?.parentElement;
    if (!el || !padre) return;
    const PRUEBA = 100;
    const ajustar = () => {
      el.style.fontSize = `${PRUEBA}px`;
      const cs = getComputedStyle(padre);
      const util = padre.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const natural = el.offsetWidth;
      if (natural > 0) el.style.fontSize = `${(PRUEBA * util) / natural}px`;
    };
    ajustar();
    document.fonts?.ready.then(ajustar);
    const ro = new ResizeObserver(ajustar);
    ro.observe(padre);
    return () => ro.disconnect();
  }, []);
  return ref;
}
