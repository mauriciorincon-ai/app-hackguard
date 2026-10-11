"use client";

import { useState } from "react";
import {
  SIN_FILTROS,
  filtrar,
  type Campo,
  type Filtros as EstadoDeFiltros,
} from "@/lib/catalogo/filtros";
import type { VistaDeCatalogo } from "@/lib/catalogo/tipos";
import { Chip, Estado, Huella } from "../estado";
import { Dato, T } from "../texto";
import { CatalogoVacio } from "./estado-vacio";
import { Filtros } from "./filtros";
import { Tabla } from "./tabla";
import { VigenciaPorFamilia } from "./vigencia-por-familia";

/**
 * La pantalla `/catalogo` (design-system, dirección «consola»; maqueta `docs/diseno/catalogo.html`). Recibe la vista ya
 * calculada: no recalcula nada, solo filtra las filas en el navegador. Los dos idiomas están siempre en el DOM.
 */
export function CatalogoPantalla({ vista }: { vista: VistaDeCatalogo }) {
  const [filtros, setFiltros] = useState<EstadoDeFiltros>(SIN_FILTROS);
  const cambiar = (campo: Campo, valor: string) =>
    setFiltros((f) => ({ ...f, [campo]: valor }));
  const filas = filtrar(vista.filas, filtros);

  if (vista.total === 0) return <CatalogoVacio />;

  return (
    <>
      <div className="hg-cabecera">
        <div>
          <h1>
            <T t={{ es: "Catálogo de pruebas", en: "Test catalog" }} />
          </h1>
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
                {vista.total} pruebas en {vista.totalDeFamilias} familias ·
                consulta del <Dato>{vista.consulta}</Dato>
              </span>
              <span lang="en">
                {vista.total} tests in {vista.totalDeFamilias} families ·
                queried on <Dato>{vista.consulta}</Dato>
              </span>
            </span>
          </p>
        </div>
        <ul
          className="hg-resumen"
          aria-label="Pruebas por vigencia / Tests by freshness"
        >
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

      <section
        className="hg-panel"
        aria-label="Pruebas del catálogo / Catalog tests"
      >
        <Filtros
          familias={vista.familias}
          listas={vista.listas}
          total={vista.total}
          visibles={filas.length}
          filtros={filtros}
          cambiar={cambiar}
        />
        <Tabla filas={filas} oculta={filas.length === 0} />
        <div className="hg-aviso es-neutro" hidden={filas.length > 0}>
          <h2>
            <T
              t={{
                es: "Ninguna prueba cumple esos filtros",
                en: "No test matches those filters",
              }}
            />
          </h2>
          <p>
            <T
              t={{
                es: "Quita un filtro o vuelve a «Todas» para ver el catálogo completo.",
                en: "Remove a filter or go back to “All” to see the whole catalog.",
              }}
            />
          </p>
        </div>
      </section>

      <VigenciaPorFamilia panel={vista.panel} />
    </>
  );
}
