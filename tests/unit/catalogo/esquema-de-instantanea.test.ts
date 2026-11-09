// @vitest-environment node
// Deuda del S10: una instantánea LEÍDA de disco se comprueba entera (cada sección con el esquema de su dato) antes de compararla o mostrarla.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { comprobarInstantanea } from "../../../src/engine/catalogo/esquema-de-instantanea.ts";
import { RAIZ } from "./ayuda.ts";

// Un JSON leído y mutable a propósito: la prueba lo mutila campo por campo; `any` justificado, solo aquí.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mutable = Record<string, any>;
const CARPETAS = ["datos/instantaneas", "datos/instantaneas/demo"];
const archivos = CARPETAS.flatMap((c) =>
  readdirSync(path.join(RAIZ, c))
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(RAIZ, c, f)),
);
const leer = (ruta: string): Mutable => JSON.parse(readFileSync(ruta, "utf8"));

describe("comprobarInstantanea", () => {
  it("hay instantáneas que probar", () => {
    expect(archivos.length).toBeGreaterThanOrEqual(2);
  });

  it.each(archivos.map((a) => [path.basename(a), a]))(
    "la instantánea real %s pasa tal cual y no se transforma",
    (_n, ruta) => {
      const leida = leer(ruta);
      const antes = JSON.stringify(leida);
      const resultado = comprobarInstantanea(leida, "real");
      expect(JSON.stringify(resultado)).toBe(antes);
    },
  );

  const mutilaciones: Array<[string, (i: Mutable) => void]> = [
    ["le falta la sección del catálogo", (i) => delete i.catalogo],
    ["le falta la lista de pruebas", (i) => delete i.catalogo.pruebas],
    ["las pruebas no son una lista", (i) => (i.catalogo.pruebas = "nada")],
    [
      "una prueba pierde su identificador",
      (i) => delete i.catalogo.pruebas[0].id,
    ],
    ["le falta el semáforo", (i) => delete i.semaforo],
    ["trae un campo que no existe", (i) => (i.intruso = 1)],
    [
      "la fecha de evaluación no es una fecha",
      (i) => (i.fecha_evaluacion = "ayer"),
    ],
    ["la huella no es una huella", (i) => (i.huella = "xyz")],
    [
      "un marco pierde su versión",
      (i) => delete i.catalogo.marcos[0].version_vigente,
    ],
  ];

  it.each(mutilaciones)("rechaza una instantánea a la que %s", (_n, mutar) => {
    const i = leer(archivos[0]!);
    mutar(i);
    expect(() => comprobarInstantanea(i, "mutilada.json")).toThrow(
      /mutilada\.json/,
    );
  });

  it("rechaza lo que no es un objeto", () => {
    expect(() => comprobarInstantanea(null, "nulo.json")).toThrow(/nulo\.json/);
    expect(() => comprobarInstantanea([], "lista.json")).toThrow(/lista\.json/);
  });
});
