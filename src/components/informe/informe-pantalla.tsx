import Link from "next/link";
import type { VistaDeInforme } from "@/lib/brecha/tipos";
import { Par } from "../activos/piezas";
import {
  Cifras,
  Desglose,
  Ejecutadas,
  EnlaceAControl,
  EstadoDeControlMarca,
  EvidenciaFechada,
  FilaDeBrecha,
  TablaDeAlertas,
  rotulo,
  rutaDeActivo,
  rutaDePlan,
} from "../brecha/piezas";
import { Aviso, Chip, Estado, Huella } from "../estado";
import { Plazo, Revision } from "../hallazgo/hallazgo-pantalla";
import { rutaDeHallazgo } from "../hallazgo/piezas";
import { Dato, T } from "../texto";
import { BotonImprimir } from "./boton-imprimir";

/**
 * La pantalla `/brecha/informe` (maqueta `docs/diseno/informe.html`, RF-05.6): el informe de brecha con las ocho secciones del
 * § 12 de la especificación. Se lee en el navegador y se imprime: la hoja de impresión deja solo el informe, en papel claro
 * aunque la pantalla esté en oscuro. Componente de SERVIDOR; el botón de imprimir es el único código de cliente. Sale de la misma
 * brecha que las otras cuatro pantallas, y su huella es la de su contenido.
 */

const SECCIONES = [
  {
    id: "informe-resumen",
    nombre: {
      es: "Resumen para quien decide",
      en: "Summary for the decision-maker",
    },
  },
  { id: "informe-cobertura", nombre: { es: "Cobertura", en: "Coverage" } },
  {
    id: "informe-esperado",
    nombre: { es: "Esperado contra obtenido", en: "Expected against obtained" },
  },
  { id: "informe-hallazgos", nombre: { es: "Hallazgos", en: "Findings" } },
  {
    id: "informe-controles",
    nombre: { es: "Vista por control", en: "Control view" },
  },
  { id: "informe-alertas", nombre: { es: "Alertas", en: "Alerts" } },
  {
    id: "informe-riesgos",
    nombre: { es: "Riesgos aceptados", en: "Accepted risks" },
  },
  {
    id: "informe-ficha",
    nombre: { es: "Ficha de reproducibilidad", en: "Reproducibility record" },
  },
] as const;

function Seccion({
  i,
  bajada,
  children,
}: {
  i: number;
  bajada?: { es: string; en: string };
  children: React.ReactNode;
}) {
  const s = SECCIONES[i]!;
  return (
    <section
      className="hg-informe-seccion"
      id={s.id}
      aria-labelledby={`${s.id}-t`}
    >
      <h2 id={`${s.id}-t`}>
        <span className="hg-informe-num" data-neutro>
          {i + 1}
        </span>
        <T t={s.nombre} />
      </h2>
      {bajada === undefined ? null : (
        <p className="hg-menor">
          <T t={bajada} />
        </p>
      )}
      {children}
    </section>
  );
}

export function InformePantalla({ v }: { v: VistaDeInforme }) {
  const conPlan = v.activos.filter((a) => a.conPlan).length;
  const f = v.ficha;
  const ins = f.instrumento;

  if (v.filas.length === 0)
    return (
      <Aviso
        etiqueta={v.vacio}
        nivel={1}
        titulo={{ es: "Todavía no hay informe", en: "There is no report yet" }}
      >
        <p>
          <T
            t={{
              es: "El informe resume la brecha de lo planeado contra lo confirmado. Emite un plan y confirma su primera evidencia para generarlo.",
              en: "The report summarizes the gap between what was planned and what was confirmed. Issue a plan and confirm its first evidence to generate it.",
            }}
          />
        </p>
      </Aviso>
    );

  return (
    <div className="hg-trabajo">
      <article
        className="hg-informe"
        id="informe"
        aria-label={rotulo({ es: "Informe de brecha", en: "Gap report" })}
      >
        <header className="hg-informe-cab">
          <p className="hg-rotulo">
            <T
              t={{
                es: "HackGuard · informe de brecha",
                en: "HackGuard · gap report",
              }}
            />
          </p>
          <h1>
            <T t={{ es: "Todos los activos", en: "All assets" }} />
          </h1>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Evaluado el", en: "Assessed on" }} />{" "}
              <Dato>{v.consulta}</Dato>
            </span>
            <span>
              <T t={{ es: "Instantánea", en: "Snapshot" }} />{" "}
              <Dato>{v.instantanea}</Dato>
            </span>
            <span>
              <Huella hex={v.huellaDelInforme} />
            </span>
          </p>
        </header>

        <Seccion i={0}>
          <p className="hg-destacado">
            <T t={v.resumen.frase} />
          </p>
          <Cifras
            cifras={v.resumen.cifras}
            nombre={{ es: "Cifras del resumen", en: "Summary figures" }}
          />
          <h3>
            <T
              t={{
                es: "Lo que pide una decisión",
                en: "What calls for a decision",
              }}
            />
          </h3>
          <ul className="hg-lista">
            {v.resumen.decidir.map((d) => (
              <li key={d.es}>
                <T t={d} />
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion
          i={1}
          bajada={{
            es: `Planeadas contra ejecutadas en los ${conPlan} activos con plan. Una prueba sin constancia de que corrió cuenta como no ejecutada.`,
            en: `Planned against run across the ${conPlan} assets with a plan. A test with no proof that it ran counts as not run.`,
          }}
        >
          <h3>
            <T t={{ es: "Por familia", en: "By family" }} />
          </h3>
          <table className="hg-tabla">
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
              {v.porFamilia.map((x) => (
                <tr
                  key={x.id}
                  data-cobertura="familia"
                  data-planeadas={x.totales.planeadas}
                  data-ejecutadas={x.totales.ejecutadas}
                >
                  <td data-celda="principal">
                    <p>
                      <strong>
                        <T t={x.nombre} />
                      </strong>
                    </p>
                  </td>
                  <td data-celda="resultado">
                    <Ejecutadas totales={x.totales} />
                  </td>
                  <td>
                    <Desglose totales={x.totales} marcas={v.veredictos} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>
            <T t={{ es: "Por control", en: "By control" }} />
          </h3>
          <table className="hg-tabla">
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
                  <T t={{ es: "Ejecutadas", en: "Run" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Resultado", en: "Outcome" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {v.controlesCobertura.map((c) => (
                <tr key={c.id}>
                  <td data-celda="principal">
                    <p>
                      <EnlaceAControl id={c.id} />
                    </p>
                    <p className="hg-menor">
                      <T t={c.nombre} />
                    </p>
                  </td>
                  <td data-celda="resultado">
                    {c.totales.planeadas > 0 ? (
                      <Ejecutadas totales={c.totales} />
                    ) : (
                      <p className="hg-menor">
                        <T
                          t={{
                            es: "Ninguna prueba en los planes",
                            en: "No test in the plans",
                          }}
                        />
                      </p>
                    )}
                  </td>
                  <td>
                    {c.totales.planeadas > 0 ? (
                      <Desglose totales={c.totales} marcas={v.veredictos} />
                    ) : (
                      <p className="hg-menor">—</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Seccion>

        <Seccion
          i={2}
          bajada={{
            es: "Solo cuenta el último sobre confirmado de cada prueba; lo que espera confirmación se nombra, pero no cuenta.",
            en: "Only each test's latest confirmed envelope counts; what awaits confirmation is named, but does not count.",
          }}
        >
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
              {v.filas.map((x) => (
                <FilaDeBrecha
                  key={`${x.activo.id}/${x.prueba.id}`}
                  f={x}
                  filtrable={false}
                />
              ))}
            </tbody>
          </table>
        </Seccion>

        <Seccion
          i={3}
          bajada={{
            es: "Por estado y severidad, con su plazo. Solo una re-prueba superada y confirmada cierra un hallazgo.",
            en: "By status and severity, with its deadline. Only a passed, confirmed retest closes a finding.",
          }}
        >
          <ul className="hg-desglose">
            {v.hallazgosPorEstado.map((e) => (
              <li key={e.etiqueta.nombre.es}>
                <Estado
                  etiqueta={{
                    ...e.etiqueta,
                    nombre: {
                      es: `${e.n} · ${e.etiqueta.nombre.es}`,
                      en: `${e.n} · ${e.etiqueta.nombre.en}`,
                    },
                  }}
                />
              </li>
            ))}
          </ul>
          <table className="hg-tabla">
            <caption className="hg-oculto">
              <T
                t={{
                  es: "Hallazgos por estado y severidad",
                  en: "Findings by status and severity",
                }}
              />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T t={{ es: "Hallazgo", en: "Finding" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Qué es", en: "What it is" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Severidad", en: "Severity" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Plazo o revisión", en: "Deadline or review" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Estado", en: "Status" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {v.hallazgos.map((x) => (
                <tr
                  key={x.hallazgo.id}
                  data-hallazgo={x.hallazgo.id}
                  data-estado-hallazgo={x.hallazgo.estadoId}
                >
                  <td data-celda="id">
                    <Dato>{x.hallazgo.id}</Dato>
                  </td>
                  <td data-celda="principal">
                    <p>
                      <Link href={rutaDeHallazgo(x.hallazgo.id)}>
                        <T t={x.hallazgo.titulo} />
                      </Link>
                    </p>
                    <p className="hg-menor">
                      <T t={x.activo} /> · <Dato>{x.prueba}</Dato>
                    </p>
                  </td>
                  <td>
                    <p>
                      <Chip etiqueta={x.hallazgo.severidad} />
                    </p>
                  </td>
                  <td>
                    {x.tiempo.tipo === "plazo" ? (
                      <Plazo p={x.tiempo.plazo} />
                    ) : x.tiempo.tipo === "revision" ? (
                      <Revision r={x.tiempo.revision} />
                    ) : (
                      <span className="hg-menor">
                        <T
                          t={
                            x.tiempo.sobre === null
                              ? {
                                  es: `Cerrado el ${x.tiempo.fecha}.`,
                                  en: `Closed on ${x.tiempo.fecha}.`,
                                }
                              : {
                                  es: `Cerrado el ${x.tiempo.fecha} por re-prueba ${x.tiempo.sobre}.`,
                                  en: `Closed on ${x.tiempo.fecha} by retest ${x.tiempo.sobre}.`,
                                }
                          }
                        />
                      </span>
                    )}
                  </td>
                  <td data-celda="estado">
                    {x.hallazgo.estadoId === "cerrado" ? (
                      <Estado etiqueta={x.hallazgo.estado} />
                    ) : (
                      <Chip etiqueta={x.hallazgo.estado} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Seccion>

        <Seccion
          i={4}
          bajada={{
            es: "Evidencia organizada para quien deba evaluarla: no mide el nivel de aseguramiento ni certifica cumplimiento.",
            en: "Evidence organized for whoever must assess it: it does not measure assurance or certify compliance.",
          }}
        >
          <table className="hg-tabla">
            <caption className="hg-oculto">
              <T t={{ es: "Vista por control", en: "Control view" }} />
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
                  <T t={{ es: "Evidencia", en: "Evidence" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Estado", en: "Status" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {v.controles.map((c) => (
                <tr key={c.id}>
                  <td data-celda="id">
                    <EnlaceAControl id={c.id} />
                  </td>
                  <td data-celda="principal">
                    <p>
                      <T t={c.nombre} />
                    </p>
                  </td>
                  <td>
                    {c.ultima === null ? (
                      <p className="hg-menor">
                        <T t={{ es: "Ninguna", en: "None" }} />
                      </p>
                    ) : (
                      <>
                        <p>
                          <EvidenciaFechada e={c.ultima} />
                        </p>
                        <p className="hg-menor">
                          <T
                            t={{
                              es: `${c.conSobre} ${c.conSobre === 1 ? "prueba" : "pruebas"} con sobre confirmado`,
                              en: `${c.conSobre} ${c.conSobre === 1 ? "test" : "tests"} with a confirmed envelope`,
                            }}
                          />
                        </p>
                      </>
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
        </Seccion>

        <Seccion
          i={5}
          bajada={{
            es: "Fichas del plan vencidas en el catálogo, marcos con versión nueva y evidencia antigua.",
            en: "Plan records overdue in the catalog, frameworks with a new version and stale evidence.",
          }}
        >
          {v.alertas.length > 0 ? (
            <TablaDeAlertas filas={v.alertas} titulo={SECCIONES[5].nombre} />
          ) : (
            <p>
              <T
                t={{
                  es: "Ninguna alerta en esta fecha.",
                  en: "No alerts on this date.",
                }}
              />
            </p>
          )}
          <p className="hg-menor" data-marcos="sin-registro">
            <Estado etiqueta={v.marcos} />{" "}
            <T
              t={{
                es: "Marcos con versión nueva: todavía no hay registro de la versión que publica cada fuente.",
                en: "Frameworks with a new version: there is no record yet of the version each source publishes.",
              }}
            />
          </p>
        </Seccion>

        <Seccion
          i={6}
          bajada={{
            es: "Con su justificación y la fecha en que toca revisarlos.",
            en: "With their justification and the date they are due for review.",
          }}
        >
          {v.riesgos.length > 0 ? (
            v.riesgos.map((r) => (
              <div className="hg-caja" key={r.hallazgo.id}>
                <p className="hg-caja-titulo">
                  <Dato>{r.hallazgo.id}</Dato>{" "}
                  <Link href={rutaDeHallazgo(r.hallazgo.id)}>
                    <T t={r.hallazgo.titulo} />
                  </Link>
                </p>
                <p>
                  <Chip etiqueta={r.hallazgo.severidad} />
                </p>
                <p>
                  <T t={r.justificacion} />
                </p>
                <p>
                  <Revision r={r.revision} />
                </p>
              </div>
            ))
          ) : (
            <p>
              <T
                t={{ es: "Ningún riesgo aceptado.", en: "No accepted risk." }}
              />
            </p>
          )}
        </Seccion>

        <Seccion i={7}>
          <dl className="hg-propiedades hg-propiedades-en-columnas">
            <Par rotulo={{ es: "Fecha de evaluación", en: "Assessment date" }}>
              <Dato>{v.consulta}</Dato>
            </Par>
            <Par
              rotulo={{
                es: "Instantánea del catálogo",
                en: "Catalog snapshot",
              }}
            >
              <span>
                <Dato>{v.instantanea}</Dato>
              </span>
              <Huella hex={f.huellaDelCatalogo} />
            </Par>
            <Par rotulo={{ es: "Planes", en: "Plans" }}>
              {f.planes.map((p) => (
                <span key={p.activo.id}>
                  <Link href={rutaDePlan(p.activo.id)}>
                    <Huella hex={p.huella} />
                  </Link>{" "}
                  <span className="hg-menor">
                    · <T t={p.activo.nombre} /> · {p.fecha}
                  </span>
                </span>
              ))}
            </Par>
            <Par
              rotulo={{ es: "Sobres que cuentan", en: "Envelopes that count" }}
            >
              <span>
                <T
                  t={{
                    es: `${f.sobresQueCuentan} confirmados, de ${f.sobresEnElLibro} en el libro`,
                    en: `${f.sobresQueCuentan} confirmed, of ${f.sobresEnElLibro} in the ledger`,
                  }}
                />
              </span>
            </Par>
            <Par
              rotulo={{
                es: "Huella de este informe",
                en: "This report's fingerprint",
              }}
            >
              <Huella hex={v.huellaDelInforme} />
            </Par>
            <Par
              rotulo={{
                es: "Validación del instrumento",
                en: "Instrument validation",
              }}
            >
              <span>
                <Estado
                  etiqueta={{
                    ...ins.etiqueta,
                    nombre: ins.verde
                      ? {
                          es: `${ins.verdes} de ${ins.total} en verde`,
                          en: `${ins.verdes} of ${ins.total} green`,
                        }
                      : {
                          es: `${ins.total - ins.verdes} en rojo`,
                          en: `${ins.total - ins.verdes} red`,
                        },
                  }}
                />
              </span>
            </Par>
          </dl>
          <p className="hg-menor">
            <T
              t={{
                es: "Dos corridas sobre los mismos datos producen este informe byte a byte: la fecha de evaluación es una entrada, no el reloj.",
                en: "Two runs over the same data produce this report byte for byte: the assessment date is an input, not the clock.",
              }}
            />
          </p>
        </Seccion>
      </article>

      <aside
        className="hg-carril"
        aria-label={rotulo({
          es: "Acción y contenido del informe",
          en: "Report action and contents",
        })}
      >
        <section
          className="hg-tarjeta hg-tarjeta-accion"
          aria-labelledby="llevar"
        >
          <h2 className="hg-tarjeta-titulo" id="llevar">
            <T t={{ es: "Llevártelo", en: "Take it with you" }} />
          </h2>
          <p>
            <T
              t={{
                es: "Sale solo el informe, en papel claro, con las tablas completas.",
                en: "Only the report comes out, on light paper, with complete tables.",
              }}
            />
          </p>
          <BotonImprimir />
        </section>
        <nav className="hg-tarjeta" aria-labelledby="indice">
          <h2 className="hg-tarjeta-titulo" id="indice">
            <T t={{ es: "Contenido", en: "Contents" }} />
          </h2>
          <ol className="hg-indice">
            {SECCIONES.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  {i + 1}. <T t={s.nombre} />
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <section className="hg-tarjeta" aria-labelledby="activos-del-informe">
          <h2 className="hg-tarjeta-titulo" id="activos-del-informe">
            <T t={{ es: "Activos", en: "Assets" }} />
          </h2>
          <dl className="hg-propiedades">
            {v.activos.map((a) => (
              <Par key={a.id} rotulo={a.nombre}>
                {a.conPlan ? (
                  <Link href={rutaDeActivo(a.id)}>
                    <Dato>{a.id}</Dato>
                  </Link>
                ) : (
                  <span>
                    <Dato>{a.id}</Dato>{" "}
                    <span className="hg-menor">
                      · <T t={{ es: "sin plan", en: "no plan" }} />
                    </span>
                  </span>
                )}
              </Par>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}
