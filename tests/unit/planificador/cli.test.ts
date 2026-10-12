// @vitest-environment node
// El CLI del planificador como lo usa una persona: `pnpm activo:validar` y `pnpm plan:emitir`. Cada código de
// salida se demuestra; los archivos que escribe son los versionados byte a byte; y un activo propio jamás
// deja un derivado menos privado que su fuente (regla 17-bis).
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { Activo } from "../../../src/engine/activos/esquemas.ts";
import {
  ASISTENTE,
  CLASIFICADOR,
  copia,
  FECHA,
  mundo,
  PORTAL,
  RAIZ,
} from "./ayuda.ts";

const SCRIPT = path.join(RAIZ, "src/cli/plan.ts");
function correr(args: string[], cwd = RAIZ) {
  const r = spawnSync(
    process.execPath,
    ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", SCRIPT, ...args],
    { cwd, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
}

const temporales: string[] = [];
const tmp = () => {
  const d = mkdtempSync(path.join(tmpdir(), "hackguard-plan-"));
  temporales.push(d);
  return d;
};
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

describe("activo-validar", () => {
  it("los demo: con advertencias (el portal), código 1", () => {
    const r = correr(["activo-validar"]);
    expect(r.codigo).toBe(1);
    expect(r.salida).toContain(
      "3 válidos · 2 con alcance y reglas · 1 sin autorización",
    );
    const en = correr(["activo-validar", "--idioma", "en"]);
    expect(en.salida).toContain("3 valid · 2 with scope and rules");
  });

  it("--json trae el estado, el código y los hallazgos", () => {
    const r = correr(["activo-validar", "--json"]);
    const json = JSON.parse(r.salida) as {
      estado: string;
      codigo_de_salida: number;
      activos: { id: string; autorizado: boolean }[];
    };
    expect(json).toMatchObject({
      estado: "con_advertencias",
      codigo_de_salida: 1,
    });
    expect(json.activos.map((a) => a.id)).toEqual([
      ASISTENTE,
      CLASIFICADOR,
      PORTAL,
    ]);
  });

  it("un id que no existe es un error de uso (3), con el uso en los dos idiomas", () => {
    const r = correr(["activo-validar", "act-fantasma"]);
    expect(r.codigo).toBe(3);
    expect(r.errores).toMatch(/uso: plan[\s\S]*usage: plan/);
  });

  it("un comando desconocido y un idioma inválido también", () => {
    expect(correr(["nada"]).codigo).toBe(3);
    expect(correr(["activo-validar", "--idioma", "fr"]).codigo).toBe(3);
    expect(correr(["activo-validar", "uno", "dos", "tres"]).codigo).toBe(3);
  });
});

describe("emitir", () => {
  it("escribe el plan y el paquete: son los archivos versionados, byte a byte", () => {
    const salida = tmp();
    const r = correr([
      "emitir",
      ASISTENTE,
      "--fecha",
      FECHA,
      "--salida",
      salida,
    ]);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("14 planeadas · 12 excluidas");
    for (const sufijo of ["plan", "paquete"])
      expect(
        readFileSync(path.join(salida, `${ASISTENTE}.${sufijo}.json`), "utf8"),
      ).toBe(
        readFileSync(
          path.join(RAIZ, `datos/planes/${ASISTENTE}.${sufijo}.json`),
          "utf8",
        ),
      );
    expect(
      statSync(path.join(salida, `${ASISTENTE}.plan.json`)).mode & 0o777,
    ).toBe(0o644);
  });

  it("acepta el id en mayúsculas y --json", () => {
    const salida = tmp();
    const r = correr([
      "emitir",
      "ACT-DEMO-CLASIFICADOR",
      "--fecha",
      FECHA,
      "--salida",
      salida,
      "--json",
    ]);
    expect(r.codigo).toBe(0);
    expect(JSON.parse(r.salida)).toMatchObject({
      emitido: true,
      resumen: { planeadas: 11, excluidas: 1 },
    });
  });

  it("el portal demo no recibe plan: lo dice, sale con 2 y no escribe nada", () => {
    const salida = tmp();
    const r = correr(["emitir", PORTAL, "--fecha", FECHA, "--salida", salida]);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain(
      "Sin plan: act-demo-portal no tiene alcance autorizado ni reglas de enfrentamiento",
    );
    expect(existsSync(path.join(salida, `${PORTAL}.plan.json`))).toBe(false);
    expect(
      correr([
        "emitir",
        PORTAL,
        "--fecha",
        FECHA,
        "--salida",
        salida,
        "--idioma",
        "en",
        "--json",
      ]).salida,
    ).toContain('"emitido": false');
  });

  it("sin fecha, con una fecha que no existe o anterior a la instantánea: error de uso", () => {
    expect(correr(["emitir", ASISTENTE]).codigo).toBe(3);
    expect(correr(["emitir", ASISTENTE, "--fecha", "2026-02-30"]).codigo).toBe(
      3,
    );
    const antes = correr([
      "emitir",
      ASISTENTE,
      "--fecha",
      "2026-10-04",
      "--salida",
      tmp(),
    ]);
    expect(antes.codigo).toBe(3);
    expect(antes.errores).toContain("anterior a la instantánea");
  });

  it("sin id, o con un activo que no existe: error de uso", () => {
    expect(correr(["emitir", "--fecha", FECHA]).codigo).toBe(3);
    expect(correr(["emitir", "act-fantasma", "--fecha", FECHA]).codigo).toBe(3);
  });
});

describe("un activo propio vive en datos/privado/ y su plan también (regla 17-bis)", () => {
  /** Una raíz de juguete con lo mínimo y un activo propio privado. */
  async function raizConPropio(cambiar?: (a: Activo) => void) {
    const m = await mundo();
    const raiz = tmp();
    for (const c of ["instantaneas", "filtro", "planificador"])
      cpSync(path.join(RAIZ, "datos", c), path.join(raiz, "datos", c), {
        recursive: true,
      });
    const activo = copia(m.activos[CLASIFICADOR]!);
    activo.id = "mi-clasificador";
    activo.origen = "propio";
    cambiar?.(activo);
    mkdirSync(path.join(raiz, "datos/privado/activos"), { recursive: true });
    writeFileSync(
      path.join(raiz, "datos/privado/activos/mi-clasificador.json"),
      JSON.stringify(activo),
    );
    return raiz;
  }

  it("el plan nace en datos/privado/planes con modo 0600", async () => {
    const raiz = await raizConPropio();
    const r = correr(["emitir", "mi-clasificador", "--fecha", FECHA], raiz);
    expect(r.codigo).toBe(0);
    const plan = path.join(
      raiz,
      "datos/privado/planes/mi-clasificador.plan.json",
    );
    expect(statSync(plan).mode & 0o777).toBe(0o600);
    expect(
      statSync(
        path.join(raiz, "datos/privado/planes/mi-clasificador.paquete.json"),
      ).mode & 0o777,
    ).toBe(0o600);
    expect(existsSync(path.join(raiz, "datos/planes"))).toBe(false);
  });

  it("no se deja escribir en una carpeta versionada de datos/", async () => {
    const raiz = await raizConPropio();
    const r = correr(
      [
        "emitir",
        "mi-clasificador",
        "--fecha",
        FECHA,
        "--salida",
        "datos/planes",
      ],
      raiz,
    );
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("solo se escribe en datos/privado/");
    expect(existsSync(path.join(raiz, "datos/planes"))).toBe(false);
  });

  it("un propio que se pide en docs/ o en la raíz del repo es un error de uso: solo datos/privado/ o fuera del repo", async () => {
    const raiz = await raizConPropio();
    for (const salida of ["docs", "."]) {
      const r = correr(
        ["emitir", "mi-clasificador", "--fecha", FECHA, "--salida", salida],
        raiz,
      );
      expect(r.codigo).toBe(3);
      expect(r.errores).toContain("solo se escribe en datos/privado/");
    }
    expect(existsSync(path.join(raiz, "docs"))).toBe(false);
  });

  it("la carpeta privada que el CLI crea nace con modo 0700 (regla 17-bis)", async () => {
    const raiz = await raizConPropio();
    expect(correr(["emitir", "mi-clasificador", "--fecha", FECHA], raiz).codigo).toBe(0);
    expect(statSync(path.join(raiz, "datos/privado/planes")).mode & 0o777).toBe(0o700);
  });

  it("un archivo ya existente con otro modo se deja en el que corresponde", async () => {
    const raiz = await raizConPropio();
    correr(["emitir", "mi-clasificador", "--fecha", FECHA], raiz);
    const plan = path.join(
      raiz,
      "datos/privado/planes/mi-clasificador.plan.json",
    );
    rmSync(plan);
    writeFileSync(
      plan,
      readFileSync(
        path.join(raiz, "datos/privado/planes/mi-clasificador.paquete.json"),
      ),
      { mode: 0o644 },
    );
    correr(["emitir", "mi-clasificador", "--fecha", FECHA], raiz);
    expect(statSync(plan).mode & 0o777).toBe(0o600);
  });

  it("un activo propio inválido no recibe plan y el informe dice por qué (2)", async () => {
    const raiz = await raizConPropio(
      (a) => (a.rasgos["rasgo_imaginario"] = true),
    );
    const r = correr(["emitir", "mi-clasificador", "--fecha", FECHA], raiz);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain(
      "El perfil declara un rasgo que el catálogo no tiene",
    );
    expect(existsSync(path.join(raiz, "datos/privado/planes"))).toBe(false);
  });

  it("un demo que está en datos/privado/ no recibe plan: su origen y su carpeta no cuadran (2)", async () => {
    const raiz = await raizConPropio((a) => {
      a.origen = "demo";
    });
    const r = correr(["emitir", "mi-clasificador", "--fecha", FECHA], raiz);
    expect(r.codigo).toBe(2);
    expect(existsSync(path.join(raiz, "datos/planes"))).toBe(false);
    expect(existsSync(path.join(raiz, "datos/privado/planes"))).toBe(false);
  });

  it("un activo propio en la carpeta pública es un error", async () => {
    const raiz = await raizConPropio();
    mkdirSync(path.join(raiz, "datos/activos/demo"), { recursive: true });
    const m = await mundo();
    const activo = { ...copia(m.activos[CLASIFICADOR]), origen: "propio" };
    writeFileSync(
      path.join(raiz, "datos/activos/demo/act-demo-clasificador.json"),
      JSON.stringify(activo),
    );
    const r = correr(["activo-validar"], raiz);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("datos/privado/activos/");
  });
});
