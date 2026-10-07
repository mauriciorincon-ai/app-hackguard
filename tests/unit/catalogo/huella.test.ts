// @vitest-environment node
// Huella JCS (RFC 8785) + SHA-256. Los vectores salen del texto del RFC (rfc-editor.org, consultado el
// 2026-10-04): la muestra de § 3.2.2, su forma canónica de § 3.2.3 y sus bytes UTF-8 de § 3.2.4, el orden
// de claves de § 3.2.3 y la tabla de números del Apéndice B.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalizar, huella, sha256 } from "../../../src/engine/huella.ts";

// Las dos muestras viven en archivos de texto, copiadas del RFC con sus escapes tal cual: escritas dentro
// de este archivo, una herramienta de edición los convirtió en caracteres y la muestra dejó de ser la del RFC.
const fixture = (nombre: string) =>
  readFileSync(new URL(`./rfc8785/${nombre}`, import.meta.url), "utf8");
const MUESTRA_3_2_2 = fixture("3.2.2-muestra.json.txt");
const ORDEN_3_2_3 = fixture("3.2.3-orden.json.txt");
const BYTES_3_2_4 = `
  7b 22 6c 69 74 65 72 61 6c 73 22 3a 5b 6e 75 6c 6c 2c 74 72
  75 65 2c 66 61 6c 73 65 5d 2c 22 6e 75 6d 62 65 72 73 22 3a
  5b 33 33 33 33 33 33 33 33 33 2e 33 33 33 33 33 33 33 2c 31
  65 2b 33 30 2c 34 2e 35 2c 30 2e 30 30 32 2c 31 65 2d 32 37
  5d 2c 22 73 74 72 69 6e 67 22 3a 22 e2 82 ac 24 5c 75 30 30
  30 66 5c 6e 41 27 42 5c 22 5c 5c 5c 5c 5c 22 2f 22 7d`;

// Apéndice B: representación IEEE 754 en hexadecimal → serialización JSON.
const NUMEROS: [string, string][] = [
  ["0000000000000000", "0"],
  ["8000000000000000", "0"],
  ["0000000000000001", "5e-324"],
  ["8000000000000001", "-5e-324"],
  ["7fefffffffffffff", "1.7976931348623157e+308"],
  ["ffefffffffffffff", "-1.7976931348623157e+308"],
  ["4340000000000000", "9007199254740992"],
  ["c340000000000000", "-9007199254740992"],
  ["4430000000000000", "295147905179352830000"],
  ["44b52d02c7e14af5", "9.999999999999997e+22"],
  ["44b52d02c7e14af6", "1e+23"],
  ["44b52d02c7e14af7", "1.0000000000000001e+23"],
  ["444b1ae4d6e2ef4e", "999999999999999700000"],
  ["444b1ae4d6e2ef4f", "999999999999999900000"],
  ["444b1ae4d6e2ef50", "1e+21"],
  ["3eb0c6f7a0b5ed8c", "9.999999999999997e-7"],
  ["3eb0c6f7a0b5ed8d", "0.000001"],
  ["41b3de4355555553", "333333333.3333332"],
  ["41b3de4355555554", "333333333.33333325"],
  ["41b3de4355555555", "333333333.3333333"],
  ["41b3de4355555556", "333333333.3333334"],
  ["41b3de4355555557", "333333333.33333343"],
  ["becbf647612f3696", "-0.0000033333333333333333"],
  ["43143ff3c1cb0959", "1424953923781206.2"],
];

function desdeIeee754(hex: string): number {
  const vista = new DataView(new ArrayBuffer(8));
  vista.setBigUint64(0, BigInt(`0x${hex}`));
  return vista.getFloat64(0);
}

describe("canonicalizar (JCS, RFC 8785)", () => {
  it("la muestra de § 3.2.2 da exactamente los bytes UTF-8 de § 3.2.4", () => {
    const esperados = BYTES_3_2_4.trim().split(/\s+/).join("");
    const obtenidos = Buffer.from(
      canonicalizar(JSON.parse(MUESTRA_3_2_2)),
      "utf8",
    ).toString("hex");
    expect(obtenidos).toBe(esperados);
  });

  it("y esa forma canónica empieza como la que imprime § 3.2.3", () => {
    expect(canonicalizar(JSON.parse(MUESTRA_3_2_2))).toMatch(
      /^\{"literals":\[null,true,false\],"numbers":\[333333333\.3333333,1e\+30,4\.5,0\.002,1e-27\],"string":"/,
    );
  });

  it("ordena las claves por unidades UTF-16 (§ 3.2.3)", () => {
    const entrada = JSON.parse(ORDEN_3_2_3) as Record<string, string>;
    const claves = canonicalizar(entrada)
      .match(/:"[^"]+"/g)
      ?.map((s) => s.slice(2, -1));
    expect(claves).toEqual([
      "Carriage Return",
      "One",
      "Control",
      "Latin Small Letter O With Diaeresis",
      "Euro Sign",
      "Emoji: Grinning Face",
      "Hebrew Letter Dalet With Dagesh",
    ]);
  });

  it.each(NUMEROS)("número %s → %s (Apéndice B)", (hex, esperado) => {
    expect(canonicalizar(desdeIeee754(hex))).toBe(esperado);
  });

  it.each([
    ["NaN", desdeIeee754("7fffffffffffffff")],
    ["Infinity", desdeIeee754("7ff0000000000000")],
    ["-Infinity", -Infinity],
  ])("rechaza %s (Apéndice B, nota 3)", (_, valor) => {
    expect(() => canonicalizar(valor)).toThrow(/no finito/);
  });

  it("ordena recursivamente y respeta el orden de los arreglos", () => {
    expect(
      canonicalizar({ b: [3, { z: 1, a: 2 }], a: { y: null, x: true } }),
    ).toBe('{"a":{"x":true,"y":null},"b":[3,{"a":2,"z":1}]}');
  });

  it("no depende del orden en que se insertaron las claves", () => {
    expect(canonicalizar({ a: 1, b: 2, c: { d: 3, e: 4 } })).toBe(
      canonicalizar({ c: { e: 4, d: 3 }, b: 2, a: 1 }),
    );
  });

  it.each([
    ["un surrogate alto solitario", "a\uD800b"],
    ["un surrogate bajo solitario", "a\uDC00b"],
    ["un surrogate alto al final", "fin\uD83D"],
  ])("rechaza %s, también como clave", (_, texto) => {
    expect(() => canonicalizar(texto)).toThrow(/surrogate/);
    expect(() => canonicalizar({ [texto]: 1 })).toThrow(/surrogate/);
  });

  it("acepta un par de surrogates válido", () => {
    expect(canonicalizar("😀")).toBe('"😀"');
  });

  it.each([
    ["undefined", undefined],
    ["una función", () => 1],
    ["un bigint", BigInt(1)],
    ["un símbolo", Symbol("x")],
  ])("rechaza %s", (_, valor) => {
    expect(() => canonicalizar(valor)).toThrow(/valor no JSON/);
  });

  it("rechaza undefined dentro de un objeto o un arreglo", () => {
    expect(() => canonicalizar({ a: undefined })).toThrow(/valor no JSON/);
    expect(() => canonicalizar([1, undefined])).toThrow(/valor no JSON/);
  });

  it("rechaza objetos que no son planos", () => {
    expect(() => canonicalizar(new Map())).toThrow(/objetos planos/);
    expect(() => canonicalizar({ cuando: new Uint8Array(1) })).toThrow(
      /objetos planos/,
    );
  });

  it("acepta objetos sin prototipo", () => {
    const sinPrototipo = Object.create(null) as Record<string, number>;
    sinPrototipo.b = 2;
    sinPrototipo.a = 1;
    expect(canonicalizar(sinPrototipo)).toBe('{"a":1,"b":2}');
  });

  it("rechaza los ciclos, y no confunde un objeto repetido con un ciclo", () => {
    const ciclo: Record<string, unknown> = {};
    ciclo.yo = ciclo;
    expect(() => canonicalizar(ciclo)).toThrow(/ciclo/);
    const compartido = { x: 1 };
    expect(canonicalizar([compartido, compartido])).toBe('[{"x":1},{"x":1}]');
  });

  it("serializa los literales y los escapes de control", () => {
    expect(canonicalizar([null, true, false, '\u0001\t"\\'])).toBe(
      '[null,true,false,"\\u0001\\t\\"\\\\"]',
    );
  });
});

describe("sha256 y huella", () => {
  it("coincide con node:crypto sobre los mismos bytes", async () => {
    for (const texto of ["", "abc", MUESTRA_3_2_2, "ñ€😀"]) {
      expect(await sha256(texto)).toBe(
        createHash("sha256").update(texto, "utf8").digest("hex"),
      );
    }
  });

  it("la huella es SHA-256 de la forma canónica, igual para objetos equivalentes", async () => {
    const a = await huella({ b: 1, a: [1, 2] });
    expect(a).toBe(await sha256('{"a":[1,2],"b":1}'));
    expect(a).toBe(await huella({ a: [1, 2], b: 1 }));
    expect(a).not.toBe(await huella({ a: [2, 1], b: 1 }));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
