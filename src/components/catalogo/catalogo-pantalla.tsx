import { familias, pruebas } from "@/lib/catalogo/etiquetas";
import type { VistaDeCatalogo } from "@/lib/catalogo/tipos";
import { Chip, Estado, Huella } from "../estado";
import { Dato, T } from "../texto";
import { CatalogoVacio } from "./estado-vacio";
import { ListaFiltrable } from "./lista-filtrable";
import { Tabla } from "./tabla";
import { VigenciaPorFamilia } from "./vigencia-por-familia";

/**
 * La pantalla `/catalogo` (design-system, dirección «consola»; maqueta `docs/diseno/catalogo.html`). Es un componente de
 * SERVIDOR: recibe la vista ya calculada y pinta todo, con los dos idiomas en el DOM. Solo los filtros (`ListaFiltrable`)
 * corren en el navegador.
 */
export function CatalogoPantalla({ vista }: { vista: VistaDeCatalogo }) {
  if (vista.total === 0) return <CatalogoVacio />;

  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Catálogo de pruebas", en: "Test catalog" }} />
          </h1>
          <span id="rotulo-cifras" className="hg-oculto">
            <T t={{ es: "Pruebas por vigencia", en: "Tests by freshness" }} />
          </span>
          <p className="hg-bajada">
            <T
              t={{
                es: "Cada prueba dice qué verifica, con qué herramienta y qué resultado se espera. Nada más.",
                en: "Each test says what it verifies, with which tool and what result is expected. Nothing more.",
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
                {pruebas(vista.total).es} en{" "}
                {familias(vista.totalDeFamilias).es} · consulta del{" "}
                <Dato>{vista.consulta}</Dato>
              </span>
              <span lang="en">
                {pruebas(vista.total).en} in{" "}
                {familias(vista.totalDeFamilias).en} · queried on{" "}
                <Dato>{vista.consulta}</Dato>
              </span>
            </span>
          </p>
        </div>
        <ul className="hg-resumen" aria-labelledby="rotulo-cifras">
          {vista.cifras.map((c) => (
            <li key={c.etiqueta.nombre.es}>
              <span className="hg-cifra" data-neutro>
                {c.n}
              </span>
              <Estado etiqueta={c.etiqueta} />
            </li>
          ))}
        </ul>
      </div>

      {vista.pendientes.length > 0 ? (
        <section className="hg-panel" aria-labelledby="pendientes">
          <div className="hg-panel-cab">
            <h2 id="pendientes">
              <T
                t={{
                  es: "Pruebas que esperan revisión",
                  en: "Tests awaiting review",
                }}
              />
            </h2>
            <p className="hg-menor">
              <T
                t={{
                  es: "No están publicadas en la instantánea hasta que una persona las apruebe.",
                  en: "They are not published in the snapshot until a person approves them.",
                }}
              />
            </p>
          </div>
          <ul className="hg-lista">
            {vista.pendientes.map((p) => (
              <li key={p.id}>
                <Dato>{p.id}</Dato> <Chip etiqueta={p.etiqueta} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="hg-panel" aria-labelledby="rotulo-pruebas">
        <span id="rotulo-pruebas" className="hg-oculto">
          <T t={{ es: "Pruebas del catálogo", en: "Catalog tests" }} />
        </span>
        <ListaFiltrable
          familias={vista.familias}
          listas={vista.listas}
          indice={vista.filas.map((f) => ({
            id: f.id,
            familia: f.familia,
            marcoId: f.marcoId,
            controles: f.controles,
            madurez: f.madurez,
            revision: f.revision,
            vigencia: { estado: f.vigencia.estado },
          }))}
        >
          <Tabla filas={vista.filas} oculta={false} />
        </ListaFiltrable>
      </section>

      <VigenciaPorFamilia panel={vista.panel} />
    </>
  );
}
