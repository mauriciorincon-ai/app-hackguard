// @vitest-environment node
// `plan replanear` como lo usa una persona: re-emite el plan desactualizado y ARCHIVA el anterior, jamás lo borra. Todo corre en una copia
// temporal de `datos/`: los planes versionados del repo no se tocan (el del clasificador debe seguir «desactualizado» para el demo).
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
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

  it("--json bloqueado imprime el motivo como JSON en stdout (código 2) y nada en stderr", () => {
    const r = correr(
      ["replanear", ASISTENTE, "--fecha", FECHA, "--json"],
      copiaDeDatos(),
    );
    expect(r.codigo).toBe(2);
    expect(r.errores).toBe("");
    const j = JSON.parse(r.salida) as {
      bloqueado: boolean;
      codigo: number;
      motivo: string;
    };
    expect(j.bloqueado).toBe(true);
    expect(j.codigo).toBe(2);
    expect(j.motivo).toContain("no hay nada que re-planear");
    expect(j.motivo).toContain("there is nothing to re-plan");
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
    expect(r.errores).toContain("anterior a la emisión del plan que sustituye");
    // Con la base demo (instantánea del 2026-11-01), una fecha posterior al plan pero anterior a la instantánea también es de quien la pide.
    const demo = correr(
      ["replanear", CLASIFICADOR, "--fecha", "2026-10-20", "--demo"],
      raiz,
    );
    expect(demo.codigo).toBe(3);
    expect(demo.errores).toContain("anterior a la instantánea");
  });
});

// Deuda del S10 (#9): `--salida` se honra, y un activo propio de `datos/privado/` se re-planea con derivados 700/600 (regla 17-bis).
describe("replanear con --salida y con un activo propio", () => {
  const PROPIO = "act-propio-prueba";
  const modoDe = (ruta: string) => statSync(ruta).mode & 0o777;

  /** Un activo propio de mentira, hecho de los dos del clasificador demo: v1 con su plan emitido y v2 vigente, historial privado. */
  async function raizConPropio() {
    const raiz = copiaDeDatos();
    const leer = (r: string) =>
      JSON.parse(readFileSync(path.join(raiz, r), "utf8")) as Record<
        string,
        unknown
      >;
    const historial = leer(`datos/historial/activos/${CLASIFICADOR}.json`) as {
      anteriores: { activo: Record<string, unknown> }[];
    };
    const comoPropio = (a: Record<string, unknown>) =>
      Activo.parse({ ...a, id: PROPIO, origen: "propio" });
    const v1 = comoPropio(historial.anteriores[0]!.activo);
    const v2 = comoPropio(leer(`datos/activos/demo/${CLASIFICADOR}.json`));
    const privado = (r: string, contenido: unknown) => {
      const ruta = path.join(raiz, "datos/privado", r);
      mkdirSync(path.dirname(ruta), { recursive: true });
      writeFileSync(ruta, `${JSON.stringify(contenido, null, 2)}\n`);
    };
    privado(`activos/${PROPIO}.json`, v1);
    const emitido = correr(
      ["emitir", PROPIO, "--fecha", "2026-10-12", "--json"],
      raiz,
    );
    expect(emitido.codigo).toBe(0);
    privado(`activos/${PROPIO}.json`, v2);
    privado(`historial/activos/${PROPIO}.json`, {
      formato: "hackguard/historial-de-activo@1",
      activo: PROPIO,
      nota: { es: "Prueba.", en: "Test." },
      anteriores: [
        {
          n: 1,
          fecha: "2026-10-12",
          huella: await huellaDelActivo(v1),
          cambio: { es: "Primera.", en: "First." },
          activo: v1,
        },
      ],
      actual: {
        n: 2,
        fecha: "2026-11-01",
        huella: await huellaDelActivo(v2),
        cambio: { es: "Segunda.", en: "Second." },
      },
    });
    return raiz;
  }
  const argumentos = ["replanear", PROPIO, "--fecha", FECHA];

  it("un activo propio se re-planea: el plan nuevo y el archivado quedan en datos/privado/ con carpetas 700 y archivos 600", async () => {
    const raiz = await raizConPropio();
    const privada = path.join(raiz, "datos/privado/planes");
    // El plan emitido para un activo propio ya nació privado; se abre a propósito para ver que el re-plan lo vuelve a cerrar.
    chmodSync(privada, 0o755);
    const r = correr(argumentos, raiz);
    expect(r.codigo).toBe(0);
    expect(r.errores).toBe("");
    expect(
      Plan.parse(
        JSON.parse(
          readFileSync(path.join(privada, `${PROPIO}.plan.json`), "utf8"),
        ),
      ).fecha_emision,
    ).toBe(FECHA);
    const archivo = path.join(privada, "anteriores");
    expect(readdirSync(archivo)).toHaveLength(2);
    expect(modoDe(privada)).toBe(0o700);
    expect(modoDe(archivo)).toBe(0o700);
    for (const f of [
      path.join(privada, `${PROPIO}.plan.json`),
      path.join(privada, `${PROPIO}.paquete.json`),
      ...readdirSync(archivo).map((n) => path.join(archivo, n)),
    ])
      expect(modoDe(f), f).toBe(0o600);
    // Nada de un activo propio llega a la carpeta pública.
    expect(
      existsSync(path.join(raiz, `datos/planes/${PROPIO}.plan.json`)),
    ).toBe(false);
    expect(existsSync(path.join(raiz, "datos/planes/anteriores"))).toBe(false);
    // El libro de evidencia lee el plan nuevo del activo propio, no el archivado.
    const planes = await cargarPlanesEmitidos(raiz);
    expect(planes[PROPIO]!.plan.fecha_emision).toBe(FECHA);
  });

  it("el plan de un activo propio no se escribe dentro del repo fuera de datos/privado/ (código 3, nada escrito)", async () => {
    const raiz = await raizConPropio();
    const antes = readFileSync(
      path.join(raiz, `datos/privado/planes/${PROPIO}.plan.json`),
      "utf8",
    );
    mkdirSync(path.join(raiz, "docs"));
    const r = correr([...argumentos, "--salida", "docs"], raiz);
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("solo se escribe en datos/privado/");
    expect(existsSync(path.join(raiz, "docs", `${PROPIO}.plan.json`))).toBe(
      false,
    );
    expect(
      readFileSync(
        path.join(raiz, `datos/privado/planes/${PROPIO}.plan.json`),
        "utf8",
      ),
    ).toBe(antes);
  });

  it("--salida a otra carpeta de datos/privado/ se honra: el plan nuevo va allí, el anterior sigue donde estaba y no se archiva nada", async () => {
    const raiz = await raizConPropio();
    const origen = path.join(raiz, `datos/privado/planes/${PROPIO}.plan.json`);
    const antes = readFileSync(origen, "utf8");
    const r = correr(
      [...argumentos, "--salida", "datos/privado/otros-planes"],
      raiz,
    );
    expect(r.errores).toBe("");
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("no se reemplazó nada");
    expect(r.salida).toContain(
      `Escrito: datos/privado/otros-planes/${PROPIO}.plan.json`,
    );
    const destino = path.join(raiz, "datos/privado/otros-planes");
    expect(
      Plan.parse(
        JSON.parse(
          readFileSync(path.join(destino, `${PROPIO}.plan.json`), "utf8"),
        ),
      ).fecha_emision,
    ).toBe(FECHA);
    expect(modoDe(destino)).toBe(0o700);
    expect(modoDe(path.join(destino, `${PROPIO}.plan.json`))).toBe(0o600);
    expect(readFileSync(origen, "utf8")).toBe(antes);
    expect(existsSync(path.join(raiz, "datos/privado/planes/anteriores"))).toBe(
      false,
    );
  });

  it("--salida con un activo demo: el plan nuevo va a esa carpeta y el versionado no se toca", () => {
    const raiz = copiaDeDatos();
    const antes = planDe(raiz);
    const r = correr([...CLASIF, "--salida", "salida-aparte"], raiz);
    expect(r.codigo).toBe(0);
    expect(planDe(raiz)).toBe(antes);
    expect(existsSync(path.join(raiz, "datos/planes/anteriores"))).toBe(false);
    expect(
      Plan.parse(
        JSON.parse(
          readFileSync(
            path.join(raiz, `salida-aparte/${CLASIFICADOR}.plan.json`),
            "utf8",
          ),
        ),
      ).fecha_emision,
    ).toBe(FECHA);
    expect(
      modoDe(path.join(raiz, `salida-aparte/${CLASIFICADOR}.plan.json`)),
    ).toBe(0o644);
  });

  it("una carpeta de salida sin permiso lo dice (código 3) y no deja nada a medias", async () => {
    if (process.getuid?.() === 0) return; // root escribe donde sea: no hay permiso que probar
    const raiz = copiaDeDatos();
    const cerrada = path.join(raiz, "cerrada");
    mkdirSync(cerrada, { mode: 0o500 });
    const antes = planDe(raiz);
    const r = correr([...CLASIF, "--salida", "cerrada/dentro"], raiz);
    chmodSync(cerrada, 0o700);
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("falta permiso");
    expect(planDe(raiz)).toBe(antes);
    expect(existsSync(path.join(raiz, "cerrada/dentro"))).toBe(false);
  });

  it("una carpeta de salida con un plan ajeno de otro contenido no se pisa (código 3)", () => {
    const raiz = copiaDeDatos();
    mkdirSync(path.join(raiz, "salida-aparte"));
    writeFileSync(
      path.join(raiz, `salida-aparte/${CLASIFICADOR}.plan.json`),
      "ajeno",
    );
    const r = correr([...CLASIF, "--salida", "salida-aparte"], raiz);
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("no se sobrescribe");
    expect(
      readFileSync(
        path.join(raiz, `salida-aparte/${CLASIFICADOR}.plan.json`),
        "utf8",
      ),
    ).toBe("ajeno");
  });
});
