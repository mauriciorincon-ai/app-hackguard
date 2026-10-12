// La brecha: lo esperado contra lo obtenido, prueba por prueba y control por control, en UNA sola cuenta (design-system § 9).
// El tablero, la brecha, la vista por control y el informe leen este objeto y ninguna otra cosa: por eso dicen las mismas
// cifras en cada fecha. Es código puro (regla dura 1): la fecha de consulta es una ENTRADA, nada aquí lee el reloj, no hay
// `Math.random`, y todo lo que sale va ordenado, así que la misma entrada da los mismos bytes en Node y en los navegadores.
//
// Lo que cuenta (ADR-010):
// - Una FILA por prueba planeada de cada activo con plan, con su último sobre CONFIRMADO (individual o por lote). Una
//   propuesta se muestra aparte y no mueve ninguna cifra; un sobre que otro confirmado corrige ya no vale.
// - EJECUTADA = el último sobre confirmado es superada, fallida o parcial. Un `no_ejecutada` o un `no_aplicable` NUNCA es
//   evidencia (E-6): «no detectado» no es «verificado».
// - Un control es APLICABLE si lo cubre una prueba del plan o se quedó sin prueba (la cobertura del plan lo dice).
// - ESTADO de un control: `con_fallas` si algún hallazgo suyo sigue contando como falla (aceptar el riesgo NO lo saca);
//   si no, `sin_evidencia` si ninguna prueba suya tiene evidencia; `evidencia_antigua` si la más reciente pasó del umbral;
//   y `con_evidencia_vigente` en otro caso. La ausencia de un hallazgo en un escaneo posterior nunca lo cierra.
import {
  estadoDeVigencia,
  type EstadoDeVigencia,
  type UmbralesDeVigencia,
} from "../catalogo/semaforo.ts";
import type { SobreEfectivo, Veredicto } from "../evidencia/esquemas.ts";
import { diasEntre } from "../fecha.ts";
import { ESTADOS_CON_PLAZO } from "../hallazgos/ciclo.ts";
import type {
  EstadoDeHallazgo,
  Hallazgo,
  Plazos,
} from "../hallazgos/esquemas.ts";
import type { PlazoDeHallazgo, RevisionDeRiesgo } from "../hallazgos/plazo.ts";
import { situacionDeHallazgo } from "../hallazgos/situacion.ts";
import { huella } from "../huella.ts";
import type { PruebaPlaneada, Cobertura } from "../planificador/esquemas.ts";
import { comparar } from "../planificador/orden.ts";
import type { EscalaIa } from "../severidad/escala-ia.ts";
import type { EstadoDeControl, UmbralesDeBrecha } from "./esquemas.ts";

// ── Entrada ─────────────────────────────────────────────────────────────────────────────────────

export interface PruebaParaBrecha {
  id: string;
  familia: string;
  controles: readonly string[];
  /** La fecha en que alguien verificó la entrada del catálogo: de ahí sale la vigencia de la ficha. */
  fecha_verificacion: string;
}

export interface ActivoParaBrecha {
  id: string;
  /** Sin alcance autorizado no hay plan (regla dura 5): el activo se cuenta, pero sin filas. */
  plan: {
    planeadas: readonly Pick<PruebaPlaneada, "prueba" | "controles">[];
    cobertura: readonly Pick<Cobertura, "control" | "estado" | "pruebas">[];
  } | null;
}

export interface EntradaDeBrecha {
  /** La fecha de consulta del build: una entrada, jamás el reloj. */
  consulta: string;
  umbrales: UmbralesDeBrecha;
  vigencia: UmbralesDeVigencia;
  familias: readonly { id: string }[];
  pruebas: readonly PruebaParaBrecha[];
  activos: readonly ActivoParaBrecha[];
  /** El libro efectivo (ADR-009): todos los sobres, con la confirmación que cuenta. */
  libro: readonly SobreEfectivo[];
  hallazgos: readonly Hallazgo[];
  /** Los lotes: los que no tienen confirmación esperan a una persona. */
  lotes: readonly { id: string; confirmacion: unknown }[];
  escala: EscalaIa;
  plazos: Plazos;
}

// ── Salida ──────────────────────────────────────────────────────────────────────────────────────

export interface Totales {
  planeadas: number;
  ejecutadas: number;
  superadas: number;
  /** Incluye las parciales. */
  fallidas: number;
  no_ejecutadas: number;
}

/** Cuánto se apartó lo obtenido de lo esperado (RF-05.1), en datos: el texto lo pone la pantalla. */
export type Desviacion =
  | { tipo: "sin_medir" }
  | { tipo: "no_medible" }
  | { tipo: "no_aplicable" }
  | { tipo: "fallas"; n: number }
  | { tipo: "alertas" }
  | { tipo: "fuera_del_limite" }
  | { tipo: "dentro_del_limite" }
  | { tipo: "ninguna" };

export interface ObtenidoDeBrecha {
  evaluadas: number | null;
  fallidas: number | null;
  alertas: number | null;
  k: number | null;
}

export interface EdadDeEvidencia {
  dias: number;
  estado: "vigente" | "antigua";
}

export interface FilaDeBrecha {
  activo: string;
  prueba: string;
  familia: string;
  controles: string[];
  /** Nulo si no hay sobre confirmado de esta prueba en este activo. */
  veredicto: Veredicto | null;
  ejecutada: boolean;
  sobre: string | null;
  fecha: string | null;
  obtenido: ObtenidoDeBrecha | null;
  desviacion: Desviacion;
  edad: EdadDeEvidencia | null;
  vigenciaDeFicha: { dias: number; estado: EstadoDeVigencia };
  /** El hallazgo de esta prueba y este activo que sigue contando como falla, si lo hay. */
  hallazgo: string | null;
  /** Sobres propuestos de esta prueba: se ven, pero no mueven ninguna cifra. */
  propuestos: string[];
}

export interface HallazgoDeBrecha {
  id: string;
  activo: string;
  prueba: string;
  controles: string[];
  estado: EstadoDeHallazgo;
  severidad: string;
  apertura: string;
  cuentaComoFalla: boolean;
  /** Pide trabajo: abierto, corregido o re-probado. Un riesgo aceptado no lo pide. */
  pideTrabajo: boolean;
  plazo: PlazoDeHallazgo;
  revision: RevisionDeRiesgo | null;
}

export interface ControlDeBrecha {
  id: string;
  estado: EstadoDeControl;
  /** Las filas (activo, prueba) que lo cubren. Vacío = quedó sin prueba en el plan. */
  filas: { activo: string; prueba: string }[];
  totales: Totales;
  /** Fecha del último resultado ejecutado entre sus pruebas. */
  ultima: string | null;
  edad: EdadDeEvidencia | null;
  hallazgos: string[];
  fallas: string[];
}

export interface Brecha {
  consulta: string;
  filas: FilaDeBrecha[];
  resumen: Totales;
  porActivo: { activo: string; totales: Totales | null }[];
  porFamilia: { familia: string; totales: Totales }[];
  controles: ControlDeBrecha[];
  /** Pruebas del plan que no cubren ningún control. */
  sinControl: { activo: string; prueba: string }[];
  hallazgos: HallazgoDeBrecha[];
  /** Hallazgos que piden trabajo y pasaron su plazo, el más atrasado primero. */
  vencidos: string[];
  /** Riesgos aceptados: no están cerrados, pero no piden trabajo; se revisan en su fecha. */
  aceptados: string[];
  alertas: {
    /** Riesgos aceptados que ya tocan revisión. */
    revision: string[];
    /** Pruebas del plan cuya ficha del catálogo está vencida. */
    fichasVencidas: { activo: string; prueba: string }[];
    /** Marcos con versión nueva: hoy no hay registro de la fuente, así que no se puede decir (RF-05.5). */
    marcos: { registro: false; conVersionNueva: string[] };
    /** Pruebas cuya evidencia es más vieja que el umbral. */
    antiguas: { activo: string; prueba: string }[];
  };
  porConfirmar: { lotes: number; sobres: number };
  /** Lo que no se pudo calcular (un hallazgo sin su sobre, una prueba que el catálogo no tiene): jamás se oculta. */
  problemas: string[];
  huella: string;
}

// ── Cuenta ──────────────────────────────────────────────────────────────────────────────────────

const EJECUTADOS: readonly Veredicto[] = ["superada", "fallida", "parcial"];

const sinRepetidos = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

export function totalesDe(
  filas: readonly Pick<FilaDeBrecha, "veredicto" | "ejecutada">[],
): Totales {
  const cuenta = (v: Veredicto) =>
    filas.filter((f) => f.veredicto === v).length;
  const ejecutadas = filas.filter((f) => f.ejecutada).length;
  return {
    planeadas: filas.length,
    ejecutadas,
    superadas: cuenta("superada"),
    fallidas: cuenta("fallida") + cuenta("parcial"),
    no_ejecutadas: filas.length - ejecutadas,
  };
}

/** Lo que dio un sobre frente a lo que su regla admite. «No detectado» nunca se lee como «ninguna». */
export function desviacionDe(s: SobreEfectivo | null): Desviacion {
  if (s === null) return { tipo: "sin_medir" };
  if (s.veredicto === "no_ejecutada" || !s.resultado.ejecutada)
    return { tipo: "no_medible" };
  if (s.veredicto === "no_aplicable") return { tipo: "no_aplicable" };
  const r = s.resultado;
  if (r.evaluadas !== null && r.fallidas !== null)
    return r.fallidas > 0
      ? { tipo: "fallas", n: r.fallidas }
      : { tipo: "ninguna" };
  if (r.alertas !== null)
    return r.alertas > 0 ? { tipo: "alertas" } : { tipo: "ninguna" };
  if (r.metrica !== null) {
    const { valor, umbral, sentido } = r.metrica;
    const dentro = sentido === "maximo" ? valor <= umbral : valor >= umbral;
    return { tipo: dentro ? "dentro_del_limite" : "fuera_del_limite" };
  }
  return s.veredicto === "fallida" || s.veredicto === "parcial"
    ? { tipo: "fuera_del_limite" }
    : { tipo: "dentro_del_limite" };
}

const edadDe = (
  fecha: string,
  consulta: string,
  umbral: number,
): EdadDeEvidencia => {
  const dias = diasEntre(fecha, consulta);
  if (dias < 0)
    throw new RangeError(
      `la evidencia (${fecha}) es posterior a la fecha de consulta (${consulta})`,
    );
  return { dias, estado: dias >= umbral ? "antigua" : "vigente" };
};

const porPruebaYFecha = (a: SobreEfectivo, b: SobreEfectivo) =>
  comparar(a.fecha, b.fecha) || comparar(a.id, b.id);

/** La brecha sin sellar: toda la cuenta, ordenada y sin huella. */
export function armarBrecha(e: EntradaDeBrecha): Omit<Brecha, "huella"> {
  const problemas: string[] = [];
  const pruebas = new Map(e.pruebas.map((p) => [p.id, p] as const));

  // Lo que cuenta: confirmados, y sin los que otro confirmado corrige.
  const confirmados = e.libro.filter((s) => s.confirmacion !== null);
  for (const s of confirmados)
    if (diasEntre(s.fecha, e.consulta) < 0)
      throw new RangeError(
        `el sobre ${s.id} (${s.fecha}) es posterior a la fecha de consulta (${e.consulta})`,
      );
  const corregidos = new Set(
    confirmados.flatMap((s) => (s.corrige === null ? [] : [s.corrige])),
  );
  const vigentes = confirmados.filter((s) => !corregidos.has(s.id));
  const propuestos = e.libro.filter((s) => s.confirmacion === null);

  // Los hallazgos: la situación de cada uno sale de la cuenta de siempre (`situacionDeHallazgo`).
  const hallazgos: HallazgoDeBrecha[] = [];
  for (const h of [...e.hallazgos].sort((a, b) => comparar(a.id, b.id))) {
    const r = situacionDeHallazgo(h, e.libro, {
      escala: e.escala,
      plazos: e.plazos,
      fecha: e.consulta,
    });
    if (!r.ok) {
      problemas.push(`${h.id}: ${r.motivo} (${r.detalle})`);
      continue;
    }
    const { evaluacion, severidad, plazo, revision } = r.situacion;
    hallazgos.push({
      id: h.id,
      activo: evaluacion.activo,
      prueba: evaluacion.prueba,
      controles: [...(pruebas.get(evaluacion.prueba)?.controles ?? [])].sort(
        comparar,
      ),
      estado: evaluacion.estado,
      severidad: severidad.nivel,
      apertura: evaluacion.apertura,
      cuentaComoFalla: evaluacion.cuentaComoFalla,
      pideTrabajo: ESTADOS_CON_PLAZO.includes(evaluacion.estado),
      plazo,
      revision,
    });
  }

  // Las filas: una por prueba planeada de cada activo con plan.
  const filas: FilaDeBrecha[] = [];
  for (const activo of [...e.activos].sort((a, b) => comparar(a.id, b.id))) {
    if (activo.plan === null) continue;
    for (const planeada of activo.plan.planeadas) {
      const prueba = pruebas.get(planeada.prueba);
      if (prueba === undefined) {
        problemas.push(
          `${activo.id}: la prueba ${planeada.prueba} del plan no está en el catálogo`,
        );
        continue;
      }
      const suyos = vigentes
        .filter((s) => s.activo === activo.id && s.prueba === prueba.id)
        .sort(porPruebaYFecha);
      const ultimo = suyos[suyos.length - 1] ?? null;
      const veredicto = ultimo === null ? null : ultimo.veredicto;
      const ejecutada = veredicto !== null && EJECUTADOS.includes(veredicto);
      const diasDeFicha = diasEntre(prueba.fecha_verificacion, e.consulta);
      if (diasDeFicha < 0)
        throw new RangeError(
          `la ficha ${prueba.id} se verificó (${prueba.fecha_verificacion}) después de la fecha de consulta (${e.consulta})`,
        );
      filas.push({
        activo: activo.id,
        prueba: prueba.id,
        familia: prueba.familia,
        controles: [...planeada.controles].sort(comparar),
        veredicto,
        ejecutada,
        sobre: ultimo === null ? null : ultimo.id,
        fecha: ultimo === null ? null : ultimo.fecha,
        obtenido:
          ultimo === null
            ? null
            : {
                evaluadas: ultimo.resultado.evaluadas,
                fallidas: ultimo.resultado.fallidas,
                alertas: ultimo.resultado.alertas,
                k: ultimo.k,
              },
        desviacion: desviacionDe(ultimo),
        edad:
          ultimo !== null && ejecutada
            ? edadDe(ultimo.fecha, e.consulta, e.umbrales.evidencia_antigua)
            : null,
        vigenciaDeFicha: {
          dias: diasDeFicha,
          estado: estadoDeVigencia(diasDeFicha, e.vigencia),
        },
        hallazgo:
          hallazgos.find(
            (h) =>
              h.cuentaComoFalla &&
              h.activo === activo.id &&
              h.prueba === prueba.id,
          )?.id ?? null,
        propuestos: propuestos
          .filter((s) => s.activo === activo.id && s.prueba === prueba.id)
          .map((s) => s.id)
          .sort(comparar),
      });
    }
  }

  // Los controles aplicables: los que cubre una prueba del plan y los que se quedaron sin prueba.
  const idsDeControl = sinRepetidos(
    e.activos.flatMap((a) =>
      a.plan === null ? [] : a.plan.cobertura.map((c) => c.control),
    ),
  ).sort(comparar);
  const controles: ControlDeBrecha[] = idsDeControl.map((id) => {
    const suyas = filas.filter((f) => f.controles.includes(id));
    const delControl = hallazgos.filter((h) => h.controles.includes(id));
    const conEvidencia = suyas.filter((f) => f.ejecutada);
    const fechas = conEvidencia.map((f) => f.fecha ?? "").sort(comparar);
    const ultima = fechas[fechas.length - 1] ?? null;
    const edad =
      ultima === null
        ? null
        : edadDe(ultima, e.consulta, e.umbrales.evidencia_antigua);
    const fallas = delControl.filter((h) => h.cuentaComoFalla);
    const estado: EstadoDeControl =
      fallas.length > 0
        ? "con_fallas"
        : conEvidencia.length === 0
          ? "sin_evidencia"
          : edad?.estado === "antigua"
            ? "evidencia_antigua"
            : "con_evidencia_vigente";
    return {
      id,
      estado,
      filas: suyas.map((f) => ({ activo: f.activo, prueba: f.prueba })),
      totales: totalesDe(suyas),
      ultima,
      edad,
      hallazgos: delControl.map((h) => h.id),
      fallas: fallas.map((h) => h.id),
    };
  });

  const vencidos = hallazgos
    .filter((h) => h.pideTrabajo && h.plazo.estado === "vencido")
    .sort((a, b) => b.plazo.atraso - a.plazo.atraso || comparar(a.id, b.id));
  const aceptados = hallazgos.filter((h) => h.estado === "aceptado_con_riesgo");

  const idsDeFamilia = e.familias.map((f) => f.id);
  return {
    consulta: e.consulta,
    filas,
    resumen: totalesDe(filas),
    porActivo: [...e.activos]
      .sort((a, b) => comparar(a.id, b.id))
      .map((a) => ({
        activo: a.id,
        totales:
          a.plan === null
            ? null
            : totalesDe(filas.filter((f) => f.activo === a.id)),
      })),
    porFamilia: idsDeFamilia
      .filter((id) => filas.some((f) => f.familia === id))
      .map((id) => ({
        familia: id,
        totales: totalesDe(filas.filter((f) => f.familia === id)),
      })),
    controles,
    sinControl: filas
      .filter((f) => f.controles.length === 0)
      .map((f) => ({ activo: f.activo, prueba: f.prueba })),
    hallazgos,
    vencidos: vencidos.map((h) => h.id),
    aceptados: aceptados.map((h) => h.id),
    alertas: {
      revision: aceptados
        .filter((h) => h.revision?.estado === "toca_revisar")
        .map((h) => h.id),
      fichasVencidas: filas
        .filter((f) => f.vigenciaDeFicha.estado === "vencido")
        .map((f) => ({ activo: f.activo, prueba: f.prueba })),
      marcos: { registro: false, conVersionNueva: [] },
      antiguas: filas
        .filter((f) => f.edad?.estado === "antigua")
        .map((f) => ({ activo: f.activo, prueba: f.prueba })),
    },
    porConfirmar: {
      lotes: e.lotes.filter((l) => l.confirmacion === null).length,
      sobres: propuestos.length,
    },
    problemas,
  };
}

/** La brecha con su huella (JCS + SHA-256): la misma entrada da los mismos bytes en Node y en los navegadores. */
export async function calcularBrecha(e: EntradaDeBrecha): Promise<Brecha> {
  const b = armarBrecha(e);
  return { ...b, huella: await huella(b) };
}
