import type { Etiqueta, VigenciaVista } from "@/lib/catalogo/tipos";
import { frasePorDias } from "@/lib/catalogo/etiquetas";
import { Simbolo } from "./simbolo";
import { T } from "./texto";

// Los componentes canon de estado de design-system.md: símbolo (trazo SVG) + texto + color, SIEMPRE los tres (regla
// dura 12). El papel de color llega de `datos/estados.json` por la etiqueta; aquí no se escribe ningún color.

/** Estado en línea: marca y texto. Lo que no es noticia (lo vigente) va así, sin recuadro. */
export function Estado({ etiqueta }: { etiqueta: Etiqueta }) {
  return (
    <span className={`hg-estado es-${etiqueta.rol}`}>
      <Simbolo nombre={etiqueta.simbolo} />
      <span>
        <T t={etiqueta.nombre} />
      </span>
    </span>
  );
}

/** Chip: el estado que pide atención en una fila o en una cabecera (tinte, borde, marca y texto). */
export function Chip({ etiqueta }: { etiqueta: Etiqueta }) {
  return (
    <span className={`hg-chip es-${etiqueta.rol}`}>
      <Simbolo nombre={etiqueta.simbolo} />
      <span>
        <T t={etiqueta.nombre} />
      </span>
    </span>
  );
}

/** La vigencia de algo fechado, con el protocolo que vigila la matriz de envejecimiento (data-fechado…). */
export function Fechado({
  vigencia,
  rotulo,
}: {
  vigencia: VigenciaVista;
  rotulo: { es: string; en: string };
}) {
  return (
    <span
      data-fechado="vigencia"
      data-desde={vigencia.desde}
      data-dias={vigencia.dias}
      data-estado-fechado={vigencia.estado}
    >
      {vigencia.estado === "vigente" ? (
        <Estado etiqueta={vigencia.etiqueta} />
      ) : (
        <Chip etiqueta={vigencia.etiqueta} />
      )}{" "}
      <span className="hg-menor">
        <T t={rotulo} />{" "}
        <span data-frase-dias>
          <T t={frasePorDias(vigencia.dias)} />
        </span>
      </span>
    </span>
  );
}

/** Estado de pantalla (vacío, error): marca, título y qué hacer. */
export function Aviso({
  etiqueta,
  titulo,
  children,
  nivel = 2,
}: {
  etiqueta: { rol: string; simbolo: string };
  titulo: { es: string; en: string };
  children: React.ReactNode;
  nivel?: 1 | 2;
}) {
  const Titulo = nivel === 1 ? "h1" : "h2";
  return (
    <div className={`hg-aviso es-${etiqueta.rol}`}>
      <Simbolo nombre={etiqueta.simbolo} />
      <Titulo>
        <T t={titulo} />
      </Titulo>
      {children}
    </div>
  );
}

/** Sello: el estado que resume un objeto entero (un aviso de la ficha). */
export function Sello({
  etiqueta,
  children,
  atributos,
}: {
  etiqueta: Etiqueta;
  children: React.ReactNode;
  atributos?: Record<string, string | boolean>;
}) {
  return (
    <div className={`hg-sello es-${etiqueta.rol}`} {...atributos}>
      <Simbolo nombre={etiqueta.simbolo} />
      <div>
        <span className="hg-sello-titulo">
          <T t={etiqueta.nombre} />
        </span>
        {children}
      </div>
    </div>
  );
}

/** Huella abreviada (algoritmo, 8 primeros y 4 últimos caracteres). */
export function Huella({ hex }: { hex: string }) {
  return (
    <span className="hg-huella" data-neutro>
      <span className="hg-huella-pre">sha256:</span>
      <wbr />
      {hex.slice(0, 8)}…{hex.slice(-4)}
    </span>
  );
}
