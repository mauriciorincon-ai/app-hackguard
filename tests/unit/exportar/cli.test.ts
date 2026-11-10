// @vitest-environment node
// El CLI de exportación como lo usa una persona: `pnpm exportar:defectdojo <activo> --fecha …`. Imprime los MISMOS bytes que descarga la web;
// y lo que escribe nace tan privado como su fuente (regla 17-bis): el export de un activo propio solo cae en datos/privado/ (0700/0600) o
// fuera del repositorio, jamás en docs/, out/ o en la raíz.
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
import {
  exportacionDeActivo,
  textoDeExportacion,
} from "../../../src/lib/exportar/defectdojo.ts";
import { ASISTENTE, RAIZ } from "../evidencia/ayuda.ts";
import { activos, instantanea, mundoDeHallazgos } from "../lib/mundo-de-brecha";

function exportar(args: string[], cwd: string) {
  const r = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      path.join(RAIZ, "src/cli/exportar.ts"),
      ...args,
    ],
    { cwd, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
}
const temporales: string[] = [];
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);
const modo = (ruta: string) => statSync(ruta).mode & 0o777;

describe("el CLI, con el activo demo", () => {
  it("imprime los mismos bytes que descarga la web (la misma función, la misma fecha)", () => {
    const r = exportar(
      ["defectdojo", ASISTENTE, "--fecha", "2026-11-09"],
      RAIZ,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toBe(
      textoDeExportacion(
        exportacionDeActivo(
          ASISTENTE,
          mundoDeHallazgos,
          activos,
          instantanea,
          "2026-11-09",
        ),
      ),
    );
    expect(JSON.parse(r.salida).findings).toHaveLength(5);
  });
  it("sin fecha, con fecha que no es civil o con un activo que no existe, es un error de uso (3) y no escribe nada", () => {
    expect(exportar(["defectdojo", ASISTENTE], RAIZ).codigo).toBe(3);
    expect(
      exportar(["defectdojo", ASISTENTE, "--fecha", "2026-02-30"], RAIZ).codigo,
    ).toBe(3);
    const r = exportar(
      ["defectdojo", "no-existe", "--fecha", "2026-11-09"],
      RAIZ,
    );
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("there is no asset");
  });
});

describe("la regla 17-bis, con un activo propio", () => {
  /** Una raíz de juguete: el catálogo, el planificador y un activo PROPIO con su plan emitido. */
  function raizConPropio() {
    const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-exportar-"));
    temporales.push(raiz);
    for (const c of [
      "instantaneas",
      "filtro",
      "planificador",
      "severidad",
      "exportacion",
    ])
      cpSync(path.join(RAIZ, "datos", c), path.join(raiz, "datos", c), {
        recursive: true,
      });
    mkdirSync(path.join(raiz, "datos/hallazgos"), { recursive: true });
    cpSync(
      path.join(RAIZ, "datos/hallazgos/plazos.json"),
      path.join(raiz, "datos/hallazgos/plazos.json"),
    );
    mkdirSync(path.join(raiz, "datos/evidencia"), { recursive: true });
    cpSync(
      path.join(RAIZ, "datos/evidencia/muestreo.json"),
      path.join(raiz, "datos/evidencia/muestreo.json"),
    );
    const activo = JSON.parse(
      readFileSync(
        path.join(RAIZ, `datos/activos/demo/${ASISTENTE}.json`),
        "utf8",
      ),
    );
    activo.id = "mi-asistente";
    activo.origen = "propio";
    mkdirSync(path.join(raiz, "datos/privado/activos"), { recursive: true });
    writeFileSync(
      path.join(raiz, "datos/privado/activos/mi-asistente.json"),
      JSON.stringify(activo),
    );
    const plan = spawnSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        path.join(RAIZ, "src/cli/plan.ts"),
        "emitir",
        "mi-asistente",
        "--fecha",
        "2026-10-11",
      ],
      { cwd: raiz, encoding: "utf8" },
    );
    if (plan.status !== 0 && plan.status !== 1)
      throw new Error(
        `no se pudo emitir el plan: ${plan.stdout}${plan.stderr}`,
      );
    return raiz;
  }
  const raiz = raizConPropio();
  const args = (salida: string) => [
    "defectdojo",
    "mi-asistente",
    "--fecha",
    "2026-11-09",
    "--salida",
    salida,
  ];

  it("fuera de datos/privado/ (docs, out, la raíz) se rechaza y no escribe nada", () => {
    for (const salida of ["docs", "out", ".", "datos", "datos/exportacion"]) {
      const r = exportar(args(salida), raiz);
      expect(r.codigo, salida).toBe(3);
      expect(r.errores).toContain("datos/privado/");
      expect(
        existsSync(path.join(raiz, salida, "mi-asistente.defectdojo.json")),
      ).toBe(false);
    }
  });
  it("en datos/privado/ nace 0600 en una carpeta 0700", () => {
    const r = exportar(args("datos/privado/exportaciones"), raiz);
    expect(r.codigo).toBe(0);
    const carpeta = path.join(raiz, "datos/privado/exportaciones");
    const archivo = path.join(carpeta, "mi-asistente.defectdojo.json");
    expect(JSON.parse(readFileSync(archivo, "utf8"))).toEqual({ findings: [] });
    expect(modo(archivo)).toBe(0o600);
    expect(modo(carpeta)).toBe(0o700);
  });
  it("fuera del repositorio también se permite (lo escribe donde la persona lo pide)", () => {
    const fuera = mkdtempSync(path.join(tmpdir(), "hackguard-exportar-fuera-"));
    temporales.push(fuera);
    const r = exportar(args(path.join(fuera, "sub")), raiz);
    expect(r.codigo).toBe(0);
    expect(
      existsSync(path.join(fuera, "sub/mi-asistente.defectdojo.json")),
    ).toBe(true);
  });
});
