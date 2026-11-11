"use client";

import { useState } from "react";
import {
  armarPerfilPropuesto,
  FichaLeida,
  proponerDesdeFicha,
  type RasgoDeFicha,
  type TablaFichaARasgos,
} from "@/engine/activos/desde-ficha";
import { sha256 } from "@/engine/huella";
import { ETIQUETAS_DE_VISTAS as E } from "@/lib/catalogo/etiquetas";
import { en as texto, useIdioma } from "../consola/idioma";
import { Aviso, Chip, Estado, Sello } from "../estado";
import { Cabeceras } from "../cabeceras";
import { Dato, T } from "../texto";

/**
 * D2 · `/activos/desde-ficha`. Componente de CLIENTE y SIN EFECTOS FUERA DE LA PÁGINA: la ficha técnica de CV Viva se lee en el
 * navegador (no se sube, no se guarda, no se vuelve a mostrar entera) y la tabla `ficha-a-rasgos` propone, rasgo por rasgo, un valor
 * con el fragmento literal que lo respalda. Sin fragmento no hay propuesta. Lo que se propone no cuenta hasta que la persona lo acepta,
 * y lo aceptado baja como un perfil, no como un activo: sin alcance autorizado y reglas de enfrentamiento no hay plan (regla dura 5).
 * El texto de la ficha es dato inerte: se muestra como texto, escapado (regla dura 4).
 */

const MAX_BYTES = 1_000_000;
const ID = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

interface Rasgo {
  id: string;
  tipo: "booleano" | "opcion";
  nombre: { es: string; en: string };
}

type Lectura =
  | { tipo: "quieto" }
  | { tipo: "error"; motivo: "grande" | "no_json" | "contrato" }
  | {
      tipo: "listo";
      version: string;
      huella: string;
      propuestas: RasgoDeFicha[];
    };

const MOTIVO: Record<
  "sin_fragmento" | "conflicto" | "no_es_si_o_no",
  { es: string; en: string }
> = {
  sin_fragmento: {
    es: "Ningún texto de la ficha lo respalda.",
    en: "No text in the ficha backs it.",
  },
  conflicto: {
    es: "La ficha se contradice: decides tú.",
    en: "The ficha contradicts itself: you decide.",
  },
  no_es_si_o_no: {
    es: "No es de sí o no: lo dices tú.",
    en: "Not a yes/no trait: you say it.",
  },
};

const si = (v: boolean) =>
  v ? { es: "Sí", en: "Yes" } : { es: "No", en: "No" };

function Fragmento({ ruta, texto: t }: { ruta: string; texto: string }) {
  return (
    <blockquote className="hg-menor" data-fragmento="">
      <Dato>{ruta}</Dato>
      {": "}
      <q>{t}</q>
    </blockquote>
  );
}

/** Baja el perfil aceptado como archivo: un Blob de la página, sin la ficha y sin pasar por la red. */
function descargar(nombre: string, cuerpo: unknown) {
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(cuerpo, null, 2)}\n`], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DesdeFichaPantalla({
  tabla,
  rasgos,
}: {
  tabla: TablaFichaARasgos;
  rasgos: Rasgo[];
}) {
  const idioma = useIdioma();
  const [lectura, setLectura] = useState<Lectura>({ tipo: "quieto" });
  const [aceptados, setAceptados] = useState<ReadonlySet<string>>(new Set());
  const [id, setId] = useState("");
  const [por, setPor] = useState("");
  const [fecha, setFecha] = useState("");

  const nombreDe = (r: string) =>
    rasgos.find((x) => x.id === r)?.nombre ?? { es: r, en: r };

  const alElegir = async (archivo: File | undefined) => {
    setAceptados(new Set());
    if (archivo === undefined) return setLectura({ tipo: "quieto" });
    if (archivo.size > MAX_BYTES)
      return setLectura({ tipo: "error", motivo: "grande" });
    let bytes: string;
    let json: unknown;
    try {
      bytes = await archivo.text();
      json = JSON.parse(bytes);
    } catch {
      return setLectura({ tipo: "error", motivo: "no_json" });
    }
    const ficha = FichaLeida.safeParse(json);
    if (!ficha.success)
      return setLectura({ tipo: "error", motivo: "contrato" });
    setLectura({
      tipo: "listo",
      version: ficha.data.schema_version,
      huella: await sha256(bytes),
      propuestas: proponerDesdeFicha(ficha.data, tabla, rasgos),
    });
  };

  const propuestas = lectura.tipo === "listo" ? lectura.propuestas : [];
  const nPropuestos = propuestas.filter((p) => p.estado === "propuesto").length;
  const elegidos = propuestas.filter(
    (p) => p.estado === "propuesto" && aceptados.has(p.rasgo),
  );
  const datosOk = ID.test(id) && por.trim() !== "" && FECHA.test(fecha);
  const puedeBajar = lectura.tipo === "listo" && elegidos.length > 0 && datosOk;
  const comando = `pnpm activo:desde-ficha <ficha.json> --aceptar ${
    elegidos.map((p) => p.rasgo).join(",") || "<rasgos>"
  } --por ${por.trim() || "<tu-nombre>"} --id ${id || "<id>"} --fecha ${fecha || "AAAA-MM-DD"} --salida datos/privado/activos/${id || "<id>"}.perfil.json`;

  const alDescargar = () => {
    if (lectura.tipo !== "listo" || !puedeBajar) return;
    const perfil = armarPerfilPropuesto({
      id,
      por: por.trim(),
      fecha,
      fichaVersion: lectura.version,
      fichaHuella: lectura.huella,
      propuestas: lectura.propuestas,
      confirmados: aceptados,
    });
    descargar(`${id}.perfil.json`, perfil);
  };

  const alternar = (rasgo: string) =>
    setAceptados((antes) => {
      const ahora = new Set(antes);
      if (ahora.has(rasgo)) ahora.delete(rasgo);
      else ahora.add(rasgo);
      return ahora;
    });

  return (
    <div className="hg-pila" data-desde-ficha="">
      <div className="hg-cabecera">
        <div>
          <h1>
            <T
              t={{ es: "Perfil desde la ficha", en: "Profile from the ficha" }}
            />
          </h1>
          <p className="hg-bajada">
            <T
              t={{
                es: "Suelta la ficha técnica de CV Viva y HackGuard propone el perfil de un activo, rasgo por rasgo, con el texto de la ficha que lo respalda. Lo que ningún texto respalda queda sin responder.",
                en: "Drop the CV Viva technical ficha and HackGuard proposes an asset's profile, trait by trait, with the ficha text that backs it. What no text backs stays unanswered.",
              }}
            />
          </p>
        </div>
      </div>

      <section className="hg-panel" aria-labelledby="ficha-archivo">
        <div className="hg-panel-cab">
          <h2 id="ficha-archivo">
            <T t={{ es: "La ficha", en: "The ficha" }} />
          </h2>
        </div>
        <div className="hg-panel-cuerpo hg-pila">
          <Sello etiqueta={E.ficha_propuesto} menor>
            <p className="hg-menor">
              <T
                t={{
                  es: "La ficha se lee en esta página. No se sube, no se guarda y no se vuelve a mostrar entera: solo los fragmentos que respaldan un rasgo, como texto. Es una propuesta, no un activo.",
                  en: "The ficha is read in this page. It is not uploaded, not saved and not shown again in full: only the fragments that back a trait, as text. It is a proposal, not an asset.",
                }}
              />
            </p>
          </Sello>
          <label className="hg-campo" htmlFor="ficha-archivo-entrada">
            <span>
              <T
                t={{
                  es: "Archivo de la ficha (.json)",
                  en: "Ficha file (.json)",
                }}
              />
            </span>
            <input
              id="ficha-archivo-entrada"
              type="file"
              accept="application/json,.json"
              data-ficha-entrada=""
              onChange={(e) => void alElegir(e.target.files?.[0])}
            />
          </label>
          <div role="status" aria-live="polite" data-ficha-estado="">
            {lectura.tipo === "error" ? (
              <Aviso
                etiqueta={E.catalogo_con_error}
                titulo={{
                  es: "No se pudo leer la ficha",
                  en: "The ficha could not be read",
                }}
              >
                <p>
                  <T
                    t={
                      lectura.motivo === "grande"
                        ? {
                            es: "El archivo pesa más de 1 MB: una ficha no es tan grande.",
                            en: "The file is over 1 MB: a ficha is not that large.",
                          }
                        : lectura.motivo === "no_json"
                          ? {
                              es: "El archivo no es JSON.",
                              en: "The file is not JSON.",
                            }
                          : {
                              es: "El archivo no cumple el contrato 1.x de la ficha técnica de CV Viva.",
                              en: "The file does not meet the CV Viva technical ficha 1.x contract.",
                            }
                    }
                  />
                </p>
              </Aviso>
            ) : null}
            {lectura.tipo === "listo" ? (
              <p className="hg-menor" data-ficha-leida="">
                <T
                  t={{
                    es: `Ficha ${lectura.version} leída: ${nPropuestos} rasgos propuestos y ${propuestas.length - nPropuestos} sin responder.`,
                    en: `Ficha ${lectura.version} read: ${nPropuestos} traits proposed and ${propuestas.length - nPropuestos} unanswered.`,
                  }}
                />
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {lectura.tipo === "listo" ? (
        <>
          <section className="hg-panel" aria-labelledby="ficha-propuestos">
            <div className="hg-panel-cab">
              <h2 id="ficha-propuestos">
                <T t={{ es: "Rasgos propuestos", en: "Proposed traits" }} />
              </h2>
              <p className="hg-menor">
                <T
                  t={{
                    es: "Acepta los que estés de acuerdo; ninguno cuenta hasta que lo aceptas.",
                    en: "Accept the ones you agree with; none counts until you accept it.",
                  }}
                />
              </p>
            </div>
            <table className="hg-tabla">
              <caption className="hg-oculto">
                <T t={{ es: "Rasgos propuestos", en: "Proposed traits" }} />
              </caption>
              <Cabeceras
                columnas={[
                  { es: "Rasgo", en: "Trait" },
                  { es: "Valor propuesto", en: "Proposed value" },
                  {
                    es: "Texto de la ficha que lo respalda",
                    en: "Ficha text that backs it",
                  },
                  { es: "Tu decisión", en: "Your decision" },
                ]}
              />
              <tbody>
                {propuestas.flatMap((p) =>
                  p.estado === "propuesto"
                    ? [
                        <tr
                          key={p.rasgo}
                          data-rasgo={p.rasgo}
                          data-estado="propuesto"
                        >
                          <td data-celda="id">
                            <p>
                              <T t={nombreDe(p.rasgo)} />
                            </p>
                            <p className="hg-menor">
                              <Dato>{p.rasgo}</Dato>
                            </p>
                          </td>
                          <td>
                            <strong>
                              <T t={si(p.valor)} />
                            </strong>
                          </td>
                          <td>
                            <Fragmento
                              ruta={p.cita.fragmento.ruta}
                              texto={p.cita.fragmento.texto}
                            />
                          </td>
                          <td data-celda="estado">
                            <label className="hg-campo-marca">
                              <input
                                type="checkbox"
                                checked={aceptados.has(p.rasgo)}
                                onChange={() => alternar(p.rasgo)}
                                aria-label={`${texto(idioma, { es: "Aceptar", en: "Accept" })}: ${texto(idioma, nombreDe(p.rasgo))}`}
                              />{" "}
                              {aceptados.has(p.rasgo) ? (
                                <Estado etiqueta={E.ficha_aceptado} />
                              ) : (
                                <Chip etiqueta={E.ficha_propuesto} />
                              )}
                            </label>
                          </td>
                        </tr>,
                      ]
                    : [],
                )}
              </tbody>
            </table>
          </section>

          <section className="hg-panel" aria-labelledby="ficha-sin-responder">
            <div className="hg-panel-cab">
              <h2 id="ficha-sin-responder">
                <T t={{ es: "Sin responder", en: "Unanswered" }} />
              </h2>
              <p className="hg-menor">
                <T
                  t={{
                    es: "Sin fragmento no hay propuesta: estos los dices tú, en el perfil del activo.",
                    en: "No fragment, no proposal: you say these yourself, in the asset's profile.",
                  }}
                />
              </p>
            </div>
            <table className="hg-tabla">
              <caption className="hg-oculto">
                <T t={{ es: "Sin responder", en: "Unanswered" }} />
              </caption>
              <Cabeceras
                columnas={[
                  { es: "Rasgo", en: "Trait" },
                  { es: "Por qué", en: "Why" },
                  { es: "Estado", en: "Status" },
                ]}
              />
              <tbody>
                {propuestas.flatMap((p) =>
                  p.estado === "sin_responder"
                    ? [
                        <tr
                          key={p.rasgo}
                          data-rasgo={p.rasgo}
                          data-estado="sin_responder"
                        >
                          <td data-celda="id">
                            <p>
                              <T t={nombreDe(p.rasgo)} />
                            </p>
                            <p className="hg-menor">
                              <Dato>{p.rasgo}</Dato>
                            </p>
                          </td>
                          <td>
                            <p className="hg-menor">
                              <T t={MOTIVO[p.motivo]} />
                            </p>
                            {p.citas.map((c) => (
                              <div key={`${c.regla}-${c.fragmento.ruta}`}>
                                <strong>
                                  <T t={si(c.valor)} />
                                </strong>
                                <Fragmento
                                  ruta={c.fragmento.ruta}
                                  texto={c.fragmento.texto}
                                />
                              </div>
                            ))}
                          </td>
                          <td data-celda="estado">
                            <Chip etiqueta={E.ficha_sin_responder} />
                          </td>
                        </tr>,
                      ]
                    : [],
                )}
              </tbody>
            </table>
          </section>

          <section className="hg-panel" aria-labelledby="ficha-guardar">
            <div className="hg-panel-cab">
              <h2 id="ficha-guardar">
                <T
                  t={{
                    es: "Guardar lo aceptado",
                    en: "Save what you accepted",
                  }}
                />
              </h2>
            </div>
            <div className="hg-panel-cuerpo hg-pila">
              <p className="hg-menor">
                <T
                  t={{
                    es: "Baja un perfil con solo lo que aceptaste, o guárdalo con el CLI en datos/privado/. No es un activo: falta el alcance autorizado y las reglas de enfrentamiento, y sin ellos no hay plan.",
                    en: "Download a profile with only what you accepted, or save it with the CLI under datos/privado/. It is not an asset: the authorized scope and the rules of engagement are missing, and without them there is no plan.",
                  }}
                />
              </p>
              <div className="hg-campos">
                <label className="hg-campo" htmlFor="ficha-id">
                  <span>
                    <T
                      t={{
                        es: "Identificador del activo",
                        en: "Asset identifier",
                      }}
                    />
                  </span>
                  <input
                    id="ficha-id"
                    value={id}
                    onChange={(e) => setId(e.target.value.trim())}
                    placeholder="act-mi-asistente"
                    autoComplete="off"
                    aria-invalid={id !== "" && !ID.test(id)}
                  />
                </label>
                <label className="hg-campo" htmlFor="ficha-por">
                  <span>
                    <T t={{ es: "Quién lo acepta", en: "Who accepts it" }} />
                  </span>
                  <input
                    id="ficha-por"
                    value={por}
                    onChange={(e) => setPor(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label className="hg-campo" htmlFor="ficha-fecha">
                  <span>
                    <T
                      t={{ es: "Fecha (AAAA-MM-DD)", en: "Date (YYYY-MM-DD)" }}
                    />
                  </span>
                  <input
                    id="ficha-fecha"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value.trim())}
                    placeholder="2026-11-10"
                    autoComplete="off"
                    aria-invalid={fecha !== "" && !FECHA.test(fecha)}
                  />
                </label>
              </div>
              <p>
                <span className="hg-dato hg-vector" data-neutro data-comando="">
                  {comando}
                </span>
              </p>
              <p>
                <button
                  type="button"
                  className="hg-boton"
                  data-descargar-perfil=""
                  disabled={!puedeBajar}
                  onClick={alDescargar}
                >
                  <T
                    t={{
                      es: "Descargar perfil propuesto",
                      en: "Download proposed profile",
                    }}
                  />
                </button>
              </p>
              {!puedeBajar ? (
                <p className="hg-menor" data-sin-descarga="">
                  <T
                    t={{
                      es: "Sin aceptar al menos un rasgo, y sin identificador, nombre y fecha, no hay descarga.",
                      en: "Without accepting at least one trait, and without an identifier, a name and a date, there is no download.",
                    }}
                  />
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
