// El lote de 200 resultados pegados sintéticos y sus 10 tandas de 20 (pregunta 1 del G-Plan del S11). Se generan con una semilla fija
// (jamás `Math.random`, regla dura 1): el mismo lote en cualquier computadora. Sirve para medir cuánta cuota gasta cada corrida de
// `/extraer` y proyectar las demás; las corre una persona, no este sprint. Función pura.
import { huella } from "../huella.ts";
import type { Resultado } from "../evidencia/esquemas.ts";
import type { CasoDePegado, VeredictoS3 } from "./s3.ts";
import { veredictoDeLaRegla } from "./s3.ts";

export const SEMILLA_DEL_LOTE = "hackguard-lote-de-200@1";
export const TAMANO_DE_TANDA = 20;
export const TOTAL_DEL_LOTE = 200;

/** FNV-1a de 32 bits: una semilla numérica a partir de un texto, sin reloj ni azar. */
function semilla(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: un generador determinista con la semilla dada. */
function generador(s: number): () => number {
  let a = s;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Plantilla {
  activo: string;
  prueba: string;
  herramienta: { id: string; version: string };
  regla: CasoDePegado["regla"];
  estilo: CasoDePegado["estilo"];
}
const K20 = { regla: "asimetrica_k", k: 20 };
const A = "act-demo-asistente";
/** Las pruebas de los planes demo que una herramienta con texto pegado mide. */
const PLANTILLAS: readonly Plantilla[] = [
  ...["PR-IA-PINJ-001", "PR-IA-ENC-002", "PR-IA-CONT-001"].map((prueba) => ({
    activo: A,
    prueba,
    herramienta: { id: "garak", version: "0.17.0" },
    regla: K20,
    estilo: "garak" as const,
  })),
  ...["PR-AG-PERM-001", "PR-AG-LIM-001", "PR-IA-SAL-001"].map((prueba) => ({
    activo: A,
    prueba,
    herramienta: { id: "promptfoo", version: "0.123.1" },
    regla: K20,
    estilo: "promptfoo" as const,
  })),
  ...["PR-SW-XSS-001", "PR-SW-CSP-001", "PR-SW-ERR-001"].map((prueba) => ({
    activo: A,
    prueba,
    herramienta: { id: "zap", version: "2.17.0" },
    regla: { regla: "comprobacion_determinista", k: null },
    estilo: "zap" as const,
  })),
  {
    activo: "act-demo-clasificador",
    prueba: "PR-MD-CAL-001",
    herramienta: { id: "scikit-learn", version: "1.5.2" },
    regla: { regla: "metrica_con_umbral", k: 5 },
    estilo: "metrica" as const,
  },
];

const DESENLACES: readonly VeredictoS3[] = [
  "superada",
  "superada",
  "superada",
  "superada",
  "fallida",
  "fallida",
  "fallida",
  "parcial",
  "no_ejecutada",
  "superada",
];

function hechosDe(
  p: Plantilla,
  desenlace: VeredictoS3,
  rng: () => number,
): { resultado: Resultado; borde: boolean } {
  const entre = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const base: Resultado = {
    ejecutada: true,
    evaluadas: null,
    fallidas: null,
    alertas: null,
    metrica: null,
  };
  if (desenlace === "no_ejecutada")
    return { resultado: { ...base, ejecutada: false }, borde: false };
  if (p.estilo === "zap")
    return {
      resultado: {
        ...base,
        alertas: desenlace === "fallida" ? entre(1, 6) : 0,
      },
      borde: false,
    };
  if (p.estilo === "metrica") {
    const umbral = 0.05;
    const justo = desenlace === "superada" && rng() < 0.15;
    const valor = justo
      ? umbral
      : desenlace === "fallida"
        ? Math.round((umbral + entre(1, 9) / 100) * 1000) / 1000
        : Math.round(entre(5, 49) * 1) / 1000;
    return {
      resultado: {
        ...base,
        metrica: {
          nombre: {
            es: "error de calibración esperado",
            en: "expected calibration error",
          },
          valor,
          umbral,
          sentido: "maximo",
        },
      },
      borde: justo,
    };
  }
  // Garak y promptfoo, con la regla asimétrica de k = 20
  if (desenlace === "fallida")
    return {
      resultado: {
        ...base,
        evaluadas: 20 + entre(0, 20),
        fallidas: entre(1, 6),
      },
      borde: false,
    };
  if (desenlace === "parcial") {
    const evaluadas = entre(8, 19);
    return {
      resultado: { ...base, evaluadas, fallidas: 0 },
      borde: evaluadas === 19,
    };
  }
  return {
    resultado: { ...base, evaluadas: 20 + entre(0, 30), fallidas: 0 },
    borde: false,
  };
}

/** Los 200 casos del lote: el mismo orden y los mismos números siempre. Cada uno trae el veredicto que calcula su regla. */
export function casosDelLoteDe200(): CasoDePegado[] {
  const rng = generador(semilla(SEMILLA_DEL_LOTE));
  const casos: CasoDePegado[] = [];
  for (let i = 1; i <= TOTAL_DEL_LOTE; i++) {
    const p = PLANTILLAS[Math.floor(rng() * PLANTILLAS.length)]!;
    let desenlace = DESENLACES[Math.floor(rng() * DESENLACES.length)]!;
    // «parcial» solo existe con la regla asimétrica: en las demás, el desenlace pasa a superada
    if (desenlace === "parcial" && p.regla.regla !== "asimetrica_k")
      desenlace = "superada";
    const { resultado, borde } = hechosDe(p, desenlace, rng);
    casos.push({
      id: `L${String(i).padStart(3, "0")}`,
      ...p,
      fecha: "2026-10-03",
      resultado,
      borde,
    });
  }
  return casos;
}

export interface Tanda {
  numero: number;
  desde: string;
  hasta: string;
  ids: string[];
  /** Cuántos casos de cada veredicto que calcula la regla trae la tanda. */
  porVeredicto: Record<VeredictoS3, number>;
}

export function tandasDe(
  casos: readonly CasoDePegado[],
  tamano: number = TAMANO_DE_TANDA,
): Tanda[] {
  const tandas: Tanda[] = [];
  for (let i = 0; i < casos.length; i += tamano) {
    const trozo = casos.slice(i, i + tamano);
    const porVeredicto: Record<VeredictoS3, number> = {
      superada: 0,
      fallida: 0,
      parcial: 0,
      no_ejecutada: 0,
      no_aplicable: 0,
    };
    for (const c of trozo) porVeredicto[veredictoDeLaRegla(c)]++;
    tandas.push({
      numero: tandas.length + 1,
      desde: trozo[0]!.id,
      hasta: trozo[trozo.length - 1]!.id,
      ids: trozo.map((c) => c.id),
      porVeredicto,
    });
  }
  return tandas;
}

/** La huella del lote: sus ids, pruebas y resultados. Si el generador cambia, cambia, y el gate de deriva lo dice. */
export const huellaDelLote = (casos: readonly CasoDePegado[]) =>
  huella(
    casos.map((c) => ({
      id: c.id,
      activo: c.activo,
      prueba: c.prueba,
      resultado: c.resultado,
    })),
  );

// ── Lo que mide quien corre las tandas ────────────────────────────────────────────────────────────────────────────────────────────────

export interface CorridaDeTanda {
  tanda: number;
  /** Porcentaje de la cuota (de la ventana de uso) consumido ANTES y DESPUÉS de correr los 20 `/extraer`. */
  cuota_antes_pct: number;
  cuota_despues_pct: number;
  minutos: number;
  propuestas_selladas: number;
  /** Cuántas propuestas una persona tuvo que corregir antes de aprobar. */
  corregidas_por_persona: number;
}

export interface MetricasDeTandas {
  corridas: number;
  cuotaPorTanda: { tanda: number; pct: number; porTexto: number }[];
  cuotaMedia: number;
  correccionMedia: number;
  /** Lo que costarían las tandas que faltan al ritmo medio, sobre 100 % de una ventana. */
  tandasQueFaltan: number;
  proyeccionDeLasQueFaltan: number;
  /** ¿Cabe todo el lote restante en una sola ventana de cuota? */
  cabenEnUnaVentana: boolean;
}

export function metricasDeTandas(
  registro: readonly CorridaDeTanda[],
  totalDeTandas: number,
): MetricasDeTandas {
  const por = registro.map((r) => {
    const pct =
      Math.round((r.cuota_despues_pct - r.cuota_antes_pct) * 100) / 100;
    return {
      tanda: r.tanda,
      pct,
      porTexto: Math.round((pct / TAMANO_DE_TANDA) * 1000) / 1000,
    };
  });
  const media =
    por.length === 0 ? 0 : por.reduce((s, x) => s + x.pct, 0) / por.length;
  const propuestas = registro.reduce((s, r) => s + r.propuestas_selladas, 0);
  const corregidas = registro.reduce((s, r) => s + r.corregidas_por_persona, 0);
  const faltan = Math.max(
    0,
    totalDeTandas - new Set(registro.map((r) => r.tanda)).size,
  );
  const proyeccion = Math.round(faltan * media * 100) / 100;
  return {
    corridas: registro.length,
    cuotaPorTanda: por,
    cuotaMedia: Math.round(media * 100) / 100,
    correccionMedia:
      propuestas === 0
        ? 0
        : Math.round((corregidas / propuestas) * 1000) / 1000,
    tandasQueFaltan: faltan,
    proyeccionDeLasQueFaltan: proyeccion,
    cabenEnUnaVentana: proyeccion <= 100,
  };
}
