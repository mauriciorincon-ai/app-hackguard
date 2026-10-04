// Generador de la maqueta de la Etapa de Diseño: docs/diseno/*.html es SALIDA de este script.
// Uso: `pnpm maqueta`. Entradas: scripts/maqueta/datos/ y la fecha de consulta (MAQUETA_FECHA la
// cambia; por defecto datos/consulta.json). Misma entrada ⇒ mismos bytes: sin reloj, sin azar.
// El gate tests/unit/maqueta-deriva.test.ts exige que lo versionado sea exactamente lo generado.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fechaDeConsulta } from "./nucleo/fecha.mjs";
import { index } from "./paginas/index.mjs";
import { MAQUETA, salida } from "./rutas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

export const PAGINAS = [{ archivo: "index.html", generar: index }];

const destino = salida();
const contexto = {
  consulta: fechaDeConsulta(),
  umbrales: JSON.parse(readFileSync(join(AQUI, "datos", "umbrales.json"), "utf8")),
};

mkdirSync(destino, { recursive: true });
for (const { archivo, generar } of PAGINAS) {
  writeFileSync(join(destino, archivo), generar(contexto));
}

if (!process.env.MAQUETA_SILENCIO) {
  const donde = destino === MAQUETA ? "docs/diseno/" : destino;
  console.log(`maqueta: ${PAGINAS.length} página(s) → ${donde} · fecha de consulta ${contexto.consulta}`);
}
