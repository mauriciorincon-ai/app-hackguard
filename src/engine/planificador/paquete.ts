// Paquete de ejecución: lo que se corre y dentro de qué límites, agrupado por herramienta. Es DECLARATIVO: sale
// de lo que el catálogo ya revisó (selector, criterio de veredicto, k, resultado esperado) y de lo que el dueño
// declaró (alcance, límites, reglas). No lleva cargas ni procedimientos (regla dura 3).
import type { Activo } from "../activos/esquemas.ts";
import type { Prueba } from "../catalogo/esquemas.ts";
import { huella } from "../huella.ts";
import { FORMATO_DE_PAQUETE, type Paquete } from "./esquemas.ts";
import type { HerramientaElegida } from "./herramienta.ts";
import { comparar } from "./orden.ts";

export interface Elegida {
  prueba: Prueba;
  herramienta: HerramientaElegida;
}

export async function construirPaquete(
  activo: Activo,
  huellaDelActivo: string,
  instantanea: { fecha: string; huella: string },
  elegidas: readonly Elegida[],
): Promise<Paquete> {
  if (activo.alcance === null || activo.reglas === null)
    throw new Error("un activo sin alcance ni reglas no tiene paquete");
  const grupos = new Map<string, Paquete["herramientas"][number]>();
  for (const { prueba, herramienta } of elegidas) {
    const clave = `${herramienta.id}|${herramienta.entorno}|${herramienta.version_minima ?? ""}`;
    let grupo = grupos.get(clave);
    if (grupo === undefined) {
      grupo = {
        herramienta: herramienta.id,
        entorno: herramienta.entorno,
        version_minima: herramienta.version_minima,
        pruebas: [],
      };
      grupos.set(clave, grupo);
    }
    grupo.pruebas.push({
      prueba: prueba.id,
      selector: herramienta.recomendada.selector,
      k: prueba.criterio_de_veredicto.repeticiones_k ?? null,
      criterio: {
        regla: prueba.criterio_de_veredicto.regla,
        descripcion: prueba.criterio_de_veredicto.descripcion,
      },
      resultado_esperado: prueba.resultado_esperado.descripcion,
    });
  }
  const herramientas = [...grupos.entries()]
    .sort(([a], [b]) => comparar(a, b))
    .map(([, g]) => ({
      ...g,
      pruebas: [...g.pruebas].sort((a, b) => comparar(a.prueba, b.prueba)),
    }));
  const cuerpo = {
    formato: FORMATO_DE_PAQUETE,
    activo: { id: activo.id, huella: huellaDelActivo },
    instantanea,
    alcance: {
      incluye: activo.alcance.incluye,
      excluye: activo.alcance.excluye,
      ventana: activo.alcance.ventana,
      limites: activo.alcance.limites,
    },
    reglas: activo.reglas,
    herramientas,
  } as const;
  return { ...cuerpo, huella: await huella(cuerpo) };
}
