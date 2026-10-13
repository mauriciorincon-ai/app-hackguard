// @vitest-environment node
// Un campo de un contrato que nadie lee es un dato que se escribe para nada (lección de las auditorías del S3, S6, S7 y S8: «un motor
// probado no es un producto probado»). Cada campo de esta tabla tiene un lector de producción NOMBRADO; si alguien lo quita, la prueba
// falla y dice qué campo se quedó sin lector. Los campos que no tenían lector y no merecían uno se borraron del contrato.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./propuestas/ayuda.ts";

/** [campo, archivo de producción que lo lee con `.campo`]. */
export const LECTORES: readonly (readonly [string, string])[] = [
  // Contrato de las propuestas (S8)
  ["veredicto_corregido_por_persona", "src/lib/propuestas/vista.ts"],
  ["efecto", "src/lib/propuestas/vista.ts"],
  ["similitud_cita", "src/engine/propuestas/verificar.ts"],
  ["leida", "src/lib/propuestas/vista.ts"],
  ["latencia_total_s", "src/lib/propuestas/vista.ts"],
  ["nodos_visitados", "src/lib/propuestas/vista.ts"],
  ["marcas_de_contenido", "src/lib/propuestas/vista.ts"],
  ["marcas_de_instruccion", "src/lib/propuestas/vista.ts"],
  // Lo que una persona aporta a una corrida (RF-07.2b)
  ["aportes", "src/lib/propuestas/vista.ts"],
];

describe("cada campo del contrato tiene un lector de producción", () => {
  it.each(LECTORES)("«%s» lo lee %s", (campo, archivo) => {
    const texto = readFileSync(`${RAIZ}/${archivo}`, "utf8");
    expect(texto, `${archivo} ya no lee «${campo}»`).toMatch(
      new RegExp(`\\.${campo}\\b`),
    );
  });
});
