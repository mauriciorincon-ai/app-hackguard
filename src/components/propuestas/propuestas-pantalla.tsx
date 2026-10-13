"use client";

import Link from "next/link";
import { useState } from "react";
import { partesDelComando } from "@/lib/propuestas/comando";
import type {
  AgenteDePropuesta,
  Bilingue,
  CandidataVista,
  CorridaVista,
  DecisionDeBandeja,
  FilaDePropuesta,
  VistaDePropuestas,
} from "@/lib/propuestas/tipos";
import { Cifras } from "../brecha/piezas";
import { Aviso, Chip, Estado, Huella, Sello } from "../estado";
import { Dato, T } from "../texto";

/**
 * La pantalla `/catalogo/propuestas` (maqueta `docs/diseno/propuestas.html`, pantalla 6). Lo que proponen el investigador y el
 * extractor llega aquí y solo una persona lo decide. Cada propuesta muestra lo que el CÓDIGO verificó (su fuente, sus citas) y lo que el
 * filtro marcó; el veredicto de un sobre lo calculó la regla de la prueba, jamás el extractor. Los botones MARCAN la decisión y dicen qué
 * pasaría; lo que la registra es el comando que se muestra, que la persona corre en su terminal: el navegador no guarda nada (decisión 12
 * de diseño). Todo sale ya calculado: el componente no recalcula estados ni cuentas.
 */

const NOMBRE_DE_DECISION: Record<DecisionDeBandeja, Bilingue> = {
  aprobar: { es: "Aprobar", en: "Approve" },
  aprobar_tras_revisar: {
    es: "La revisé y la apruebo",
    en: "I reviewed it and approve",
  },
  rechazar: { es: "Rechazar", en: "Reject" },
  separar: { es: "Separar", en: "Split" },
};

/** Lo que cada decisión provoca, dicho con palabras antes de que nada se escriba. */
function consecuencia(f: FilaDePropuesta, d: DecisionDeBandeja): Bilingue {
  if (d === "aprobar") return f.alAprobar;
  if (d === "aprobar_tras_revisar")
    return {
      es: `${f.alAprobar.es} Queda registrado que la revisaste tú.`,
      en: `${f.alAprobar.en} It is recorded that you reviewed it.`,
    };
  if (d === "rechazar")
    return {
      es: "Rechazada. Sale de la bandeja y queda en el registro con tu motivo.",
      en: "Rejected. It leaves the inbox and stays in the log with your reason.",
    };
  const n = f.sobre?.candidatas.length ?? 0;
  return {
    es: `Separada. Vuelve a la bandeja como ${n} propuestas, una por prueba.`,
    en: `Split. It returns to the inbox as ${n} proposals, one per test.`,
  };
}

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

function Fuentes({ f }: { f: FilaDePropuesta }) {
  return (
    <>
      {f.fuentes.map((x) => (
        <div
          className="hg-junto"
          key={x.url}
          data-fuente={x.verificada ? "verificada" : "sin-verificar"}
        >
          <p>
            {x.verificada ? (
              <Estado etiqueta={x.etiqueta} />
            ) : (
              <Chip etiqueta={x.etiqueta} />
            )}{" "}
            <span className="hg-menor">
              <span data-neutro>{x.nombre}</span>
              {x.donde ? (
                <>
                  {" "}
                  · <T t={x.donde} />
                </>
              ) : null}{" "}
              ·{" "}
              <span lang="es">
                leída el <Dato>{x.leida}</Dato>
              </span>
              <span lang="en">
                read on <Dato>{x.leida}</Dato>
              </span>
              {x.aportada ? (
                <>
                  {" "}
                  ·{" "}
                  <span lang="es" data-aportada>
                    aportada por <span data-neutro>{x.aportada.por}</span> el{" "}
                    <Dato>{x.aportada.fecha}</Dato>
                  </span>
                  <span lang="en" data-aportada>
                    contributed by <span data-neutro>{x.aportada.por}</span> on{" "}
                    <Dato>{x.aportada.fecha}</Dato>
                  </span>
                </>
              ) : null}
            </span>
          </p>
          {x.detalle ? (
            <p className="hg-menor">
              <T t={x.detalle} />
            </p>
          ) : null}
        </div>
      ))}
    </>
  );
}

/** Qué patrón dio cada marca y dónde lo encontró: el aviso solo dice que la hay, y la persona necesita saber por qué. */
function PatronesDeMarca({
  marcas,
}: {
  marcas: FilaDePropuesta["marcas"]["contenido"];
}) {
  const unicas = marcas.filter(
    (m, i) =>
      marcas.findIndex((x) => x.campo === m.campo && x.patron === m.patron) ===
      i,
  );
  if (unicas.length === 0) return null;
  return (
    <p className="hg-menor" data-patrones>
      <span lang="es">Patrón y dónde:</span>
      <span lang="en">Pattern and where:</span>{" "}
      {unicas.map((m, i) => (
        <span key={`${m.campo}-${m.patron}`}>
          {i > 0 ? " · " : ""}
          <Dato>{m.patron}</Dato> (<span data-neutro>{m.campo}</span>)
        </span>
      ))}
    </p>
  );
}

function Marcas({
  f,
  etiquetas,
}: {
  f: FilaDePropuesta;
  etiquetas: VistaDePropuestas["etiquetasDeMarcas"];
}) {
  return (
    <>
      {f.motivos.length > 0 ? (
        <ul className="hg-chips" data-motivos>
          {f.motivos.map((m) => (
            <li key={m.etiqueta.nombre.es}>
              <Chip etiqueta={m.etiqueta} />
              {m.umbral !== null && m.umbral > 0 ? (
                <span className="hg-menor">
                  {" "}
                  <T t={{ es: "umbral", en: "threshold" }} />{" "}
                  <Dato>{m.umbral}</Dato>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {f.marcaDeContenido ? (
        <Sello
          etiqueta={etiquetas.contenido}
          menor
          atributos={{ "data-marca": "contenido" }}
        >
          <p>
            <T
              t={{
                es: "El filtro encontró un patrón que pide revisión. Marca, no rechaza: para aprobarla tienes que revisarla tú, y queda registrado.",
                en: "The filter found a pattern that calls for review. It flags, it does not reject: to approve it you must review it yourself, and that is recorded.",
              }}
            />
          </p>
          <PatronesDeMarca marcas={f.marcas.contenido} />
        </Sello>
      ) : null}
      {f.marcaDeInstruccion ? (
        <Sello
          etiqueta={etiquetas.instruccion}
          menor
          atributos={{ "data-marca": "instruccion" }}
        >
          <p>
            <T
              t={{
                es: "El código encontró una orden dentro del texto. No cambió lo que se propone ni el veredicto (lo calcula la regla), pero léela antes de aprobar: para aprobarla tienes que revisarla tú, y queda registrado.",
                en: "Code found an order inside the text. It did not change what is proposed or the verdict (the rule computes it), but read it before approving: to approve it you must review it yourself, and that is recorded.",
              }}
            />
          </p>
          <PatronesDeMarca marcas={f.marcas.instruccion} />
        </Sello>
      ) : null}
    </>
  );
}

function Candidata({
  c,
  elegible,
  elegida,
  nombreDeGrupo,
  alElegir,
}: {
  c: CandidataVista;
  elegible: boolean;
  elegida: boolean;
  nombreDeGrupo: string;
  alElegir: () => void;
}) {
  const contenido = (
    <>
      <Dato>{c.prueba}</Dato> <T t={c.nombre} />
    </>
  );
  return (
    <li className="hg-junto" data-candidata={c.prueba}>
      <p>
        {elegible ? (
          <label>
            <input
              type="radio"
              name={nombreDeGrupo}
              value={c.prueba}
              checked={elegida}
              onChange={alElegir}
            />{" "}
            {contenido}
          </label>
        ) : (
          contenido
        )}
      </p>
      {!c.enElPlan ? (
        <p className="hg-menor">
          <T
            t={{
              es: "Esta prueba no está en el plan del activo.",
              en: "This test is not in the asset's plan.",
            }}
          />
        </p>
      ) : null}
      {c.razon ? (
        <p className="hg-menor">
          <T t={c.razon} />
        </p>
      ) : null}
      {c.citas.detalle.some((x) => !x.verificada) ? (
        <ul className="hg-lista" data-citas-sin-verificar>
          {c.citas.detalle
            .filter((x) => !x.verificada)
            .map((x) => (
              <li key={x.campo}>
                <Chip etiqueta={x.etiqueta} />{" "}
                <span className="hg-menor">
                  <Dato>{x.campo}</Dato> «<span data-neutro>{x.texto}</span>»
                </span>
              </li>
            ))}
        </ul>
      ) : null}
    </li>
  );
}

/** El veredicto de una candidata: lo calculó la regla de la prueba con lo que el código verificó, jamás el extractor. */
function Veredicto({ c, ver }: { c: CandidataVista; ver: boolean }) {
  return (
    <li className="hg-junto" data-veredicto-de={c.prueba}>
      {c.veredicto ? (
        <p>
          <Chip etiqueta={c.veredicto.etiqueta} />{" "}
          {ver ? <Dato>{c.prueba}</Dato> : null}{" "}
          <span className="hg-menor">
            <span lang="es">
              Lo calculó la regla <Dato>{c.veredicto.regla}</Dato>
              {c.veredicto.fallidas !== null &&
              c.veredicto.evaluadas !== null ? (
                <>
                  {" "}
                  con <Dato>{c.veredicto.fallidas}</Dato> fallas en{" "}
                  <Dato>{c.veredicto.evaluadas}</Dato>
                </>
              ) : null}
              , no el extractor. {c.veredicto.decide?.es}
            </span>
            <span lang="en">
              Computed by rule <Dato>{c.veredicto.regla}</Dato>
              {c.veredicto.fallidas !== null &&
              c.veredicto.evaluadas !== null ? (
                <>
                  {" "}
                  from <Dato>{c.veredicto.fallidas}</Dato> failures in{" "}
                  <Dato>{c.veredicto.evaluadas}</Dato>
                </>
              ) : null}
              , not by the extractor. {c.veredicto.decide?.en}
            </span>
          </span>
        </p>
      ) : (
        <p className="hg-menor" data-sin-veredicto>
          {ver ? (
            <>
              <Dato>{c.prueba}</Dato>{" "}
            </>
          ) : null}
          {c.sinVeredicto ? <T t={c.sinVeredicto} /> : null}
        </p>
      )}
    </li>
  );
}

function Sobre({
  f,
  elegida,
  alElegir,
}: {
  f: FilaDePropuesta;
  elegida: string;
  alElegir: (prueba: string) => void;
}) {
  const s = f.sobre;
  if (s === null) return null;
  const alternativas = s.asociacion === "alternativas";
  return (
    <div className="hg-panel-cuerpo">
      <dl className="hg-propiedades hg-propiedades-en-columnas">
        <Par rotulo={{ es: "Activo y plan", en: "Asset and plan" }}>
          <span>
            <T t={s.activo.nombre} />
            {s.activo.plan ? (
              <span className="hg-menor">
                {" "}
                ·{" "}
                <Link href={s.activo.ruta}>
                  <Huella hex={s.activo.plan} />
                </Link>
              </span>
            ) : null}
          </span>
        </Par>
        <Par rotulo={{ es: "Citas literales", en: "Literal quotes" }}>
          {(() => {
            const { verificadas, total, etiqueta } = s.citas;
            const nombre =
              verificadas === total
                ? {
                    es: `${verificadas} verificadas por código`,
                    en: `${verificadas} verified by code`,
                  }
                : {
                    es: `${verificadas} de ${total} verificadas por código`,
                    en: `${verificadas} of ${total} verified by code`,
                  };
            return verificadas === total ? (
              <Estado etiqueta={{ ...etiqueta, nombre }} />
            ) : (
              <Chip etiqueta={{ ...etiqueta, nombre }} />
            );
          })()}
          <span className="hg-menor">
            <T
              t={{
                es: "Cada campo propuesto cita el fragmento del texto del que sale. El texto pegado no se guarda: solo su huella y un extracto.",
                en: "Each proposed field quotes the fragment of the text it comes from. The pasted text is not stored: only its fingerprint and an excerpt.",
              }}
            />
          </span>
        </Par>
        <Par
          rotulo={
            s.asociacion === "mezcla"
              ? { es: "Pruebas que mezcla", en: "Tests it mixes" }
              : { es: "Prueba asociada", en: "Matched test" }
          }
        >
          <ul className="hg-lista" data-candidatas>
            {s.candidatas.map((c) => (
              <Candidata
                key={c.prueba}
                c={c}
                elegible={alternativas && f.decisiones.length > 0}
                elegida={elegida === c.prueba}
                nombreDeGrupo={`prueba-${f.id}`}
                alElegir={() => alElegir(c.prueba)}
              />
            ))}
          </ul>
          {alternativas ? (
            <span className="hg-menor">
              <T
                t={{
                  es: `Hay ${s.candidatas.length} pruebas parecidas en el plan. Se propone la primera; tú eliges.`,
                  en: `There are ${s.candidatas.length} similar tests in the plan. The first is proposed; you choose.`,
                }}
              />
            </span>
          ) : null}
        </Par>
        <Par rotulo={{ es: "Veredicto sugerido", en: "Suggested verdict" }}>
          <ul className="hg-lista" data-veredictos>
            {s.candidatas.map((c) => (
              <Veredicto key={c.prueba} c={c} ver={s.candidatas.length > 1} />
            ))}
          </ul>
        </Par>
        <Par rotulo={{ es: "Severidad", en: "Severity" }}>
          <span className="hg-menor">
            <T
              t={{
                es: "Sin precargar: la decides tú al confirmar el sobre.",
                en: "Not prefilled: you decide it when you confirm the envelope.",
              }}
            />
          </span>
        </Par>
      </dl>
    </div>
  );
}

function Pie({
  f,
  marcada,
  alMarcar,
  prueba,
}: {
  f: FilaDePropuesta;
  marcada: DecisionDeBandeja | null;
  alMarcar: (d: DecisionDeBandeja) => void;
  prueba: string | undefined;
}) {
  if (f.decidida !== null) {
    return (
      <div className="hg-decision" data-decidida>
        <p>
          <Estado etiqueta={f.etiquetaDeEstado} />
        </p>
        <div>
          <p className="hg-menor">
            <span lang="es">
              Decidida por <span data-neutro>{f.decidida.por}</span> el{" "}
              <Dato>{f.decidida.fecha}</Dato>.
            </span>
            <span lang="en">
              Decided by <span data-neutro>{f.decidida.por}</span> on{" "}
              <Dato>{f.decidida.fecha}</Dato>.
            </span>
            {f.decidida.motivo ? (
              <>
                {" "}
                «<span data-neutro>{f.decidida.motivo}</span>»
              </>
            ) : null}
          </p>
          {f.decidida.efecto ? (
            <p className="hg-menor" data-efecto>
              {f.decidida.efecto.sobre ? (
                <>
                  <span lang="es">
                    Nació el sobre <Dato>{f.decidida.efecto.sobre}</Dato>, por
                    confirmar.{" "}
                  </span>
                  <span lang="en">
                    The envelope <Dato>{f.decidida.efecto.sobre}</Dato> was
                    created, to be confirmed.{" "}
                  </span>
                </>
              ) : null}
              {f.decidida.efecto.prueba ? (
                <>
                  <span lang="es">
                    Quedó aprobada la prueba{" "}
                    <Dato>{f.decidida.efecto.prueba}</Dato>.{" "}
                  </span>
                  <span lang="en">
                    The test <Dato>{f.decidida.efecto.prueba}</Dato> was
                    approved.{" "}
                  </span>
                </>
              ) : null}
              {f.decidida.efecto.corregido ? (
                <>
                  <span lang="es">Corrigió el veredicto de </span>
                  <span lang="en">The verdict was corrected from </span>
                  <Estado etiqueta={f.decidida.efecto.corregido.de} />{" "}
                  <span lang="es">a</span>
                  <span lang="en">to</span>{" "}
                  <Estado etiqueta={f.decidida.efecto.corregido.a} />.
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
  const partes = marcada
    ? partesDelComando(f, marcada, prueba === undefined ? {} : { prueba })
    : null;
  const n = f.sobre?.candidatas.length ?? 0;
  return (
    <div className="hg-decision">
      <div
        className="hg-grupo"
        role="group"
        aria-label={`Decisión sobre ${f.id} / Decision on ${f.id}`}
      >
        {f.decisiones.map((d) => (
          <button
            key={d}
            type="button"
            className="hg-boton"
            data-controlador="decidir"
            data-valor={d}
            aria-pressed={marcada === d}
            onClick={() => alMarcar(d)}
          >
            {d === "separar" ? (
              <T
                t={
                  n === 2
                    ? { es: "Separar en dos", en: "Split in two" }
                    : { es: `Separar en ${n}`, en: `Split in ${n}` }
                }
              />
            ) : (
              <T t={NOMBRE_DE_DECISION[d]} />
            )}
          </button>
        ))}
      </div>
      <div>
        {f.decisiones.map((d) => (
          <p
            key={d}
            className="hg-consecuencia"
            data-si-decision={d}
            hidden={marcada !== d}
          >
            <T t={consecuencia(f, d)} />
          </p>
        ))}
        <p className="hg-menor" data-si-decision="" hidden={marcada !== null}>
          <T
            t={{
              es: "Sin decidir: no está en el catálogo ni cuenta como evidencia.",
              en: "Not decided: it is not in the catalog and does not count as evidence.",
            }}
          />
        </p>
        {partes ? (
          <div className="hg-junto" data-comando>
            <p className="hg-menor">
              <T
                t={{
                  es: "Marcaste esta decisión en la pantalla; no se guardó. Para registrarla, corre esto en tu terminal con tu nombre y la fecha:",
                  en: "You marked this decision on screen; nothing was saved. To record it, run this in your terminal with your name and the date:",
                }}
              />
            </p>
            <p>
              {partes.map((p, i) => (
                <span key={`${i}-${p}`}>
                  {i > 0 ? " " : ""}
                  <span className="hg-dato" data-neutro>
                    {p}
                  </span>
                </span>
              ))}
            </p>
            {marcada !== "rechazar" && f.pideConteoAMano ? (
              <p className="hg-menor">
                <T
                  t={{
                    es: "Si el texto no respalda un conteo, añade --evaluadas, --fallidas o --alertas con el valor que compruebes tú.",
                    en: "If the text does not back a count, add --evaluadas, --fallidas or --alertas with the value you check yourself.",
                  }}
                />
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Propuesta({
  f,
  etiquetas,
  marcada,
  alMarcar,
  elegida,
  alElegir,
  visible,
}: {
  f: FilaDePropuesta;
  etiquetas: VistaDePropuestas["etiquetasDeMarcas"];
  marcada: DecisionDeBandeja | null;
  alMarcar: (d: DecisionDeBandeja) => void;
  elegida: string;
  alElegir: (prueba: string) => void;
  visible: boolean;
}) {
  const alternativas = f.sobre?.asociacion === "alternativas";
  return (
    <article
      className="hg-panel"
      id={f.id.toLowerCase()}
      data-filtrable
      data-propuesta={f.id}
      data-origen={f.origen}
      data-estado={f.estado}
      data-decision={f.decidida ? f.estado : (marcada ?? "")}
      hidden={!visible}
    >
      <div className="hg-panel-cuerpo">
        <p className="hg-propuesta-linea">
          <Dato>{f.id}</Dato>
          <span>
            <T t={f.origenNombre} />
          </span>
          <span>
            <T t={f.tipoNombre} />
          </span>
          <Dato>{f.fecha}</Dato>
        </p>
        <h2 className="hg-tarjeta-nombre">
          <T t={f.titulo} />
        </h2>
        <p>
          <T t={f.resumen} />
        </p>
        {f.cambio ? (
          <p className="hg-menor">
            <T t={f.cambio} />
          </p>
        ) : null}
        <Fuentes f={f} />
        <Marcas f={f} etiquetas={etiquetas} />
      </div>
      <Sobre f={f} elegida={elegida} alElegir={alElegir} />
      <Pie
        f={f}
        marcada={marcada}
        alMarcar={alMarcar}
        prueba={alternativas ? elegida : undefined}
      />
    </article>
  );
}

function Corrida({ c }: { c: CorridaVista }) {
  const idDeTitulo = `corrida-${c.agente}`;
  const titulo: Bilingue =
    c.agente === "investigador"
      ? {
          es: "Última corrida del investigador",
          en: "The researcher's last run",
        }
      : { es: "Última corrida del extractor", en: "The extractor's last run" };
  return (
    <section
      className="hg-tarjeta"
      aria-labelledby={idDeTitulo}
      data-corrida={c.id}
    >
      <h2 className="hg-tarjeta-titulo" id={idDeTitulo}>
        <T t={titulo} />
      </h2>
      <p className="hg-menor">
        <T
          t={{
            es: "Cada corrida queda registrada con lo que consultó y lo que no pudo consultar. Lo que no pudo leer no lo inventa ni lo fuerza.",
            en: "Each run is logged with what it consulted and what it could not. What it could not read it neither invents nor forces.",
          }}
        />
      </p>
      <dl className="hg-propiedades">
        <Par rotulo={{ es: "Corrida", en: "Run" }}>
          <Dato>{c.id}</Dato>
          <Dato>{c.fecha}</Dato>
        </Par>
        <Par rotulo={{ es: "Qué revisó", en: "What it covered" }}>
          <span>
            <T t={c.alcance} />
          </span>
        </Par>
        {c.agente === "investigador" ? (
          <Par rotulo={{ es: "Fuentes consultadas", en: "Sources consulted" }}>
            <strong data-neutro>{c.consultadas}</strong>
          </Par>
        ) : null}
        <Par rotulo={{ es: "Modelo", en: "Model" }}>
          <span data-neutro>{c.modelo}</span>
          <span className="hg-menor">
            <T
              t={{
                es: `${c.reintentos} reintentos`,
                en: `${c.reintentos} retries`,
              }}
            />
          </span>
        </Par>
        {c.ejecucion ? (
          <Par rotulo={{ es: "Ejecución", en: "Run cost" }}>
            <span className="hg-menor" data-ejecucion>
              {c.ejecucion.latenciaS !== null ? (
                <>
                  <Dato>{c.ejecucion.latenciaS}</Dato> s
                </>
              ) : null}
              {c.ejecucion.latenciaS !== null && c.ejecucion.tokens !== null
                ? " · "
                : null}
              {c.ejecucion.tokens !== null ? (
                <>
                  <Dato>{c.ejecucion.tokens}</Dato> tokens
                </>
              ) : null}
              {" · "}
              <T
                t={{
                  es: `${c.ejecucion.nodos.length} pasos`,
                  en: `${c.ejecucion.nodos.length} steps`,
                }}
              />
            </span>
          </Par>
        ) : null}
        <Par rotulo={{ es: "Reglas del plan", en: "Plan rules" }}>
          <span data-neutro>
            <T
              t={{
                es: `${c.criterios.cumplen} de ${c.criterios.total} se cumplen`,
                en: `${c.criterios.cumplen} of ${c.criterios.total} are met`,
              }}
            />
          </span>
        </Par>
        {c.agente === "investigador" ? (
          <Par rotulo={{ es: "No pudo leer", en: "Could not read" }}>
            {c.noAccesibles.length === 0 ? (
              <span className="hg-menor">
                <T t={{ es: "Ninguna fuente.", en: "No source." }} />
              </span>
            ) : (
              c.noAccesibles.map((f) => (
                <span className="hg-junto" key={f.nombre} data-no-accesible>
                  <span data-neutro>{f.nombre}</span>
                  <span className="hg-menor">
                    <T t={f.razon} />
                  </span>
                </span>
              ))
            )}
            <span className="hg-menor">
              <T
                t={{
                  es: "Queda registrada como «no accesible al agente»; nadie la rodea. Si necesitas ese documento, léelo tú y haz el cambio a mano.",
                  en: "It is logged as “not accessible to the agent”; nobody works around it. If you need that document, read it yourself and make the change by hand.",
                }}
              />
            </span>
          </Par>
        ) : null}
        <Par rotulo={{ es: "Contradicciones", en: "Contradictions" }}>
          {c.contradicciones.length === 0 ? (
            <span className="hg-menor">
              <T t={{ es: "Ninguna.", en: "None." }} />
            </span>
          ) : (
            c.contradicciones.map((x) => (
              <span key={x.es}>
                <T t={x} />
              </span>
            ))
          )}
        </Par>
        <Par rotulo={{ es: "Huella", en: "Fingerprint" }}>
          <Huella hex={c.huella} />
        </Par>
      </dl>
    </section>
  );
}

export function PropuestasPantalla({ v }: { v: VistaDePropuestas }) {
  const [origen, setOrigen] = useState<"" | AgenteDePropuesta>("");
  const [marcas, setMarcas] = useState<Record<string, DecisionDeBandeja>>({});
  const [elegidas, setElegidas] = useState<Record<string, string>>({});

  const visibles = v.filas.filter((f) => origen === "" || f.origen === origen);
  const marcadasEnPantalla = v.filas.filter(
    (f) => f.estado === "por_decidir" && marcas[f.id] !== undefined,
  ).length;
  const porDecidir = v.cifras.porDecidir - marcadasEnPantalla;
  const ultimas = (["investigador", "extractor"] as const).flatMap((a) => {
    const c = v.corridas.find((x) => x.agente === a);
    return c ? [c] : [];
  });

  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Bandeja de propuestas", en: "Proposal inbox" }} />
          </h1>
          <p className="hg-bajada">
            <T
              t={{
                es: "La inteligencia artificial propone y tú apruebas. Nada de lo que hay aquí está en el catálogo ni cuenta como evidencia hasta que lo decidas.",
                en: "The AI proposes and you approve. Nothing here is in the catalog or counts as evidence until you decide.",
              }}
            />
          </p>
        </div>
        {v.vacio ? null : (
          <Cifras
            nombre={{ es: "Resumen de la bandeja", en: "Inbox summary" }}
            cifras={[
              {
                clave: "por_decidir",
                valor: String(porDecidir),
                texto: { es: "por decidir", en: "to decide" },
                marca: null,
              },
              {
                clave: "sin_verificar",
                valor: String(v.cifras.sinVerificar),
                texto: v.etiquetasDeCifras.sinVerificar.nombre,
                marca: v.etiquetasDeCifras.sinVerificar,
              },
              {
                clave: "marcadas",
                valor: String(v.cifras.marcadas),
                texto: v.etiquetasDeCifras.marcadas.nombre,
                marca: v.etiquetasDeCifras.marcadas,
              },
            ]}
          />
        )}
      </div>

      {v.ilegibles.length > 0 ? (
        <Aviso
          etiqueta={v.ilegibles[0]!.etiqueta}
          titulo={{
            es: "Una propuesta no se pudo leer",
            en: "A proposal could not be read",
          }}
        >
          <div data-ilegibles>
            {v.ilegibles.map((i) => (
              <Sello etiqueta={i.etiqueta} key={i.ruta}>
                <p>
                  <span lang="es">
                    El archivo <Dato>{i.ruta}</Dato> no se puede mostrar para
                    aprobar ({i.detalle}). Una corrida incompleta o editada
                    después de sellarla no se muestra: se reporta aquí. Las
                    demás siguen en la bandeja.
                  </span>
                  <span lang="en">
                    File <Dato>{i.ruta}</Dato> cannot be shown for approval (
                    {i.detalle}). An incomplete run, or one edited after it was
                    sealed, is not shown: it is reported here. The others stay
                    in the inbox.
                  </span>
                </p>
              </Sello>
            ))}
          </div>
        </Aviso>
      ) : null}

      {v.vacio ? (
        <Aviso
          etiqueta={{ rol: "neutro", simbolo: "vacio" }}
          titulo={{ es: "La bandeja está vacía", en: "The inbox is empty" }}
        >
          <p>
            <T
              t={{
                es: "No hay nada por decidir. Una persona le pide al investigador que revise un marco (/investigar) o al extractor que lea el resultado de una herramienta pegado como texto (/extraer); lo que propongan llega aquí.",
                en: "There is nothing to decide. A person asks the researcher to check a framework (/investigar) or the extractor to read a tool's result pasted as text (/extraer); what they propose arrives here.",
              }}
            />
          </p>
        </Aviso>
      ) : (
        <div className="hg-trabajo">
          <div className="hg-pila">
            <div className="hg-herramientas-linea">
              <div
                className="hg-grupo"
                role="group"
                aria-label="Quién propone / Who proposes"
              >
                {v.origenes.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    className="hg-boton hg-filtro"
                    data-controlador="filtro"
                    data-campo="origen"
                    data-valor={o.valor}
                    aria-pressed={origen === o.valor}
                    onClick={() => setOrigen(o.valor)}
                  >
                    <T t={o.nombre} />
                  </button>
                ))}
              </div>
              <p className="hg-menor">
                <span lang="es">
                  Se muestran{" "}
                  <span data-cuenta-filtrada data-neutro>
                    {visibles.length}
                  </span>{" "}
                  de {v.total} propuestas
                </span>
                <span lang="en">
                  Showing{" "}
                  <span data-cuenta-filtrada data-neutro>
                    {visibles.length}
                  </span>{" "}
                  of {v.total} proposals
                </span>
              </p>
            </div>
            <div className="hg-propuestas">
              {v.filas.map((f) => (
                <Propuesta
                  key={f.id}
                  f={f}
                  etiquetas={v.etiquetasDeMarcas}
                  visible={origen === "" || f.origen === origen}
                  marcada={marcas[f.id] ?? null}
                  alMarcar={(d) =>
                    setMarcas((m) => {
                      // Pulsar de nuevo la decisión marcada la deshace.
                      const { [f.id]: actual, ...resto } = m;
                      return actual === d ? resto : { ...resto, [f.id]: d };
                    })
                  }
                  elegida={
                    elegidas[f.id] ?? f.sobre?.candidatas[0]?.prueba ?? ""
                  }
                  alElegir={(prueba) =>
                    setElegidas((e) => ({ ...e, [f.id]: prueba }))
                  }
                />
              ))}
            </div>
          </div>

          <aside
            className="hg-carril"
            aria-label="Última corrida de cada agente / Each agent's last run"
          >
            {ultimas.length === 0
              ? null
              : ultimas.map((c) => <Corrida key={c.id} c={c} />)}
          </aside>
        </div>
      )}
    </>
  );
}
