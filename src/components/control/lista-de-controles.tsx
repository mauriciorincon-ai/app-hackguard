import Link from "next/link";
import { rutaDeControl } from "@/lib/brecha/etiquetas";
import { EVIDENCIA_ORGANIZADA } from "@/lib/brecha/textos";
import type { VistaDeControles } from "@/lib/brecha/tipos";
import {
  Cifras,
  Desglose,
  Ejecutadas,
  EstadoDeControlMarca,
  EvidenciaFechada,
  HallazgoBreve,
  Veredicto,
  rutaDePrueba,
} from "../brecha/piezas";
import { Aviso } from "../estado";
import { Dato, T } from "../texto";

/**
 * La pantalla `/brecha/control` (maqueta `docs/diseno/control.html`): la vista por control, «evidencia organizada» separada del
 * nivel de aseguramiento (E-16). Para cada control aplicable, sus pruebas, su evidencia más reciente, sus fallas abiertas y su
 * estado; cada control abre su página. Componente de SERVIDOR: sale de la misma brecha que el resto.
 */
export function ListaDeControles({ v }: { v: VistaDeControles }) {
  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Vista por control", en: "Control view" }} />
          </h1>
          <p className="hg-bajada">
            <T t={EVIDENCIA_ORGANIZADA} />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <Dato>{v.norma}</Dato> · <T t={v.capa} />
            </span>
            <span>
              <T
                t={{
                  es: `${v.controles.length} controles aplicables a los planes`,
                  en: `${v.controles.length} controls applicable to the plans`,
                }}
              />
            </span>
            <span>
              <T t={{ es: "Consulta del", en: "Queried on" }} />{" "}
              <Dato>{v.consulta}</Dato>
            </span>
          </p>
        </div>
        <Cifras
          cifras={v.cifras}
          nombre={{ es: "Controles por estado", en: "Controls by status" }}
        />
      </div>

      {v.controles.length === 0 ? (
        <Aviso
          etiqueta={v.vacio}
          titulo={{
            es: "Ningún control es aplicable todavía",
            en: "No control applies yet",
          }}
        >
          <p>
            <T
              t={{
                es: "Un control se vuelve aplicable cuando un plan incluye una prueba que lo cubre. Emite el plan de un activo para empezar a reunir evidencia.",
                en: "A control becomes applicable when a plan includes a test that covers it. Issue an asset's plan to start gathering evidence.",
              }}
            />
          </p>
        </Aviso>
      ) : (
        <div className="hg-pila">
          <section className="hg-panel" aria-labelledby="controles">
            <div className="hg-panel-cab">
              <h2 id="controles">
                <T
                  t={{ es: "Controles aplicables", en: "Applicable controls" }}
                />
              </h2>
              <p className="hg-menor">
                <T
                  t={{
                    es: "Los que cubre alguna prueba planeada y los que se quedaron sin prueba en los planes.",
                    en: "Those covered by some planned test and those left with no test in the plans.",
                  }}
                />
              </p>
            </div>
            <table className="hg-tabla">
              <caption className="hg-oculto">
                <T
                  t={{ es: "Controles aplicables", en: "Applicable controls" }}
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
                    <T t={{ es: "Pruebas del plan", en: "Plan tests" }} />
                  </th>
                  <th scope="col">
                    <T
                      t={{
                        es: "Evidencia y fallas",
                        en: "Evidence and failures",
                      }}
                    />
                  </th>
                  <th scope="col">
                    <T t={{ es: "Estado", en: "Status" }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {v.controles.map((c) => (
                  <tr key={c.id} data-fila-de-lista={c.id}>
                    <td data-celda="id">
                      <Dato>{c.id}</Dato>
                    </td>
                    <td data-celda="principal">
                      <p>
                        <Link
                          className="hg-enlace-fila"
                          href={rutaDeControl(c.id)}
                        >
                          <T t={c.nombre} />
                        </Link>
                      </p>
                      <p className="hg-menor">
                        <Dato>{c.area.id}</Dato> · <T t={c.area.nombre} />
                      </p>
                    </td>
                    <td data-celda="resultado">
                      {c.totales.planeadas > 0 ? (
                        <>
                          <Ejecutadas totales={c.totales} />
                          <Desglose totales={c.totales} marcas={v.veredictos} />
                        </>
                      ) : (
                        <p className="hg-menor">
                          <T
                            t={{
                              es: "Ninguna en el plan: las que lo cubren quedaron fuera.",
                              en: "None in the plan: the ones that cover it were left out.",
                            }}
                          />
                        </p>
                      )}
                    </td>
                    <td>
                      {c.ultima === null ? (
                        <p className="hg-menor">
                          <T
                            t={{
                              es: "Sin evidencia confirmada.",
                              en: "No confirmed evidence.",
                            }}
                          />
                        </p>
                      ) : (
                        <p>
                          <EvidenciaFechada e={c.ultima} />
                        </p>
                      )}
                      {c.fallas.length > 0 ? (
                        c.fallas.map((h) => (
                          <p key={h.id}>
                            <HallazgoBreve h={h} />
                          </p>
                        ))
                      ) : (
                        <p className="hg-menor">
                          <T
                            t={{
                              es: "Ninguna falla abierta.",
                              en: "No open failure.",
                            }}
                          />
                        </p>
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
          </section>

          <section className="hg-panel" aria-labelledby="sin-control">
            <div className="hg-panel-cab">
              <h2 id="sin-control">
                <T
                  t={{
                    es: "Pruebas del plan sin control",
                    en: "Plan tests with no control",
                  }}
                />
              </h2>
              <p className="hg-menor">
                <T
                  t={{
                    es: "Están en el plan por su marco, pero no dan evidencia a ningún control. No se esconden: esta es su cuenta.",
                    en: "They are in the plan because of their framework, but give evidence to no control. They are not hidden: this is their tally.",
                  }}
                />
              </p>
            </div>
            <table className="hg-tabla">
              <caption className="hg-oculto">
                <T
                  t={{
                    es: "Pruebas del plan sin control",
                    en: "Plan tests with no control",
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
                    <T t={{ es: "Último veredicto", en: "Latest verdict" }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {v.sinControl.map((p) => (
                  <tr key={p.id}>
                    <td data-celda="id">
                      <Dato>{p.id}</Dato>
                    </td>
                    <td data-celda="principal">
                      <p>
                        <Link
                          className="hg-enlace-fila"
                          href={rutaDePrueba(p.id)}
                        >
                          <T t={p.nombre} />
                        </Link>
                      </p>
                      <p className="hg-menor">
                        <T t={p.activo} /> · <T t={p.familia} />
                      </p>
                    </td>
                    <td data-celda="estado">
                      <Veredicto id={p.veredictoId} etiqueta={p.veredicto} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </>
  );
}
