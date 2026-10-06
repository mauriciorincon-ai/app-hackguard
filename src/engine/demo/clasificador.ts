// Activo demo de la familia `modelo_decision` (E-17 a E-23): un clasificador determinista propio que imita el
// CONTRATO DE RESPUESTA de Jev (TypeSafe) sin ser Jev. Recibe un estado tipado y preguntas tipadas y devuelve
// `{model, answers, usage}`: una pregunta Choice con `choice`, `probabilities` que suman 10 000 diezmilésimos y
// `confidence = (p_max − 1/n)/(1 − 1/n)`, y una pregunta Noul con `noul` (probabilidad de «sí»), como documenta el
// fabricante.
// Que `answers` vaya indexado por el id de la pregunta es nuestro: el fabricante no documenta la anidación.
//
// El dominio es neutro y sintético: el triaje de solicitudes de socios de una biblioteca municipal. Las
// probabilidades salen de pesos enteros por regla, en diezmilésimos por resto mayor: suman exactamente 10 000
// diezmilésimos (en coma flotante, la suma puede diferir de 1 en el último bit) y dan los mismos bytes en
// cualquier motor. Tres imperfecciones son A PROPÓSITO, para que las pruebas de la
// familia tengan algo que medir:
//   1. el léxico de la nota cubre el inglés y solo parte del español (Jev pierde exactitud en español);
//   2. busca palabras sin entender la negación («I wasn't ill» cuenta como enfermedad);
//   3. premia la antigüedad del socio, que la política de la biblioteca no menciona.
// Con `semilla` y `ruido_por_mil`, cada peso se perturba con mulberry32 para imitar la variación entre llamadas
// idénticas (E-18, E-19). La misma petición con la misma semilla da siempre la misma respuesta.
import { z } from "zod";
import { canonicalizar } from "../huella.ts";

export const MODELO_DEMO = "hackguard-demo-1.0.0";

export const OPCIONES_DE_DECISION = ["aprobar", "rechazar", "revisar"] as const;
export type OpcionDeDecision = (typeof OPCIONES_DE_DECISION)[number];
const OPCIONES_DE_NOUL = ["no", "si"] as const;

export const TIPOS_DE_SOLICITUD = [
  "renovacion",
  "reserva",
  "prestamo_interbibliotecario",
  "condonacion_de_multa",
] as const;

export const EstadoDeSolicitud = z.strictObject({
  tipo: z.enum(TIPOS_DE_SOLICITUD),
  prestamos_activos: z.int().min(0).max(100),
  dias_de_retraso: z.int().min(0).max(3650),
  /** En céntimos de euro. */
  multa_pendiente: z.int().min(0).max(1_000_000),
  anios_como_socio: z.int().min(0).max(100),
  /** Lo que escribió el socio, en el idioma que sea. */
  nota: z.string().max(2000),
});
export type EstadoDeSolicitud = z.infer<typeof EstadoDeSolicitud>;

const Pregunta = z.discriminatedUnion("type", [
  z.strictObject({
    id: z.literal("decision"),
    type: z.literal("choice"),
    options: z
      .array(z.enum(OPCIONES_DE_DECISION))
      .min(2)
      .refine((o) => new Set(o).size === o.length, "opciones repetidas"),
  }),
  z.strictObject({ id: z.literal("urgente"), type: z.literal("noul") }),
]);

export const PeticionDemo = z.strictObject({
  state: EstadoDeSolicitud,
  questions: z
    .array(Pregunta)
    .min(1)
    .refine(
      (q) => new Set(q.map((p) => p.id)).size === q.length,
      "preguntas repetidas",
    ),
});
export type PeticionDemo = z.input<typeof PeticionDemo>;

export interface RespuestaChoice {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface RespuestaNoul {
  type: "noul";
  noul: number;
}

export interface RespuestaDemo {
  model: typeof MODELO_DEMO;
  answers: Record<string, RespuestaChoice | RespuestaNoul>;
  /** El demo no consume tokens; el campo existe porque el contrato lo trae. */
  usage: { input_tokens: number; output_tokens: number };
}

export interface Ejecucion {
  /** Sin semilla no hay ruido: la respuesta es la de los pesos. */
  semilla?: number;
  /** Cuánto puede moverse cada peso, en milésimos (0 a 500). */
  ruido_por_mil?: number;
}

// ── El léxico de la nota ────────────────────────────────────────────────────────────────────────
// Frases como secuencias de palabras en minúsculas. El español está incompleto a propósito (imperfección 1).

const ATENUANTES: readonly string[][] = [
  ["ill"],
  ["illness"],
  ["sick"],
  ["hospital"],
  ["hospitalised"],
  ["hospitalized"],
  ["surgery"],
  ["moving"],
  ["moved"],
  ["flood"],
  ["flooded"],
  ["bereavement"],
  ["funeral"],
  ["cirugía"],
];

const ERRORES_DE_LA_BIBLIOTECA: readonly string[][] = [
  ["library", "error"],
  ["your", "mistake"],
  ["your", "error"],
  ["error", "de", "la", "biblioteca"],
];

const URGENCIAS: readonly string[][] = [
  ["urgent"],
  ["urgently"],
  ["deadline"],
  ["exam"],
  ["today"],
  ["tomorrow"],
  ["urgente"],
  ["examen"],
];

const palabras = (texto: string): string[] =>
  texto
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((p) => p !== "");

function contiene(texto: readonly string[], frases: readonly string[][]) {
  return frases.some((frase) =>
    texto.some((_, i) => frase.every((p, j) => texto[i + j] === p)),
  );
}

// ── Pesos ───────────────────────────────────────────────────────────────────────────────────────

type Pesos = Record<OpcionDeDecision, number>;

const sumar = (a: Pesos, b: Pesos): Pesos => ({
  aprobar: a.aprobar + b.aprobar,
  rechazar: a.rechazar + b.rechazar,
  revisar: a.revisar + b.revisar,
});

function pesosDeDecision(e: EstadoDeSolicitud, texto: string[]): Pesos {
  const nueva =
    e.tipo === "reserva" || e.tipo === "prestamo_interbibliotecario";
  const grave =
    e.dias_de_retraso > 60 ||
    e.multa_pendiente > 5000 ||
    (nueva && e.prestamos_activos >= 10);
  const leve = !grave && (e.dias_de_retraso > 0 || e.multa_pendiente > 0);
  const errorDeLaBiblioteca = contiene(texto, ERRORES_DE_LA_BIBLIOTECA);
  const atenuante = errorDeLaBiblioteca || contiene(texto, ATENUANTES);

  let p: Pesos = { aprobar: 6, rechazar: 1, revisar: 1 };
  if (grave) p = sumar(p, { aprobar: -5, rechazar: 10, revisar: 2 });
  if (leve) p = sumar(p, { aprobar: -3, rechazar: 0, revisar: 6 });
  if (e.tipo === "condonacion_de_multa")
    p = sumar(p, { aprobar: -4, rechazar: 0, revisar: 10 });
  if (atenuante && grave)
    p = sumar(p, { aprobar: 0, rechazar: -7, revisar: 6 });
  if (atenuante && !grave)
    p = sumar(p, { aprobar: 6, rechazar: 0, revisar: -2 });
  if (errorDeLaBiblioteca)
    p = sumar(p, { aprobar: 6, rechazar: 0, revisar: -6 });
  if (e.anios_como_socio >= 10)
    p = sumar(p, { aprobar: 2, rechazar: 0, revisar: 0 });
  return p;
}

function pesosDeUrgencia(e: EstadoDeSolicitud, texto: string[]) {
  return {
    no: 4,
    si:
      1 +
      (contiene(texto, URGENCIAS) ? 8 : 0) +
      (e.tipo === "prestamo_interbibliotecario" ? 1 : 0),
  };
}

// ── Ruido sembrado ──────────────────────────────────────────────────────────────────────────────

/** FNV-1a de 32 bits sobre las unidades UTF-16 del texto. */
function fnv1a(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** mulberry32: un generador de 32 bits con aritmética entera, igual en todos los motores. */
function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Probabilidades ──────────────────────────────────────────────────────────────────────────────

const comparar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Reparte 10 000 diezmilésimos en proporción a pesos enteros positivos, por resto mayor: la suma es
 * exactamente 10 000. Los empates de resto se rompen por id, nunca por posición.
 */
export function aDiezmilesimos(
  pesos: Readonly<Record<string, number>>,
): Record<string, number> {
  const ids = Object.keys(pesos).sort(comparar);
  for (const id of ids) {
    if (!Number.isSafeInteger(pesos[id]) || pesos[id] < 1)
      throw new RangeError(`peso no entero positivo: ${id}`);
  }
  const total = ids.reduce((s, id) => s + pesos[id], 0);
  const partes = ids.map((id) => {
    const a = pesos[id] * 10000;
    const resto = a % total;
    return { id, base: (a - resto) / total, resto };
  });
  let falta = 10000 - partes.reduce((s, p) => s + p.base, 0);
  const porResto = [...partes].sort(
    (x, y) => y.resto - x.resto || comparar(x.id, y.id),
  );
  for (const p of porResto) {
    if (falta === 0) break;
    p.base += 1;
    falta -= 1;
  }
  return Object.fromEntries(partes.map((p) => [p.id, p.base]));
}

/** La opción con más probabilidad; un empate se rompe por id. */
function elegir(diezmilesimos: Readonly<Record<string, number>>): string {
  return Object.keys(diezmilesimos)
    .sort(comparar)
    .reduce((mejor, id) =>
      diezmilesimos[id] > diezmilesimos[mejor] ? id : mejor,
    );
}

function invalida(error: z.ZodError): RangeError {
  const p = error.issues[0];
  const ruta = p.path.map(String).join(".") || "(raíz / root)";
  // El mensaje de Zod viene en inglés: se usa su código, que no tiene idioma.
  return new RangeError(
    `petición inválida en ${ruta} (${p.code}) / invalid request at ${ruta} (${p.code})`,
  );
}

/** Responde una petición con el contrato de Jev. Lanza `RangeError` si la petición no es válida. */
export function clasificar(
  peticion: PeticionDemo,
  ejecucion: Ejecucion = {},
): RespuestaDemo {
  const leida = PeticionDemo.safeParse(peticion);
  if (!leida.success) throw invalida(leida.error);
  const { state, questions } = leida.data;
  const ruido = ejecucion.ruido_por_mil ?? 0;
  if (!Number.isInteger(ruido) || ruido < 0 || ruido > 500)
    throw new RangeError(`ruido_por_mil fuera de 0–500: ${ruido}`);
  if (
    ejecucion.semilla !== undefined &&
    (!Number.isInteger(ejecucion.semilla) ||
      ejecucion.semilla < 0 ||
      ejecucion.semilla > 0xffffffff)
  ) {
    throw new RangeError(`semilla fuera de 0–2³²−1: ${ejecucion.semilla}`);
  }

  // Cada peso recibe su sorteo en un orden fijo (las opciones de decisión por id, luego «no» y «sí»), con
  // una semilla que mezcla la de la ejecución y el estado: ni el orden ni el subconjunto de opciones que
  // pide la pregunta cambian lo que sale.
  const azar =
    ejecucion.semilla === undefined
      ? null
      : mulberry32((ejecucion.semilla ^ fnv1a(canonicalizar(state))) >>> 0);
  const perturbar = (peso: number) => {
    if (azar === null) return Math.max(1, peso);
    const r = Math.floor(azar() * (2 * ruido + 1)) - ruido;
    return Math.max(1, Math.max(1, peso) * (1000 + r));
  };
  const texto = palabras(state.nota);
  const decision = pesosDeDecision(state, texto);
  const urgencia = pesosDeUrgencia(state, texto);
  const pesosD = Object.fromEntries(
    OPCIONES_DE_DECISION.map((o) => [o, perturbar(decision[o])]),
  );
  const pesosU = Object.fromEntries(
    OPCIONES_DE_NOUL.map((o) => [o, perturbar(urgencia[o])]),
  );

  const answers: Record<string, RespuestaChoice | RespuestaNoul> = {};
  for (const q of questions) {
    if (q.type === "choice") {
      const elegidas = Object.fromEntries(
        [...q.options].sort(comparar).map((o) => [o, pesosD[o]]),
      );
      const d = aDiezmilesimos(elegidas);
      const n = q.options.length;
      const choice = elegir(d);
      answers[q.id] = {
        type: "choice",
        choice,
        probabilities: Object.fromEntries(
          Object.entries(d).map(([o, v]) => [o, v / 10000]),
        ),
        confidence: (n * d[choice] - 10000) / ((n - 1) * 10000),
      };
    } else {
      answers[q.id] = { type: "noul", noul: aDiezmilesimos(pesosU).si / 10000 };
    }
  }
  return {
    model: MODELO_DEMO,
    answers,
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}
