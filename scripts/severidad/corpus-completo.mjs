#!/usr/bin/env node
// Sprint 5 (G-Plan P3) — el corpus COMPLETO de CVSS 4.0, a mano: los 578 860 vectores con su puntaje esperado del
// upstream de Red Hat (commit db569ba), contra el motor de HackGuard (validador estricto + calculadora de FIRST fijada).
// No corre en la CI: el corpus pesa y vive en la planeadora, solo lectura. Cada PR corre los 59 + 500 + 14 de
// tests/unit/severidad/cvss.test.ts; este script es la corrida a fondo que el cierre del sprint registra.
//
// Uso:  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/severidad/corpus-completo.mjs --datos <carpeta con vectors_*>
//
// Resultado esperado: los cinco archivos en orden coinciden al 100 % y los 100 000 de vectors_random4 se rechazan tal cual
// (vienen fuera del orden de la Tabla 23) y coinciden al 100 % una vez reordenados. Sale con 1 si algo difiere.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { puntuarCvss } from "../../src/engine/severidad/cvss.ts";
import { METRICAS_DE_CVSS } from "../../src/engine/severidad/validar-vector.ts";

const i = process.argv.indexOf("--datos");
if (i < 0 || process.argv[i + 1] === undefined) {
  console.error("Uso: corpus-completo.mjs --datos <carpeta con vectors_base4, vectors_modified4, …>");
  process.exit(3);
}
const CARPETA = process.argv[i + 1];
const EN_ORDEN = ["vectors_base4", "vectors_threat4", "vectors_security4", "vectors_supplemental4", "vectors_modified4"];
const FUERA_DE_ORDEN = "vectors_random4";

const leer = (nombre) =>
  readFileSync(join(CARPETA, nombre), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((linea) => {
      const [vector, puntaje] = linea.split(" - ");
      return [vector.trim(), Number(puntaje)];
    });

const orden = METRICAS_DE_CVSS.map(([k]) => k);
function reordenado(vector) {
  const [prefijo, ...partes] = vector.split("/");
  const clave = (p) => orden.indexOf(p.split(":")[0]);
  return [prefijo, ...partes.slice().sort((a, b) => clave(a) - clave(b))].join("/");
}

let total = 0;
let fallos = 0;
const filas = [];
const inicio = Date.now();

for (const nombre of EN_ORDEN) {
  const datos = leer(nombre);
  let iguales = 0;
  const muestras = [];
  for (const [vector, esperado] of datos) {
    const r = puntuarCvss(vector);
    if (r.ok && r.puntaje === esperado) iguales += 1;
    else if (muestras.length < 3) muestras.push({ vector, esperado, obtenido: r.ok ? r.puntaje : `${r.motivo}: ${r.detalle}` });
  }
  total += datos.length;
  fallos += datos.length - iguales;
  filas.push({ archivo: nombre, total: datos.length, iguales, como: "tal cual", muestras });
}

{
  const datos = leer(FUERA_DE_ORDEN);
  let rechazados = 0;
  let iguales = 0;
  const muestras = [];
  for (const [vector, esperado] of datos) {
    const tal = puntuarCvss(vector);
    if (!tal.ok && tal.motivo === "fuera_de_orden") rechazados += 1;
    else if (muestras.length < 3) muestras.push({ vector, problema: "no se rechazó por orden" });
    const r = puntuarCvss(reordenado(vector));
    if (r.ok && r.puntaje === esperado) iguales += 1;
    else if (muestras.length < 3) muestras.push({ vector, esperado, obtenido: r.ok ? r.puntaje : `${r.motivo}: ${r.detalle}` });
  }
  total += datos.length;
  fallos += 2 * datos.length - rechazados - iguales;
  filas.push({ archivo: `${FUERA_DE_ORDEN} (rechazados tal cual)`, total: datos.length, iguales: rechazados, como: "tal cual", muestras: [] });
  filas.push({ archivo: `${FUERA_DE_ORDEN} (reordenados)`, total: datos.length, iguales, como: "reordenado", muestras });
}

for (const f of filas) {
  console.log(`${f.archivo.padEnd(48)} ${String(f.iguales).padStart(7)} / ${String(f.total).padEnd(7)} ${f.iguales === f.total ? "ok" : "DIFIERE"}`);
  for (const m of f.muestras) console.log(`    ${JSON.stringify(m)}`);
}
console.log(`\n${total} vectores del corpus · ${fallos} diferencias · ${Date.now() - inicio} ms`);
process.exit(fallos === 0 ? 0 : 1);
