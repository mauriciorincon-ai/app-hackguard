import Link from "next/link";
import type { VistaDeActivo } from "@/lib/activos/tipos";
import { Chip, Fechado, Sello } from "../estado";
import { Dato, T } from "../texto";
import { PlantillaParaActivosPropios } from "./plantilla";
import { Lista, LineaDeCabecera, Par, SelectorDeActivos } from "./piezas";
import { Huella } from "../estado";

/**
 * La pantalla `/activos/<id>` (maqueta `docs/diseno/activo-<id>.html`). Componente de SERVIDOR. Un activo sin alcance y
 * sin reglas de enfrentamiento no tiene plan, y la página lo dice arriba, en la cabecera y en el carril (regla dura 5).
 */
export function ActivoPantalla({ v }: { v: VistaDeActivo }) {
  const e = v.etiquetas;
  return (
    <div
      className="hg-pila"
      data-activo={v.id}
      data-autorizado={String(v.autorizado)}
    >
      <SelectorDeActivos items={v.selector} hacia="activo" />
      <div className="hg-cabecera">
        <div>
          <LineaDeCabecera v={v} chip={v.estado} />
          <h1>
            <T t={v.nombre} />
          </h1>
          <p className="hg-bajada">
            <T t={v.descripcion} />
          </p>
        </div>
      </div>
      {v.autorizado ? null : (
        <Sello etiqueta={e.sinAutorizacion}>
          <p>
            <T
              t={{
                es: "Este activo no tiene alcance autorizado ni reglas de enfrentamiento, así que no puede recibir plan. Decláralos con su dueño, o aplica la plantilla para activos propios y ajústala.",
                en: "This asset has no authorized scope and no rules of engagement, so it cannot receive a plan. Declare them with its owner, or apply the template for own assets and adjust it.",
              }}
            />
          </p>
        </Sello>
      )}

      <div className="hg-trabajo">
        <div className="hg-pila">
          <section className="hg-panel" aria-labelledby="quien">
            <div className="hg-panel-cab">
              <h2 id="quien">
                <T t={{ es: "Dueño y proveedor", en: "Owner and provider" }} />
              </h2>
            </div>
            <div className="hg-panel-cuerpo">
              <p className="hg-menor">
                <T
                  t={{
                    es: "No son lo mismo: el dueño autoriza las pruebas sobre lo suyo; el proveedor pone sus propias condiciones sobre lo que presta. Nada se planea contra la infraestructura de un tercero.",
                    en: "They are not the same: the owner authorizes tests on what is theirs; the provider sets its own conditions on what it supplies. Nothing is planned against a third party's infrastructure.",
                  }}
                />
              </p>
              <div className="hg-contraste">
                <div>
                  <p className="hg-rotulo">
                    <T t={{ es: "Dueño", en: "Owner" }} />
                  </p>
                  <p className="hg-caja-titulo">
                    <T t={v.dueno.nombre} />
                  </p>
                  <p>
                    <T t={v.dueno.nota} />
                  </p>
                </div>
                <div>
                  <p className="hg-rotulo">
                    <T t={{ es: "Proveedor", en: "Provider" }} />
                  </p>
                  {v.proveedor === null ? (
                    <p>
                      <T
                        t={{
                          es: "Ninguno: todo el activo es del dueño.",
                          en: "None: the whole asset belongs to the owner.",
                        }}
                      />
                    </p>
                  ) : (
                    <>
                      <p className="hg-caja-titulo">
                        <T t={v.proveedor.nombre} />
                      </p>
                      <p>
                        <T t={v.proveedor.provee} />
                      </p>
                      {v.proveedor.politica !== null &&
                      v.proveedor.fuente !== null &&
                      v.proveedor.vigencia !== null ? (
                        <>
                          <p className="hg-rotulo">
                            <T t={{ es: "Su política", en: "Its policy" }} />
                          </p>
                          <p>
                            <T t={v.proveedor.politica} />
                          </p>
                          <p className="hg-menor">
                            <T t={v.proveedor.fuente} />
                          </p>
                          <Fechado
                            vigencia={v.proveedor.vigencia}
                            rotulo={{ es: "Leída", en: "Read" }}
                          />
                        </>
                      ) : (
                        <>
                          <p>
                            <Chip etiqueta={e.politicaSinLeer} />
                          </p>
                          <p className="hg-menor">
                            <T
                              t={{
                                es: "Las reglas de enfrentamiento tienen que citar lo que el proveedor permite.",
                                en: "The rules of engagement must cite what the provider allows.",
                              }}
                            />
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="hg-panel" aria-labelledby="perfil">
            <div className="hg-panel-cab">
              <h2 id="perfil">
                <T t={{ es: "Perfil", en: "Profile" }} />
              </h2>
              <p className="hg-menor">
                <T
                  t={{
                    es: "Del perfil sale qué pruebas aplican.",
                    en: "The profile determines which tests apply.",
                  }}
                />
              </p>
            </div>
            <div className="hg-panel-cuerpo">
              <dl className="hg-propiedades hg-propiedades-en-columnas">
                <Par rotulo={{ es: "Cómo está hecho", en: "How it is built" }}>
                  <span>
                    <T t={v.perfil.pila} />
                  </span>
                </Par>
                <Par
                  rotulo={{ es: "Modelos que consume", en: "Models it uses" }}
                >
                  <span>
                    <T t={v.perfil.modelos} />
                  </span>
                </Par>
                <Par rotulo={{ es: "Exposición", en: "Exposure" }}>
                  <span>
                    <T t={v.perfil.exposicion} />
                  </span>
                </Par>
                <Par rotulo={{ es: "Datos que maneja", en: "Data it handles" }}>
                  <span>
                    <T t={v.perfil.datos} />
                  </span>
                </Par>
                <Par rotulo={{ es: "Autenticación", en: "Authentication" }}>
                  <span>
                    <T t={v.perfil.autenticacion} />
                  </span>
                </Par>
                <Par rotulo={{ es: "Tipo de acceso", en: "Access type" }}>
                  <span>
                    <T t={v.perfil.acceso} />
                  </span>
                </Par>
                <Par
                  rotulo={{
                    es: "Por dónde recibe entrada",
                    en: "Where input comes in",
                  }}
                >
                  <Lista frases={v.perfil.canales} />
                </Par>
                <Par rotulo={{ es: "Qué puede hacer", en: "What it can do" }}>
                  <Lista frases={v.perfil.acciones} />
                </Par>
              </dl>
            </div>
          </section>

          <section className="hg-panel" aria-labelledby="alcance">
            <div className="hg-panel-cab">
              <h2 id="alcance">
                <T t={{ es: "Alcance autorizado", en: "Authorized scope" }} />
              </h2>
            </div>
            <div className="hg-panel-cuerpo">
              {v.alcance !== null ? (
                <>
                  <div className="hg-contraste">
                    <div>
                      <p className="hg-rotulo">
                        <T t={{ es: "Se puede probar", en: "May be tested" }} />
                      </p>
                      <Lista frases={v.alcance.incluye} />
                    </div>
                    <div>
                      <p className="hg-rotulo">
                        <T
                          t={{
                            es: "No se puede probar",
                            en: "May not be tested",
                          }}
                        />
                      </p>
                      <Lista frases={v.alcance.excluye} />
                    </div>
                  </div>
                  <dl className="hg-propiedades hg-propiedades-en-columnas">
                    <Par rotulo={{ es: "Cuándo", en: "When" }}>
                      <span>
                        <T t={v.alcance.ventana} />
                      </span>
                    </Par>
                    <Par rotulo={{ es: "Límites de carga", en: "Load limits" }}>
                      <span>
                        <T t={v.alcance.limites} />
                      </span>
                    </Par>
                  </dl>
                </>
              ) : (
                <>
                  <p>
                    <Chip etiqueta={e.sinDeclarar} />
                  </p>
                  <PlantillaParaActivosPropios
                    alcance={v.plantilla.alcance}
                    reglas={v.plantilla.reglas}
                  />
                </>
              )}
            </div>
          </section>

          <section className="hg-panel" aria-labelledby="reglas">
            <div className="hg-panel-cab">
              <h2 id="reglas">
                <T
                  t={{
                    es: "Reglas de enfrentamiento",
                    en: "Rules of engagement",
                  }}
                />
              </h2>
              <p className="hg-menor">
                <T
                  t={{
                    es: "Las declara el dueño. El plan las lleva en su paquete de ejecución.",
                    en: "The owner declares them. The plan carries them in its execution package.",
                  }}
                />
              </p>
            </div>
            <div className="hg-panel-cuerpo">
              {v.reglas !== null ? (
                <ol className="hg-lista">
                  {v.reglas.map((r) => (
                    <li key={r.texto.es}>
                      <T t={r.texto} />
                      {r.citaProveedor ? (
                        <>
                          {" "}
                          <span className="hg-menor">
                            <T
                              t={{
                                es: "· cita la política del proveedor",
                                en: "· cites the provider's policy",
                              }}
                            />
                          </span>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  <Chip etiqueta={e.sinDeclarar} />
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="hg-carril" aria-labelledby="rotulo-carril">
          <p id="rotulo-carril" className="hg-oculto">
            <T
              t={{
                es: `Plan y propiedades de ${v.id}`,
                en: `Plan and properties of ${v.id}`,
              }}
            />
          </p>
          <section
            className="hg-tarjeta hg-tarjeta-accion"
            aria-labelledby="plan"
          >
            <h2 className="hg-tarjeta-titulo" id="plan">
              <T t={{ es: "Plan de pruebas", en: "Test plan" }} />
            </h2>
            {v.plan !== null ? (
              <>
                <p>
                  <Chip etiqueta={e.autorizado} />
                </p>
                <p>
                  <Link href={`/activos/${v.id}/plan`}>
                    <Huella hex={v.plan.huella} />
                  </Link>{" "}
                  <span className="hg-menor">
                    <T t={{ es: "emitido el", en: "issued on" }} />{" "}
                    <Dato>{v.plan.fecha}</Dato>
                  </span>
                </p>
                <Link
                  className="hg-boton hg-boton-primario"
                  href={`/activos/${v.id}/plan`}
                >
                  <T t={{ es: "Abrir el plan", en: "Open the plan" }} />
                </Link>
              </>
            ) : (
              <>
                <p>
                  <Chip etiqueta={e.faltaAutorizacion} />
                </p>
                <p className="hg-menor">
                  <T
                    t={{
                      es: "Cuando el dueño los declare, el plan se calcula solo desde el perfil.",
                      en: "Once the owner declares them, the plan is computed from the profile.",
                    }}
                  />
                </p>
              </>
            )}
          </section>
          <section className="hg-tarjeta" aria-labelledby="propiedades">
            <h2 className="hg-tarjeta-titulo" id="propiedades">
              <T t={{ es: "Propiedades", en: "Properties" }} />
            </h2>
            <dl className="hg-propiedades">
              <Par rotulo={{ es: "Estado", en: "Status" }}>
                <span>
                  <T t={v.estado.nombre} />
                </span>
              </Par>
              <Par rotulo={{ es: "Familias", en: "Families" }}>
                {v.familias.map((f) => (
                  <span key={f.es}>
                    <T t={f} />
                  </span>
                ))}
              </Par>
              <Par rotulo={{ es: "Acceso", en: "Access" }}>
                <span>
                  <T t={v.perfil.acceso} />
                </span>
              </Par>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
