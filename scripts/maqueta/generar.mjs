// Generador de la maqueta de la Etapa de Diseño: docs/diseno/*.html es SALIDA de este script.
// Uso: `pnpm maqueta`. Entradas: scripts/maqueta/datos/ y la fecha de consulta (MAQUETA_FECHA la
// cambia; por defecto datos/consulta.json). Misma entrada ⇒ mismos bytes: sin reloj, sin azar.
// El gate tests/unit/maqueta-deriva.test.ts exige que lo versionado sea exactamente lo generado.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRUEBAS, archivoDeFicha } from "./datos/catalogo.mjs";
import { fechaDeConsulta } from "./nucleo/fecha.mjs";
import { ACTIVOS, HALLAZGOS, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "./datos/mundo.mjs";
import { activo } from "./paginas/activo.mjs";
import { catalogo } from "./paginas/catalogo.mjs";
import { brecha } from "./paginas/brecha.mjs";
import { archivoDeControl, control, controlDetalle } from "./paginas/control.mjs";
import { controles } from "./paginas/controles.mjs";
import { evidencia } from "./paginas/evidencia.mjs";
import { hallazgo } from "./paginas/hallazgo.mjs";
import { index } from "./paginas/index.mjs";
import { informe } from "./paginas/informe.mjs";
import { kit } from "./paginas/kit.mjs";
import { marcos } from "./paginas/marcos.mjs";
import { plan } from "./paginas/plan.mjs";
import { propuestas } from "./paginas/propuestas.mjs";
import { prueba } from "./paginas/prueba.mjs";
import { tablero } from "./paginas/tablero.mjs";
import { MAQUETA, salida } from "./rutas.mjs";
import { brecha as calcularBrecha } from "./nucleo/brecha.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const UMBRALES = JSON.parse(readFileSync(join(AQUI, "datos", "umbrales.json"), "utf8"));

export const PAGINAS = [
  { archivo: "index.html", generar: index },
  { archivo: "kit.html", generar: kit },
  { archivo: "tablero.html", generar: tablero },
  { archivo: "catalogo.html", generar: catalogo },
  ...PRUEBAS.map((p) => ({ archivo: archivoDeFicha(p.id), generar: prueba(p.id) })),
  { archivo: "marcos.html", generar: marcos },
  { archivo: "controles.html", generar: controles },
  { archivo: "propuestas.html", generar: propuestas },
  ...Object.keys(ACTIVOS).map((id) => ({ archivo: archivoDeActivo(id), generar: activo(id) })),
  ...Object.keys(ACTIVOS).map((id) => ({ archivo: archivoDePlan(id), generar: plan(id) })),
  { archivo: "evidencia.html", generar: evidencia },
  ...HALLAZGOS.map((h) => ({ archivo: archivoDeHallazgo(h.id), generar: hallazgo(h.id) })),
  { archivo: "brecha.html", generar: brecha },
  { archivo: "control.html", generar: control },
  // Una página por control aplicable: los que la brecha encuentra en los planes (no dependen de la fecha).
  ...calcularBrecha(fechaDeConsulta(), UMBRALES).controles.map((c) => ({ archivo: archivoDeControl(c.id), generar: controlDetalle(c.id) })),
  { archivo: "informe.html", generar: informe },
];

const destino = salida();
const contexto = {
  consulta: fechaDeConsulta(),
  umbrales: UMBRALES,
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
