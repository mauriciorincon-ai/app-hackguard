// @vitest-environment node
// `plan replanear` como lo usa una persona: re-emite el plan desactualizado y ARCHIVA el anterior, jamás lo borra. Todo corre en una copia
// temporal de `datos/`: los planes versionados del repo no se tocan (el del clasificador debe seguir «desactualizado» para el demo).
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Plan } from "../../../src/engine/planificador/esquemas.ts";
import { huellaDelActivo } from "../../../src/engine/activos/historial.ts";
import { Activo } from "../../../src/engine/activos/esquemas.ts";
import { cargarPlanesEmitidos } from "../../../src/lib/evidencia/cargar-evidencia.ts";
import { ASISTENTE, CLASIFICADOR, RAIZ } from "./ayuda.ts";

const SCRIPT = path.join(RAIZ, "src/cli/plan.ts");
function correr(args: string[], cwd: string) {
  const r = spawnSync(
    process.execPath,
    ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", SCRIPT, ...args],
    { cwd, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
}

const temporales: string[] = [];
function copiaDeDatos() {
  const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-replan-"));
  temporales.push(raiz);
  for (const c of [
    "instantaneas",
    "activos",
    "planes",
    "historial",
    "planificador",
    "filtro",
  ])
    cpSync(path.join(RAIZ, "datos", c), path.join(raiz, "datos", c), {
      recursive: true,
    });
  return raiz;
}
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

const planDe = (raiz: string, id = CLASIFICADOR) =>
  readFileSync(path.join(raiz, `datos/planes/${id}.plan.json`), "utf8");
const FECHA = "2026-11-08";
const CLASIF = ["replanear", CLASIFICADOR, "--fecha", FECHA];

describe("replanear", () => {
  it("--sin-escribir muestra qué entra, sale y se queda con su causa, y no toca nada", () => {
    const raiz = copiaDeDatos();
    const antes = planDe(raiz);
    const r = correr([...CLASIF, "--sin-escribir"], raiz);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("ENTRAN (1)");
    expect(r.salida).toContain("PR-MD-DER-001  perfil del activo");
    expect(r.salida).toContain("No se escribió nada");
    expect(planDe(raiz)).toBe(antes);
    expect(existsSync(path.join(raiz, "datos/planes/anteriores"))).toBe(false);
  });

  it("en inglés", () => {
    const r = correr(
      [...CLASIF, "--sin-escribir", "--idioma", "en"],
      copiaDeDatos(),
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("ENTER (1)");
    expect(r.salida).toContain("asset profile");
    expect(r.salida).toContain("Nothing was written");
  });

  it("--json trae el re-plan y no escribe", () => {
    const r = correr([...CLASIF, "--sin-escribir", "--json"], copiaDeDatos());
    const j = JSON.parse(r.salida) as {
      replan: { entran: { prueba: string; causas: string[] }[] };
      escrito: unknown;
    };
    expect(j.replan.entran).toMatchObject([
      { prueba: "PR-MD-DER-001", causas: ["perfil"] },
    ]);
    expect(j.escrito).toBeNull();
  });

  it("--demo muestra el re-plan contra la instantánea demo y NUNCA escribe", () => {
    const raiz = copiaDeDatos();
    const antes = planDe(raiz);
    const r = correr([...CLASIF, "--demo"], raiz);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain(
      "PR-MD-DEMO-002  catálogo + perfil del activo (conjunta)",
    );
    expect(r.salida).toContain("PR-MD-INV-001  regla de aplicabilidad");
    expect(r.salida).toContain("-iso42001-A.6.2.2");
    expect(r.salida).toContain("No se escribió nada");
    expect(planDe(raiz)).toBe(antes);
  });

  it("emite el plan nuevo, ARCHIVA el anterior con sus bytes y deja el plan vigente", async () => {
    const raiz = copiaDeDatos();
    const antes = planDe(raiz);
    const planAntes = Plan.parse(JSON.parse(antes));
    const r = correr(CLASIF, raiz);
    expect(r.codigo).toBe(0);
    const corto = planAntes.huella.slice(0, 12);
    const archivo = path.join(raiz, "datos/planes/anteriores");
    expect(readdirSync(archivo).sort()).toEqual([
      `${CLASIFICADOR}.${corto}.paquete.json`,
      `${CLASIFICADOR}.${corto}.plan.json`,
    ]);
    expect(
      readFileSync(
        path.join(archivo, `${CLASIFICADOR}.${corto}.plan.json`),
        "utf8",
      ),
    ).toBe(antes);
    const nuevo = Plan.parse(JSON.parse(planDe(raiz)));
    expect(nuevo.huella).not.toBe(planAntes.huella);
    expect(nuevo.fecha_emision).toBe(FECHA);
    const v2 = Activo.parse(
      JSON.parse(
        readFileSync(
          path.join(raiz, `datos/activos/demo/${CLASIFICADOR}.json`),
          "utf8",
        ),
      ),
    );
    expect(nuevo.activo.huella).toBe(await huellaDelActivo(v2));
    expect(r.salida).toContain(
      `Archivado: datos/planes/anteriores/${CLASIFICADOR}.${corto}.plan.json`,
    );
    // El plan del activo que no cambió sigue siendo el mismo.
    expect(planDe(raiz, ASISTENTE)).toBe(planDe(RAIZ, ASISTENTE));
  });

  it("después de re-planear el plan está vigente: otra vez no hay nada que re-planear (código 2)", () => {
    const raiz = copiaDeDatos();
    expect(correr(CLASIF, raiz).codigo).toBe(0);
    const r = correr(CLASIF, raiz);
    expect(r.codigo).toBe(2);
    expect(r.errores).toContain("vigente");
  });

  it("el libro de evidencia lee el plan nuevo, no el archivado", async () => {
    const raiz = copiaDeDatos();
    correr(CLASIF, raiz);
    const planes = await cargarPlanesEmitidos(raiz, { privados: false });
    expect(planes[CLASIFICADOR]!.plan.fecha_emision).toBe(FECHA);
    expect(Object.keys(planes).sort()).toEqual([ASISTENTE, CLASIFICADOR]);
  });

  it("un archivo archivado con otro contenido no se sobrescribe y el plan no se toca (código 3)", () => {
    const raiz = copiaDeDatos();
    const antes = planDe(raiz);
    const corto = Plan.parse(JSON.parse(antes)).huella.slice(0, 12);
    const archivo = path.join(raiz, "datos/planes/anteriores");
    mkdirSync(archivo, { recursive: true });
    writeFileSync(
      path.join(archivo, `${CLASIFICADOR}.${corto}.plan.json`),
      "otro contenido",
    );
    const r = correr(CLASIF, raiz);
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("no se sobrescribe");
    expect(planDe(raiz)).toBe(antes);
  });

  it("una fórmula distinta de la que los planes citaron rompe la carga y no escribe (código 3); el motor la nombra aparte", () => {
    const raiz = copiaDeDatos();
    const ruta = path.join(raiz, "datos/planificador/formula.json");
    const f = JSON.parse(readFileSync(ruta, "utf8")) as { techo: number };
    f.techo = f.techo === 10 ? 9 : f.techo + 1;
    writeFileSync(ruta, JSON.stringify(f));
    const antes = planDe(raiz);
    const r = correr(CLASIF, raiz);
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("la fórmula o los entornos cambiaron");
    expect(planDe(raiz)).toBe(antes);
    expect(existsSync(path.join(raiz, "datos/planes/anteriores"))).toBe(false);
  });

  it("el activo con el plan vigente no se re-planea (código 2)", () => {
    const r = correr(
      ["replanear", ASISTENTE, "--fecha", FECHA],
      copiaDeDatos(),
    );
    expect(r.codigo).toBe(2);
    expect(r.errores).toContain("no hay nada que re-planear");
  });

  it("errores de uso: sin id, sin fecha, activo que no existe, fecha anterior a la instantánea (código 3)", () => {
    const raiz = copiaDeDatos();
    expect(correr(["replanear"], raiz).codigo).toBe(3);
    expect(correr(["replanear", CLASIFICADOR], raiz).codigo).toBe(3);
    expect(
      correr(["replanear", "no-existe", "--fecha", FECHA], raiz).codigo,
    ).toBe(3);
    const r = correr(
      ["replanear", CLASIFICADOR, "--fecha", "2026-10-01"],
      raiz,
    );
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("anterior a la instantánea");
  });
});
