// El conjunto de referencia del clasificador demo (`docs/kit-de-prueba/modelo-decision/`) y su evaluación: el
// clasificador responde cada caso en los dos idiomas, k veces con la semilla del conjunto, y las métricas de
// `modelo-decision/metricas.ts` miden lo que respondió. La salida es un objeto para una máquina y un informe
// para una persona en español o en inglés.
import { z } from "zod";
import { IdMinusculas, IdPrueba, Texto } from "../catalogo/esquemas.ts";
import { huella } from "../huella.ts";
import {
  brier,
  ece,
  eleccion,
  errorEnBanda,
  exactitud,
  paridad,
  tasaPorReejecucion,
  type Ece,
  type Paridad,
  type Prediccion,
  type Reejecucion,
  type Tasa,
} from "../modelo-decision/metricas.ts";
import {
  clasificar,
  EstadoDeSolicitud,
  MODELO_DEMO,
  OPCIONES_DE_DECISION,
  type RespuestaChoice,
  type RespuestaDemo,
  type RespuestaNoul,
} from "./clasificador.ts";

export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const ConjuntoDeReferencia = z
  .strictObject({
    id: IdMinusculas,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    descripcion: Texto,
    advertencia: Texto,
    politica: z
      .array(
        z.strictObject({
          id: IdMinusculas,
          orden: z.int().min(1),
          texto: Texto,
        }),
      )
      .min(1),
    parametros: z.strictObject({
      semilla: z.int().min(0).max(0xffffffff),
      repeticiones: z.int().min(2).max(100),
      ruido_por_mil: z.int().min(0).max(500),
      bins_ece: z.int().min(1).max(100),
      banda: z.strictObject({
        opcion: z.enum(OPCIONES_DE_DECISION),
        umbral: z.number().min(0).max(1),
        desde: z.number().min(0).max(1),
        hasta: z.number().min(0).max(1),
      }),
    }),
    casos: z
      .array(
        z.strictObject({
          id: IdPrueba,
          regla: IdMinusculas,
          estado: EstadoDeSolicitud.omit({ nota: true }),
          nota: Texto,
          etiqueta: z.strictObject({
            decision: z.enum(OPCIONES_DE_DECISION),
            urgente: z.boolean(),
          }),
        }),
      )
      .min(4),
  })
  .superRefine((c, ctx) => {
    const ids = c.casos.map((x) => x.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "casos con id repetido / repeated case ids",
        path: ["casos"],
      });
    const reglas = new Set(c.politica.map((r) => r.id));
    c.casos.forEach((x, i) => {
      if (!reglas.has(x.regla))
        ctx.addIssue({
          code: "custom",
          message: `regla inexistente / no such rule: ${x.regla}`,
          path: ["casos", i, "regla"],
        });
      if (x.nota.es === x.nota.en)
        ctx.addIssue({
          code: "custom",
          message: "la nota es igual en los dos idiomas / the note is the same in both languages",
          path: ["casos", i, "nota"],
        });
    });
    const { umbral, desde, hasta } = c.parametros.banda;
    if (!(desde <= umbral && umbral <= hasta))
      ctx.addIssue({
        code: "custom",
        message: "la banda no contiene el umbral / the band does not contain the threshold",
        path: ["parametros", "banda"],
      });
  });
export type ConjuntoDeReferencia = z.infer<typeof ConjuntoDeReferencia>;

/** Las dos preguntas que se le hacen a cada caso: una Choice sobre la decisión y una Noul sobre la urgencia. */
const preguntas = () => [
  {
    id: "decision" as const,
    type: "choice" as const,
    options: [...OPCIONES_DE_DECISION],
  },
  { id: "urgente" as const, type: "noul" as const },
];

export interface RespuestaDeCaso {
  id: string;
  idioma: Idioma;
  respuesta: RespuestaDemo;
}

export interface MedidasDeIdioma {
  exactitud: Tasa;
  brier: number | null;
  ece: Ece;
  banda: Tasa;
}

export interface EvaluacionDelDemo {
  modelo: string;
  conjunto: { id: string; version: string; casos: number; advertencia: Texto };
  parametros: ConjuntoDeReferencia["parametros"];
  /** Huella de las respuestas de la primera corrida en los dos idiomas: la misma entrada da la misma huella. */
  huella_de_respuestas: string;
  decision: {
    es: MedidasDeIdioma;
    en: MedidasDeIdioma;
    paridad: Paridad;
    reejecucion: Reejecucion;
  };
  urgencia: {
    es: { exactitud: Tasa; brier: number | null };
    en: { exactitud: Tasa; brier: number | null };
  };
  /** Por caso y por idioma, lo que se eligió y su margen al umbral de la banda (E-18). */
  casos: {
    id: string;
    idioma: Idioma;
    etiqueta: string;
    eleccion: string;
    probabilidades: Record<string, number>;
    margen: number;
    urgente: boolean;
    noul: number;
  }[];
}

const decisionDe = (r: RespuestaDemo) => r.answers.decision as RespuestaChoice;
const noulDe = (r: RespuestaDemo) => r.answers.urgente as RespuestaNoul;

/** Corre el clasificador sobre el conjunto y lo mide. Lanza `RangeError` si el conjunto no es válido. */
export async function evaluarConjunto(
  datos: unknown,
): Promise<EvaluacionDelDemo> {
  const leido = ConjuntoDeReferencia.safeParse(datos);
  if (!leido.success) {
    const p = leido.error.issues[0];
    const ruta = p.path.map(String).join(".") || "(raíz / root)";
    // El mensaje de Zod viene en inglés: se usa su código, que no tiene idioma. Las comprobaciones propias
    // (`custom`) traen su mensaje en los dos idiomas.
    const detalle = p.code === "custom" ? p.message : p.code;
    throw new RangeError(
      `conjunto inválido en ${ruta} (${detalle}) / invalid set at ${ruta} (${detalle})`,
    );
  }
  const c = leido.data;
  const { semilla, repeticiones, ruido_por_mil, bins_ece, banda } =
    c.parametros;

  const corridas: RespuestaDeCaso[][] = [];
  for (let k = 0; k < repeticiones; k++) {
    corridas.push(
      c.casos.flatMap((caso) =>
        IDIOMAS.map((idioma) => ({
          id: caso.id,
          idioma,
          respuesta: clasificar(
            {
              state: { ...caso.estado, nota: caso.nota[idioma] },
              questions: preguntas(),
            },
            { semilla: (semilla + k) >>> 0, ruido_por_mil },
          ),
        })),
      ),
    );
  }
  const primera = corridas[0];
  const etiquetaDe = (id: string) => {
    const caso = c.casos.find((x) => x.id === id);
    if (caso === undefined) throw new Error(`caso perdido: ${id}`);
    return caso.etiqueta;
  };
  const decisiones = (rs: RespuestaDeCaso[], idioma?: Idioma): Prediccion[] =>
    rs
      .filter((r) => idioma === undefined || r.idioma === idioma)
      .map((r) => ({
        id: idioma === undefined ? `${r.id}/${r.idioma}` : r.id,
        probabilidades: decisionDe(r.respuesta).probabilities,
        etiqueta: etiquetaDe(r.id).decision,
      }));
  const urgencias = (idioma: Idioma): Prediccion[] =>
    primera
      .filter((r) => r.idioma === idioma)
      .map((r) => {
        const si = Math.round(noulDe(r.respuesta).noul * 10000);
        return {
          id: r.id,
          probabilidades: { no: (10000 - si) / 10000, si: si / 10000 },
          etiqueta: etiquetaDe(r.id).urgente ? "si" : "no",
        };
      });
  const medir = (idioma: Idioma): MedidasDeIdioma => {
    const ps = decisiones(primera, idioma);
    return {
      exactitud: exactitud(ps),
      brier: brier(ps, OPCIONES_DE_DECISION),
      ece: ece(ps, bins_ece),
      banda: errorEnBanda(ps, banda),
    };
  };
  const medirUrgencia = (idioma: Idioma) => ({
    exactitud: exactitud(urgencias(idioma)),
    brier: brier(urgencias(idioma), ["no", "si"]),
  });

  return {
    modelo: MODELO_DEMO,
    conjunto: {
      id: c.id,
      version: c.version,
      casos: c.casos.length,
      advertencia: c.advertencia,
    },
    parametros: c.parametros,
    huella_de_respuestas: await huella(primera),
    decision: {
      es: medir("es"),
      en: medir("en"),
      paridad: paridad(
        decisiones(primera, "es"),
        decisiones(primera, "en"),
        OPCIONES_DE_DECISION,
      ),
      reejecucion: tasaPorReejecucion(corridas.map((rs) => decisiones(rs))),
    },
    urgencia: { es: medirUrgencia("es"), en: medirUrgencia("en") },
    casos: primera.map((r) => {
      const d = decisionDe(r.respuesta);
      return {
        id: r.id,
        idioma: r.idioma,
        etiqueta: etiquetaDe(r.id).decision,
        eleccion: eleccion(d.probabilities),
        probabilidades: d.probabilities,
        // En diezmilésimos enteros, como las probabilidades: la resta en coma flotante deja ruido (0,0482…02).
        margen:
          (Math.round((d.probabilities[banda.opcion] ?? 0) * 10000) -
            Math.round(banda.umbral * 10000)) /
          10000,
        urgente: etiquetaDe(r.id).urgente,
        noul: noulDe(r.respuesta).noul,
      };
    }),
  };
}

// ── El informe para una persona ─────────────────────────────────────────────────────────────────

const numero = (x: number | null, idioma: Idioma, decimales = 4) =>
  x === null
    ? "—"
    : idioma === "es"
      ? x.toFixed(decimales).replace(".", ",")
      : x.toFixed(decimales);

const deCuantos = (t: Tasa, idioma: Idioma) =>
  idioma === "es" ? `${t.cuenta} de ${t.n}` : `${t.cuenta} of ${t.n}`;

/** Las opciones del contrato son identificadores en español: en el informe en inglés llevan su glosa. */
const GLOSA_EN: Record<string, string> = {
  aprobar: "approve",
  rechazar: "reject",
  revisar: "review",
};
const conGlosa = (opcion: string) =>
  GLOSA_EN[opcion] === undefined ? opcion : `${opcion} (${GLOSA_EN[opcion]})`;

const fila = (rotulo: string, es: string, en: string) =>
  `  ${rotulo.padEnd(30)}${es.padEnd(16)}${en}`;

export function informeDelDemo(e: EvaluacionDelDemo, idioma: Idioma): string {
  const p = e.parametros;
  const d = e.decision;
  const u = e.urgencia;
  const b = p.banda;
  const es = idioma === "es";
  const pp = d.paridad.diferencia_pp;
  const lineas = es
    ? [
        `Clasificador demo ${e.modelo} sobre «${e.conjunto.id}» ${e.conjunto.version}`,
        `  ${e.conjunto.casos} casos en español y en inglés · semilla ${p.semilla} · ${p.repeticiones} corridas con ruido de ${p.ruido_por_mil} por mil`,
        `  huella de las respuestas: ${e.huella_de_respuestas}`,
        `  ${e.conjunto.advertencia.es}`,
        "",
        `Decisión (Choice: ${OPCIONES_DE_DECISION.join(" · ")}), medida sobre las probabilidades y no sobre «confidence»`,
        fila("", "español", "inglés"),
        fila(
          "exactitud",
          deCuantos(d.es.exactitud, idioma),
          deCuantos(d.en.exactitud, idioma),
        ),
        fila("Brier", numero(d.es.brier, idioma), numero(d.en.brier, idioma)),
        fila(
          `ECE (${p.bins_ece} bins de igual masa)`,
          numero(d.es.ece.valor, idioma),
          numero(d.en.ece.valor, idioma),
        ),
        fila(
          "error en la banda",
          deCuantos(d.es.banda, idioma),
          deCuantos(d.en.banda, idioma),
        ),
        `  la banda: «${b.opcion}» sin pasar por una persona si p ≥ ${numero(b.umbral, idioma, 2)}; se mira entre ${numero(b.desde, idioma, 2)} y ${numero(b.hasta, idioma, 2)}`,
        "",
        "Urgencia (Noul)",
        fila(
          "exactitud",
          deCuantos(u.es.exactitud, idioma),
          deCuantos(u.en.exactitud, idioma),
        ),
        fila("Brier", numero(u.es.brier, idioma), numero(u.en.brier, idioma)),
        "",
        `Paridad ES/EN: ${pp === null ? "sin datos" : `la exactitud en inglés menos la de español da ${numero(pp, idioma, 1)} puntos`}; los dos idiomas eligen lo mismo en ${deCuantos(d.paridad.concordancia, idioma)} casos.`,
        `Re-ejecución: en ${d.reejecucion.k} corridas idénticas cambia la decisión en ${deCuantos(d.reejecucion, idioma)} respuestas (${numero((d.reejecucion.tasa ?? 0) * 100, idioma, 2)} %); ${d.reejecucion.vectores_identicos} de ${d.reejecucion.n} distribuciones salen idénticas.`,
      ]
    : [
        `Demo classifier ${e.modelo} on “${e.conjunto.id}” ${e.conjunto.version}`,
        `  ${e.conjunto.casos} cases in Spanish and in English · seed ${p.semilla} · ${p.repeticiones} runs with ${p.ruido_por_mil} per mille noise`,
        `  response fingerprint: ${e.huella_de_respuestas}`,
        `  ${e.conjunto.advertencia.en}`,
        "",
        `Decision (Choice: ${OPCIONES_DE_DECISION.map(conGlosa).join(" · ")}), measured on the probabilities, not on “confidence”`,
        fila("", "Spanish", "English"),
        fila(
          "accuracy",
          deCuantos(d.es.exactitud, idioma),
          deCuantos(d.en.exactitud, idioma),
        ),
        fila("Brier", numero(d.es.brier, idioma), numero(d.en.brier, idioma)),
        fila(
          `ECE (${p.bins_ece} equal-mass bins)`,
          numero(d.es.ece.valor, idioma),
          numero(d.en.ece.valor, idioma),
        ),
        fila(
          "error in the band",
          deCuantos(d.es.banda, idioma),
          deCuantos(d.en.banda, idioma),
        ),
        `  the band: “${conGlosa(b.opcion)}” without a person if p ≥ ${numero(b.umbral, idioma, 2)}; measured between ${numero(b.desde, idioma, 2)} and ${numero(b.hasta, idioma, 2)}`,
        "",
        "Urgency (Noul)",
        fila(
          "accuracy",
          deCuantos(u.es.exactitud, idioma),
          deCuantos(u.en.exactitud, idioma),
        ),
        fila("Brier", numero(u.es.brier, idioma), numero(u.en.brier, idioma)),
        "",
        `ES/EN parity: ${pp === null ? "no data" : `English accuracy minus Spanish accuracy is ${numero(pp, idioma, 1)} points`}; both languages choose the same in ${deCuantos(d.paridad.concordancia, idioma)} cases.`,
        `Re-execution: across ${d.reejecucion.k} identical runs the decision changes in ${deCuantos(d.reejecucion, idioma)} answers (${numero((d.reejecucion.tasa ?? 0) * 100, idioma, 2)} %); ${d.reejecucion.vectores_identicos} of ${d.reejecucion.n} distributions come out identical.`,
      ];
  return `${lineas.join("\n")}\n`;
}
