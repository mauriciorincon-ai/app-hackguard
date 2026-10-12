// El molde de hallazgos de los validadores de evidencia y de hallazgos: el mismo que el del catálogo y el de
// activos (regla con nombre y severidad, ruta, campo, nombre bilingüe, detalle). Aquí solo viven las piezas
// que los dos validadores comparten; las reglas de cada uno viven en su módulo.
import type { z } from "zod";
import { comparar } from "../planificador/orden.ts";

export type TextoBilingue = { es: string; en: string };
export type SeveridadDeRegla = "error" | "advertencia" | "nota";

export const regla = (severidad: SeveridadDeRegla, es: string, en: string) => ({
  severidad,
  nombre: { es, en } as TextoBilingue,
});

export const t = (es: string, en: string): TextoBilingue => ({ es, en });
export const comillas = (s: string): TextoBilingue => t(`«${s}»`, `“${s}”`);
export const nombreDeArchivo = (ruta: string): string =>
  ruta.slice(ruta.lastIndexOf("/") + 1);

export interface HallazgoDeValidacion<R extends string> {
  regla: R;
  severidad: SeveridadDeRegla;
  ruta: string;
  campo: string;
  nombre: TextoBilingue;
  detalle: TextoBilingue | null;
}

export type EstadoDeValidacion = "ok" | "con_advertencias" | "invalido";

export function describir(problema: z.core.$ZodIssue): TextoBilingue {
  const donde = problema.path.length > 0 ? problema.path.join(".") : "(raíz)";
  return t(`${donde}: ${problema.message}`, `${donde}: ${problema.message}`);
}

export function estadoDe(
  hallazgos: readonly { severidad: SeveridadDeRegla }[],
): EstadoDeValidacion {
  return hallazgos.some((h) => h.severidad === "error")
    ? "invalido"
    : hallazgos.some((h) => h.severidad === "advertencia")
      ? "con_advertencias"
      : "ok";
}

export function ordenarHallazgos<R extends string>(
  hallazgos: HallazgoDeValidacion<R>[],
): void {
  hallazgos.sort(
    (x, y) =>
      comparar(x.ruta, y.ruta) ||
      comparar(x.campo, y.campo) ||
      comparar(x.regla, y.regla),
  );
}

/** Compara dos versiones «1.9.1» por partes numéricas; null si alguna no es comparable. */
export function compararVersiones(a: string, b: string): number | null {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  if ([...pa, ...pb].some((n) => !Number.isInteger(n) || n < 0)) return null;
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
