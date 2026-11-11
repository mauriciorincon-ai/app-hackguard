// Exportador a DefectDojo (S12, D9): los hallazgos de un activo como JSON del «Generic Findings Import». Puro: sin lectura de archivos
// ni reloj (regla dura 1); la tabla de estados y las etiquetas llegan como dato (`datos/exportacion/defectdojo.json`).
// Formato fijado por su fuente, no por memoria: https://github.com/DefectDojo/django-DefectDojo/blob/3.5.100/dojo/tools/generic/json_parser.py
// (la página de documentación `generic.md` de ese tag da 404: manda el parser). La raíz es `{ "findings": [...] }`; cada hallazgo
// lleva `title`, `date`, `severity` (Info · Low · Medium · High · Critical), `description`, `active`, `verified`, `false_p`,
// `duplicate`, `out_of_scope`, `risk_accepted`, `is_mitigated`, `mitigated`, `tags`, `unique_id_from_tool`, `cvssv4`, `cvssv4_score`…
// Reglas del export:
// - **`is_mitigated` jamás sale verdadero sin una re-prueba confirmada.** `active`, `verified` e `is_mitigated` los fija la tabla
//   según el estado que CALCULÓ el ciclo; y, aparte, este módulo vuelve a comprobar el sobre de cierre (confirmado, `superada`,
//   ejecutado, de ese hallazgo, mismo activo y misma prueba): si algo no cuadra, lanza. Un reabierto sale activo;
// - cada hallazgo lleva su cadena (apertura → corrección → re-prueba → cierre, un ciclo más por reapertura), su control ISO/IEC 42001,
//   su severidad calculada y las huellas de sus sobres; **jamás el crudo, el extracto ni la nota libre de una corrección**;
// - un archivo bilingüe: el título y la descripción llevan ES y EN (el dato nace como mapa `{ es, en }`).
import { z } from "zod";
import { Texto } from "../catalogo/esquemas.ts";
import type { SobreEfectivo } from "../evidencia/esquemas.ts";
import type { CicloDeHallazgo } from "../hallazgos/ciclo.ts";
import {
  ESTADOS_DE_HALLAZGO,
  NIVELES_DE_SEVERIDAD,
  type Hallazgo,
} from "../hallazgos/esquemas.ts";
import type { SituacionDeHallazgo } from "../hallazgos/situacion.ts";

/** La versión del parser de DefectDojo contra la que se fijó el formato. */
export const VERSION_DE_DEFECTDOJO = "3.5.100";

export const SEVERIDADES_DE_DEFECTDOJO = [
  "Info",
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;
export type SeveridadDeDefectDojo = (typeof SEVERIDADES_DE_DEFECTDOJO)[number];

const Banderas = z.strictObject({
  active: z.boolean(),
  verified: z.boolean(),
  is_mitigated: z.boolean(),
  risk_accepted: z.boolean(),
});
export type Banderas = z.infer<typeof Banderas>;

/** El dato que gobierna el export: del estado del ciclo a las banderas de DefectDojo, y del nivel a su severidad. */
export const TablaDeExportacion = z.strictObject({
  version: z.string().min(1),
  nota: Texto,
  /** De dónde sale el formato (para quien audite el export). */
  fuente: z.string().min(1),
  estados: z.strictObject(
    Object.fromEntries(ESTADOS_DE_HALLAZGO.map((e) => [e, Banderas])) as Record<
      (typeof ESTADOS_DE_HALLAZGO)[number],
      typeof Banderas
    >,
  ),
  severidades: z.strictObject(
    Object.fromEntries(
      NIVELES_DE_SEVERIDAD.map((n) => [n, z.enum(SEVERIDADES_DE_DEFECTDOJO)]),
    ) as Record<
      (typeof NIVELES_DE_SEVERIDAD)[number],
      z.ZodEnum<{ [K in SeveridadDeDefectDojo]: K }>
    >,
  ),
  etiquetas: z.strictObject({
    apertura: Texto,
    correccion: Texto,
    reprueba: Texto,
    cierre_por_reprueba: Texto,
    cierre_por_eliminacion: Texto,
    cierre_no_reproducible: Texto,
    reapertura: Texto,
    aceptacion: Texto,
    control: Texto,
    sin_control: Texto,
    huellas: Texto,
    severidad: Texto,
  }),
});
export type TablaDeExportacion = z.infer<typeof TablaDeExportacion>;

// ── El formato de salida: cada campo, estricto ───────────────────────────────────────────────────

export const HallazgoDeDefectDojo = z.strictObject({
  title: z.string().min(1).max(511),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  severity: z.enum(SEVERIDADES_DE_DEFECTDOJO),
  description: z.string().min(1),
  mitigation: z.string(),
  impact: z.string().min(1),
  references: z.string().min(1),
  active: z.boolean(),
  verified: z.boolean(),
  false_p: z.literal(false),
  duplicate: z.literal(false),
  out_of_scope: z.literal(false),
  risk_accepted: z.boolean(),
  is_mitigated: z.boolean(),
  mitigated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  tags: z.array(
    z
      .string()
      .min(1)
      .regex(/^[^\s,]+$/),
  ),
  unique_id_from_tool: z.string().min(1),
  vuln_id_from_tool: z.string().min(1),
  severity_justification: z.string().min(1),
  cvssv4: z.string().min(1).optional(),
  cvssv4_score: z.number().min(0).max(10).optional(),
});
export type HallazgoDeDefectDojo = z.infer<typeof HallazgoDeDefectDojo>;

export const ExportacionDeDefectDojo = z.strictObject({
  findings: z.array(HallazgoDeDefectDojo),
});
export type ExportacionDeDefectDojo = z.infer<typeof ExportacionDeDefectDojo>;

// ── La entrada ───────────────────────────────────────────────────────────────────────────────────

export interface EntradaDeExportacion {
  hallazgo: Hallazgo;
  situacion: SituacionDeHallazgo;
  /** El libro efectivo: de ahí se vuelve a comprobar la re-prueba que cierra. */
  libro: readonly SobreEfectivo[];
  /** Los controles de la prueba (ISO/IEC 42001 y demás capas) con su nombre. */
  controles: readonly { id: string; nombre: Texto }[];
  prueba: { id: string; nombre: Texto };
  activo: { id: string; nombre: Texto };
}

/**
 * ¿Hay de verdad una re-prueba confirmada que cierre este hallazgo? Se comprueba aparte de `evaluarHallazgo` (dos llaves): el sobre
 * existe, lo confirmó una persona, es de este hallazgo, activo y prueba, se ejecutó y su veredicto es `superada`.
 */
export function reprobacionConfirmada(
  h: Hallazgo,
  activo: string,
  prueba: string,
  sobreId: string | null | undefined,
  libro: readonly SobreEfectivo[],
): SobreEfectivo | null {
  if (sobreId === null || sobreId === undefined) return null;
  const s = libro.find((x) => x.id === sobreId);
  if (s === undefined) return null;
  const ok =
    s.confirmacion !== null &&
    s.reprueba_de === h.id &&
    s.activo === activo &&
    s.prueba === prueba &&
    s.resultado.ejecutada &&
    s.veredicto === "superada";
  return ok ? s : null;
}

const enDos = (t: Texto, sufijo: string, e: "es" | "en") => `${t[e]}${sufijo}`;

function lineasDeCiclo(
  c: CicloDeHallazgo,
  tabla: TablaDeExportacion,
  libro: readonly SobreEfectivo[],
  e: "es" | "en",
): string[] {
  const t = tabla.etiquetas;
  const out: string[] = [];
  if (c.reapertura !== null) {
    const s = libro.find((x) => x.id === c.reapertura?.sobre);
    out.push(
      enDos(
        t.reapertura,
        `: ${c.reapertura.fecha} · ${c.reapertura.sobre}${s === undefined ? "" : ` · ${s.huellas.sobre}`}`,
        e,
      ),
    );
  }
  if (c.correccion !== null)
    out.push(enDos(t.correccion, `: ${c.correccion.fecha}`, e));
  for (const k of c.candidatas) {
    out.push(
      enDos(
        t.reprueba,
        `: ${k.sobre.fecha} · ${k.sobre.id} · ${k.sobre.veredicto} · ${k.sobre.huellas.sobre}`,
        e,
      ),
    );
  }
  if (c.cierre !== null) {
    const clave =
      c.cierre.tipo === "reprueba"
        ? t.cierre_por_reprueba
        : c.cierre.tipo === "eliminacion"
          ? t.cierre_por_eliminacion
          : t.cierre_no_reproducible;
    out.push(
      enDos(
        clave,
        `: ${c.cierre.fecha}${c.cierre.sobre === null ? "" : ` · ${c.cierre.sobre}`}`,
        e,
      ),
    );
  }
  return out;
}

function descripcion(
  x: EntradaDeExportacion,
  tabla: TablaDeExportacion,
  e: "es" | "en",
): string {
  const { hallazgo: h, situacion: s, libro } = x;
  const ev = s.evaluacion;
  const t = tabla.etiquetas;
  const origen = ev.sobreOrigen;
  const lineas = [
    h.descripcion[e],
    "",
    enDos(
      t.apertura,
      `: ${ev.apertura} · ${origen.id} · ${origen.veredicto} · ${origen.huellas.sobre}`,
      e,
    ),
    ...ev.ciclos.flatMap((c) => lineasDeCiclo(c, tabla, libro, e)),
    // Un cierre por declaración (eliminación, no reproducible) no es de un ciclo: sin re-prueba, y la cadena lo dice.
    ...(ev.cierre !== null && ev.cierre.tipo !== "reprueba"
      ? [
          enDos(
            ev.cierre.tipo === "eliminacion"
              ? t.cierre_por_eliminacion
              : t.cierre_no_reproducible,
            `: ${ev.cierre.fecha}`,
            e,
          ),
        ]
      : []),
  ];
  if (ev.aceptacion !== null)
    lineas.push(
      enDos(
        t.aceptacion,
        `: ${ev.aceptacion.fecha} · ${ev.aceptacion.revision_en_dias} d`,
        e,
      ),
    );
  lineas.push(
    `${t.control[e]}: ${
      x.controles.length === 0
        ? t.sin_control[e]
        : x.controles.map((c) => `${c.id} (${c.nombre[e]})`).join("; ")
    }`,
  );
  lineas.push(
    `${t.huellas[e]}: ${origen.huellas.sobre} · ${origen.huellas.resultado} · ${origen.huellas.crudo}`,
  );
  return lineas.join("\n");
}

function severidadDe(
  s: SituacionDeHallazgo["severidad"],
  tabla: TablaDeExportacion,
): string {
  const t = tabla.etiquetas.severidad;
  return s.metodo === "cvss"
    ? `${t.es} / ${t.en}: CVSS 4.0 ${s.puntaje.toFixed(1)} · ${s.vector} · ${s.referencia}`
    : `${t.es} / ${t.en}: ${s.referencia} · impacto ${s.impacto} · alcance ${s.alcance} · detectabilidad ${s.detectabilidad}`;
}

/** Un hallazgo como lo lee DefectDojo. Lanza si el estado dice «cerrado» sin una re-prueba confirmada que lo respalde. */
export function exportarHallazgo(
  x: EntradaDeExportacion,
  tabla: TablaDeExportacion,
): HallazgoDeDefectDojo {
  const { hallazgo: h, situacion: s } = x;
  const ev = s.evaluacion;
  const banderas = tabla.estados[ev.estado];
  const reprueba =
    ev.estado === "cerrado"
      ? reprobacionConfirmada(
          h,
          ev.activo,
          ev.prueba,
          ev.cierre?.sobre,
          x.libro,
        )
      : null;
  // Dos llaves: aunque la tabla dijera lo contrario, mitigado solo con la re-prueba confirmada delante.
  const mitigado = banderas.is_mitigated && reprueba !== null;
  if (banderas.is_mitigated && reprueba === null)
    throw new Error(
      `${h.id}: el estado «${ev.estado}» saldría mitigado sin una re-prueba confirmada / would be exported as mitigated without a confirmed re-test`,
    );
  if (ev.estado !== "cerrado" && banderas.is_mitigated)
    throw new Error(
      `${h.id}: solo «cerrado» puede salir mitigado / only “cerrado” can be exported as mitigated`,
    );

  const tags = [
    "hackguard",
    `hackguard:estado:${ev.estado}`,
    `hackguard:activo:${x.activo.id}`,
    `hackguard:prueba:${x.prueba.id}`,
    ...x.controles.map((c) => `control:${c.id}`),
  ];
  const lista: HallazgoDeDefectDojo = {
    title: `${h.titulo.es} / ${h.titulo.en}`.slice(0, 511),
    date: ev.apertura,
    severity: tabla.severidades[s.severidad.nivel],
    description: `${descripcion(x, tabla, "es")}\n\n---\n\n${descripcion(x, tabla, "en")}`,
    mitigation: ev.correccion === null ? "" : `${ev.correccion.fecha}`,
    impact: `${x.prueba.id} · ${x.prueba.nombre.es} / ${x.prueba.nombre.en} · ${x.activo.nombre.es} / ${x.activo.nombre.en}`,
    references: [
      ...x.controles.map((c) => c.id),
      x.prueba.id,
      ev.sobreOrigen.id,
      ...(reprueba === null ? [] : [reprueba.id]),
    ].join("\n"),
    active: banderas.active,
    verified: banderas.verified,
    false_p: false,
    duplicate: false,
    out_of_scope: false,
    risk_accepted: banderas.risk_accepted,
    is_mitigated: mitigado,
    ...(mitigado && ev.cierre !== null ? { mitigated: ev.cierre.fecha } : {}),
    tags,
    unique_id_from_tool: h.id,
    vuln_id_from_tool: ev.sobreOrigen.huellas.sobre,
    severity_justification: severidadDe(s.severidad, tabla),
    ...(s.severidad.metodo === "cvss"
      ? { cvssv4: s.severidad.vector, cvssv4_score: s.severidad.puntaje }
      : {}),
  };
  return HallazgoDeDefectDojo.parse(lista);
}

/** Los hallazgos de un activo, en orden de identificador: la misma entrada da los mismos bytes. */
export function exportarADefectDojo(
  entradas: readonly EntradaDeExportacion[],
  tabla: TablaDeExportacion,
): ExportacionDeDefectDojo {
  const findings = [...entradas]
    .sort((a, b) =>
      a.hallazgo.id < b.hallazgo.id
        ? -1
        : a.hallazgo.id > b.hallazgo.id
          ? 1
          : 0,
    )
    .map((x) => exportarHallazgo(x, tabla));
  return ExportacionDeDefectDojo.parse({ findings });
}
