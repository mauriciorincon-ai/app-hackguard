import { MARCADA_PARA_REVISION, SIN_CONTROL } from "@/lib/catalogo/etiquetas";
import Link from "next/link";
import type { Bilingue, FichaDePrueba } from "@/lib/catalogo/tipos";
import { Chip, Fechado, Sello } from "../estado";
import { Simbolo } from "../simbolo";
import { Dato, T } from "../texto";

// La ficha de UNA prueba (design-system, dirección «consola»; maqueta `docs/diseno/prueba-<id>.html`): la vigencia en la
// cabecera, los avisos debajo, lo que se espera y cómo se decide al centro, y en el carril el resumen, el marco con sus
// controles y las fuentes. Es un componente de servidor: no tiene estado, así que sale idéntico en los dos idiomas.

const VERIFICADA: Bilingue = { es: "Verificada", en: "Verified" };
const VERIFICADO: Bilingue = { es: "Verificado", en: "Verified" };

function Par({
  rotulo,
  children,
}: {
  rotulo: Bilingue;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt>
        <T t={rotulo} />
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

const AGREGACION: Record<string, Bilingue> = {
  cualquier_detector: {
    es: "Basta con que un detector marque.",
    en: "One detector flagging is enough.",
  },
  todos_los_detectores: {
    es: "Tienen que marcar todos los detectores.",
    en: "Every detector has to flag.",
  },
  cualquier_regla: {
    es: "Basta con que una regla marque.",
    en: "One rule flagging is enough.",
  },
  todas_las_reglas: {
    es: "Tienen que marcar todas las reglas.",
    en: "Every rule has to flag.",
  },
};

// Los avisos dicen el UMBRAL, no los días transcurridos: la cifra que envejece vive en un solo lugar (la vigencia de la
// cabecera), que es la que vigila la matriz de envejecimiento.
function Avisos({ f }: { f: FichaDePrueba }) {
  const { por_revisar, vencido } = f.umbrales;
  return (
    <>
      {f.vigencia.estado === "vencido" ? (
        <Sello
          etiqueta={{
            rol: "falla",
            simbolo: "falla",
            nombre: { es: "Verificación vencida", en: "Verification overdue" },
          }}
          atributos={{ "data-aviso-de-vigencia": "vencido" }}
        >
          <p>
            <T
              t={{
                es: `Pasaron más de ${vencido} días sin que nadie la verifique de nuevo. Su marco o su herramienta pueden haber cambiado: pide al investigador que la revise contra sus fuentes y aprueba lo que proponga.`,
                en: `More than ${vencido} days have passed without anyone verifying it again. Its framework or its tool may have changed: ask the researcher to check it against its sources and approve what it proposes.`,
              }}
            />
          </p>
        </Sello>
      ) : null}
      {f.vigencia.estado === "por_revisar" ? (
        <Sello
          etiqueta={{
            rol: "atencion",
            simbolo: "aviso",
            nombre: { es: "Toca revisarla", en: "Review is due" },
          }}
          atributos={{ "data-aviso-de-vigencia": "por_revisar" }}
        >
          <p>
            <T
              t={{
                es: `Pasaron más de ${por_revisar} días desde su última verificación. Sigue siendo válida; a los ${vencido} días queda vencida.`,
                en: `More than ${por_revisar} days have passed since it was last verified. It is still valid; at ${vencido} days it becomes overdue.`,
              }}
            />
          </p>
        </Sello>
      ) : null}
      {f.marcada ? (
        <Sello
          etiqueta={{
            rol: "atencion",
            simbolo: "aviso",
            nombre: {
              es: "Marcada para revisión de contenido",
              en: "Flagged for content review",
            },
          }}
          atributos={{ "data-aviso-de-contenido": true }}
        >
          <p>
            <T
              t={{
                es: "El filtro de contenido encontró en esta ficha un patrón que pide revisión. El filtro marca, no rechaza: una persona decide si la ficha se queda, se corrige o se retira.",
                en: "The content filter found a pattern in this record that calls for review. The filter flags, it does not reject: a person decides whether the record stays, is corrected or is retired.",
              }}
            />
          </p>
        </Sello>
      ) : null}
    </>
  );
}

export function Ficha({ f }: { f: FichaDePrueba }) {
  const s = f.corrida.selector;
  return (
    <div
      className="hg-pila"
      data-ficha-de={f.id}
      data-ficha-vigencia={f.vigencia.estado}
    >
      <div className="hg-cabecera">
        <div>
          <p className="hg-cabecera-linea">
            <Dato>{f.id}</Dato>
            <Fechado vigencia={f.vigencia} rotulo={VERIFICADA} />
            {f.marcada ? <Chip etiqueta={MARCADA_PARA_REVISION} /> : null}
          </p>
          <h1>
            <T t={f.nombre} />
          </h1>
          <p className="hg-bajada">
            <T t={f.queVerifica} />
          </p>
        </div>
      </div>
      <Avisos f={f} />

      <div className="hg-trabajo">
        <div className="hg-pila">
          <section className="hg-panel" aria-labelledby="esperado">
            <div className="hg-panel-cab">
              <h2 id="esperado">
                <T t={{ es: "Resultado esperado", en: "Expected result" }} />
              </h2>
            </div>
            <div className="hg-panel-cuerpo">
              <p className="hg-destacado">
                <T t={f.resultadoEsperado} />
              </p>
            </div>
            <div className="hg-panel-cuerpo">
              <p className="hg-rotulo">
                <T t={{ es: "Por qué importa", en: "Why it matters" }} />
              </p>
              <p>
                <T t={f.porQueImporta} />
              </p>
            </div>
          </section>

          <section className="hg-panel" aria-labelledby="veredicto">
            <div className="hg-panel-cab">
              <h2 id="veredicto">
                <T
                  t={{
                    es: "Cómo se decide el veredicto",
                    en: "How the verdict is decided",
                  }}
                />
              </h2>
              <Dato>{f.regla.id}</Dato>
            </div>
            <div className="hg-panel-cuerpo">
              <dl className="hg-propiedades hg-propiedades-en-columnas">
                <Par rotulo={{ es: "Repeticiones", en: "Repetitions" }}>
                  {f.repeticiones.k === null ? (
                    <span>
                      <T t={{ es: "Determinista", en: "Deterministic" }} />
                    </span>
                  ) : (
                    <Dato>{`k = ${f.repeticiones.k}`}</Dato>
                  )}
                  <span className="hg-menor">
                    <T t={f.repeticiones.descripcion} />
                  </span>
                </Par>
                <Par rotulo={{ es: "Cómo decide", en: "How it decides" }}>
                  <span>
                    <T t={f.regla.decide} />
                  </span>
                </Par>
                <Par rotulo={{ es: "Si no corrió", en: "If it did not run" }}>
                  <span>
                    <T t={f.regla.sinEjecucion} />
                  </span>
                </Par>
              </dl>
            </div>
          </section>

          <section className="hg-panel" aria-labelledby="arnes">
            <div className="hg-panel-cab">
              <h2 id="arnes">
                <T
                  t={{
                    es: "Configuración de la corrida",
                    en: "Run configuration",
                  }}
                />
              </h2>
              <p className="hg-menor">
                <T
                  t={
                    f.repeticiones.k === null
                      ? {
                          es: "La re-prueba de un hallazgo usa esta misma.",
                          en: "Retesting a finding uses this same one.",
                        }
                      : {
                          es: "La re-prueba de un hallazgo usa esta misma y al menos el mismo k.",
                          en: "Retesting a finding uses this same one and at least the same k.",
                        }
                  }
                />
              </p>
            </div>
            <div className="hg-panel-cuerpo">
              <dl className="hg-propiedades hg-propiedades-en-columnas">
                <Par rotulo={{ es: "Herramienta", en: "Tool" }}>
                  <span>
                    <span data-neutro>{f.corrida.herramienta}</span>
                    {f.corrida.licencia ? (
                      <>
                        {" "}
                        <span className="hg-menor">
                          · <span data-neutro>{f.corrida.licencia}</span>
                        </span>
                      </>
                    ) : null}
                  </span>
                  <Fechado vigencia={f.corrida.vigencia} rotulo={VERIFICADA} />
                </Par>
                <Par rotulo={{ es: "Vía de carga", en: "Intake route" }}>
                  <span>
                    <T
                      t={
                        f.corrida.conAdaptador
                          ? {
                              es: "Adaptador: el resultado se lee del archivo que produce la herramienta.",
                              en: "Adapter: the result is read from the file the tool produces.",
                            }
                          : {
                              es: "Texto pegado o carga manual: esta herramienta no tiene adaptador.",
                              en: "Pasted text or manual entry: this tool has no adapter.",
                            }
                      }
                    />
                  </span>
                </Par>
                {f.corrida.versionMinima ? (
                  <Par rotulo={{ es: "Versión mínima", en: "Minimum version" }}>
                    <Dato>{f.corrida.versionMinima}</Dato>
                  </Par>
                ) : null}
                <Par rotulo={{ es: "Selector", en: "Selector" }}>
                  {s.texto ? (
                    <Dato>{s.texto}</Dato>
                  ) : s.revision ? (
                    <span>
                      <T t={s.revision} />
                    </span>
                  ) : (
                    <span className="hg-menor">
                      <T
                        t={{
                          es: "Lo fija el paquete de ejecución de cada plan.",
                          en: "Set by each plan's execution package.",
                        }}
                      />
                    </span>
                  )}
                </Par>
                {s.detectores ? (
                  <Par rotulo={{ es: "Detectores", en: "Detectors" }}>
                    <Dato>{s.detectores}</Dato>
                    {s.agregacion && AGREGACION[s.agregacion] ? (
                      <span className="hg-menor">
                        <T t={AGREGACION[s.agregacion]!} />
                      </span>
                    ) : null}
                  </Par>
                ) : null}
              </dl>
            </div>
          </section>

          <section className="hg-panel" aria-labelledby="aplica">
            <div className="hg-panel-cab">
              <h2 id="aplica">
                <T t={{ es: "Cuándo aplica", en: "When it applies" }} />
              </h2>
              <p className="hg-menor">
                <T
                  t={{
                    es: "El plan la incluye si el perfil del activo declara esto.",
                    en: "The plan includes it if the asset's profile declares this.",
                  }}
                />
              </p>
            </div>
            <div className="hg-panel-cuerpo">
              <p>
                <T t={f.aplicabilidad.descripcion} />
              </p>
              <ul className="hg-lista">
                {f.aplicabilidad.condiciones.map((c, i) => (
                  <li key={i}>
                    <T t={c.rasgo} />:{" "}
                    {typeof c.valor === "string" ? (
                      <Dato>{c.valor}</Dato>
                    ) : (
                      <T t={c.valor} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside
          className="hg-carril"
          aria-label={`Resumen de ${f.id} / Summary of ${f.id}`}
        >
          <section className="hg-tarjeta" aria-labelledby="resumen">
            <h2 className="hg-tarjeta-titulo" id="resumen">
              <T t={{ es: "Resumen", en: "Summary" }} />
            </h2>
            <dl className="hg-propiedades">
              <Par rotulo={{ es: "Familia", en: "Family" }}>
                <span>
                  <T t={f.familia} />
                </span>
              </Par>
              <Par rotulo={{ es: "Madurez", en: "Maturity" }}>
                <span>
                  <T t={f.madurez} />
                </span>
              </Par>
              <Par rotulo={{ es: "Prioridad base", en: "Base priority" }}>
                <span>
                  <strong data-neutro>{f.prioridadBase}</strong>{" "}
                  <span className="hg-menor">
                    <T t={{ es: "de 5", en: "of 5" }} />
                  </span>
                </span>
              </Par>
              <Par rotulo={{ es: "Aprobación", en: "Approval" }}>
                <span className="hg-firma es-acento">
                  <Simbolo nombre="firma" />
                  <span>
                    <T t={{ es: "Confirmada", en: "Confirmed" }} /> ·{" "}
                    <span data-neutro>{f.aprobadaEl}</span>
                  </span>
                </span>
              </Par>
            </dl>
          </section>

          <section className="hg-tarjeta" aria-labelledby="marco">
            <h2 className="hg-tarjeta-titulo" id="marco">
              <T
                t={{ es: "Marco y controles", en: "Framework and controls" }}
              />
            </h2>
            <dl className="hg-propiedades">
              <Par rotulo={{ es: "Marco", en: "Framework" }}>
                <span>
                  <span data-neutro>
                    {f.marco.nombre} · {f.marco.version}
                  </span>
                </span>
                <Fechado vigencia={f.marco.vigencia} rotulo={VERIFICADO} />
              </Par>
              <Par rotulo={{ es: "Referencia", en: "Reference" }}>
                <Dato>{f.marco.referencia}</Dato>
              </Par>
              {f.controles.length ? (
                f.controles.map((c) => (
                  <Par key={c.id} rotulo={{ es: "Control", en: "Control" }}>
                    <Dato>{c.id}</Dato>
                    <span>
                      <T t={c.nombre} />
                    </span>
                  </Par>
                ))
              ) : (
                <Par rotulo={{ es: "Control", en: "Control" }}>
                  <Chip etiqueta={SIN_CONTROL} />
                  <span className="hg-menor">
                    <T
                      t={{
                        es: "Todavía no da evidencia a ningún control. Queda a la vista como deuda hasta que una persona se lo asigne.",
                        en: "It does not yet give evidence to any control. It stays visible as a debt until a person assigns one.",
                      }}
                    />
                  </span>
                </Par>
              )}
            </dl>
          </section>

          <section className="hg-tarjeta" aria-labelledby="fuentes">
            <h2 className="hg-tarjeta-titulo" id="fuentes">
              <T t={{ es: "Fuentes", en: "Sources" }} />
            </h2>
            <p className="hg-menor">
              <T
                t={{
                  es: "El código comprobó que cada fuente existe y que dice lo que aquí se cita.",
                  en: "Code checked that each source exists and says what is cited here.",
                }}
              />
            </p>
            <dl className="hg-propiedades">
              {f.fuentes.map((fu) => (
                <Par key={fu.nombre} rotulo={{ es: "Fuente", en: "Source" }}>
                  <span>
                    <span data-neutro>{fu.nombre}</span>{" "}
                    <span className="hg-menor">
                      ·{" "}
                      {typeof fu.donde === "string" ? (
                        <span data-neutro>{fu.donde}</span>
                      ) : (
                        <T t={fu.donde} />
                      )}
                    </span>
                  </span>
                  <Fechado vigencia={fu.vigencia} rotulo={VERIFICADA} />
                </Par>
              ))}
              {f.citas.map((c) => (
                <Par key={c.titulo} rotulo={{ es: "Cita", en: "Citation" }}>
                  <span data-neutro>{c.titulo}</span>
                  <span className="hg-menor">
                    <T t={{ es: "consultada el", en: "checked on" }} />{" "}
                    <span data-neutro>{c.consultada}</span>
                  </span>
                </Par>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      <p>
        <Link href="/catalogo">
          <T t={{ es: "Volver al catálogo", en: "Back to the catalog" }} />
        </Link>
      </p>
    </div>
  );
}
