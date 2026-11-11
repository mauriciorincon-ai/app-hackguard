import Link from "@/components/enlace";
import type {
  BaseDeReplanVista,
  MovimientoDeReplanVista,
  VistaDeReplan,
} from "@/lib/activos/tipos";
import { Chip, Estado, Huella, Sello } from "../estado";
import { Cabeceras } from "../cabeceras";
import { LineaDeCabecera, SelectorDeActivos } from "../activos/piezas";
import { Dato, T } from "../texto";

/**
 * La pantalla `/activos/<id>/re-planear`. Componente de SERVIDOR: lo que entraría, saldría y se quedaría si el plan desactualizado se
 * emitiera de nuevo hoy, con la causa de cada movimiento y el control de ISO/IEC 42001 que gana o pierde cobertura. Es una vista
 * previa que el motor calculó en el build: no escribe nada. Primero la base oficial; la base demo, si la hay, va aparte y rotulada
 * «no oficial». Armada con las piezas de la consola: sin estilos nuevos.
 */

const COLUMNAS = [
  { es: "Prueba", en: "Test" },
  { es: "Causa", en: "Cause" },
  { es: "Lugar en el plan", en: "Place in the plan" },
  { es: "Cobertura de ISO/IEC 42001", en: "ISO/IEC 42001 coverage" },
];

const GRUPOS = [
  {
    tipo: "entra" as const,
    campo: "entran" as const,
    rotulo: { es: "Entran al plan", en: "Enter the plan" },
  },
  {
    tipo: "sale" as const,
    campo: "salen" as const,
    rotulo: { es: "Salen del plan", en: "Leave the plan" },
  },
  {
    tipo: "se_queda" as const,
    campo: "seQuedan" as const,
    rotulo: { es: "Se quedan", en: "Stay" },
  },
];

function Fila({ m, id }: { m: MovimientoDeReplanVista; id: string }) {
  return (
    <tr
      data-movimiento={m.tipo}
      data-prueba={m.id}
      data-causas={m.causas.map((c) => c.id).join(" ")}
      data-conjunta={String(m.conjunta)}
    >
      <td data-celda="principal">
        <p>
          <strong>
            {m.tipo === "sale" ? (
              <Dato>{m.id}</Dato>
            ) : (
              <Link className="hg-enlace-fila" href={`/catalogo/${m.id}`}>
                <Dato>{m.id}</Dato>
              </Link>
            )}
          </strong>
        </p>
        {m.nombre === null ? null : (
          <p className="hg-menor">
            <T t={m.nombre} />
          </p>
        )}
        <p>
          <Chip etiqueta={m.etiqueta} />
        </p>
      </td>
      <td data-celda="causa">
        {m.causas.length === 0 ? (
          <span className="hg-menor" data-sin-causa>
            <T
              t={{
                es: "Nada la movió: sigue como estaba.",
                en: "Nothing moved it: it stays as it was.",
              }}
            />
          </span>
        ) : (
          <>
            <ul className="hg-lista">
              {m.causas.map((c) => (
                <li key={c.id} data-causa={c.id}>
                  <T t={c.nombre} />
                </li>
              ))}
            </ul>
            {m.notaConjunta === null ? null : (
              <p className="hg-menor" data-conjunta-nota>
                <T t={m.notaConjunta} />
              </p>
            )}
          </>
        )}
        {m.fuera === null ? null : (
          <p className="hg-menor">
            <T t={m.fuera} />
          </p>
        )}
        {m.cambios.length === 0 ? null : (
          <p className="hg-menor">
            <T t={{ es: "Cambia: ", en: "Changes: " }} />
            {m.cambios.map((c, i) => (
              <span key={c.es}>
                {i === 0 ? "" : " · "}
                <T t={c} />
              </span>
            ))}
          </p>
        )}
      </td>
      <td data-celda="lugar">
        <p className="hg-menor">
          <T t={{ es: "Antes ", en: "Before " }} />
          {m.antes === null ? "—" : <T t={m.antes} />}
        </p>
        <p className="hg-menor">
          <T t={{ es: "Ahora ", en: "Now " }} />
          {m.despues === null ? "—" : <T t={m.despues} />}
        </p>
      </td>
      <td data-celda="controles" data-activo={id}>
        {m.controles.length === 0 ? (
          <span className="hg-menor">
            <T
              t={{
                es: "No cambia la cobertura.",
                en: "Coverage does not change.",
              }}
            />
          </span>
        ) : (
          <ul className="hg-lista">
            {m.controles.map((c) => (
              <li key={c.id} data-control={c.id} data-efecto={c.efecto}>
                <Estado etiqueta={c.etiqueta} /> <Dato>{c.id}</Dato>{" "}
                <span className="hg-menor">
                  <T t={c.nombre} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

function Base({ b, v }: { b: BaseDeReplanVista; v: VistaDeReplan }) {
  const total = b.entran.length + b.salen.length;
  return (
    <section
      className="hg-panel"
      aria-labelledby={`base-${b.clave}`}
      data-base={b.clave}
    >
      <div className="hg-panel-cab">
        <h2 id={`base-${b.clave}`}>
          {b.demo ? (
            <T
              t={{
                es: "Con el catálogo demo",
                en: "With the demo catalog",
              }}
            />
          ) : (
            <T
              t={{
                es: "Con el catálogo oficial",
                en: "With the official catalog",
              }}
            />
          )}{" "}
          {b.demo ? <Chip etiqueta={v.etiquetas.demo} /> : null}
        </h2>
        <p className="hg-menor">
          <Dato>{b.instantanea.fecha}</Dato> ·{" "}
          <Huella hex={b.instantanea.huella} />
        </p>
      </div>

      {b.demo ? (
        <Sello etiqueta={v.etiquetas.demo}>
          <p>
            <T
              t={{
                es: "Esta base es sintética: el catálogo oficial no ha cambiado, así que para ver movimientos de catálogo y de regla se usa la instantánea demo. Ningún plan emitido la cita.",
                en: "This base is synthetic: the official catalog has not changed, so the demo snapshot is used to show catalog and rule movements. No issued plan cites it.",
              }}
            />
          </p>
        </Sello>
      ) : null}

      <p className="hg-menor" data-resumen-de-base>
        <T t={{ es: "Pruebas planeadas: ", en: "Planned tests: " }} />
        <Dato>
          {b.planeadas.antes} → {b.planeadas.despues}
        </Dato>
        {" · "}
        <T t={{ es: "entran ", en: "enter " }} />
        <Dato>{b.entran.length}</Dato>
        {" · "}
        <T t={{ es: "salen ", en: "leave " }} />
        <Dato>{b.salen.length}</Dato>
        {" · "}
        <T t={{ es: "se quedan ", en: "stay " }} />
        <Dato>{b.seQuedan.length}</Dato>
      </p>

      {total === 0 ? (
        <Sello etiqueta={v.etiquetas.sinMovimientos}>
          <p>
            <T
              t={{
                es: "Ninguna prueba entra ni sale con esta base.",
                en: "No test enters or leaves with this base.",
              }}
            />
          </p>
        </Sello>
      ) : null}

      {b.controles.length === 0 ? null : (
        <div data-controles-que-cambian>
          <h3>
            <T
              t={{
                es: "Controles de ISO/IEC 42001 que cambian de cobertura",
                en: "ISO/IEC 42001 controls whose coverage changes",
              }}
            />
          </h3>
          <ul className="hg-lista">
            {b.controles.map((c) => (
              <li key={c.id} data-control={c.id} data-efecto={c.efecto}>
                <Estado etiqueta={c.etiqueta} /> <Dato>{c.id}</Dato>{" "}
                <span className="hg-menor">
                  <T t={c.nombre} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {GRUPOS.map((g) => {
        const filas = b[g.campo];
        if (filas.length === 0) return null;
        return (
          <div key={g.tipo} data-grupo={g.tipo}>
            <h3>
              <T t={g.rotulo} /> <Dato>{filas.length}</Dato>
            </h3>
            <table className="hg-tabla">
              <caption className="hg-oculto">
                <T t={g.rotulo} />
              </caption>
              <Cabeceras columnas={COLUMNAS} />
              <tbody>
                {filas.map((m) => (
                  <Fila key={m.id} m={m} id={v.id} />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}

export function ReplanPantalla({ v }: { v: VistaDeReplan }) {
  return (
    <div className="hg-pila" data-replan-de={v.id}>
      <SelectorDeActivos items={v.selector} hacia="activo" />
      <div className="hg-cabecera">
        <div>
          <LineaDeCabecera v={v} chip={v.estado} />
          <h1>
            <T
              t={{
                es: "Re-planear: qué cambiaría en el plan",
                en: "Re-plan: what would change in the plan",
              }}
            />
          </h1>
          <p className="hg-bajada">
            <T t={v.nota} />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Activo", en: "Asset" }} />{" "}
              <Link href={`/activos/${v.id}`}>
                <Dato>{v.id}</Dato>
              </Link>
            </span>
            <span>
              <T t={{ es: "Plan emitido", en: "Plan issued" }} />{" "}
              <Dato>{v.plan.fecha}</Dato> <Huella hex={v.plan.huella} />
            </span>
            {v.activo.versionDelPlan !== null &&
            v.activo.versionVigente !== null ? (
              <span>
                <T t={{ es: "Versión del activo", en: "Asset version" }} />{" "}
                <Dato>
                  v{v.activo.versionDelPlan} → v{v.activo.versionVigente}
                </Dato>
              </span>
            ) : null}
          </p>
        </div>
      </div>
      {v.bases.map((b) => (
        <Base key={b.clave} b={b} v={v} />
      ))}
    </div>
  );
}
