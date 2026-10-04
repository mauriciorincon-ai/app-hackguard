// Genera docs/diseno/assets/tokens.css y tokens.json desde scripts/paleta/tokens.mjs (OKLCH → hex).
// Uso: `pnpm tokens`. PALETA_SALIDA desvía la salida (gate de deriva de tests/unit/paleta.test.ts).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { MAQUETA } from "../maqueta/rutas.mjs";
import { linealAHex, oklchALineal } from "./color.mjs";
import { TEMAS } from "./tokens.mjs";

export function tokensHex() {
  return Object.fromEntries(
    Object.entries(TEMAS).map(([tema, tokens]) => [
      tema,
      Object.fromEntries(Object.entries(tokens).map(([nombre, lch]) => [nombre, linealAHex(oklchALineal(lch))])),
    ]),
  );
}

const bloque = (selector, tokens, esquema) =>
  `${selector} {\n${Object.entries(tokens)
    .map(([nombre, hex]) => `  --${nombre}: ${hex};`)
    .join("\n")}\n  color-scheme: ${esquema};\n}\n`;

export function tokensCss(hex) {
  return `/* GENERADO por scripts/paleta/generar-tokens.mjs desde scripts/paleta/tokens.mjs — no editar a mano
   (tests/unit/paleta.test.ts compara byte a byte). Tema por defecto: oscuro. */
${bloque(':root,\n[data-theme="oscuro"]', hex.oscuro, "dark")}
${bloque('[data-theme="claro"]', hex.claro, "light")}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const destino = process.env.PALETA_SALIDA ? resolve(process.env.PALETA_SALIDA) : join(MAQUETA, "assets");
  const hex = tokensHex();
  mkdirSync(destino, { recursive: true });
  writeFileSync(join(destino, "tokens.css"), tokensCss(hex));
  writeFileSync(join(destino, "tokens.json"), JSON.stringify(hex, null, 2) + "\n");
  if (!process.env.MAQUETA_SILENCIO) console.log(`tokens: ${Object.keys(hex.oscuro).length} por tema → ${destino}`);
}
