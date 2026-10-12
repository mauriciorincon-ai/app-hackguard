// La salida de los comandos del libro de evidencia, en texto para una persona (español o inglés) y en JSON para una
// máquina. Vive en el motor para que se pruebe como todo lo demás: el CLI solo lee archivos, llama al motor e
// imprime. El estado se lee por símbolo Y palabra, nunca solo por color (regla dura 12).
import type { Idioma } from "../catalogo/informe.ts";
import type { EvaluacionDeHallazgo } from "../hallazgos/ciclo.ts";
import type { PlazoDeHallazgo } from "../hallazgos/plazo.ts";
import type {
  EstadoDeValidacion,
  HallazgoDeValidacion,
  TextoBilingue,
} from "./molde.ts";

/** Mismos códigos que los otros CLI: el estado se lee sin parsear la salida. */
export const CODIGOS_DEL_LIBRO = {
  ok: 0,
  con_advertencias: 1,
  invalido: 2,
  bloqueado: 2,
  uso: 3,
} as const;

export const codigoDeValidacion = (e: EstadoDeValidacion): number =>
  CODIGOS_DEL_LIBRO[e];

const ESTADOS: Record<EstadoDeValidacion, Record<Idioma, string>> = {
  ok: { es: "ok", en: "ok" },
  con_advertencias: { es: "con advertencias", en: "with warnings" },
  invalido: { es: "inválido", en: "invalid" },
};

const SEVERIDADES = {
  error: { simbolo: "✗", titulo: { es: "Errores", en: "Errors" } },
  advertencia: { simbolo: "!", titulo: { es: "Advertencias", en: "Warnings" } },
  nota: { simbolo: "·", titulo: { es: "Notas", en: "Notes" } },
} as const;

/** Un bloque de validación: el nombre de lo validado, su estado y sus hallazgos agrupados por severidad. */
export function informeDeValidacion(
  titulo: TextoBilingue,
  estado: EstadoDeValidacion,
  cuenta: TextoBilingue,
  hallazgos: readonly HallazgoDeValidacion<string>[],
  idioma: Idioma,
): string {
  const lineas = [
    `${titulo[idioma]}: ${ESTADOS[estado][idioma]}`,
    `  ${cuenta[idioma]}`,
  ];
  for (const severidad of ["error", "advertencia", "nota"] as const) {
    const grupo = hallazgos.filter((h) => h.severidad === severidad);
    if (grupo.length === 0) continue;
    lineas.push(
      "",
      `${SEVERIDADES[severidad].titulo[idioma]} (${grupo.length})`,
    );
    for (const h of grupo) {
      lineas.push(`  ${SEVERIDADES[severidad].simbolo} ${h.nombre[idioma]}`);
      lineas.push(`    ${h.campo === "" ? h.ruta : `${h.ruta} · ${h.campo}`}`);
      if (h.detalle !== null) lineas.push(`    ${h.detalle[idioma]}`);
    }
  }
  return `${lineas.join("\n")}\n`;
}

/** Lo que el listado muestra de cada hallazgo; la severidad y el plazo los pone quien ya los calculó. */
export interface FilaDeListadoDeHallazgo {
  evaluacion: EvaluacionDeHallazgo;
  estado: TextoBilingue;
  severidad: { nivel: TextoBilingue; detalle: string } | null;
  plazo: PlazoDeHallazgo | null;
}

export function informeDeHallazgos(
  filas: readonly FilaDeListadoDeHallazgo[],
  fecha: string,
  idioma: Idioma,
): string {
  const es = idioma === "es";
  const cuentan = filas.filter((f) => f.evaluacion.cuentaComoFalla).length;
  const lineas = [
    es
      ? `Hallazgos a ${fecha}: ${filas.length} · ${cuentan} cuentan como falla de su control`
      : `Findings on ${fecha}: ${filas.length} · ${cuentan} count as a failure of their control`,
  ];
  for (const f of filas) {
    const e = f.evaluacion;
    lineas.push(
      "",
      `${e.id} · ${f.estado[idioma]}${e.cuentaComoFalla ? (es ? " · sigue contando como falla del control" : " · still counts as a failure of its control") : ""}`,
      `  ${es ? "prueba" : "test"} ${e.prueba} · ${es ? "activo" : "asset"} ${e.activo} · ${es ? "abierto el" : "opened on"} ${e.apertura}`,
    );
    if (f.severidad !== null)
      lineas.push(
        `  ${es ? "severidad" : "severity"}: ${f.severidad.nivel[idioma]} (${f.severidad.detalle})`,
      );
    if (f.plazo !== null && f.plazo.estado === "vencido")
      lineas.push(
        es
          ? `  plazo vencido: ${f.plazo.atraso} días de atraso (vencía el ${f.plazo.vence ?? "?"})`
          : `  overdue: ${f.plazo.atraso} days late (it was due on ${f.plazo.vence ?? "?"})`,
      );
    if (e.cierre !== null)
      lineas.push(
        `  ${es ? "cierre" : "closure"}: ${e.cierre.tipo}${e.cierre.sobre !== null ? ` · ${e.cierre.sobre}` : ""} · ${e.cierre.fecha}`,
      );
    for (const c of e.candidatas.filter((x) => x.motivos.length > 0))
      lineas.push(
        `  ${es ? "re-prueba" : "re-test"} ${c.sobre.id} ${es ? "no cierra" : "does not close"}: ${c.motivos.join(", ")}`,
      );
    for (const p of e.porConfirmar)
      lineas.push(
        `  ${es ? "re-prueba por confirmar" : "re-test to confirm"}: ${p.id}`,
      );
  }
  return `${lineas.join("\n")}\n`;
}

export function salidaJsonDeHallazgos(
  filas: readonly FilaDeListadoDeHallazgo[],
  fecha: string,
) {
  return {
    fecha,
    hallazgos: filas.map((f) => ({
      id: f.evaluacion.id,
      estado: f.evaluacion.estado,
      cuenta_como_falla: f.evaluacion.cuentaComoFalla,
      activo: f.evaluacion.activo,
      prueba: f.evaluacion.prueba,
      apertura: f.evaluacion.apertura,
      cierre: f.evaluacion.cierre,
      severidad: f.severidad,
      plazo: f.plazo,
      re_pruebas: f.evaluacion.candidatas.map((c) => ({
        sobre: c.sobre.id,
        motivos: c.motivos,
      })),
      por_confirmar: f.evaluacion.porConfirmar.map((s) => s.id),
    })),
  };
}
