// La salida de `catalogo diferencias` para una persona, en español o en inglés. Una línea por movimiento, y debajo de cada «cambia»
// el campo, la regla del validador que lo cuida y las dos huellas. Un campo oculto por licencia dice «texto no mostrado», nunca el texto.
import type { DiferenciasEntreInstantaneas } from "./diferencias.ts";
import { nombreDeRegla } from "./diferencias.ts";
import type { Idioma } from "./informe.ts";

const TIPO = {
  entra: { es: "ENTRA", en: "ENTERS" },
  sale: { es: "SALE", en: "LEAVES" },
  cambia: { es: "CAMBIA", en: "CHANGES" },
} as const;

const corto = (h: string | null) => (h === null ? "—" : h.slice(0, 12));

export function informeDeDiferencias(
  d: DiferenciasEntreInstantaneas,
  idioma: Idioma,
): string {
  const t = (es: string, en: string) => (idioma === "es" ? es : en);
  const lineas: string[] = [
    t(
      `De la instantánea ${d.de.fecha} (${corto(d.de.huella)}) a la ${d.a.fecha} (${corto(d.a.huella)})`,
      `From snapshot ${d.de.fecha} (${corto(d.de.huella)}) to ${d.a.fecha} (${corto(d.a.huella)})`,
    ),
    t(
      `${d.resumen.entra} entran · ${d.resumen.sale} salen · ${d.resumen.cambia} cambian`,
      `${d.resumen.entra} enter · ${d.resumen.sale} leave · ${d.resumen.cambia} change`,
    ),
  ];
  for (const m of d.movimientos) {
    lineas.push(
      `${TIPO[m.tipo][idioma]}  ${m.seccion}/${m.id}  ${corto(m.huella_antes)} → ${corto(m.huella_despues)}`,
    );
    for (const c of m.campos)
      lineas.push(
        `    ${c.campo}  [${c.regla}: ${nombreDeRegla(c.regla)[idioma]}]` +
          (c.oculto ? `  (${t("texto no mostrado", "text not shown")})` : ""),
      );
  }
  lineas.push(t(`huella: ${d.huella}`, `fingerprint: ${d.huella}`));
  return `${lineas.join("\n")}\n`;
}
