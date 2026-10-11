"use client";

import { T } from "../texto";

const TRAZO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Flecha({ hacia }: { hacia: "atras" | "adelante" }) {
  return (
    <svg
      className="hg-icono"
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={hacia === "atras" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"}
        {...TRAZO}
      />
    </svg>
  );
}

/**
 * «Anterior · siguiente · página n de N» de la lista. Cada botón lleva símbolo y texto, y se desactiva en los extremos. Solo
 * aparece cuando hay más de una página; los números van en los dos idiomas (la forma del árbol no depende del idioma).
 */
export function Paginacion({
  actual,
  total,
  desde,
  hasta,
  cuenta,
  irA,
}: {
  actual: number;
  total: number;
  desde: number;
  hasta: number;
  /** Cuántas pruebas cumplen los filtros (no las de la página). */
  cuenta: number;
  irA: (pagina: number) => void;
}) {
  return (
    <nav
      className="hg-paginacion"
      aria-label="Paginación · Pagination"
      hidden={total <= 1}
    >
      <button
        type="button"
        className="hg-boton hg-boton-discreto"
        disabled={actual <= 1}
        onClick={() => irA(actual - 1)}
      >
        <Flecha hacia="atras" />
        <T t={{ es: "Anterior", en: "Previous" }} />
      </button>
      <p className="hg-menor" aria-live="polite">
        <span lang="es">
          Página <span data-neutro>{actual}</span> de{" "}
          <span data-neutro>{total}</span> · filas {desde} a {hasta} de {cuenta}
        </span>
        <span lang="en">
          Page <span data-neutro>{actual}</span> of{" "}
          <span data-neutro>{total}</span> · rows {desde} to {hasta} of {cuenta}
        </span>
      </p>
      <button
        type="button"
        className="hg-boton hg-boton-discreto"
        disabled={actual >= total}
        onClick={() => irA(actual + 1)}
      >
        <T t={{ es: "Siguiente", en: "Next" }} />
        <Flecha hacia="adelante" />
      </button>
    </nav>
  );
}
