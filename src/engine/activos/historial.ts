// El historial de un activo (D3 del Sprint 10): sus versiones, cada una con su huella, y qué cambió de una a la siguiente. Un plan cita la
// huella del activo con el que se emitió (`plan.activo.huella`); si el activo cambia, esa huella ya no es la de hoy y el plan queda
// «desactualizado»: se sigue mostrando, con su causa, jamás se borra ni se re-emite solo. PURO y determinista (regla dura 1): sin reloj,
// sin azar, sin modelo.
//
// Un activo es un archivo; su versión VIGENTE es ese archivo. Las anteriores viajan completas en el historial (hace falta el activo entero
// para comprobar que su huella es la que el plan citó); la vigente solo lleva su huella, que debe ser la del archivo de hoy. Un activo que
// cambió sin dejar una versión en su historial no es «desactualizado»: es un error, y el build se rompe (más vale eso que un plan sin dueño).
import { z } from "zod";
import { Fecha, Huella, IdMinusculas, Texto } from "../catalogo/esquemas.ts";
import { huella } from "../huella.ts";
import { comparar } from "../planificador/orden.ts";
import type { Plan } from "../planificador/esquemas.ts";
import { Activo } from "./esquemas.ts";
import { normalizarActivo } from "./normalizar.ts";

export const FORMATO_DE_HISTORIAL = "hackguard/historial-de-activo@1";

const Anterior = z.strictObject({
  n: z.int().min(1),
  fecha: Fecha,
  /** La huella del activo normalizado de esta versión: la que un plan emitido con ella cita. */
  huella: Huella,
  cambio: Texto,
  activo: Activo,
});

export const Historial = z.strictObject({
  formato: z.literal(FORMATO_DE_HISTORIAL),
  activo: IdMinusculas,
  nota: Texto,
  anteriores: z.array(Anterior).min(1),
  /** La versión vigente: su huella es la del archivo del activo que hoy está en `datos/activos/`. */
  actual: z.strictObject({
    n: z.int().min(2),
    fecha: Fecha,
    huella: Huella,
    cambio: Texto,
  }),
});
export type Historial = z.infer<typeof Historial>;

/** La huella de un activo: sobre su forma normalizada, la misma que escribe el planificador en el plan. */
export const huellaDelActivo = (a: Activo): Promise<string> =>
  huella(normalizarActivo(a));

export interface VersionDeActivo {
  n: number;
  fecha: string;
  huella: string;
  cambio: { es: string; en: string };
  vigente: boolean;
  /** El activo completo de esa versión. */
  activo: Activo;
}

/** Comprueba el historial contra el activo de hoy y devuelve las versiones, de la más nueva a la más vieja. Lanza si no cuadra. */
export async function versionesDe(
  historial: Historial,
  actual: Activo,
): Promise<VersionDeActivo[]> {
  const falla = (es: string, en: string): never => {
    throw new Error(`${historial.activo}: ${es} / ${historial.activo}: ${en}`);
  };
  if (actual.id !== historial.activo)
    falla(
      "el historial es de otro activo",
      "the history belongs to another asset",
    );
  const versiones: VersionDeActivo[] = [];
  for (const [i, v] of historial.anteriores.entries()) {
    if (v.n !== i + 1)
      falla(
        `las versiones no son consecutivas (la ${i + 1} dice ser la ${v.n})`,
        `the versions are not consecutive (version ${i + 1} says it is ${v.n})`,
      );
    if (v.activo.id !== historial.activo)
      falla(
        `la versión ${v.n} es de otro activo`,
        `version ${v.n} belongs to another asset`,
      );
    if ((await huellaDelActivo(v.activo)) !== v.huella)
      falla(
        `la huella de la versión ${v.n} no es la de su contenido`,
        `the fingerprint of version ${v.n} is not its content's`,
      );
    versiones.push({
      n: v.n,
      fecha: v.fecha,
      huella: v.huella,
      cambio: v.cambio,
      vigente: false,
      activo: v.activo,
    });
  }
  if (historial.actual.n !== historial.anteriores.length + 1)
    falla(
      "la versión vigente no sigue a la última anterior",
      "the current version does not follow the last earlier one",
    );
  if ((await huellaDelActivo(actual)) !== historial.actual.huella)
    falla(
      "el activo cambió sin dejar una versión nueva en su historial",
      "the asset changed without leaving a new version in its history",
    );
  const fechas = [
    ...historial.anteriores.map((v) => v.fecha),
    historial.actual.fecha,
  ];
  if (fechas.some((f, i) => i > 0 && f < fechas[i - 1]!))
    falla(
      "las fechas de las versiones retroceden",
      "the versions' dates go backwards",
    );
  versiones.push({
    n: historial.actual.n,
    fecha: historial.actual.fecha,
    huella: historial.actual.huella,
    cambio: historial.actual.cambio,
    vigente: true,
    activo: actual,
  });
  return versiones.reverse();
}

// ── Qué cambió entre dos versiones ──────────────────────────────────────────────────────────────

export interface CambioDeActivo {
  /** Ruta con puntos: `perfil.exposicion`, `rasgos.modelo_de_terceros`, `alcance.familias`… */
  campo: string;
  /** `null` si el campo no existía de ese lado. */
  antes: unknown;
  despues: unknown;
}

const esTexto = (v: unknown): boolean =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  Object.keys(v).length === 2 &&
  "es" in v &&
  "en" in v;

function aplanar(
  valor: unknown,
  ruta: string,
  salida: Map<string, unknown>,
): void {
  if (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor) &&
    !esTexto(valor)
  ) {
    for (const k of Object.keys(valor)) {
      aplanar(
        (valor as Record<string, unknown>)[k],
        ruta === "" ? k : `${ruta}.${k}`,
        salida,
      );
    }
    return;
  }
  salida.set(ruta, valor);
}

/** Los campos que difieren entre dos versiones del activo, en orden alfabético. Compara sus formas normalizadas por su huella JCS. */
export async function diferenciasDeActivo(
  de: Activo,
  a: Activo,
): Promise<CambioDeActivo[]> {
  const x = new Map<string, unknown>();
  const y = new Map<string, unknown>();
  aplanar(normalizarActivo(de), "", x);
  aplanar(normalizarActivo(a), "", y);
  const campos = [...new Set([...x.keys(), ...y.keys()])].sort(comparar);
  const cambios: CambioDeActivo[] = [];
  for (const campo of campos) {
    const antes = x.get(campo) ?? null;
    const despues = y.get(campo) ?? null;
    if ((await huella(antes)) !== (await huella(despues)))
      cambios.push({ campo, antes, despues });
  }
  return cambios;
}

// ── El plan frente a lo que hoy es el activo y el catálogo ──────────────────────────────────────

/** Por qué un plan se desactualiza: el activo cambió (perfil) o el catálogo oficial es otro (catálogo). */
export const CAUSAS_DE_DESACTUALIZACION = ["perfil", "catalogo"] as const;
export type CausaDeDesactualizacion =
  (typeof CAUSAS_DE_DESACTUALIZACION)[number];

/** Los estados del plan que el motor calcula. Su etiqueta (símbolo + texto + rol) vive en `datos/planificador/etiquetas.json` (regla dura 12). */
export const ESTADOS_DEL_PLAN = ["vigente", "plan_desactualizado"] as const;
export type EstadoDelPlan = (typeof ESTADOS_DEL_PLAN)[number];

export interface VeredictoDelPlan {
  estado: EstadoDelPlan;
  /** Vacío si es «vigente». Si el activo cambió Y el catálogo es otro, las dos, en este orden. */
  por: CausaDeDesactualizacion[];
}

/**
 * ¿Sigue vigente un plan? Lo es si cita la huella del activo de hoy y la de la instantánea oficial; si no, queda «desactualizado»
 * con la causa o las causas. Es una comparación de huellas: no mira fechas ni el reloj.
 */
export function estadoDelPlan(
  plan: Pick<Plan, "activo" | "instantanea">,
  hoy: { huella_del_activo: string; huella_de_la_instantanea: string },
): VeredictoDelPlan {
  const por: CausaDeDesactualizacion[] = [];
  if (plan.activo.huella !== hoy.huella_del_activo) por.push("perfil");
  if (plan.instantanea.huella !== hoy.huella_de_la_instantanea)
    por.push("catalogo");
  return {
    estado: por.length === 0 ? "vigente" : "plan_desactualizado",
    por,
  };
}

/** La versión del activo con la que se emitió un plan, o `null` si su huella no es de ninguna versión conocida. */
export const versionDelPlan = (
  versiones: readonly VersionDeActivo[],
  plan: Pick<Plan, "activo">,
): VersionDeActivo | null =>
  versiones.find((v) => v.huella === plan.activo.huella) ?? null;
