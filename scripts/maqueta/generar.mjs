// Generador de la maqueta de la Etapa de Diseño: docs/diseno/*.html es SALIDA de este script.
// Uso: `pnpm maqueta`. Entradas: scripts/maqueta/datos/ y la fecha de consulta (MAQUETA_FECHA la
// cambia; por defecto datos/consulta.json). Misma entrada ⇒ mismos bytes: sin reloj, sin azar.
// El gate tests/unit/maqueta-deriva.test.ts exige que lo versionado sea exactamente lo generado.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRUEBAS, archivoDeFicha } from "./datos/catalogo.mjs";
import { fechaDeConsulta } from "./nucleo/fecha.mjs";
import { ACTIVOS, archivoDeActivo, archivoDePlan } from "./datos/mundo.mjs";
import { activo } from "./paginas/activo.mjs";
import { catalogo } from "./paginas/catalogo.mjs";
import { controles } from "./paginas/controles.mjs";
import { direccion } from "./paginas/direccion.mjs";
import { index } from "./paginas/index.mjs";
import { kit } from "./paginas/kit.mjs";
import { marcos } from "./paginas/marcos.mjs";
import { plan } from "./paginas/plan.mjs";
import { propuestas } from "./paginas/propuestas.mjs";
import { prueba } from "./paginas/prueba.mjs";
import { MAQUETA, salida } from "./rutas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

export const PAGINAS = [
  { archivo: "index.html", generar: index },
  { archivo: "direccion.html", generar: direccion },
  { archivo: "kit.html", generar: kit },
  { archivo: "catalogo.html", generar: catalogo },
  ...PRUEBAS.map((p) => ({ archivo: archivoDeFicha(p.id), generar: prueba(p.id) })),
  { archivo: "marcos.html", generar: marcos },
  { archivo: "controles.html", generar: controles },
  { archivo: "propuestas.html", generar: propuestas },
  ...Object.keys(ACTIVOS).map((id) => ({ archivo: archivoDeActivo(id), generar: activo(id) })),
  ...Object.keys(ACTIVOS).map((id) => ({ archivo: archivoDePlan(id), generar: plan(id) })),
];

const destino = salida();
const contexto = {
  consulta: fechaDeConsulta(),
  umbrales: JSON.parse(readFileSync(join(AQUI, "datos", "umbrales.json"), "utf8")),
  existentes: PAGINAS.map((p) => p.archivo),
};

mkdirSync(destino, { recursive: true });
for (const { archivo, generar } of PAGINAS) {
  writeFileSync(join(destino, archivo), generar(contexto));
}

if (!process.env.MAQUETA_SILENCIO) {
  const donde = destino === MAQUETA ? "docs/diseno/" : destino;
  console.log(`maqueta: ${PAGINAS.length} página(s) → ${donde} · fecha de consulta ${contexto.consulta}`);
}
