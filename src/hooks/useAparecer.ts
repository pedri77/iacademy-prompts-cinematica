import {useEffect, useRef} from 'react';

/**
 * Añade `.dentro` a cada `[data-aparece]` del contenedor la primera vez que entra
 * en pantalla. Cada sección lleva su propio observador, así los elementos que se
 * montan más tarde también aparecen.
 */
export function useAparecer<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    const io = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('dentro');
          io.unobserve(e.target);
        }),
      {rootMargin: '0px 0px -10% 0px'},
    );
    const vigilar = () => raiz.querySelectorAll('[data-aparece]:not(.dentro)').forEach((el) => io.observe(el));
    vigilar();
    const mo = new MutationObserver(vigilar);
    mo.observe(raiz, {childList: true, subtree: true});
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
  return ref;
}
