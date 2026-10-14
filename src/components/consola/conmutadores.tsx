"use client";

import { T } from "../texto";
import { useIdioma } from "./idioma";

const CLAVE = "hackguard:";

function guardar(clave: string, valor: string) {
  try {
    window.localStorage.setItem(CLAVE + clave, valor);
  } catch {
    /* sin almacenamiento la preferencia dura lo que la página */
  }
}

/**
 * Tema e idioma desde la barra de contexto. Los dos se guardan en el navegador (prefijo `hackguard:`) y
 * public/preferencias.js los aplica antes del primer pintado. El botón de tema lleva sus dos nombres en el DOM y la
 * hoja muestra el del tema activo: no hay estado de React que decida la forma.
 */
export function Conmutadores() {
  const idioma = useIdioma();
  const alternarTema = () => {
    const raiz = document.documentElement;
    const tema =
      raiz.getAttribute("data-theme") === "claro" ? "oscuro" : "claro";
    raiz.setAttribute("data-theme", tema);
    guardar("tema", tema);
  };
  const alternarIdioma = () => {
    const raiz = document.documentElement;
    const siguiente = idioma === "en" ? "es" : "en";
    raiz.setAttribute("data-lang", siguiente);
    raiz.setAttribute("lang", siguiente);
    guardar("idioma", siguiente);
  };
  const etiquetaTema =
    idioma === "en"
      ? "Switch between dark and light theme"
      : "Cambiar entre tema oscuro y claro";
  const etiquetaIdioma =
    idioma === "en"
      ? "EN · Switch the language to Spanish"
      : "ES · Cambiar el idioma a inglés";
  return (
    <div className="hg-ajustes">
      <button
        type="button"
        className="hg-boton hg-boton-discreto"
        onClick={alternarTema}
        aria-label={etiquetaTema}
      >
        <span data-si-tema="oscuro">
          <T t={{ es: "Oscuro", en: "Dark" }} />
        </span>
        <span data-si-tema="claro">
          <T t={{ es: "Claro", en: "Light" }} />
        </span>
      </button>
      <button
        type="button"
        className="hg-boton hg-boton-discreto"
        onClick={alternarIdioma}
        aria-label={etiquetaIdioma}
      >
        <span lang="es" data-neutro>
          ES
        </span>
        <span lang="en" data-neutro>
          EN
        </span>
      </button>
    </div>
  );
}
