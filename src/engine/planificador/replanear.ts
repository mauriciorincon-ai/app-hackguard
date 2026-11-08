// El re-plan (D4 del Sprint 10): un plan que quedó «desactualizado» se emite de nuevo con el activo y el catálogo de hoy, y se dice qué pruebas
// ENTRAN, cuáles SALEN y cuáles SE QUEDAN, con la CAUSA de cada movimiento y el control de ISO/IEC 42001 que gana o pierde cobertura. PURO y
// determinista (regla dura 1): sin reloj, sin azar, sin modelo; la fecha de emisión es una entrada.
//
// La causa sale de una ablación, no de una sospecha: de una prueba se conoce su resultado ANTES (activo y catálogo con los que se emitió el plan) y
// AHORA, y se prueban los tres factores que pudieron moverla, uno por uno:
//   · catálogo — la prueba apareció, se retiró o cambió en algo que no es su regla (prioridad, controles, estado…);
//   · regla    — cambió su regla de aplicabilidad (existía antes y después);
//   · perfil   — el activo es otro (otra versión de su perfil, su alcance o sus ajustes).
// Un factor es CAUSA si, volviéndolo solo a su valor de antes, el resultado de hoy cambia (era necesario), o si, aplicándolo solo sobre el
// resultado de antes, este cambia (bastaba). Se listan TODOS los que cumplen, jamás uno solo. Si hay dos o más y ninguno basta por sí solo,
// la causa es CONJUNTA: la prueba se mueve por las dos cosas a la vez. (Con dos factores que cambian y un resultado distinto, al menos uno
// es necesario o suficiente: la lista de una prueba que se mueve nunca queda vacía.)
//
// El plan anterior se vuelve a calcular con lo que él mismo cita (fecha, activo anterior, instantánea anterior, fórmula y entornos) y su huella
// debe ser la que guarda: si no, no se re-planea sobre una base que no se puede reproducir. Que la fórmula o los entornos de hoy no sean los
// que el plan citó es una cuarta causa fuera de la taxonomía: se nombra y se detiene, no se absorbe.
import {
  estaAutorizado,
  type Activo,
  type Alcance,
} from "../activos/esquemas.ts";
import { normalizarActivo } from "../activos/normalizar.ts";
import type { Prueba } from "../catalogo/esquemas.ts";
import type { Marca, PatronCompilado } from "../catalogo/filtro.ts";
import type { Instantanea } from "../catalogo/instantanea.ts";
import { huella } from "../huella.ts";
import { decidirPrueba } from "./decision.ts";
import type {
  Entornos,
  Formula,
  MotivoDeExclusion,
  Paquete,
  Plan,
} from "./esquemas.ts";
import { comparar } from "./orden.ts";
import { planificar } from "./planificar.ts";

export const FACTORES_DE_UN_MOVIMIENTO = [
  "catalogo",
  "regla",
  "perfil",
] as const;
export type Factor = (typeof FACTORES_DE_UN_MOVIMIENTO)[number];
export const MOVIMIENTOS = ["entra", "sale", "se_queda"] as const;
export type TipoDeMovimiento = (typeof MOVIMIENTOS)[number];

export const CODIGOS_DE_ERROR_DE_REPLAN = [
  "sin_autorizacion",
  "formula_distinta",
  "entornos_distintos",
  "plan_no_reproducible",
] as const;
export type CodigoDeErrorDeReplan = (typeof CODIGOS_DE_ERROR_DE_REPLAN)[number];

export class ErrorDeReplan extends Error {
  readonly codigo: CodigoDeErrorDeReplan;
  constructor(codigo: CodigoDeErrorDeReplan, es: string, en: string) {
    super(`${es} / ${en}`);
    this.codigo = codigo;
  }
}

export interface EntradaDeReplan {
  /** El plan desactualizado. Se archiva, jamás se borra. */
  plan: Plan;
  /** La versión del activo con la que se emitió ese plan (su huella es la que el plan cita). */
  activoAnterior: Activo;
  /** La instantánea con la que se emitió ese plan. */
  instantaneaAnterior: Instantanea;
  activoNuevo: Activo;
  instantaneaNueva: Instantanea;
  formula: Formula;
  entornos: Entornos;
  /** Fecha de emisión del plan nuevo, AAAA-MM-DD: una entrada, nunca el reloj. */
  fecha: string;
  /** Patrones del filtro de contenido: el paquete nuevo se marca como el de `plan emitir` (regla dura 3: marca, nunca rechaza). */
  patrones?: readonly PatronCompilado[];
}

export interface Posicion {
  /** 1 es la de mayor prioridad. */
  lugar: number;
  prioridad: number;
}

export type CambioDeUnaQueSeQueda =
  "prioridad" | "lugar" | "controles" | "herramienta";

export interface ControlQueCambia {
  control: string;
  efecto: "gana" | "pierde";
}

export interface Movimiento {
  prueba: string;
  movimiento: TipoDeMovimiento;
  /** Su lugar en el plan anterior; nulo si no estaba. */
  antes: Posicion | null;
  /** Su lugar en el plan nuevo; nulo si ya no está. */
  despues: Posicion | null;
  /** Por qué no estaba (entra) o por qué ya no está (sale); nulo si está en los dos. */
  fuera: "retirada_o_ausente" | MotivoDeExclusion | null;
  /** Todas las que apliquen, en el orden catálogo · regla · perfil. Vacío solo en una que se queda sin cambiar de verdad. */
  causas: Factor[];
  /** Dos o más causas y ninguna basta sola: se mueve por las dos cosas a la vez. */
  conjunta: boolean;
  /** Solo en «se queda»: qué cambió de ella. */
  cambios: CambioDeUnaQueSeQueda[];
  /** Los controles de la prueba que ganan o pierden cobertura por este movimiento. */
  controles: ControlQueCambia[];
}

export interface Replan {
  activo: { id: string; antes: string; despues: string };
  instantanea: {
    antes: { fecha: string; huella: string };
    despues: { fecha: string; huella: string };
  };
  plan: { antes: string; despues: string };
  entran: Movimiento[];
  salen: Movimiento[];
  se_quedan: Movimiento[];
  /** Pruebas que no estaban ni están en el plan. */
  siguen_fuera: number;
  /** Los controles del Anexo A que ganan o pierden cobertura entre el plan anterior y el nuevo. */
  controles: ControlQueCambia[];
}

export interface ResultadoDeReplan {
  replan: Replan;
  /** El plan nuevo y su paquete, listos para escribir. */
  plan: Plan;
  paquete: Paquete;
  /** Lo que el filtro de contenido marcó en el paquete nuevo (vacío si no se pasaron patrones). */
  marcas: readonly Marca[];
}

// ── La cuenta de una prueba ─────────────────────────────────────────────────────────────────────

type Resultado =
  | { estado: "ausente" }
  | { estado: "fuera"; motivo: MotivoDeExclusion }
  | {
      estado: "planeada";
      final: number;
      controles: string[];
      herramienta: string | null;
    };

/** Para comparar: todo lo que no está en el plan es lo mismo (ausente o excluida, da igual por qué); lo planeado se compara por entero. */
const clave = (r: Resultado) =>
  r.estado === "planeada" ? JSON.stringify(r) : "no_planeada";

interface Mundo {
  activo: Activo;
  alcance: Alcance;
}

function mundoDe(a: Activo): Mundo | null {
  const activo = normalizarActivo(a);
  return estaAutorizado(activo) && activo.alcance !== null
    ? { activo, alcance: activo.alcance }
    : null;
}

function resultadoDe(
  prueba: Prueba | null,
  m: Mundo,
  formula: Formula,
  entornos: Entornos,
): Resultado {
  if (
    prueba === null ||
    prueba.estado_aprobacion !== "aprobada" ||
    !m.activo.familias.includes(prueba.familia)
  )
    return { estado: "ausente" };
  const ajuste = m.activo.ajustes.find((a) => a.prueba === prueba.id);
  const d = decidirPrueba(
    prueba,
    m.activo,
    m.alcance,
    ajuste,
    formula,
    entornos,
  );
  if (d.tipo === "excluida")
    return { estado: "fuera", motivo: d.excluida.motivo };
  return {
    estado: "planeada",
    final: d.planeada.prioridad.final,
    controles: d.planeada.controles,
    herramienta:
      d.planeada.herramienta === null
        ? null
        : `${d.planeada.herramienta.id}@${d.planeada.herramienta.entorno}`,
  };
}

/** Una prueba cuyo cuerpo viene de un lado y su regla del otro: así se aísla el factor «regla» del factor «catálogo». */
function mezcla(catalogo: Prueba | null, regla: Prueba | null): Prueba | null {
  return catalogo === null || regla === null
    ? catalogo
    : { ...catalogo, aplicabilidad: regla.aplicabilidad };
}

async function sinRegla(p: Prueba | null) {
  if (p === null) return null;
  return huella({ ...p, aplicabilidad: null });
}

// ── El re-plan ──────────────────────────────────────────────────────────────────────────────────

const lugares = (p: Plan) =>
  new Map(
    p.planeadas.map((x, i) => [
      x.prueba,
      { lugar: i + 1, prioridad: x.prioridad.final } satisfies Posicion,
    ]),
  );

const estadoDeControl = (p: Plan) =>
  new Map(p.cobertura.map((c) => [c.control, c.estado]));

const porId = (i: Instantanea) =>
  new Map(i.catalogo.pruebas.map((p) => [p.id, p]));

export async function replanear(
  e: EntradaDeReplan,
): Promise<ResultadoDeReplan> {
  const { plan, formula, entornos } = e;
  // Un plan nuevo no puede nacer fechado antes del que sustituye: es un error de quien lo pide.
  if (e.fecha < plan.fecha_emision)
    throw new RangeError(
      `la fecha del re-plan ${e.fecha} es anterior a la emisión del plan que sustituye (${plan.fecha_emision}) / the re-plan date ${e.fecha} is earlier than the issue date of the plan it replaces (${plan.fecha_emision})`,
    );
  if (plan.formula.huella !== (await huella(formula)))
    throw new ErrorDeReplan(
      "formula_distinta",
      "la fórmula de prioridad de hoy no es la que el plan citó: eso no es un cambio del activo ni del catálogo, y no se absorbe",
      "today's priority formula is not the one the plan cited: that is neither an asset nor a catalogue change, and it is not absorbed",
    );
  if (plan.entornos.huella !== (await huella(entornos)))
    throw new ErrorDeReplan(
      "entornos_distintos",
      "los entornos de hoy no son los que el plan citó: eso no es un cambio del activo ni del catálogo, y no se absorbe",
      "today's environments are not the ones the plan cited: that is neither an asset nor a catalogue change, and it is not absorbed",
    );

  // El plan anterior se reproduce con lo que cita; si su huella no sale igual, no hay base.
  const reproducido = await planificar({
    activo: e.activoAnterior,
    instantanea: e.instantaneaAnterior,
    formula,
    entornos,
    fecha: plan.fecha_emision,
  });
  if (!reproducido.emitido || reproducido.plan.huella !== plan.huella)
    throw new ErrorDeReplan(
      "plan_no_reproducible",
      "el plan anterior no se reproduce con el activo y la instantánea que cita: no se re-planea sobre una base que no se puede comprobar",
      "the earlier plan cannot be reproduced from the asset and snapshot it cites: it is not re-planned over a base that cannot be checked",
    );

  const nuevo = await planificar({
    activo: e.activoNuevo,
    instantanea: e.instantaneaNueva,
    formula,
    entornos,
    fecha: e.fecha,
    ...(e.patrones === undefined ? {} : { patrones: e.patrones }),
  });
  const antes = mundoDe(e.activoAnterior);
  const ahora = mundoDe(e.activoNuevo);
  if (!nuevo.emitido || antes === null || ahora === null)
    throw new ErrorDeReplan(
      "sin_autorizacion",
      "el activo de hoy no tiene alcance autorizado y reglas de enfrentamiento: sin autorización no hay plan",
      "today's asset has no authorized scope and rules of engagement: without authorization there is no plan",
    );

  const pruebasAntes = porId(e.instantaneaAnterior);
  const pruebasAhora = porId(e.instantaneaNueva);
  const lugarAntes = lugares(plan);
  const lugarAhora = lugares(nuevo.plan);
  const controlAntes = estadoDeControl(plan);
  const controlAhora = estadoDeControl(nuevo.plan);
  // Un control que no figura en la cobertura de un lado es un control sin prueba en ese lado.
  const sinPrueba = "sin_prueba" as const;
  const efectoDe = (control: string): ControlQueCambia["efecto"] | null => {
    const a = controlAntes.get(control) ?? sinPrueba;
    const d = controlAhora.get(control) ?? sinPrueba;
    return a === d ? null : d === "con_prueba" ? "gana" : "pierde";
  };

  const perfilCambio =
    (await huella(antes.activo)) !== (await huella(ahora.activo));
  const ids = [
    ...new Set([...pruebasAntes.keys(), ...pruebasAhora.keys()]),
  ].sort(comparar);

  const entran: Movimiento[] = [];
  const salen: Movimiento[] = [];
  const seQuedan: Movimiento[] = [];
  let siguenFuera = 0;

  for (const id of ids) {
    const pA = pruebasAntes.get(id) ?? null;
    const pN = pruebasAhora.get(id) ?? null;
    const O = resultadoDe(pA, antes, formula, entornos);
    const N = resultadoDe(pN, ahora, formula, entornos);
    if (O.estado !== "planeada" && N.estado !== "planeada") {
      // «Sigue fuera»: excluida por perfil, alcance u operador antes Y ahora. Una que antes no estaba en el catálogo (o ya no está) no es
      // «una que sigue fuera»: no tenía lugar de donde salir ni de donde quedarse.
      if (O.estado === "fuera" && N.estado === "fuera") siguenFuera += 1;
      continue;
    }

    // Los factores que de verdad cambiaron entre antes y ahora, para esta prueba.
    const cambiados: Factor[] = [];
    if ((await sinRegla(pA)) !== (await sinRegla(pN)))
      cambiados.push("catalogo");
    if (
      pA !== null &&
      pN !== null &&
      (await huella(pA.aplicabilidad)) !== (await huella(pN.aplicabilidad))
    )
      cambiados.push("regla");
    if (perfilCambio) cambiados.push("perfil");

    // Ablación: cada factor, volviéndolo solo a antes (necesario) o aplicándolo solo sobre antes (suficiente).
    const necesario = (f: Factor): boolean =>
      clave(
        resultadoDe(
          mezcla(f === "catalogo" ? pA : pN, f === "regla" ? pA : pN),
          f === "perfil" ? antes : ahora,
          formula,
          entornos,
        ),
      ) !== clave(N);
    const suficiente = (f: Factor): boolean =>
      clave(
        resultadoDe(
          mezcla(f === "catalogo" ? pN : pA, f === "regla" ? pN : pA),
          f === "perfil" ? ahora : antes,
          formula,
          entornos,
        ),
      ) !== clave(O);
    const causas = cambiados.filter((f) => necesario(f) || suficiente(f));
    const conjunta = causas.length >= 2 && !causas.some((f) => suficiente(f));

    const movimiento: TipoDeMovimiento =
      O.estado !== "planeada"
        ? "entra"
        : N.estado !== "planeada"
          ? "sale"
          : "se_queda";
    const cambios: CambioDeUnaQueSeQueda[] = [];
    if (O.estado === "planeada" && N.estado === "planeada") {
      if (O.final !== N.final) cambios.push("prioridad");
      if (lugarAntes.get(id)?.lugar !== lugarAhora.get(id)?.lugar)
        cambios.push("lugar");
      if (O.controles.join() !== N.controles.join()) cambios.push("controles");
      if (O.herramienta !== N.herramienta) cambios.push("herramienta");
    }
    const delLado = movimiento === "sale" ? O : N;
    const controlesDeLaPrueba = new Set(
      delLado.estado === "planeada" ? delLado.controles : [],
    );
    if (movimiento === "se_queda" && O.estado === "planeada")
      for (const c of O.controles) controlesDeLaPrueba.add(c);
    const controles = [...controlesDeLaPrueba]
      .sort(comparar)
      .flatMap((control) => {
        const efecto = efectoDe(control);
        return efecto === null ? [] : [{ control, efecto }];
      });

    const m: Movimiento = {
      prueba: id,
      movimiento,
      antes: lugarAntes.get(id) ?? null,
      despues: lugarAhora.get(id) ?? null,
      fuera:
        movimiento === "se_queda"
          ? null
          : movimiento === "entra"
            ? O.estado === "fuera"
              ? O.motivo
              : "retirada_o_ausente"
            : N.estado === "fuera"
              ? N.motivo
              : "retirada_o_ausente",
      causas,
      conjunta,
      cambios,
      controles,
    };
    (movimiento === "entra"
      ? entran
      : movimiento === "sale"
        ? salen
        : seQuedan
    ).push(m);
  }

  const universo = [
    ...new Set([...controlAntes.keys(), ...controlAhora.keys()]),
  ].sort(comparar);
  const controlesQueCambian = universo.flatMap((control) => {
    const efecto = efectoDe(control);
    return efecto === null ? [] : [{ control, efecto }];
  });
  // El orden de «se queda» es el del plan nuevo: así se lee igual que el plan.
  seQuedan.sort((a, b) => (a.despues?.lugar ?? 0) - (b.despues?.lugar ?? 0));

  return {
    replan: {
      activo: {
        id: nuevo.plan.activo.id,
        antes: plan.activo.huella,
        despues: nuevo.plan.activo.huella,
      },
      instantanea: { antes: plan.instantanea, despues: nuevo.plan.instantanea },
      plan: { antes: plan.huella, despues: nuevo.plan.huella },
      entran,
      salen,
      se_quedan: seQuedan,
      siguen_fuera: siguenFuera,
      controles: controlesQueCambian,
    },
    plan: nuevo.plan,
    paquete: nuevo.paquete,
    marcas: nuevo.marcas,
  };
}
