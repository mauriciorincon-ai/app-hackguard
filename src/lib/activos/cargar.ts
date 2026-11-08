// Carga los activos demo y sus planes EMITIDOS, y comprueba que cada plan es lo que dice ser: su huella, la del
// paquete, el activo y la instantánea que cita, y la fórmula y los entornos vigentes. Se ejecuta en el build (Node),
// jamás en el navegador. Si algo no cuadra, lanza: más vale un build roto que una pantalla que muestra un plan que
// nadie puede reproducir. Los planes se re-emiten con `pnpm plan:emitir`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cargarActivos,
  cargarActivosPublicos,
  CARPETA_DE_PLANES,
  CARPETA_PRIVADA_DE_PLANES,
} from "./cargar-activos.ts";
import { Activo } from "../../engine/activos/esquemas.ts";
import {
  estadoDelPlan,
  Historial,
  huellaDelActivo,
  versionDelPlan,
  versionesDe,
  type VeredictoDelPlan,
  type VersionDeActivo,
} from "../../engine/activos/historial.ts";
import { validarActivos } from "../../engine/activos/validar.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { huella } from "../../engine/huella.ts";
import { listarInstantaneas } from "../catalogo/cargar-instantanea.ts";
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
  /** Sus versiones, de la más nueva a la más vieja, si tiene historial (`datos/historial/activos/`); `null` si no. */
  versiones: VersionDeActivo[] | null;
  /** ¿Sigue vigente el plan? `null` si el activo no tiene plan. Una cuenta, un cálculo: la hace `estadoDelPlan`. */
  veredicto: VeredictoDelPlan | null;
  /** La versión del activo con la que se emitió el plan, o `null` si no hay plan o el activo no tiene historial. */
  versionDelPlan: number | null;
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

/** El historial de un activo, comprobado contra el archivo de hoy; `null` si no tiene. Lanza si el historial no cuadra. */
async function cargarVersiones(
  raiz: string,
  activo: Activo,
  propio: boolean,
): Promise<VersionDeActivo[] | null> {
  const ruta = join(raiz, carpetaDeHistorial(propio), `${activo.id}.json`);
  if (!existsSync(ruta)) return null;
  return versionesDe(
    Historial.parse(JSON.parse(readFileSync(ruta, "utf8"))),
    activo,
  );
}

/** El historial de un activo propio vive en `datos/privado/` (guarda sus versiones: jamás nace menos privado que su fuente, regla 17-bis). */
export const carpetaDeHistorial = (propio: boolean) =>
  propio ? "datos/privado/historial/activos" : "datos/historial/activos";
/** Un activo es propio por su origen y por su carpeta: lo de `datos/privado/` jamás sale a `datos/planes/`. */
export const esPropio = (activo: Activo, ruta: string) =>
  activo.origen === "propio" || ruta.startsWith("datos/privado/");
export const carpetaDePlanes = (propio: boolean) =>
  propio ? CARPETA_PRIVADA_DE_PLANES : CARPETA_DE_PLANES;

/**
 * `privados: false` (el build y las pantallas) lee solo los activos demo versionados; la CLI de re-planeación pasa `privados: true` para
 * leer también los propios de `datos/privado/`, con su plan y su historial en carpetas privadas.
 */
export async function cargarActivosDelBuild(
  instantanea: Instantanea,
  raiz: string = process.cwd(),
  { privados = false }: { privados?: boolean } = {},
): Promise<MundoDeActivos> {
  const datos = cargarDatosDelPlanificador(raiz);
  const validacion = validarActivos(
    privados ? cargarActivos(raiz) : cargarActivosPublicos(raiz),
    {
      familias: instantanea.catalogo.familias.map((f) => f.id),
      rasgos: instantanea.catalogo.rasgos,
      pruebas: instantanea.catalogo.pruebas,
    },
  );
  if (validacion.estado === "invalido")
    falla(
      "los activos no pasan su validación: corre pnpm activo:validar",
      "the assets do not pass validation: run pnpm activo:validar",
    );

  const huellaDeFormula = await huella(datos.formula);
  const huellaDeEntornos = await huella(datos.entornos);
  const activos: ActivoCargado[] = [];
  for (const { activo, autorizado, ruta } of validacion.activos) {
    const propio = esPropio(activo, ruta);
    const planes = carpetaDePlanes(propio);
    if (!autorizado) {
      // Sin alcance y reglas no hay plan (regla dura 5): un plan que sobrevivió a su autorización rompe el build.
      const emitidos = ["plan.json", "paquete.json"].some((ext) =>
        existsSync(join(raiz, `${planes}/${activo.id}.${ext}`)),
      );
      if (emitidos)
        falla(
          `${activo.id}: no está autorizado y tiene un plan emitido: bórralo`,
          `${activo.id}: is not authorized and has an issued plan: delete it`,
        );
      activos.push({
        activo,
        plan: null,
        paquete: null,
        versiones: await cargarVersiones(raiz, activo, propio),
        veredicto: null,
        versionDelPlan: null,
      });
      continue;
    }
    const base = `${planes}/${activo.id}`;
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
    const versiones = await cargarVersiones(raiz, activo, propio);
    const huellaDeHoy = await huellaDelActivo(activo);
    // Un plan puede citar un activo o un catálogo que ya no son los de hoy, y eso NO rompe el build si el pasado es CONOCIDO: la
    // versión del activo está en su historial y la instantánea está en `datos/instantaneas/`. Se muestra «desactualizado», con su
    // causa. Si la huella no es de ninguna versión ni instantánea conocida, el plan no se puede reproducir: eso sí rompe.
    const versionDelPlanCitada =
      versiones === null ? null : versionDelPlan(versiones, plan);
    const activoConocido =
      plan.activo.huella === huellaDeHoy || versionDelPlanCitada !== null;
    const instantaneaConocida =
      plan.instantanea.huella === instantanea.huella ||
      listarInstantaneas(raiz).some(
        (l) => l.huella === plan.instantanea.huella,
      );
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
        activoConocido,
        "el activo cambió desde que se emitió el plan y su historial no tiene esa versión: agrega la versión a datos/historial/activos/",
        "the asset changed since the plan was issued and its history does not have that version: add the version to datos/historial/activos/",
      ],
      [
        instantaneaConocida,
        "el plan cita una instantánea que no está en datos/instantaneas/: re-emítelo",
        "the plan cites a snapshot that is not in datos/instantaneas/: issue it again",
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
    activos.push({
      activo,
      plan,
      paquete,
      versiones,
      veredicto: estadoDelPlan(plan, {
        huella_del_activo: huellaDeHoy,
        huella_de_la_instantanea: instantanea.huella,
      }),
      versionDelPlan: versionDelPlanCitada?.n ?? null,
    });
  }
  return { activos, datos };
}

/** Los bytes exactos del paquete: lo que se descarga es el mismo archivo que escribe el CLI. */
export const textoDelPaquete = (id: string, raiz: string = process.cwd()) =>
  leer(raiz, `datos/planes/${id}.paquete.json`);
