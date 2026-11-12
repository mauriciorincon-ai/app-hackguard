import Link from "@/components/enlace";
import {
  rutaDeComparacion,
  type CampoDeCambioVista,
  type MovimientoVista,
  type VistaDeDiferencias,
} from "@/lib/catalogo/diferencias-vista";
import { Chip, Estado, Huella, Sello } from "../estado";
import { Cabeceras } from "../cabeceras";
import { Dato, T } from "../texto";

/**
 * La pantalla `/catalogo/diferencias`: qué entra, qué sale y qué cambia entre dos instantáneas del catálogo, campo por campo, con la
 * regla del validador que cuida cada campo y la huella de cada lado. Componente de SERVIDOR; armada con las piezas de la consola.
 * Cuando el lado nuevo es la instantánea DEMO lo dice arriba, con marca y texto: no es el catálogo oficial.
 */

const COLUMNAS = [
  { es: "Movimiento", en: "Movement" },
  { es: "Entrada", en: "Entry" },
  { es: "Qué cambió", en: "What changed" },
  { es: "Huellas", en: "Fingerprints" },
];

function Campo({ c }: { c: CampoDeCambioVista }) {
  return (
    <li data-campo={c.campo}>
      <p>
        <strong>
          <Dato>{c.campo}</Dato>
        </strong>{" "}
        <span className="hg-menor">
          <Dato>{c.regla}</Dato> · <T t={c.reglaNombre} />
        </span>
      </p>
      {c.oculto ? (
        <p className="hg-menor" data-texto-oculto>
          <T
            t={{
              es: "Texto no mostrado: la licencia del marco solo deja citar identificadores. Cambió, y las huellas lo prueban.",
              en: "Text not shown: the framework's licence only allows citing identifiers. It changed, and the fingerprints prove it.",
            }}
          />
        </p>
      ) : (
        <p className="hg-menor">
          <span className="hg-oculto">
            <T t={{ es: "Antes: ", en: "Before: " }} />
          </span>
          <T t={c.antes ?? { es: "—", en: "—" }} />
          {" → "}
          <span className="hg-oculto">
            <T t={{ es: "Ahora: ", en: "Now: " }} />
          </span>
          <T t={c.despues ?? { es: "—", en: "—" }} />
        </p>
      )}
    </li>
  );
}

function Fila({ m }: { m: MovimientoVista }) {
  return (
    <tr data-movimiento={m.tipo} data-entrada={`${m.seccion}/${m.id}`}>
      <td data-celda="estado">
        <Chip etiqueta={m.etiqueta} />
      </td>
      <td data-celda="principal">
        <p>
          <strong>
            {m.seccion === "pruebas" && m.tipo !== "sale" ? (
              <Link className="hg-enlace-fila" href={`/catalogo/${m.id}`}>
                <Dato>{m.id}</Dato>
              </Link>
            ) : (
              <Dato>{m.id}</Dato>
            )}
          </strong>
        </p>
        {m.nombre === null ? null : (
          <p className="hg-menor">
            <T t={m.nombre} />
          </p>
        )}
      </td>
      <td>
        {m.campos.length === 0 ? (
          <p className="hg-menor">
            <T
              t={
                m.tipo === "entra"
                  ? {
                      es: "Entrada nueva en el catálogo.",
                      en: "New entry in the catalog.",
                    }
                  : {
                      es: "Ya no está en el catálogo.",
                      en: "It is no longer in the catalog.",
                    }
              }
            />
          </p>
        ) : (
          <ul className="hg-lista">
            {m.campos.map((c) => (
              <Campo key={c.campo} c={c} />
            ))}
          </ul>
        )}
      </td>
      <td data-celda="huella">
        <p className="hg-menor">
          <T t={{ es: "Antes", en: "Before" }} />{" "}
          {m.huellaAntes === null ? "—" : <Huella hex={m.huellaAntes} />}
        </p>
        <p className="hg-menor">
          <T t={{ es: "Ahora", en: "Now" }} />{" "}
          {m.huellaDespues === null ? "—" : <Huella hex={m.huellaDespues} />}
        </p>
      </td>
    </tr>
  );
}

export function DiferenciasPantalla({ v }: { v: VistaDeDiferencias }) {
  const total = v.resumen.entra + v.resumen.sale + v.resumen.cambia;
  return (
    <div
      className="hg-pila"
      data-diferencias
      data-entre={`${v.de.nombre}..${v.a.nombre}`}
    >
      <div className="hg-cabecera">
        <div>
          <p className="hg-cabecera-linea">
            <Dato>{v.de.fecha}</Dato>
            <span aria-hidden="true">→</span>
            <Dato>{v.a.fecha}</Dato>
            {v.a.demo ? <Chip etiqueta={v.etiquetas.demo} /> : null}
          </p>
          <h1>
            <T
              t={{
                es: "Qué cambió entre dos instantáneas",
                en: "What changed between two snapshots",
              }}
            />
          </h1>
          <p className="hg-bajada">
            <T
              t={{
                es: "Lo que entra, lo que sale y lo que cambia en el catálogo, campo por campo, con la regla del validador que cuida cada campo. Un JSON con las claves en otro orden no cuenta como cambio.",
                en: "What enters, what leaves and what changes in the catalog, field by field, with the validator rule that guards each field. A JSON with its keys in another order does not count as a change.",
              }}
            />
          </p>
          <p className="hg-cabecera-meta">
            <span>
              <T t={{ es: "De", en: "From" }} /> <Dato>{v.de.nombre}</Dato>
            </span>
            <span>
              <T t={{ es: "A", en: "To" }} /> <Dato>{v.a.nombre}</Dato>
            </span>
            <span>
              <Huella hex={v.huella} />
            </span>
          </p>
        </div>
        <span id="rotulo-resumen" className="hg-oculto">
          <T t={{ es: "Resumen de los cambios", en: "Summary of changes" }} />
        </span>
        <ul className="hg-resumen" aria-labelledby="rotulo-resumen">
          <li>
            <span className="hg-cifra" data-neutro>
              {v.resumen.entra}
            </span>
            <Estado etiqueta={v.etiquetas.entra} />
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {v.resumen.sale}
            </span>
            <Estado etiqueta={v.etiquetas.sale} />
          </li>
          <li>
            <span className="hg-cifra" data-neutro>
              {v.resumen.cambia}
            </span>
            <Estado etiqueta={v.etiquetas.cambia} />
          </li>
        </ul>
      </div>

      {v.pares.length > 0 ? (
        <nav aria-labelledby="rotulo-comparaciones" data-comparaciones>
          <p id="rotulo-comparaciones" className="hg-oculto">
            <T
              t={{
                es: "Comparaciones entre instantáneas consecutivas",
                en: "Comparisons between consecutive snapshots",
              }}
            />
          </p>
          <ul className="hg-selector">
            {v.pares.map((p) => (
              <li key={`${p.de}..${p.a}`}>
                <Link
                  className="hg-opcion"
                  href={rutaDeComparacion(p.de, p.a)}
                  aria-current={p.activo ? "page" : undefined}
                  data-par={`${p.de}..${p.a}`}
                >
                  <span className="hg-opcion-nombre">
                    <Dato>{p.deFecha}</Dato> <span aria-hidden="true">→</span>{" "}
                    <Dato>{p.aFecha}</Dato>
                  </span>
                  <span>
                    {p.demo ? (
                      <T
                        t={{ es: "Demo, no oficial", en: "Demo, not official" }}
                      />
                    ) : (
                      <T t={{ es: "Oficial", en: "Official" }} />
                    )}
                    {p.activo ? (
                      <>
                        {" · "}
                        <T
                          t={{
                            es: "la que ves",
                            en: "the one you are viewing",
                          }}
                        />
                      </>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {v.a.demo ? (
        <Sello etiqueta={v.etiquetas.demo}>
          <p>
            <T
              t={{
                es: "La instantánea de la derecha es sintética: el catálogo oficial no ha cambiado desde la de la izquierda, así que para ver un cambio se inventó uno, con cinco movimientos fijos. Ningún plan ni pantalla del catálogo la usa.",
                en: "The snapshot on the right is synthetic: the official catalog has not changed since the one on the left, so a change was invented to show one, with five fixed movements. No plan or catalog screen uses it.",
              }}
            />
          </p>
        </Sello>
      ) : null}

      {total === 0 ? (
        <Sello etiqueta={v.etiquetas.sinCambios}>
          <p>
            <T
              t={{
                es: "Las dos instantáneas dicen lo mismo, entrada por entrada.",
                en: "The two snapshots say the same thing, entry by entry.",
              }}
            />
          </p>
        </Sello>
      ) : null}

      {v.secciones.map((s) => (
        <section
          key={s.seccion}
          className="hg-panel"
          aria-labelledby={`seccion-${s.seccion}`}
          data-seccion={s.seccion}
        >
          <div className="hg-panel-cab">
            <h2 id={`seccion-${s.seccion}`}>
              <T t={s.rotulo} />
            </h2>
          </div>
          <table className="hg-tabla">
            <caption className="hg-oculto">
              <T t={s.rotulo} />
            </caption>
            <Cabeceras columnas={COLUMNAS} />
            <tbody>
              {s.movimientos.map((m) => (
                <Fila key={`${m.tipo}-${m.id}`} m={m} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
