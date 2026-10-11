import Link from "next/link";
import { pruebas } from "@/lib/catalogo/etiquetas";
import { SIN_CONTROL, SIN_CONTROL_CORTO } from "@/lib/catalogo/etiquetas";
import type { VistaDeControles } from "@/lib/catalogo/controles";
import { Aviso, Chip, Estado, Huella } from "../estado";
import { Dato, T } from "../texto";

/**
 * La pantalla `/catalogo/controles` (maqueta `docs/diseno/controles.html`). Componente de SERVIDOR. La capa por defecto del
 * Anexo A de ISO/IEC 42001 con identificador y resumen PROPIO (jamás el texto de la norma, regla dura 11), los controles a
 * los que el catálogo da evidencia con las pruebas que los cubren, y la deuda a la vista: pruebas sin control asignado.
 */

const CON_PRUEBAS = { rol: "positivo", simbolo: "ok" } as const;
const SIN_PRUEBAS = {
  rol: "neutro",
  simbolo: "vacio",
  nombre: { es: "Sin pruebas", en: "No tests" },
};

function Cabeceras({ columnas }: { columnas: { es: string; en: string }[] }) {
  return (
    <thead>
      <tr>
        {columnas.map((c) => (
          <th key={c.es} scope="col">
            <T t={c} />
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function ControlesVacio() {
  return (
    <Aviso
      etiqueta={{ rol: "neutro", simbolo: "vacio" }}
      titulo={{ es: "No hay controles cargados", en: "No controls loaded" }}
    >
      <p>
        <T
          t={{
            es: "Sin la capa de controles, las pruebas se planean y se ejecutan igual, pero ningún resultado cuenta como evidencia de un control. Carga la capa por defecto del repositorio.",
            en: "Without the control layer, tests are still planned and run, but no result counts as evidence for a control. Load the default layer from the repository.",
          }}
        />
      </p>
    </Aviso>
  );
}

export function ControlesPantalla({ vista }: { vista: VistaDeControles }) {
  if (vista.capa.controles === 0) return <ControlesVacio />;
  const areasConPruebas = vista.areas.filter((a) => a.pruebas > 0).length;
  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Controles", en: "Controls" }} />
          </h1>
          <span id="rotulo-cifras" className="hg-oculto">
            <T t={{ es: "Resumen de controles", en: "Control summary" }} />
          </span>
          <p className="hg-bajada">
            <T
              t={{
                es: "Un hallazgo es evidencia de que un control falla. Aquí se ve a qué control da evidencia cada prueba, y cuáles todavía no dan a ninguno.",
                en: "A finding is evidence that a control fails. This shows which control each test gives evidence to, and which ones do not give evidence to any yet.",
              }}
            />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Capa por defecto", en: "Default layer" }} /> ·{" "}
              <span data-neutro>{vista.capa.marco}</span> ·{" "}
              <T t={{ es: "Anexo A", en: "Annex A" }} />
            </span>
            <span>
              <T
                t={{
                  es: "Solo identificadores y resúmenes propios; el texto de la norma no está aquí.",
                  en: "Identifiers and our own summaries only; the standard's text is not here.",
                }}
              />
            </span>
            <span>
              <T t={{ es: "Instantánea", en: "Snapshot" }} />{" "}
              <Dato>{vista.instantanea}</Dato>
            </span>
            <span>
              <Huella hex={vista.huella} />
            </span>
          </p>
        </div>
        <ul className="hg-resumen" aria-labelledby="rotulo-cifras">
          <li>
            <span className="hg-cifra" data-neutro>
              {vista.areas.length}
            </span>
            <span>
              <T t={{ es: "áreas del Anexo A", en: "Annex A areas" }} />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {areasConPruebas}
            </span>
            <Estado
              etiqueta={{
                ...CON_PRUEBAS,
                nombre: { es: "áreas con pruebas", en: "areas with tests" },
              }}
            />
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {vista.conPruebas.length}
            </span>
            <span>
              <T
                t={{
                  es: "controles con evidencia posible",
                  en: "controls with possible evidence",
                }}
              />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {vista.sinControl.length}
            </span>
            <Estado
              etiqueta={{
                ...SIN_CONTROL,
                nombre: {
                  es: "pruebas sin control",
                  en: "tests without a control",
                },
              }}
            />
          </li>
        </ul>
      </div>

      <section className="hg-panel" aria-labelledby="areas">
        <div className="hg-panel-cab">
          <h2 id="areas">
            <T t={{ es: "Áreas del Anexo A", en: "Annex A areas" }} />
          </h2>
          <p className="hg-menor">
            {vista.capa.sinCapaPropia ? (
              <T
                t={{
                  es: "Ninguna capa propia cargada.",
                  en: "No custom layer loaded.",
                }}
              />
            ) : (
              <T
                t={{
                  es: "Hay una capa propia cargada.",
                  en: "A custom layer is loaded.",
                }}
              />
            )}
          </p>
        </div>
        <div className="hg-panel-cuerpo" data-sin-contrastar>
          <p className="hg-menor">
            <T t={vista.capa.descripcion} />
          </p>
          <p>
            <Chip
              etiqueta={{
                rol: "atencion",
                simbolo: "aviso",
                nombre: {
                  es: "No contrastado con la norma",
                  en: "Not checked against the standard",
                },
              }}
            />{" "}
            <span className="hg-menor" lang="es">
              {vista.capa.sinContrastar} de {vista.capa.controles} resúmenes
              todavía sin contrastar.
            </span>
            <span className="hg-menor" lang="en">
              {vista.capa.sinContrastar} of {vista.capa.controles} summaries not
              checked yet.
            </span>
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T t={{ es: "Áreas del Anexo A", en: "Annex A areas" }} />
          </caption>
          <Cabeceras
            columnas={[
              { es: "Área", en: "Area" },
              {
                es: "Qué cubre, con palabras propias",
                en: "What it covers, in our own words",
              },
              { es: "Pruebas del catálogo", en: "Catalog tests" },
            ]}
          />
          <tbody>
            {vista.areas.map((a) => (
              <tr key={a.id} data-area={a.id}>
                <td data-celda="id">
                  <Dato>{a.id}</Dato>
                </td>
                <td>
                  <p>
                    <strong>
                      <T t={a.nombre} />
                    </strong>
                  </p>
                  <ul className="hg-lista">
                    {a.controles.map((c) => (
                      <li key={c.id} className="hg-menor">
                        <T t={c.nombre} />
                      </li>
                    ))}
                  </ul>
                </td>
                <td data-celda="estado">
                  {a.pruebas > 0 ? (
                    <>
                      <p>
                        <Estado
                          etiqueta={{
                            ...CON_PRUEBAS,
                            nombre: pruebas(a.pruebas),
                          }}
                        />
                      </p>
                      <p className="hg-menor">
                        <span lang="es">en {a.controles.length} controles</span>
                        <span lang="en">
                          across {a.controles.length} controls
                        </span>
                      </p>
                    </>
                  ) : (
                    <p>
                      <Estado etiqueta={SIN_PRUEBAS} />
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hg-panel" aria-labelledby="con-pruebas">
        <div className="hg-panel-cab">
          <h2 id="con-pruebas">
            <T t={{ es: "Controles con pruebas", en: "Controls with tests" }} />
          </h2>
        </div>
        <div className="hg-panel-cuerpo">
          <p className="hg-menor">
            <T
              t={{
                es: "Que una prueba dé evidencia a un control no dice que el control se cumpla: dice dónde mirar. El estado de cada control, con su evidencia, está en la vista por control.",
                en: "A test giving evidence to a control does not say the control is met: it says where to look. Each control's status, with its evidence, is in the control view.",
              }}
            />
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T t={{ es: "Controles con pruebas", en: "Controls with tests" }} />
          </caption>
          <Cabeceras
            columnas={[
              { es: "Control", en: "Control" },
              {
                es: "Qué exige, con palabras propias",
                en: "What it requires, in our own words",
              },
              {
                es: "Pruebas que le dan evidencia",
                en: "Tests that give it evidence",
              },
              { es: "Cuántas", en: "How many" },
              { es: "Equivalentes", en: "Equivalents" },
            ]}
          />
          <tbody>
            {vista.conPruebas.map((c) => (
              <tr key={c.id} data-control={c.id}>
                <td data-celda="id">
                  <p>
                    <Dato>{c.id}</Dato>
                  </p>
                  <p className="hg-menor">
                    <T t={c.area} />
                  </p>
                </td>
                <td>
                  <p>
                    <strong>
                      <T t={c.nombre} />
                    </strong>
                  </p>
                  <p className="hg-menor">
                    <T t={c.resumen} />
                  </p>
                </td>
                <td>
                  <p>
                    {c.pruebas.map((p, n) => (
                      <span key={p.id}>
                        {n > 0 ? " · " : ""}
                        <Link
                          className="hg-enlace-fila"
                          href={`/catalogo/${p.id}`}
                        >
                          <Dato>{p.id}</Dato>
                        </Link>
                      </span>
                    ))}
                  </p>
                </td>
                <td data-celda="estado">
                  <Estado
                    etiqueta={{
                      ...CON_PRUEBAS,
                      nombre: {
                        es:
                          c.pruebas.length === 1
                            ? "1 prueba"
                            : `${c.pruebas.length} pruebas`,
                        en:
                          c.pruebas.length === 1
                            ? "1 test"
                            : `${c.pruebas.length} tests`,
                      },
                    }}
                  />
                </td>
                <td>
                  {c.equivalentes.length === 0 ? (
                    <p className="hg-menor">
                      <T
                        t={{ es: "Ninguno registrado", en: "None recorded" }}
                      />
                    </p>
                  ) : (
                    c.equivalentes.map((e) => (
                      <p key={`${e.marco}-${e.referencia}`}>
                        <span data-neutro>{`${e.marco} · ${e.referencia}`}</span>{" "}
                        {e.incompleto ? <Chip etiqueta={e.incompleto} /> : null}
                      </p>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hg-panel" aria-labelledby="deuda">
        <div className="hg-panel-cab">
          <h2 id="deuda">
            <T
              t={{
                es: "Pruebas sin control asignado",
                en: "Tests with no control assigned",
              }}
            />
          </h2>
        </div>
        <div className="hg-panel-cuerpo">
          <p className="hg-menor">
            <T
              t={{
                es: "Se aceptan en el catálogo, pero su resultado no cuenta para ningún control. Es una deuda a la vista, no un error: una persona decide a qué control dan evidencia.",
                en: "They are accepted in the catalog, but their result does not count toward any control. It is a visible debt, not an error: a person decides which control they give evidence to.",
              }}
            />
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T
              t={{
                es: "Pruebas sin control asignado",
                en: "Tests with no control assigned",
              }}
            />
          </caption>
          <Cabeceras
            columnas={[
              { es: "Prueba", en: "Test" },
              { es: "Qué verifica", en: "What it verifies" },
              { es: "Control", en: "Control" },
            ]}
          />
          <tbody>
            {vista.sinControl.map((p) => (
              <tr key={p.id} data-prueba={p.id}>
                <td data-celda="id">
                  <Dato>{p.id}</Dato>
                </td>
                <td>
                  <p>
                    <Link className="hg-enlace-fila" href={`/catalogo/${p.id}`}>
                      <T t={p.nombre} />
                    </Link>
                  </p>
                  <p className="hg-menor">
                    <T t={p.queVerifica} />
                  </p>
                </td>
                <td data-celda="estado">
                  <Chip etiqueta={SIN_CONTROL_CORTO} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
