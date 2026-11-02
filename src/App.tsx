import {useEffect} from 'react';
import {Bibliotecas} from './components/Bibliotecas';
import {Escenario} from './components/Escenario';
import {Cabecera, Cierre} from './components/Marco';
import {Dial} from './components/patrones/Dial';
import {PromptRelleno} from './components/patrones/PromptRelleno';
import {SecuenciaFijada} from './components/patrones/SecuenciaFijada';
import {cifras, entrada, prompt} from './content';
import {useMovimientoReducido} from './hooks/useMovimientoReducido';
import {iniciarScroll} from './lib/scroll';

/**
 * Guion de la página (una sección = un patrón de web-cinematica):
 *   1. Escenario    la niebla se disipa y aparece la biblioteca; «197 prompts, listos para copiar»
 *   2. Dial         la aguja llega a 197; la ficha reparte las cinco bibliotecas
 *   3. Secuencia    se entra por el pasillo hasta el escritorio (vídeo en 120 fotos, con etiquetas)
 *   4. Prompt       los huecos de un prompt real se rellenan con el scroll; «Copiar» lo copia entero
 *   5. Abanico      las cinco bibliotecas, cada una con su personaje; la enfocada abre su biblioteca
 */
export default function App() {
  const reducido = useMovimientoReducido();
  useEffect(() => iniciarScroll(reducido), [reducido]);
  const BASE = import.meta.env.BASE_URL;

  return (
    <>
      <Cabecera />
      <main>
        <Escenario />
        <Dial etiqueta="Las bibliotecas en cifras" titulo={cifras.titulo} principal={cifras.principal} maximo={cifras.maximo} divisiones={8} ficha={cifras.ficha} altoVh={260} />
        <SecuenciaFijada
          etiqueta={entrada.etiqueta}
          base={`${BASE}secuencias/entrada/d`}
          baseMovil={`${BASE}secuencias/entrada/m`}
          recorteMovil={entrada.recorteMovil}
          n={entrada.n}
          capitulos={entrada.capitulos}
          anclas={entrada.anclas}
          altoVh={420}
        />
        <PromptRelleno
          id="prompt"
          etiqueta={prompt.titulo}
          antetitulo={prompt.antetitulo}
          titulo={prompt.titulo}
          ficha={prompt.ficha}
          trozos={prompt.trozos}
          resto={prompt.resto}
          copiar={prompt.copiar}
          copiado={prompt.copiado}
          privacidad={prompt.privacidad}
          enlace={prompt.enlace}
          altoVh={340}
        />
        <Bibliotecas />
      </main>
      <Cierre />
    </>
  );
}
