"use client";

import Link from "next/link";
import { useState } from "react";
import { RUTAS, rutaDeControl } from "@/lib/brecha/etiquetas";
import type { FilaDeEsperadoObtenido, VistaDeBrecha } from "@/lib/brecha/tipos";
import { Aviso, Chip, Estado, Huella, Sello } from "../estado";
import { en as texto, useIdioma } from "../consola/idioma";
import { Dato, T } from "../texto";
import {
  Cifras,
  Desglose,
  Ejecutadas,
  EstadoDeControlMarca,
  FilaDeBrecha,
  TablaDeAlertas,
  rotulo,
  rutaDeActivo,
  rutaDePlan,
} from "./piezas";

/**
 * La pantalla `/brecha` (maqueta `docs/diseno/brecha.html`): esperado contra obtenido en cada prueba planeada, de todos los
 * activos. La cobertura se agrupa de tres maneras (pestañas) y la tabla por prueba se filtra por activo y por veredicto: son
 * los únicos estados de la pantalla, y solo esconden filas que ya están en el HTML. Todo lo demás sale de la misma brecha que el
 * tablero, la vista por control y el informe.
 */

type Via = "activo" | "familia" | "control";
const VIAS: { valor: Via; nombre: { es: string; en: string } }[] = [
  { valor: "activo", nombre: { es: "Por activo", en: "By asset" } },
  { valor: "familia", nombre: { es: "Por familia", en: "By family" } },
  { valor: "control", nombre: { es: "Por control", en: "By control" } },
];

export function BrechaPantalla({ v }: { v: VistaDeBrecha }) {
  const idioma = useIdioma();
  const [via, setVia] = useState<Via>("activo");
  const [activo, setActivo] = useState("");
  const [veredicto, setVeredicto] = useState("");

  const total = v.filas.length;
  const coincide = (f: FilaDeEsperadoObtenido) =>
    (activo === "" || f.activo.id === activo) &&
    (veredicto === "" || f.veredictoId === veredicto);
  const visibles = v.filas.filter(coincide).length;
  const hayFiltro = activo !== "" || veredicto !== "";

  if (v.porActivo.every((a) => a.totales === null))
    return (
      <>
        <div className="hg-cabecera">
          <div>
            <h1>
              <T t={{ es: "Brecha", en: "Gap" }} />
            </h1>
          </div>
        </div>
        <Aviso
          etiqueta={v.vacio}
          titulo={{
            es: "Todavía no hay brecha que medir",
            en: "There is no gap to measure yet",
          }}
        >
          <p>
            <T
              t={{
                es: "La brecha compara lo planeado con lo confirmado. Emite el plan de un activo y confirma su primera evidencia para empezar.",
                en: "The gap compares what was planned with what was confirmed. Issue an asset's plan and confirm its first evidence to begin.",
              }}
            />
          </p>
        </Aviso>
      </>
    );

  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Brecha", en: "Gap" }} />
          </h1>
          <p className="hg-bajada">
            <T
              t={{
                es: "Esperado contra obtenido en cada prueba planeada, de todos los activos. Solo cuenta lo que confirmó una persona.",
                en: "Expected against obtained for every planned test, across all assets. Only what a person confirmed counts.",
              }}
            />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Instantánea", en: "Snapshot" }} />{" "}
              <Dato>{v.instantanea}</Dato>
            </span>
            <span>
              <T t={{ es: "Consulta del", en: "Queried on" }} />{" "}
              <Dato>{v.consulta}</Dato>
            </span>
            <span>
              <T
                t={{
                  es: `${v.activosConPlan} de ${v.activosTotal} activos con plan`,
                  en: `${v.activosConPlan} of ${v.activosTotal} assets with a plan`,
                }}
              />
            </span>
          </p>
        </div>
        <Cifras
          cifras={v.cifras}
          nombre={{
            es: "Cobertura de lo planeado",
            en: "Coverage of what was planned",
          }}
        />
      </div>

      <div className="hg-pila">
        {v.porConfirmar.sobres > 0 ? (
          <Sello
            etiqueta={v.porConfirmar.sello}
            atributos={{ "data-por-confirmar": String(v.porConfirmar.sobres) }}
          >
            <p>
              <T
                t={{
                  es: `${v.porConfirmar.sobres} sobres en ${v.porConfirmar.lotes} lotes. Ninguno mueve estas cifras hasta que una persona lo confirme.`,
                  en: `${v.porConfirmar.sobres} envelopes in ${v.porConfirmar.lotes} batches. None of them moves these figures until a person confirms it.`,
                }}
              />
            </p>
            <p>
              <Link href={RUTAS.carga}>
                <T
                  t={{
                    es: "Ir a la carga de evidencia",
                    en: "Go to evidence intake",
                  }}
                />
              </Link>
            </p>
          </Sello>
        ) : null}

        <section
          className="hg-panel"
          data-pestanas=""
          data-via={via}
          aria-labelledby="cobertura"
        >
          <div className="hg-panel-cab">
            <h2 id="cobertura">
              <T t={{ es: "Cobertura", en: "Coverage" }} />
            </h2>
            <p className="hg-menor">
              <T
                t={{
                  es: "Planeadas contra ejecutadas. Una prueba sin constancia de que corrió cuenta como no ejecutada.",
                  en: "Planned against run. A test with no proof that it ran counts as not run.",
                }}
              />
            </p>
          </div>
          <div
            className="hg-pestanas"
            role="group"
            aria-label={rotulo({
              es: "Agrupar la cobertura",
              en: "Group the coverage",
            })}
          >
            {VIAS.map(({ valor, nombre }) => (
              <button
                key={valor}
                type="button"
                className="hg-pestana"
                data-controlador="pestana"
                data-valor={valor}
                aria-pressed={valor === via}
                onClick={() => setVia(valor)}
              >
                <T t={nombre} />
              </button>
            ))}
          </div>

          <table
            className="hg-tabla"
            data-si-via="activo"
            hidden={via !== "activo"}
          >
            <caption className="hg-oculto">
              <T t={{ es: "Cobertura por activo", en: "Coverage by asset" }} />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T t={{ es: "Activo", en: "Asset" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Ejecutadas", en: "Run" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Resultado", en: "Outcome" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Estado", en: "Status" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {v.porActivo.map((a) =>
                a.totales === null || a.plan === null ? (
                  <tr key={a.id} data-cobertura="activo">
                    <td data-celda="principal">
                      <p>
                        <Link
                          className="hg-enlace-fila"
                          href={rutaDeActivo(a.id)}
                        >
                          <T t={a.nombre} />
                        </Link>
                      </p>
                      <p className="hg-menor">
                        <T
                          t={{
                            es: "Sin alcance autorizado no hay plan, y sin plan no hay brecha.",
                            en: "Without an authorized scope there is no plan, and without a plan there is no gap.",
                          }}
                        />
                      </p>
                    </td>
                    <td>
                      <p className="hg-menor">—</p>
                    </td>
                    <td>
                      <p className="hg-menor">—</p>
                    </td>
                    <td data-celda="estado">
                      <Chip etiqueta={a.estado} />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={a.id}
                    data-cobertura="activo"
                    data-planeadas={a.totales.planeadas}
                    data-ejecutadas={a.totales.ejecutadas}
                  >
                    <td data-celda="principal">
                      <p>
                        <Link
                          className="hg-enlace-fila"
                          href={rutaDeActivo(a.id)}
                        >
                          <T t={a.nombre} />
                        </Link>
                      </p>
                      <p className="hg-menor">
                        <T t={{ es: "Plan", en: "Plan" }} />{" "}
                        <Link href={rutaDePlan(a.id)}>
                          <Huella hex={a.plan.huella} />
                        </Link>
                      </p>
                    </td>
                    <td data-celda="resultado">
                      <Ejecutadas totales={a.totales} />
                    </td>
                    <td>
                      <Desglose totales={a.totales} marcas={v.veredictos} />
                    </td>
                    <td data-celda="estado">
                      <Estado etiqueta={a.estado} />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>

          <table
            className="hg-tabla"
            data-si-via="familia"
            hidden={via !== "familia"}
          >
            <caption className="hg-oculto">
              <T
                t={{ es: "Cobertura por familia", en: "Coverage by family" }}
              />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T t={{ es: "Familia", en: "Family" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Ejecutadas", en: "Run" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Resultado", en: "Outcome" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {v.porFamilia.map((f) => (
                <tr
                  key={f.id}
                  data-cobertura="familia"
                  data-planeadas={f.totales.planeadas}
                  data-ejecutadas={f.totales.ejecutadas}
                >
                  <td data-celda="principal">
                    <p>
                      <strong>
                        <T t={f.nombre} />
                      </strong>
                    </p>
                  </td>
                  <td data-celda="resultado">
                    <Ejecutadas totales={f.totales} />
                  </td>
                  <td>
                    <Desglose totales={f.totales} marcas={v.veredictos} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <table
            className="hg-tabla"
            data-si-via="control"
            hidden={via !== "control"}
          >
            <caption className="hg-oculto">
              <T
                t={{ es: "Cobertura por control", en: "Coverage by control" }}
              />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T t={{ es: "Control", en: "Control" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Qué exige", en: "What it requires" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Ejecutadas", en: "Run" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Estado", en: "Status" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {v.porControl.map((c) => (
                <tr key={c.id} data-cobertura="control">
                  <td data-celda="id">
                    <Link href={rutaDeControl(c.id)}>
                      <Dato>{c.id}</Dato>
                    </Link>
                  </td>
                  <td data-celda="principal">
                    <p>
                      <T t={c.nombre} />
                    </p>
                    {c.totales.planeadas > 0 ? null : (
                      <p className="hg-menor">
                        <T
                          t={{
                            es: "Ninguna prueba del plan lo cubre: las que lo cubren quedaron fuera.",
                            en: "No test in the plan covers it: the ones that do were left out.",
                          }}
                        />
                      </p>
                    )}
                  </td>
                  <td data-celda="resultado">
                    {c.totales.planeadas > 0 ? (
                      <Ejecutadas totales={c.totales} />
                    ) : (
                      <p className="hg-menor">—</p>
                    )}
                  </td>
                  <td data-celda="estado">
                    <EstadoDeControlMarca
                      id={c.id}
                      estadoId={c.estadoId}
                      etiqueta={c.estado}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {v.sinControl.length > 0 ? (
            <p
              className="hg-panel-pie"
              data-si-via="control"
              hidden={via !== "control"}
            >
              <T
                t={{
                  es: `${v.sinControl.length} pruebas del plan no dan evidencia a ningún control (`,
                  en: `${v.sinControl.length} tests in the plan give evidence to no control (`,
                }}
              />
              {v.sinControl.map((id, i) => (
                <span key={id}>
                  {i > 0 ? " · " : null}
                  <Dato>{id}</Dato>
                </span>
              ))}
              <T
                t={{
                  es: "): cuentan en la cobertura por activo y por familia.",
                  en: "): they count in the coverage by asset and by family.",
                }}
              />
            </p>
          ) : null}
        </section>

        <section className="hg-panel" aria-labelledby="esperado">
          <div className="hg-panel-cab">
            <h2 id="esperado">
              <T
                t={{
                  es: "Esperado contra obtenido",
                  en: "Expected against obtained",
                }}
              />
            </h2>
            <p className="hg-menor">
              <T
                t={{
                  es: "Una fila por prueba planeada, con su último sobre confirmado.",
                  en: "One row per planned test, with its latest confirmed envelope.",
                }}
              />
            </p>
          </div>
          <div className="hg-herramientas">
            <div className="hg-herramientas-linea">
              <div
                className="hg-grupo"
                role="group"
                aria-label={rotulo({ es: "Activo", en: "Asset" })}
              >
                {[
                  { id: "", nombre: { es: "Todos", en: "All" } },
                  ...v.filtros.activos,
                ].map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="hg-boton hg-filtro"
                    data-controlador="filtro"
                    data-campo="activo"
                    data-valor={a.id}
                    aria-pressed={a.id === activo}
                    onClick={() => setActivo(a.id)}
                  >
                    <T t={a.nombre} />
                  </button>
                ))}
              </div>
              <div className="hg-grupo">
                <p className="hg-menor">
                  <T
                    t={{
                      es: `Se muestran `,
                      en: `Showing `,
                    }}
                  />
                  <span data-cuenta-filtrada="" data-neutro>
                    {visibles}
                  </span>
                  <T
                    t={{
                      es: ` de ${total} pruebas`,
                      en: ` of ${total} tests`,
                    }}
                  />
                </p>
                <button
                  type="button"
                  className="hg-boton hg-boton-discreto"
                  data-controlador="filtro-limpiar"
                  hidden={!hayFiltro}
                  onClick={() => {
                    setActivo("");
                    setVeredicto("");
                  }}
                >
                  <T t={{ es: "Quitar filtros", en: "Clear filters" }} />
                </button>
              </div>
            </div>
            <div className="hg-campos">
              <label className="hg-campo" htmlFor="filtro-veredicto">
                <span>
                  <T t={{ es: "Veredicto", en: "Verdict" }} />
                </span>
                <select
                  id="filtro-veredicto"
                  data-controlador="filtro"
                  data-campo="veredicto"
                  value={veredicto}
                  onChange={(e) => setVeredicto(e.target.value)}
                >
                  <option value="">
                    {texto(idioma, { es: "Todos", en: "All" })}
                  </option>
                  {v.filtros.veredictos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {texto(idioma, e.etiqueta.nombre)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <table className="hg-tabla">
            <caption className="hg-oculto">
              <T
                t={{
                  es: "Esperado contra obtenido, por prueba",
                  en: "Expected against obtained, by test",
                }}
              />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T t={{ es: "Prueba", en: "Test" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Qué se espera", en: "What is expected" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Qué se obtuvo", en: "What was obtained" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Desviación", en: "Deviation" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Veredicto", en: "Verdict" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {v.filas.map((f) => (
                <FilaDeBrecha
                  key={`${f.activo.id}/${f.prueba.id}`}
                  f={f}
                  oculta={!coincide(f)}
                />
              ))}
            </tbody>
          </table>
          <div
            className={`hg-aviso es-${v.vacio.rol}`}
            data-sin-resultados=""
            hidden={visibles > 0}
          >
            <h2>
              <T
                t={{
                  es: "Ninguna prueba cumple esos filtros",
                  en: "No test matches those filters",
                }}
              />
            </h2>
            <p>
              <T
                t={{
                  es: "Quita un filtro o vuelve a «Todos» para ver todas las pruebas planeadas.",
                  en: "Remove a filter or go back to “All” to see every planned test.",
                }}
              />
            </p>
          </div>
        </section>

        <section className="hg-panel" aria-labelledby="alertas">
          <div className="hg-panel-cab">
            <h2 id="alertas">
              <T t={{ es: "Vencidos y alertas", en: "Overdue and alerts" }} />
            </h2>
            <p className="hg-menor">
              <T
                t={{
                  es: "Hallazgos fuera de plazo, fichas del plan vencidas en el catálogo, marcos con versión nueva y evidencia antigua.",
                  en: "Findings past their deadline, plan records overdue in the catalog, frameworks with a new version and stale evidence.",
                }}
              />
            </p>
          </div>
          <TablaDeAlertas
            filas={v.alertas}
            titulo={{ es: "Vencidos y alertas", en: "Overdue and alerts" }}
          />
          <p className="hg-panel-pie" data-marcos="sin-registro">
            <Estado etiqueta={v.marcos} />{" "}
            <T
              t={{
                es: "Marcos con versión nueva: todavía no hay registro de la versión que publica cada fuente, así que no se puede decir si alguno cambió.",
                en: "Frameworks with a new version: there is no record yet of the version each source publishes, so there is no telling whether any changed.",
              }}
            />
          </p>
        </section>
      </div>
    </>
  );
}
