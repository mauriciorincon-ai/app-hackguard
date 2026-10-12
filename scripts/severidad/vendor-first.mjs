#!/usr/bin/env node
// Sprint 5 (G-Plan P2) — envuelve el código de puntaje de la calculadora oficial de CVSS 4.0 sin tocar un byte.
//
// El código de FIRST (src/engine/severidad/vendor/first-c5b0d40/) asigna ~97 variables sin declararlas (`value = …`,
// `eq1 = …`): en un módulo ESM, que es estricto, eso es un ReferenceError. Este generador escribe un módulo que las
// declara con `let` arriba, pega los cinco archivos tal cual entre marcadores con su huella, y exporta lo que el motor usa.
// La lista de variables no se escribe a mano: sale de la regla `no-undef` de ESLint sobre el propio código de FIRST.
//
// Uso:  node scripts/severidad/vendor-first.mjs              escribe first.generated.js y first.generated.d.ts
//       node scripts/severidad/vendor-first.mjs --verificar  no escribe: sale con 1 si lo que hay en disco no es lo que saldría
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ESLint } from "eslint";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DIR_DEL_VENDOR = "src/engine/severidad/vendor";
const ORIGEN = "first-c5b0d40";
/** El orden en que se pegan: los datos primero, el cálculo al final (las funciones se elevan, pero así se lee de arriba abajo). */
export const ARCHIVOS_DE_FIRST = ["metrics.js", "max_severity.js", "max_composed.js", "cvss_lookup.js", "cvss_score.js"];
export const EXPORTA = ["cvss_score", "macroVector", "cvssLookup_global", "maxSeverity", "expectedMetricOrder"];
export const SALIDA_JS = `${DIR_DEL_VENDOR}/first.generated.js`;
export const SALIDA_DTS = `${DIR_DEL_VENDOR}/first.generated.d.ts`;

const sha256 = (texto) => createHash("sha256").update(texto, "utf8").digest("hex");
const leer = (ruta) => readFileSync(join(RAIZ, ruta), "utf8");

/** Lee los cinco archivos de FIRST y comprueba su huella contra VENDOR.json: si alguien los tocó, no se genera nada. */
export function leerElVendor() {
  const ficha = JSON.parse(leer(`${DIR_DEL_VENDOR}/${ORIGEN}/VENDOR.json`));
  const archivos = ARCHIVOS_DE_FIRST.map((nombre) => {
    const texto = leer(`${DIR_DEL_VENDOR}/${ORIGEN}/${nombre}`);
    const huella = sha256(texto);
    if (huella !== ficha.archivos[nombre])
      throw new Error(`${nombre} no coincide con VENDOR.json (${huella} ≠ ${ficha.archivos[nombre]}): el código de FIRST no se edita`);
    if (!texto.endsWith("\n")) throw new Error(`${nombre} no termina en salto de línea: el generador pega los archivos sin tocarlos`);
    return { nombre, texto, huella, bytes: Buffer.byteLength(texto, "utf8") };
  });
  return { commit: ficha.commit, archivos };
}

/** Las variables que el código de FIRST usa sin declarar, ordenadas: lo que `no-undef` reporta sobre los cinco archivos juntos. */
export async function variablesImplicitas(archivos) {
  const eslint = new ESLint({
    cwd: RAIZ,
    overrideConfigFile: true,
    overrideConfig: [
      { files: ["**/*.js"], languageOptions: { ecmaVersion: 2022, sourceType: "script" }, rules: { "no-undef": "error" } },
    ],
  });
  const [resultado] = await eslint.lintText(archivos.map((a) => a.texto).join("\n"), { filePath: "vendor-first.js" });
  const nombres = new Set();
  for (const mensaje of resultado.messages) {
    const m = /^'([^']+)' is not defined/.exec(mensaje.message);
    if (m === null) throw new Error(`ESLint dijo algo que el generador no entiende: ${mensaje.message}`);
    nombres.add(m[1]);
  }
  return [...nombres].sort();
}

export const marcadorDeInicio = (a) => `// >>> ${ORIGEN}/${a.nombre} · sha256 ${a.huella} · ${a.bytes} bytes`;
export const marcadorDeFin = (a) => `// <<< ${ORIGEN}/${a.nombre}`;

export async function generar() {
  const { commit, archivos } = leerElVendor();
  const variables = await variablesImplicitas(archivos);
  const cabecera = [
    "// GENERADO por scripts/severidad/vendor-first.mjs — NO SE EDITA (`pnpm severidad:vendor` lo regenera; tests/unit/severidad/vendor.test.ts lo vigila).",
    `// Envuelve, sin tocar un byte, el código de puntaje de la calculadora oficial de CVSS 4.0: FIRSTdotorg/cvss-v4-calculator@${commit}`,
    `// (BSD-2-Clause; la licencia viaja en ${ORIGEN}/LICENSE). El código de FIRST asigna variables globales sin declararlas, lo que`,
    "// en un módulo ESM (estricto) es un ReferenceError: este módulo las declara con `let` aquí arriba y no cambia nada más.",
    "// Lo único que añade son estas declaraciones, los marcadores de cada archivo y el `export` del final.",
    "",
    `let ${variables.join(", ")};`,
    "",
  ];
  const cuerpo = archivos.flatMap((a) => [marcadorDeInicio(a), a.texto.replace(/\n$/, ""), marcadorDeFin(a), ""]);
  const js = [...cabecera, ...cuerpo, `export { ${EXPORTA.join(", ")} };`, ""].join("\n");

  const dts = `// GENERADO por scripts/severidad/vendor-first.mjs — NO SE EDITA. Tipos de first.generated.js.

/** Las 32 métricas de CVSS 4.0 con su valor («X» = no definida). */
export type SeleccionDeMetricas = Readonly<Record<string, string>>;

/** \`maxSeverity\` de FIRST: distancias máximas de severidad por ecuación (+1). */
export interface DatosDeSeveridadMaxima {
  readonly eq1: Readonly<Record<number, number>>;
  readonly eq2: Readonly<Record<number, number>>;
  readonly eq3eq6: Readonly<Record<number, Readonly<Record<number, number>>>>;
  readonly eq4: Readonly<Record<number, number>>;
  readonly eq5: Readonly<Record<number, number>>;
}

export function cvss_score(
  cvssSelected: SeleccionDeMetricas,
  lookup: Readonly<Record<string, number>>,
  maxSeverityData: DatosDeSeveridadMaxima,
  macroVectorResult: string,
): number;
export function macroVector(cvssSelected: SeleccionDeMetricas): string;
export const cvssLookup_global: Readonly<Record<string, number>>;
export const maxSeverity: DatosDeSeveridadMaxima;
export const expectedMetricOrder: Readonly<Record<string, readonly string[]>>;
`;
  return { js, dts, variables, archivos };
}

/** Compara lo que hay en disco con lo que el generador escribiría. Devuelve la lista de archivos que derivaron (vacía = al día). */
export async function verificar() {
  const { js, dts } = await generar();
  const derivados = [];
  for (const [ruta, esperado] of [
    [SALIDA_JS, js],
    [SALIDA_DTS, dts],
  ]) {
    let actual = null;
    try {
      actual = leer(ruta);
    } catch {
      actual = null;
    }
    if (actual !== esperado) derivados.push(ruta);
  }
  return derivados;
}

async function principal() {
  if (process.argv.includes("--verificar")) {
    const derivados = await verificar();
    if (derivados.length > 0) {
      console.error(`Derivó del código de FIRST: ${derivados.join(", ")}. Corre \`pnpm severidad:vendor\`.`);
      process.exit(1);
    }
    console.log("El módulo generado coincide con el código de FIRST fijado.");
    return;
  }
  const { js, dts, variables, archivos } = await generar();
  writeFileSync(join(RAIZ, SALIDA_JS), js);
  writeFileSync(join(RAIZ, SALIDA_DTS), dts);
  console.log(`Escrito ${SALIDA_JS} y ${SALIDA_DTS}: ${archivos.length} archivos de FIRST pegados, ${variables.length} variables declaradas.`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
