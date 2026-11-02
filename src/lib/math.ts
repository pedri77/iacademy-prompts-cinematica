/** Utilidades numéricas para coreografías de scroll. Todo trabaja en 0–1. */

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Posición de `v` dentro del tramo [a, b], recortada a 0–1. Es la pieza base del guion. */
export const tramo = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Progreso de una sección alta cuyo hijo es `position: sticky`.
 * 0 cuando la sección toca el borde superior, 1 justo antes de soltarse.
 */
export function progresoFijado(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const recorrido = Math.max(1, rect.height - vh);
  return {p: clamp(-rect.top / recorrido), rect, vh, visible: rect.bottom > 0 && rect.top < vh};
}
