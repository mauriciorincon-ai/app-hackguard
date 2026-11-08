// La tendencia de la brecha: la MISMA brecha (`armarBrecha`) calculada en varias fechas de corte, y lo que cambió de una a otra control
// por control de ISO/IEC 42001. Función pura: la fecha de corte es una entrada, jamás el reloj (regla dura 1), y no hay una cuenta propia:
// cada punto ES una brecha armada sobre el libro tal como estaba ese día (design-system § 9, «una cuenta, un cálculo»).
//
// Qué NO mide: la vigencia de la ficha del catálogo (la ficha es la de hoy y no dice cómo estaba ayer). Mide evidencia y hallazgos.
// Cómo se «mira hacia atrás»: un sobre cuenta en un corte si su fecha y la de su confirmación son anteriores o iguales a él; uno
// confirmado DESPUÉS del corte está sin confirmar ese día (una propuesta no cuenta); un evento del hallazgo (corrección, aceptación,
// eliminación) posterior al corte todavía no pasó; un hallazgo cuyo sobre de origen aún no estaba confirmado todavía no existía.
//
// Qué es un movimiento: un control cambia de estado entre dos cortes consecutivos. «Mejoró» y «empeoró» salen del orden del vocabulario
// (con fallas < sin evidencia < evidencia antigua < evidencia vigente). Un hallazgo `reabierto` es una REGRESIÓN del control (RF-04.9):
// se anota aunque el estado del control no cambie, porque ya había una falla y volvió otra.
import { huella } from "../huella.ts";
import type { EstadoDeHallazgo } from "../hallazgos/esquemas.ts";
import { comparar } from "../planificador/orden.ts";
import {
  armarBrecha,
  type Brecha,
  type EntradaDeBrecha,
  type Totales,
} from "./calcular.ts";
import { ESTADOS_DE_CONTROL, type EstadoDeControl } from "./esquemas.ts";

export type Sentido = "mejoro" | "empeoro" | "igual";

export interface HallazgoQueSeMovio {
  id: string;
  /** `null` = todavía no existía en el corte anterior. */
  de: EstadoDeHallazgo | null;
  a: EstadoDeHallazgo | null;
}

/** Un control que cambió de estado entre dos cortes consecutivos. */
export interface MovimientoDeControl {
  /** El corte en que se ve el cambio. */
  corte: string;
  de: EstadoDeControl;
  a: EstadoDeControl;
  sentido: "mejoro" | "empeoro";
  /** Los hallazgos de ese control cuyo estado cambió entre los dos cortes: lo que lo movió. Vacío = fue la evidencia, no un hallazgo. */
  hallazgos: HallazgoQueSeMovio[];
}

export interface ControlEnElTiempo {
  id: string;
  estados: { corte: string; estado: EstadoDeControl }[];
  /** Del primer corte al último. */
  sentido: Sentido;
  movimientos: MovimientoDeControl[];
  /** Cada vez que un hallazgo de este control se reabrió: una regresión. */
  regresiones: { corte: string; hallazgo: string }[];
  /** El último hallazgo que movió el control, si algún movimiento lo trae. */
  hallazgoQueLoMovio: string | null;
}

export interface PuntoDeTendencia {
  corte: string;
  /** Hallazgos todavía por atender: abiertos, corregidos o re-probados sin cerrar. */
  abiertos: number;
  /** Los que una re-prueba volvió a encontrar fallando después de cerrados. */
  reabiertos: number;
  /** Riesgos aceptados: no están cerrados y siguen contando como falla. */
  aceptados: number;
  /** Cerrados por re-prueba, por eliminación o no reproducibles. */
  cerrados: number;
  /** Los que piden trabajo y pasaron su plazo. */
  vencidos: number;
  /** Controles con falla ese día. */
  controlesConFalla: number;
  resumen: Totales;
  hallazgos: { id: string; estado: EstadoDeHallazgo }[];
  controles: { id: string; estado: EstadoDeControl }[];
}

export interface Tendencia {
  /** Los cortes, del más viejo al más nuevo; el último es la consulta. */
  cortes: string[];
  puntos: PuntoDeTendencia[];
  controles: ControlEnElTiempo[];
  resumen: {
    mejoraron: number;
    empeoraron: number;
    igual: number;
    conRegresion: number;
  };
  /** Lo que alguna brecha de un corte no pudo calcular: jamás se oculta. */
  problemas: string[];
}

/** El peso de un estado de control: su posición en el vocabulario, de peor a mejor. */
const peso = (e: EstadoDeControl) => ESTADOS_DE_CONTROL.indexOf(e);

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Las fechas en que algo cambió en el libro: la confirmación de cada sobre y cada evento de cada hallazgo, hasta la consulta, y la
 * consulta misma. Sin repetidas, en orden. Puro: nada de reloj.
 */
export function fechasDeCorte(
  e: Pick<EntradaDeBrecha, "libro" | "hallazgos" | "consulta">,
): string[] {
  const fechas = new Set<string>([e.consulta]);
  for (const s of e.libro)
    if (s.confirmacion !== null && FECHA.test(s.confirmacion.fecha))
      fechas.add(s.confirmacion.fecha);
  for (const h of e.hallazgos)
    for (const ev of h.eventos) if (FECHA.test(ev.fecha)) fechas.add(ev.fecha);
  return [...fechas].filter((f) => f <= e.consulta).sort(comparar);
}

const fechaDeConfirmacion = (c: unknown): string | null =>
  typeof c === "object" &&
  c !== null &&
  "fecha" in c &&
  typeof c.fecha === "string"
    ? c.fecha
    : null;

/** La entrada de la brecha tal como estaba en un corte (ver arriba). No inventa nada: solo quita y des-confirma lo que aún no pasaba. */
export function entradaEnElCorte(
  e: EntradaDeBrecha,
  corte: string,
): EntradaDeBrecha {
  const libro = e.libro
    .filter((s) => s.fecha <= corte)
    .map((s) =>
      s.confirmacion !== null && s.confirmacion.fecha > corte
        ? { ...s, confirmacion: null }
        : s,
    );
  const confirmados = new Set(
    libro.filter((s) => s.confirmacion !== null).map((s) => s.id),
  );
  return {
    ...e,
    consulta: corte,
    // La ficha del catálogo es la de hoy: no dice cómo estaba ese día. La tendencia no lee la vigencia de la ficha (solo evidencia y
    // hallazgos), así que se fija a lo sumo en el corte para que la brecha se pueda armar sin inventar una fecha de verificación.
    pruebas: e.pruebas.map((p) =>
      p.fecha_verificacion > corte ? { ...p, fecha_verificacion: corte } : p,
    ),
    libro,
    hallazgos: e.hallazgos
      .filter((h) => confirmados.has(h.sobre_origen))
      .map((h) => ({
        ...h,
        eventos: h.eventos.filter((ev) => ev.fecha <= corte),
      })),
    lotes: e.lotes.map((l) => {
      const f = fechaDeConfirmacion(l.confirmacion);
      return f !== null && f > corte ? { ...l, confirmacion: null } : l;
    }),
  };
}

const ABIERTOS: readonly EstadoDeHallazgo[] = [
  "abierto",
  "corregido",
  "re_probado",
];

function punto(b: Omit<Brecha, "huella">): PuntoDeTendencia {
  const cuenta = (estados: readonly EstadoDeHallazgo[]) =>
    b.hallazgos.filter((h) => estados.includes(h.estado)).length;
  return {
    corte: b.consulta,
    abiertos: cuenta(ABIERTOS),
    reabiertos: cuenta(["reabierto"]),
    aceptados: cuenta(["aceptado_con_riesgo"]),
    cerrados: b.hallazgos.filter((h) => !h.cuentaComoFalla).length,
    vencidos: b.vencidos.length,
    controlesConFalla: b.controles.filter((c) => c.estado === "con_fallas")
      .length,
    resumen: b.resumen,
    hallazgos: b.hallazgos.map((h) => ({ id: h.id, estado: h.estado })),
    controles: b.controles.map((c) => ({ id: c.id, estado: c.estado })),
  };
}

/**
 * La tendencia: la brecha de cada corte (la misma función que arma el informe) y, por control, lo que se movió. Si no se dan cortes,
 * salen de `fechasDeCorte`. Un corte posterior a la consulta es un error de quien pregunta, no un dato.
 */
export function armarTendencia(
  e: EntradaDeBrecha,
  cortes: readonly string[] = fechasDeCorte(e),
): Tendencia {
  const ordenados = [...new Set(cortes)].sort(comparar);
  if (ordenados.length === 0)
    throw new RangeError("la tendencia pide al menos un corte");
  const tarde = ordenados.find((c) => c > e.consulta);
  if (tarde !== undefined)
    throw new RangeError(
      `el corte ${tarde} es posterior a la fecha de consulta (${e.consulta})`,
    );
  const brechas = ordenados.map((c) => armarBrecha(entradaEnElCorte(e, c)));
  const puntos = brechas.map(punto);

  const ids = [
    ...new Set(brechas.flatMap((b) => b.controles.map((c) => c.id))),
  ].sort(comparar);
  const controles = ids.map((id): ControlEnElTiempo => {
    const estados = brechas.map((b, i) => ({
      corte: ordenados[i]!,
      estado: b.controles.find((c) => c.id === id)?.estado ?? "sin_evidencia",
    }));
    const delControl = (i: number) =>
      new Set(brechas[i]!.controles.find((c) => c.id === id)?.hallazgos ?? []);
    const estadoDe = (i: number, hid: string): EstadoDeHallazgo | null =>
      puntos[i]!.hallazgos.find((h) => h.id === hid)?.estado ?? null;
    const movimientos: MovimientoDeControl[] = [];
    const regresiones: ControlEnElTiempo["regresiones"] = [];
    for (let i = 1; i < ordenados.length; i++) {
      const hallazgos = [...new Set([...delControl(i - 1), ...delControl(i)])]
        .sort(comparar)
        .map((hid) => ({
          id: hid,
          de: estadoDe(i - 1, hid),
          a: estadoDe(i, hid),
        }))
        .filter((h) => h.de !== h.a);
      for (const h of hallazgos)
        if (h.a === "reabierto" && h.de !== "reabierto")
          regresiones.push({ corte: ordenados[i]!, hallazgo: h.id });
      const de = estados[i - 1]!.estado;
      const a = estados[i]!.estado;
      if (de !== a)
        movimientos.push({
          corte: ordenados[i]!,
          de,
          a,
          sentido: peso(a) > peso(de) ? "mejoro" : "empeoro",
          hallazgos,
        });
    }
    const primero = estados[0]!.estado;
    const ultimo = estados[estados.length - 1]!.estado;
    const ultimoQueLoMovio = [...movimientos]
      .reverse()
      .find((m) => m.hallazgos.length > 0);
    return {
      id,
      estados,
      sentido:
        peso(ultimo) > peso(primero)
          ? "mejoro"
          : peso(ultimo) < peso(primero)
            ? "empeoro"
            : "igual",
      movimientos,
      regresiones,
      hallazgoQueLoMovio: ultimoQueLoMovio?.hallazgos[0]?.id ?? null,
    };
  });

  return {
    cortes: ordenados,
    puntos,
    controles,
    resumen: {
      mejoraron: controles.filter((c) => c.sentido === "mejoro").length,
      empeoraron: controles.filter((c) => c.sentido === "empeoro").length,
      igual: controles.filter((c) => c.sentido === "igual").length,
      conRegresion: controles.filter((c) => c.regresiones.length > 0).length,
    },
    problemas: [
      ...new Set(
        brechas.flatMap((b, i) =>
          b.problemas.map((p) => `${ordenados[i]}: ${p}`),
        ),
      ),
    ],
  };
}

/** La tendencia con su huella (JCS + SHA-256): la misma entrada da los mismos bytes en Node y en los navegadores. */
export async function calcularTendencia(
  e: EntradaDeBrecha,
  cortes?: readonly string[],
): Promise<Tendencia & { huella: string }> {
  const t = armarTendencia(e, cortes);
  return { ...t, huella: await huella(t) };
}
