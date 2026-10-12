// Esquema del hallazgo (§ 6.8): evidencia confirmada de que un control falla. Zod 4, `strictObject`, VALIDA y
// nunca TRANSFORMA.
//
// El archivo guarda SOLO lo que una persona declara: de qué sobre nace, el título y la descripción, la entrada de la
// severidad y los eventos (corrección, aceptación del riesgo, eliminación, no se reproduce). Lo que se puede
// calcular NO se guarda: el estado, el plazo, la severidad, la prueba, la familia, los controles y el activo salen
// del libro y de la instantánea. Así ningún archivo puede contradecir al libro, y «cerrado» no se puede escribir
// a mano: lo calcula la regla de cierre (regla dura 6).
import { z } from "zod";
import {
  Fecha,
  IdMinusculas,
  Nombre,
  ROLES,
  SIMBOLOS,
  Texto,
} from "../catalogo/esquemas.ts";
import { IdHallazgo, IdSobre } from "../evidencia/esquemas.ts";

export const FORMATO_DE_HALLAZGO = "hackguard/hallazgo@1";

export const ESTADOS_DE_HALLAZGO = [
  "abierto",
  "corregido",
  "re_probado",
  "cerrado",
  "cerrado_por_eliminacion",
  "no_reproducible",
  "aceptado_con_riesgo",
] as const;
export type EstadoDeHallazgo = (typeof ESTADOS_DE_HALLAZGO)[number];

export const NIVELES_DE_SEVERIDAD = [
  "critico",
  "alto",
  "medio",
  "bajo",
  "informativo",
] as const;
export type NivelDeSeveridad = (typeof NIVELES_DE_SEVERIDAD)[number];

/** Lo que la persona aporta para calcular la severidad; el nivel lo calcula el motor (regla dura 7). */
export const SeveridadDeEntrada = z.discriminatedUnion("tipo", [
  z.strictObject({
    tipo: z.literal("cvss"),
    /** El vector CVSS 4.0 completo; el validador estricto lo revisa antes de puntuarlo. */
    vector: z.string().min(1),
  }),
  z.strictObject({
    tipo: z.literal("escala_ia"),
    impacto: z.int().min(1).max(4),
    alcance: z.int().min(1).max(4),
    detectabilidad: z.int().min(1).max(4),
  }),
]);
export type SeveridadDeEntrada = z.infer<typeof SeveridadDeEntrada>;

const base = { fecha: Fecha, por: Nombre };

/** Una declaración de la persona sobre el hallazgo. Se agrega, no se edita. */
export const Evento = z.discriminatedUnion("tipo", [
  z.strictObject({ tipo: z.literal("correccion"), ...base, nota: Texto }),
  z.strictObject({
    tipo: z.literal("aceptacion"),
    ...base,
    /** Cuándo vuelve a tocar revisar el riesgo aceptado. */
    revision_en_dias: z.int().min(1).max(3650),
    justificacion: Texto,
  }),
  z.strictObject({
    tipo: z.literal("eliminacion"),
    ...base,
    justificacion: Texto,
  }),
  z.strictObject({
    tipo: z.literal("no_reproducible"),
    ...base,
    justificacion: Texto,
  }),
]);
export type Evento = z.infer<typeof Evento>;
export type TipoDeEvento = Evento["tipo"];

export const Hallazgo = z.strictObject({
  formato: z.literal(FORMATO_DE_HALLAZGO),
  id: IdHallazgo,
  origen: z.enum(["demo", "propio"]),
  /** El sobre confirmado, `fallida` o `parcial`, del que nace. */
  sobre_origen: IdSobre,
  titulo: Texto,
  descripcion: Texto,
  severidad: SeveridadDeEntrada,
  eventos: z.array(Evento),
});
export type Hallazgo = z.infer<typeof Hallazgo>;

// ── Datos que gobiernan a los hallazgos ──────────────────────────────────────────────────────────

/** Días para atender un hallazgo según su severidad; `null` = esa severidad no tiene plazo. */
export const Plazos = z.strictObject({
  version: Nombre,
  nota: Texto,
  dias: z.strictObject({
    critico: z.int().min(1).nullable(),
    alto: z.int().min(1).nullable(),
    medio: z.int().min(1).nullable(),
    bajo: z.int().min(1).nullable(),
    informativo: z.int().min(1).nullable(),
  }),
});
export type Plazos = z.infer<typeof Plazos>;

/** Por qué una re-prueba no cierra un hallazgo (ver `ciclo.ts`). */
export const MOTIVOS_DE_RECHAZO = [
  "sin_correccion",
  "sin_confirmar",
  "otro_activo",
  "otra_prueba",
  "no_ejecutada",
  "no_superada",
  "anterior_a_la_correccion",
  "otra_herramienta",
  "otra_version",
  "otro_selector",
  "k_menor",
] as const;
export type MotivoDeRechazo = (typeof MOTIVOS_DE_RECHAZO)[number];

export const EtiquetasDeHallazgo = z.strictObject({
  version: Nombre,
  nota: Texto,
  etiquetas: z.array(
    z.strictObject({
      id: IdMinusculas,
      rol: z.enum(ROLES),
      simbolo: z.enum(SIMBOLOS),
      nombre: Texto,
    }),
  ),
  motivos_de_rechazo: z.array(
    z.strictObject({ id: z.enum(MOTIVOS_DE_RECHAZO), nombre: Texto }),
  ),
});
export type EtiquetasDeHallazgo = z.infer<typeof EtiquetasDeHallazgo>;
