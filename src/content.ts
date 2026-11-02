/**
 * Todo el texto de la página. Versión cinemática de las bibliotecas de prompts de IAcademy
 * (https://iacademy-prompts-profesores.pages.dev). Cifras sacadas de iacademy-prompts/data/*:
 * 120 + 45 + 15 + 9 + 8 = 197 prompts.
 */

const BIBLIOTECAS = 'https://iacademy-prompts-profesores.pages.dev';
const WEB = 'https://iacedemy.com';

export const marca = {
  nombre: 'IAcademy',
  web: WEB,
  bibliotecas: `${BIBLIOTECAS}/`,
};

export const nav = [
  {texto: 'Cómo funciona', href: '#prompt'},
  {texto: 'Bibliotecas', href: '#bibliotecas'},
];

/** Capas del escenario, de la más lejana a la más cercana. Mismo encuadre en todas. */
export const capas = ['fondo', 'ventanal', 'suelo', 'estanterias', 'atril'] as const;
export type Capa = (typeof capas)[number];
export const extCapas = 'webp';

export const escenario = {
  antetitulo: 'Bibliotecas de prompts de IAcademy',
  titulo: '197 prompts',
  destacado: 'listos para copiar',
  invitacion: 'Desliza para entrar en la biblioteca',
  lugar: 'En español · sin registro',
  saludo: 'Hola. Aquí hay un prompt para cada tarea.',
  hud: {cifra: 197, etiqueta: 'Prompts', detalle: 'En 5 bibliotecas'},
};

/** La mascota de IAcademy (assets/img/robot-ia-sin-fondo.png de iacedemy-web). */
export const robot = {
  cuerpo: 'robot/robot.webp',
  cabeza: 'robot/cabeza.webp',
  alt: 'El robot de IAcademy saluda con la mano',
};

/** Patrón 15: las cifras de las cinco bibliotecas. */
export const cifras = {
  titulo: 'Un prompt para cada tarea.',
  principal: {etiqueta: 'en español', valor: 197, unidad: 'prompts'},
  maximo: 200,
  ficha: [
    {etiqueta: 'Profesores', valor: 120, unidad: ''},
    {etiqueta: 'Profesionales', valor: 45, unidad: ''},
    {etiqueta: 'Universales', valor: 15, unidad: ''},
    {etiqueta: 'Marketing', valor: 9, unidad: ''},
    {etiqueta: 'Contabilidad', valor: 8, unidad: ''},
  ],
};

/**
 * Patrones 12 y 13: el plano de entrada de la biblioteca (Kling v3 Pro, el mismo de la demo de IAcademy),
 * 120 fotos. Anclas en coordenadas de la foto de escritorio (0–1).
 */
export const entrada = {
  etiqueta: 'Dentro de la biblioteca',
  n: 120,
  recorteMovil: [0.4027, 0.3146] as [number, number],
  capitulos: [
    {desde: 0.04, hasta: 0.32, titulo: 'Ordenados por tarea', texto: 'Evaluar, planificar, adaptar, comunicar. Buscas lo que tienes que hacer hoy, no una palabra clave.'},
    {desde: 0.36, hasta: 0.64, titulo: 'Por etapa y materia', texto: 'Los de profesores llevan etapa, materia y el currículo LOMLOE en mente.'},
    {desde: 0.68, hasta: 0.96, titulo: 'Rellena, copia y pega', texto: 'Cada prompt trae huecos entre corchetes. Los rellenas en la tarjeta y lo copias a tu asistente de IA.'},
  ],
  anclas: [
    {id: 'ventanal', etiqueta: 'Tu tarea', detalle: 'lo que necesitas resolver', claves: [[4, 0.5, 0.35], [29, 0.51, 0.36], [59, 0.51, 0.36], [89, 0.51, 0.34], [110, 0.5, 0.35]]},
    {id: 'estanterias', etiqueta: '197 prompts', detalle: 'en cinco bibliotecas', claves: [[2, 0.85, 0.42], [29, 0.9, 0.42], [50, 0.95, 0.42]]},
    {id: 'prompt', etiqueta: 'Tu prompt', detalle: 'listo para rellenar', claves: [[60, 0.605, 0.663], [89, 0.567, 0.648], [119, 0.533, 0.65]]},
  ] as {id: string; etiqueta: string; detalle: string; claves: [number, number, number][]}[],
};

/**
 * Patrón 19: un prompt real (ev01 de la biblioteca de profesores) cuyos huecos se rellenan con el scroll.
 * `trozos`: texto fijo y huecos {hueco, valor}. «Copiar» copia el prompt completo ya rellenado.
 */
export const prompt = {
  antetitulo: 'Cómo funciona',
  titulo: 'Rellenas los huecos. Copias. Listo.',
  ficha: 'Rúbrica de evaluación por competencias · Profesores',
  trozos: [
    'Actúa como experto en evaluación educativa. Crea una rúbrica de evaluación para ',
    {hueco: 'actividad/tarea', valor: 'un debate sobre el cambio climático'},
    ' de la asignatura ',
    {hueco: 'materia', valor: 'Biología y Geología'},
    ' en ',
    {hueco: 'curso, nivel', valor: '3.º de ESO'},
    '. La rúbrica debe incluir: 1) Entre 4 y 6 criterios de evaluación alineados con los criterios del currículo LOMLOE de ',
    {hueco: 'comunidad autónoma', valor: 'la Comunidad de Madrid'},
    ', 2) 4 niveles de desempeño…',
  ] as (string | {hueco: string; valor: string})[],
  /** Resto del prompt original (sin los puntos suspensivos), para copiarlo entero. */
  resto:
    ': Insuficiente (1-4), Suficiente (5-6), Notable (7-8), Sobresaliente (9-10), 3) Descriptores específicos y observables para cada criterio en cada nivel (no genéricos como \'bien\' o \'mal\', sino conductas concretas que el profesor pueda observar), 4) Ponderación de cada criterio sobre el total (que sume 100%), 5) Espacio para observaciones cualitativas. Formato: tabla lista para imprimir. Al final, incluye 3 ejemplos de cómo aplicar la rúbrica a trabajos reales de alumnos con diferentes niveles de desempeño.',
  copiar: 'Copiar el prompt',
  copiado: 'Copiado',
  privacidad: 'Se rellena en tu navegador. No se guarda ni se envía nada.',
  enlace: {texto: 'Ver este prompt en la biblioteca', href: `${BIBLIOTECAS}/profesores/ev01-rubrica-de-evaluacion-por-competencias/`},
};

/** Patrón 17: las cinco bibliotecas. Personajes ficticios generados con IA (public/personajes). */
export const bibliotecas = {
  antetitulo: 'Elige biblioteca',
  titulo: 'Cinco bibliotecas, una para tu trabajo.',
  avisoPersonajes: 'Personajes ficticios generados con IA.',
  lista: [
    {personaje: 'docentes', etiqueta: 'Profesores', titulo: 'Prompts para profesores', cuerpo: 'Por tarea, etapa y materia, con el currículo LOMLOE en mente.', n: 120, href: `${BIBLIOTECAS}/profesores/`},
    {personaje: 'claude', etiqueta: 'Profesionales', titulo: 'Prompts profesionales', cuerpo: 'Fundadores, ciberseguridad, desarrollo, marketing y automatización.', n: 45, href: `${BIBLIOTECAS}/profesionales/`},
    {personaje: 'rrhh', etiqueta: 'Universales', titulo: 'Prompts universales', cuerpo: 'Escribir, resumir, organizarse, decidir y presentar.', n: 15, href: `${BIBLIOTECAS}/universales/`},
    {personaje: 'marketing', etiqueta: 'Marketing', titulo: 'Prompts de marketing digital', cuerpo: 'Contenido, redes, publicidad, email y análisis.', n: 9, href: `${BIBLIOTECAS}/marketing/`},
    {personaje: 'contabilidad', etiqueta: 'Contabilidad', titulo: 'Prompts de contabilidad y PGC', cuerpo: 'Cierre, asientos, ratios, conciliación y fiscalidad.', n: 8, href: `${BIBLIOTECAS}/contabilidad/`},
  ],
};

export const cierre = {
  titulo: '¿Por cuál empiezas?',
  cta: 'Abrir las bibliotecas',
  aviso:
    'Revisa siempre lo que genere la IA y no introduzcas datos personales. Los prompts marcados CC0 adaptan prompts.chat (dominio público). Escenario, vídeo y personajes generados con IA.',
};
