// Un activo normalizado: sus conjuntos (familias, entornos, ajustes, pruebas fuera de alcance, rasgos) en orden
// de punto de código. Así el plan y su huella no dependen del orden en que alguien escribió el archivo. Las
// listas con sentido propio (reglas, lo que incluye y excluye el alcance, canales) conservan su orden.
import { comparar, ordenado, ordenadoPor } from "../planificador/orden.ts";
import type { Activo } from "./esquemas.ts";

export function normalizarActivo(a: Activo): Activo {
  const rasgos: Record<string, boolean> = {};
  for (const id of ordenado(Object.keys(a.rasgos))) rasgos[id] = a.rasgos[id]!;
  return {
    ...a,
    familias: ordenado(a.familias),
    entornos: ordenado(a.entornos) as Activo["entornos"],
    rasgos,
    ajustes: [...a.ajustes].sort(
      (x, y) => comparar(x.prueba, y.prueba) || comparar(x.accion, y.accion),
    ),
    alcance:
      a.alcance === null
        ? null
        : {
            ...a.alcance,
            familias: ordenado(a.alcance.familias),
            fuera: ordenadoPor(a.alcance.fuera, (f) => f.prueba),
          },
  };
}
