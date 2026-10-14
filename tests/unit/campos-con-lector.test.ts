// @vitest-environment node
// Un campo de un contrato que nadie lee es un dato que se escribe para nada (lección de las auditorías del S3, S6, S7 y S8: «un motor
// probado no es un producto probado»). Cada campo de esta tabla tiene un lector de producción NOMBRADO; si alguien lo quita, la prueba
// falla y dice qué campo se quedó sin lector. Los campos que no tenían lector y no merecían uno se borraron del contrato.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./propuestas/ayuda.ts";

/**
 * [campo, archivo de producción que lo lee, patrón opcional]. Sin patrón vale `.campo`. Un nombre genérico (`frase`, `efecto`, `leida`) se
 * ancla a la variable que de verdad lo lee: si no, el gate lo daría por leído gracias a OTRO campo del mismo nombre en el mismo archivo.
 */
export const LECTORES: readonly (readonly [string, string, RegExp?])[] = [
  // Contrato de las propuestas (S8)
  ["veredicto_corregido_por_persona", "src/lib/propuestas/vista.ts"],
  ["efecto", "src/lib/propuestas/vista.ts", /\bd\.efecto\b/],
  ["similitud_cita", "src/engine/propuestas/verificar.ts"],
  ["leida", "src/lib/propuestas/vista.ts", /\bf\.leida\b/],
  ["latencia_total_s", "src/lib/propuestas/vista.ts"],
  ["nodos_visitados", "src/lib/propuestas/vista.ts"],
  ["marcas_de_contenido", "src/lib/propuestas/vista.ts"],
  ["marcas_de_instruccion", "src/lib/propuestas/vista.ts"],
  // Lo que una persona aporta a una corrida (RF-07.2b)
  ["aportes", "src/lib/propuestas/vista.ts"],
  ["caracteres", "src/lib/propuestas/vista.ts", /\baporte\.caracteres\b/],
  [
    "aportada.caracteres",
    "src/components/propuestas/propuestas-pantalla.tsx",
    /\bx\.aportada\.caracteres\b/,
  ],
  // La vista de los controles (S3-B11): los campos que nadie leía se borraron; estos dos los lee la pantalla
  ["sinCapaPropia", "src/components/controles/controles-pantalla.tsx"],
  ["sinContrastar", "src/components/controles/controles-pantalla.tsx"],
  // La carga y la bandeja (S6-B11, L9c)
  ["veredictoId", "src/lib/evidencia/vista-de-carga.ts"],
  ["etiquetaDeVacio", "src/components/propuestas/propuestas-pantalla.tsx"],
  ["frase", "src/components/hallazgo/hallazgo-pantalla.tsx", /\br\.frase\b/],
  ["partesDelVector", "src/components/hallazgo/hallazgo-pantalla.tsx"],
];

describe("cada campo del contrato tiene un lector de producción", () => {
  it.each(LECTORES)("«%s» lo lee %s", (campo, archivo, patron) => {
    const texto = readFileSync(`${RAIZ}/${archivo}`, "utf8");
    expect(texto, `${archivo} ya no lee «${campo}»`).toMatch(
      patron ?? new RegExp(`\\.${campo}\\b`),
    );
  });
});
