import Link from "next/link";
import { pruebas } from "@/lib/catalogo/etiquetas";
import type { Bilingue, FilaPlaneada, VistaDePlan } from "@/lib/activos/tipos";
import { LineaDeCabecera, Par, SelectorDeActivos } from "../activos/piezas";
import { Chip, Estado, Fechado, Huella, Sello } from "../estado";
import { Dato, T } from "../texto";

/**
 * La pantalla `/activos/<id>/plan` (maqueta `docs/diseno/plan-<id>.html`). Componente de SERVIDOR. El plan lo calculó el motor
 * y se emitió con huella: aquí solo se lee. Cada exclusión dice su motivo con marca y texto; la cobertura marca los controles
 * sin prueba; el paquete de ejecución es declarativo y se descarga como el mismo archivo que escribe el CLI.
 */

const COLUMNAS_PLANEADAS = [
  { es: "Prueba", en: "Test" },
  {
    es: "Qué se espera y por qué aplica",
    en: "What is expected and why it applies",
  },
  { es: "Prioridad", en: "Priority" },
  { es: "Herramienta", en: "Tool" },
  { es: "Controles", en: "Controls" },
];
const COLUMNAS_EXCLUIDAS = [
  { es: "Prueba", en: "Test" },
  { es: "Nombre", en: "Name" },
  { es: "Motivo", en: "Reason" },
  { es: "Por qué queda fuera", en: "Why it is left out" },
];
const COLUMNAS_COBERTURA = [
  { es: "Control", en: "Control" },
  {
    es: "Qué exige, con palabras propias",
    en: "What it requires, in our own words",
  },
  { es: "Cobertura", en: "Coverage" },
  { es: "Pruebas del plan", en: "Tests in the plan" },
];

function Cabeceras({ columnas }: { columnas: Bilingue[] }) {
  return (
    <thead>
      <tr>
        {columnas.map((c) => (
          <th key={c.es} scope="col">
            <T t={c} />
          </th>
        ))}
      </tr>
    </thead>
  );
}

const enLista = (partes: string[], y: string) =>
  partes.length > 1
    ? `${partes.slice(0, -1).join(", ")} ${y} ${partes.at(-1)}`
    : (partes[0] ?? "");

function Prioridad({ p }: { p: FilaPlaneada["prioridad"] }) {
  const texto: Bilingue =
    p.razones.length === 0
      ? {
          es: `Base ${p.base}, sin ajustes`,
          en: `Base ${p.base}, no adjustments`,
        }
      : {
          es: `Base ${p.base}, +${p.ajuste} por ${enLista(
            p.razones.map((r) => r.es),
            "y",
          )}`,
          en: `Base ${p.base}, +${p.ajuste} for ${enLista(
            p.razones.map((r) => r.en),
            "and",
          )}`,
        };
  return (
    <>
      <p>
        <span className="hg-cifra-menor" data-neutro>
          {p.final}
        </span>{" "}
        <span className="hg-menor">
          <T t={{ es: "de 5", en: "of 5" }} />
        </span>
      </p>
      <p className="hg-menor">
        <T t={texto} />
      </p>
    </>
  );
}

export function PlanPantalla({ v }: { v: VistaDePlan }) {
  const e = v.etiquetas;
  if (v.plan === null) {
    return (
      <div className="hg-pila" data-plan-de={v.id}>
        <SelectorDeActivos items={v.selector} hacia="plan" />
        <div className="hg-cabecera">
          <div>
            <LineaDeCabecera v={v} chip={e.sinPlan} />
            <h1>
              <T t={{ es: "Plan de pruebas", en: "Test plan" }} />
            </h1>
            <p className="hg-bajada">
              <span lang="es">
                {v.nombre.es} todavía no puede recibir plan.
              </span>
              <span lang="en">{v.nombre.en} cannot receive a plan yet.</span>
            </p>
          </div>
        </div>
        <Sello etiqueta={e.sinAutorizacion}>
          <p>
            <span lang="es">
              Falta el alcance autorizado y las reglas de enfrentamiento.
              Se declaran en el archivo del activo y el plan se emite con
              pnpm plan:emitir. Mientras tanto, mira{" "}
              <Link href={`/activos/${v.id}`}>la página del activo</Link>.
            </span>
            <span lang="en">
              The authorized scope and the rules of engagement are missing.
              They are declared in the asset&apos;s file and the plan is issued
              with pnpm plan:emitir. Meanwhile, see{" "}
              <Link href={`/activos/${v.id}`}>the asset&apos;s page</Link>.
            </span>
          </p>
        </Sello>
      </div>
    );
  }

  const p = v.plan;
  const r = p.resumen;
  return (
    <div className="hg-pila" data-plan-de={v.id}>
      <SelectorDeActivos items={v.selector} hacia="plan" />
      <div className="hg-cabecera">
        <div>
          <LineaDeCabecera v={v} chip={e.autorizado} />
          <h1>
            <T t={{ es: "Plan de pruebas", en: "Test plan" }} />
          </h1>
          <p className="hg-bajada">
            <span lang="es">
              {v.nombre.es}: las pruebas que le aplican según su perfil, dentro
              de lo que su dueño autorizó.
            </span>
            <span lang="en">
              {v.nombre.en}: the tests that apply given its profile, within what
              its owner authorized.
            </span>
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Activo", en: "Asset" }} />{" "}
              <Link href={`/activos/${v.id}`}>
                <Dato>{v.id}</Dato>
              </Link>
            </span>
            <span>
              <T t={{ es: "Instantánea", en: "Snapshot" }} />{" "}
              <Dato>{p.instantanea.nombre}</Dato>
            </span>
            <span>
              <T t={{ es: "Emitido", en: "Issued" }} /> <Dato>{p.fecha}</Dato>
            </span>
            <span>
              <Huella hex={p.huella} />
            </span>
          </p>
        </div>
        <span id="rotulo-resumen" className="hg-oculto">
          <T t={{ es: "Resumen del plan", en: "Plan summary" }} />
        </span>
        <ul className="hg-resumen" aria-labelledby="rotulo-resumen">
          <li>
            <span className="hg-cifra" data-neutro>
              {r.planeadas}
            </span>
            <span>
              <T t={{ es: "planeadas", en: "planned" }} />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {r.excluidas}
            </span>
            <span>
              <T t={{ es: "excluidas", en: "excluded" }} />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {r.conPrueba}
            </span>
            <Estado etiqueta={e.resumenConPrueba} />
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {r.sinPrueba}
            </span>
            <Estado etiqueta={e.resumenSinPrueba} />
          </li>
        </ul>
      </div>

      <section className="hg-panel" aria-labelledby="planeadas">
        <div className="hg-panel-cab">
          <h2 id="planeadas">
            <T t={{ es: "Pruebas planeadas", en: "Planned tests" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "De mayor a menor prioridad: la base de la prueba más lo que el perfil del activo le suma.",
                en: "From highest to lowest priority: the test's base plus what the asset's profile adds.",
              }}
            />
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T t={{ es: "Pruebas planeadas", en: "Planned tests" }} />
          </caption>
          <Cabeceras columnas={COLUMNAS_PLANEADAS} />
          <tbody>
            {p.planeadas.map((f) => (
              <tr
                key={f.id}
                data-planeada={f.id}
                data-agregada={f.agregada ? "" : undefined}
              >
                <td data-celda="id">
                  <Dato>{f.id}</Dato>
                </td>
                <td data-celda="principal">
                  <p>
                    <strong>
                      <Link
                        className="hg-enlace-fila"
                        href={`/catalogo/${f.id}`}
                      >
                        <T t={f.nombre} />
                      </Link>
                    </strong>
                  </p>
                  <p>
                    <T t={f.esperado} />
                  </p>
                  {f.agregada ? (
                    <>
                      <p>
                        <Chip etiqueta={e.agregada} />
                      </p>
                      <p className="hg-menor">
                        <T
                          t={{
                            es: "El perfil no la pide; la agregaste porque:",
                            en: "The profile does not call for it; you added it because:",
                          }}
                        />{" "}
                        <span data-justificacion>
                          <T t={f.agregada.justificacion} />
                        </span>
                      </p>
                    </>
                  ) : f.razon ? (
                    <p className="hg-menor">
                      <T t={{ es: "Aplica porque:", en: "Applies because:" }} />{" "}
                      <T t={f.razon} />
                    </p>
                  ) : null}
                </td>
                <td data-celda="estado">
                  <Prioridad p={f.prioridad} />
                </td>
                <td>
                  {f.herramienta ? (
                    <>
                      <p>
                        <span data-neutro>{f.herramienta.nombre}</span>
                      </p>
                      <p className="hg-menor">
                        <T t={f.herramienta.entorno} />
                        {f.herramienta.k ? (
                          <>
                            {" · "}
                            <span data-neutro>k = {f.herramienta.k}</span>
                          </>
                        ) : null}
                      </p>
                      <Fechado
                        vigencia={f.herramienta.vigencia}
                        rotulo={{ es: "Verificada", en: "Verified" }}
                      />
                    </>
                  ) : (
                    <p className="hg-menor">
                      <T
                        t={{
                          es: "Sin herramienta: ningún entorno del activo cubre las que recomienda el catálogo.",
                          en: "No tool: no environment of the asset covers the ones the catalog recommends.",
                        }}
                      />
                    </p>
                  )}
                </td>
                <td>
                  {f.controles.length ? (
                    f.controles.map((c) => (
                      <p key={c}>
                        <Dato>{c}</Dato>
                      </p>
                    ))
                  ) : (
                    <p className="hg-menor">
                      <T
                        t={{
                          es: "Sin control asignado",
                          en: "No control assigned",
                        }}
                      />
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hg-panel" aria-labelledby="excluidas">
        <div className="hg-panel-cab">
          <h2 id="excluidas">
            <T
              t={{
                es: "Excluidas, con su razón",
                en: "Excluded, with a reason",
              }}
            />
          </h2>
          <p className="hg-menor">
            <span lang="es">
              Ninguna prueba de las familias del activo desaparece sin
              explicación. Las <span data-neutro>{r.otrasFamilias}</span> de
              otras familias no se consideran.
            </span>
            <span lang="en">
              No test from the asset&apos;s families disappears without an
              explanation. The <span data-neutro>{r.otrasFamilias}</span> from
              other families are not considered.
            </span>
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T t={{ es: "Pruebas excluidas", en: "Excluded tests" }} />
          </caption>
          <Cabeceras columnas={COLUMNAS_EXCLUIDAS} />
          <tbody>
            {p.excluidas.map((x) => (
              <tr key={x.id} data-excluida={x.id} data-motivo={x.motivo}>
                <td data-celda="id">
                  <Dato>{x.id}</Dato>
                </td>
                <td>
                  <p>
                    <Link className="hg-enlace-fila" href={`/catalogo/${x.id}`}>
                      <T t={x.nombre} />
                    </Link>
                  </p>
                </td>
                <td data-celda="estado">
                  <Chip etiqueta={x.etiqueta} />
                </td>
                <td>
                  <p className="hg-menor">
                    {x.introduce ? (
                      <>
                        <T t={x.introduce} />{" "}
                      </>
                    ) : null}
                    <T t={x.razon} />
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hg-panel" aria-labelledby="cobertura">
        <div className="hg-panel-cab">
          <h2 id="cobertura">
            <T
              t={{
                es: "Cobertura esperada por control",
                en: "Expected coverage by control",
              }}
            />
          </h2>
          <p className="hg-menor">
            <span lang="es">
              Qué controles tendrán evidencia cuando el plan se ejecute.{" "}
              <span data-neutro>{r.planeadasSinControl}</span> pruebas del plan
              no dan evidencia a ningún control.
            </span>
            <span lang="en">
              Which controls will have evidence once the plan runs.{" "}
              <span data-neutro>{r.planeadasSinControl}</span> tests in the plan
              give evidence to no control.
            </span>
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T t={{ es: "Cobertura por control", en: "Coverage by control" }} />
          </caption>
          <Cabeceras columnas={COLUMNAS_COBERTURA} />
          <tbody>
            {p.cobertura.map((c) => (
              <tr key={c.control}>
                <td data-celda="id">
                  <Dato>{c.control}</Dato>
                </td>
                <td>
                  <p>
                    <T t={c.resumen} />
                  </p>
                </td>
                <td data-celda="estado">
                  {c.pruebas.length ? (
                    <Estado
                      etiqueta={{
                        ...e.conPrueba,
                        nombre: pruebas(c.pruebas.length),
                      }}
                    />
                  ) : (
                    <Chip etiqueta={e.sinPruebaCorto} />
                  )}
                </td>
                <td>
                  {c.pruebas.length ? (
                    <p>
                      {c.pruebas.map((id, n) => (
                        <span key={id}>
                          {n > 0 ? " · " : ""}
                          <Link
                            className="hg-enlace-fila"
                            href={`/catalogo/${id}`}
                          >
                            <Dato>{id}</Dato>
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="hg-menor">
                      <T
                        t={{
                          es: "Las pruebas que lo cubrían quedaron fuera de este plan.",
                          en: "The tests that covered it were left out of this plan.",
                        }}
                      />
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hg-panel" aria-labelledby="paquete">
        <div className="hg-panel-cab">
          <h2 id="paquete">
            <T t={{ es: "Paquete de ejecución", en: "Execution package" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "Declarativo: dice qué correr y con qué límites, y no trae ninguna carga.",
                en: "Declarative: it says what to run and within which limits, and carries no payload.",
              }}
            />
          </p>
        </div>
        <div className="hg-panel-cuerpo">
          <ul className="hg-rejilla">
            {p.paquetes.map((c) => (
              <li key={c.clave} className="hg-caja">
                <p className="hg-caja-titulo">
                  <span data-neutro>{c.nombre}</span>
                </p>
                <dl className="hg-propiedades">
                  {c.versionMinima ? (
                    <Par
                      rotulo={{ es: "Versión mínima", en: "Minimum version" }}
                    >
                      <Dato>{c.versionMinima}</Dato>
                    </Par>
                  ) : null}
                  <Par rotulo={{ es: "Dónde corre", en: "Where it runs" }}>
                    <span>
                      <T t={c.entorno} />
                    </span>
                  </Par>
                  <Par
                    rotulo={{
                      es: "Cómo vuelve el resultado",
                      en: "How the result comes back",
                    }}
                  >
                    <span>
                      <T
                        t={
                          c.adaptador
                            ? {
                                es: "Adaptador definido; esta versión no lo lee",
                                en: "Adapter defined; this version does not read it",
                              }
                            : {
                                es: "Texto pegado o carga manual",
                                en: "Pasted text or manual entry",
                              }
                        }
                      />
                    </span>
                  </Par>
                  <Par rotulo={{ es: "Pruebas", en: "Tests" }}>
                    <ul className="hg-lista hg-lista-datos">
                      {c.pruebas.map((x) => (
                        <li key={x.id}>
                          <Dato>{x.id}</Dato>
                          {" · "}
                          {typeof x.selector === "string" ? (
                            <Dato>{x.selector}</Dato>
                          ) : (
                            <T t={x.selector} />
                          )}
                          {x.k ? (
                            <>
                              {" · "}
                              <Dato>{`k = ${x.k}`}</Dato>
                            </>
                          ) : null}{" "}
                          <span className="hg-menor">
                            <T t={x.regla} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Par>
                </dl>
              </li>
            ))}
          </ul>
        </div>
        <div className="hg-panel-cuerpo">
          <div className="hg-contraste">
            <div>
              <p className="hg-rotulo">
                <T t={{ es: "Alcance y límites", en: "Scope and limits" }} />
              </p>
              <dl className="hg-propiedades">
                <Par rotulo={{ es: "Cuándo", en: "When" }}>
                  <span>
                    <T t={p.alcance.ventana} />
                  </span>
                </Par>
                <Par rotulo={{ es: "Límites de carga", en: "Load limits" }}>
                  <span>
                    <T t={p.alcance.limites} />
                  </span>
                </Par>
              </dl>
            </div>
            <div>
              <p className="hg-rotulo">
                <T
                  t={{
                    es: "Reglas de enfrentamiento",
                    en: "Rules of engagement",
                  }}
                />
              </p>
              <ul className="hg-lista">
                {p.reglas.map((t, i) => (
                  <li key={i}>
                    <T t={t} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="hg-panel-cuerpo">
          <dl className="hg-propiedades hg-propiedades-en-columnas">
            <Par
              rotulo={{ es: "Huella del paquete", en: "Package fingerprint" }}
            >
              <span className="hg-huella-completa" data-neutro>
                {p.paquete.huella}
              </span>
            </Par>
            <Par
              rotulo={{
                es: "Huella de la instantánea",
                en: "Snapshot fingerprint",
              }}
            >
              <span className="hg-huella-completa" data-neutro>
                {p.instantanea.huella}
              </span>
            </Par>
          </dl>
        </div>
        <div className="hg-decision">
          <p className="hg-menor">
            <T
              t={{
                es: "Corre las pruebas con tus herramientas, dentro de estos límites. Es el mismo archivo que escribe el comando que emite el plan.",
                en: "Run the tests with your tools, within these limits. It is the same file the command that issues the plan writes.",
              }}
            />
          </p>
          <a
            className="hg-boton hg-boton-primario"
            href={p.paquete.href}
            download
          >
            <T t={{ es: "Descargar el paquete", en: "Download the package" }} />
          </a>
        </div>
      </section>
    </div>
  );
}
