// La escala de severidad de los hallazgos que no son de software (regla dura 7, E-12): una TABLA DE PRIORIDAD DE ACCIÓN
// que vive en datos (`datos/severidad/escala-ia.json`), con el impacto primero. No es una suma de factores: el impacto
// elige la fila, la frecuencia OBSERVADA elige la columna y la celda dice el nivel. La frecuencia no se opina: sale de
// las repeticiones del sobre que abrió el hallazgo (fallidas de evaluadas), y la banda se elige con enteros, nunca con
// decimales. Alcance y detectabilidad no cambian el nivel: ordenan los hallazgos de un mismo nivel.
//
// Un piso y un techo, declarados en los datos, impiden que la tabla minimice lo grave o exagere lo menor: la tabla que
// los viola no se carga.
import { z } from "zod";
import { Nombre, Texto } from "../catalogo/esquemas.ts";
import {
  NIVELES_DE_SEVERIDAD,
  type NivelDeSeveridad,
} from "../hallazgos/esquemas.ts";
import { estadoDe, regla, t } from "../evidencia/molde.ts";
import type {
  EstadoDeValidacion,
  HallazgoDeValidacion,
} from "../evidencia/molde.ts";

const Nivel = z.int().min(1).max(9);
const Ancla = z.strictObject({ nivel: Nivel, descripcion: Texto });

export const EscalaIa = z.strictObject({
  version: Nombre,
  nota: Texto,
  /** Las filas: del 1 (molestia) al mayor (daño a personas). */
  impacto: z.array(Ancla).min(2),
  /** Las columnas: bandas de frecuencia observada, en por ciento; cada una arranca en `desde`. */
  frecuencia: z
    .array(
      z.strictObject({
        nivel: Nivel,
        desde: z.int().min(0).max(100),
        nombre: Texto,
      }),
    )
    .min(2),
  /** Una fila por impacto, con un nivel por banda de frecuencia. */
  tabla: z
    .array(
      z.strictObject({
        impacto: Nivel,
        niveles: z.array(z.enum(NIVELES_DE_SEVERIDAD)).min(2),
      }),
    )
    .min(2),
  /** Piso («nunca menos de») y techo («nunca más de») de una fila de la tabla. */
  limites: z.array(
    z.strictObject({
      impacto: Nivel,
      tipo: z.enum(["piso", "techo"]),
      nivel: z.enum(NIVELES_DE_SEVERIDAD),
    }),
  ),
  alcance: z.array(Ancla).min(2),
  detectabilidad: z.array(Ancla).min(2),
});
export type EscalaIa = z.infer<typeof EscalaIa>;

/** De menor a mayor: el orden para comparar niveles. */
const RANGO: Record<NivelDeSeveridad, number> = {
  informativo: 0,
  bajo: 1,
  medio: 2,
  alto: 3,
  critico: 4,
};

// ── Validación de la tabla ───────────────────────────────────────────────────────────────────────

export const REGLAS_DE_ESCALA = {
  "escala/impacto-no-contiguo": regla("error", "Los impactos de la escala no van de 1 en 1 desde el 1", "The scale's impacts do not run from 1 up with no gaps"),
  "escala/alcance-no-contiguo": regla("error", "Los niveles de alcance no van de 1 en 1 desde el 1", "The reach levels do not run from 1 up with no gaps"),
  "escala/detectabilidad-no-contigua": regla("error", "Los niveles de detectabilidad no van de 1 en 1 desde el 1", "The detectability levels do not run from 1 up with no gaps"),
  "escala/frecuencia-desordenada": regla("error", "Las bandas de frecuencia no empiezan en 0, no van de 1 en 1 o no crecen", "The frequency bands do not start at 0, run without gaps or grow"),
  "escala/tabla-incompleta": regla("error", "La tabla no tiene una fila por impacto con un nivel por banda", "The table lacks a row per impact with a level per band"),
  "escala/no-monotona": regla("error", "Más impacto o más frecuencia no pueden dar un nivel menor", "More impact or more frequency cannot give a lower level"),
  "escala/limite-sin-fila": regla("error", "Un piso o un techo habla de un impacto que la tabla no tiene", "A floor or ceiling names an impact the table does not have"),
  "escala/sin-piso": regla("error", "El impacto mayor no declara su piso: lo grave no se puede minimizar", "The highest impact declares no floor: what is grave cannot be minimised"),
  "escala/sin-techo": regla("error", "El impacto menor no declara su techo: lo menor no se puede exagerar", "The lowest impact declares no ceiling: what is minor cannot be inflated"),
  "escala/viola-piso": regla("error", "Una celda queda por debajo del piso de su fila", "A cell falls below its row's floor"),
  "escala/viola-techo": regla("error", "Una celda queda por encima del techo de su fila", "A cell rises above its row's ceiling"),
} as const;
export type IdReglaDeEscala = keyof typeof REGLAS_DE_ESCALA;
export type HallazgoDeEscala = HallazgoDeValidacion<IdReglaDeEscala>;

export interface ResultadoDeValidacionDeEscala {
  estado: EstadoDeValidacion;
  hallazgos: HallazgoDeEscala[];
}

const contiguos = (niveles: readonly number[]): boolean =>
  niveles.every((n, i) => n === i + 1);

/** Valida el contenido de la tabla (la forma ya la revisó el esquema). Cada violación se nombra; ninguna se corrige. */
export function validarEscalaIa(
  escala: EscalaIa,
  ruta = "datos/severidad/escala-ia.json",
): ResultadoDeValidacionDeEscala {
  const hallazgos: HallazgoDeEscala[] = [];
  const agregar = (id: IdReglaDeEscala, campo: string, detalle?: string) => {
    const r = REGLAS_DE_ESCALA[id];
    hallazgos.push({
      regla: id,
      nombre: r.nombre,
      severidad: r.severidad,
      ruta,
      campo,
      detalle: detalle === undefined ? null : t(detalle, detalle),
    });
  };

  const impactos = escala.impacto.map((a) => a.nivel);
  if (!contiguos(impactos)) agregar("escala/impacto-no-contiguo", "impacto");
  if (!contiguos(escala.alcance.map((a) => a.nivel)))
    agregar("escala/alcance-no-contiguo", "alcance");
  if (!contiguos(escala.detectabilidad.map((a) => a.nivel)))
    agregar("escala/detectabilidad-no-contigua", "detectabilidad");

  const bandas = escala.frecuencia;
  if (
    !contiguos(bandas.map((b) => b.nivel)) ||
    bandas[0].desde !== 0 ||
    bandas.some((b, i) => i > 0 && b.desde <= bandas[i - 1].desde)
  )
    agregar("escala/frecuencia-desordenada", "frecuencia");

  const filas = new Map(escala.tabla.map((f) => [f.impacto, f.niveles]));
  const completa =
    filas.size === escala.tabla.length &&
    impactos.every((i) => filas.get(i)?.length === bandas.length) &&
    filas.size === impactos.length;
  if (!completa) {
    agregar("escala/tabla-incompleta", "tabla");
    return { estado: "invalido", hallazgos };
  }

  const rango = (impacto: number, banda: number) =>
    RANGO[filas.get(impacto)![banda]];
  for (const impacto of impactos)
    for (let b = 0; b < bandas.length; b++) {
      const sube = b > 0 && rango(impacto, b) < rango(impacto, b - 1);
      const mas = impacto > 1 && rango(impacto, b) < rango(impacto - 1, b);
      if (sube || mas)
        agregar(
          "escala/no-monotona",
          `tabla.${impacto}.${b}`,
          `impacto ${impacto}, banda ${b + 1}`,
        );
    }

  for (const [i, l] of escala.limites.entries()) {
    const fila = filas.get(l.impacto);
    if (fila === undefined) {
      agregar("escala/limite-sin-fila", `limites.${i}`, `${l.impacto}`);
      continue;
    }
    for (const [b, nivel] of fila.entries()) {
      if (l.tipo === "piso" && RANGO[nivel] < RANGO[l.nivel])
        agregar(
          "escala/viola-piso",
          `tabla.${l.impacto}.${b}`,
          `impacto ${l.impacto}, banda ${b + 1}: ${nivel} < ${l.nivel}`,
        );
      if (l.tipo === "techo" && RANGO[nivel] > RANGO[l.nivel])
        agregar(
          "escala/viola-techo",
          `tabla.${l.impacto}.${b}`,
          `impacto ${l.impacto}, banda ${b + 1}: ${nivel} > ${l.nivel}`,
        );
    }
  }
  const mayor = impactos[impactos.length - 1];
  if (!escala.limites.some((l) => l.impacto === mayor && l.tipo === "piso"))
    agregar("escala/sin-piso", "limites");
  if (!escala.limites.some((l) => l.impacto === 1 && l.tipo === "techo"))
    agregar("escala/sin-techo", "limites");

  return { estado: estadoDe(hallazgos), hallazgos };
}

// ── Lectura de la tabla ──────────────────────────────────────────────────────────────────────────

export interface FrecuenciaObservada {
  fallidas: number;
  evaluadas: number;
  /** Redondeada, solo para mostrarla; la banda se elige con los enteros. */
  porCiento: number;
  /** `false` cuando el sobre no trae conteo: una comprobación que falla, falla en su única medición. */
  deConteo: boolean;
}

/** De cuántas repeticiones falló el sobre. Sin conteo (una métrica contra su umbral), falló 1 de 1. */
export function frecuenciaObservada(resultado: {
  evaluadas: number | null;
  fallidas: number | null;
}): FrecuenciaObservada {
  const { evaluadas, fallidas } = resultado;
  if (evaluadas !== null && fallidas !== null && evaluadas > 0)
    return {
      fallidas,
      evaluadas,
      porCiento: Math.round((fallidas * 100) / evaluadas),
      deConteo: true,
    };
  return { fallidas: 1, evaluadas: 1, porCiento: 100, deConteo: false };
}

/** La banda de frecuencia (su nivel, desde 1) a la que pertenece lo observado: enteros, nunca decimales. */
export function bandaDeFrecuencia(
  escala: EscalaIa,
  f: Pick<FrecuenciaObservada, "fallidas" | "evaluadas">,
): number {
  let elegida = escala.frecuencia[0].nivel;
  for (const b of escala.frecuencia)
    if (f.fallidas * 100 >= b.desde * f.evaluadas) elegida = b.nivel;
  return elegida;
}

/** La celda de la tabla, o `null` si el impacto no está en la escala. */
export function nivelDeEscala(
  escala: EscalaIa,
  impacto: number,
  banda: number,
): NivelDeSeveridad | null {
  const fila = escala.tabla.find((f) => f.impacto === impacto);
  return fila?.niveles[banda - 1] ?? null;
}
