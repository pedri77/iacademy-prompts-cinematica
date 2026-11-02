# IAcademy · 197 prompts, listos para copiar

Versión de scroll cinematográfico de las [bibliotecas de prompts de IAcademy](https://iacademy-prompts-profesores.pages.dev): una biblioteca a oscuras aparece al disipar la niebla, la aguja de un dial llega a 197, se entra por el pasillo hasta el escritorio, los huecos de un prompt real se rellenan con el scroll y las cinco bibliotecas se reparten como una mano de cartas. Las bibliotecas siguen siendo la herramienta; esta página es la puerta de entrada.

```bash
npm install
npm run dev        # http://localhost:3031
npm run build      # dist/
```

Se despliega en GitHub Pages con cada push a `main` (`.github/workflows/pages.yml`).

## Secciones

| Sección | Patrón (skill web-cinematica) | Qué pasa al hacer scroll |
|---|---|---|
| Escenario | 1–4, 9 | 5 capas en parallax, niebla, titular letra a letra, robot con bocadillo, HUD con 197 |
| Cifras | 15 · Dial | La aguja llega a 197; la ficha reparte las cinco bibliotecas |
| Dentro de la biblioteca | 12–13 · Secuencia y anclas | Un plano de 8 s en 120 fotos con tres capítulos y etiquetas que siguen al ventanal, la estantería y el escritorio |
| Cómo funciona | 19 · Plantilla que se rellena | Los cuatro huecos de un prompt real (ev01) se encienden y se rellenan; «Copiar» copia el prompt entero |
| Bibliotecas | 17 · Abanico | Cinco cartas con su personaje y su número de prompts; la enfocada abre su biblioteca |

Textos en `src/content.ts`; cifras sacadas de `iacademy-prompts/data/*` (120 + 45 + 15 + 9 + 8).

## Imágenes y vídeo generados con IA

Escenario, vídeo de entrada y personajes son ficticios y están generados con IA (fal: Nano Banana Pro, Kling v3 Pro, BiRefNet). Proceden del piloto `iacademy-cinematica`; los personajes de marketing y contabilidad son nuevos (0,30 $). Generador: `scripts/generar_ia.py` (lee `FAL_KEY` del entorno).

## Créditos

Técnica inspirada en las plantillas gratuitas de [Scrolltide](https://www.scrolltide.co) (Selene, Otis); código reescrito, sin textos ni imágenes suyos. Los prompts CC0 de las bibliotecas adaptan [prompts.chat](https://github.com/f/prompts.chat) (dominio público).
