import Link from "@/components/enlace";
import type { VistaDeHistorial } from "@/lib/activos/tipos";
import { Chip, Estado, Huella } from "../estado";
import { Cabeceras } from "../cabeceras";
import { LineaDeCabecera, SelectorDeActivos } from "../activos/piezas";
import { Dato, T } from "../texto";

/**
 * La pantalla `/activos/<id>/historial`. Componente de SERVIDOR: las versiones del activo con su huella y, de cada una, lo que
 * cambió frente a la anterior. Está armada con las piezas de la consola (panel, tabla, estado, huella): sin estilos nuevos.
 */

const COLUMNAS_VERSIONES = [
  { es: "Versión", en: "Version" },
  { es: "Fecha", en: "Date" },
  { es: "Qué cambió", en: "What changed" },
  { es: "Huella", en: "Fingerprint" },
  { es: "Plan", en: "Plan" },
];
const COLUMNAS_CAMBIOS = [
  { es: "Campo", en: "Field" },
  { es: "Antes", en: "Before" },
  { es: "Ahora", en: "Now" },
];

export function HistorialPantalla({ v }: { v: VistaDeHistorial }) {
  const desactualizado = v.planDesactualizado;
  return (
    <div className="hg-pila" data-historial-de={v.id}>
      <SelectorDeActivos items={v.selector} hacia="activo" />
      <div className="hg-cabecera">
        <div>
          <LineaDeCabecera v={v} chip={v.estado} />
          <h1>
            <T t={{ es: "Historial del activo", en: "Asset history" }} />
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
              <T t={{ es: "Versiones", en: "Versions" }} />{" "}
              <Dato>{v.versiones.length}</Dato>
            </span>
          </p>
        </div>
      </div>

      <section className="hg-panel" aria-labelledby="versiones">
        <div className="hg-panel-cab">
          <h2 id="versiones">
            <T t={{ es: "Versiones", en: "Versions" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "De la más nueva a la más vieja. La huella de cada versión es la que un plan cita al emitirse.",
                en: "Newest first. Each version's fingerprint is the one a plan cites when it is issued.",
              }}
            />
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T t={{ es: "Versiones del activo", en: "Asset versions" }} />
          </caption>
          <Cabeceras columnas={COLUMNAS_VERSIONES} />
          <tbody>
            {v.versiones.map((x) => (
              <tr key={x.n} data-version={x.n} data-vigente={String(x.vigente)}>
                <td data-celda="id">
                  <Dato>v{x.n}</Dato>{" "}
                  {x.vigente ? <Estado etiqueta={v.etiquetas.vigente} /> : null}
                </td>
                <td data-celda="fecha">
                  <Dato>{x.fecha}</Dato>
                </td>
                <td data-celda="principal">
                  <T t={x.cambio} />
                </td>
                <td data-celda="huella">
                  <Huella hex={x.huella} />
                </td>
                <td data-celda="estado">
                  {x.planEmitidoConEsta ? (
                    <>
                      <p>
                        <T
                          t={{
                            es: "El plan se emitió con esta versión",
                            en: "The plan was issued with this version",
                          }}
                        />
                      </p>
                      {desactualizado === null ? null : (
                        <p>
                          <Chip etiqueta={desactualizado.etiqueta} />
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="hg-menor">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {v.versiones
        .filter((x) => x.cambios.length > 0)
        .map((x) => (
          <section
            key={x.n}
            className="hg-panel"
            aria-labelledby={`cambios-${x.n}`}
            data-cambios-de={x.n}
          >
            <div className="hg-panel-cab">
              <h2 id={`cambios-${x.n}`}>
                <span lang="es">
                  Qué cambió en la versión {x.n}
                </span>
                <span lang="en">What changed in version {x.n}</span>
              </h2>
            </div>
            <table className="hg-tabla">
              <caption className="hg-oculto">
                <T
                  t={{
                    es: `Campos que cambiaron en la versión ${x.n}`,
                    en: `Fields that changed in version ${x.n}`,
                  }}
                />
              </caption>
              <Cabeceras columnas={COLUMNAS_CAMBIOS} />
              <tbody>
                {x.cambios.map((c) => (
                  <tr key={c.ruta} data-campo={c.ruta}>
                    <td data-celda="principal">
                      <p>
                        <strong>
                          <T t={c.campo} />
                        </strong>
                      </p>
                      <p className="hg-menor">
                        <Dato>{c.ruta}</Dato>
                      </p>
                    </td>
                    <td data-celda="antes">
                      <T t={c.antes} />
                    </td>
                    <td data-celda="ahora">
                      <T t={c.despues} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
    </div>
  );
}
