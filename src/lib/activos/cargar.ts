// Carga los activos demo y sus planes EMITIDOS, y comprueba que cada plan es lo que dice ser: su huella, la del
// paquete, el activo y la instantánea que cita, y la fórmula y los entornos vigentes. Se ejecuta en el build (Node),
// jamás en el navegador. Si algo no cuadra, lanza: más vale un build roto que una pantalla que muestra un plan que
// nadie puede reproducir. Los planes se re-emiten con `pnpm plan:emitir`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cargarActivosPublicos } from "./cargar-activos.ts";
import { Activo } from "../../engine/activos/esquemas.ts";
import { normalizarActivo } from "../../engine/activos/normalizar.ts";
import { validarActivos } from "../../engine/activos/validar.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { huella } from "../../engine/huella.ts";
import {
  Entornos,
  Etiquetas,
  Formula,
  Motivos,
  Paquete,
  Plan,
  Plantilla,
} from "../../engine/planificador/esquemas.ts";

export interface ActivoCargado {
  activo: Activo;
  plan: Plan | null;
  paquete: Paquete | null;
}

export interface DatosDelPlanificador {
  formula: Formula;
  entornos: Entornos;
  motivos: Motivos;
  etiquetas: Etiquetas;
  plantilla: Plantilla;
}

export interface MundoDeActivos {
  activos: ActivoCargado[];
  datos: DatosDelPlanificador;
}

const leer = (raiz: string, relativa: string) =>
  readFileSync(join(raiz, relativa), "utf8");
const json = (raiz: string, relativa: string): unknown =>
  JSON.parse(leer(raiz, relativa)) as unknown;

const falla = (es: string, en: string): never => {
  throw new Error(`${es} / ${en}`);
};

export function cargarDatosDelPlanificador(raiz: string): DatosDelPlanificador {
  const d = (n: string) => json(raiz, `datos/planificador/${n}.json`);
  return {
    formula: Formula.parse(d("formula")),
    entornos: Entornos.parse(d("entornos")),
    motivos: Motivos.parse(d("motivos")),
    etiquetas: Etiquetas.parse(d("etiquetas")),
    plantilla: Plantilla.parse(d("plantilla")),
  };
}

export async function cargarActivosDelBuild(
  instantanea: Instantanea,
  raiz: string = process.cwd(),
): Promise<MundoDeActivos> {
  const datos = cargarDatosDelPlanificador(raiz);
  const validacion = validarActivos(cargarActivosPublicos(raiz), {
    familias: instantanea.catalogo.familias.map((f) => f.id),
    rasgos: instantanea.catalogo.rasgos,
    pruebas: instantanea.catalogo.pruebas,
  });
  if (validacion.estado === "invalido")
    falla(
      "los activos no pasan su validación: corre pnpm activo:validar",
      "the assets do not pass validation: run pnpm activo:validar",
    );

  const huellaDeFormula = await huella(datos.formula);
  const huellaDeEntornos = await huella(datos.entornos);
  const activos: ActivoCargado[] = [];
  for (const { activo, autorizado } of validacion.activos) {
    if (!autorizado) {
      // Sin alcance y reglas no hay plan (regla dura 5): un plan que sobrevivió a su autorización rompe el build.
      if (existsSync(join(raiz, `datos/planes/${activo.id}.plan.json`)))
        falla(
          `${activo.id}: no está autorizado y tiene un plan emitido: bórralo`,
          `${activo.id}: is not authorized and has an issued plan: delete it`,
        );
      activos.push({ activo, plan: null, paquete: null });
      continue;
    }
    const base = `datos/planes/${activo.id}`;
    let plan: Plan;
    let paquete: Paquete;
    try {
      plan = Plan.parse(json(raiz, `${base}.plan.json`));
      paquete = Paquete.parse(json(raiz, `${base}.paquete.json`));
    } catch {
      return falla(
        `${activo.id}: no tiene un plan emitido y válido: corre pnpm plan:emitir ${activo.id} --fecha AAAA-MM-DD`,
        `${activo.id}: has no valid issued plan: run pnpm plan:emitir ${activo.id} --fecha YYYY-MM-DD`,
      );
    }
    const cuerpoDelPlan: Record<string, unknown> = { ...plan };
    delete cuerpoDelPlan.huella;
    const cuerpoDelPaquete: Record<string, unknown> = { ...paquete };
    delete cuerpoDelPaquete.huella;
    const comprobaciones: [boolean, string, string][] = [
      [
        (await huella(cuerpoDelPlan)) === plan.huella,
        "su huella declarada no es la de su contenido",
        "its declared fingerprint is not its content's",
      ],
      [
        (await huella(cuerpoDelPaquete)) === paquete.huella &&
          plan.paquete.huella === paquete.huella,
        "el paquete no es el que cita el plan",
        "the package is not the one the plan cites",
      ],
      [
        plan.activo.huella === (await huella(normalizarActivo(activo))),
        "el activo cambió desde que se emitió el plan",
        "the asset changed since the plan was issued",
      ],
      [
        plan.instantanea.huella === instantanea.huella,
        "el plan cita otra instantánea que la oficial: re-emítelo",
        "the plan cites a snapshot other than the official one: issue it again",
      ],
      [
        plan.formula.huella === huellaDeFormula &&
          plan.entornos.huella === huellaDeEntornos,
        "la fórmula o los entornos cambiaron desde que se emitió el plan",
        "the formula or the environments changed since the plan was issued",
      ],
    ];
    for (const [cuadra, es, en] of comprobaciones)
      if (!cuadra) falla(`${activo.id}: ${es}`, `${activo.id}: ${en}`);
    activos.push({ activo, plan, paquete });
  }
  return { activos, datos };
}

/** Los bytes exactos del paquete: lo que se descarga es el mismo archivo que escribe el CLI. */
export const textoDelPaquete = (id: string, raiz: string = process.cwd()) =>
  leer(raiz, `datos/planes/${id}.paquete.json`);
