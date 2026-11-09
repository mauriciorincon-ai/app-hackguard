// La vista de «Re-planear»: qué entraría, saldría y se quedaría si el plan desactualizado de un activo se emitiera de nuevo hoy, con la causa
// de cada movimiento y el control de ISO/IEC 42001 que gana o pierde cobertura. Todo lo calcula `engine/planificador/replanear.ts` (una cuenta,
// un cálculo): aquí solo se ponen los nombres y las frases. Es una vista previa: no escribe nada. La emisión es el CLI (`plan replanear`).
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import {
  replanear,
  type Factor,
  type Movimiento,
  type Replan,
} from "../../engine/planificador/replanear.ts";
import { ETIQUETAS_DE_VISTAS } from "../catalogo/etiquetas.ts";
import type { InstantaneaCargada } from "../catalogo/cargar-instantanea.ts";
import type { MundoDeActivos } from "./cargar.ts";
import { entradaDeReplan } from "./replan.ts";
import type {
  Bilingue,
  BaseDeReplanVista,
  ControlDeReplanVista,
  MovimientoDeReplanVista,
  VistaDeReplan,
} from "./tipos.ts";
import { construirVistaDePlan } from "./vista.ts";

const CAUSAS: Record<Factor, Bilingue> = {
  catalogo: { es: "Catálogo", en: "Catalog" },
  regla: { es: "Regla de aplicabilidad", en: "Applicability rule" },
  perfil: { es: "Perfil del activo", en: "Asset profile" },
};

const NUMERO: Record<number, Bilingue> = {
  2: { es: "las dos", en: "both" },
  3: { es: "las tres", en: "all three" },
};
const unir = (nombres: string[], y: string) =>
  nombres.length < 2
    ? nombres.join("")
    : `${nombres.slice(0, -1).join(", ")} ${y} ${nombres.at(-1)}`;

/**
 * La nota de una causa «conjunta»: dice CUÁNTAS causas actúan a la vez y cuáles son, desde el dato (dos o tres: catálogo, regla y perfil),
 * en vez de una frase fija de «las dos cosas».
 */
export function notaDeCausaConjunta(causas: readonly Factor[]): Bilingue {
  const n = NUMERO[causas.length] ?? {
    es: `las ${causas.length}`,
    en: `all ${causas.length}`,
  };
  const nombres = (idioma: "es" | "en") =>
    causas.map((c) => CAUSAS[c][idioma].toLowerCase());
  return {
    es: `Conjunta: ninguna de las ${causas.length} basta por sí sola, se mueve por ${n.es} a la vez (${unir(nombres("es"), "y")}).`,
    en: `Joint: none of the ${causas.length} is enough on its own, it moves because of ${n.en} at once (${unir(nombres("en"), "and")}).`,
  };
}

const CAMBIOS: Record<string, Bilingue> = {
  prioridad: { es: "Prioridad", en: "Priority" },
  lugar: { es: "Lugar en el plan", en: "Place in the plan" },
  controles: { es: "Controles que cita", en: "Controls it cites" },
  herramienta: { es: "Herramienta", en: "Tool" },
};

const FUERA: Record<string, Bilingue> = {
  perfil: {
    es: "El perfil del activo no cumplía su regla de aplicabilidad.",
    en: "The asset's profile did not meet its applicability rule.",
  },
  alcance: {
    es: "Estaba fuera del alcance autorizado.",
    en: "It was outside the authorized scope.",
  },
  operador: {
    es: "El operador la había quitado.",
    en: "The operator had removed it.",
  },
  retirada_o_ausente: {
    es: "No estaba en el catálogo aprobado (aún no existía o está retirada).",
    en: "It was not in the approved catalog (it did not exist yet or is withdrawn).",
  },
};

const lugar = (
  p: { lugar: number; prioridad: number } | null,
): Bilingue | null =>
  p === null
    ? null
    : {
        es: `n.º ${p.lugar} · prioridad ${p.prioridad}`,
        en: `No. ${p.lugar} · priority ${p.prioridad}`,
      };

function baseVista(
  clave: "oficial" | "demo",
  r: Replan,
  planeadasAntes: number,
  planeadasDespues: number,
  nuevo: InstantaneaCargada,
  antes: Instantanea,
  ahora: Instantanea,
): BaseDeReplanVista {
  const E = ETIQUETAS_DE_VISTAS;
  const nombreDePrueba = new Map<string, Bilingue>();
  for (const i of [antes, ahora])
    for (const p of i.catalogo.pruebas) nombreDePrueba.set(p.id, p.nombre);
  const nombreDeControl = new Map<string, Bilingue>();
  for (const i of [antes, ahora])
    for (const capa of i.catalogo.controles)
      for (const area of capa.areas)
        for (const c of area.controles) nombreDeControl.set(c.id, c.nombre);
  const control = (c: {
    control: string;
    efecto: "gana" | "pierde";
  }): ControlDeReplanVista => ({
    id: c.control,
    nombre: nombreDeControl.get(c.control) ?? { es: c.control, en: c.control },
    efecto: c.efecto,
    etiqueta: c.efecto === "gana" ? E.cobertura_gana : E.cobertura_pierde,
  });
  const movimiento = (m: Movimiento): MovimientoDeReplanVista => ({
    id: m.prueba,
    nombre: nombreDePrueba.get(m.prueba) ?? null,
    tipo: m.movimiento,
    etiqueta:
      m.movimiento === "entra"
        ? E.movimiento_entra
        : m.movimiento === "sale"
          ? E.movimiento_sale
          : E.movimiento_se_queda,
    causas: m.causas.map((id) => ({ id, nombre: CAUSAS[id] })),
    conjunta: m.conjunta,
    notaConjunta: m.conjunta ? notaDeCausaConjunta(m.causas) : null,
    fuera: m.fuera === null ? null : (FUERA[m.fuera] ?? null),
    antes: lugar(m.antes),
    despues: lugar(m.despues),
    cambios: m.cambios.map((c) => CAMBIOS[c] ?? { es: c, en: c }),
    controles: m.controles.map(control),
  });
  return {
    clave,
    demo: clave === "demo",
    instantanea: {
      nombre: nuevo.nombre,
      fecha: nuevo.instantanea.fecha_evaluacion,
      huella: nuevo.instantanea.huella,
    },
    planeadas: { antes: planeadasAntes, despues: planeadasDespues },
    entran: r.entran.map(movimiento),
    salen: r.salen.map(movimiento),
    seQuedan: r.se_quedan.map(movimiento),
    sigueFuera: r.siguen_fuera,
    controles: r.controles.map(control),
  };
}

/** `null` si el activo no tiene un plan desactualizado que re-planear (no hay historial, o su plan está vigente). */
export async function construirVistaDeReplan(
  id: string,
  mundo: MundoDeActivos,
  i: Instantanea,
  nombre: string,
  consulta: string,
  demo: InstantaneaCargada | null,
  raiz: string = process.cwd(),
): Promise<VistaDeReplan | null> {
  const cargado = mundo.activos.find((a) => a.activo.id === id);
  if (
    cargado === undefined ||
    cargado.plan === null ||
    cargado.veredicto === null ||
    cargado.veredicto.estado !== "plan_desactualizado" ||
    cargado.versiones === null
  )
    return null;
  const vistaDelPlan = construirVistaDePlan(id, mundo, i, nombre, consulta);
  const cabecera = Object.fromEntries(
    Object.entries(vistaDelPlan).filter(
      ([k]) => k !== "plan" && k !== "etiquetas",
    ),
  ) as Omit<typeof vistaDelPlan, "plan" | "etiquetas">;

  const oficial: InstantaneaCargada = { instantanea: i, nombre };
  const bases: BaseDeReplanVista[] = [];
  for (const [clave, nueva] of [
    ["oficial", oficial],
    ["demo", demo],
  ] as const) {
    if (nueva === null) continue;
    const entrada = await entradaDeReplan(
      cargado,
      mundo.datos,
      nueva.instantanea,
      // La vista previa no tiene fecha de emisión propia: usa la de consulta, subida a la de la instantánea y a la del plan que
      // sustituye si estas son posteriores (un plan nuevo no puede nacer fechado antes: el motor lo rechaza con RangeError).
      [
        consulta,
        nueva.instantanea.fecha_evaluacion,
        cargado.plan.fecha_emision,
      ].reduce((a, b) => (b > a ? b : a)),
      raiz,
    );
    const { replan, plan } = await replanear(entrada);
    bases.push(
      baseVista(
        clave,
        replan,
        entrada.plan.resumen.planeadas,
        plan.resumen.planeadas,
        nueva,
        entrada.instantaneaAnterior,
        nueva.instantanea,
      ),
    );
  }
  const versionVigente = cargado.versiones.find((v) => v.vigente);
  const E = ETIQUETAS_DE_VISTAS;
  return {
    ...cabecera,
    activo: {
      versionDelPlan: cargado.versionDelPlan,
      versionVigente: versionVigente?.n ?? null,
      huellaDelPlan: cargado.plan.activo.huella,
      huellaDeHoy: versionVigente?.huella ?? cargado.plan.activo.huella,
    },
    plan: { huella: cargado.plan.huella, fecha: cargado.plan.fecha_emision },
    bases,
    etiquetas: {
      entra: E.movimiento_entra,
      sale: E.movimiento_sale,
      seQueda: E.movimiento_se_queda,
      demo: E.instantanea_demo,
      sinMovimientos: E.diferencias_sin_cambios,
    },
    nota: {
      es: "Esto es una vista previa: no escribe nada y el plan de arriba sigue siendo el que se emitió. Para emitirlo de nuevo se corre «plan replanear» en la terminal: archiva el plan anterior (jamás lo borra) y escribe el nuevo. La causa de cada movimiento sale de probar, uno por uno, qué pasa si solo ese cambio no hubiera ocurrido.",
      en: "This is a preview: it writes nothing and the plan above is still the one that was issued. To issue it again, run “plan replanear” in the terminal: it archives the earlier plan (it never deletes it) and writes the new one. The cause of each movement comes from testing, one by one, what happens if only that change had not happened.",
    },
  };
}
