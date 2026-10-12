// La salida de los comandos del libro de evidencia, en texto para una persona (español o inglés) y en JSON para una
// máquina. Vive en el motor para que se pruebe como todo lo demás: el CLI solo lee archivos, llama al motor e
// imprime. El estado se lee por símbolo Y palabra, nunca solo por color (regla dura 12).
import type { Idioma } from "../catalogo/informe.ts";
import type { SituacionDeHallazgo } from "../hallazgos/situacion.ts";
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

/** Lo que el listado muestra de cada hallazgo: su situación calculada y los nombres que el vocabulario da a su estado y su nivel. */
export interface FilaDeListadoDeHallazgo {
  situacion: SituacionDeHallazgo;
  estado: TextoBilingue;
  nivel: TextoBilingue;
}

/** La severidad en una línea: el método y lo que lo explica. */
export function detalleDeSeveridad(
  s: SituacionDeHallazgo["severidad"],
  idioma: Idioma,
): string {
  if (s.metodo === "cvss") return `CVSS 4.0 · ${s.puntaje.toFixed(1)} · ${s.vector}`;
  const es = idioma === "es";
  const cuenta = s.frecuencia.deConteo
    ? `${s.frecuencia.fallidas} ${es ? "de" : "of"} ${s.frecuencia.evaluadas}`
    : es
      ? "sin conteo: falló su única medición"
      : "no count: it failed its only measurement";
  return es
    ? `escala de IA · impacto ${s.impacto} · frecuencia ${s.frecuencia.porCiento} % (${cuenta})`
    : `AI scale · impact ${s.impacto} · frequency ${s.frecuencia.porCiento}% (${cuenta})`;
}

export function informeDeHallazgos(
  filas: readonly FilaDeListadoDeHallazgo[],
  fecha: string,
  idioma: Idioma,
): string {
  const es = idioma === "es";
  const cuentan = filas.filter((f) => f.situacion.evaluacion.cuentaComoFalla).length;
  const lineas = [
    es
      ? `Hallazgos a ${fecha}: ${filas.length} · ${cuentan} cuentan como falla de su control`
      : `Findings on ${fecha}: ${filas.length} · ${cuentan} count as a failure of their control`,
  ];
  for (const f of filas) {
    const { evaluacion: e, severidad, plazo, revision } = f.situacion;
    lineas.push(
      "",
      `${e.id} · ${f.estado[idioma]}${e.cuentaComoFalla ? (es ? " · sigue contando como falla del control" : " · still counts as a failure of its control") : ""}`,
      `  ${es ? "prueba" : "test"} ${e.prueba} · ${es ? "activo" : "asset"} ${e.activo} · ${es ? "abierto el" : "opened on"} ${e.apertura}`,
      `  ${es ? "severidad" : "severity"}: ${f.nivel[idioma]} (${detalleDeSeveridad(severidad, idioma)})`,
    );
    if (plazo.estado === "vencido")
      lineas.push(
        es
          ? `  plazo vencido: ${plazo.atraso} días de atraso (vencía el ${plazo.vence ?? "?"})`
          : `  overdue: ${plazo.atraso} days late (it was due on ${plazo.vence ?? "?"})`,
      );
    else if (plazo.estado === "en_plazo")
      lineas.push(
        es
          ? `  en plazo: vence el ${plazo.vence ?? "?"}`
          : `  on time: due on ${plazo.vence ?? "?"}`,
      );
    if (revision !== null)
      lineas.push(
        revision.estado === "toca_revisar"
          ? es
            ? `  toca revisar el riesgo aceptado (desde el ${revision.fecha})`
            : `  the accepted risk is due for review (since ${revision.fecha})`
          : es
            ? `  riesgo aceptado: se revisa el ${revision.fecha}`
            : `  accepted risk: reviewed on ${revision.fecha}`,
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

/** El JSON del listado: solo lo calculado, sin nombres del vocabulario (los navegadores deben reproducirlo bit a bit). */
export function salidaJsonDeHallazgos(
  filas: readonly Pick<FilaDeListadoDeHallazgo, "situacion">[],
  fecha: string,
) {
  return {
    fecha,
    hallazgos: filas.map(({ situacion: s }) => ({
      id: s.evaluacion.id,
      estado: s.evaluacion.estado,
      cuenta_como_falla: s.evaluacion.cuentaComoFalla,
      activo: s.evaluacion.activo,
      prueba: s.evaluacion.prueba,
      apertura: s.evaluacion.apertura,
      cierre: s.evaluacion.cierre,
      severidad: s.severidad,
      plazo: s.plazo,
      revision_del_riesgo: s.revision,
      re_pruebas: s.evaluacion.candidatas.map((c) => ({
        sobre: c.sobre.id,
        motivos: c.motivos,
      })),
      por_confirmar: s.evaluacion.porConfirmar.map((x) => x.id),
    })),
  };
}
