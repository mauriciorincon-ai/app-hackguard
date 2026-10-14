// Textos de las pantallas del catálogo que no son un estado del vocabulario `datos/estados.json`: los nombres de las madureces, de la
// revisión de contenido y de la agregación, las etiquetas de estado de las pantallas (todo en `datos/vistas/etiquetas.json`) y las
// frases de días y de cuenta. Son los de la maqueta aprobada (scripts/maqueta/paginas/catalogo.mjs y datos/catalogo.mjs); el gate
// tests/unit/fidelidad-catalogo.test.ts vigila que sigan siendo los mismos.
import crudo from "../../../datos/vistas/etiquetas.json";
import type {
  EtiquetasDeVistas,
  IdDeEtiquetaDeVista,
} from "../../engine/catalogo/etiquetas-de-vistas.ts";
import type { Bilingue, Etiqueta, EstadoDeVigencia } from "./tipos.ts";

// Los nombres y las etiquetas de estado son DATO (`datos/vistas/etiquetas.json`, regla dura 10): se importan tal cual y los valida
// `tests/unit/etiquetas-de-vistas.test.ts` contra su esquema. El color y la marca salen de ahí, nunca de un componente (regla dura 12).
const DATOS = crudo as unknown as EtiquetasDeVistas;

export const MADUREZ: Record<string, Bilingue> = DATOS.nombres.madurez;
export const REVISION: Record<string, Bilingue> = DATOS.nombres.revision;
export const AGREGACION: Record<string, Bilingue> = DATOS.nombres.agregacion;

/** Todas las etiquetas de estado de las pantallas del catálogo, por identificador. */
export const ETIQUETAS_DE_VISTAS = Object.fromEntries(
  DATOS.etiquetas.map((e) => [
    e.id,
    { rol: e.rol, simbolo: e.simbolo, nombre: e.nombre },
  ]),
) as Record<IdDeEtiquetaDeVista, Etiqueta>;

export const SIN_CONTROL = ETIQUETAS_DE_VISTAS.sin_control;
export const SIN_CONTROL_CORTO = ETIQUETAS_DE_VISTAS.sin_control_corto;
export const MARCADA = ETIQUETAS_DE_VISTAS.marcada;
export const MARCADA_PARA_REVISION = ETIQUETAS_DE_VISTAS.marcada_para_revision;

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
