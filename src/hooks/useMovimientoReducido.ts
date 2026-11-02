import {useEffect, useState} from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useMovimientoReducido() {
  const [reducido, setReducido] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const cambio = () => setReducido(mq.matches);
    mq.addEventListener('change', cambio);
    return () => mq.removeEventListener('change', cambio);
  }, []);
  return reducido;
}
