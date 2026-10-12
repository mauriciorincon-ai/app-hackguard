import Link from "next/link";
import { RUTAS } from "@/lib/brecha/etiquetas";
import type { VistaDeTablero } from "@/lib/brecha/tipos";
import {
  Cifras,
  Ejecutadas,
  HallazgoBreve,
  TablaDeAlertas,
  rotulo,
  rutaDeActivo,
} from "../brecha/piezas";
import { Aviso, Chip, Estado, Sello } from "../estado";
import { Plazo } from "../hallazgo/hallazgo-pantalla";
import { rutaDeHallazgo } from "../hallazgo/piezas";
import { Dato, T } from "../texto";
import { Revelador } from "./revelador";

/**
 * La pantalla `/tablero` (maqueta `docs/diseno/tablero.html`): la portada de la aplicación. Lo que pide tu atención hoy, cómo
 * va cada activo y las tres cuentas (hallazgos, controles, catálogo), con la banda de la validación del instrumento arriba.
 * Componente de SERVIDOR: todo sale de la misma brecha que las otras cuatro pantallas, así que dicen las mismas cifras.
 */

function Cuentas({
  filas,
  nombre,
}: {
  filas: {
    clave: string;
    marca: React.ReactNode;
    n: number;
    atributos?: Record<string, string>;
  }[];
  nombre: { es: string; en: string };
}) {
  return (
    <ul className="hg-cuentas" aria-label={rotulo(nombre)}>
      {filas.map((f) => (
        <li key={f.clave} {...f.atributos}>
          {f.marca}
          <span className="hg-cifra-menor" data-neutro>
            {f.n}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TableroPantalla({ v }: { v: VistaDeTablero }) {
  const val = v.validacion;
  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Tablero", en: "Dashboard" }} />
          </h1>
          <p className="hg-bajada">
            <T
              t={{
                es: "Lo que pide tu atención hoy y cómo va cada activo. Solo cuenta lo que confirmó una persona.",
                en: "What needs your attention today and how each asset is doing. Only what a person confirmed counts.",
              }}
            />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Consulta del", en: "Queried on" }} />{" "}
              <Dato>{v.consulta}</Dato>
            </span>
            <span>
              <T t={{ es: "Instantánea", en: "Snapshot" }} />{" "}
              <Dato>{v.instantanea}</Dato>
            </span>
          </p>
        </div>
        <Cifras
          cifras={v.cifras}
          nombre={{ es: "Lo que espera acción", en: "What awaits action" }}
        />
      </div>

      {v.activos.length === 0 ? (
        <Aviso
          etiqueta={v.vacio}
          titulo={{
            es: "Todavía no hay nada que vigilar",
            en: "There is nothing to watch yet",
          }}
        >
          <p>
            <T
              t={{
                es: "Registra tu primer activo con su dueño, su alcance autorizado y sus reglas de enfrentamiento. Desde ahí, el tablero te dirá qué falta.",
                en: "Register your first asset with its owner, its authorized scope and its rules of engagement. From there, the dashboard will tell you what is missing.",
              }}
            />
          </p>
        </Aviso>
      ) : (
        <div className="hg-pila">
          <Sello
            etiqueta={val.sello}
            atributos={{ "data-validacion": val.verde ? "verde" : "rojo" }}
          >
            <p>
              <T
                t={{
                  es: `${val.verdes} de ${val.total} comprobaciones en verde con la instantánea ${v.instantanea}. Corre antes de publicar cualquier cosa; si una falla, no se publica nada.`,
                  en: `${val.verdes} of ${val.total} checks green with snapshot ${v.instantanea}. It runs before anything is published; if one fails, nothing is published.`,
                }}
              />
            </p>
            <Revelador
              rotulo={{ es: "Ver las comprobaciones", en: "See the checks" }}
            >
              <table className="hg-tabla">
                <caption className="hg-oculto">
                  <T
                    t={{
                      es: "Comprobaciones de la validación del instrumento",
                      en: "Instrument validation checks",
                    }}
                  />
                </caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <T t={{ es: "Requisito", en: "Requirement" }} />
                    </th>
                    <th scope="col">
                      <T
                        t={{
                          es: "Qué se sembró y qué se obtuvo",
                          en: "What was seeded and what was obtained",
                        }}
                      />
                    </th>
                    <th scope="col">
                      <T t={{ es: "Resultado", en: "Result" }} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {val.comprobaciones.map((c) => (
                    <tr
                      key={c.requisito}
                      data-comprobacion={c.requisito}
                      data-pasa={String(c.pasa)}
                    >
                      <td data-celda="id">
                        <Dato>{c.requisito}</Dato>
                      </td>
                      <td data-celda="principal">
                        <p>
                          <strong>
                            <T t={c.nombre} />
                          </strong>
                        </p>
                        <p className="hg-menor">
                          <T
                            t={{
                              es: "Semillas que el motor respondió como se esperaba:",
                              en: "Seeds the engine answered as expected:",
                            }}
                          />{" "}
                          <span className="hg-dato" data-neutro>
                            {c.obtenidas} / {c.sembradas}
                          </span>
                        </p>
                      </td>
                      <td data-celda="estado">
                        {c.pasa ? (
                          <Estado etiqueta={c.estado} />
                        ) : (
                          <Chip etiqueta={c.estado} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Revelador>
          </Sello>

          <div className="hg-tablero">
            <div className="hg-pila">
              <section className="hg-panel" aria-labelledby="atencion">
                <div className="hg-panel-cab">
                  <h2 id="atencion">
                    <T
                      t={{ es: "Pide tu atención", en: "Needs your attention" }}
                    />
                  </h2>
                  <p className="hg-menor">
                    <T
                      t={{
                        es: "Lo más urgente primero.",
                        en: "Most urgent first.",
                      }}
                    />
                  </p>
                </div>
                <TablaDeAlertas
                  filas={v.atencion}
                  titulo={{
                    es: "Lo que pide tu atención",
                    en: "What needs your attention",
                  }}
                />
                <p className="hg-panel-pie" data-bandeja="sin-construir">
                  <Estado etiqueta={v.bandeja} />{" "}
                  <T
                    t={{
                      es: "La bandeja de propuestas todavía no existe: llega con el investigador y el extractor, y nada espera tu decisión.",
                      en: "The proposals inbox does not exist yet: it arrives with the researcher and the extractor, and nothing awaits your decision.",
                    }}
                  />
                </p>
              </section>

              <section className="hg-panel" aria-labelledby="activos">
                <div className="hg-panel-cab">
                  <h2 id="activos">
                    <T t={{ es: "Activos", en: "Assets" }} />
                  </h2>
                  <p className="hg-menor">
                    <Link href={RUTAS.brecha}>
                      <T t={{ es: "Ver la brecha", en: "See the gap" }} />
                    </Link>
                  </p>
                </div>
                <table className="hg-tabla">
                  <caption className="hg-oculto">
                    <T t={{ es: "Activos", en: "Assets" }} />
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
                        <T
                          t={{
                            es: "Hallazgos sin cerrar",
                            en: "Open findings",
                          }}
                        />
                      </th>
                      <th scope="col">
                        <T t={{ es: "Estado", en: "Status" }} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.activos.map((a) => (
                      <tr
                        key={a.id}
                        data-cobertura="activo"
                        data-planeadas={a.totales?.planeadas}
                        data-ejecutadas={a.totales?.ejecutadas}
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
                            {a.familias.map((f, i) => (
                              <span key={f.es}>
                                {i > 0 ? " · " : null}
                                <T t={f} />
                              </span>
                            ))}
                          </p>
                        </td>
                        <td data-celda="resultado">
                          {a.totales === null ? (
                            <p className="hg-menor">
                              <T
                                t={{
                                  es: "Sin alcance autorizado no hay plan.",
                                  en: "Without an authorized scope there is no plan.",
                                }}
                              />
                            </p>
                          ) : (
                            <Ejecutadas totales={a.totales} />
                          )}
                        </td>
                        <td>
                          {a.hallazgos.length === 0 ? (
                            <p className="hg-menor">
                              <T
                                t={{
                                  es: "Ninguno sin cerrar",
                                  en: "None open",
                                }}
                              />
                            </p>
                          ) : (
                            a.hallazgos.map((h) => (
                              <p key={h.id}>
                                <HallazgoBreve h={h} />
                              </p>
                            ))
                          )}
                        </td>
                        <td data-celda="estado">
                          {a.totales === null ? (
                            <Chip etiqueta={a.estado} />
                          ) : (
                            <Estado etiqueta={a.estado} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>

            <div className="hg-pila">
              <section className="hg-panel" aria-labelledby="hallazgos">
                <div className="hg-panel-cab">
                  <h2 id="hallazgos">
                    <T
                      t={{ es: "Hallazgos sin cerrar", en: "Open findings" }}
                    />
                  </h2>
                </div>
                <div className="hg-panel-cuerpo">
                  <Cuentas
                    nombre={{
                      es: "Hallazgos sin cerrar por severidad",
                      en: "Open findings by severity",
                    }}
                    filas={v.severidades.map((s) => ({
                      clave: s.id,
                      marca: <Estado etiqueta={s.etiqueta} />,
                      n: s.n,
                      atributos: { "data-severidad-cuenta": s.id },
                    }))}
                  />
                  <ul className="hg-abiertos">
                    {v.abiertos.map(({ hallazgo: h, plazo }) => (
                      <li key={h.id}>
                        <p>
                          <Link href={rutaDeHallazgo(h.id)}>
                            <Dato>{h.id}</Dato>
                          </Link>{" "}
                          <Chip etiqueta={h.estado} />
                        </p>
                        <p>
                          <T t={h.titulo} />
                        </p>
                        <Plazo p={plazo} />
                      </li>
                    ))}
                  </ul>
                  {v.aceptados > 0 ? (
                    <p className="hg-menor">
                      <T
                        t={{
                          es: `Además, ${v.aceptados} con el riesgo aceptado: no ${v.aceptados === 1 ? "está cerrado, pero no pide" : "están cerrados, pero no piden"} trabajo; se ${v.aceptados === 1 ? "revisa" : "revisan"} en su fecha.`,
                          en: `Also, ${v.aceptados} with the risk accepted: not closed, but asking for no work; ${v.aceptados === 1 ? "it is" : "they are"} reviewed on ${v.aceptados === 1 ? "its" : "their"} date.`,
                        }}
                      />
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="hg-panel" aria-labelledby="por-control">
                <div className="hg-panel-cab">
                  <h2 id="por-control">
                    <T t={{ es: "Controles", en: "Controls" }} />
                  </h2>
                  <p className="hg-menor">
                    <Link href={RUTAS.controles}>
                      <T t={{ es: "Vista por control", en: "Control view" }} />
                    </Link>
                  </p>
                </div>
                <div className="hg-panel-cuerpo">
                  <Cuentas
                    nombre={{
                      es: "Controles por estado",
                      en: "Controls by status",
                    }}
                    filas={v.controles.map((c) => ({
                      clave: c.id,
                      marca: <Estado etiqueta={c.etiqueta} />,
                      n: c.n,
                    }))}
                  />
                </div>
              </section>

              <section className="hg-panel" aria-labelledby="del-catalogo">
                <div className="hg-panel-cab">
                  <h2 id="del-catalogo">
                    <T t={{ es: "Catálogo", en: "Catalog" }} />
                  </h2>
                  <p className="hg-menor">
                    <Link href="/catalogo">
                      <T
                        t={{
                          es: `${v.catalogo.total} pruebas`,
                          en: `${v.catalogo.total} tests`,
                        }}
                      />
                    </Link>
                  </p>
                </div>
                <div className="hg-panel-cuerpo">
                  <Cuentas
                    nombre={{
                      es: "Pruebas del catálogo por vigencia",
                      en: "Catalog tests by freshness",
                    }}
                    filas={v.catalogo.filas.map((f, i) => ({
                      clave: String(i),
                      marca: <Estado etiqueta={f.etiqueta} />,
                      n: f.n,
                    }))}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
