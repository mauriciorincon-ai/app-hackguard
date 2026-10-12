"use client";

import { useState } from "react";
import { Lista } from "./piezas";
import { T, type Bilingue } from "../texto";

/**
 * «Ver la plantilla para activos propios»: el botón abre lo que lo sigue (la hoja del sistema muestra `.hg-revelado`
 * cuando el botón que lo precede está pulsado). Solo cambia lo que se ve; el árbol es el mismo en los dos idiomas.
 */
export function PlantillaParaActivosPropios({
  alcance,
  reglas,
}: {
  alcance: Bilingue[];
  reglas: Bilingue[];
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="hg-boton"
        data-controlador="alternar"
        aria-pressed={abierta}
        onClick={() => setAbierta((a) => !a)}
      >
        <T
          t={{
            es: "Ver la plantilla para activos propios",
            en: "See the template for own assets",
          }}
        />
      </button>
      <div className="hg-revelado">
        <div className="hg-contraste">
          <div>
            <p className="hg-rotulo">
              <T t={{ es: "Alcance de la plantilla", en: "Template scope" }} />
            </p>
            <Lista frases={alcance} />
          </div>
          <div>
            <p className="hg-rotulo">
              <T t={{ es: "Reglas de la plantilla", en: "Template rules" }} />
            </p>
            <Lista frases={reglas} />
          </div>
        </div>
        <p className="hg-menor">
          <T
            t={{
              es: "Es una guía para declarar el alcance y las reglas de un activo propio en su archivo. Solo vale para activos propios: en uno ajeno, el alcance lo declara su dueño.",
              en: "It is a guide for declaring the scope and the rules of an own asset in its file. It is only valid for own assets: for someone else's, the owner declares the scope.",
            }}
          />
        </p>
      </div>
    </div>
  );
}
