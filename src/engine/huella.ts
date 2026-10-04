// Huella canónica: JSON Canonicalization Scheme (RFC 8785) + SHA-256 con `crypto.subtle`. El mismo módulo
// corre en Node y en los navegadores, sin dependencias de Node, y la misma entrada da los mismos bytes en
// todos (regla dura 1). Reescrito como producto desde el RFC; el spike de la F1 solo probó que era posible.
//
// Lo que JCS deja a la implementación y aquí se decide así:
// - solo datos JSON: objetos planos, arreglos, cadenas, números finitos, booleanos y null. `undefined`,
//   funciones, `Date`, `Map` y ciclos se rechazan (lanzan), porque no tienen una forma JSON única;
// - cadenas con un surrogate solitario se rechazan (RFC 8785 § 3.2.2.2 exige I-JSON);
// - las claves se ordenan por unidades UTF-16 (§ 3.2.3), que es la comparación por defecto de JavaScript
//   sobre cadenas y no depende del idioma del sistema.

const SURROGATE_SOLITARIO =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function cadena(texto: string): string {
  if (SURROGATE_SOLITARIO.test(texto)) {
    throw new TypeError("JCS: la cadena tiene un surrogate solitario");
  }
  // JSON.stringify serializa cadenas como pide JCS (§ 3.2.2.2): escapa solo ", \ y los controles.
  return JSON.stringify(texto);
}

function numero(valor: number): string {
  if (!Number.isFinite(valor))
    throw new TypeError(`JCS: número no finito (${valor})`);
  // Number.prototype.toString de ECMAScript es la serialización que fija JCS (§ 3.2.2.3); -0 sale «0».
  return JSON.stringify(valor);
}

function esObjetoPlano(valor: object): boolean {
  const prototipo = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

function serializar(valor: unknown, ancestros: Set<object>): string {
  if (valor === null) return "null";
  switch (typeof valor) {
    case "boolean":
      return valor ? "true" : "false";
    case "number":
      return numero(valor);
    case "string":
      return cadena(valor);
    case "object":
      break;
    default:
      throw new TypeError(`JCS: valor no JSON (${typeof valor})`);
  }
  const objeto = valor as object;
  if (ancestros.has(objeto)) throw new TypeError("JCS: estructura con ciclo");
  ancestros.add(objeto);
  let salida: string;
  if (Array.isArray(objeto)) {
    salida = `[${objeto.map((v) => serializar(v, ancestros)).join(",")}]`;
  } else {
    if (!esObjetoPlano(objeto))
      throw new TypeError("JCS: solo se admiten objetos planos");
    const registro = objeto as Record<string, unknown>;
    const claves = Object.keys(registro).sort();
    salida = `{${claves.map((c) => `${cadena(c)}:${serializar(registro[c], ancestros)}`).join(",")}}`;
  }
  ancestros.delete(objeto);
  return salida;
}

/** La forma canónica JCS (RFC 8785) de un valor JSON. Lanza `TypeError` si el valor no es JSON. */
export function canonicalizar(valor: unknown): string {
  return serializar(valor, new Set());
}

/** SHA-256 en hexadecimal de los bytes UTF-8 de un texto. */
export async function sha256(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const resumen = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(resumen), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** La huella de un valor JSON: SHA-256 de su forma canónica JCS. */
export async function huella(valor: unknown): Promise<string> {
  return sha256(canonicalizar(valor));
}
