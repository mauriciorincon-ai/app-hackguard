// Prioridad de una prueba para un activo (RF-03.2): la base de la prueba más lo que el perfil suma, con la
// fórmula en datos (`datos/planificador/formula.json`). El ajuste tiene tope y el resultado, techo: sin el
// tope, un activo expuesto, con datos y capaz de actuar llevaría todo su plan al techo y la prioridad no
// ordenaría nada. La fila dice cuáles ajustes aplicaron.
import type { Activo } from "../activos/esquemas.ts";
import type { Formula, PruebaPlaneada } from "./esquemas.ts";

export function prioridadDe(
  base: number,
  perfil: Activo["perfil"],
  formula: Formula,
): PruebaPlaneada["prioridad"] {
  const aplicados = formula.ajustes.filter((a) => {
    const valor = perfil[a.cuando.campo];
    return a.cuando.igual !== undefined
      ? valor === a.cuando.igual
      : valor !== a.cuando.distinto;
  });
  const suma = aplicados.reduce((total, a) => total + a.suma, 0);
  const ajuste = Math.min(formula.tope_de_ajuste, suma);
  return {
    base,
    ajustes: aplicados.map((a) => ({ id: a.id, razon: a.razon })),
    ajuste,
    final: Math.min(formula.techo, base + ajuste),
  };
}
