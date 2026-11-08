// El informe de un re-plan en texto (para la terminal) y su salida JSON. PURO: recibe lo que `replanear` calculó y lo pone en palabras, en
// los dos idiomas. No decide nada.
import type { Idioma } from "../catalogo/informe.ts";
import type { Factor, Movimiento, Replan } from "./replanear.ts";

const CAUSA: Record<Factor, Record<Idioma, string>> = {
  catalogo: { es: "catálogo", en: "catalog" },
  regla: { es: "regla de aplicabilidad", en: "applicability rule" },
  perfil: { es: "perfil del activo", en: "asset profile" },
};
const CORTO = (h: string) => h.slice(0, 12);

export interface RutasDeReplan {
  plan: string;
  paquete: string;
  archivado: { plan: string; paquete: string };
}

function linea(m: Movimiento, idioma: Idioma): string {
  const causas =
    m.causas.length === 0
      ? idioma === "es"
        ? "sin causa"
        : "no cause"
      : m.causas.map((c) => CAUSA[c][idioma]).join(" + ") +
        (m.conjunta ? (idioma === "es" ? " (conjunta)" : " (joint)") : "");
  const lugar = (p: Movimiento["antes"]) =>
    p === null ? "—" : `${p.lugar} (${p.prioridad})`;
  const controles = m.controles
    .map((c) => `${c.efecto === "gana" ? "+" : "-"}${c.control}`)
    .join(" ");
  return `  ${m.prueba}  ${causas}  ${lugar(m.antes)} → ${lugar(m.despues)}${controles === "" ? "" : `  ${controles}`}`;
}

export function informeDeReplan(
  r: Replan,
  idioma: Idioma,
  rutas: RutasDeReplan | null,
): string {
  const es = idioma === "es";
  const t = (a: string, b: string) => (es ? a : b);
  const grupos: [string, Movimiento[]][] = [
    [t("ENTRAN", "ENTER"), r.entran],
    [t("SALEN", "LEAVE"), r.salen],
    [
      t(
        "SE QUEDAN (con algo que cambió)",
        "STAY (with something that changed)",
      ),
      r.se_quedan.filter(
        (m) => m.causas.length > 0 || m.cambios.some((c) => c !== "lugar"),
      ),
    ],
  ];
  const out: string[] = [
    `${t("Re-plan de", "Re-plan of")} ${r.activo.id}`,
    `  ${t("plan anterior", "earlier plan")}  ${CORTO(r.plan.antes)} → ${CORTO(r.plan.despues)}`,
    `  ${t("activo", "asset")}  ${CORTO(r.activo.antes)} → ${CORTO(r.activo.despues)}`,
    `  ${t("catálogo", "catalog")}  ${r.instantanea.antes.fecha} ${CORTO(r.instantanea.antes.huella)} → ${r.instantanea.despues.fecha} ${CORTO(r.instantanea.despues.huella)}`,
    `  ${t("entran", "enter")} ${r.entran.length} · ${t("salen", "leave")} ${r.salen.length} · ${t("se quedan", "stay")} ${r.se_quedan.length} · ${t("siguen fuera", "stay out")} ${r.siguen_fuera}`,
  ];
  for (const [rotulo, ms] of grupos) {
    if (ms.length === 0) continue;
    out.push(
      "",
      `${rotulo} (${ms.length})`,
      ...ms.map((m) => linea(m, idioma)),
    );
  }
  if (r.controles.length > 0)
    out.push(
      "",
      t("CONTROLES DE ISO/IEC 42001", "ISO/IEC 42001 CONTROLS"),
      ...r.controles.map(
        (c) =>
          `  ${c.efecto === "gana" ? t("gana cobertura", "gains coverage") : t("pierde cobertura", "loses coverage")}  ${c.control}`,
      ),
    );
  out.push("");
  if (rutas === null)
    out.push(t("No se escribió nada.", "Nothing was written."));
  else
    out.push(
      `${t("Archivado", "Archived")}: ${rutas.archivado.plan}`,
      `${t("Archivado", "Archived")}: ${rutas.archivado.paquete}`,
      `${t("Escrito", "Written")}: ${rutas.plan}`,
      `${t("Escrito", "Written")}: ${rutas.paquete}`,
    );
  return `${out.join("\n")}\n`;
}

export const salidaJsonDeReplan = (r: Replan, rutas: RutasDeReplan | null) => ({
  replan: r,
  escrito: rutas,
});
