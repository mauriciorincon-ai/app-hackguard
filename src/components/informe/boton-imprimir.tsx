"use client";

import { useState } from "react";
import { T } from "../texto";

/** «Imprimir o guardar como PDF»: abre el diálogo de impresión del navegador y avisa de que se abrió. La hoja del sistema deja solo el informe. */
export function BotonImprimir() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        className="hg-boton hg-boton-primario"
        data-controlador="imprimir"
        onClick={() => {
          setAbierto(true);
          if (typeof window.print === "function") window.print();
        }}
      >
        <T
          t={{ es: "Imprimir o guardar como PDF", en: "Print or save as PDF" }}
        />
      </button>
      <p
        className="hg-menor"
        role="status"
        data-aviso-impresion
        hidden={!abierto}
      >
        <T
          t={{
            es: "Se abrió el diálogo de impresión del navegador. Elige «Guardar como PDF» para llevártelo como archivo.",
            en: "The browser's print dialog opened. Choose “Save as PDF” to take it as a file.",
          }}
        />
      </p>
    </>
  );
}
