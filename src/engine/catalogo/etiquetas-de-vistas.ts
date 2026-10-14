// El vocabulario de las pantallas del catálogo, los controles y los marcos (`datos/vistas/etiquetas.json`): los nombres de las
// madureces, de la revisión de contenido y de la agregación de un selector, y las etiquetas de estado que no están en
// `datos/estados.json` (regla dura 10: el conocimiento es dato; regla dura 12: símbolo + texto + color, y el color es un rol que
// sale de datos, jamás de un componente). Vive fuera de la huella de la instantánea: cambiar un rótulo no cambia el catálogo.
// Zod 4, `strictObject`, VALIDA y nunca TRANSFORMA.
import { z } from "zod";
import {
  MADUREZ,
  REVISIONES_DE_CONTENIDO,
  ROLES,
  SIMBOLOS,
  Texto,
} from "./esquemas.ts";

export const IDS_DE_ETIQUETAS_DE_VISTAS = [
  // El catálogo
  "catalogo_vacio",
  "catalogo_con_error",
  "filtros_sin_resultados",
  "verificacion_vencida",
  "toca_revisarla",
  "marcada_para_revision_de_contenido",
  "aprobacion_confirmada",
  "sin_control",
  "sin_control_corto",
  "marcada",
  "marcada_para_revision",
  // Los controles
  "controles_vacio",
  "areas_con_pruebas",
  "sin_pruebas",
  "no_contrastado",
  // Los marcos
  "marcos_vacio",
  "sin_avisos_registrados",
  "instantanea_oficial",
] as const;
export type IdDeEtiquetaDeVista = (typeof IDS_DE_ETIQUETAS_DE_VISTAS)[number];

/** Cómo agrega un selector lo que miden sus detectores o sus reglas. */
export const AGREGACIONES_DE_SELECTOR = [
  "cualquier_detector",
  "todos_los_detectores",
  "cualquier_regla",
  "todas_las_reglas",
] as const;

/** Un mapa con cada clave una vez y ninguna de más. */
const Nombres = <const T extends readonly [string, ...string[]]>(claves: T) =>
  z.strictObject(
    Object.fromEntries(claves.map((k) => [k, Texto])) as Record<
      T[number],
      typeof Texto
    >,
  );

export const EtiquetasDeVistas = z.strictObject({
  version: z.literal("1"),
  nota: Texto,
  nombres: z.strictObject({
    madurez: Nombres(MADUREZ),
    revision: Nombres(REVISIONES_DE_CONTENIDO),
    agregacion: Nombres(AGREGACIONES_DE_SELECTOR),
  }),
  etiquetas: z
    .array(
      z.strictObject({
        id: z.enum(IDS_DE_ETIQUETAS_DE_VISTAS),
        rol: z.enum(ROLES),
        simbolo: z.enum(SIMBOLOS),
        nombre: Texto,
      }),
    )
    .refine(
      (es) =>
        IDS_DE_ETIQUETAS_DE_VISTAS.every((id) => es.some((e) => e.id === id)) &&
        new Set(es.map((e) => e.id)).size === es.length,
      { message: "etiquetas-de-vistas:cada-id-una-vez" },
    ),
});
export type EtiquetasDeVistas = z.infer<typeof EtiquetasDeVistas>;
