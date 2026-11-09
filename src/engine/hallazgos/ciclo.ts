// El ciclo de vida del hallazgo: abierto → corregido → re_probado → cerrado, más tres cierres alternativos y el
// riesgo aceptado. El ESTADO SE CALCULA desde el libro y los eventos; nadie lo escribe (regla dura 6).
//
// Un hallazgo solo se cierra por una RE-PRUEBA VÁLIDA: un sobre confirmado, `superada`, de la misma prueba y del
// mismo activo, posterior a la última corrección declarada, con la misma configuración (herramienta, versión y
// selector) y al menos las mismas repeticiones k. Todo lo demás lo deja donde está y dice por qué.
// **La ausencia del hallazgo en un escaneo posterior nunca lo cierra**: sin sobre que lo cite como re-prueba no hay
// cierre, y un sobre `no_ejecutada` jamás es `superada`.
//
// REABIERTO (D5, RF-04.9): un cerrado POR RE-PRUEBA vuelve a abrirse cuando una persona confirma otra re-prueba posterior (fecha civil
// estrictamente mayor que la del cierre) con la misma configuración y al menos el mismo k, que FALLA. Lo recorre en orden de FECHA:
// cierra → reabre → (corrección posterior a la reapertura) → cierra… Jamás reabren una ausencia, un sobre `no_ejecutada`, uno que no
// cita al hallazgo ni una declaración (regla dura 6). La reapertura no se escribe: se calcula.
import { canonicalizar } from "../huella.ts";
import type { SobreEfectivo } from "../evidencia/esquemas.ts";
import { comparar } from "../planificador/orden.ts";
import { VEREDICTOS_QUE_FALLAN } from "../evidencia/esquemas.ts";
import type {
  EstadoDeHallazgo,
  Evento,
  Hallazgo,
  MotivoDeRechazo,
} from "./esquemas.ts";

type Correccion = Extract<Evento, { tipo: "correccion" }>;
type Aceptacion = Extract<Evento, { tipo: "aceptacion" }>;

/** Los estados en los que el hallazgo sigue contando como falla del control. */
export const ESTADOS_QUE_CUENTAN_COMO_FALLA: readonly EstadoDeHallazgo[] = [
  "abierto",
  "corregido",
  "re_probado",
  "reabierto",
  "aceptado_con_riesgo",
];
/** Los estados en los que el plazo corre. Un riesgo aceptado se revisa por fecha, no por plazo; un reabierto, desde que se reabrió. */
export const ESTADOS_CON_PLAZO: readonly EstadoDeHallazgo[] = [
  "abierto",
  "corregido",
  "re_probado",
  "reabierto",
];

export const cuentaComoFalla = (e: EstadoDeHallazgo): boolean =>
  ESTADOS_QUE_CUENTAN_COMO_FALLA.includes(e);

export interface CandidataDeReprueba {
  sobre: SobreEfectivo;
  /** Vacío = es una re-prueba válida y cierra el hallazgo. */
  motivos: MotivoDeRechazo[];
  /** Llegó con el hallazgo cerrado por una re-prueba y lo reabrió. */
  reabre: boolean;
  /** Por qué no reabre, contra el cierre que tenía enfrente; `null` si el hallazgo no estaba cerrado por una re-prueba cuando llegó. */
  noReabre: MotivoDeRechazo[] | null;
}

/** Una reapertura: la re-prueba que falló, cuándo una persona la confirmó y el cierre que deshizo. */
export interface ReaperturaDeHallazgo {
  sobre: string;
  fecha: string;
  cierre: string;
}

export interface CierreDeHallazgo {
  tipo: "reprueba" | "eliminacion" | "no_reproducible";
  fecha: string;
  /** El sobre de la re-prueba que lo cierra; nulo en los cierres alternativos. */
  sobre: string | null;
}

/** Un ciclo del hallazgo: de que se abre (o se reabre) a que se cierra (o sigue abierto). La cadena se dibuja ciclo por ciclo. */
export interface CicloDeHallazgo {
  /** La reapertura que lo abrió; nulo en el primero (el que nace del sobre de origen). */
  reapertura: ReaperturaDeHallazgo | null;
  /** La última corrección declarada DENTRO de este ciclo. */
  correccion: Correccion | null;
  /** La re-prueba que lo cerró, aunque otra posterior lo reabriera; nulo si no lo cerró una re-prueba. */
  cierre: CierreDeHallazgo | null;
  /** Las re-pruebas confirmadas de este ciclo, en orden de fecha; la que lo reabrió no está aquí, está en `reapertura`. */
  candidatas: CandidataDeReprueba[];
}

export interface EvaluacionDeHallazgo {
  id: string;
  activo: string;
  prueba: string;
  estado: EstadoDeHallazgo;
  cuentaComoFalla: boolean;
  /** Cuándo una persona confirmó el sobre del que nace. */
  apertura: string;
  /** La reapertura que sigue en pie (`reabierto`, o el cierre alternativo o el riesgo aceptado que vino después); de ella corre el plazo. */
  reapertura: { sobre: string; fecha: string } | null;
  /** Todas las veces que se reabrió, en orden. */
  reaperturas: ReaperturaDeHallazgo[];
  /** Los ciclos, en orden: siempre hay al menos uno, y hay uno más por cada reapertura. */
  ciclos: CicloDeHallazgo[];
  /** Todos los cierres por re-prueba, en orden; el último puede ser el vigente (`cierre`) o uno que una reapertura deshizo. */
  cierres: CierreDeHallazgo[];
  /** El sobre de origen tal como vale hoy (el último que lo corrige, si lo hay). */
  sobreOrigen: SobreEfectivo;
  /** La última corrección del ciclo en curso: tras una reapertura, solo cuenta una posterior a ella. */
  correccion: Correccion | null;
  aceptacion: Aceptacion | null;
  cierre: CierreDeHallazgo | null;
  /** Las re-pruebas confirmadas que lo citan, cada una con lo que le falla para cerrar. */
  candidatas: CandidataDeReprueba[];
  /** Las que lo citan y todavía no están confirmadas: una propuesta no cuenta. */
  porConfirmar: SobreEfectivo[];
}

export type ResultadoDeEvaluacion =
  | { ok: true; evaluacion: EvaluacionDeHallazgo }
  | {
      ok: false;
      motivo: "sobre_origen_inexistente" | "sobre_origen_sin_confirmar";
    };

/** El sobre que vale hoy: si otro sobre confirmado lo corrige, vale el último de la cadena. */
export function sobreVigente(
  libro: readonly SobreEfectivo[],
  id: string,
): SobreEfectivo | null {
  const porId = new Map(libro.map((s) => [s.id, s]));
  let actual = porId.get(id) ?? null;
  const visitados = new Set<string>();
  while (actual !== null && !visitados.has(actual.id)) {
    visitados.add(actual.id);
    const actualId = actual.id;
    const siguiente = libro
      .filter((s) => s.confirmacion !== null && s.corrige === actualId)
      .sort((a, b) => comparar(a.id, b.id))[0];
    if (siguiente === undefined) break;
    actual = siguiente;
  }
  return actual;
}

/** Qué le falta a una re-prueba para cerrar el hallazgo; lista vacía = cierra. */
export function motivosDeRechazo(
  origen: SobreEfectivo,
  correccion: Correccion | null,
  s: SobreEfectivo,
  /** El sobre que se confirmó primero. Si otro lo corrigió, `origen` es el corrector; las repeticiones piden las del MAYOR de los dos. */
  original: SobreEfectivo = origen,
): MotivoDeRechazo[] {
  const m: MotivoDeRechazo[] = [];
  if (correccion === null) m.push("sin_correccion");
  if (s.confirmacion === null) m.push("sin_confirmar");
  if (s.activo !== origen.activo) m.push("otro_activo");
  if (s.prueba !== origen.prueba) m.push("otra_prueba");
  if (!s.resultado.ejecutada) m.push("no_ejecutada");
  else if (s.veredicto !== "superada") m.push("no_superada");
  // Fechas civiles AAAA-MM-DD: «posterior» es estrictamente mayor.
  if (correccion !== null && !(s.fecha > correccion.fecha))
    m.push("anterior_a_la_correccion");
  if (s.herramienta.id !== origen.herramienta.id) m.push("otra_herramienta");
  else if (s.herramienta.version !== origen.herramienta.version)
    m.push("otra_version");
  if (canonicalizar(s.selector) !== canonicalizar(origen.selector))
    m.push("otro_selector");
  // Un corrector no baja el listón: la re-prueba repite al menos tantas veces como la más exigente de las dos fallas (regla dura 6).
  const kMinimo = Math.max(origen.k ?? 0, original.k ?? 0);
  if (kMinimo > 0 && (s.k === null || s.k < kMinimo)) m.push("k_menor");
  return m;
}

/**
 * Qué le falta a una re-prueba confirmada para REABRIR un hallazgo cerrado por `cierre`; lista vacía = reabre. La regla en un solo lugar:
 * lo que no reabre nunca es una ausencia (no hay sobre que la cite), un `no_ejecutada` ni una declaración (esas no pasan por aquí).
 */
export function motivosParaReabrir(
  origen: SobreEfectivo,
  cierre: SobreEfectivo,
  s: SobreEfectivo,
  original: SobreEfectivo = origen,
): MotivoDeRechazo[] {
  const m: MotivoDeRechazo[] = [];
  if (s.activo !== origen.activo) m.push("otro_activo");
  if (s.prueba !== origen.prueba) m.push("otra_prueba");
  if (!s.resultado.ejecutada) m.push("no_ejecutada");
  else if (!(VEREDICTOS_QUE_FALLAN as readonly string[]).includes(s.veredicto))
    m.push("no_falla");
  if (!(s.fecha > cierre.fecha)) m.push("anterior_al_cierre");
  if (s.herramienta.id !== origen.herramienta.id) m.push("otra_herramienta");
  else if (s.herramienta.version !== origen.herramienta.version)
    m.push("otra_version");
  if (canonicalizar(s.selector) !== canonicalizar(origen.selector))
    m.push("otro_selector");
  const kMinimo = Math.max(origen.k ?? 0, original.k ?? 0);
  if (kMinimo > 0 && (s.k === null || s.k < kMinimo)) m.push("k_menor");
  return m;
}

const ultimo = <T>(xs: readonly T[]): T | null => xs[xs.length - 1] ?? null;
const enOrden = (a: SobreEfectivo, b: SobreEfectivo) =>
  comparar(a.fecha, b.fecha) || comparar(a.id, b.id);

export function evaluarHallazgo(
  h: Hallazgo,
  libro: readonly SobreEfectivo[],
): ResultadoDeEvaluacion {
  const original = libro.find((s) => s.id === h.sobre_origen);
  if (original === undefined)
    return { ok: false, motivo: "sobre_origen_inexistente" };
  if (original.confirmacion === null)
    return { ok: false, motivo: "sobre_origen_sin_confirmar" };
  const origen = sobreVigente(libro, original.id) ?? original;

  const correcciones = h.eventos.filter(
    (e): e is Correccion => e.tipo === "correccion",
  );
  const aceptaciones = h.eventos.filter(
    (e): e is Aceptacion => e.tipo === "aceptacion",
  );

  // Cada re-prueba cuenta por su versión vigente: si otro sobre confirmado la corrige, vale el corrector (regla 6).
  const vigentes = new Map(
    libro
      .filter((s) => s.reprueba_de === h.id)
      .map((s) => {
        const v = sobreVigente(libro, s.id) ?? s;
        return [v.id, v] as const;
      }),
  );
  const citan = [...vigentes.values()].sort(enOrden);
  const confirmadas = citan.filter((s) => s.confirmacion !== null);
  const porConfirmar = citan.filter((s) => s.confirmacion === null);

  // El recorrido en orden de FECHA, correcciones y re-pruebas juntas (a igual fecha, la corrección primero: «posterior» es estrictamente
  // mayor): cierra → reabre → cierra… Una corrección posterior al cierre lo deshace (la última corrección es la que cuenta); una
  // reapertura empieza un ciclo nuevo, y solo cuenta una corrección posterior a ella. `cierreVigente` es el sobre que cierra el ciclo
  // en curso, o nulo si está abierto.
  type Paso =
    | { fecha: string; orden: 0; id: string; k: Correccion }
    | { fecha: string; orden: 1; id: string; c: SobreEfectivo };
  const pasos: Paso[] = [
    ...correcciones.map((k): Paso => ({ fecha: k.fecha, orden: 0, id: "", k })),
    ...confirmadas.map((c): Paso => ({
      fecha: c.fecha,
      orden: 1,
      id: c.id,
      c,
    })),
  ].sort(
    (a, b) =>
      comparar(a.fecha, b.fecha) || a.orden - b.orden || comparar(a.id, b.id),
  );
  let cierreVigente: SobreEfectivo | null = null;
  let ultimaReapertura: SobreEfectivo | null = null;
  let correccion: Correccion | null = null;
  const inicios: (SobreEfectivo | null)[] = [null];
  const cierres: CierreDeHallazgo[] = [];
  const cierresSobre: SobreEfectivo[] = [];
  const reaperturas: ReaperturaDeHallazgo[] = [];
  const llegadas: {
    sobre: SobreEfectivo;
    ciclo: number;
    reabre: boolean;
    noReabre: MotivoDeRechazo[] | null;
    primerCierrePendiente: boolean;
  }[] = [];
  for (const paso of pasos) {
    if ("k" in paso) {
      correccion = paso.k;
      if (cierreVigente !== null && paso.k.fecha > cierreVigente.fecha) {
        cierres.pop();
        cierresSobre.pop();
        cierreVigente = null;
      }
      continue;
    }
    const sobre = paso.c;
    const llegada = {
      sobre,
      ciclo: inicios.length - 1,
      reabre: false,
      noReabre: null as MotivoDeRechazo[] | null,
      primerCierrePendiente: false,
    };
    if (cierreVigente === null) {
      if (motivosDeRechazo(origen, correccion, sobre, original).length === 0) {
        cierreVigente = sobre;
        cierresSobre.push(sobre);
        cierres.push({
          tipo: "reprueba",
          fecha: sobre.confirmacion?.fecha ?? sobre.fecha,
          sobre: sobre.id,
        });
      } else llegada.primerCierrePendiente = cierresSobre.length === 0;
    } else {
      llegada.noReabre = motivosParaReabrir(
        origen,
        cierreVigente,
        sobre,
        original,
      );
      if (llegada.noReabre.length === 0) {
        llegada.reabre = true;
        reaperturas.push({
          sobre: sobre.id,
          fecha: sobre.confirmacion?.fecha ?? sobre.fecha,
          cierre: cierreVigente.id,
        });
        ultimaReapertura = sobre;
        inicios.push(sobre);
        llegada.ciclo = inicios.length - 1;
        cierreVigente = null;
        correccion = null;
      }
    }
    llegadas.push(llegada);
  }
  // Lo que le falta a cada re-prueba para cerrar se dice contra la última corrección DE SU CICLO (de la reapertura que lo abrió a la que
  // lo cerró): sin reaperturas, la última corrección del hallazgo, como siempre.
  const candidatas: CandidataDeReprueba[] = llegadas.map((l) => {
    const desde = inicios[l.ciclo]?.fecha ?? null;
    const hasta = inicios[l.ciclo + 1]?.fecha ?? null;
    const delCiclo = ultimo(
      correcciones.filter(
        (k) =>
          (desde === null || k.fecha > desde) &&
          (hasta === null || k.fecha <= hasta),
      ),
    );
    return {
      sobre: l.sobre,
      motivos: motivosDeRechazo(origen, delCiclo, l.sobre, original),
      reabre: l.reabre,
      // Las que llegaron antes de cualquier cierre se miden contra el primero: «anterior al cierre» es su motivo.
      noReabre:
        l.primerCierrePendiente && cierresSobre[0] !== undefined
          ? motivosParaReabrir(origen, cierresSobre[0], l.sobre, original)
          : l.noReabre,
    };
  });
  // La reapertura rige desde que una persona confirmó el sobre (es la fecha del plazo): una declaración hecha antes de esa confirmación
  // se hizo sobre un hallazgo que seguía cerrado y no tapa la falla nueva.
  const desdeReapertura =
    ultimaReapertura === null
      ? null
      : (ultimaReapertura.confirmacion?.fecha ?? ultimaReapertura.fecha);
  const aceptacion = ultimo(
    aceptaciones.filter(
      (e) => desdeReapertura === null || e.fecha > desdeReapertura,
    ),
  );

  // La última declaración que decide (eliminar, no se reproduce, aceptar el riesgo) manda entre las declaradas; tras una reapertura,
  // solo cuentan las posteriores a ella: una declaración anterior no tapa una falla nueva.
  const decisiva = ultimo(
    h.eventos.filter(
      (e) =>
        (e.tipo === "eliminacion" ||
          e.tipo === "no_reproducible" ||
          e.tipo === "aceptacion") &&
        (desdeReapertura === null || e.fecha > desdeReapertura),
    ),
  );

  let estado: EstadoDeHallazgo;
  let cierre: CierreDeHallazgo | null = null;
  if (cierreVigente !== null) {
    estado = "cerrado";
    cierre = ultimo(cierres);
  } else if (decisiva?.tipo === "eliminacion") {
    estado = "cerrado_por_eliminacion";
    cierre = { tipo: "eliminacion", fecha: decisiva.fecha, sobre: null };
  } else if (decisiva?.tipo === "no_reproducible") {
    estado = "no_reproducible";
    cierre = { tipo: "no_reproducible", fecha: decisiva.fecha, sobre: null };
  } else if (decisiva?.tipo === "aceptacion") {
    estado = "aceptado_con_riesgo";
  } else if (ultimaReapertura !== null) {
    estado = "reabierto";
  } else if (candidatas.length > 0) {
    estado = "re_probado";
  } else if (correccion !== null) {
    estado = "corregido";
  } else {
    estado = "abierto";
  }

  return {
    ok: true,
    evaluacion: {
      id: h.id,
      activo: origen.activo,
      prueba: origen.prueba,
      estado,
      cuentaComoFalla: cuentaComoFalla(estado),
      apertura: original.confirmacion.fecha,
      reapertura:
        ultimaReapertura === null || estado === "cerrado"
          ? null
          : {
              sobre: ultimaReapertura.id,
              fecha:
                ultimaReapertura.confirmacion?.fecha ?? ultimaReapertura.fecha,
            },
      reaperturas,
      ciclos: inicios.map((_, i): CicloDeHallazgo => {
        const desde = inicios[i]?.fecha ?? null;
        const hasta = inicios[i + 1]?.fecha ?? null;
        const ultimoDelHallazgo = i === inicios.length - 1;
        const cerro = ultimoDelHallazgo
          ? estado === "cerrado"
            ? ultimo(cierres)
            : null
          : (cierres.find((c) => c.sobre === reaperturas[i]?.cierre) ?? null);
        return {
          reapertura: reaperturas[i - 1] ?? null,
          correccion: ultimo(
            correcciones.filter(
              (k) =>
                (desde === null || k.fecha > desde) &&
                (hasta === null || k.fecha <= hasta),
            ),
          ),
          cierre: cerro,
          candidatas: candidatas.filter(
            (c, j) => llegadas[j]!.ciclo === i && !c.reabre,
          ),
        };
      }),
      cierres,
      sobreOrigen: origen,
      correccion,
      aceptacion: estado === "aceptado_con_riesgo" ? aceptacion : null,
      cierre,
      candidatas,
      porConfirmar,
    },
  };
}
