"use client";

import { useState } from "react";
import { T, type Bilingue } from "../texto";

/**
 * Un botón que abre lo que lo sigue («Ver las comprobaciones»). La hoja del sistema muestra `.hg-revelado` cuando el botón que lo
 * precede tiene `aria-expanded="true"`; aquí solo se guarda ese estado. Sin JavaScript queda cerrado, y su contenido sigue en el
 * HTML.
 */
export function Revelador({
  rotulo,
  children,
}: {
  rotulo: Bilingue;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        className="hg-boton hg-boton-discreto"
        data-controlador="alternar"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        <T t={rotulo} />
      </button>
      <div className="hg-revelado">{children}</div>
    </>
  );
}
