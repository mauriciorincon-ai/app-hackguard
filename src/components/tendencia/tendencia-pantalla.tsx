import Link from "next/link";
import { RUTAS, rutaDeControl } from "@/lib/brecha/etiquetas";
import type {
  FilaDeControlEnElTiempo,
  VistaDeTendencia,
} from "@/lib/brecha/tipos";
import { Cifras, HallazgoBreve } from "../brecha/piezas";
import { Cabeceras } from "../cabeceras";
import { Aviso, Chip, Estado, Huella } from "../estado";
import { Dato, T } from "../texto";

/**
 * La pantalla `/brecha/tendencia`. Componente de SERVIDOR: la misma brecha en varias fechas de corte y, control por control de
 * ISO/IEC 42001, lo que mejoró, lo que empeoró y el hallazgo que lo movió. Un hallazgo reabierto es una regresión del control.
 * Está armada con las piezas de la consola (panel, tabla, estado, huella): sin estilos nuevos. Nada se calcula aquí.
 */

const COLUMNAS_CONTROLES = [
  { es: "Control", en: "Control" },
  { es: "Cambio", en: "Change" },
  { es: "Primer corte", en: "First cut-off" },
  { es: "Último corte", en: "Last cut-off" },
  { es: "Lo que lo movió", en: "What moved it" },
];
const COLUMNAS_SERIE = [
  { es: "Corte", en: "Cut-off" },
  { es: "Abiertos", en: "Open" },
  { es: "Reabiertos", en: "Reopened" },
  { es: "Aceptados", en: "Accepted" },
  { es: "Cerrados", en: "Closed" },
  { es: "Vencidos", en: "Overdue" },
  { es: "Controles con falla", en: "Controls failing" },
];

function NombreDeControl({ f }: { f: FilaDeControlEnElTiempo }) {
  return (
    <>
      <Link href={rutaDeControl(f.control.id)}>
        <Dato>{f.control.id}</Dato>
      </Link>
      <br />
      <span className="hg-menor">
        <T t={f.control.nombre} />
      </span>
    </>
  );
}

function QueLoMovio({ f }: { f: FilaDeControlEnElTiempo }) {
  if (f.movimientos.length === 0)
    return (
      <span className="hg-menor">
        <T t={{ es: "Nada cambió", en: "Nothing changed" }} />
      </span>
    );
  return f.movio === null ? (
    <span className="hg-menor">
      <T
        t={{
          es: "La evidencia, no un hallazgo",
          en: "Evidence, not a finding",
        }}
      />
    </span>
  ) : (
    <HallazgoBreve h={f.movio} />
  );
}

export function TendenciaPantalla({ v }: { v: VistaDeTendencia }) {
  const quienes = v.controles.filter(
    (c) => c.movimientos.length > 0 || c.regresiones.length > 0,
  );
  return (
    <div className="hg-pila" data-tendencia={String(v.cortes.cuantos)}>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Tendencia de la brecha", en: "Gap trend" }} />
          </h1>
          <p className="hg-bajada">
            <T
              t={{
                es: "La misma brecha en cada fecha en que algo cambió en el libro, y lo que cambió control por control de ISO/IEC 42001. Un hallazgo reabierto es una regresión.",
                en: "The same gap on every date something changed in the ledger, and what changed control by control of ISO/IEC 42001. A reopened finding is a regression.",
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
                  es: `${v.cortes.cuantos} cortes, del ${v.cortes.desde} al ${v.cortes.hasta}`,
                  en: `${v.cortes.cuantos} cut-offs, from ${v.cortes.desde} to ${v.cortes.hasta}`,
                }}
              />
            </span>
            <span>
              <T t={{ es: "Huella", en: "Fingerprint" }} />{" "}
              <Huella hex={v.huella} />
            </span>
          </p>
        </div>
        <Cifras
          cifras={v.cifras}
          nombre={{
            es: "Controles de ISO/IEC 42001 en el tiempo",
            en: "ISO/IEC 42001 controls over time",
          }}
        />
      </div>

      {v.problemas.length > 0 ? (
        <Aviso
          etiqueta={v.regresion}
          titulo={{
            es: "Algún corte no se pudo calcular",
            en: "Some cut-off could not be calculated",
          }}
        >
          <p className="hg-menor">{v.problemas.join(" | ")}</p>
        </Aviso>
      ) : null}

      <section className="hg-panel" aria-labelledby="tendencia-controles">
        <div className="hg-panel-cab">
          <h2 id="tendencia-controles">
            <T t={{ es: "Control por control", en: "Control by control" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "Del primer al último corte. Un control mejora cuando pasa a un estado con más evidencia y empeora cuando una falla aparece o vuelve.",
                en: "From the first to the last cut-off. A control improves when it moves to a state with more evidence and gets worse when a failure appears or comes back.",
              }}
            />
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T
              t={{
                es: "Cambio de cada control de ISO/IEC 42001 entre el primer y el último corte",
                en: "Change of each ISO/IEC 42001 control between the first and the last cut-off",
              }}
            />
          </caption>
          <Cabeceras columnas={COLUMNAS_CONTROLES} />
          <tbody>
            {v.controles.map((f) => (
              <tr
                key={f.control.id}
                data-tendencia-control={f.control.id}
                data-sentido={f.sentido}
                data-regresion={String(f.regresiones.length > 0)}
              >
                <td data-celda="id">
                  <NombreDeControl f={f} />
                </td>
                <td>
                  <Estado etiqueta={f.marca} />
                  {f.regresiones.length > 0 ? (
                    <>
                      <br />
                      <Chip etiqueta={v.regresion} />
                    </>
                  ) : null}
                </td>
                <td>
                  <Chip etiqueta={f.primero} />
                </td>
                <td>
                  <Chip etiqueta={f.ultimo} />
                </td>
                <td>
                  <QueLoMovio f={f} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hg-panel" aria-labelledby="tendencia-pasos">
        <div className="hg-panel-cab">
          <h2 id="tendencia-pasos">
            <T
              t={{
                es: "Qué pasó, corte por corte",
                en: "What happened, cut-off by cut-off",
              }}
            />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "Solo los controles que cambiaron. Cada paso dice el corte, el estado de antes y de después y el hallazgo que lo movió.",
                en: "Only the controls that changed. Each step says the cut-off, the state before and after and the finding that moved it.",
              }}
            />
          </p>
        </div>
        {quienes.length === 0 ? (
          <p className="hg-menor" data-vacio>
            <Estado etiqueta={v.vacio} />
          </p>
        ) : (
          <ul className="hg-lista">
            {quienes.map((f) => (
              <li key={f.control.id} data-pasos-de={f.control.id}>
                <p>
                  <Link href={rutaDeControl(f.control.id)}>
                    <Dato>{f.control.id}</Dato>
                  </Link>{" "}
                  <span className="hg-menor">
                    <T t={f.control.nombre} />
                  </span>
                </p>
                <ul className="hg-lista">
                  {f.movimientos.map((m) => (
                    <li
                      key={m.corte}
                      data-paso={m.corte}
                      data-sentido={m.sentido}
                    >
                      <Dato>{m.corte}</Dato> <Estado etiqueta={m.marca} />{" "}
                      <Chip etiqueta={m.de} /> → <Chip etiqueta={m.a} />
                      {m.hallazgos.length === 0 ? (
                        <>
                          {" "}
                          <span className="hg-menor">
                            <T
                              t={{
                                es: "Lo movió la evidencia, no un hallazgo.",
                                en: "Evidence moved it, not a finding.",
                              }}
                            />
                          </span>
                        </>
                      ) : (
                        m.hallazgos.map((h) => (
                          <span key={h.hallazgo.id}>
                            {" "}
                            <HallazgoBreve h={h.hallazgo} />{" "}
                            <span className="hg-menor">
                              {h.de === null ? (
                                <T t={{ es: "nuevo", en: "new" }} />
                              ) : (
                                <T t={h.de.nombre} />
                              )}{" "}
                              →{" "}
                              {h.a === null ? (
                                <T t={{ es: "ya no", en: "gone" }} />
                              ) : (
                                <T t={h.a.nombre} />
                              )}
                            </span>
                          </span>
                        ))
                      )}
                    </li>
                  ))}
                  {f.regresiones.map((g) => (
                    <li
                      key={`${g.corte}-${g.hallazgo.id}`}
                      data-regresion-de={g.hallazgo.id}
                    >
                      <Dato>{g.corte}</Dato> <Chip etiqueta={v.regresion} />{" "}
                      <HallazgoBreve h={g.hallazgo} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="hg-panel" aria-labelledby="tendencia-serie">
        <div className="hg-panel-cab">
          <h2 id="tendencia-serie">
            <T t={{ es: "La serie", en: "The series" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "Una fila por corte: cada una es la brecha de siempre armada con lo que estaba confirmado ese día. La última es la de la consulta.",
                en: "One row per cut-off: each is the usual gap built with what was confirmed that day. The last one is the query date's.",
              }}
            />
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T
              t={{
                es: "Hallazgos y controles con falla en cada corte",
                en: "Findings and failing controls at each cut-off",
              }}
            />
          </caption>
          <Cabeceras columnas={COLUMNAS_SERIE} />
          <tbody>
            {v.serie.map((p) => (
              <tr key={p.corte} data-corte={p.corte}>
                <td data-celda="id">
                  <Dato>{p.corte}</Dato>
                </td>
                <td data-celda="abiertos">{p.abiertos}</td>
                <td data-celda="reabiertos">{p.reabiertos}</td>
                <td data-celda="aceptados">{p.aceptados}</td>
                <td data-celda="cerrados">{p.cerrados}</td>
                <td data-celda="vencidos">{p.vencidos}</td>
                <td data-celda="controles-con-falla">{p.controlesConFalla}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="hg-menor">
        <Link href={RUTAS.informe}>
          <T t={{ es: "Ver el informe de brecha", en: "See the gap report" }} />
        </Link>
      </p>
    </div>
  );
}
