// @vitest-environment node
// `pnpm brecha:tendencia`: la tendencia en la terminal, con la fecha de consulta fijada por HACKGUARD_CONSULTA (jamás el reloj). Solo
// lee el repo. La misma entrada da los mismos bytes: la huella no cambia entre dos corridas.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RAIZ } from "../evidencia/ayuda.ts";

const tendencia = (args: string[], consulta = "2026-10-08") => {
  const r = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      path.join(RAIZ, "src/cli/brecha.ts"),
      "tendencia",
      ...args,
    ],
    {
      cwd: RAIZ,
      encoding: "utf8",
      env: { ...process.env, HACKGUARD_CONSULTA: consulta },
    },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
};

describe("brecha tendencia", () => {
  it("dice el control que empeoró por la reapertura, con el hallazgo que lo movió, en español", () => {
    const r = tendencia([]);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("14 cortes · 2026-03-21 → 2026-10-08");
    expect(r.salida).toContain(
      "iso42001-A.6.2.8 · Registro de lo que hace · empeoró · REGRESIÓN",
    );
    expect(r.salida).toContain(
      "2026-10-01 empeoró: Con evidencia vigente → Con fallas · HZ-0011 (Cerrado por re-prueba → Reabierto: volvió a fallar)",
    );
    expect(r.salida).toContain("regresión: HZ-0011 se reabrió el 2026-10-01");
    expect(r.salida).toContain(
      "iso42001-A.9.4 · Uso dentro de lo previsto · mejoró",
    );
  });

  it("en inglés dice lo mismo", () => {
    const r = tendencia(["--idioma", "en"]);
    expect(r.salida).toContain("Gap trend · 14 cut-offs");
    expect(r.salida).toContain("· REGRESSION");
    expect(r.salida).toContain(
      "regression: HZ-0011 was reopened on 2026-10-01",
    );
  });

  it("el JSON trae los puntos, los controles y la huella, y es el mismo en dos corridas", () => {
    const a = JSON.parse(tendencia(["--json"]).salida);
    const b = JSON.parse(tendencia(["--json"]).salida);
    expect(a).toEqual(b);
    expect(a.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(a.cortes).toHaveLength(14);
    expect(a.resumen).toEqual({
      mejoraron: 1,
      empeoraron: 3,
      igual: 4,
      conRegresion: 1,
    });
    expect(a.problemas).toEqual([]);
  });

  it("--hasta atrasa la consulta: antes de la reapertura no hay regresión", () => {
    const a = JSON.parse(tendencia(["--json", "--hasta", "2026-09-28"]).salida);
    expect(a.cortes.at(-1)).toBe("2026-09-28");
    expect(a.resumen.conRegresion).toBe(0);
  });

  it("un modo que no existe, un idioma o una fecha mal escritos son un error de uso (3) sin salida", () => {
    for (const args of [
      ["--idioma", "fr"],
      ["--hasta", "ayer"],
      ["sobrante"],
    ]) {
      const r = tendencia(args);
      expect(r.codigo, args.join(" ")).toBe(3);
      expect(r.salida).toBe("");
    }
  });
});
