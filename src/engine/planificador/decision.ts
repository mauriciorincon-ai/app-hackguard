// La decisión del planificador sobre UNA prueba (RF-03): entra al plan, o queda fuera y por qué. Es la misma cuenta para el plan y para el
// re-plan (D4 del Sprint 10): «una cuenta, un cálculo». PURA y determinista (regla dura 1).
//
// Reglas, en este orden:
//   1. Si el perfil no cumple su aplicabilidad y el operador no la agregó → excluida, motivo `perfil`.
//   2. Si está fuera del alcance autorizado → excluida, motivo `alcance` (también una agregada).
//   3. Si el operador la quitó → excluida, motivo `operador`.
//   4. Si no, planeada, con su prioridad (fórmula en datos) y su herramienta (entornos del activo).
import type { Activo, Alcance } from "../activos/esquemas.ts";
import type { Prueba } from "../catalogo/esquemas.ts";
import { aplicaPorPerfil } from "./aplicabilidad.ts";
import { fueraDeAlcance } from "./alcance.ts";
import type {
  Entornos,
  Formula,
  PruebaExcluida,
  PruebaPlaneada,
} from "./esquemas.ts";
import { elegirHerramienta } from "./herramienta.ts";
import { comparar } from "./orden.ts";
import type { Elegida } from "./paquete.ts";
import { prioridadDe } from "./prioridad.ts";

export type DecisionDeUnaPrueba =
  | { tipo: "planeada"; planeada: PruebaPlaneada; elegida: Elegida | null }
  | { tipo: "excluida"; excluida: PruebaExcluida };

/** `activo` llega normalizado y autorizado (con `alcance`); `ajuste` es el del operador para esta prueba, si lo hay. */
export function decidirPrueba(
  prueba: Prueba,
  activo: Activo,
  alcance: Alcance,
  ajuste: Activo["ajustes"][number] | undefined,
  formula: Formula,
  entornos: Entornos,
): DecisionDeUnaPrueba {
  const pide = aplicaPorPerfil(activo, prueba.aplicabilidad);
  const agregada = !pide && ajuste?.accion === "agregada" ? ajuste : null;
  if (!pide && agregada === null)
    return {
      tipo: "excluida",
      excluida: {
        prueba: prueba.id,
        motivo: "perfil",
        razon: prueba.aplicabilidad.descripcion,
      },
    };
  const razonDeAlcance = fueraDeAlcance(alcance, prueba);
  if (razonDeAlcance !== null)
    return {
      tipo: "excluida",
      excluida: {
        prueba: prueba.id,
        motivo: "alcance",
        razon: razonDeAlcance,
      },
    };
  if (ajuste?.accion === "quitada")
    return {
      tipo: "excluida",
      excluida: {
        prueba: prueba.id,
        motivo: "operador",
        razon: ajuste.justificacion,
      },
    };
  const herramienta = elegirHerramienta(prueba, activo.entornos, entornos);
  return {
    tipo: "planeada",
    planeada: {
      prueba: prueba.id,
      razon: agregada === null ? prueba.aplicabilidad.descripcion : null,
      agregada:
        agregada === null
          ? null
          : { fecha: agregada.fecha, justificacion: agregada.justificacion },
      prioridad: prioridadDe(prueba.prioridad_base, activo.perfil, formula),
      herramienta:
        herramienta === null
          ? null
          : {
              id: herramienta.id,
              entorno: herramienta.entorno,
              version_minima: herramienta.version_minima,
            },
      controles: [...prueba.controles].sort(comparar),
    },
    elegida: herramienta === null ? null : { prueba, herramienta },
  };
}
