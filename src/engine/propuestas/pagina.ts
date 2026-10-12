// De una página a su texto (lo que el investigador lee y lo que se huella): sin etiquetas, sin código ni estilos, con las entidades
// comunes resueltas y los espacios normalizados. Es una función pura de un texto a otro texto: la misma página da el mismo texto y la
// misma huella en Node y en el navegador. No interpreta la página: quita lo que no es contenido.
import { normalizarEspacios } from "./citas.ts";

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

function entidad(_: string, cuerpo: string): string {
  if (cuerpo.startsWith("#")) {
    const hex = cuerpo[1] === "x" || cuerpo[1] === "X";
    const n = Number.parseInt(cuerpo.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isInteger(n) && n > 0 && n <= 0x10ffff
      ? String.fromCodePoint(n)
      : "";
  }
  return ENTIDADES[cuerpo.toLowerCase()] ?? `&${cuerpo};`;
}

/** El texto visible de una página HTML (o el mismo texto, si ya era texto plano), con los espacios normalizados. */
export function textoDeLaPagina(html: string): string {
  const sinBloques = html
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/giu, " ")
    .replace(/<\/?[a-zA-Z][^>]*>/gu, " ");
  return normalizarEspacios(
    sinBloques.replace(/&(#?[a-zA-Z0-9]+);/gu, entidad),
  );
}
