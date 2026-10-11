import Link from "next/link";
import { pruebas } from "@/lib/catalogo/etiquetas";
import {
  SE_MANTIENE,
  SIN_EQUIVALENTE,
  type MapaDeEquivalencias,
  type VistaDeMarcos,
} from "@/lib/catalogo/marcos";
import { Chip, Estado, Fechado, Huella } from "../estado";
import { Aviso } from "../estado";
import { Dato, T } from "../texto";

/**
 * La pantalla `/catalogo/marcos` (maqueta `docs/diseno/marcos.html`). Componente de SERVIDOR: todo sale ya calculado, con los
 * dos idiomas en el DOM. Lo que la instantánea no sabe (si la fuente oficial publica una versión más nueva, los nombres de
 * las entradas de cada versión) se dice como «sin registro», nunca se simula.
 */

const COLUMNAS_MARCOS = [
  { es: "Marco", en: "Framework" },
  { es: "Nombre y familias", en: "Name and families" },
  { es: "Versión en el catálogo", en: "Version in the catalog" },
  { es: "Frente a la fuente", en: "Against the source" },
  { es: "Vigencia", en: "Freshness" },
];

function Cabeceras({ columnas }: { columnas: { es: string; en: string }[] }) {
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

function Mapa({ m }: { m: MapaDeEquivalencias }) {
  return (
    <section className="hg-panel" aria-labelledby={`mapa-${m.id}`}>
      <div className="hg-panel-cab">
        <h2 id={`mapa-${m.id}`}>
          <T t={{ es: "Mapa de equivalencias", en: "Equivalence map" }} />
        </h2>
        <p className="hg-menor">
          <Dato>{m.marco}</Dato> ·{" "}
          <span lang="es">
            de la <Dato>{m.desde}</Dato> a la <Dato>{m.hasta}</Dato>
          </span>
          <span lang="en">
            from <Dato>{m.desde}</Dato> to <Dato>{m.hasta}</Dato>
          </span>
        </p>
      </div>
      <div className="hg-panel-cuerpo">
        <p className="hg-menor">
          <T
            t={{
              es: "Cuando un marco cambia de versión, sus entradas cambian de número y de nombre. El mapa dice a qué entrada nueva corresponde cada una, para que una prueba o un hallazgo de antes siga apuntando al lugar correcto.",
              en: "When a framework changes version, its entries change number and name. The map says which new entry each one corresponds to, so that an earlier test or finding still points to the right place.",
            }}
          />
        </p>
        {m.notas ? (
          <p className="hg-menor">
            <T t={m.notas} />
          </p>
        ) : null}
      </div>
      <table className="hg-tabla">
        <caption className="hg-oculto">
          <T
            t={{
              es: "Entradas del mapa de equivalencias",
              en: "Equivalence map entries",
            }}
          />
        </caption>
        <Cabeceras
          columnas={[
            { es: `Entrada en la ${m.desde}`, en: `Entry in ${m.desde}` },
            { es: `Entrada en la ${m.hasta}`, en: `Entry in ${m.hasta}` },
            { es: "Qué cambió", en: "What changed" },
          ]}
        />
        <tbody>
          {m.pares.map((p) => (
            <tr key={p.desde}>
              <td data-celda="id">
                <Dato>{p.desde}</Dato>
              </td>
              <td>
                {p.hacia.length ? (
                  <p>
                    {p.hacia.map((h, n) => (
                      <span key={h}>
                        {n > 0 ? " · " : ""}
                        <Dato>{h}</Dato>
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="hg-menor">
                    <T t={{ es: "Ninguna", en: "None" }} />
                  </p>
                )}
              </td>
              <td>
                <p>
                  <T
                    t={
                      p.hacia.length === 0
                        ? SIN_EQUIVALENTE
                        : p.cambios.length === 0
                          ? SE_MANTIENE
                          : {
                              es: p.cambios.map((c) => c.es).join(" y "),
                              en: p.cambios.map((c) => c.en).join(" and "),
                            }
                    }
                  />
                </p>
                {p.nota ? (
                  <p className="hg-menor">
                    <T t={p.nota} />
                  </p>
                ) : null}
                {p.citadaPor.length ? (
                  <p className="hg-menor">
                    <T t={{ es: "La citan:", en: "Cited by:" }} />{" "}
                    {p.citadaPor.map((id, n) => (
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
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hg-panel-pie">
        <span lang="es">
          Entradas de la versión anterior sin equivalente directo:{" "}
          <Dato>{m.sinEquivalente}</Dato>. Un hallazgo antiguo que cite una de
          ellas conserva su referencia original y se revisa a mano.
        </span>
        <span lang="en">
          Entries from the previous version with no direct equivalent:{" "}
          <Dato>{m.sinEquivalente}</Dato>. An old finding that cites one of them
          keeps its original reference and is reviewed by hand.
        </span>
      </p>
    </section>
  );
}

export function MarcosVacio() {
  return (
    <Aviso
      etiqueta={{ rol: "neutro", simbolo: "vacio" }}
      titulo={{ es: "No hay marcos cargados", en: "No frameworks loaded" }}
    >
      <p>
        <T
          t={{
            es: "Sin marcos no puede haber pruebas: cada prueba cita uno con su versión. Carga las semillas del repositorio para empezar.",
            en: "Without frameworks there can be no tests: each test cites one with its version. Load the repository seeds to get started.",
          }}
        />
      </p>
    </Aviso>
  );
}

export function MarcosPantalla({ vista }: { vista: VistaDeMarcos }) {
  if (vista.filas.length === 0) return <MarcosVacio />;
  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T
              t={{ es: "Marcos y versiones", en: "Frameworks and versions" }}
            />
          </h1>
          <span id="rotulo-cifras" className="hg-oculto">
            <T t={{ es: "Resumen de marcos", en: "Framework summary" }} />
          </span>
          <p className="hg-bajada">
            <T
              t={{
                es: "Toda prueba cita un marco con su versión. Aquí se ve cuál está vigente en el catálogo y cómo se traduce desde la anterior.",
                en: "Every test cites a framework with its version. This shows which one is current in the catalog and how it translates from the previous one.",
              }}
            />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "Instantánea", en: "Snapshot" }} />{" "}
              <Dato>{vista.instantanea}</Dato>
            </span>
            <span>
              <Huella hex={vista.huella} />
            </span>
            <span>
              <span lang="es">
                consulta del <Dato>{vista.consulta}</Dato>
              </span>
              <span lang="en">
                queried on <Dato>{vista.consulta}</Dato>
              </span>
            </span>
          </p>
        </div>
        <ul className="hg-resumen" aria-labelledby="rotulo-cifras">
          <li>
            <span className="hg-cifra" data-neutro>
              {vista.filas.length}
            </span>
            <span>
              <T
                t={{
                  es: "marcos en el catálogo",
                  en: "frameworks in the catalog",
                }}
              />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {vista.filas.filter((f) => f.fuente).length}
            </span>
            <span>
              <T
                t={{
                  es: "con la fuente fuera del alcance del agente",
                  en: "with a source out of the agent's reach",
                }}
              />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {vista.mapas.length}
            </span>
            <span>
              <T t={{ es: "mapa de equivalencias", en: "equivalence map" }} />
            </span>
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {vista.instantaneas.length}
            </span>
            <span>
              <T t={{ es: "instantáneas", en: "snapshots" }} />
            </span>
          </li>
        </ul>
      </div>

      <section className="hg-panel" aria-labelledby="marcos">
        <div className="hg-panel-cab">
          <h2 id="marcos">
            <T t={{ es: "Marcos del catálogo", en: "Catalog frameworks" }} />
          </h2>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T t={{ es: "Marcos del catálogo", en: "Catalog frameworks" }} />
          </caption>
          <Cabeceras columnas={COLUMNAS_MARCOS} />
          <tbody>
            {vista.filas.map((m) => (
              <tr key={m.id} data-marco={m.id}>
                <td data-celda="id">
                  <Dato>{m.id}</Dato>
                </td>
                <td>
                  <p>
                    <strong data-neutro>{m.nombre}</strong>
                  </p>
                  <p className="hg-menor">
                    <span data-neutro>{m.editor}</span> ·{" "}
                    {m.familias.map((f, n) => (
                      <span key={f.es}>
                        {n > 0 ? " · " : ""}
                        <T t={f} />
                      </span>
                    ))}
                  </p>
                  <p className="hg-menor">
                    <T t={{ es: "Licencia:", en: "Licence:" }} />{" "}
                    <T t={m.licencia.nombre} />
                  </p>
                  <p className="hg-menor">
                    <T t={m.licencia.exige} />
                  </p>
                </td>
                <td>
                  <p>
                    <Dato>{m.version}</Dato>
                  </p>
                  <p className="hg-menor">
                    {m.fechaVersion ? (
                      <>
                        <T t={{ es: "del", en: "dated" }} />{" "}
                        <Dato>{m.fechaVersion}</Dato>
                      </>
                    ) : null}
                    {m.fechaPorVerificar ? (
                      <>
                        {m.fechaVersion ? " · " : ""}
                        <T
                          t={{
                            es: "fecha por verificar",
                            en: "date still to be verified",
                          }}
                        />
                      </>
                    ) : null}
                  </p>
                </td>
                <td data-celda="estado">
                  {m.fuente ? (
                    <p>
                      <Chip etiqueta={m.fuente} />
                    </p>
                  ) : (
                    <p className="hg-menor">
                      <T
                        t={{
                          es: "Sin aviso registrado",
                          en: "No notice recorded",
                        }}
                      />
                    </p>
                  )}
                </td>
                <td>
                  <Fechado
                    vigencia={m.vigencia}
                    rotulo={{ es: "Verificado", en: "Verified" }}
                  />
                  <p className="hg-menor">
                    <span lang="es">
                      {m.citan === 1
                        ? "1 prueba lo cita"
                        : `${m.citan} pruebas lo citan`}
                    </span>
                    <span lang="en">
                      {m.citan === 1
                        ? "1 test cites it"
                        : `${m.citan} tests cite it`}
                    </span>
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hg-panel" aria-labelledby="avisos">
        <div className="hg-panel-cab">
          <h2 id="avisos">
            <T t={{ es: "Avisos de versión", en: "Version notices" }} />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "El investigador comparará la versión del catálogo con la que publique la fuente oficial. Todavía no existe: no hay avisos hasta que se construya, y nunca cambiará nada por su cuenta.",
                en: "The researcher will compare the catalog's version with the one the official source publishes. It does not exist yet: there are no notices until it is built, and it will never change anything on its own.",
              }}
            />
          </p>
        </div>
        <div className="hg-panel-cuerpo">
          <p className="hg-menor" data-sin-avisos>
            <Estado
              etiqueta={{
                rol: "neutro",
                simbolo: "vacio",
                nombre: {
                  es: "Sin avisos registrados",
                  en: "No notices recorded",
                },
              }}
            />
          </p>
        </div>
      </section>

      {vista.mapas.map((m) => (
        <Mapa key={m.id} m={m} />
      ))}

      <section className="hg-panel" aria-labelledby="instantaneas">
        <div className="hg-panel-cab">
          <h2 id="instantaneas">
            <T
              t={{ es: "Instantáneas del catálogo", en: "Catalog snapshots" }}
            />
          </h2>
          <p className="hg-menor">
            <T
              t={{
                es: "Cada cambio del catálogo guarda una instantánea con su huella. Todo plan cita la suya.",
                en: "Every catalog change saves a snapshot with its fingerprint. Every plan cites its own.",
              }}
            />
          </p>
        </div>
        <table className="hg-tabla">
          <caption className="hg-oculto">
            <T
              t={{ es: "Instantáneas del catálogo", en: "Catalog snapshots" }}
            />
          </caption>
          <Cabeceras
            columnas={[
              { es: "Instantánea", en: "Snapshot" },
              { es: "Qué cambió", en: "What changed" },
              { es: "Fecha y tamaño", en: "Date and size" },
              { es: "Huella", en: "Fingerprint" },
              { es: "Estado", en: "Status" },
            ]}
          />
          <tbody>
            {vista.instantaneas.map((i) => (
              <tr
                key={i.nombre}
                data-instantanea={i.nombre}
                data-oficial={i.oficial}
              >
                <td data-celda="id">
                  <Dato>{i.nombre}</Dato>
                </td>
                <td>
                  <p className="hg-menor">
                    <T
                      t={{
                        es: "Sin comparación registrada",
                        en: "No comparison recorded",
                      }}
                    />
                  </p>
                </td>
                <td>
                  <p>
                    <Dato>{i.fecha}</Dato>
                  </p>
                  <p className="hg-menor">
                    <T t={pruebas(i.pruebas)} />
                  </p>
                </td>
                <td>
                  <Huella hex={i.huella} />
                </td>
                <td data-celda="estado">
                  {i.oficial ? (
                    <Estado
                      etiqueta={{
                        rol: "positivo",
                        simbolo: "ok",
                        nombre: { es: "Oficial", en: "Official" },
                      }}
                    />
                  ) : (
                    <span className="hg-menor">
                      <T t={{ es: "Anterior", en: "Previous" }} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
