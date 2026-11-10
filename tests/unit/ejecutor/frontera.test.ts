// @vitest-environment node
// La frontera del ejecutor opcional (S12, D11): la web no ejecuta nada. Lo que lanza procesos vive en UN archivo (`src/cli/ejecutor.ts`),
// el núcleo que decide es puro (sin `node:` alguno), y nada de lo que se publica lo importa. Y los activos demo no declaran
// objetivos ni vigencia: así el ejecutor los rechaza y sus huellas no cambiaron al sumarse los campos opcionales.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizarActivo } from "../../../src/engine/activos/normalizar.ts";
import { Activo } from "../../../src/engine/activos/esquemas.ts";

const RAIZ = path.resolve(import.meta.dirname, "../../..");
const fuentes = (relativa: string): string[] => {
  const d = path.join(RAIZ, relativa);
  return readdirSync(d).flatMap((n) => {
    const r = path.join(relativa, n);
    return statSync(path.join(RAIZ, r)).isDirectory()
      ? fuentes(r)
      : /\.(ts|tsx|mjs|js)$/.test(n)
        ? [r]
        : [];
  });
};
const texto = (r: string) => readFileSync(path.join(RAIZ, r), "utf8");

describe("la web no ejecuta nada", () => {
  const publicadas = [...fuentes("src/app"), ...fuentes("src/components")];
  it("nada de src/app ni de src/components importa el ejecutor ni lanza procesos", () => {
    expect(publicadas.length).toBeGreaterThan(50);
    for (const f of publicadas) {
      const t = texto(f);
      expect(t, f).not.toMatch(/ejecutor/i);
      expect(t, f).not.toMatch(/child_process/);
    }
  });
  it("nada de src/lib importa el motor del ejecutor (lo que usa la web vive ahí)", () => {
    for (const f of fuentes("src/lib"))
      expect(texto(f), f).not.toMatch(/engine\/ejecutor|cli\/ejecutor/);
  });
});

describe("el lanzamiento vive en un solo archivo y el núcleo es puro", () => {
  it("`child_process` solo aparece en src/cli/ejecutor.ts y en la lectura de la fecha del commit (`git log`, anterior al ejecutor)", () => {
    const con = [...fuentes("src")].filter((f) =>
      /child_process/.test(texto(f)),
    );
    expect(con).toEqual([
      "src/cli/ejecutor.ts",
      "src/lib/catalogo/fecha-del-commit.ts",
    ]);
  });
  it("el lanzamiento no usa shell", () => {
    const t = texto("src/cli/ejecutor.ts");
    expect(t).toMatch(/shell: false/);
    expect(t).not.toMatch(/\bexec\(|execSync|shell: true/);
  });
  it("src/engine/ejecutor no importa ningún módulo de `node:` (decide, no toca el sistema)", () => {
    for (const f of fuentes("src/engine/ejecutor"))
      expect(texto(f), f).not.toMatch(/from "node:/);
  });
});

describe("los activos demo", () => {
  it("no declaran objetivos ni vigente_hasta y su forma normalizada tampoco los trae (huellas intactas)", () => {
    const carpeta = "datos/activos/demo";
    const demos = readdirSync(path.join(RAIZ, carpeta)).filter((n) =>
      n.endsWith(".json"),
    );
    expect(demos.length).toBeGreaterThanOrEqual(3);
    for (const n of demos) {
      const a = Activo.parse(JSON.parse(texto(`${carpeta}/${n}`)));
      // Un demo sin autorizar (act-demo-portal) no tiene alcance: tampoco tiene objetivos.
      const alcance = a.alcance ?? {};
      expect(Object.keys(alcance), n).not.toContain("objetivos");
      expect(Object.keys(alcance), n).not.toContain("vigente_hasta");
      expect(Object.keys(normalizarActivo(a).alcance ?? {}), n).not.toContain(
        "objetivos",
      );
    }
  });
});
