// Verificar una cita (U1 = 1,0; supuesto S1 del plan v2): vale si y solo si es una subcadena LITERAL del texto tras normalizar los
// espacios. Sin fuzzy, sin umbral intermedio: la cita es literal o no cuenta, y entonces decide una persona.
//
// Una cita literal puede estar en el campo equivocado (riesgo R5). Para un campo numérico, además, el número tiene que aparecer en la
// propia cita: una cita real que no contiene el valor que respalda se marca igual que una no literal (ADR-011, decisión 2).
import { sha256 } from "../huella.ts";
import type { CampoCitable, EstadoDeCita } from "./esquemas.ts";

/** Todo tramo de espacios (saltos de línea, tabuladores, espacios duros) pasa a un espacio, y se recortan los bordes. */
export const normalizarEspacios = (texto: string): string =>
  texto.replace(/\s+/gu, " ").trim();

/** La huella de un texto es la de su forma normalizada: dos copias que solo difieren en los espacios son la misma página. */
export const huellaDeTexto = (texto: string): Promise<string> =>
  sha256(normalizarEspacios(texto));

/** ¿La cita es subcadena literal del texto, tras normalizar los espacios de los dos? Una cita vacía no es literal de nada. */
export function citaEsLiteral(cita: string, texto: string): boolean {
  const c = normalizarEspacios(cita);
  return c.length > 0 && normalizarEspacios(texto).includes(c);
}

const TAMANO_DE_TRAMO = 4;

function tramos(texto: string): string[] {
  const salida: string[] = [];
  for (let i = 0; i + TAMANO_DE_TRAMO <= texto.length; i++)
    salida.push(texto.slice(i, i + TAMANO_DE_TRAMO));
  return salida;
}

/**
 * Cuánto se parece la cita al texto, de 0 a 1: 1 solo si es literal. Si no, la fracción de sus tramos de 4 caracteres que el texto
 * contiene, con tope 0,99 (todos los tramos pueden estar sin que la cita lo esté). Es un DIAGNÓSTICO para la persona y para la
 * traza (`similitud_cita`): nunca hace valer una cita que no es literal.
 */
export function similitudDeCita(cita: string, texto: string): number {
  if (citaEsLiteral(cita, texto)) return 1;
  const c = normalizarEspacios(cita);
  const propios = tramos(c);
  if (propios.length === 0) return 0;
  const delTexto = new Set(tramos(normalizarEspacios(texto)));
  const presentes = propios.filter((t) => delTexto.has(t)).length;
  return Math.min(0.99, Math.floor((presentes / propios.length) * 100) / 100);
}

/** ¿El número aparece en el texto como número entero propio (no dentro de otro número)? */
export function numeroEnElTexto(valor: number, texto: string): boolean {
  if (!Number.isInteger(valor)) return false;
  return new RegExp(`(?<![\\d])${valor}(?![\\d])`, "u").test(texto);
}

/**
 * ¿La versión aparece en el texto como una palabra propia? `v2` no está dentro de `v20` ni de `rev2`, y `2` no está dentro de `2.0`:
 * ni una letra o un dígito pegados delante, ni una letra, un dígito o `.dígito` pegados detrás (RF-07.5: el aviso de versión solo
 * vale si la versión nueva está dentro del pasaje que el código verificó).
 */
export function versionEnElTexto(version: string, texto: string): boolean {
  const v = version.trim();
  if (v.length === 0) return false;
  const escapada = v.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapada}(?![\\p{L}\\p{N}]|\\.\\p{N})`,
    "u",
  ).test(normalizarEspacios(texto));
}

/** Los campos cuyo valor es un número entero que la cita tiene que contener. */
const CAMPOS_NUMERICOS: readonly CampoCitable[] = [
  "resultado.evaluadas",
  "resultado.fallidas",
  "resultado.alertas",
];

export interface ResultadoDeCita {
  estado: EstadoDeCita;
  similitud: number;
}

/**
 * Verifica la cita de un campo contra el texto pegado. `valor` es lo que el extractor propone para el campo: si es un número, tiene
 * que estar en la cita.
 */
export function verificarCita(
  campo: CampoCitable,
  cita: string,
  valor: unknown,
  texto: string,
): ResultadoDeCita {
  const similitud = similitudDeCita(cita, texto);
  if (similitud < 1) return { estado: "no_literal", similitud };
  if (
    CAMPOS_NUMERICOS.includes(campo) &&
    typeof valor === "number" &&
    !numeroEnElTexto(valor, cita)
  )
    return { estado: "valor_sin_respaldo", similitud };
  return { estado: "verificada", similitud };
}
