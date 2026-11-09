// @vitest-environment node
// D1, deuda del S10 (selector): con N instantáneas hay N−1 comparaciones, cada una entre una y la que le sigue, y se generan todas en el build.
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { paresConsecutivos } from "../../../src/engine/catalogo/pares.ts";
import {
  cargarInstantaneaDemo,
  cargarInstantaneaOficial,
  cargarSecuenciaDeInstantaneas,
} from "../../../src/lib/catalogo/cargar-instantanea.ts";
import { RAIZ } from "./ayuda.ts";

describe("paresConsecutivos", () => {
  it("N elementos dan N−1 pares, cada uno con el que le sigue, en orden", () => {
    expect(paresConsecutivos(["a", "b", "c", "d"])).toEqual([
      { de: "a", a: "b" },
      { de: "b", a: "c" },
      { de: "c", a: "d" },
    ]);
  });
  it("con uno o ninguno no hay con qué comparar", () => {
    expect(paresConsecutivos(["a"])).toEqual([]);
    expect(paresConsecutivos([])).toEqual([]);
  });
  it("escala: 50 instantáneas, 49 pares, ninguno repetido ni saltado", () => {
    const n = Array.from({ length: 50 }, (_, i) => i);
    const pares = paresConsecutivos(n);
    expect(pares).toHaveLength(49);
    expect(pares.every((p, i) => p.de === i && p.a === i + 1)).toBe(true);
  });
  it("no toca la secuencia que recibe", () => {
    const s = Object.freeze(["a", "b", "c"]);
    expect(() => paresConsecutivos(s)).not.toThrow();
  });
});

describe("cargarSecuenciaDeInstantaneas", () => {
  const temporales: string[] = [];
  afterAll(() =>
    temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
  );

  it("las oficiales por fecha y detrás las demo, las demo rotuladas como tales", async () => {
    const s = await cargarSecuenciaDeInstantaneas(RAIZ);
    const oficial = await cargarInstantaneaOficial(RAIZ);
    const demo = (await cargarInstantaneaDemo(RAIZ))!;
    expect(s.map((x) => [x.nombre, x.demo])).toEqual([
      [oficial.nombre, false],
      [demo.nombre, true],
    ]);
    expect(paresConsecutivos(s)).toHaveLength(1);
  });

  it("sin carpeta demo es solo la oficial, y no hay pares", async () => {
    const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-secuencia-"));
    temporales.push(raiz);
    cpSync(
      path.join(RAIZ, "datos/instantaneas"),
      path.join(raiz, "datos/instantaneas"),
      { recursive: true, filter: (o) => !o.includes(`${path.sep}demo`) },
    );
    const s = await cargarSecuenciaDeInstantaneas(raiz);
    expect(s).toHaveLength(1);
    expect(s[0]!.demo).toBe(false);
    expect(paresConsecutivos(s)).toEqual([]);
  });
});
