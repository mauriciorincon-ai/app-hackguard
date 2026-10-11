// Herramienta y entorno de una prueba para un activo (RF-03.3). Entre las herramientas que la prueba recomienda
// solo cuentan las cuyo entorno tiene el activo. Primero la que mide el resultado esperado (`medido_con`: la
// configuración del arnés es parte del esperado, E-2), después el entorno de menor orden en
// `datos/planificador/entornos.json` (lo que corre en tu máquina antes que el plan gratuito de un servicio) y,
// a igualdad, el orden del catálogo. Sin entorno que la cubra la prueba se planea sin herramienta, a la vista.
import type { Prueba } from "../catalogo/esquemas.ts";
import type { Entornos } from "./esquemas.ts";

export type Recomendada = Prueba["herramientas_recomendadas"][number];

export interface HerramientaElegida {
  id: string;
  entorno: Recomendada["entorno"];
  version_minima: string | null;
  recomendada: Recomendada;
}

export function elegirHerramienta(
  prueba: Pick<Prueba, "herramientas_recomendadas" | "resultado_esperado">,
  disponibles: readonly string[],
  entornos: Entornos,
): HerramientaElegida | null {
  const orden = new Map(entornos.entornos.map((e) => [e.id, e.orden]));
  const posibles = prueba.herramientas_recomendadas
    .map((recomendada, posicion) => ({ recomendada, posicion }))
    .filter((c) => disponibles.includes(c.recomendada.entorno));
  posibles.sort((a, b) => {
    const mide = (c: (typeof posibles)[number]) =>
      c.recomendada.herramienta === prueba.resultado_esperado.medido_con
        ? 0
        : 1;
    return (
      mide(a) - mide(b) ||
      (orden.get(a.recomendada.entorno) ?? 0) -
        (orden.get(b.recomendada.entorno) ?? 0) ||
      a.posicion - b.posicion
    );
  });
  const elegida = posibles[0]?.recomendada;
  if (elegida === undefined) return null;
  return {
    id: elegida.herramienta,
    entorno: elegida.entorno,
    version_minima: elegida.version_minima ?? null,
    recomendada: elegida,
  };
}
