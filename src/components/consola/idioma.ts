"use client";

import { useSyncExternalStore } from "react";

export type Idioma = "es" | "en";

function suscribir(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-lang"],
  });
  return () => observador.disconnect();
}

const actual = (): Idioma =>
  document.documentElement.getAttribute("data-lang") === "en" ? "en" : "es";

/**
 * El idioma activo, para lo que no admite marcado (el texto de un <option>, un aria-label). Solo cambia TEXTO, jamás
 * la forma del árbol: en el servidor y en la hidratación vale «es» y el árbol sale igual en los dos idiomas.
 */
export function useIdioma(): Idioma {
  return useSyncExternalStore(suscribir, actual, () => "es");
}

/** Elige el texto del idioma activo de un mapa { es, en }. */
export const en = (idioma: Idioma, texto: { es: string; en: string }) =>
  texto[idioma];
