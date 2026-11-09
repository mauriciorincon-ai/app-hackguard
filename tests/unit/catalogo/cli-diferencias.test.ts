// @vitest-environment node
// Los CLI de D1 y D3 corren como una persona: un proceso de Node aparte sobre el `datos/` del repo.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./ayuda.ts";

const correr = (guion: string, ...argumentos: string[]) => {
  const r = spawnSync(
    process.execPath,
    ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", guion, ...argumentos],
    { cwd: RAIZ, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
};
const catalogo = (...a: string[]) => correr("src/cli/catalogo.ts", ...a);
const activo = (...a: string[]) => correr("src/cli/activo.ts", ...a);

const nombreDe = (carpeta: string) =>
  readdirSync(path.join(RAIZ, carpeta))
    .filter((f) => /^\d{4}-\d{2}-\d{2}-[0-9a-f]{12}\.json$/.test(f))
    .sort()
    .at(-1)!
    .replace(/\.json$/, "");
const OFICIAL = nombreDe("datos/instantaneas");
const DEMO = nombreDe("datos/instantaneas/demo");

describe("catalogo diferencias", () => {
  it("oficial → demo: lo que entra, sale y cambia, en español, con la huella", () => {
    const r = catalogo("diferencias", OFICIAL, DEMO);
    expect(r.codigo).toBe(0);
    expect(r.errores).toBe("");
    expect(r.salida).toContain("2 entran · 1 salen · 2 cambian");
    expect(r.salida).toContain("ENTRA  pruebas/PR-MD-DEMO-001");
    expect(r.salida).toContain("SALE  pruebas/PR-MD-LIM-001");
    expect(r.salida).toContain("CAMBIA  pruebas/PR-MD-INV-001");
    expect(r.salida).toMatch(/huella: [0-9a-f]{64}/);
  });

  it("en inglés, y --json trae el mismo cálculo (misma huella)", () => {
    const en = catalogo("diferencias", OFICIAL, DEMO, "--idioma", "en");
    expect(en.salida).toContain("ENTERS  pruebas/PR-MD-DEMO-001");
    const json = JSON.parse(
      catalogo("diferencias", OFICIAL, DEMO, "--json").salida,
    ) as { huella: string; resumen: Record<string, number> };
    expect(json.resumen).toEqual({ entra: 2, sale: 1, cambia: 2 });
    expect(catalogo("diferencias", OFICIAL, DEMO).salida).toContain(
      json.huella,
    );
  });

  it("es determinista: dos corridas dan los mismos bytes", () => {
    expect(catalogo("diferencias", OFICIAL, DEMO, "--json").salida).toBe(
      catalogo("diferencias", OFICIAL, DEMO, "--json").salida,
    );
  });

  it("una instantánea contra sí misma no tiene movimientos", () => {
    const j = JSON.parse(
      catalogo("diferencias", OFICIAL, OFICIAL, "--json").salida,
    ) as { movimientos: unknown[] };
    expect(j.movimientos).toEqual([]);
  });

  it("una instantánea mutilada sale 3 y nombra lo que le falta, sin llegar a comparar (deuda del S10)", () => {
    const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-dif-"));
    for (const c of ["instantaneas", "propuestas"])
      cpSync(path.join(RAIZ, "datos", c), path.join(raiz, "datos", c), {
        recursive: true,
      });
    const ruta = path.join(raiz, "datos", "instantaneas", `${OFICIAL}.json`);
    const i = JSON.parse(readFileSync(ruta, "utf8")) as {
      catalogo: Record<string, unknown>;
    };
    delete i.catalogo.pruebas;
    writeFileSync(ruta, JSON.stringify(i));
    const r = spawnSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        path.join(RAIZ, "src/cli/catalogo.ts"),
        "diferencias",
        OFICIAL,
        DEMO,
      ],
      { cwd: raiz, encoding: "utf8" },
    );
    expect(r.status).toBe(3);
    expect(r.stderr).toContain(OFICIAL);
    expect(r.stderr).toContain("pruebas");
    expect(r.stdout).toBe("");
  });

  it("una instantánea que no existe sale 3 con el uso", () => {
    const r = catalogo("diferencias", "no-existe", OFICIAL);
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("no existe la instantánea no-existe");
  });
});

describe("catalogo instantanea --demo", () => {
  it("es reproducible: emite el mismo archivo que está en datos/instantaneas/demo/", () => {
    const antes = readFileSync(
      path.join(RAIZ, "datos/instantaneas/demo", `${DEMO}.json`),
      "utf8",
    );
    const r = catalogo("instantanea", "--demo");
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("2026-11-01");
    expect(
      readFileSync(
        path.join(RAIZ, "datos/instantaneas/demo", `${DEMO}.json`),
        "utf8",
      ),
    ).toBe(antes);
    expect(
      readdirSync(path.join(RAIZ, "datos/instantaneas/demo")),
    ).toHaveLength(1);
  });

  it("no se combina con --agregar ni con --salida", () => {
    expect(catalogo("instantanea", "--demo", "--salida", "/tmp/x").codigo).toBe(
      3,
    );
    expect(
      catalogo("instantanea", "--demo", "--agregar", "x.json").codigo,
    ).toBe(3);
  });
});

describe("activo historial", () => {
  it("el clasificador demo: dos versiones y un plan desactualizado por perfil", () => {
    const r = activo("historial", "act-demo-clasificador");
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("v2 (vigente)");
    expect(r.salida).toContain("rasgos.modelo_de_terceros");
    expect(r.salida).toContain("Plan: desactualizado por perfil");
    expect(r.salida).toContain("emitido con la versión 1");
  });

  it("en inglés y en JSON", () => {
    expect(
      activo("historial", "act-demo-clasificador", "--idioma", "en").salida,
    ).toContain("Plan: out of date because of profile");
    const j = JSON.parse(
      activo("historial", "act-demo-clasificador", "--json").salida,
    ) as { plan: { estado: string; por: string[]; versionDelActivo: number } };
    expect(j.plan).toMatchObject({
      estado: "plan_desactualizado",
      por: ["perfil"],
      versionDelActivo: 1,
    });
  });

  it("un activo sin historial o inexistente sale 3", () => {
    expect(activo("historial", "act-demo-asistente").codigo).toBe(3);
    expect(activo("historial", "act-no-existe").codigo).toBe(3);
    expect(activo("otra-cosa").codigo).toBe(3);
  });
});
