// Esquema del sobre de evidencia (§ 6.7 + E-8): lo que una herramienta externa dijo de una prueba, ya redactado
// y confirmado por una persona. Zod 4, `strictObject`, VALIDA y nunca TRANSFORMA.
//
// El CRUDO de la herramienta jamás entra al almacén (regla dura 4): el sobre guarda su HUELLA y un extracto
// redactado. `strictObject` rechaza cualquier campo que no esté aquí, así que un `crudo` o un `raw` no cabe.
// Un sobre sin `confirmacion` es una propuesta: no cuenta para ningún hallazgo ni para ninguna brecha.
import { z } from "zod";
import {
  Fecha,
  Huella,
  IdMinusculas,
  IdPrueba,
  Nombre,
  Selector,
  Texto,
} from "../catalogo/esquemas.ts";

export const FORMATO_DE_SOBRE = "hackguard/sobre@1";

/** `demo` vive en `datos/evidencia/demo/` (público); `propio` solo en `datos/privado/evidencia/` (regla dura 8). */
export const ORIGENES_DE_SOBRE = ["demo", "propio"] as const;
export const VEREDICTOS = [
  "superada",
  "fallida",
  "parcial",
  "no_aplicable",
  "no_ejecutada",
] as const;
export type Veredicto = (typeof VEREDICTOS)[number];
/** Un veredicto que abre un hallazgo cuando una persona lo confirma. */
export const VEREDICTOS_QUE_FALLAN = ["fallida", "parcial"] as const;
export const SENTIDOS_DE_UMBRAL = ["maximo", "minimo"] as const;

export const IdSobre = z.string().regex(/^SOB-\d{4,}$/, {
  message: "formato:id-sobre",
});
export const IdHallazgo = z.string().regex(/^HZ-\d{4,}$/, {
  message: "formato:id-hallazgo",
});

/** Una métrica medida contra el umbral que se fijó ANTES de la prueba (regla `metrica_con_umbral`). */
export const Metrica = z.strictObject({
  nombre: Texto,
  valor: z.number(),
  umbral: z.number(),
  sentido: z.enum(SENTIDOS_DE_UMBRAL),
});
export type Metrica = z.infer<typeof Metrica>;

/** Lo que la herramienta midió. Sin fecha, ejecutor ni identificadores de corrida: es lo que se compara (E-9). */
export const Resultado = z.strictObject({
  /** Hay constancia de que la prueba corrió. Sin ella, «no detectado» no es «verificado» (E-6/E-7). */
  ejecutada: z.boolean(),
  evaluadas: z.int().min(0).nullable(),
  fallidas: z.int().min(0).nullable(),
  /** Alertas de un escáner (ZAP): una o más es una falla de la prueba determinista. */
  alertas: z.int().min(0).nullable(),
  metrica: Metrica.nullable(),
});
export type Resultado = z.infer<typeof Resultado>;

export const Confirmacion = z.strictObject({
  por: Nombre,
  fecha: Fecha,
  modo: z.literal("individual"),
});
export type Confirmacion = z.infer<typeof Confirmacion>;

export const HuellasDelSobre = z.strictObject({
  /** Los bytes que la herramienta escribió. El archivo no se guarda. */
  crudo: Huella,
  /** El sobre canónico entero (sin este campo): quien lo edite después de confirmarlo la rompe. */
  sobre: Huella,
  /** Prueba, activo, configuración y resultado, sin fecha ni ejecutor: dos corridas iguales dan la misma. */
  resultado: Huella,
});
export type HuellasDelSobre = z.infer<typeof HuellasDelSobre>;

export const Sobre = z.strictObject({
  formato: z.literal(FORMATO_DE_SOBRE),
  id: IdSobre,
  origen: z.enum(ORIGENES_DE_SOBRE),
  activo: IdMinusculas,
  prueba: IdPrueba,
  /** Las huellas del plan y del paquete contra los que se corrió (ADR-007). */
  plan: z.strictObject({ huella: Huella }),
  paquete: z.strictObject({ huella: Huella }),
  herramienta: z.strictObject({ id: IdMinusculas, version: Nombre }),
  selector: Selector,
  /** La regla de veredicto de la prueba en el catálogo. */
  regla: IdMinusculas,
  k: z.int().min(1).max(100000).nullable(),
  resultado: Resultado,
  veredicto: z.enum(VEREDICTOS),
  fecha: Fecha,
  zona_horaria: Nombre,
  ejecutado_por: Nombre,
  advertencias: z.array(Texto),
  razon: Texto.nullable(),
  /** Texto inerte, redactado: nunca el crudo. Se muestra escapado (regla dura 4). */
  extracto_redactado: z.string().min(1).max(1500).nullable(),
  /** Corregir un sobre confirmado es registrar uno nuevo que lo cita; el anterior no se toca. */
  corrige: IdSobre.nullable(),
  /** El hallazgo que esta corrida intenta cerrar. */
  reprueba_de: IdHallazgo.nullable(),
  confirmacion: Confirmacion.nullable(),
  huellas: HuellasDelSobre,
});
export type Sobre = z.infer<typeof Sobre>;
