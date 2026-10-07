// La salida de los dos comandos del catálogo, en texto para una persona (en español o en inglés) y en JSON
// para una máquina (con los dos idiomas). Vive en el motor y no en el CLI para que se pruebe como todo lo
// demás: el CLI solo lee archivos, llama al motor e imprime.
import type { Estados, Simbolo } from "./esquemas.ts";
import type { ResultadoDeInstantanea } from "./instantanea.ts";
import type { Severidad } from "./reglas.ts";
import {
  desglose,
  ESTADOS_DE_VIGENCIA,
  etiquetaDe,
  type Desglose,
  type EstadoDeVigencia,
  type Semaforo,
} from "./semaforo.ts";
import type {
  EstadoDeValidacion,
  Hallazgo,
  ResultadoDeValidacion,
} from "./validar.ts";

export type Idioma = "es" | "en";

/** Códigos de salida: el estado se lee sin parsear la salida. */
export const CODIGOS_DE_SALIDA = {
  ok: 0,
  con_advertencias: 1,
  invalido: 2,
  bloqueada: 2,
  uso: 3,
} as const;

export const codigoDeValidacion = (estado: EstadoDeValidacion): number =>
  CODIGOS_DE_SALIDA[estado];

const ESTADOS: Record<EstadoDeValidacion, Record<Idioma, string>> = {
  ok: { es: "ok", en: "ok" },
  con_advertencias: { es: "con advertencias", en: "with warnings" },
  invalido: { es: "inválido", en: "invalid" },
};

// Cada severidad se distingue con un símbolo Y una palabra, nunca solo con color (regla dura 12).
const SEVERIDADES: Record<
  Severidad,
  { simbolo: string; titulo: Record<Idioma, string> }
> = {
  error: { simbolo: "✗", titulo: { es: "Errores", en: "Errors" } },
  advertencia: { simbolo: "!", titulo: { es: "Advertencias", en: "Warnings" } },
  nota: { simbolo: "·", titulo: { es: "Notas", en: "Notes" } },
};

// En la terminal, cada marca del design system tiene un carácter: el estado se lee por su forma y su
// nombre, sin color (regla dura 12).
const MARCAS: Record<Simbolo, string> = {
  ok: "✓",
  aviso: "!",
  falla: "✗",
  parcial: "◐",
  reloj: "◷",
  vacio: "○",
  no_aplica: "⊘",
  firma: "✍",
  barras0: "▁",
  barras1: "▂",
  barras2: "▃",
  barras3: "▅",
  barras4: "▇",
};

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

function lineaDeConteos(r: ResultadoDeValidacion, idioma: Idioma): string[] {
  const c = r.conteos;
  if (idioma === "es") {
    return [
      `  ${plural(c.marcos, "marco", "marcos")} · ${plural(c.equivalencias, "mapa de equivalencias", "mapas de equivalencias")} · ${plural(c.controles, "control", "controles")} · ${plural(c.herramientas, "herramienta", "herramientas")} · ${plural(c.pruebas, "prueba", "pruebas")} (${plural(c.publicables, "publicable", "publicables")}, ${plural(c.pendientes, "pendiente de revisión", "pendientes de revisión")})`,
      `  ${plural(c.errores, "error", "errores")} · ${plural(c.advertencias, "advertencia", "advertencias")} · ${plural(c.notas, "nota", "notas")}`,
    ];
  }
  return [
    `  ${plural(c.marcos, "framework", "frameworks")} · ${plural(c.equivalencias, "equivalence map", "equivalence maps")} · ${plural(c.controles, "control", "controls")} · ${plural(c.herramientas, "tool", "tools")} · ${plural(c.pruebas, "test", "tests")} (${c.publicables} publishable, ${c.pendientes} awaiting review)`,
    `  ${plural(c.errores, "error", "errors")} · ${plural(c.advertencias, "warning", "warnings")} · ${plural(c.notas, "note", "notes")}`,
  ];
}

function lineasDeHallazgo(h: Hallazgo, idioma: Idioma): string[] {
  const donde = h.campo === "" ? h.ruta : `${h.ruta} · ${h.campo}`;
  const detalle = h.detalle === null ? "" : ` — ${h.detalle[idioma]}`;
  return [
    `  ${SEVERIDADES[h.severidad].simbolo} ${donde}`,
    `      ${h.regla}: ${h.nombre[idioma]}${detalle}`,
  ];
}

/** El informe del validador para una persona. */
export function informeDeValidacion(
  r: ResultadoDeValidacion,
  idioma: Idioma,
): string {
  const titulo = idioma === "es" ? "Catálogo" : "Catalog";
  const lineas = [
    `${titulo}: ${ESTADOS[r.estado][idioma]}`,
    ...lineaDeConteos(r, idioma),
  ];
  for (const severidad of ["error", "advertencia", "nota"] as const) {
    const grupo = r.hallazgos.filter((h) => h.severidad === severidad);
    if (grupo.length === 0) continue;
    lineas.push(
      "",
      `${SEVERIDADES[severidad].titulo[idioma]} (${grupo.length})`,
    );
    for (const h of grupo) lineas.push(...lineasDeHallazgo(h, idioma));
  }
  return `${lineas.join("\n")}\n`;
}

/** El resultado del validador para una máquina: estado, código de salida, conteos y hallazgos. */
export function salidaJsonDeValidacion(r: ResultadoDeValidacion) {
  return {
    estado: r.estado,
    codigo_de_salida: codigoDeValidacion(r.estado),
    conteos: r.conteos,
    hallazgos: r.hallazgos,
  };
}

/** «✓ Vigente 36 · ! Por revisar 2»: cada estado con su marca, su nombre y su cifra; los ceros no se dibujan. */
function lineaDeDesglose(
  cuenta: Desglose,
  vocabularios: Estados["vocabularios"],
  idioma: Idioma,
): string {
  const partes = ESTADOS_DE_VIGENCIA.filter((e) => cuenta[e] > 0).map((e) => {
    const etiqueta = etiquetaDe(vocabularios, "vigencia", e);
    // El validador exige la etiqueta de cada estado de vigencia; sin ella, el id a la vista.
    return etiqueta === undefined
      ? `${e} ${cuenta[e]}`
      : `${MARCAS[etiqueta.simbolo]} ${etiqueta.nombre[idioma]} ${cuenta[e]}`;
  });
  return partes.length > 0
    ? partes.join(" · ")
    : idioma === "es"
      ? "ninguna"
      : "none";
}

function lineasDeVigencia(
  s: Semaforo,
  vocabularios: Estados["vocabularios"],
  umbrales: { por_revisar: number; vencido: number },
  idioma: Idioma,
): string[] {
  const sinPruebas = s.familias.filter((f) => f.estado === null).length;
  const familias =
    lineaDeDesglose(desglose(s.familias), vocabularios, idioma) +
    (sinPruebas === 0
      ? ""
      : idioma === "es"
        ? ` · sin pruebas publicadas ${sinPruebas}`
        : ` · no published tests ${sinPruebas}`);
  const fila = (rotulo: string, linea: string) => `    ${rotulo}: ${linea}`;
  const de = (items: readonly { estado: EstadoDeVigencia | null }[]) =>
    lineaDeDesglose(desglose(items), vocabularios, idioma);
  return idioma === "es"
    ? [
        `  vigencia (por revisar desde ${umbrales.por_revisar} días, vencido desde ${umbrales.vencido}):`,
        fila("pruebas", de(s.pruebas)),
        fila("marcos", de(s.marcos)),
        fila("herramientas", de(s.herramientas)),
        fila("familias", familias),
      ]
    : [
        `  freshness (review due from ${umbrales.por_revisar} days, overdue from ${umbrales.vencido}):`,
        fila("tests", de(s.pruebas)),
        fila("frameworks", de(s.marcos)),
        fila("tools", de(s.herramientas)),
        fila("families", familias),
      ];
}

/** El informe de `instantanea` para una persona. `ruta` es dónde quedó escrita, si se emitió. */
export function informeDeInstantanea(
  r: ResultadoDeInstantanea,
  ruta: string | null,
  idioma: Idioma,
): string {
  if (!r.emitida) {
    const errores = r.validacion.conteos.errores;
    const encabezado =
      idioma === "es"
        ? `Instantánea bloqueada: el catálogo es inválido (${plural(errores, "error", "errores")}). No se escribió nada.`
        : `Snapshot blocked: the catalog is invalid (${plural(errores, "error", "errors")}). Nothing was written.`;
    return `${encabezado}\n\n${informeDeValidacion(r.validacion, idioma)}`;
  }
  const i = r.instantanea;
  const publicadas = i.catalogo.pruebas.length;
  const lineas =
    idioma === "es"
      ? [
          `Instantánea emitida: ${ruta ?? r.archivo}`,
          `  huella: ${i.huella}`,
          `  fecha de evaluación: ${i.fecha_evaluacion}`,
          `  pruebas publicadas: ${publicadas} · pendientes de revisión: ${i.pendientes_de_revision.length} · advertencias y notas: ${i.advertencias.length}`,
        ]
      : [
          `Snapshot written: ${ruta ?? r.archivo}`,
          `  fingerprint: ${i.huella}`,
          `  evaluation date: ${i.fecha_evaluacion}`,
          `  published tests: ${publicadas} · awaiting review: ${i.pendientes_de_revision.length} · warnings and notes: ${i.advertencias.length}`,
        ];
  lineas.push(
    ...lineasDeVigencia(
      i.semaforo,
      i.catalogo.estados,
      i.catalogo.umbrales.vigencia,
      idioma,
    ),
  );
  return `${lineas.join("\n")}\n\n${informeDeValidacion(r.validacion, idioma)}`;
}

/** El resultado de `instantanea` para una máquina. */
export function salidaJsonDeInstantanea(
  r: ResultadoDeInstantanea,
  ruta: string | null,
) {
  return r.emitida
    ? {
        emitida: true,
        codigo_de_salida: CODIGOS_DE_SALIDA.ok,
        archivo: ruta ?? r.archivo,
        huella: r.instantanea.huella,
        fecha_evaluacion: r.instantanea.fecha_evaluacion,
        vigencia: {
          pruebas: desglose(r.instantanea.semaforo.pruebas),
          marcos: desglose(r.instantanea.semaforo.marcos),
          herramientas: desglose(r.instantanea.semaforo.herramientas),
          familias: desglose(r.instantanea.semaforo.familias),
        },
        validacion: salidaJsonDeValidacion(r.validacion),
      }
    : {
        emitida: false,
        codigo_de_salida: CODIGOS_DE_SALIDA.bloqueada,
        validacion: salidaJsonDeValidacion(r.validacion),
      };
}
