// @vitest-environment node
// `pnpm activo:desde-ficha`: propone con fragmento, guarda solo lo aceptado y solo en datos/privado/ (modo 600), y se niega
// dentro de una sesión de Claude Code (confirmar lo hace una persona).
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const REPO = process.cwd();
const CLI = join(REPO, "src/cli/activo.ts");
const FICHA = join(REPO, "datos/activos/demo/fichas/ficha-demo-asistente.json");
const sinClaude = Object.fromEntries(
  Object.entries(process.env).filter(
    ([k]) => k !== "CLAUDECODE" && !k.startsWith("CLAUDE_CODE_"),
  ),
);
const correr = (
  cwd: string,
  args: string[],
  env: Record<string, string | undefined> = sinClaude,
) =>
  spawnSync(
    "node",
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      CLI,
      "desde-ficha",
      ...args,
    ],
    {
      cwd,
      env,
      encoding: "utf8",
    },
  );

const temporal = mkdtempSync(join(tmpdir(), "hg-desde-ficha-"));
mkdirSync(join(temporal, "datos/planificador"), { recursive: true });
cpSync(
  join(REPO, "datos/planificador/ficha-a-rasgos.json"),
  join(temporal, "datos/planificador/ficha-a-rasgos.json"),
);
cpSync(
  join(REPO, "datos/rasgos-de-perfil.json"),
  join(temporal, "datos/rasgos-de-perfil.json"),
);
afterAll(() => rmSync(temporal, { recursive: true, force: true }));

const confirmar = (salida: string, aceptar = "todos") => [
  FICHA,
  "--aceptar",
  aceptar,
  "--por",
  "Ana",
  "--id",
  "act-propio-uno",
  "--fecha",
  "2026-11-10",
  "--salida",
  salida,
];

describe("activo:desde-ficha", () => {
  it("propone cada rasgo con su fragmento y dice cuáles quedan sin responder", () => {
    const r = correr(REPO, [FICHA]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/6 propuestos, 19 sin responder/);
    expect(r.stdout).toMatch(/usa_herramientas: sí {2}← titular: «/);
    expect(r.stdout).toMatch(/tiene_sesiones: sin responder/);
    expect(r.stdout).toMatch(
      /accede_a_datos_sensibles: sin responder \(la ficha se contradice\)/,
    );
  });

  it("--idioma en habla en inglés", () => {
    expect(correr(REPO, [FICHA, "--idioma", "en"]).stdout).toMatch(
      /Profile from the ficha: 6 proposed/,
    );
  });

  it("el texto de la ficha va sin caracteres de control", () => {
    const sucia = JSON.parse(readFileSync(FICHA, "utf8"));
    sucia.titular = "Asistente con herramientas \u001b[31mROJO\u001b[0m";
    const ruta = join(temporal, "sucia.json");
    writeFileSync(ruta, JSON.stringify(sucia));
    const r = correr(REPO, [ruta]);
    expect(r.stdout).not.toContain("\u001b");
    expect(r.stdout).toContain("[31mROJO");
  });

  it("se niega a guardar dentro de una sesión de Claude Code y no escribe nada", () => {
    const r = correr(REPO, confirmar("datos/privado/activos/no.perfil.json"), {
      ...sinClaude,
      CLAUDECODE: "1",
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/lo hace una persona/);
    expect(existsSync(join(REPO, "datos/privado/activos/no.perfil.json"))).toBe(
      false,
    );
  });

  it("guarda solo lo aceptado, en datos/privado/ con modo 600, y sin la ficha", () => {
    const r = correr(
      temporal,
      confirmar(
        "datos/privado/activos/uno.perfil.json",
        "usa_herramientas,acciones_irreversibles",
      ),
    );
    expect(r.status).toBe(0);
    const ruta = join(temporal, "datos/privado/activos/uno.perfil.json");
    expect(statSync(ruta).mode & 0o777).toBe(0o600);
    const p = JSON.parse(readFileSync(ruta, "utf8"));
    expect(p.rasgos).toEqual({
      usa_herramientas: true,
      acciones_irreversibles: false,
    });
    expect(p.sin_responder).toContain("expone_texto_libre_a_modelo");
    expect(p.confirmado_por).toBe("Ana");
    expect(JSON.stringify(p)).not.toContain(
      "una persona le escribe texto libre",
    );
  });

  it("no sobrescribe un perfil que ya existe", () => {
    const r = correr(
      temporal,
      confirmar("datos/privado/activos/uno.perfil.json"),
    );
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/no se sobrescribe/);
  });

  it("no acepta un rasgo que la ficha no respalda", () => {
    const r = correr(
      temporal,
      confirmar("datos/privado/activos/dos.perfil.json", "tiene_sesiones"),
    );
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Sin fragmento no hay propuesta/);
    expect(
      existsSync(join(temporal, "datos/privado/activos/dos.perfil.json")),
    ).toBe(false);
  });

  it("no guarda fuera de datos/privado/ (regla 17-bis)", () => {
    const r = correr(temporal, confirmar("datos/activos/demo/fuera.json"));
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/dentro de datos\/privado/);
    expect(existsSync(join(temporal, "datos/activos/demo/fuera.json"))).toBe(
      false,
    );
  });

  it("una ficha que no cumple el contrato es un error de uso", () => {
    const ruta = join(temporal, "rota.json");
    writeFileSync(ruta, JSON.stringify({ schema_version: "2.0.0" }));
    expect(correr(REPO, [ruta]).status).toBe(3);
  });
});
