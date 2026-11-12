// @vitest-environment node
// `pnpm activo:desde-ficha`: propone con fragmento, guarda solo lo aceptado y solo en datos/privado/ (modo 600), y se niega
// dentro de una sesión de Claude Code (confirmar lo hace una persona).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const REPO = process.cwd();
const CLI = join(REPO, "src/cli/activo.ts");
const FICHA = join(REPO, "datos/fichas/demo/ficha-demo-asistente.json");
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
      env: env as NodeJS.ProcessEnv,
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

  it("el texto de la ficha va sin marcas de dirección ni de ancho cero (Trojan Source)", () => {
    const sucia = JSON.parse(readFileSync(FICHA, "utf8"));
    sucia.titular = "Asistente con herramientas \u202eODALUCXE\u202c \u200bfin";
    const ruta = join(temporal, "bidi.json");
    writeFileSync(ruta, JSON.stringify(sucia));
    const r = correr(REPO, [ruta]);
    expect(r.stdout).not.toMatch(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/);
    expect(r.stdout).toContain("ODALUCXE");
  });

  it("--aceptar vacío, un id o una fecha que no existen son errores de uso y no escriben nada", () => {
    const fichas = (
      aceptar: string,
      id: string,
      fecha: string,
      salida: string,
    ) => [
      FICHA,
      "--aceptar",
      aceptar,
      "--por",
      "Ana",
      "--id",
      id,
      "--fecha",
      fecha,
      "--salida",
      salida,
    ];
    const vacio = correr(
      temporal,
      fichas(
        "",
        "act-vacio",
        "2026-11-10",
        "datos/privado/activos/vacio.perfil.json",
      ),
    );
    expect(vacio.status).toBe(3);
    expect(vacio.stderr).toMatch(/al menos un rasgo/);
    const fecha = correr(
      temporal,
      fichas(
        "todos",
        "act-fecha",
        "2026-13-45",
        "datos/privado/activos/fecha.perfil.json",
      ),
    );
    expect(fecha.status).toBe(3);
    expect(fecha.stderr).toMatch(/fecha que exista/);
    const id = correr(
      temporal,
      fichas(
        "todos",
        "Act Mayusculas",
        "2026-11-10",
        "datos/privado/activos/id.perfil.json",
      ),
    );
    expect(id.status).toBe(3);
    for (const n of ["vacio", "fecha", "id"])
      expect(
        existsSync(join(temporal, `datos/privado/activos/${n}.perfil.json`)),
      ).toBe(false);
  });

  it("no escribe a través de un enlace simbólico, ni colgante", () => {
    mkdirSync(join(temporal, "datos/privado/activos"), { recursive: true });
    const destino = join(temporal, "afuera.json");
    symlinkSync(
      destino,
      join(temporal, "datos/privado/activos/colgante.perfil.json"),
    );
    const r = correr(
      temporal,
      confirmar("datos/privado/activos/colgante.perfil.json"),
    );
    expect(r.status).toBe(2);
    expect(existsSync(destino)).toBe(false);
  });

  it("una ficha de más de 1 MB no se lee", () => {
    const ruta = join(temporal, "grande.json");
    writeFileSync(ruta, " ".repeat(1_000_001));
    const r = correr(REPO, [ruta]);
    expect(r.status).toBe(3);
    expect(r.stderr).toMatch(/pasa de 1000000 bytes/);
  });

  it("una ficha con BOM se lee igual y su huella es la de sus bytes crudos", () => {
    const sin = readFileSync(FICHA);
    const con = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), sin]);
    const rutaSin = join(temporal, "sin-bom.json");
    const rutaCon = join(temporal, "con-bom.json");
    writeFileSync(rutaSin, sin);
    writeFileSync(rutaCon, con);
    expect(correr(REPO, [rutaCon]).stdout).toBe(correr(REPO, [rutaSin]).stdout);
    const huellaGuardada = (ruta: string, id: string) => {
      const argumentos = confirmar(`datos/privado/activos/${id}.perfil.json`);
      argumentos[0] = ruta;
      argumentos[argumentos.indexOf("act-propio-uno")] = id;
      const r = correr(temporal, argumentos);
      expect(r.status, r.stderr).toBe(0);
      return JSON.parse(
        readFileSync(
          join(temporal, `datos/privado/activos/${id}.perfil.json`),
          "utf8",
        ),
      ).ficha.huella as string;
    };
    const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
    expect(huellaGuardada(rutaCon, "con-bom")).toBe(sha(con));
    expect(huellaGuardada(rutaSin, "sin-bom")).toBe(sha(sin));
  });

  it("una ficha que no cumple el contrato es un error de uso", () => {
    const ruta = join(temporal, "rota.json");
    writeFileSync(ruta, JSON.stringify({ schema_version: "2.0.0" }));
    expect(correr(REPO, [ruta]).status).toBe(3);
  });
});
