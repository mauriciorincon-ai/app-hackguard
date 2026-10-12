import Link from "next/link";
import { RUTAS } from "@/lib/brecha/etiquetas";
import { EVIDENCIA_ORGANIZADA } from "@/lib/brecha/textos";
import type { AccionDeControl, VistaDeControl } from "@/lib/brecha/tipos";
import { Par } from "../activos/piezas";
import {
  Cifras,
  EvidenciaFechada,
  HallazgoBreve,
  SelectorDeControles,
  Veredicto,
  rotulo,
  rutaDeActivo,
  rutaDePlan,
  rutaDePrueba,
} from "../brecha/piezas";
import { Chip, Huella, Sello } from "../estado";
import { Eslabon, Plazo } from "../hallazgo/hallazgo-pantalla";
import { rutaDeHallazgo } from "../hallazgo/piezas";
import { Simbolo } from "../simbolo";
import { Dato, T } from "../texto";

/**
 * La pantalla `/brecha/control/<id>` (maqueta `docs/diseno/control-*.html`): un control con las pruebas que lo cubren, su
 * evidencia, la cadena hallazgo → corrección → re-prueba → cierre de cada hallazgo suyo y lo que falta. «Evidencia organizada»,
 * no aseguramiento. Componente de SERVIDOR: el estado del control y de cada fila salen del motor de la brecha.
 */

function Accion({ a }: { a: AccionDeControl }) {
  const boton = (ruta: string, texto: { es: string; en: string }) => (
    <Link className="hg-boton hg-boton-primario" href={ruta}>
      <T t={texto} />
    </Link>
  );
  switch (a.tipo) {
    case "hallazgo":
      return (
        <>
          <p>
            <T
              t={{
                es: `Corregir y re-probar ${a.hallazgo}. El control sigue con fallas hasta que una re-prueba superada se confirme.`,
                en: `Fix and retest ${a.hallazgo}. The control keeps its failures until a passed retest is confirmed.`,
              }}
            />
          </p>
          {boton(rutaDeHallazgo(a.hallazgo), {
            es: "Abrir el hallazgo",
            en: "Open the finding",
          })}
        </>
      );
    case "aceptado":
      return (
        <p>
          <T
            t={{
              es: "Sus fallas tienen el riesgo aceptado: se revisan en la fecha que cada una declara.",
              en: "Its failures have their risk accepted: each is reviewed on the date it declares.",
            }}
          />
        </p>
      );
    case "plan":
      return (
        <>
          <p>
            <T
              t={{
                es: "Volver a ejecutar sus pruebas: la evidencia que tiene ya no dice cómo está hoy.",
                en: "Run its tests again: the evidence it has no longer says how it stands today.",
              }}
            />
          </p>
          {boton(rutaDePlan(a.activo), {
            es: "Abrir el plan",
            en: "Open the plan",
          })}
        </>
      );
    case "catalogo":
      return (
        <>
          <p>
            <T
              t={{
                es: "Ninguna prueba de los planes lo cubre. Revisa en el catálogo cuáles lo harían y por qué quedaron fuera.",
                en: "No test in the plans covers it. Check in the catalog which ones would and why they were left out.",
              }}
            />
          </p>
          {boton("/catalogo", {
            es: "Abrir el catálogo",
            en: "Open the catalog",
          })}
        </>
      );
    case "carga":
      return (
        <>
          <p>
            <T
              t={{
                es: `Cargar la evidencia que falta: ${a.sinResultado} de ${a.total} pruebas sin resultado.`,
                en: `Load the missing evidence: ${a.sinResultado} of ${a.total} tests with no result.`,
              }}
            />
          </p>
          {boton(RUTAS.carga, {
            es: "Ir a la carga de evidencia",
            en: "Go to evidence intake",
          })}
        </>
      );
  }
}

export function ControlPantalla({ v }: { v: VistaDeControl }) {
  const firma = v.firma;
  return (
    <>
      <SelectorDeControles items={v.selector} />

      <div className="hg-cabecera">
        <div>
          <p className="hg-cabecera-linea">
            <Dato>{v.id}</Dato>
            <span className="hg-menor">
              <Dato>{v.norma}</Dato> · <T t={v.capa} />
            </span>
          </p>
          <h1>
            <T t={v.nombre} />
          </h1>
          <p className="hg-bajada">
            <T t={EVIDENCIA_ORGANIZADA} />
          </p>
        </div>
        <Cifras
          cifras={v.cifras}
          nombre={{ es: "Pruebas por estado", en: "Tests by status" }}
        />
      </div>

      <div className="hg-trabajo">
        <div className="hg-pila">
          <Sello
            etiqueta={v.sello.estado}
            atributos={{
              "data-control": v.id,
              "data-control-estado": v.sello.estadoId,
              "data-por-filas": "",
            }}
          >
            <p>
              <T t={v.sello.frase} />
            </p>
          </Sello>

          {v.pruebas.length > 0 ? (
            <section className="hg-panel" aria-labelledby="pruebas">
              <div className="hg-panel-cab">
                <h2 id="pruebas">
                  <T
                    t={{
                      es: "Pruebas que cubren este control",
                      en: "Tests that cover this control",
                    }}
                  />
                </h2>
                <p className="hg-menor">
                  <T
                    t={{
                      es: "Una fila por prueba planeada, con su último sobre de evidencia confirmado.",
                      en: "One row per planned test, with its latest confirmed evidence envelope.",
                    }}
                  />
                </p>
              </div>
              <table className="hg-tabla">
                <caption className="hg-oculto">
                  <T
                    t={{
                      es: "Pruebas que cubren este control",
                      en: "Tests that cover this control",
                    }}
                  />
                </caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <T t={{ es: "Prueba", en: "Test" }} />
                    </th>
                    <th scope="col">
                      <T t={{ es: "Qué verifica", en: "What it verifies" }} />
                    </th>
                    <th scope="col">
                      <T
                        t={{
                          es: "Último resultado y hallazgo",
                          en: "Latest result and finding",
                        }}
                      />
                    </th>
                    <th scope="col">
                      <T
                        t={{
                          es: "Evidencia y confirmación",
                          en: "Evidence and confirmation",
                        }}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {v.pruebas.map((f) => (
                    <tr
                      key={f.prueba.id}
                      data-de-control={v.id}
                      data-veredicto={f.veredictoId}
                    >
                      <td data-celda="id">
                        <Dato>{f.prueba.id}</Dato>
                      </td>
                      <td data-celda="principal">
                        <p>
                          <Link
                            className="hg-enlace-fila"
                            href={rutaDePrueba(f.prueba.id)}
                          >
                            <T t={f.prueba.nombre} />
                          </Link>
                        </p>
                        <p className="hg-menor">
                          <T t={f.activo} />
                        </p>
                      </td>
                      <td>
                        <p>
                          <Veredicto
                            id={f.veredictoId}
                            etiqueta={f.veredicto}
                          />
                        </p>
                        {f.conteo === null ? (
                          <p className="hg-menor">
                            <T
                              t={{
                                es: "Planeada, sin resultado todavía.",
                                en: "Planned, no result yet.",
                              }}
                            />
                          </p>
                        ) : (
                          <p className="hg-menor">
                            <T t={f.conteo} />
                          </p>
                        )}
                        {f.repruebaDe === null ? null : (
                          <p className="hg-menor">
                            <T t={{ es: "Re-prueba de", en: "Retest of" }} />{" "}
                            <Dato>{f.repruebaDe}</Dato>
                          </p>
                        )}
                        {f.hallazgo === null ? null : (
                          <>
                            <p>
                              <HallazgoBreve h={f.hallazgo.enlace} />
                            </p>
                            {f.hallazgo.plazo === null || f.sinPlazo ? (
                              <p className="hg-menor">
                                <T
                                  t={{
                                    es: "Riesgo aceptado: el plazo no corre.",
                                    en: "Accepted risk: the deadline is not running.",
                                  }}
                                />
                              </p>
                            ) : (
                              <Plazo p={f.hallazgo.plazo} />
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {f.sobre === null ? (
                          <p className="hg-menor">
                            <T
                              t={{
                                es: "Sin sobre de evidencia.",
                                en: "No evidence envelope.",
                              }}
                            />
                          </p>
                        ) : (
                          <>
                            <p>
                              <Dato>{f.sobre.id}</Dato>
                            </p>
                            <p>
                              <EvidenciaFechada e={f.sobre.evidencia} />
                            </p>
                            <p>
                              <Huella hex={f.sobre.huella} />
                            </p>
                            <p>
                              <span className={`hg-firma es-${firma.rol}`}>
                                <Simbolo nombre={firma.simbolo} />
                                <span>
                                  <T
                                    t={{ es: "Confirmada", en: "Confirmed" }}
                                  />{" "}
                                  ·{" "}
                                  <span data-neutro>
                                    {f.sobre.confirmadaEl}
                                  </span>
                                </span>
                              </span>
                            </p>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <section className="hg-panel" aria-labelledby="pruebas">
              <div className="hg-panel-cab">
                <h2 id="pruebas">
                  <T
                    t={{
                      es: "Pruebas del catálogo que lo cubren",
                      en: "Catalog tests that cover it",
                    }}
                  />
                </h2>
                <p className="hg-menor">
                  <T
                    t={{
                      es: "Existen, pero ningún plan las incluye: por eso el control no tiene evidencia.",
                      en: "They exist, but no plan includes them: that is why the control has no evidence.",
                    }}
                  />
                </p>
              </div>
              <div className="hg-panel-cuerpo">
                <ul className="hg-lista hg-lista-datos">
                  {v.delCatalogo.map((p) => (
                    <li key={p.id}>
                      <Dato>{p.id}</Dato>{" "}
                      <Link href={rutaDePrueba(p.id)}>
                        <T t={p.nombre} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {v.cadenas.length > 0 ? (
            <section className="hg-pila" aria-labelledby="cadenas">
              <h2 id="cadenas">
                <T
                  t={{
                    es: "Cadena de cierre de sus hallazgos",
                    en: "Closure chain of its findings",
                  }}
                />
              </h2>
              {v.cadenas.map(({ hallazgo: h, plazo, cadena }) => (
                <section
                  key={h.id}
                  className="hg-panel"
                  aria-labelledby={`cadena-${h.id}`}
                >
                  <div className="hg-panel-cab">
                    <div className="hg-panel-linea">
                      <Link href={rutaDeHallazgo(h.id)}>
                        <Dato>{h.id}</Dato>
                      </Link>
                      <h3 id={`cadena-${h.id}`}>
                        <T t={h.titulo} />
                      </h3>
                    </div>
                    <div className="hg-panel-linea">
                      <Chip etiqueta={h.severidad} />
                      {plazo === null ? null : <Plazo p={plazo} />}
                    </div>
                  </div>
                  <ol className="hg-cadena hg-cadena-horizontal">
                    {cadena.map((e, i) => (
                      <Eslabon key={i} e={e} />
                    ))}
                  </ol>
                </section>
              ))}
            </section>
          ) : null}
        </div>

        <aside
          className="hg-carril"
          aria-label={rotulo({
            es: `Acción y propiedades de ${v.id}`,
            en: `Action and properties of ${v.id}`,
          })}
        >
          <section
            className="hg-tarjeta hg-tarjeta-accion"
            aria-labelledby="accion"
          >
            <h2 className="hg-tarjeta-titulo" id="accion">
              <T t={{ es: "Lo que falta", en: "What is missing" }} />
            </h2>
            <Accion a={v.accion} />
          </section>
          <section className="hg-tarjeta" aria-labelledby="propiedades">
            <h2 className="hg-tarjeta-titulo" id="propiedades">
              <T t={{ es: "Propiedades", en: "Properties" }} />
            </h2>
            <dl className="hg-propiedades">
              <Par rotulo={{ es: "Área del Anexo A", en: "Annex A area" }}>
                <span>
                  <Dato>{v.propiedades.area.id}</Dato> ·{" "}
                  <T t={v.propiedades.area.nombre} />
                </span>
              </Par>
              <Par
                rotulo={{
                  es: "Pruebas en los planes",
                  en: "Tests in the plans",
                }}
              >
                <span>
                  {v.propiedades.pruebasEnPlanes > 0 ? (
                    <T
                      t={{
                        es: `${v.propiedades.pruebasEnPlanes} · ${v.propiedades.conResultado} con resultado`,
                        en: `${v.propiedades.pruebasEnPlanes} · ${v.propiedades.conResultado} with a result`,
                      }}
                    />
                  ) : (
                    <T t={{ es: "Ninguna", en: "None" }} />
                  )}
                </span>
              </Par>
              <Par rotulo={{ es: "Activos", en: "Assets" }}>
                {v.propiedades.activos.length === 0 ? (
                  <span>
                    <T t={{ es: "Ninguno", en: "None" }} />
                  </span>
                ) : (
                  v.propiedades.activos.map((a) => (
                    <span key={a.id}>
                      <Link href={rutaDeActivo(a.id)}>
                        <T t={a.nombre} />
                      </Link>
                    </span>
                  ))
                )}
              </Par>
              <Par
                rotulo={{ es: "Evidencia más reciente", en: "Latest evidence" }}
              >
                {v.propiedades.ultima === null ? (
                  <span>
                    <T t={{ es: "Ninguna", en: "None" }} />
                  </span>
                ) : (
                  <EvidenciaFechada e={v.propiedades.ultima} />
                )}
              </Par>
            </dl>
          </section>
          <section className="hg-tarjeta" aria-labelledby="equivalentes">
            <h2 className="hg-tarjeta-titulo" id="equivalentes">
              <T
                t={{ es: "Controles equivalentes", en: "Equivalent controls" }}
              />
            </h2>
            {v.equivalentes.length === 0 ? (
              <p className="hg-menor">
                <T
                  t={{
                    es: "El mapa cargado no trae equivalente para este control.",
                    en: "The loaded map has no equivalent for this control.",
                  }}
                />
              </p>
            ) : (
              v.equivalentes.map((e) => (
                <dl
                  className="hg-propiedades"
                  key={`${e.marco}-${e.referencia}`}
                >
                  <Par rotulo={{ es: "Control", en: "Control" }}>
                    <span>
                      <Dato>
                        {e.marco} · {e.referencia}
                      </Dato>
                    </span>
                  </Par>
                  <Par rotulo={{ es: "Fuente", en: "Source" }}>
                    <span>
                      <Dato>{e.fuente.sitio}</Dato>{" "}
                      <span className="hg-menor">
                        <T t={{ es: "consultada el", en: "consulted on" }} />{" "}
                        <Dato>{e.fuente.consultada}</Dato>
                      </span>
                    </span>
                  </Par>
                  {e.incompleto === null ? null : (
                    <Par
                      rotulo={{ es: "Alcance del mapa", en: "Map coverage" }}
                    >
                      <span>
                        <Chip etiqueta={e.incompleto.etiqueta} />
                      </span>
                      {e.incompleto.nota === null ? null : (
                        <span className="hg-menor">
                          <T t={e.incompleto.nota} />
                        </span>
                      )}
                    </Par>
                  )}
                </dl>
              ))
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
