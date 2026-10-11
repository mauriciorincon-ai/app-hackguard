// Textos de la pantalla del catálogo que no son un estado del vocabulario `datos/estados.json`: los nombres de las
// madureces y de la revisión de contenido, las dos etiquetas de «sin control» y la de «marcada», y las frases de días
// y de cuenta. Son los de la maqueta aprobada (scripts/maqueta/paginas/catalogo.mjs y datos/catalogo.mjs); el gate
// tests/unit/fidelidad-catalogo.test.ts vigila que sigan siendo los mismos.
import type { Bilingue, Etiqueta, EstadoDeVigencia } from "./tipos.ts";

export const MADUREZ: Record<string, Bilingue> = {
  estandar: { es: "Estándar", en: "Standard" },
  emergente: { es: "Emergente", en: "Emerging" },
  propia: { es: "Propia", en: "In-house" },
};

export const REVISION: Record<string, Bilingue> = {
  limpia: { es: "Limpia", en: "Clean" },
  marcada_para_revision: {
    es: "Marcada para revisión",
    en: "Flagged for review",
  },
};

// Deuda del lote del hito: estas tres etiquetas nacieron locales en la maqueta y no están en el vocabulario de estados.
export const SIN_CONTROL: Etiqueta = {
  rol: "atencion",
  simbolo: "aviso",
  nombre: { es: "Sin control asignado", en: "No control assigned" },
};
export const SIN_CONTROL_CORTO: Etiqueta = {
  ...SIN_CONTROL,
  nombre: { es: "Sin control", en: "No control" },
};
export const MARCADA: Etiqueta = {
  rol: "atencion",
  simbolo: "aviso",
  nombre: { es: "Marcada", en: "Flagged" },
};
export const MARCADA_PARA_REVISION: Etiqueta = {
  ...MARCADA,
  nombre: { es: "Marcada para revisión", en: "Flagged for review" },
};

export const frasePorDias = (n: number): Bilingue =>
  n === 0
    ? { es: "hoy", en: "today" }
    : n === 1
      ? { es: "hace 1 día", en: "1 day ago" }
      : { es: `hace ${n} días`, en: `${n} days ago` };

/** «3 vigentes», «1 por revisar»… el nombre de un estado de vigencia con la cuenta de pruebas que lo tienen. */
export const conCuenta = (estado: EstadoDeVigencia, n: number): Bilingue =>
  ({
    vigente: {
      es: `${n} ${n === 1 ? "vigente" : "vigentes"}`,
      en: `${n} current`,
    },
    por_revisar: { es: `${n} por revisar`, en: `${n} review due` },
    vencido: {
      es: `${n} ${n === 1 ? "vencida" : "vencidas"}`,
      en: `${n} overdue`,
    },
  })[estado];

export const familias = (n: number): Bilingue => ({
  es: `${n} ${n === 1 ? "familia" : "familias"}`,
  en: `${n} ${n === 1 ? "family" : "families"}`,
});

export const pruebas = (n: number): Bilingue => ({
  es: `${n} ${n === 1 ? "prueba" : "pruebas"}`,
  en: `${n} ${n === 1 ? "test" : "tests"}`,
});
