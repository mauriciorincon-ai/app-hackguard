// Cobertura por control del Anexo A: de los controles que citan las pruebas candidatas del activo, cuáles
// tendrán evidencia cuando el plan se ejecute (hay al menos una prueba planeada que los cubre) y cuáles no
// («sin prueba en este plan»). Una prueba sin control no cubre nada: se cuenta aparte.
import type { Cobertura } from "./esquemas.ts";
import { comparar, ordenado } from "./orden.ts";

export function coberturaDe(
  candidatas: readonly { controles: readonly string[] }[],
  planeadas: readonly { prueba: string; controles: readonly string[] }[],
): Cobertura[] {
  const universo = new Set(candidatas.flatMap((c) => c.controles));
  return ordenado([...universo]).map((control) => {
    const pruebas = planeadas
      .filter((p) => p.controles.includes(control))
      .map((p) => p.prueba)
      .sort(comparar);
    return {
      control,
      estado:
        pruebas.length > 0 ? ("con_prueba" as const) : ("sin_prueba" as const),
      pruebas,
    };
  });
}
