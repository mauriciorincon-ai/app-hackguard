import Link from "next/link";
import { frasePorDias } from "@/lib/catalogo/etiquetas";
import type {
  AccionDeHallazgo,
  DetalleDeCvss,
  DetalleDeEscalaIa,
  EslabonDeCadena,
  LineaDeEslabon,
  VistaDePlazo,
  VistaDeHallazgo,
  VistaDeRevision,
} from "@/lib/evidencia/tipos";
import { Par } from "../activos/piezas";
import { Chip, Estado, Huella, Sello } from "../estado";
import { Simbolo } from "../simbolo";
import { Dato, T } from "../texto";
import { IdDeSobre, SelectorDeHallazgos } from "./piezas";

/**
 * La pantalla `/evidencia/hallazgos/<id>` (maqueta `docs/diseno/hallazgo-hz-*.html`). Componente de SERVIDOR. El hallazgo, su
 * severidad, su plazo y su cadena de cierre los calculó el motor: aquí solo se leen. «Qué puedes hacer» es de solo lectura:
 * cada salida dice lo que exige y el comando que la registra. Un hallazgo solo se cierra con una re-prueba válida.
 */

function Linea({ l }: { l: LineaDeEslabon }) {
  switch (l.tipo) {
    case "fecha":
      return (
        <p>
          <Dato>{l.valor}</Dato>
        </p>
      );
    case "texto":
      return (
        <p className={l.menor ? "hg-menor" : undefined}>
          <T t={l.texto} />
        </p>
      );
    case "sobre":
      return <IdDeSobre id={l.id} nota={l.nota} />;
    case "huella":
      return (
        <p>
          <Huella hex={l.hex} />
        </p>
      );
    case "firma":
      return (
        <p>
          <span className="hg-firma es-acento">
            <Simbolo nombre="firma" />
            <span>
              <T t={{ es: "Confirmada", en: "Confirmed" }} /> ·{" "}
              <span data-neutro>{l.fecha}</span>
            </span>
          </span>
        </p>
      );
    case "motivos":
      return (
        <ul className="hg-lista">
          {l.motivos.map((m) => (
            <li key={m.es}>
              <T t={m} />
            </li>
          ))}
        </ul>
      );
  }
}

export function Eslabon({ e }: { e: EslabonDeCadena }) {
  return (
    <li className={`hg-eslabon es-${e.pendiente ? "pendiente" : e.etiqueta.rol}`}>
      <Simbolo nombre={e.pendiente ? "vacio" : e.etiqueta.simbolo} />
      <span className="hg-eslabon-titulo">
        <T t={e.etiqueta.nombre} />
      </span>
      {e.lineas.map((l, i) => (
        <Linea key={i} l={l} />
      ))}
    </li>
  );
}

function SeveridadDeIa({ d }: { d: DetalleDeEscalaIa }) {
  return (
    <>
      <div className="hg-panel-cuerpo">
        <p className="hg-menor">
          <T t={d.nota} />
        </p>
        <div className="hg-matriz" data-nivel-de-tabla={d.nivel}>
          <table>
            <caption>
              <T
                t={{
                  es: "Prioridad de acción: impacto (filas) por frecuencia observada (columnas)",
                  en: "Action priority: impact (rows) by observed frequency (columns)",
                }}
              />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T t={{ es: "Impacto", en: "Impact" }} />
                </th>
                {d.columnas.map((c) => (
                  <th key={c.es} scope="col">
                    <T t={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.filas.map((f) => (
                <tr key={f.impacto}>
                  <th scope="row">
                    <span className="hg-cifra-menor" data-neutro>
                      {f.impacto}
                    </span>{" "}
                    <span className="hg-menor hg-matriz-ancla">
                      <T t={f.ancla} />
                    </span>
                    {f.limite === null ? null : (
                      <span className="hg-menor hg-limite hg-matriz-ancla">
                        <T t={f.limite} />
                      </span>
                    )}
                  </th>
                  {f.celdas.map((c, i) => (
                    <td
                      key={i}
                      className={c.esta ? "es-esta" : undefined}
                      data-esta-celda={c.esta ? "" : undefined}
                    >
                      <Estado etiqueta={c.etiqueta} />
                      {c.esta ? (
                        <span className="hg-menor">
                          <T t={{ es: "este hallazgo", en: "this finding" }} />
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="hg-matriz-leyenda hg-menor">
            {d.filas.map((f) => (
              <li key={f.impacto}>
                <strong data-neutro>{f.impacto}</strong> <T t={f.ancla} />.
                {f.limite === null ? null : (
                  <strong>
                    {" "}
                    <T t={f.limite} />.
                  </strong>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="hg-panel-cuerpo">
        <dl className="hg-propiedades hg-propiedades-en-columnas">
          <Par rotulo={{ es: "Impacto", en: "Impact" }}>
            <p>
              <strong data-neutro>{d.impacto.valor}</strong>{" "}
              <span className="hg-menor">
                <T
                  t={{ es: `de ${d.impacto.de}`, en: `of ${d.impacto.de}` }}
                />
              </span>
            </p>
            <p className="hg-menor">
              <T t={d.impacto.descripcion} />
            </p>
          </Par>
          <Par rotulo={{ es: "Frecuencia observada", en: "Observed frequency" }}>
            <p>
              <strong data-neutro>{d.frecuencia.porCiento} %</strong>
            </p>
            <p className="hg-menor">
              {d.frecuencia.deConteo ? (
                <>
                  <span lang="es">
                    <span data-neutro>{d.frecuencia.fallidas}</span> de{" "}
                    <span data-neutro>{d.frecuencia.evaluadas}</span> en el
                    sobre <Dato>{d.frecuencia.sobre}</Dato>. No es una opinión:
                    sale de la evidencia.
                  </span>
                  <span lang="en">
                    <span data-neutro>{d.frecuencia.fallidas}</span> of{" "}
                    <span data-neutro>{d.frecuencia.evaluadas}</span> in
                    envelope <Dato>{d.frecuencia.sobre}</Dato>. It is not an
                    opinion: it comes from the evidence.
                  </span>
                </>
              ) : (
                <>
                  <span lang="es">
                    El sobre <Dato>{d.frecuencia.sobre}</Dato> no trae conteo:
                    una comprobación que falla, falla en su única medición.
                  </span>
                  <span lang="en">
                    Envelope <Dato>{d.frecuencia.sobre}</Dato> carries no
                    count: a check that fails fails in its only measurement.
                  </span>
                </>
              )}
            </p>
          </Par>
          <Par rotulo={{ es: "Alcance", en: "Reach" }}>
            <p>
              <T t={d.alcance} />
            </p>
          </Par>
          <Par rotulo={{ es: "Detectabilidad", en: "Detectability" }}>
            <p>
              <T t={d.detectabilidad} />
            </p>
            <p className="hg-menor">
              <T
                t={{
                  es: "Alcance y detectabilidad no cambian el nivel: ordenan los hallazgos de un mismo nivel.",
                  en: "Reach and detectability do not change the level: they order findings within the same level.",
                }}
              />
            </p>
          </Par>
        </dl>
      </div>
    </>
  );
}

function SeveridadCvss({ d }: { d: DetalleDeCvss }) {
  const [repo, commit] = d.referencia.split("@");
  return (
    <div className="hg-panel-cuerpo">
      <p className="hg-menor">
        <T
          t={{
            es: "Para software se usa CVSS 4.0, con el vector completo guardado y el puntaje calculado por la referencia oficial.",
            en: "Software uses CVSS 4.0, with the full vector stored and the score computed by the official reference.",
          }}
        />
      </p>
      <div className="hg-puntaje">
        <span className="hg-cifra" data-neutro>
          {d.puntaje}
        </span>
        <span>
          <Estado etiqueta={d.etiquetaDelVector} />
        </span>
      </div>
      <dl className="hg-propiedades">
        <Par rotulo={{ es: "Vector", en: "Vector" }}>
          <span className="hg-dato hg-vector" data-neutro>
            {d.vector.split("/").flatMap((parte, i) => [
              i > 0 ? "/" : null,
              i > 0 ? <wbr key={`w${i}`} /> : null,
              parte,
            ])}
          </span>
        </Par>
        <Par rotulo={{ es: "Métricas base", en: "Base metrics" }}>
          <ul className="hg-metricas">
            {d.metricas.map((m) => (
              <li key={m.clave}>
                <Dato>{`${m.clave}:${m.valor}`}</Dato>
                <span>
                  <T t={m.metrica} />
                  {m.nombreDelValor === null ? null : (
                    <>
                      : <T t={m.nombreDelValor} />
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Par>
        <Par rotulo={{ es: "Cómo se calculó", en: "How it was computed" }}>
          <p className="hg-menor">
            <T t={{ es: "Referencia fijada:", en: "Pinned reference:" }} />{" "}
            <span className="hg-dato hg-vector" data-neutro>
              {repo}
              <wbr />@{commit}
            </span>
          </p>
          <p className="hg-menor">
            <T
              t={{
                es: "Un vector incompleto se rechaza, no se completa solo.",
                en: "An incomplete vector is rejected, not completed automatically.",
              }}
            />
          </p>
        </Par>
      </dl>
    </div>
  );
}

export function Plazo({ p }: { p: VistaDePlazo }) {
  if (p.corre)
    return (
      <span
        data-fechado="plazo"
        data-desde={p.apertura}
        data-plazo={p.total}
        data-severidad={p.severidad}
        data-dias={p.dias}
        data-atraso={p.atraso}
        data-estado-fechado={p.estadoId}
      >
        <Estado etiqueta={p.etiqueta} />{" "}
        <span className="hg-menor">
          <T
            t={{
              es: `Plazo de ${p.total} días:`,
              en: `${p.total}-day deadline:`,
            }}
          />{" "}
          <span data-frase-plazo>
            <T t={p.frase} />
          </span>
        </span>
      </span>
    );
  const texto = {
    sin_plazo: {
      es: "Esta severidad no tiene plazo.",
      en: "This severity has no deadline.",
    },
    riesgo_aceptado: {
      es: "Suspendido mientras el riesgo esté aceptado.",
      en: "Suspended while the risk is accepted.",
    },
    cerrado: {
      es: "Ya no corre: el hallazgo está cerrado.",
      en: "No longer running: the finding is closed.",
    },
  }[p.razon];
  return (
    <span>
      <Estado etiqueta={p.etiqueta} />{" "}
      <span className="hg-menor">
        <T t={texto} />
      </span>
    </span>
  );
}

export function Revision({ r }: { r: VistaDeRevision }) {
  return (
    <span
      data-fechado="revision"
      data-desde={r.aceptadoEn}
      data-plazo={r.total}
      data-dias={r.dias}
      data-estado-fechado={r.estadoId === "toca_revisar" ? "toca_revisar" : "vigente"}
    >
      <Estado etiqueta={r.etiqueta} />{" "}
      <span className="hg-menor">
        <T t={{ es: "Aceptado", en: "Accepted" }} />{" "}
        <span data-frase-dias>
          <T t={frasePorDias(r.dias)} />
        </span>
        , <T t={{ es: "se revisa el", en: "to be reviewed on" }} />{" "}
        <Dato>{r.fecha}</Dato>
      </span>
    </span>
  );
}

function Accion({ a }: { a: AccionDeHallazgo }) {
  return (
    <li className="hg-junto">
      <strong>
        <T t={a.nombre} />
      </strong>
      <p className="hg-menor">
        <T t={a.consecuencia} />
      </p>
      <p>
        <span className="hg-dato hg-vector" data-neutro>
          {a.comando}
        </span>
      </p>
    </li>
  );
}

export function HallazgoPantalla({ v }: { v: VistaDeHallazgo }) {
  const escala =
    v.escala.tipo === "cvss" ? (
      <span data-neutro>{`CVSS 4.0 · ${v.escala.puntaje}`}</span>
    ) : (
      <T t={{ es: "escala de IA", en: "AI scale" }} />
    );
  const p = v.propiedades;
  return (
    <div
      className="hg-pila"
      data-hallazgo={v.id}
      data-estado-hallazgo={v.estadoId}
    >
      <SelectorDeHallazgos items={v.selector} />
      <div className="hg-cabecera">
        <div>
          <p className="hg-cabecera-linea">
            <Dato>{v.id}</Dato>
            <Chip etiqueta={v.estado} />
            <span data-severidad-declarada>
              <Chip etiqueta={v.nivel} />
            </span>
            <span className="hg-menor">{escala}</span>
          </p>
          <h1>
            <T t={v.titulo} />
          </h1>
          <p className="hg-bajada">
            <T t={v.descripcion} />
          </p>
        </div>
      </div>

      {v.avisos.plazoVencido === null ? null : (
        <Sello
          etiqueta={v.avisos.plazoVencido.etiqueta}
          atributos={{ "data-aviso-de-plazo": "vencido" }}
        >
          <p>
            <T
              t={{
                es: `Un hallazgo de severidad «${v.avisos.plazoVencido.nivel.es}» tiene ${v.avisos.plazoVencido.total} días. Registra la corrección y re-prueba, o decide un cierre alternativo con su justificación.`,
                en: `A finding of “${v.avisos.plazoVencido.nivel.en}” severity has ${v.avisos.plazoVencido.total} days. Record the fix and retest, or decide an alternative closure with its justification.`,
              }}
            />
          </p>
        </Sello>
      )}
      {v.avisos.revisionVencida === null ? null : (
        <Sello
          etiqueta={v.avisos.revisionVencida.etiqueta}
          atributos={{ "data-aviso-de-revision": "" }}
        >
          <p>
            <T
              t={{
                es: `Se aceptó con revisión a los ${v.avisos.revisionVencida.dias} días y ya pasaron. Decide de nuevo: si sigue siendo aceptable, acéptalo otra vez con una justificación nueva; si no, corrígelo.`,
                en: `It was accepted with a review at ${v.avisos.revisionVencida.dias} days and they have passed. Decide again: if it is still acceptable, accept it again with a new justification; if not, fix it.`,
              }}
            />
          </p>
        </Sello>
      )}

      <section className="hg-panel" aria-labelledby="cadena">
        <div className="hg-panel-cab">
          <h2 id="cadena">
            <T t={{ es: "Cadena de cierre", en: "Closure chain" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "Solo se cierra con una re-prueba superada y confirmada. Que no aparezca en un escaneo posterior no lo cierra.",
                en: "It only closes with a passed, confirmed retest. Not showing up in a later scan does not close it.",
              }}
            />
          </p>
        </div>
        <ol className="hg-cadena hg-cadena-horizontal">
          {v.cadena.map((e, i) => (
            <Eslabon key={i} e={e} />
          ))}
        </ol>
      </section>

      <div className="hg-trabajo">
        <div className="hg-pila">
          <section className="hg-panel" aria-labelledby="severidad">
            <div className="hg-panel-cab">
              <h2 id="severidad">
                <T t={{ es: "Severidad", en: "Severity" }} />
              </h2>
              <Chip etiqueta={v.nivel} />
            </div>
            {v.severidad.tipo === "cvss" ? (
              <SeveridadCvss d={v.severidad} />
            ) : (
              <SeveridadDeIa d={v.severidad} />
            )}
          </section>

          <section className="hg-panel" aria-labelledby="control">
            <div className="hg-panel-cab">
              <h2 id="control">
                <T t={{ es: "Qué control falla", en: "Which control fails" }} />
              </h2>
              <p className="hg-menor">
                <T
                  t={{
                    es: "Un hallazgo es evidencia de que un control no está funcionando.",
                    en: "A finding is evidence that a control is not working.",
                  }}
                />
              </p>
            </div>
            <div className="hg-panel-cuerpo">
              {v.control.controles.length > 0 ? (
                v.control.controles.map((c) => (
                  <div key={c.id} className="hg-junto">
                    <p>
                      <Dato>{c.id}</Dato>
                    </p>
                    <p>
                      <strong>
                        <T t={c.nombre} />
                      </strong>
                    </p>
                  </div>
                ))
              ) : (
                <div className="hg-junto">
                  <p>
                    <Chip etiqueta={v.control.sinControl} />
                  </p>
                  <p className="hg-menor">
                    <T
                      t={{
                        es: "La prueba todavía no da evidencia a ningún control: el hallazgo cuenta para el activo, pero no para la vista por control.",
                        en: "The test does not yet give evidence to any control: the finding counts for the asset, but not for the control view.",
                      }}
                    />
                  </p>
                </div>
              )}
              <div className="hg-contraste">
                <div>
                  <p className="hg-rotulo">
                    <T t={{ es: "Lo que se esperaba", en: "What was expected" }} />
                  </p>
                  <p>
                    <T t={v.control.esperado} />
                  </p>
                </div>
                <div>
                  <p className="hg-rotulo">
                    <T t={{ es: "Lo que se obtuvo", en: "What was obtained" }} />
                  </p>
                  <p>
                    <Chip etiqueta={v.control.obtenido.veredicto} />
                  </p>
                  <p>
                    <T t={v.control.obtenido.conteo} />
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="hg-carril" aria-labelledby="rotulo-carril">
          <p id="rotulo-carril" className="hg-oculto">
            <T
              t={{
                es: `Acciones y propiedades de ${v.id}`,
                en: `Actions and properties of ${v.id}`,
              }}
            />
          </p>
          <section
            className="hg-tarjeta hg-tarjeta-accion"
            aria-labelledby="acciones"
          >
            <h2 className="hg-tarjeta-titulo" id="acciones">
              <T t={{ es: "Qué puedes hacer", en: "What you can do" }} />
            </h2>
            {v.acciones.nada !== null ? (
              <p className="hg-menor">
                <T t={v.acciones.nada} />
              </p>
            ) : (
              <div className="hg-pila" data-solo-lectura="">
                <p className="hg-menor">
                  <T
                    t={{
                      es: "Esta pantalla solo se lee: cada salida se registra con su comando, con tu nombre y la fecha.",
                      en: "This screen is read-only: each outcome is recorded with its command, with your name and the date.",
                    }}
                  />
                </p>
                <ul className="hg-pila hg-lista-datos">
                  {v.acciones.lista.map((a) => (
                    <Accion key={a.id} a={a} />
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section className="hg-tarjeta" aria-labelledby="propiedades">
            <h2 className="hg-tarjeta-titulo" id="propiedades">
              <T t={{ es: "Propiedades", en: "Properties" }} />
            </h2>
            <dl className="hg-propiedades">
              <Par rotulo={{ es: "Plazo", en: "Deadline" }}>
                <Plazo p={p.plazo} />
              </Par>
              {p.revision === null ? null : (
                <Par rotulo={{ es: "Revisión del riesgo", en: "Risk review" }}>
                  <Revision r={p.revision} />
                </Par>
              )}
              <Par rotulo={{ es: "Abierto", en: "Opened" }}>
                <Dato>{p.abierto}</Dato>
              </Par>
              <Par rotulo={{ es: "Activo", en: "Asset" }}>
                <Link href={`/activos/${p.activo.id}`}>
                  <T t={p.activo.nombre} />
                </Link>
              </Par>
              <Par rotulo={{ es: "Prueba", en: "Test" }}>
                <span>
                  <Link href={`/catalogo/${p.prueba.id}`}>
                    <T t={p.prueba.nombre} />
                  </Link>
                </span>
                <span>
                  <Dato>{p.prueba.id}</Dato>{" "}
                  <span className="hg-menor">
                    · <T t={p.prueba.familia} />
                  </span>
                </span>
              </Par>
              <Par rotulo={{ es: "Severidad", en: "Severity" }}>
                <span>
                  <Estado etiqueta={v.nivel} />{" "}
                  <span className="hg-menor">· {escala}</span>
                </span>
              </Par>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
