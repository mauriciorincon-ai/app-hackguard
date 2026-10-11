import {
  frasePorDias,
  MARCADA,
  SIN_CONTROL_CORTO,
} from "@/lib/catalogo/etiquetas";
import type { FilaDePrueba } from "@/lib/catalogo/tipos";
import { Chip, Estado } from "../estado";
import { Dato, T } from "../texto";

const COLUMNAS = [
  { es: "Prueba", en: "Test" },
  { es: "Qué verifica", en: "What it verifies" },
  { es: "Familia y herramienta", en: "Family and tool" },
  { es: "Marco y control", en: "Framework and control" },
  { es: "Vigencia", en: "Freshness" },
  { es: "Madurez", en: "Maturity" },
];

function Fila({ f }: { f: FilaDePrueba }) {
  const v = f.vigencia;
  return (
    <tr data-prueba={f.id}>
      <td data-celda="id">
        <Dato>{f.id}</Dato>
      </td>
      <td>
        <p>
          <a className="hg-enlace-fila" href={`/catalogo/${f.id}`}>
            <T t={f.nombre} />
          </a>
        </p>
        <p className="hg-menor">
          <T t={f.queVerifica} />
        </p>
      </td>
      <td>
        <p>
          <T t={f.familiaNombre} />
        </p>
        <p className="hg-menor">
          <span data-neutro>{f.herramienta}</span> · <T t={f.repeticiones} />
        </p>
      </td>
      <td>
        <p className="hg-menor">
          <span data-neutro>{f.marco}</span>
        </p>
        {f.controles.length ? (
          f.controles.map((c) => (
            <p key={c}>
              <Dato>{c}</Dato>
            </p>
          ))
        ) : (
          <p>
            <Chip etiqueta={SIN_CONTROL_CORTO} />
          </p>
        )}
      </td>
      <td data-celda="estado">
        <div
          data-fechado="vigencia"
          data-desde={v.desde}
          data-dias={v.dias}
          data-estado-fechado={v.estado}
        >
          <p>
            {v.estado === "vigente" ? (
              <Estado etiqueta={v.etiqueta} />
            ) : (
              <Chip etiqueta={v.etiqueta} />
            )}
          </p>
          <p className="hg-menor">
            <span data-frase-dias>
              <T t={frasePorDias(v.dias)} />
            </span>
          </p>
        </div>
      </td>
      <td>
        <p>
          <T t={f.madurezNombre} />
        </p>
        {f.revision === "marcada_para_revision" ? (
          <p>
            <Chip etiqueta={MARCADA} />
          </p>
        ) : null}
      </td>
    </tr>
  );
}

/** La tabla densa del catálogo: una fila por prueba; cada una abre la ficha de SU prueba. */
export function Tabla({
  filas,
  oculta,
}: {
  filas: FilaDePrueba[];
  oculta: boolean;
}) {
  return (
    <table className="hg-tabla" hidden={oculta}>
      <caption className="hg-oculto">
        <T t={{ es: "Pruebas del catálogo", en: "Catalog tests" }} />
      </caption>
      <thead>
        <tr>
          {COLUMNAS.map((c) => (
            <th key={c.es} scope="col">
              <T t={c} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <Fila key={f.id} f={f} />
        ))}
      </tbody>
    </table>
  );
}
