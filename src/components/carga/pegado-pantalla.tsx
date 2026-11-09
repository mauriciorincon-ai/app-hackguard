"use client";

import { useRef, useState } from "react";
import type { Etiqueta } from "@/lib/catalogo/tipos";
import {
  proponerDesdeTexto,
  TEXTO_DE_MOTIVO,
  type BrechaSiConfirmas,
  type CifrasDeBrecha,
  type MundoDePegado,
  type PropuestaDePegado,
  type ResultadoDePegado,
} from "@/lib/evidencia/pegado";
import { en as texto, useIdioma } from "../consola/idioma";
import { Aviso, Chip, Estado, Huella, Sello } from "../estado";
import { Dato, T } from "../texto";

/**
 * La vía «Texto pegado» de `/evidencia/carga`. Componente de CLIENTE y SIN EFECTOS FUERA DE LA PÁGINA: el texto que se pega vive solo en
 * el estado de React; se lee con el adaptador de siempre en el navegador, no se envía a ningún lado (cero peticiones), no se guarda
 * (ni localStorage, ni sessionStorage, ni IndexedDB) y no se vuelve a mostrar: solo su huella y el extracto que escribe el adaptador.
 * Lo que sale es una PROPUESTA: no cuenta hasta que una persona la confirma con el CLI. Nada se calcula aquí: la lectura, el veredicto, los
 * hallazgos que se abrirían y la brecha de antes y de después son funciones del motor (`proponerDesdeTexto`).
 */

type Estado_ =
  | { tipo: "quieto" }
  | { tipo: "leyendo" }
  | { tipo: "listo"; resultado: ResultadoDePegado };

const COMANDO_IMPORTAR =
  "pnpm evidencia:importar --garak <report.jsonl> | --zap <report.json> --activo <tu-activo> --por <tu-nombre>";
const COMANDO_CONFIRMAR =
  "pnpm evidencia:confirmar-lote <LOTE-NNNN> --por <tu-nombre> --fecha AAAA-MM-DD --revisados <n>";

function Comando({ texto: t }: { texto: string }) {
  return (
    <p>
      <span className="hg-dato hg-vector" data-neutro>
        {t}
      </span>
    </p>
  );
}

const FILAS: {
  clave: keyof CifrasDeBrecha;
  nombre: { es: string; en: string };
}[] = [
  {
    clave: "planeadas",
    nombre: { es: "Pruebas planeadas", en: "Planned tests" },
  },
  { clave: "ejecutadas", nombre: { es: "Ejecutadas", en: "Run" } },
  { clave: "superadas", nombre: { es: "Superadas", en: "Passed" } },
  { clave: "fallidas", nombre: { es: "Fallidas", en: "Failed" } },
  { clave: "noEjecutadas", nombre: { es: "Sin ejecutar", en: "Not run" } },
  {
    clave: "hallazgosQueCuentan",
    nombre: {
      es: "Hallazgos que cuentan como falla",
      en: "Findings that count as a failure",
    },
  },
  {
    clave: "controlesConFalla",
    nombre: { es: "Controles con falla", en: "Controls failing" },
  },
  {
    clave: "porConfirmar",
    nombre: { es: "Sobres por confirmar", en: "Envelopes to confirm" },
  },
];

const signo = (n: number) =>
  n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";

function ConfirmarTodo({ b }: { b: BrechaSiConfirmas }) {
  return (
    <table className="hg-tabla" data-antes-despues="">
      <caption className="hg-oculto">
        <T
          t={{
            es: "La brecha antes y después de confirmar lo propuesto",
            en: "The gap before and after confirming what is proposed",
          }}
        />
      </caption>
      <thead>
        <tr>
          <th scope="col">
            <T t={{ es: "Cifra", en: "Figure" }} />
          </th>
          <th scope="col">
            <T t={{ es: "Antes", en: "Before" }} />
          </th>
          <th scope="col">
            <T t={{ es: "Después", en: "After" }} />
          </th>
          <th scope="col">
            <T t={{ es: "Cambia", en: "Change" }} />
          </th>
        </tr>
      </thead>
      <tbody>
        {FILAS.map((f) => {
          const cambio = b.despues[f.clave] - b.antes[f.clave];
          return (
            <tr key={f.clave} data-cifra-pegado={f.clave}>
              <th scope="row">
                <T t={f.nombre} />
              </th>
              <td data-celda="antes">{b.antes[f.clave]}</td>
              <td data-celda="despues">{b.despues[f.clave]}</td>
              <td data-celda="cambio">{signo(cambio)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Propuesta({
  mundo,
  p,
  alDescargar,
}: {
  mundo: MundoDePegado;
  p: PropuestaDePegado;
  alDescargar: () => void;
}) {
  const b = p.brecha;
  const nombreDe = (id: string) => mundo.nombresDePruebas[id];
  const veredicto = (v: string | null): Etiqueta =>
    v === null
      ? mundo.etiquetas.controles.sin_evidencia
      : (mundo.etiquetas.veredictos[v] ??
        mundo.etiquetas.controles.sin_evidencia);
  return (
    <div className="hg-pila" data-pegado-resultado="">
      <section className="hg-panel" aria-labelledby="pegado-sobres">
        <div className="hg-panel-cab">
          <h2 id="pegado-sobres">
            <T t={{ es: "El sobre propuesto", en: "The proposed envelope" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "Un sobre por cada prueba del plan que midió el reporte. El veredicto lo calcula la regla de la prueba, no quien pegó el texto. Todavía no cuenta.",
                en: "One envelope for each test in the plan that the report measured. The verdict is computed by the test's rule, not by whoever pasted the text. It does not count yet.",
              }}
            />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Texto", en: "Text" }} />{" "}
              <Huella hex={p.huellaDelCrudo} />
            </span>
            <span>
              <T t={{ es: "Lote propuesto", en: "Proposed batch" }} />{" "}
              <Huella hex={p.lote.huellas.lote} />
            </span>
            <span>
              <T t={{ es: "Corrida del", en: "Run of" }} />{" "}
              <Dato>{p.fecha}</Dato>
            </span>
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T
              t={{
                es: "Sobres propuestos desde el texto pegado",
                en: "Envelopes proposed from the pasted text",
              }}
            />
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <T t={{ es: "Prueba", en: "Test" }} />
              </th>
              <th scope="col">
                <T t={{ es: "Veredicto", en: "Verdict" }} />
              </th>
              <th scope="col">
                <T t={{ es: "Lo que midió", en: "What it measured" }} />
              </th>
            </tr>
          </thead>
          <tbody>
            {p.resumen.map((s) => (
              <tr key={s.id} data-sobre-propuesto={s.id} data-prueba={s.prueba}>
                <td>
                  <Dato>{s.prueba}</Dato>
                  {nombreDe(s.prueba) === undefined ? null : (
                    <>
                      <br />
                      <span className="hg-menor">
                        <T t={nombreDe(s.prueba)!} />
                      </span>
                    </>
                  )}
                </td>
                <td>
                  <Estado etiqueta={veredicto(s.veredicto)} />
                </td>
                <td>
                  <span className="hg-menor">{s.extracto ?? ""}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {p.noAplican > 0 ? (
          <p className="hg-menor" data-no-aplican={p.noAplican}>
            <T
              t={{
                es: `${p.noAplican} prueba(s) del plan de esta herramienta no son de lo que midió el reporte y no reciben sobre.`,
                en: `${p.noAplican} test(s) in this tool's plan are not about what the report measured and get no envelope.`,
              }}
            />
          </p>
        ) : null}
        {p.advertencias.map((a, i) => (
          <p key={i} className="hg-menor">
            <T t={a} />
          </p>
        ))}
      </section>

      <section className="hg-panel" aria-labelledby="pegado-brecha">
        <div className="hg-panel-cab">
          <h2 id="pegado-brecha">
            <T
              t={{
                es: "La brecha antes y después, si lo confirmas",
                en: "The gap before and after, if you confirm it",
              }}
            />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "El «antes» es la brecha de la fecha de consulta, la misma del informe. El «después» es la misma cuenta con estos sobres como confirmados ese día. Es una vista previa: nada se confirmó ni se guardó.",
                en: "“Before” is the gap on the query date, the same as the report's. “After” is the same count with these envelopes confirmed that day. It is a preview: nothing was confirmed or saved.",
              }}
            />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Antes", en: "Before" }} />{" "}
              <Huella hex={b.antes.huella} />
            </span>
            <span>
              <T t={{ es: "Después", en: "After" }} />{" "}
              <Huella hex={b.despues.huella} />
            </span>
          </p>
        </div>
        <ConfirmarTodo b={b} />
        <div className="hg-panel-cuerpo hg-pila">
          {b.abririan.length > 0 ? (
            <p data-abririan={b.abririan.length}>
              <T
                t={{
                  es: `${b.abririan.length} falla(s) abrirían un hallazgo al confirmarse (${b.abririan.map((x) => x.prueba).join(", ")}). Su severidad la pones tú al confirmar: aquí no se estima.`,
                  en: `${b.abririan.length} failure(s) would open a finding once confirmed (${b.abririan.map((x) => x.prueba).join(", ")}). You set its severity when you confirm: it is not estimated here.`,
                }}
              />
            </p>
          ) : null}
          {b.controles.length === 0 ? (
            <p className="hg-menor" data-sin-cambio-de-controles="">
              <T
                t={{
                  es: "Ningún control cambia de estado con lo propuesto.",
                  en: "No control changes state with what is proposed.",
                }}
              />
            </p>
          ) : (
            <ul className="hg-lista" data-controles-que-cambian="">
              {b.controles.map((c) => (
                <li
                  key={c.id}
                  data-cambio-control={c.id}
                  data-sentido={c.sentido}
                >
                  <Dato>{c.id}</Dato>{" "}
                  {mundo.nombresDeControles[c.id] === undefined ? null : (
                    <span className="hg-menor">
                      <T t={mundo.nombresDeControles[c.id]!} />
                    </span>
                  )}{" "}
                  <Chip etiqueta={mundo.etiquetas.controles[c.de]} /> →{" "}
                  <Chip etiqueta={mundo.etiquetas.controles[c.a]} />{" "}
                  <span className="hg-menor">
                    <T
                      t={
                        c.sentido === "mejoro"
                          ? { es: "mejora", en: "improves" }
                          : { es: "empeora", en: "gets worse" }
                      }
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {b.pruebas.length > 0 ? (
            <ul className="hg-lista" data-pruebas-que-cambian="">
              {b.pruebas.map((c) => (
                <li key={c.prueba} data-cambio-prueba={c.prueba}>
                  <Dato>{c.prueba}</Dato> <Chip etiqueta={veredicto(c.de)} /> →{" "}
                  <Chip etiqueta={veredicto(c.a)} />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="hg-menor">
            <T
              t={{
                es: "Un hallazgo que ya está abierto solo lo cierra una re-prueba que una persona confirma: un resultado que supera la prueba no lo cierra, y que algo no aparezca en un reporte tampoco.",
                en: "A finding that is already open is only closed by a retest that a person confirms: a result that passes the test does not close it, and something missing from a report does not either.",
              }}
            />
          </p>
        </div>
      </section>

      <section className="hg-panel" aria-labelledby="pegado-confirmar">
        <div className="hg-panel-cab">
          <h2 id="pegado-confirmar">
            <T t={{ es: "Para que cuente", en: "To make it count" }} />
          </h2>
        </div>
        <div className="hg-panel-cuerpo hg-pila">
          <p className="hg-menor">
            <T
              t={{
                es: "Esta pantalla no confirma ni guarda nada. Para que el resultado cuente, importa el archivo con un activo propio (los activos demo no reciben archivos reales) y confírmalo con el CLI:",
                en: "This screen confirms and saves nothing. For the result to count, import the file with an asset of your own (demo assets take no real files) and confirm it with the CLI:",
              }}
            />
          </p>
          <Comando texto={COMANDO_IMPORTAR} />
          <Comando texto={COMANDO_CONFIRMAR} />
          <p>
            <button
              type="button"
              className="hg-boton"
              data-descargar-sobre=""
              onClick={alDescargar}
            >
              <T
                t={{
                  es: "Descargar sobre-propuesto.json",
                  en: "Download sobre-propuesto.json",
                }}
              />
            </button>
          </p>
          <p className="hg-menor">
            <T
              t={{
                es: "El archivo trae el lote y los sobres propuestos con sus huellas, sin el texto de la herramienta. Es un registro de lo que viste, no una entrada del CLI.",
                en: "The file carries the batch and the proposed envelopes with their fingerprints, without the tool's text. It is a record of what you saw, not a CLI input.",
              }}
            />
          </p>
        </div>
      </section>
    </div>
  );
}

/** Baja el sobre propuesto como archivo: un Blob de la página, sin el crudo y sin pasar por la red. */
function descargar(p: PropuestaDePegado) {
  const cuerpo = JSON.stringify(
    {
      formato: "hackguard/propuesta-pegada@1",
      nota: "Vista previa: no cuenta hasta que una persona lo confirma con el CLI. Sin el texto de la herramienta.",
      lote: p.lote,
      sobres: p.sobres,
    },
    null,
    2,
  );
  const url = URL.createObjectURL(
    new Blob([`${cuerpo}\n`], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "sobre-propuesto.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function PegadoPantalla({
  mundo,
  etiquetas,
}: {
  mundo: MundoDePegado;
  /** Las dos marcas de la vía, de datos: «Se lee en tu navegador» y «No se propuso ningún sobre». */
  etiquetas: { local: Etiqueta; sinSobre: Etiqueta };
}) {
  const idioma = useIdioma();
  const [activo, setActivo] = useState(mundo.activos[0]?.id ?? "");
  const delActivo = mundo.activos.find((a) => a.id === activo);
  const [herramienta, setHerramienta] = useState(
    delActivo?.herramientas[0]?.id ?? "",
  );
  const [pegado, setPegado] = useState("");
  const [fecha, setFecha] = useState("");
  const [zona, setZona] = useState("");
  const [estado, setEstadoCrudo] = useState<Estado_>({ tipo: "quieto" });
  // Cuenta de lecturas: una lectura que termina después de que la persona volvió a empezar (borró, cambió de activo o de herramienta) no
  // pisa el estado; descartar y volver a leer es siempre seguro.
  const lectura = useRef(0);
  const setEstado = (e: Estado_) => {
    if (e.tipo === "quieto") lectura.current += 1;
    setEstadoCrudo(e);
  };

  if (delActivo === undefined)
    return (
      <div className="hg-trabajo" data-formulario="">
        <Aviso
          etiqueta={etiquetas.sinSobre}
          titulo={{
            es: "Ningún activo con plan de Garak o de ZAP",
            en: "No asset with a Garak or ZAP plan",
          }}
        >
          <p>
            <T
              t={{
                es: "El texto pegado se lee contra el plan de un activo: aquí no hay ninguno que corra Garak o ZAP.",
                en: "Pasted text is read against an asset's plan: none here runs Garak or ZAP.",
              }}
            />
          </p>
        </Aviso>
      </div>
    );

  const leer = async () => {
    const mia = ++lectura.current;
    setEstadoCrudo({ tipo: "leyendo" });
    let resultado: ResultadoDePegado;
    try {
      resultado = await proponerDesdeTexto(mundo, {
        texto: pegado,
        activo,
        herramienta,
        fecha: fecha.trim() === "" ? null : fecha.trim(),
        zona: zona.trim() === "" ? null : zona.trim(),
      });
    } catch {
      // Un error inesperado no deja la pantalla en «Leyendo…» para siempre: se dice, sin volcar el texto ni el error.
      resultado = { ok: false, motivo: "lectura_fallida", detalle: null };
    }
    if (mia !== lectura.current) return;
    setEstadoCrudo({ tipo: "listo", resultado });
  };
  const resultado = estado.tipo === "listo" ? estado.resultado : null;

  return (
    <div className="hg-pila" data-pegado="">
      <div className="hg-trabajo" data-formulario="">
        <section className="hg-panel" aria-labelledby="pegado">
          <div className="hg-panel-cab">
            <h2 id="pegado">
              <T t={{ es: "Texto de la herramienta", en: "Tool output" }} />
            </h2>
          </div>
          <div className="hg-panel-cuerpo hg-pila">
            <Sello
              etiqueta={etiquetas.local}
              menor
              atributos={{ "data-via-local": "" }}
            >
              <p className="hg-menor">
                <T
                  t={{
                    es: "El texto se lee en esta página, con el mismo adaptador del CLI. No se envía a ningún lado, no se guarda y no se vuelve a mostrar: solo su huella y un extracto con números e identificadores. Se trata siempre como texto, nunca se ejecuta.",
                    en: "The text is read in this page, with the same adapter as the CLI. It is not sent anywhere, not saved and not shown again: only its fingerprint and an excerpt with numbers and identifiers. It is always treated as text, never executed.",
                  }}
                />
              </p>
            </Sello>
            <div className="hg-campos">
              <label className="hg-campo" htmlFor="pegado-activo">
                <span>
                  <T t={{ es: "Activo", en: "Asset" }} />
                </span>
                <select
                  id="pegado-activo"
                  value={activo}
                  onChange={(e) => {
                    setActivo(e.target.value);
                    setHerramienta(
                      mundo.activos.find((a) => a.id === e.target.value)
                        ?.herramientas[0]?.id ?? "",
                    );
                    setEstado({ tipo: "quieto" });
                  }}
                >
                  {mundo.activos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {texto(idioma, a.nombre)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hg-campo" htmlFor="pegado-herramienta">
                <span>
                  <T t={{ es: "Herramienta", en: "Tool" }} />
                </span>
                <select
                  id="pegado-herramienta"
                  value={herramienta}
                  onChange={(e) => {
                    setHerramienta(e.target.value);
                    setEstado({ tipo: "quieto" });
                  }}
                >
                  {delActivo.herramientas.map((h) => (
                    <option key={h.id} value={h.id}>
                      {texto(idioma, h.nombre)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="hg-campo" htmlFor="pegado-texto">
              <span>
                <T
                  t={{
                    es: "Pega aquí lo que te devolvió la herramienta",
                    en: "Paste here what the tool returned",
                  }}
                />
              </span>
              <textarea
                id="pegado-texto"
                rows={10}
                spellCheck={false}
                autoComplete="off"
                aria-describedby="pegado-ayuda"
                value={pegado}
                onChange={(e) => {
                  setPegado(e.target.value);
                  setEstado({ tipo: "quieto" });
                }}
              />
              <span className="hg-menor" id="pegado-ayuda">
                <T
                  t={{
                    es: "Pega el reporte entero: para Garak el archivo report.jsonl, para ZAP el JSON del reporte.",
                    en: "Paste the whole report: for Garak the report.jsonl file, for ZAP the report's JSON.",
                  }}
                />
              </span>
            </label>
            <div className="hg-campos">
              <label className="hg-campo" htmlFor="pegado-fecha">
                <span>
                  <T
                    t={{
                      es: "Fecha de la corrida (si el reporte no la trae)",
                      en: "Run date (if the report does not carry it)",
                    }}
                  />
                </span>
                <input
                  id="pegado-fecha"
                  type="text"
                  inputMode="numeric"
                  placeholder="AAAA-MM-DD"
                  autoComplete="off"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </label>
              <label className="hg-campo" htmlFor="pegado-zona">
                <span>
                  <T
                    t={{
                      es: "Zona horaria (si el reporte no la declara)",
                      en: "Time zone (if the report does not declare it)",
                    }}
                  />
                </span>
                <input
                  id="pegado-zona"
                  type="text"
                  placeholder="America/Bogota"
                  autoComplete="off"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                />
              </label>
            </div>
          </div>
        </section>
        <aside
          className="hg-carril"
          aria-label="Proponer un sobre desde el texto · Propose an envelope from the text"
        >
          <section className="hg-tarjeta hg-tarjeta-accion">
            <h2 className="hg-tarjeta-titulo">
              <T t={{ es: "Proponer", en: "Propose" }} />
            </h2>
            <button
              type="button"
              className="hg-boton hg-boton-primario"
              data-proponer=""
              disabled={estado.tipo === "leyendo"}
              onClick={() => void leer()}
            >
              <T t={{ es: "Proponer un sobre", en: "Propose an envelope" }} />
            </button>
            <button
              type="button"
              className="hg-boton hg-boton-discreto"
              data-borrar-texto=""
              disabled={pegado === ""}
              onClick={() => {
                setPegado("");
                setEstado({ tipo: "quieto" });
              }}
            >
              <T t={{ es: "Borrar el texto", en: "Clear the text" }} />
            </button>
          </section>
          <section className="hg-tarjeta">
            <h2 className="hg-tarjeta-titulo">
              <T
                t={{
                  es: "Qué pasa con el texto",
                  en: "What happens to the text",
                }}
              />
            </h2>
            <ol className="hg-cadena">
              <li className="hg-eslabon">
                <span className="hg-eslabon-titulo">
                  <T
                    t={{
                      es: "El adaptador lo lee aquí",
                      en: "The adapter reads it here",
                    }}
                  />
                </span>
                <span className="hg-menor">
                  <T
                    t={{
                      es: "En tu navegador, sin red.",
                      en: "In your browser, with no network.",
                    }}
                  />
                </span>
              </li>
              <li className="hg-eslabon">
                <span className="hg-eslabon-titulo">
                  <T
                    t={{
                      es: "La regla calcula el veredicto",
                      en: "The rule computes the verdict",
                    }}
                  />
                </span>
                <span className="hg-menor">
                  <T
                    t={{
                      es: "La de la prueba, no quien pega.",
                      en: "The test's rule, not whoever pastes.",
                    }}
                  />
                </span>
              </li>
              <li className="hg-eslabon">
                <span className="hg-eslabon-titulo">
                  <T t={{ es: "Tú lo confirmas", en: "You confirm it" }} />
                </span>
                <span className="hg-menor">
                  <T
                    t={{
                      es: "Hasta entonces, no cuenta.",
                      en: "Until then, it does not count.",
                    }}
                  />
                </span>
              </li>
            </ol>
          </section>
        </aside>
      </div>

      <div aria-live="polite">
        {estado.tipo === "leyendo" ? (
          <p className="hg-menor" data-leyendo="">
            <T t={{ es: "Leyendo el texto…", en: "Reading the text…" }} />
          </p>
        ) : null}
        {resultado !== null && !resultado.ok ? (
          <Aviso
            etiqueta={etiquetas.sinSobre}
            titulo={etiquetas.sinSobre.nombre}
          >
            <p data-pegado-error={resultado.motivo} role="alert">
              <T
                t={
                  TEXTO_DE_MOTIVO[resultado.motivo] ?? {
                    es: "El texto no se pudo leer.",
                    en: "The text could not be read.",
                  }
                }
              />
            </p>
            {resultado.motivo === "ya_importado" &&
            resultado.detalle !== null ? (
              <p className="hg-menor">
                <Dato>{resultado.detalle}</Dato>
              </p>
            ) : null}
          </Aviso>
        ) : null}
        {resultado !== null && resultado.ok ? (
          <Propuesta
            mundo={mundo}
            p={resultado.propuesta}
            alDescargar={() => descargar(resultado.propuesta)}
          />
        ) : null}
      </div>
    </div>
  );
}
