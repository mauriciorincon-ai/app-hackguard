// El ciclo de vida del hallazgo: abierto → corregido → re_probado → cerrado, más tres cierres alternativos y el
// riesgo aceptado. El ESTADO SE CALCULA desde el libro y los eventos; nadie lo escribe (regla dura 6).
//
// Un hallazgo solo se cierra por una RE-PRUEBA VÁLIDA: un sobre confirmado, `superada`, de la misma prueba y del
// mismo activo, posterior a la última corrección declarada, con la misma configuración (herramienta, versión y
// selector) y al menos las mismas repeticiones k. Todo lo demás lo deja donde está y dice por qué.
// **La ausencia del hallazgo en un escaneo posterior nunca lo cierra**: sin sobre que lo cite como re-prueba no hay
// cierre, y un sobre `no_ejecutada` jamás es `superada`.
import { canonicalizar } from "../huella.ts";
import type { Sobre } from "../evidencia/esquemas.ts";
import { comparar } from "../planificador/orden.ts";
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
  "aceptado_con_riesgo",
];
/** Los estados en los que el plazo corre. Un riesgo aceptado se revisa por fecha, no por plazo. */
export const ESTADOS_CON_PLAZO: readonly EstadoDeHallazgo[] = [
  "abierto",
  "corregido",
  "re_probado",
];

export const cuentaComoFalla = (e: EstadoDeHallazgo): boolean =>
  ESTADOS_QUE_CUENTAN_COMO_FALLA.includes(e);

export interface CandidataDeReprueba {
  sobre: Sobre;
  /** Vacío = es una re-prueba válida y cierra el hallazgo. */
  motivos: MotivoDeRechazo[];
}

export interface CierreDeHallazgo {
  tipo: "reprueba" | "eliminacion" | "no_reproducible";
  fecha: string;
  /** El sobre de la re-prueba que lo cierra; nulo en los cierres alternativos. */
  sobre: string | null;
}

export interface EvaluacionDeHallazgo {
  id: string;
  activo: string;
  prueba: string;
  estado: EstadoDeHallazgo;
  cuentaComoFalla: boolean;
  /** Cuándo una persona confirmó el sobre del que nace. */
  apertura: string;
  /** El sobre de origen tal como vale hoy (el último que lo corrige, si lo hay). */
  sobreOrigen: Sobre;
  correccion: Correccion | null;
  aceptacion: Aceptacion | null;
  cierre: CierreDeHallazgo | null;
  /** Las re-pruebas confirmadas que lo citan, cada una con lo que le falla para cerrar. */
  candidatas: CandidataDeReprueba[];
  /** Las que lo citan y todavía no están confirmadas: una propuesta no cuenta. */
  porConfirmar: Sobre[];
}

export type ResultadoDeEvaluacion =
  | { ok: true; evaluacion: EvaluacionDeHallazgo }
  | {
      ok: false;
      motivo: "sobre_origen_inexistente" | "sobre_origen_sin_confirmar";
    };

/** El sobre que vale hoy: si otro sobre confirmado lo corrige, vale el último de la cadena. */
export function sobreVigente(
  libro: readonly Sobre[],
  id: string,
): Sobre | null {
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
  origen: Sobre,
  correccion: Correccion | null,
  s: Sobre,
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
  if (origen.k !== null && (s.k === null || s.k < origen.k)) m.push("k_menor");
  return m;
}

const ultimo = <T>(xs: readonly T[]): T | null => xs[xs.length - 1] ?? null;

export function evaluarHallazgo(
  h: Hallazgo,
  libro: readonly Sobre[],
): ResultadoDeEvaluacion {
  const original = libro.find((s) => s.id === h.sobre_origen);
  if (original === undefined)
    return { ok: false, motivo: "sobre_origen_inexistente" };
  if (original.confirmacion === null)
    return { ok: false, motivo: "sobre_origen_sin_confirmar" };
  const origen = sobreVigente(libro, original.id) ?? original;

  const correccion = ultimo(
    h.eventos.filter((e): e is Correccion => e.tipo === "correccion"),
  );
  const aceptacion = ultimo(
    h.eventos.filter((e): e is Aceptacion => e.tipo === "aceptacion"),
  );

  const citan = libro
    .filter((s) => s.reprueba_de === h.id)
    .sort((a, b) => comparar(a.id, b.id));
  const candidatas = citan
    .filter((s) => s.confirmacion !== null)
    .map((sobre) => ({
      sobre,
      motivos: motivosDeRechazo(origen, correccion, sobre),
    }));
  const porConfirmar = citan.filter((s) => s.confirmacion === null);
  const valida = candidatas.find((c) => c.motivos.length === 0) ?? null;

  // La última declaración que decide (eliminar, no se reproduce, aceptar el riesgo) manda entre las declaradas.
  const decisiva = ultimo(
    h.eventos.filter(
      (e) =>
        e.tipo === "eliminacion" ||
        e.tipo === "no_reproducible" ||
        e.tipo === "aceptacion",
    ),
  );

  let estado: EstadoDeHallazgo;
  let cierre: CierreDeHallazgo | null = null;
  if (valida !== null) {
    estado = "cerrado";
    cierre = {
      tipo: "reprueba",
      fecha: valida.sobre.confirmacion?.fecha ?? valida.sobre.fecha,
      sobre: valida.sobre.id,
    };
  } else if (decisiva?.tipo === "eliminacion") {
    estado = "cerrado_por_eliminacion";
    cierre = { tipo: "eliminacion", fecha: decisiva.fecha, sobre: null };
  } else if (decisiva?.tipo === "no_reproducible") {
    estado = "no_reproducible";
    cierre = { tipo: "no_reproducible", fecha: decisiva.fecha, sobre: null };
  } else if (decisiva?.tipo === "aceptacion") {
    estado = "aceptado_con_riesgo";
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
      sobreOrigen: origen,
      correccion,
      aceptacion: estado === "aceptado_con_riesgo" ? aceptacion : null,
      cierre,
      candidatas,
      porConfirmar,
    },
  };
}
