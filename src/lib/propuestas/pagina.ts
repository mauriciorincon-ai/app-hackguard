// El mundo de las propuestas para las pantallas: las corridas selladas, el libro de decisiones, la bandeja que sale de los dos y los
// avisos de versión. UNA cuenta (design-system § 9): `porDecidir` y `avisosDeVersion` son las del motor, y la bandeja, el tablero, la
// brecha, el informe y Marcos leen estas. Solo corre en el build (Node), jamás en el navegador: la CI no toca la red.
//
// Una corrida ilegible (no cumple su esquema, o su huella no es la de su contenido) no se muestra para aprobar: queda en
// `problemasDeCarga` y la pantalla la reporta; las demás siguen. Un libro de decisiones incoherente, en cambio, detiene el build.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import {
  avisosDeVersion,
  type AvisoDeVersion,
} from "../../engine/propuestas/avisos.ts";
import {
  bandeja,
  porDecidir,
  validarDecisiones,
  type FilaDeBandeja,
} from "../../engine/propuestas/decisiones.ts";
import type { EtiquetasDePropuestas } from "../../engine/propuestas/etiquetas.ts";
import type {
  Decision,
  PropuestaSellada,
  UmbralesDePropuestas,
} from "../../engine/propuestas/esquemas.ts";
import {
  evaluarCriterios,
  type CriterioEvaluado,
} from "../../engine/propuestas/traza.ts";
import {
  cargarActivosDelBuild,
  type MundoDeActivos,
} from "../activos/cargar.ts";
import { cargarInstantaneaOficial } from "../catalogo/cargar-instantanea.ts";
import { fechaDeConsulta } from "../catalogo/consulta.ts";
import { fechaDelCommit } from "../catalogo/fecha-del-commit.ts";
import type { Investigacion } from "./resumen.ts";
import {
  cargarCorridas,
  cargarDecisiones,
  cargarEtiquetasDePropuestas,
  cargarUmbralesDePropuestas,
  datosDeMarcos,
  type CorridaCargada,
  type ProblemaDeCarga,
} from "./cargar.ts";

export interface MundoDePropuestas {
  instantanea: Instantanea;
  /** El nombre de la instantánea oficial (fecha y huella abreviada). */
  nombre: string;
  /** La fecha de consulta (AAAA-MM-DD): HACKGUARD_CONSULTA o la del commit; jamás el reloj. */
  consulta: string;
  activos: MundoDeActivos;
  etiquetas: EtiquetasDePropuestas;
  umbrales: UmbralesDePropuestas;
  corridas: CorridaCargada[];
  problemasDeCarga: ProblemaDeCarga[];
  decisiones: Decision[];
  propuestas: PropuestaSellada[];
  filas: FilaDeBandeja[];
  /** UNA cuenta: cuántas esperan una decisión. */
  porDecidir: number;
  avisos: AvisoDeVersion[];
  criterios: CriterioEvaluado[];
  /** La corrida más reciente del investigador: sin ella nadie puede decir que un marco NO tiene versión nueva. */
  investigacion: Investigacion | null;
}

/** La corrida más reciente del investigador (el nombre ordena por fecha y por número). */
function ultimaInvestigacion(
  corridas: CorridaCargada[],
): MundoDePropuestas["investigacion"] {
  const ultima = corridas
    .filter((c) => c.corrida.agente === "investigador")
    .map((c) => c.corrida)
    .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))[0];
  if (ultima === undefined) return null;
  const noLeidas = ultima.consulta.no_accesibles.length;
  return {
    corrida: ultima.id,
    fecha: ultima.fecha,
    // `consultadas` cuenta también las que dieron 403 o pidieron sesión: las leídas son las demás.
    leidas: ultima.consulta.consultadas - noLeidas,
    noLeidas,
  };
}

export function armarMundoDePropuestas(e: {
  instantanea: Instantanea;
  nombre: string;
  consulta: string;
  activos: MundoDeActivos;
  etiquetas: EtiquetasDePropuestas;
  umbrales: UmbralesDePropuestas;
  corridas: CorridaCargada[];
  problemasDeCarga: ProblemaDeCarga[];
  decisiones: Decision[];
}): MundoDePropuestas {
  const propuestas = e.corridas.flatMap((c) => c.corrida.propuestas);
  const problemas = validarDecisiones(propuestas, e.decisiones);
  if (problemas.length > 0)
    throw new Error(
      `el libro de decisiones no cuadra con las propuestas: ${problemas
        .map((p) => `${p.propuesta} ${p.regla} (${p.detalle})`)
        .join(" | ")} / the decision ledger does not match the proposals`,
    );
  const rechazadas = new Set(
    e.decisiones
      .filter((d) => d.decision === "rechazar")
      .map((d) => d.propuesta),
  );
  return {
    ...e,
    propuestas,
    filas: bandeja(propuestas, e.decisiones),
    porDecidir: porDecidir(propuestas, e.decisiones),
    avisos: avisosDeVersion(
      propuestas,
      datosDeMarcos(e.instantanea),
      rechazadas,
    ),
    criterios: evaluarCriterios(propuestas, e.umbrales.antiguedad_marco_dias),
    investigacion: ultimaInvestigacion(e.corridas),
  };
}

/** Carga el mundo de las propuestas. Con `base` reutiliza la instantánea y los activos que la página ya cargó. */
export async function cargarMundoDePropuestas(
  base?: Pick<
    MundoDePropuestas,
    "instantanea" | "nombre" | "consulta" | "activos"
  >,
  raiz: string = process.cwd(),
): Promise<MundoDePropuestas> {
  let b = base;
  if (b === undefined) {
    const { instantanea, nombre } = await cargarInstantaneaOficial(raiz);
    b = {
      instantanea,
      nombre,
      consulta: fechaDeConsulta(
        instantanea.fecha_evaluacion,
        process.env.HACKGUARD_CONSULTA,
        fechaDelCommit(),
      ),
      activos: await cargarActivosDelBuild(instantanea, raiz),
    };
  }
  const { corridas, problemas } = await cargarCorridas(raiz);
  return armarMundoDePropuestas({
    ...b,
    etiquetas: cargarEtiquetasDePropuestas(raiz),
    umbrales: cargarUmbralesDePropuestas(raiz),
    corridas,
    problemasDeCarga: problemas,
    decisiones: cargarDecisiones(raiz),
  });
}
