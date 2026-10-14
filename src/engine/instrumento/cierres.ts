// La validación del instrumento para el libro y la brecha (C18): corre cada semilla de cierre contra el mundo demo y dice si el
// motor respondió lo que se esperaba. Es la prueba de que HackGuard hace lo que promete: un cierre prohibido se niega con su
// motivo, y «no detectado» no cuenta como verificado. Código puro (regla dura 1): ninguna semilla lee el reloj ni un archivo.
import {
  armarBrecha,
  ErrorDeEntradaDeBrecha,
  type EntradaDeBrecha,
} from "../brecha/calcular.ts";
import type { SobreEfectivo } from "../evidencia/esquemas.ts";
import { evaluarHallazgo } from "../hallazgos/ciclo.ts";
import { comparar } from "../planificador/orden.ts";
import type {
  Espera,
  RequisitoDeInstrumento,
  SemillaDeCierre,
  SobreSembrado,
} from "./esquemas.ts";
import type { Texto } from "../catalogo/esquemas.ts";

export interface ResultadoDeSemilla {
  id: string;
  requisito: RequisitoDeInstrumento;
  pasa: boolean;
  /** Lo que el motor respondió y la semilla esperaba, una línea por cada diferencia. */
  diferencias: string[];
}

export interface ComprobacionDeInstrumento {
  requisito: RequisitoDeInstrumento;
  /** El nombre de la comprobación, cuando viene del dato (las semillas de los agentes); los cierres lo nombra la pantalla. */
  nombre?: Texto;
  sembradas: number;
  /** Las semillas en que el motor respondió lo esperado. */
  obtenidas: number;
  semillas: ResultadoDeSemilla[];
}

const copia = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Cambia un campo por su ruta con puntos en una copia; una ruta que no existe es un error de la semilla. */
function poner(objeto: Record<string, unknown>, ruta: string, valor: unknown) {
  const partes = ruta.split(".");
  let actual: Record<string, unknown> = objeto;
  for (const p of partes.slice(0, -1)) {
    const siguiente = actual[p];
    if (typeof siguiente !== "object" || siguiente === null)
      throw new Error(`la ruta «${ruta}» no existe en el sobre`);
    actual = siguiente as Record<string, unknown>;
  }
  const ultimo = partes[partes.length - 1]!;
  if (!(ultimo in actual))
    throw new Error(`la ruta «${ruta}» no existe en el sobre`);
  actual[ultimo] = valor;
}

/** El libro de la semilla: el demo con sus sobres cambiados o agregados. */
export function libroSembrado(
  libro: readonly SobreEfectivo[],
  sobres: readonly SobreSembrado[],
): SobreEfectivo[] {
  const resultado = libro.map((s) => copia(s));
  for (const sembrado of sobres) {
    const existente = resultado.find((s) => s.id === sembrado.id);
    let destino: SobreEfectivo;
    if (sembrado.copia_de === undefined) {
      if (existente === undefined)
        throw new Error(`el sobre ${sembrado.id} de la semilla no existe`);
      destino = existente;
    } else {
      if (existente !== undefined)
        throw new Error(`el sobre ${sembrado.id} de la semilla ya existe`);
      const origen = resultado.find((s) => s.id === sembrado.copia_de);
      if (origen === undefined)
        throw new Error(
          `el sobre ${sembrado.copia_de} de la semilla no existe`,
        );
      destino = copia(origen);
      destino.id = sembrado.id;
      resultado.push(destino);
    }
    for (const [ruta, valor] of Object.entries(sembrado.cambios))
      poner(destino as unknown as Record<string, unknown>, ruta, valor);
  }
  return resultado;
}

const dice = (x: unknown) => JSON.stringify(x);

/** Corre UNA semilla: el mundo demo con sus cambios, y lo que el ciclo de vida y la brecha responden. */
export function correrSemilla(
  semilla: SemillaDeCierre,
  base: EntradaDeBrecha,
): ResultadoDeSemilla {
  const libro = libroSembrado(base.libro, semilla.sobres);
  const entrada = { ...base, libro };
  const diferencias: string[] = [];
  let brecha: ReturnType<typeof armarBrecha>;
  try {
    brecha = armarBrecha(entrada);
  } catch (e) {
    // Una semilla con un sobre fechado después de la consulta no se puede armar (la brecha lo rechaza): es una DIFERENCIA con su motivo,
    // no un build que muere con una traza (S7-B2).
    if (!(e instanceof ErrorDeEntradaDeBrecha)) throw e;
    return {
      id: semilla.id,
      requisito: semilla.requisito,
      pasa: false,
      diferencias: [`la brecha no se pudo armar: ${e.message}`],
    };
  }
  const espera: Espera = semilla.espera;

  const evaluacion = (id: string) => {
    const h = base.hallazgos.find((x) => x.id === id);
    if (h === undefined) return null;
    const r = evaluarHallazgo(h, libro);
    return r.ok ? r.evaluacion : null;
  };

  for (const e of espera.hallazgos ?? []) {
    const obtenido = evaluacion(e.id)?.estado ?? null;
    if (obtenido !== e.estado)
      diferencias.push(`${e.id}: esperado ${e.estado}, obtenido ${obtenido}`);
  }
  for (const e of espera.candidatas ?? []) {
    const c = evaluacion(e.hallazgo)?.candidatas.find(
      (x) => x.sobre.id === e.sobre,
    );
    const obtenido = c === undefined ? null : [...c.motivos].sort(comparar);
    if (dice(obtenido) !== dice([...e.motivos].sort(comparar)))
      diferencias.push(
        `${e.hallazgo} / ${e.sobre}: motivos esperados ${dice(e.motivos)}, obtenidos ${dice(obtenido)}`,
      );
  }
  for (const e of espera.por_confirmar ?? []) {
    const obtenido = (evaluacion(e.hallazgo)?.porConfirmar ?? [])
      .map((s) => s.id)
      .sort(comparar);
    if (dice(obtenido) !== dice([...e.sobres].sort(comparar)))
      diferencias.push(
        `${e.hallazgo}: por confirmar esperado ${dice(e.sobres)}, obtenido ${dice(obtenido)}`,
      );
  }
  for (const e of espera.controles ?? []) {
    const obtenido =
      brecha.controles.find((c) => c.id === e.id)?.estado ?? null;
    if (obtenido !== e.estado)
      diferencias.push(`${e.id}: esperado ${e.estado}, obtenido ${obtenido}`);
  }
  for (const e of espera.filas ?? []) {
    const f = brecha.filas.find(
      (x) => x.activo === e.activo && x.prueba === e.prueba,
    );
    const obtenido =
      f === undefined ? null : { sobre: f.sobre, ejecutada: f.ejecutada };
    if (dice(obtenido) !== dice({ sobre: e.sobre, ejecutada: e.ejecutada }))
      diferencias.push(
        `${e.activo}/${e.prueba}: esperado ${dice({ sobre: e.sobre, ejecutada: e.ejecutada })}, obtenido ${dice(obtenido)}`,
      );
  }
  return {
    id: semilla.id,
    requisito: semilla.requisito,
    pasa: diferencias.length === 0,
    diferencias,
  };
}

/** Corre todas las semillas y las agrupa por requisito: lo que el tablero muestra como «N de M comprobaciones en verde». */
export function validarInstrumento(
  semillas: readonly SemillaDeCierre[],
  base: EntradaDeBrecha,
): ComprobacionDeInstrumento[] {
  const resultados = semillas.map((s) => correrSemilla(s, base));
  const requisitos = [...new Set(resultados.map((r) => r.requisito))].sort(
    comparar,
  );
  return requisitos.map((requisito) => {
    const suyas = resultados.filter((r) => r.requisito === requisito);
    return {
      requisito,
      sembradas: suyas.length,
      obtenidas: suyas.filter((r) => r.pasa).length,
      semillas: suyas,
    };
  });
}
