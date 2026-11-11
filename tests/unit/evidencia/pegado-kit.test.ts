// @vitest-environment node
// El kit de textos pegados es lo que la persona pega en el recorrido: si se desvía de los fixtures de los adaptadores, la guía le
// pediría pegar algo que la prueba ya no cubre. Y los comandos que la pantalla enseña tienen que existir en el repositorio.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const leer = (f: string) => readFileSync(path.join(RAIZ, f), "utf8");

describe("el kit de textos pegados es byte a byte el de los fixtures", () => {
  it.each([
    ["garak-0.17.0.report.redactado.jsonl"],
    ["zap-traditional-json.derivada.json"],
    ["promptfoo-0.123.1.sintetico.json"],
    ["inspect-0.3.288.sintetico.json"],
  ])("%s", (nombre) => {
    expect(leer(`docs/kit-de-prueba/textos-pegados/${nombre}`)).toBe(
      leer(`tests/fixtures/adaptadores/${nombre}`),
    );
  });
});

describe("los comandos que enseña la vía de texto pegado existen", () => {
  const fuente = leer("src/components/carga/pegado-pantalla.tsx");
  const scripts = (
    JSON.parse(leer("package.json")) as {
      scripts: Record<string, string>;
    }
  ).scripts;
  const comandos = [...fuente.matchAll(/pnpm ([a-z0-9:-]+)/g)].map(
    (m) => m[1]!,
  );

  it("la pantalla cita al menos importar y confirmar-lote", () => {
    expect(comandos).toEqual(
      expect.arrayContaining([
        "evidencia:importar",
        "evidencia:confirmar-lote",
      ]),
    );
  });
  it.each([...new Set(comandos)])("pnpm %s es un script del paquete", (c) => {
    expect(scripts[c], c).toBeDefined();
  });
  it("y cada opción que enseña la entiende la CLI", () => {
    const cli = leer("src/cli/evidencia.ts");
    for (const op of [
      "--garak",
      "--zap",
      "--activo",
      "--por",
      "--fecha",
      "--revisados",
    ])
      expect(cli, op).toContain(op);
  });
});
