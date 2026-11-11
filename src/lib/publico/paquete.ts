// C20 · el paquete de la vitrina: la exportación pública montada en la base que CV Viva da a sus piezas (`public/piezas/<carpeta>/`,
// hoja-de-vida `src/lib/vitrina/simulaciones.ts` · `rutaDeEntrada`, leída en solo lectura). Puro y sin Node.

/** La base en que CV Viva monta la pieza. Un cambio aquí es un cambio de contrato con CV Viva. */
export const BASE_DEL_PAQUETE = "/piezas/hackguard";

/** `HACKGUARD_PAQUETE=1` en el build. Next lo inlinea en el JS del cliente (next.config.ts). */
export const modoPaquete = (): boolean => process.env.HACKGUARD_PAQUETE === "1";

/**
 * El destino de un enlace dentro del paquete: con la base y con la extensión `.html` explícita (`/piezas/hackguard/catalogo.html`,
 * la entrada es `index.html`). CV Viva sirve la pieza desde `public/` por ruta exacta: no hay URL limpias ni índice de carpeta.
 * Conserva la consulta y el ancla. Un destino que no es una ruta interna absoluta no cambia.
 */
export function hrefDelPaquete(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const m = /^([^?#]*)(.*)$/.exec(href)!;
  const ruta = m[1]!.replace(/\/+$/, "");
  return `${BASE_DEL_PAQUETE}${ruta === "" ? "/index" : ruta}.html${m[2]}`;
}
