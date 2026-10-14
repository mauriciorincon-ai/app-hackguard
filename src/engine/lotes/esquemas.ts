// El lote (ADR-009): lo que un adaptador produjo al leer UN archivo de una herramienta —los sobres por confirmar de
// una corrida— y la confirmación de una persona sobre ellos. Zod 4, `strictObject`, VALIDA y nunca TRANSFORMA.
//
// El formato del sobre NO cambia (ADR-008): los sobres de un lote siguen siendo `hackguard/sobre@1` sin confirmación.
// La confirmación por lote vive AQUÍ, y el motor calcula el libro efectivo (`efectivo.ts`). El archivo de la
// herramienta jamás se guarda: el lote lleva su huella y su nombre.
//
// Tres huellas, como el sobre (E-9): `archivo` (los bytes de la herramienta), `lote` (el lote sin su confirmación: es
// la SEMILLA de la muestra) y `registro` (todo, confirmación incluida: quien lo edite después la rompe).
import { z } from "zod";
import {
  Fecha,
  Huella,
  IdMinusculas,
  Nombre,
  ROLES,
  SIMBOLOS,
  Texto,
} from "../catalogo/esquemas.ts";
import { IdSobre, ORIGENES_DE_SOBRE } from "../evidencia/esquemas.ts";

export const FORMATO_DE_LOTE = "hackguard/lote@1";

export const IdLote = z.string().regex(/^LOTE-\d{4,}$/, {
  message: "formato:id-lote",
});

/** Un lote espera, lo confirmó una persona (menos los separados) o se mandó entero a revisión individual. */
export const DECISIONES_DE_LOTE = [
  "confirmado",
  "a_revision_individual",
] as const;
export type DecisionDeLote = (typeof DECISIONES_DE_LOTE)[number];

export const ConfirmacionDeLote = z.strictObject({
  por: Nombre,
  fecha: Fecha,
  decision: z.enum(DECISIONES_DE_LOTE),
  /** Los sobres que la persona revisó: todas las fallidas y parciales y la muestra del resto, en orden. */
  revisados: z.array(IdSobre),
  /** Los que salen del lote y se confirman uno por uno (solo fallidas y parciales). */
  separados: z.array(IdSobre),
});
export type ConfirmacionDeLote = z.infer<typeof ConfirmacionDeLote>;

export const HuellasDelLote = z.strictObject({
  archivo: Huella,
  lote: Huella,
  registro: Huella,
});
export type HuellasDelLote = z.infer<typeof HuellasDelLote>;

export const SobreDelLote = z.strictObject({
  id: IdSobre,
  /** La huella del sobre SIN confirmación individual: confirmar a un separado no rompe al lote. */
  huella: Huella,
});

export const Lote = z.strictObject({
  formato: z.literal(FORMATO_DE_LOTE),
  id: IdLote,
  origen: z.enum(ORIGENES_DE_SOBRE),
  activo: IdMinusculas,
  plan: z.strictObject({ huella: Huella }),
  paquete: z.strictObject({ huella: Huella }),
  herramienta: z.strictObject({ id: IdMinusculas, version: Nombre }),
  /** El adaptador y su versión: para poder reproducir la conversión (E-8). */
  adaptador: z.strictObject({ id: IdMinusculas, version: Nombre }),
  /** El nombre del archivo (sin ruta). El archivo mismo no se guarda. */
  archivo: z.strictObject({ nombre: Nombre }),
  fecha: Fecha,
  hora: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  zona_horaria: Nombre,
  ejecutado_por: Nombre,
  advertencias: z.array(Texto),
  sobres: z.array(SobreDelLote).min(1),
  confirmacion: ConfirmacionDeLote.nullable(),
  huellas: HuellasDelLote,
});
export type Lote = z.infer<typeof Lote>;

/** El plan de muestreo (E-5) como dato: calidad límite, aceptación con cero errores. */
export const PlanDeMuestreo = z.strictObject({
  version: z.literal("1"),
  nota: Texto,
  /** El procedimiento de referencia, por su nombre (regla dura 11: de la norma solo el identificador). */
  procedimiento: Nombre,
  /** Calidad límite: el porcentaje de sobres del resto que el plan quiere rechazar si están mal. */
  calidad_limite_por_ciento: z.int().min(1).max(50),
  /** Riesgo del consumidor: la probabilidad máxima de aceptar un lote que está en la calidad límite. */
  riesgo_del_consumidor_por_ciento: z.int().min(1).max(50),
  /** Cada tramo: hasta cuántos sobres «del resto» cubre (`null` = sin tope) y cuántos se revisan (`null` = todos). */
  tramos: z
    .array(
      z.strictObject({
        hasta: z.int().positive().nullable(),
        muestra: z.int().positive().nullable(),
      }),
    )
    .min(1),
});
export type PlanDeMuestreo = z.infer<typeof PlanDeMuestreo>;

/**
 * Las etiquetas de estado de la pantalla de carga (regla dura 12: símbolo + texto + color, y el color es un rol que sale
 * de datos). Son del lote y de su revisión; los veredictos de cada sobre se nombran con el vocabulario del catálogo.
 */
export const IDS_DE_ETIQUETAS_DE_CARGA = [
  "siempre_larga",
  "en_muestra_larga",
  "fuera_de_la_muestra_larga",
  "siempre",
  "en_muestra",
  "fuera_de_la_muestra",
  "paso_hecho",
  "paso_por_hacer",
  "paso_confirmar",
  "advertencia_del_lote",
  "via_sin_construir",
  "lote_sin_confirmar",
  "lote_confirmado",
  "lote_a_revision_individual",
  "nada_por_confirmar",
] as const;
export type IdDeEtiquetaDeCarga = (typeof IDS_DE_ETIQUETAS_DE_CARGA)[number];

export const EtiquetasDeCarga = z.strictObject({
  version: z.literal("1"),
  nota: Texto,
  etiquetas: z
    .array(
      z.strictObject({
        id: z.enum(IDS_DE_ETIQUETAS_DE_CARGA),
        rol: z.enum(ROLES),
        simbolo: z.enum(SIMBOLOS),
        nombre: Texto,
      }),
    )
    .refine(
      (es) =>
        IDS_DE_ETIQUETAS_DE_CARGA.every((id) => es.some((e) => e.id === id)) &&
        new Set(es.map((e) => e.id)).size === es.length,
      { message: "etiquetas-de-carga:cada-id-una-vez" },
    ),
});
export type EtiquetasDeCarga = z.infer<typeof EtiquetasDeCarga>;
