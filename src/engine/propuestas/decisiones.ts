// El libro de decisiones y lo que cada decisión provoca (plan v2, D4; ADR-011). Es de SOLO AGREGAR: una decisión no se edita ni se borra.
// Aprobar un sobre no lo confirma: crea un sobre por confirmar (ADR-008, formato intacto) con solo los valores cuya cita verificó el
// código o que la persona corrigió a mano; aprobar una prueba la deja `aprobada` para la próxima instantánea. Puro: sin archivos.
import { huellaDeRevision } from "../catalogo/validar.ts";
import type { Prueba } from "../catalogo/esquemas.ts";
import { calcularVeredicto } from "../evidencia/veredicto.ts";
import type { Resultado, Veredicto } from "../evidencia/esquemas.ts";
import type { EntradaDeRegistro } from "../evidencia/registro.ts";
import type {
  CampoCitable,
  CandidataSellada,
  Decision,
  MotivoDePausa,
  PropuestaSellada,
  Senales,
} from "./esquemas.ts";
import { resultadoVerificado, type ReglaDeLaPrueba } from "./veredicto.ts";

type Sobre = Extract<PropuestaSellada, { tipo: "sobre" }>;
type PruebaNueva = Extract<PropuestaSellada, { tipo: "prueba_nueva" }>;

export type EstadoDeBandeja =
  "por_decidir" | "aprobada" | "rechazada" | "separada";

export interface FilaDeBandeja {
  propuesta: PropuestaSellada;
  estado: EstadoDeBandeja;
  decision: Decision | null;
}

const MOTIVOS_QUE_HEREDA_UNA_HIJA: readonly MotivoDePausa[] = [
  "instruccion_marcada",
  "contenido_marcado",
  "texto_sin_lectura",
];

/**
 * Las hijas de una propuesta que mezcla resultados de varias pruebas: una por candidata, con su propia verificación y su propio
 * veredicto (que la regla ya calculó al sellar). Un sobre cuenta para una sola prueba, así que se separa antes de aprobar.
 */
export function hijasDe(p: Sobre): PropuestaSellada[] {
  if (p.asociacion !== "mezcla") return [];
  return p.candidatas.map((candidata, n) => {
    const sinVerificar = candidata.verificacion.citas.filter(
      (c) => c.estado !== "verificada",
    ).length;
    const heredados = (p.pausa?.motivos ?? []).filter((m) =>
      MOTIVOS_QUE_HEREDA_UNA_HIJA.includes(m.motivo),
    );
    const propios: NonNullable<PropuestaSellada["pausa"]>["motivos"] = [];
    if (sinVerificar > 0)
      propios.push({
        motivo: "cita_no_verificada",
        senal: "citas_sin_verificar",
        umbral: 0,
      });
    if (!candidata.verificacion.en_el_plan)
      propios.push({
        motivo: "prueba_fuera_del_plan",
        senal: "plan",
        umbral: null,
      });
    else if (candidata.veredicto_sugerido === null)
      propios.push({
        motivo: "sin_conteos_verificados",
        senal: "veredicto_por_regla",
        umbral: null,
      });
    const motivos = [...heredados, ...propios];
    const senales: Senales = {
      ...p.senales,
      citas_sin_verificar: sinVerificar,
      similitud_cita:
        candidata.verificacion.citas.length === 0
          ? null
          : Math.min(...candidata.verificacion.citas.map((c) => c.similitud)),
      pausa_humana: motivos.length > 0,
      nodos_visitados: [
        ...p.senales.nodos_visitados.filter((x) => x !== "pausa_humana"),
        ...(motivos.length > 0 ? ["pausa_humana"] : []),
      ],
    };
    return {
      ...p,
      id: `${p.id}.${n + 1}`,
      asociacion: "una" as const,
      candidatas: [candidata],
      senales,
      pausa:
        motivos.length === 0
          ? null
          : {
              motivos,
              marca_instruccion: p.senales.marca_instruccion,
              veredicto_sugerido: candidata.veredicto_sugerido,
            },
    };
  });
}

/** La bandeja: cada propuesta con su estado según el libro; una separada deja su lugar a sus hijas, que también esperan decisión. */
export function bandeja(
  propuestas: readonly PropuestaSellada[],
  decisiones: readonly Decision[],
): FilaDeBandeja[] {
  const decisionDe = (id: string): Decision | null =>
    [...decisiones].reverse().find((d) => d.propuesta === id) ?? null;
  const filas: FilaDeBandeja[] = [];
  for (const propuesta of propuestas) {
    const d = decisionDe(propuesta.id);
    const estado: EstadoDeBandeja =
      d === null
        ? "por_decidir"
        : d.decision === "rechazar"
          ? "rechazada"
          : d.decision === "separar"
            ? "separada"
            : "aprobada";
    filas.push({ propuesta, estado, decision: d });
    if (propuesta.tipo === "sobre" && estado === "separada") {
      for (const hija of hijasDe(propuesta)) {
        const dh = decisionDe(hija.id);
        filas.push({
          propuesta: hija,
          estado:
            dh === null
              ? "por_decidir"
              : dh.decision === "rechazar"
                ? "rechazada"
                : "aprobada",
          decision: dh,
        });
      }
    }
  }
  return filas;
}

/** Cuántas propuestas esperan una decisión. UNA cuenta: la bandeja, el tablero y la barra lateral leen esta (design-system § 9). */
export const porDecidir = (
  propuestas: readonly PropuestaSellada[],
  decisiones: readonly Decision[],
): number =>
  bandeja(propuestas, decisiones).filter((f) => f.estado === "por_decidir")
    .length;

export interface ProblemaDeDecision {
  regla:
    | "decision/propuesta-desconocida"
    | "decision/repetida"
    | "decision/rechazo-sin-motivo"
    | "decision/marcada-sin-revision"
    | "decision/mezcla-sin-separar"
    | "decision/separar-no-aplica"
    | "decision/hijas-no-coinciden"
    | "decision/alternativa-sin-elegir"
    | "decision/prueba-no-es-candidata";
  propuesta: string;
  detalle: string;
}

/** Valida el libro entero contra las propuestas selladas. Una lista vacía es un libro coherente. */
export function validarDecisiones(
  propuestas: readonly PropuestaSellada[],
  decisiones: readonly Decision[],
): ProblemaDeDecision[] {
  const problemas: ProblemaDeDecision[] = [];
  const conocidas = new Map<string, PropuestaSellada>();
  for (const p of propuestas) {
    conocidas.set(p.id, p);
    if (p.tipo === "sobre") for (const h of hijasDe(p)) conocidas.set(h.id, h);
  }
  const vistas = new Set<string>();
  for (const d of decisiones) {
    const mal = (regla: ProblemaDeDecision["regla"], detalle: string) =>
      problemas.push({ regla, propuesta: d.propuesta, detalle });
    const p = conocidas.get(d.propuesta);
    if (p === undefined) {
      mal("decision/propuesta-desconocida", "no está en ninguna corrida");
      continue;
    }
    if (vistas.has(d.propuesta))
      mal("decision/repetida", "ya tiene una decisión");
    vistas.add(d.propuesta);
    if (d.decision === "rechazar") {
      if (d.motivo === undefined || d.motivo.trim() === "")
        mal("decision/rechazo-sin-motivo", "rechazar exige un motivo");
      continue;
    }
    const sobre = p.tipo === "sobre" ? p : null;
    if (d.decision === "separar") {
      if (sobre === null || sobre.asociacion !== "mezcla")
        mal(
          "decision/separar-no-aplica",
          "solo se separa un texto que mezcla pruebas",
        );
      else if (
        JSON.stringify(d.hijas ?? []) !==
        JSON.stringify(hijasDe(sobre).map((h) => h.id))
      )
        mal(
          "decision/hijas-no-coinciden",
          "las hijas deben ser una por candidata, en orden",
        );
      continue;
    }
    if (sobre?.asociacion === "mezcla")
      mal(
        "decision/mezcla-sin-separar",
        "un sobre cuenta para una sola prueba: sepáralo antes de aprobar",
      );
    if (
      d.decision === "aprobar" &&
      (p.contenido === "marcada_para_revision" || p.senales.marca_instruccion)
    )
      mal(
        "decision/marcada-sin-revision",
        "tiene una marca: apruébala con «aprobar_tras_revisar»",
      );
    if (sobre?.asociacion === "alternativas") {
      if (d.prueba === undefined)
        mal(
          "decision/alternativa-sin-elegir",
          "elige una de las pruebas candidatas",
        );
      else if (!sobre.candidatas.some((c) => c.prueba === d.prueba))
        mal("decision/prueba-no-es-candidata", d.prueba);
    }
  }
  return problemas;
}

/** `veredicto_corregido_por_persona` de una propuesta: `null` hasta que se decide; después, lo que dijo la decisión. */
export function senalesConDecision(
  senales: Senales,
  decision: Decision | null,
): Senales {
  return decision === null
    ? senales
    : {
        ...senales,
        veredicto_corregido_por_persona:
          decision.veredicto_corregido_por_persona ?? false,
      };
}

// ── Lo que aprobar provoca ────────────────────────────────────────────────────────────────────────

export interface CorreccionDeConteos {
  evaluadas?: number;
  fallidas?: number;
  alertas?: number;
}

export type SobreDeUnaAprobacion =
  | {
      ok: true;
      candidata: CandidataSellada;
      entrada: EntradaDeRegistro;
      veredicto_sugerido: Veredicto | null;
      veredicto_resultante: Veredicto;
      /** La persona corrigió el veredicto que había calculado la regla (R5). */
      corregido: boolean;
    }
  | {
      ok: false;
      motivo: "sin_conteos_verificados" | "sin_candidata" | "sin_veredicto";
    };

/**
 * El sobre por confirmar que nace de aprobar una propuesta del extractor. Lleva SOLO los valores con cita verificada, más los conteos
 * que la persona corrigió a mano. El veredicto sale de la regla de la prueba; si difiere del sugerido, quedó corregido por una persona.
 */
export function sobreDeUnaAprobacion(
  p: Sobre,
  d: Pick<Decision, "por" | "prueba">,
  correcciones: CorreccionDeConteos,
  reglas: ReadonlyMap<string, ReglaDeLaPrueba>,
): SobreDeUnaAprobacion {
  const candidata =
    p.asociacion === "alternativas"
      ? p.candidatas.find((c) => c.prueba === d.prueba)
      : p.candidatas[0];
  if (candidata === undefined) return { ok: false, motivo: "sin_candidata" };
  const verificado = resultadoVerificado(
    candidata,
    candidata.verificacion.citas,
  );
  const hayCorreccion = Object.values(correcciones).some(
    (v) => v !== undefined,
  );
  if (verificado === null && !hayCorreccion)
    return { ok: false, motivo: "sin_conteos_verificados" };
  const base: Resultado = verificado?.resultado ?? {
    ejecutada: true,
    evaluadas: null,
    fallidas: null,
    alertas: null,
    metrica: null,
  };
  const resultado: Resultado = {
    ...base,
    ejecutada: base.ejecutada || hayCorreccion,
    evaluadas: correcciones.evaluadas ?? base.evaluadas,
    fallidas: correcciones.fallidas ?? base.fallidas,
    alertas: correcciones.alertas ?? base.alertas,
  };
  const regla = reglas.get(candidata.prueba);
  const calculo =
    regla === undefined
      ? null
      : calcularVeredicto(regla.regla, resultado, regla.k);
  if (calculo?.tipo !== "calculado")
    return { ok: false, motivo: "sin_veredicto" };
  const sugerido = candidata.veredicto_sugerido?.veredicto ?? null;
  const ejecutadoPor = candidata.entrada.ejecutado_por;
  const advertencias: EntradaDeRegistro["advertencias"] = [
    {
      es: `Propuesto por el extractor en ${p.id}; huella del texto pegado ${p.texto.huella.slice(0, 12)}…. Los valores salen de citas literales que el código verificó.`,
      en: `Proposed by the extractor in ${p.id}; fingerprint of the pasted text ${p.texto.huella.slice(0, 12)}…. The values come from literal quotes that the code verified.`,
    },
  ];
  if (ejecutadoPor === undefined)
    advertencias.push({
      es: "Quién ejecutó la herramienta no consta en el texto: se registra a quien aprobó la propuesta.",
      en: "Who ran the tool is not in the text: the person who approved the proposal is recorded.",
    });
  // Lo que ninguna cita verificada respalda no entra al sobre en silencio: la persona que lo confirma lo ve (R5).
  const citaVerificada = (campo: CampoCitable) =>
    candidata.verificacion.citas.some(
      (c) => c.campo === campo && c.estado === "verificada",
    );
  if (!citaVerificada("fecha"))
    advertencias.push({
      es: "La fecha de la ejecución no tiene una cita verificada en el texto: confírmala antes de confirmar el sobre.",
      en: "The run date has no verified quote in the text: check it before confirming the envelope.",
    });
  if (!citaVerificada("herramienta.version"))
    advertencias.push({
      es: "La versión de la herramienta no tiene una cita verificada en el texto: confírmala antes de confirmar el sobre.",
      en: "The tool version has no verified quote in the text: check it before confirming the envelope.",
    });
  advertencias.push({
    es: "La zona horaria no se cita del texto: la propuso el extractor; confírmala antes de confirmar el sobre.",
    en: "The time zone is not quoted from the text: the extractor proposed it; check it before confirming the envelope.",
  });
  if (hayCorreccion)
    advertencias.push({
      es: "La persona que aprobó corrigió a mano los conteos que propuso el extractor.",
      en: "The person who approved corrected by hand the counts the extractor proposed.",
    });
  return {
    ok: true,
    candidata,
    entrada: {
      activo: p.activo,
      prueba: candidata.prueba,
      herramienta: candidata.entrada.herramienta,
      fecha: candidata.entrada.fecha,
      zona_horaria: candidata.entrada.zona_horaria,
      ejecutado_por: ejecutadoPor ?? d.por,
      resultado,
      extracto_redactado: p.texto.extracto,
      advertencias,
    },
    veredicto_sugerido: sugerido,
    veredicto_resultante: calculo.veredicto,
    corregido: sugerido !== null && sugerido !== calculo.veredicto,
  };
}

/**
 * La prueba nueva aprobada: pasa de `propuesta` a `aprobada` y entra al catálogo en la próxima instantánea. Si una persona la revisó
 * (porque el filtro la marcó), queda registrada la revisión con la huella del contenido que vio (hard rule 3; ADR-002).
 */
export async function pruebaAprobada(
  p: PruebaNueva,
  d: Pick<Decision, "decision" | "por" | "fecha">,
): Promise<Prueba> {
  const aprobada: Prueba = { ...p.prueba, estado_aprobacion: "aprobada" };
  if (d.decision !== "aprobar_tras_revisar")
    return { ...aprobada, revision_contenido: "limpia" };
  const revisada: Prueba = {
    ...aprobada,
    revision_contenido: "revisada_y_aprobada",
  };
  return {
    ...revisada,
    revision: {
      fecha: d.fecha,
      por: d.por,
      decision: {
        es: `Aprobada tras revisión desde la propuesta ${p.id}.`,
        en: `Approved after review from proposal ${p.id}.`,
      },
      huella: await huellaDeRevision(revisada),
    },
  };
}
