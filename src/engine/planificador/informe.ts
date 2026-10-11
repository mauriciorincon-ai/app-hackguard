// La salida de los dos comandos del planificador, en texto para una persona (español o inglés) y en JSON para
// una máquina. Vive en el motor para que se pruebe como todo lo demás: el CLI solo lee archivos, llama al motor
// e imprime. El estado se lee por símbolo Y palabra, nunca solo por color (regla dura 12).
import type { Idioma } from "../catalogo/informe.ts";
import type {
  EstadoDeValidacionDeActivos,
  HallazgoDeActivo,
  ResultadoDeValidacionDeActivos,
} from "../activos/validar.ts";
import type { ResultadoDelPlan } from "./planificar.ts";

/** Mismos códigos que el CLI del catálogo: el estado se lee sin parsear la salida. */
export const CODIGOS_DEL_PLAN = {
  ok: 0,
  con_advertencias: 1,
  invalido: 2,
  bloqueado: 2,
  uso: 3,
} as const;

export const codigoDeActivos = (e: EstadoDeValidacionDeActivos): number =>
  CODIGOS_DEL_PLAN[e];

/** Emitido sin nada que mirar → 0; emitido con marcas del filtro o pruebas sin herramienta → 1; sin autorización → 2. */
export function codigoDePlan(r: ResultadoDelPlan): number {
  if (!r.emitido) return CODIGOS_DEL_PLAN.bloqueado;
  return r.marcas.length > 0 || r.plan.resumen.sin_herramienta > 0
    ? CODIGOS_DEL_PLAN.con_advertencias
    : CODIGOS_DEL_PLAN.ok;
}

const ESTADOS: Record<EstadoDeValidacionDeActivos, Record<Idioma, string>> = {
  ok: { es: "ok", en: "ok" },
  con_advertencias: { es: "con advertencias", en: "with warnings" },
  invalido: { es: "inválido", en: "invalid" },
};

const SEVERIDADES = {
  error: { simbolo: "✗", titulo: { es: "Errores", en: "Errors" } },
  advertencia: { simbolo: "!", titulo: { es: "Advertencias", en: "Warnings" } },
  nota: { simbolo: "·", titulo: { es: "Notas", en: "Notes" } },
} as const;

function lineasDeHallazgo(h: HallazgoDeActivo, idioma: Idioma): string[] {
  const donde = h.campo === "" ? h.ruta : `${h.ruta} · ${h.campo}`;
  const lineas = [
    `  ${SEVERIDADES[h.severidad].simbolo} ${h.nombre[idioma]}`,
    `    ${donde}`,
  ];
  if (h.detalle !== null) lineas.push(`    ${h.detalle[idioma]}`);
  return lineas;
}

export function informeDeActivos(
  r: ResultadoDeValidacionDeActivos,
  idioma: Idioma,
): string {
  const autorizados = r.activos.filter((a) => a.autorizado).length;
  const lineas = [
    `${idioma === "es" ? "Activos" : "Assets"}: ${ESTADOS[r.estado][idioma]}`,
    idioma === "es"
      ? `  ${r.activos.length} válidos · ${autorizados} con alcance y reglas · ${r.activos.length - autorizados} sin autorización`
      : `  ${r.activos.length} valid · ${autorizados} with scope and rules · ${r.activos.length - autorizados} not authorized`,
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

export function salidaJsonDeActivos(r: ResultadoDeValidacionDeActivos) {
  return {
    estado: r.estado,
    codigo_de_salida: codigoDeActivos(r.estado),
    activos: r.activos.map((a) => ({
      id: a.activo.id,
      ruta: a.ruta,
      autorizado: a.autorizado,
    })),
    hallazgos: r.hallazgos,
  };
}

/** El informe de `emitir` para una persona. `rutas` son los archivos escritos, si se emitió. */
export function informeDePlan(
  r: ResultadoDelPlan,
  rutas: { plan: string; paquete: string } | null,
  idioma: Idioma,
): string {
  if (!r.emitido)
    return idioma === "es"
      ? `Sin plan: ${r.activo} no tiene alcance autorizado ni reglas de enfrentamiento, y sin ellos no hay plan.\n` +
          `  Decláralos con su dueño y vuelve a emitir. No se escribió nada.\n`
      : `No plan: ${r.activo} has no authorized scope or rules of engagement, and without them there is no plan.\n` +
          `  Have its owner declare them and issue again. Nothing was written.\n`;
  const { plan, paquete, marcas } = r;
  const s = plan.resumen;
  const lineas =
    idioma === "es"
      ? [
          `Plan emitido: ${rutas?.plan ?? plan.activo.id}`,
          `  paquete: ${rutas?.paquete ?? "(sin escribir)"}`,
          `  huella del plan: ${plan.huella}`,
          `  huella del paquete: ${paquete.huella}`,
          `  instantánea: ${plan.instantanea.fecha} · ${plan.instantanea.huella}`,
          `  fecha de emisión: ${plan.fecha_emision}`,
          `  ${s.planeadas} planeadas · ${s.excluidas} excluidas (de ${s.candidatas} candidatas; ${s.otras_familias} de otras familias no se consideran)`,
          `  controles con prueba: ${s.controles_con_prueba} · sin prueba: ${s.controles_sin_prueba} · planeadas sin control: ${s.planeadas_sin_control}`,
        ]
      : [
          `Plan issued: ${rutas?.plan ?? plan.activo.id}`,
          `  package: ${rutas?.paquete ?? "(not written)"}`,
          `  plan fingerprint: ${plan.huella}`,
          `  package fingerprint: ${paquete.huella}`,
          `  snapshot: ${plan.instantanea.fecha} · ${plan.instantanea.huella}`,
          `  issue date: ${plan.fecha_emision}`,
          `  ${s.planeadas} planned · ${s.excluidas} excluded (of ${s.candidatas} candidates; ${s.otras_familias} from other families are not considered)`,
          `  controls with a test: ${s.controles_con_prueba} · without: ${s.controles_sin_prueba} · planned with no control: ${s.planeadas_sin_control}`,
        ];
  if (s.sin_herramienta > 0)
    lineas.push(
      idioma === "es"
        ? `  ! ${s.sin_herramienta} planeadas sin herramienta: ningún entorno del activo cubre las que recomienda el catálogo`
        : `  ! ${s.sin_herramienta} planned without a tool: no environment of the asset covers the ones the catalog recommends`,
    );
  if (marcas.length > 0) {
    lineas.push(
      idioma === "es"
        ? `  ! El filtro de contenido marcó ${marcas.length} textos del dueño en el paquete; una persona los revisa:`
        : `  ! The content filter flagged ${marcas.length} owner texts in the package; a person reviews them:`,
    );
    for (const m of marcas) lineas.push(`    ${m.campo} · ${m.patron}`);
  }
  return `${lineas.join("\n")}\n`;
}

export function salidaJsonDePlan(
  r: ResultadoDelPlan,
  rutas: { plan: string; paquete: string } | null,
) {
  return r.emitido
    ? {
        emitido: true,
        codigo_de_salida: codigoDePlan(r),
        plan: rutas?.plan ?? null,
        paquete: rutas?.paquete ?? null,
        huella_del_plan: r.plan.huella,
        huella_del_paquete: r.paquete.huella,
        resumen: r.plan.resumen,
        marcas: r.marcas,
      }
    : {
        emitido: false,
        codigo_de_salida: CODIGOS_DEL_PLAN.bloqueado,
        motivo: r.motivo,
        activo: r.activo,
      };
}
