import { frasePorDias, pruebas } from "@/lib/catalogo/etiquetas";
import type { FilaDeFamilia } from "@/lib/catalogo/tipos";
import { Chip, Estado } from "../estado";
import { T } from "../texto";

function Fila({ f }: { f: FilaDeFamilia }) {
  return (
    <tr data-familia-vigencia={f.id} data-pruebas={f.pruebas}>
      <td data-celda="principal">
        <p>
          <T t={f.nombre} />
        </p>
        <p className="hg-menor">
          <T t={pruebas(f.pruebas)} />
        </p>
      </td>
      <td>
        <ul className="hg-desglose">
          {f.desglose.map((d) => (
            <li key={d.etiqueta.nombre.es}>
              <Estado etiqueta={d.etiqueta} />
            </li>
          ))}
        </ul>
      </td>
      <td data-celda="estado">
        {f.dias === null ? (
          <Estado etiqueta={f.estado} />
        ) : (
          <span data-fechado="vigencia" data-desde={f.desde} data-dias={f.dias}>
            {f.estado.rol === "positivo" ? (
              <Estado etiqueta={f.estado} />
            ) : (
              <Chip etiqueta={f.estado} />
            )}{" "}
            <span className="hg-menor">
              <T
                t={{
                  es: "Su ficha más antigua se verificó",
                  en: "Its oldest record was verified",
                }}
              />{" "}
              <span data-frase-dias>
                <T t={frasePorDias(f.dias)} />
              </span>
            </span>
          </span>
        )}
      </td>
    </tr>
  );
}

/** Semáforo por familia (RF-01.5): una familia está como su ficha verificada hace más tiempo. */
export function VigenciaPorFamilia({ panel }: { panel: FilaDeFamilia[] }) {
  return (
    <section className="hg-panel" aria-labelledby="vigencia-por-familia">
      <div className="hg-panel-cab">
        <h2 id="vigencia-por-familia">
          <T t={{ es: "Vigencia por familia", en: "Freshness by family" }} />
        </h2>
        <p className="hg-menor">
          <T
            t={{
              es: "Una familia está como su ficha verificada hace más tiempo.",
              en: "A family stands where its longest-unverified record stands.",
            }}
          />
        </p>
      </div>
      <table className="hg-tabla">
        <caption className="hg-oculto">
          <T t={{ es: "Vigencia por familia", en: "Freshness by family" }} />
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <T t={{ es: "Familia", en: "Family" }} />
            </th>
            <th scope="col">
              <T t={{ es: "Sus pruebas", en: "Its tests" }} />
            </th>
            <th scope="col">
              <T t={{ es: "Vigencia", en: "Freshness" }} />
            </th>
          </tr>
        </thead>
        <tbody>
          {panel.map((f) => (
            <Fila key={f.id} f={f} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
