"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  Etiqueta,
  FilaDeMuestreo,
  VistaDeCarga,
  VistaDeLote,
} from "@/lib/evidencia/tipos-de-carga";
import { Par } from "../activos/piezas";
import { Aviso, Chip, Estado, Huella, Sello } from "../estado";
import { Simbolo } from "../simbolo";
import { Dato, T } from "../texto";
import { FichaDelSobre, Proporcion } from "./piezas";

/**
 * La pantalla `/evidencia/carga` (maqueta `docs/diseno/evidencia.html`). El lote, su revisión (lo que se revisa siempre y la
 * muestra), lo que cuenta y qué fallas abrirían un hallazgo los calculó el motor: aquí solo se leen. Lo que la persona
 * decide —confirmar el lote, separar fallas, revisar uno por uno— se hace con el CLI: donde la maqueta pone botones de
 * decisión, el producto pone el comando. Lo que sí se pulsa son las pestañas de vía, el selector de lote y la fila de un
 * sobre; solo cambian lo que se ve, nunca la forma del árbol, y los dos idiomas viajan en el mismo HTML.
 */

type Via = "adaptador" | "pegado" | "manual";
const VIAS: { valor: Via; nombre: { es: string; en: string } }[] = [
  {
    valor: "adaptador",
    nombre: { es: "Archivo de herramienta", en: "Tool file" },
  },
  { valor: "pegado", nombre: { es: "Texto pegado", en: "Pasted text" } },
  { valor: "manual", nombre: { es: "Sobre manual", en: "Manual envelope" } },
];

function Comando({ texto }: { texto: string }) {
  return (
    <p>
      <span className="hg-dato hg-vector" data-neutro>
        {texto}
      </span>
    </p>
  );
}

function Paso({ p }: { p: VistaDeLote["recorrido"][number] }) {
  return (
    <li className={`hg-eslabon es-${p.rol}`}>
      <Simbolo nombre={p.simbolo} />
      <span className="hg-eslabon-titulo">
        <T t={p.titulo} />
      </span>
      <span className="hg-menor">
        <T t={p.detalle} />
      </span>
    </li>
  );
}

function ZonaDeLote({
  l,
  etiquetas,
  activo,
  seleccion,
  alElegir,
}: {
  l: VistaDeLote;
  etiquetas: VistaDeCarga["etiquetas"];
  activo: boolean;
  seleccion: string;
  alElegir: (id: string) => void;
}) {
  return (
    <div
      className="hg-trabajo"
      data-lote={l.id}
      data-decision={l.decision}
      data-sobres={l.sobres.length}
      data-obligatorias={l.obligatorias}
      data-seleccion={seleccion}
      hidden={!activo}
    >
      <div className="hg-pila">
        <section className="hg-panel" aria-labelledby={`lote-${l.id}`}>
          <div className="hg-panel-cab">
            <div className="hg-panel-linea">
              <h2 id={`lote-${l.id}`} data-neutro>
                {l.id}
              </h2>
              <span className="hg-menor">
                <span data-neutro>
                  {l.herramienta.nombre} {l.herramienta.version}
                </span>{" "}
                ·{" "}
                <Dato>{`${l.fecha}${l.hora === null ? "" : ` ${l.hora}`}`}</Dato>
              </span>
              <span data-estado-del-lote={l.decision}>
                <Chip etiqueta={l.decisionEtiqueta} />
              </span>
            </div>
            <ul className="hg-chips">
              {l.reparto.map((r) => (
                <li key={r.veredicto.nombre.es}>
                  <Chip
                    etiqueta={{
                      ...r.veredicto,
                      nombre: {
                        es: `${r.n} ${r.veredicto.nombre.es.toLowerCase()}`,
                        en: `${r.n} ${r.veredicto.nombre.en.toLowerCase()}`,
                      },
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
          <ol
            className="hg-cadena hg-cadena-horizontal"
            aria-label="Recorrido del lote · Batch progress"
          >
            {l.recorrido.map((p) => (
              <Paso key={p.titulo.es} p={p} />
            ))}
          </ol>
          {l.advertencias.length === 0 ? null : (
            <div className="hg-panel-cuerpo">
              {l.advertencias.map((a) => (
                <div
                  key={a.es}
                  className={`hg-sello hg-sello-menor es-${etiquetas.advertencia_del_lote.rol}`}
                >
                  <Simbolo nombre={etiquetas.advertencia_del_lote.simbolo} />
                  <div>
                    <p>
                      <T t={a} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <table className="hg-tabla">
            <caption className="hg-oculto">
              <T
                t={{
                  es: `Sobres del lote ${l.id}`,
                  en: `Envelopes in batch ${l.id}`,
                }}
              />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T t={{ es: "Sobre", en: "Envelope" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Prueba", en: "Test" }} />
                </th>
                <th scope="col">
                  <T
                    t={{ es: "Veredicto sugerido", en: "Suggested verdict" }}
                  />
                </th>
                <th scope="col">
                  <T t={{ es: "Resultado", en: "Result" }} />
                </th>
                <th scope="col">
                  <T t={{ es: "Revisión", en: "Review" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {l.sobres.map((s) => (
                <tr
                  key={s.id}
                  data-fila=""
                  data-seleccionada={s.id === seleccion}
                  data-sobre={s.id}
                  data-revision={s.revision}
                >
                  <td data-celda="id">
                    <button
                      type="button"
                      className="hg-fila-boton"
                      data-controlador="seleccionar"
                      aria-pressed={s.id === seleccion}
                      onClick={() => alElegir(s.id)}
                    >
                      <Dato>{s.id}</Dato>
                      <span className="hg-oculto">
                        <T
                          t={{
                            es: "Ver el detalle de este sobre",
                            en: "Show this envelope's details",
                          }}
                        />
                      </span>
                    </button>
                  </td>
                  <td>
                    <p>
                      <strong>
                        <T t={s.prueba.nombre} />
                      </strong>
                    </p>
                    <p>
                      <Dato>{s.prueba.id}</Dato>
                    </p>
                  </td>
                  <td data-celda="estado">
                    <Chip etiqueta={s.veredicto} />
                  </td>
                  <td data-celda="resultado">
                    {s.proporcion === null ? null : (
                      <Proporcion
                        fallidas={s.proporcion.fallidas}
                        evaluadas={s.proporcion.evaluadas}
                      />
                    )}
                    <p className="hg-menor">
                      <T t={s.conteo} />
                    </p>
                  </td>
                  <td>
                    <Chip etiqueta={s.revisionCorta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hg-panel-pie">
            <T
              t={{
                es: "La muestra se elige con la huella del lote: el mismo lote da siempre la misma muestra.",
                en: "The sample is picked with the batch fingerprint: the same batch always gives the same sample.",
              }}
            />
          </p>
        </section>

        <section className="hg-panel" aria-labelledby={`ficha-${l.id}`}>
          <div className="hg-panel-cab">
            <h2 id={`ficha-${l.id}`}>
              <T t={{ es: "Ficha del lote", en: "Batch record" }} />
            </h2>
            <p className="hg-menor">
              <T
                t={{
                  es: "El archivo se leyó una vez y no se guarda: quedan su huella y un extracto por sobre.",
                  en: "The file was read once and is not stored: its fingerprint and an excerpt per envelope remain.",
                }}
              />
            </p>
          </div>
          <div className="hg-panel-cuerpo">
            <dl className="hg-propiedades hg-propiedades-en-columnas hg-propiedades-en-tres">
              <Par rotulo={{ es: "Archivo", en: "File" }}>
                <span className="hg-dato hg-vector" data-neutro>
                  {l.ficha.archivo}
                </span>
              </Par>
              <Par
                rotulo={{ es: "Huella del archivo", en: "File fingerprint" }}
              >
                <Huella hex={l.ficha.huellaDelArchivo} />
              </Par>
              <Par rotulo={{ es: "Huella del lote", en: "Batch fingerprint" }}>
                <Huella hex={l.ficha.huellaDelLote} />
              </Par>
              <Par
                rotulo={{ es: "Huella del registro", en: "Record fingerprint" }}
              >
                <Huella hex={l.ficha.huellaDelRegistro} />
              </Par>
              <Par rotulo={{ es: "Adaptador", en: "Adapter" }}>
                <Dato>{l.ficha.adaptador}</Dato>
              </Par>
              <Par rotulo={{ es: "Ejecutado por", en: "Run by" }}>
                <span data-neutro>{l.ficha.ejecutadoPor}</span>
              </Par>
              <Par rotulo={{ es: "Cuándo", en: "When" }}>
                <span>
                  <Dato>{`${l.fecha}${l.hora === null ? "" : ` ${l.hora}`}`}</Dato>{" "}
                  <Dato>{l.zona}</Dato>
                </span>
              </Par>
            </dl>
          </div>
        </section>
      </div>

      <aside
        className="hg-carril"
        aria-label={`Confirmación y detalle de ${l.id} · Confirmation and details of ${l.id}`}
      >
        <ParaConfirmar l={l} etiquetas={etiquetas} />
        <section className="hg-tarjeta">
          <h2 className="hg-tarjeta-titulo">
            <T t={{ es: "Sobre seleccionado", en: "Selected envelope" }} />
          </h2>
          {l.sobres.map((s) => (
            <div
              key={s.id}
              className="hg-pila"
              data-si-seleccion={s.id}
              hidden={s.id !== seleccion}
            >
              <FichaDelSobre s={s} />
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

/** «Para confirmar»: lo que falta y el comando que lo decide, o lo que ya se decidió. La pantalla no decide nada. */
function ParaConfirmar({
  l,
  etiquetas,
}: {
  l: VistaDeLote;
  etiquetas: VistaDeCarga["etiquetas"];
}) {
  return (
    <section className="hg-tarjeta hg-tarjeta-accion">
      <h2 className="hg-tarjeta-titulo">
        <T t={{ es: "Para confirmar", en: "To confirm" }} />
      </h2>
      <ul className="hg-pendientes">
        <li className={`es-${etiquetas.siempre_larga.rol}`}>
          <Simbolo nombre={etiquetas.siempre_larga.simbolo} />
          <span>
            <span lang="es">
              {l.rePruebas.length > 0
                ? "Revisar las fallidas y las re-pruebas: "
                : "Revisar las fallidas: "}
              <span data-neutro>{l.obligatorias}</span>. Siempre, todas.
            </span>
            <span lang="en">
              {l.rePruebas.length > 0
                ? "Review the failed ones and the retests: "
                : "Review the failed ones: "}
              <span data-neutro>{l.obligatorias}</span>. Always, all of them.
            </span>
          </span>
        </li>
        <li className={`es-${etiquetas.en_muestra_larga.rol}`}>
          <Simbolo nombre={etiquetas.en_muestra_larga.simbolo} />
          <span>
            <span lang="es">
              Revisar la muestra: <span data-neutro>{l.muestra}</span> de los
              otros <span data-neutro>{l.resto}</span>.
            </span>
            <span lang="en">
              Review the sample: <span data-neutro>{l.muestra}</span> of the
              other <span data-neutro>{l.resto}</span>.
            </span>
          </span>
        </li>
      </ul>
      {l.decision === "por_confirmar" ? (
        <div className="hg-pila" data-solo-lectura="">
          <p className="hg-menor">
            <T
              t={{
                es: "Esta pantalla solo se lee: el lote se decide con su comando, con tu nombre y la fecha.",
                en: "This screen is read-only: the batch is decided with its command, with your name and the date.",
              }}
            />
          </p>
          <ul className="hg-pila hg-lista-datos">
            <li className="hg-junto">
              <strong>
                <T t={{ es: "Confirmar el lote", en: "Confirm the batch" }} />
              </strong>
              <p className="hg-menor">
                <T
                  t={{
                    es: `Sus ${l.sobres.length} sobres cuentan desde ese momento y ya no se editan: una corrección crea un sobre nuevo.${l.abren.length > 0 ? " Las fallas que abrirían un hallazgo se confirman aparte, una por una, con su severidad." : ""}`,
                    en: `Its ${l.sobres.length} envelopes count from then on and can no longer be edited: a correction creates a new envelope.${l.abren.length > 0 ? " The failures that would open a finding are confirmed separately, one by one, with their severity." : ""}`,
                  }}
                />
              </p>
              <Comando texto={l.comandos.confirmar} />
            </li>
            <li className="hg-junto">
              <strong>
                <T t={{ es: "Revisar uno por uno", en: "Review one by one" }} />
              </strong>
              <p className="hg-menor">
                <T
                  t={{
                    es: "El lote pasa a revisión individual: cada sobre se confirma por separado.",
                    en: "The batch moves to individual review: each envelope is confirmed separately.",
                  }}
                />
              </p>
              <Comando texto={l.comandos.unoPorUno} />
            </li>
          </ul>
          <p className="hg-menor">
            <T
              t={{
                es: "Sin confirmar: todavía no cuenta. Un solo error en la muestra manda el lote entero a revisión individual.",
                en: "Not confirmed: it does not count yet. A single error in the sample sends the whole batch to individual review.",
              }}
            />
          </p>
        </div>
      ) : l.decision === "confirmado" ? (
        <p className="hg-consecuencia" data-decision="confirmado">
          <span lang="es">
            Confirmado por <span data-neutro>{l.decididoPor?.por}</span> el{" "}
            <span data-neutro>{l.decididoPor?.fecha}</span>:{" "}
            <span data-neutro>{l.cuentanPorElLote}</span> sobres cuentan y ya no
            se editan
            {l.separados.length > 0
              ? `; ${l.separados.join(", ")} se confirma${l.separados.length === 1 ? "" : "n"} por separado con pnpm evidencia:confirmar.`
              : "."}
          </span>
          <span lang="en">
            Confirmed by <span data-neutro>{l.decididoPor?.por}</span> on{" "}
            <span data-neutro>{l.decididoPor?.fecha}</span>:{" "}
            <span data-neutro>{l.cuentanPorElLote}</span> envelopes count and
            can no longer be edited
            {l.separados.length > 0
              ? `; ${l.separados.join(", ")} ${l.separados.length === 1 ? "is" : "are"} confirmed separately with pnpm evidencia:confirmar.`
              : "."}
          </span>
        </p>
      ) : (
        <p className="hg-consecuencia" data-decision="a_revision_individual">
          <T
            t={{
              es: "El lote pasó a revisión individual: cada sobre se confirma por separado con pnpm evidencia:confirmar.",
              en: "The batch moved to individual review: each envelope is confirmed separately with pnpm evidencia:confirmar.",
            }}
          />
        </p>
      )}
    </section>
  );
}

function FilaDelPlanDeMuestreo({ f }: { f: FilaDeMuestreo }) {
  const tamano =
    f.hasta === null
      ? {
          es: `Lote de ${f.desde} o más`,
          en: `Batch of ${f.desde} or more`,
        }
      : {
          es: `Lote de ${f.desde} a ${f.hasta}`,
          en: `Batch of ${f.desde} to ${f.hasta}`,
        };
  return (
    <Par rotulo={tamano}>
      <span>
        {f.muestra === null ? (
          <T t={{ es: "Se revisan todos", en: "All are reviewed" }} />
        ) : (
          <T
            t={{
              es: `Se revisan ${f.muestra}`,
              en: `${f.muestra} are reviewed`,
            }}
          />
        )}
      </span>
    </Par>
  );
}

function ViaAdaptador({
  v,
  loteActivo,
  alElegirLote,
  selecciones,
  alElegirSobre,
}: {
  v: VistaDeCarga;
  loteActivo: string;
  alElegirLote: (id: string) => void;
  selecciones: Record<string, string>;
  alElegirSobre: (lote: string, sobre: string) => void;
}) {
  return (
    <>
      <p className="hg-menor">
        <T
          t={{
            es: "El archivo que produjo la herramienta se importa con el CLI: el adaptador lo lee una vez, arma un sobre por cada prueba del plan que esa herramienta corre y sugiere el veredicto con la regla de esa prueba. Aquí se ven los lotes ya importados.",
            en: "The file the tool produced is imported with the CLI: the adapter reads it once, builds one envelope per test in the plan that the tool runs and suggests the verdict with that test's rule. Here you see the batches already imported.",
          }}
        />
      </p>
      <div className="hg-pila">
        <div className="hg-selector" role="group" aria-label="Lotes · Batches">
          {v.lotes.map((l) => (
            <button
              key={l.id}
              type="button"
              className="hg-opcion"
              data-controlador="pestana"
              aria-pressed={l.id === loteActivo}
              onClick={() => alElegirLote(l.id)}
            >
              <span className="hg-opcion-titulo" data-neutro>
                {l.id}
              </span>
              <span>
                <span data-neutro>{l.herramienta.nombre}</span> ·{" "}
                <T
                  t={{
                    es: `${l.sobres.length} sobres`,
                    en: `${l.sobres.length} envelopes`,
                  }}
                />
              </span>
            </button>
          ))}
        </div>
        {v.lotes.map((l) => (
          <ZonaDeLote
            key={l.id}
            l={l}
            etiquetas={v.etiquetas}
            activo={l.id === loteActivo}
            seleccion={selecciones[l.id] ?? l.seleccionado}
            alElegir={(sobre) => alElegirSobre(l.id, sobre)}
          />
        ))}
      </div>
      <section className="hg-panel" aria-labelledby="muestra">
        <div className="hg-panel-cab">
          <h2 id="muestra">
            <T
              t={{
                es: "Cómo se elige la muestra",
                en: "How the sample is chosen",
              }}
            />
          </h2>
          <p className="hg-menor">
            <span lang="es">
              El plan de muestreo vive en datos: calidad límite{" "}
              <span data-neutro>{v.muestreo.calidadLimite} %</span>, riesgo del
              consumidor{" "}
              <span data-neutro>{v.muestreo.riesgoDelConsumidor} %</span> y
              aceptación con cero errores. Procedimiento:{" "}
              <span data-neutro>{v.muestreo.procedimiento}</span>.
            </span>
            <span lang="en">
              The sampling plan lives in data: limiting quality{" "}
              <span data-neutro>{v.muestreo.calidadLimite}%</span>,
              consumer&apos;s risk{" "}
              <span data-neutro>{v.muestreo.riesgoDelConsumidor}%</span> and
              acceptance on zero errors. Procedure:{" "}
              <span data-neutro>{v.muestreo.procedimiento}</span>.
            </span>
          </p>
        </div>
        <div className="hg-panel-cuerpo">
          <p className="hg-menor">
            <T
              t={{
                es: "Las fallidas y las parciales se revisan siempre, todas. De las demás se revisa una muestra cuyo tamaño depende del lote; con un lote pequeño, la muestra es el lote entero. Cada tamaño se comprueba con aritmética exacta al cargar el plan.",
                en: "Failed and partial ones are always reviewed, all of them. Of the rest a sample is reviewed, sized by the batch; with a small batch, the sample is the whole batch. Each size is checked with exact arithmetic when the plan loads.",
              }}
            />
          </p>
          <dl className="hg-propiedades hg-propiedades-en-columnas hg-propiedades-en-tres">
            {v.muestreo.filas.map((f) => (
              <FilaDelPlanDeMuestreo key={f.desde} f={f} />
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

function ViaPegada({ etiqueta }: { etiqueta: Etiqueta }) {
  return (
    <div className="hg-trabajo" data-formulario="">
      <section className="hg-panel" aria-labelledby="pegado">
        <div className="hg-panel-cab">
          <h2 id="pegado">
            <T t={{ es: "Texto de la herramienta", en: "Tool output" }} />
          </h2>
        </div>
        <div className="hg-panel-cuerpo hg-pila">
          <Sello
            etiqueta={etiqueta}
            atributos={{ "data-via-sin-construir": "" }}
          >
            <p>
              <T
                t={{
                  es: "El texto que devolvió una herramienta lo lee el extractor, una skill de Claude Code que corres tú con /extraer sobre un archivo de texto: escribe solo en la bandeja de propuestas y nunca confirma nada. Desde el navegador no se pega nada: aquí no hay campo ni botón, porque esta pantalla no ejecuta nada.",
                  en: "The text a tool returned is read by the extractor, a Claude Code skill that you run with /extraer on a text file: it writes only to the proposals inbox and never confirms anything. Nothing is pasted from the browser: there is no field or button here, because this screen runs nothing.",
                }}
              />
            </p>
          </Sello>
          <p className="hg-menor">
            <T
              t={{
                es: "Para un resultado que no viene de un archivo de Garak o de ZAP, usa «Sobre manual» o el extractor. El texto que lee el extractor nunca se guarda entero en el repositorio: solo su huella y un extracto redactado.",
                en: "For a result that does not come from a Garak or ZAP file, use “Manual envelope” or the extractor. The text the extractor reads is never stored whole in the repository: only its fingerprint and a redacted excerpt.",
              }}
            />
          </p>
        </div>
      </section>
    </div>
  );
}

function ViaManual({ etiquetas }: { etiquetas: VistaDeCarga["etiquetas"] }) {
  return (
    <div className="hg-trabajo" data-formulario="">
      <section className="hg-panel" aria-labelledby="manual">
        <div className="hg-panel-cab">
          <h2 id="manual">
            <T t={{ es: "Sobre manual", en: "Manual envelope" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "Para una prueba sin herramienta o una revisión hecha a mano.",
                en: "For a test with no tool or a review done by hand.",
              }}
            />
          </p>
        </div>
        <div className="hg-panel-cuerpo hg-pila">
          <p className="hg-menor">
            <T
              t={{
                es: "El sobre manual se registra con el CLI, no en pantalla: un archivo con esquema, con la herramienta y su versión, la fecha, quién lo ejecutó y lo que se midió. El veredicto lo calcula la regla de la prueba; «no ejecutada» no es «superada».",
                en: "The manual envelope is recorded with the CLI, not on screen: a file with a schema, with the tool and its version, the date, who ran it and what was measured. The verdict is computed by the test's rule; “not run” is not “passed”.",
              }}
            />
          </p>
          <ol className="hg-cadena">
            <li className={`hg-eslabon es-${etiquetas.paso_por_hacer.rol}`}>
              <Simbolo nombre={etiquetas.paso_por_hacer.simbolo} />
              <span className="hg-eslabon-titulo">
                <T
                  t={{ es: "Registrar el resultado", en: "Record the result" }}
                />
              </span>
              <Comando texto="pnpm evidencia:registrar <resultado.json> --crudo <archivo>" />
            </li>
            <li className={`hg-eslabon es-${etiquetas.paso_confirmar.rol}`}>
              <Simbolo nombre={etiquetas.paso_confirmar.simbolo} />
              <span className="hg-eslabon-titulo">
                <T
                  t={{
                    es: "Confirmarlo, uno por uno",
                    en: "Confirm it, one by one",
                  }}
                />
              </span>
              <Comando texto="pnpm evidencia:confirmar <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD" />
              <span className="hg-menor">
                <T
                  t={{
                    es: "Hasta entonces no cuenta; al confirmarlo queda inmutable.",
                    en: "Until then it does not count; once confirmed it is immutable.",
                  }}
                />
              </span>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}

export function CargaPantalla({ v }: { v: VistaDeCarga }) {
  const [via, setVia] = useState<Via>("adaptador");
  const [lote, setLote] = useState(v.lotes[0]?.id ?? "");
  const [selecciones, setSelecciones] = useState<Record<string, string>>({});
  const r = v.resumen;
  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Carga de evidencia", en: "Evidence intake" }} />
          </h1>
          <p className="hg-bajada">
            <T
              t={{
                es: "HackGuard no ejecuta pruebas: recibe lo que tus herramientas produjeron. Un resultado no cuenta hasta que una persona lo confirma.",
                en: "HackGuard does not run tests: it receives what your tools produced. A result does not count until a person confirms it.",
              }}
            />
          </p>
          {v.activos.map((a) => (
            <p key={a.id} className="hg-cabecera-meta">
              <span>
                <T t={{ es: "Activo", en: "Asset" }} />:{" "}
                <strong>
                  <T t={a.nombre} />
                </strong>
              </span>
              {a.huellaDelPlan === null ? null : (
                <span>
                  <T t={{ es: "Plan", en: "Plan" }} />{" "}
                  <Link href={`/activos/${a.id}/plan`}>
                    <Huella hex={a.huellaDelPlan} />
                  </Link>
                </span>
              )}
            </p>
          ))}
        </div>
        <ul
          className="hg-resumen"
          aria-label="Resumen de lo cargado · Summary of what was loaded"
        >
          <li>
            <span className="hg-cifra" data-neutro>
              {r.lotesPorConfirmar}
            </span>
            <span>
              <T t={{ es: "lotes por confirmar", en: "batches to confirm" }} />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {r.sobres}
            </span>
            <span>
              <T t={{ es: "sobres propuestos", en: "proposed envelopes" }} />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {r.nFallidas}
            </span>
            <Estado etiqueta={r.fallidas} />
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {r.nNoEjecutadas}
            </span>
            <Estado etiqueta={r.noEjecutada} />
          </li>
        </ul>
      </div>

      {v.lotes.length === 0 ? (
        <Aviso
          etiqueta={{ rol: "neutro", simbolo: "vacio" }}
          titulo={{ es: "No hay nada por confirmar", en: "Nothing to confirm" }}
        >
          <p>
            <T
              t={{
                es: "Corre las pruebas del plan con tus herramientas e importa aquí el resultado: el archivo de Garak o de ZAP, o un sobre hecho a mano.",
                en: "Run the plan's tests with your tools and import the result here: the Garak or ZAP file, or an envelope made by hand.",
              }}
            />
          </p>
        </Aviso>
      ) : (
        <div className="hg-pila" data-pestanas="" data-via={via}>
          <div
            className="hg-pestanas"
            role="group"
            aria-label="Vía de carga · Intake route"
          >
            {VIAS.map(({ valor, nombre }) => (
              <button
                key={valor}
                type="button"
                className="hg-pestana"
                data-controlador="pestana"
                aria-pressed={valor === via}
                onClick={() => setVia(valor)}
              >
                <T t={nombre} />
              </button>
            ))}
          </div>
          <div
            className="hg-pila"
            data-si-via="adaptador"
            hidden={via !== "adaptador"}
          >
            <ViaAdaptador
              v={v}
              loteActivo={lote}
              alElegirLote={setLote}
              selecciones={selecciones}
              alElegirSobre={(l, s) =>
                setSelecciones((antes) => ({ ...antes, [l]: s }))
              }
            />
          </div>
          <div
            className="hg-pila"
            data-si-via="pegado"
            hidden={via !== "pegado"}
          >
            <ViaPegada etiqueta={v.etiquetas.via_sin_construir} />
          </div>
          <div
            className="hg-pila"
            data-si-via="manual"
            hidden={via !== "manual"}
          >
            <ViaManual etiquetas={v.etiquetas} />
          </div>
        </div>
      )}
    </>
  );
}
