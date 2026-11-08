// El planificador (RF-03): de un activo autorizado y la instantánea del catálogo sale un plan y su paquete de
// ejecución. PURO y determinista (regla dura 1): la fecha de emisión es una entrada, no hay reloj, no hay azar
// y NINGÚN modelo decide nada. La misma entrada da los mismos bytes en Node y en cualquier navegador, aunque
// las listas de conjuntos (familias, entornos, ajustes, pruebas fuera de alcance) vengan en otro orden.
//
// Reglas, en este orden, para cada prueba aprobada de las familias del activo:
//   1. Si el perfil no cumple su aplicabilidad y el operador no la agregó → excluida, motivo `perfil`.
//   2. Si está fuera del alcance autorizado → excluida, motivo `alcance` (también una agregada).
//   3. Si el operador la quitó → excluida, motivo `operador`.
//   4. Si no, planeada, con su prioridad (fórmula en datos) y su herramienta (entornos del activo).
// Las pruebas de otras familias no se consideran: se cuentan.
import { estaAutorizado, type Activo } from "../activos/esquemas.ts";
import { normalizarActivo } from "../activos/normalizar.ts";
import {
  filtrar,
  type Marca,
  type PatronCompilado,
} from "../catalogo/filtro.ts";
import { esFechaCivil } from "../fecha.ts";
import { huella } from "../huella.ts";
import type { Instantanea } from "../catalogo/instantanea.ts";
import { coberturaDe } from "./cobertura.ts";
import { decidirPrueba } from "./decision.ts";
import {
  FORMATO_DE_PLAN,
  type Entornos,
  type Formula,
  type Plan,
  type PruebaExcluida,
  type PruebaPlaneada,
} from "./esquemas.ts";
import { comparar } from "./orden.ts";
import { construirPaquete, type Elegida } from "./paquete.ts";
import type { Paquete } from "./esquemas.ts";

export interface EntradaDelPlan {
  activo: Activo;
  instantanea: Instantanea;
  formula: Formula;
  entornos: Entornos;
  /** Fecha de emisión AAAA-MM-DD: una entrada, nunca el reloj. */
  fecha: string;
  /** Patrones del filtro de contenido compilados: si vienen, se corren sobre el texto del dueño que llega al paquete. */
  patrones?: readonly PatronCompilado[];
}

export type ResultadoDelPlan =
  | { emitido: true; plan: Plan; paquete: Paquete; marcas: Marca[] }
  | { emitido: false; motivo: "sin_autorizacion"; activo: string };

/** `RangeError` si la fecha no existe o es anterior a la instantánea: son errores de quien la pide. */
function comprobarFecha(fecha: string, instantanea: Instantanea) {
  if (!esFechaCivil(fecha)) throw new RangeError(`fecha inválida: ${fecha}`);
  if (fecha < instantanea.fecha_evaluacion)
    throw new RangeError(
      `la fecha de emisión (${fecha}) es anterior a la instantánea (${instantanea.fecha_evaluacion})`,
    );
}

export async function planificar(
  entrada: EntradaDelPlan,
): Promise<ResultadoDelPlan> {
  const { instantanea, formula, entornos, fecha } = entrada;
  comprobarFecha(fecha, instantanea);
  const activo = normalizarActivo(entrada.activo);
  // Sin alcance autorizado y reglas de enfrentamiento no hay plan (regla dura 5).
  if (!estaAutorizado(activo) || activo.alcance === null)
    return { emitido: false, motivo: "sin_autorizacion", activo: activo.id };
  const alcance = activo.alcance;

  const pruebas = instantanea.catalogo.pruebas;
  const candidatas = pruebas
    .filter(
      (p) =>
        p.estado_aprobacion === "aprobada" &&
        activo.familias.includes(p.familia),
    )
    .sort((a, b) => comparar(a.id, b.id));
  const ajustes = new Map(activo.ajustes.map((a) => [a.prueba, a]));

  const planeadas: PruebaPlaneada[] = [];
  const elegidas: Elegida[] = [];
  const excluidas: PruebaExcluida[] = [];

  for (const prueba of candidatas) {
    const d = decidirPrueba(
      prueba,
      activo,
      alcance,
      ajustes.get(prueba.id),
      formula,
      entornos,
    );
    if (d.tipo === "excluida") excluidas.push(d.excluida);
    else {
      planeadas.push(d.planeada);
      if (d.elegida !== null) elegidas.push(d.elegida);
    }
  }
  // De mayor a menor prioridad; a igualdad, por id.
  planeadas.sort(
    (a, b) =>
      b.prioridad.final - a.prioridad.final || comparar(a.prueba, b.prueba),
  );

  const cobertura = coberturaDe(candidatas, planeadas);
  const huellaDelActivo = await huella(activo);
  const referencia = {
    fecha: instantanea.fecha_evaluacion,
    huella: instantanea.huella,
  };
  const paquete = await construirPaquete(
    activo,
    huellaDelActivo,
    referencia,
    elegidas,
  );

  const cuerpo = {
    formato: FORMATO_DE_PLAN,
    activo: { id: activo.id, huella: huellaDelActivo },
    instantanea: referencia,
    formula: { version: formula.version, huella: await huella(formula) },
    entornos: { version: entornos.version, huella: await huella(entornos) },
    fecha_emision: fecha,
    resumen: {
      candidatas: candidatas.length,
      otras_familias: pruebas.filter(
        (p) => !activo.familias.includes(p.familia),
      ).length,
      planeadas: planeadas.length,
      excluidas: excluidas.length,
      controles_con_prueba: cobertura.filter((c) => c.estado === "con_prueba")
        .length,
      controles_sin_prueba: cobertura.filter((c) => c.estado === "sin_prueba")
        .length,
      planeadas_sin_control: planeadas.filter((p) => p.controles.length === 0)
        .length,
      sin_herramienta: planeadas.filter((p) => p.herramienta === null).length,
    },
    planeadas,
    excluidas,
    cobertura,
    paquete: { huella: paquete.huella },
  } as const;
  const plan: Plan = { ...cuerpo, huella: await huella(cuerpo) };

  const marcas =
    entrada.patrones === undefined
      ? []
      : filtrar({ alcance: paquete.alcance, reglas: paquete.reglas }, [
          ...entrada.patrones,
        ]);
  return { emitido: true, plan, paquete, marcas };
}
