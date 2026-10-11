// Esquemas del planificador: los datos que lo gobiernan (fórmula de prioridad, entornos, motivos de exclusión)
// y lo que emite (plan y paquete de ejecución). Zod 4, `strictObject`, VALIDAN y nunca TRANSFORMAN.
//
// El paquete de ejecución es declarativo (riesgo 3 del sprint): solo admite selector, criterio, k, versión
// mínima, entorno, resultado esperado, alcance, límites y reglas. No hay un campo de texto libre operativo, y
// `strictObject` rechaza cualquier campo que no esté aquí.
import { z } from "zod";
import {
  ENTORNOS,
  Fecha,
  Huella,
  IdControl,
  IdMinusculas,
  IdPrueba,
  Nombre,
  ROLES,
  Selector,
  SIMBOLOS,
  Texto,
} from "../catalogo/esquemas.ts";

export const FORMATO_DE_PLAN = "hackguard/plan@1";
export const FORMATO_DE_PAQUETE = "hackguard/paquete@1";
export const MOTIVOS_DE_EXCLUSION = ["perfil", "alcance", "operador"] as const;
export type MotivoDeExclusion = (typeof MOTIVOS_DE_EXCLUSION)[number];

// ── Datos que gobiernan al planificador ─────────────────────────────────────────────────────────

export const Formula = z.strictObject({
  version: Nombre,
  origen: Texto,
  techo: z.int().min(1).max(10),
  tope_de_ajuste: z.int().min(0).max(10),
  ajustes: z.array(
    z.strictObject({
      id: IdMinusculas,
      cuando: z
        .strictObject({
          campo: z.enum(["exposicion", "datos", "actua"]),
          igual: z.union([z.string(), z.boolean()]).optional(),
          distinto: z.union([z.string(), z.boolean()]).optional(),
        })
        .refine((c) => (c.igual === undefined) !== (c.distinto === undefined), {
          message: "formato:igual-o-distinto",
        }),
      suma: z.int().min(0).max(10),
      razon: Texto,
    }),
  ),
});
export type Formula = z.infer<typeof Formula>;

export const Entornos = z.strictObject({
  version: Nombre,
  nota: Texto,
  entornos: z
    .array(
      z.strictObject({
        id: z.enum(ENTORNOS),
        orden: z.int().min(1),
        clase: z.enum(["gratuito_local", "plan_gratuito_de_un_servicio"]),
        nombre: Texto,
      }),
    )
    .min(1),
});
export type Entornos = z.infer<typeof Entornos>;

export const Motivos = z.strictObject({
  version: Nombre,
  nota: Texto,
  motivos: z.array(
    z.strictObject({
      id: z.enum(MOTIVOS_DE_EXCLUSION),
      rol: z.enum(ROLES),
      simbolo: z.enum(SIMBOLOS),
      nombre: Texto,
      introduce: Texto.nullable(),
    }),
  ),
});
export type Motivos = z.infer<typeof Motivos>;

export const Plantilla = z.strictObject({
  version: Nombre,
  nota: Texto,
  alcance: z.array(Texto).min(1),
  reglas: z.array(Texto).min(1),
});
export type Plantilla = z.infer<typeof Plantilla>;

// ── El plan ─────────────────────────────────────────────────────────────────────────────────────

const Prioridad = z.strictObject({
  base: z.int().min(1).max(10),
  /** Los ajustes de la fórmula cuya condición cumple el perfil (antes del tope). */
  ajustes: z.array(z.strictObject({ id: IdMinusculas, razon: Texto })),
  /** Lo que se suma de verdad: la suma de los ajustes, con el tope. */
  ajuste: z.int().min(0).max(10),
  final: z.int().min(1).max(10),
});

const Herramienta = z.strictObject({
  id: IdMinusculas,
  entorno: z.enum(ENTORNOS),
  version_minima: Nombre.nullable(),
});

export const PruebaPlaneada = z.strictObject({
  prueba: IdPrueba,
  /** Por qué aplica (la condición de la prueba); nulo si el operador la agregó. */
  razon: Texto.nullable(),
  agregada: z.strictObject({ fecha: Fecha, justificacion: Texto }).nullable(),
  prioridad: Prioridad,
  /** Nulo si ningún entorno del activo cubre las herramientas que la prueba recomienda. */
  herramienta: Herramienta.nullable(),
  controles: z.array(IdControl),
});
export type PruebaPlaneada = z.infer<typeof PruebaPlaneada>;

export const PruebaExcluida = z.strictObject({
  prueba: IdPrueba,
  motivo: z.enum(MOTIVOS_DE_EXCLUSION),
  razon: Texto,
});
export type PruebaExcluida = z.infer<typeof PruebaExcluida>;

export const Cobertura = z.strictObject({
  control: IdControl,
  estado: z.enum(["con_prueba", "sin_prueba"]),
  /** Las pruebas planeadas que lo cubren. */
  pruebas: z.array(IdPrueba),
});
export type Cobertura = z.infer<typeof Cobertura>;

export const Plan = z.strictObject({
  formato: z.literal(FORMATO_DE_PLAN),
  activo: z.strictObject({ id: IdMinusculas, huella: Huella }),
  instantanea: z.strictObject({ fecha: Fecha, huella: Huella }),
  formula: z.strictObject({ version: Nombre, huella: Huella }),
  entornos: z.strictObject({ version: Nombre, huella: Huella }),
  /** Una entrada: el planificador jamás lee el reloj (regla dura 1). */
  fecha_emision: Fecha,
  resumen: z.strictObject({
    candidatas: z.int().min(0),
    otras_familias: z.int().min(0),
    planeadas: z.int().min(0),
    excluidas: z.int().min(0),
    controles_con_prueba: z.int().min(0),
    controles_sin_prueba: z.int().min(0),
    planeadas_sin_control: z.int().min(0),
    sin_herramienta: z.int().min(0),
  }),
  planeadas: z.array(PruebaPlaneada),
  excluidas: z.array(PruebaExcluida),
  cobertura: z.array(Cobertura),
  paquete: z.strictObject({ huella: Huella }),
  huella: Huella,
});
export type Plan = z.infer<typeof Plan>;

// ── El paquete de ejecución ─────────────────────────────────────────────────────────────────────

const PruebaDelPaquete = z.strictObject({
  prueba: IdPrueba,
  selector: Selector,
  /** Repeticiones, si la regla de veredicto de la prueba las pide. */
  k: z.int().min(1).max(100000).nullable(),
  criterio: z.strictObject({ regla: IdMinusculas, descripcion: Texto }),
  resultado_esperado: Texto,
});

export const Paquete = z.strictObject({
  formato: z.literal(FORMATO_DE_PAQUETE),
  activo: z.strictObject({ id: IdMinusculas, huella: Huella }),
  instantanea: z.strictObject({ fecha: Fecha, huella: Huella }),
  alcance: z.strictObject({
    incluye: z.array(Texto),
    excluye: z.array(Texto),
    ventana: Texto,
    limites: Texto,
  }),
  reglas: z.array(
    z.strictObject({ texto: Texto, cita_proveedor: z.boolean() }),
  ),
  herramientas: z.array(
    z.strictObject({
      herramienta: IdMinusculas,
      entorno: z.enum(ENTORNOS),
      version_minima: Nombre.nullable(),
      pruebas: z.array(PruebaDelPaquete).min(1),
    }),
  ),
  huella: Huella,
});
export type Paquete = z.infer<typeof Paquete>;
