// @vitest-environment node
// La carga por lotes como la usa una persona, en una raíz de juguete con un activo PROPIO: importar el reporte de garak
// y el de ZAP → el lote nace sin confirmar y no cuenta → confirmarlo separando las fallas → los sobres del lote cuentan →
// confirmar las separadas con su severidad abre sus hallazgos. Y los rechazos. Lo propio nace privado (0600 / 0700) y el
// archivo de la herramienta no queda en ningún archivo (reglas duras 4 y 8).
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sha256 } from "../../../src/engine/huella.ts";
import { ASISTENTE, RAIZ } from "../evidencia/ayuda.ts";

const FECHA_DEL_PLAN = "2026-10-11";
const CRUDO_SECRETO = "SALIDA-CRUDA-SECRETA token=abc123 respuesta completa";
const FIXTURES = path.join(RAIZ, "tests/fixtures/adaptadores");

function correr(script: string, args: string[], cwd: string) {
  const r = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      path.join(RAIZ, "src/cli", script),
      ...args,
    ],
    { cwd, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
}
const evidencia = (args: string[], cwd: string) =>
  correr("evidencia.ts", args, cwd);

const temporales: string[] = [];
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

/** Una raíz de juguete: la instantánea, los datos del libro y un activo propio con su plan emitido. */
function raizConPropio() {
  const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-lotes-"));
  temporales.push(raiz);
  for (const c of ["instantaneas", "filtro", "planificador", "severidad"])
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
  const plan = correr(
    "plan.ts",
    ["emitir", "mi-asistente", "--fecha", FECHA_DEL_PLAN],
    raiz,
  );
  if (plan.codigo !== 0 && plan.codigo !== 1)
    throw new Error(`no se pudo emitir el plan: ${plan.salida}${plan.errores}`);
  return raiz;
}

const modo = (ruta: string) => statSync(ruta).mode & 0o777;
const leer = (raiz: string, relativa: string) =>
  readFileSync(path.join(raiz, relativa), "utf8");
const json = (raiz: string, relativa: string) =>
  JSON.parse(leer(raiz, relativa)) as Record<string, unknown> & {
    confirmacion: Record<string, unknown> | null;
  };
const todosLosArchivos = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? todosLosArchivos(path.join(d, e.name))
      : [path.join(d, e.name)],
  );

/** El reporte de garak de la fixture con un texto secreto en cada línea: el que ningún archivo propio debe guardar. */
function reporteDeGarak(raiz: string) {
  const lineas = readFileSync(
    path.join(FIXTURES, "garak-0.17.0.report.redactado.jsonl"),
    "utf8",
  )
    .split("\n")
    .filter(Boolean)
    .map((l) => ({ ...JSON.parse(l), salida_cruda_secreta: CRUDO_SECRETO }));
  const ruta = path.join(raiz, "garak.report.jsonl");
  writeFileSync(ruta, lineas.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return ruta;
}
function reporteDeZap(raiz: string) {
  const r = JSON.parse(
    readFileSync(
      path.join(FIXTURES, "zap-traditional-json-plus.derivada.json"),
      "utf8",
    ),
  );
  r.salida_cruda_secreta = CRUDO_SECRETO;
  const ruta = path.join(raiz, "zap.report.json");
  writeFileSync(ruta, JSON.stringify(r));
  return ruta;
}

const IA = ["--impacto", "3", "--alcance", "2", "--detectabilidad", "3"];

describe("la cadena entera de la carga, con un activo propio", () => {
  const raiz = raizConPropio();
  const garak = reporteDeGarak(raiz);
  const zap = reporteDeZap(raiz);
  const L1 = "datos/privado/lotes/LOTE-0001.json";
  const L2 = "datos/privado/lotes/LOTE-0002.json";

  it("1 · importar garak: un lote y tres sobres propuestos, 0600 en carpetas 0700, y sin el archivo de la herramienta", async () => {
    const r = evidencia(
      [
        "importar",
        "--garak",
        garak,
        "--activo",
        "mi-asistente",
        "--por",
        "Ana",
        "--zona",
        "America/Bogota",
      ],
      raiz,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("Lote LOTE-0001 armado");
    expect(r.salida).toContain(
      "3 sobres (2 fallidas, 0 parciales, 0 no ejecutadas, 1 superadas), SIN confirmar",
    );
    expect(r.salida).toContain("Se revisan siempre 2 y 1 de los otros 1");
    expect(modo(path.join(raiz, L1))).toBe(0o600);
    expect(modo(path.dirname(path.join(raiz, L1)))).toBe(0o700);
    const lote = json(raiz, L1);
    expect(lote).toMatchObject({
      id: "LOTE-0001",
      origen: "propio",
      activo: "mi-asistente",
      confirmacion: null,
      ejecutado_por: "Ana",
      zona_horaria: "America/Bogota",
      archivo: { nombre: "garak.report.jsonl" },
    });
    // La huella del archivo es la de sus bytes; todo sobre suyo lleva esa misma huella de crudo.
    const huellaDelArchivo = await sha256(readFileSync(garak, "utf8"));
    expect((lote.huellas as { archivo: string }).archivo).toBe(
      huellaDelArchivo,
    );
    for (const id of ["SOB-0001", "SOB-0002", "SOB-0003"]) {
      const s = json(raiz, `datos/privado/evidencia/${id}.json`);
      expect(modo(path.join(raiz, `datos/privado/evidencia/${id}.json`))).toBe(
        0o600,
      );
      expect(s).toMatchObject({ origen: "propio", confirmacion: null });
      expect((s.huellas as { crudo: string }).crudo).toBe(huellaDelArchivo);
    }
    // Nada de lo que la CLI escribió lleva el texto del archivo de la herramienta.
    for (const f of todosLosArchivos(path.join(raiz, "datos/privado"))) {
      const t = readFileSync(f, "utf8");
      expect(t, f).not.toContain("SALIDA-CRUDA");
      expect(t, f).not.toContain("abc123");
      expect(t, f).not.toContain("<texto-de-probe>");
    }
  });

  it("2 · el lote por confirmar valida, y sus sobres no cuentan para ningún hallazgo", () => {
    const r = evidencia(["validar", "--json"], raiz);
    expect(r.codigo).toBe(0);
    const j = JSON.parse(r.salida);
    expect(j.sobres.validos).toEqual(["SOB-0001", "SOB-0002", "SOB-0003"]);
    expect(j.lotes.validos).toEqual(["LOTE-0001"]);
    expect(j.hallazgos.validos).toEqual([]);
  });

  it("3 · el mismo archivo no se importa dos veces (2)", () => {
    const r = evidencia(
      [
        "importar",
        "--garak",
        garak,
        "--activo",
        "mi-asistente",
        "--por",
        "Ana",
        "--zona",
        "UTC",
      ],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("ya se importó como LOTE-0001");
  });

  it("4 · confirmar el lote sin separar sus fallas lo bloquea (2) y no escribe nada", () => {
    const antes = leer(raiz, L1);
    const sin = evidencia(
      ["confirmar-lote", "LOTE-0001", "--por", "Ana", "--fecha", "2026-10-13"],
      raiz,
    );
    expect(sin.codigo).toBe(2);
    expect(sin.salida).toContain("abrirían un hallazgo");
    expect(sin.salida).toContain("SOB-0001, SOB-0003");
    // Separar solo una no basta: la otra sigue abriendo.
    const una = evidencia(
      [
        "confirmar-lote",
        "LOTE-0001",
        "--por",
        "Ana",
        "--fecha",
        "2026-10-13",
        "--separar",
        "SOB-0001",
      ],
      raiz,
    );
    expect(una.codigo).toBe(2);
    expect(una.salida).toContain("SOB-0003");
    expect(leer(raiz, L1)).toBe(antes);
  });

  it("5 · solo se separan fallidas y parciales; no se confirma antes de la corrida; las dos formas no van juntas", () => {
    const antes = leer(raiz, L1);
    const base = ["confirmar-lote", "LOTE-0001", "--por", "Ana"];
    const noEsFalla = evidencia(
      [...base, "--fecha", "2026-10-13", "--separar", "SOB-0002"],
      raiz,
    );
    expect(noEsFalla.codigo).toBe(2);
    expect(noEsFalla.salida).toContain("Solo se separan fallidas y parciales");
    const temprano = evidencia(
      [
        ...base,
        "--fecha",
        "2026-01-01",
        "--separar",
        "SOB-0001",
        "--separar",
        "SOB-0003",
      ],
      raiz,
    );
    expect(temprano.codigo).toBe(2);
    expect(temprano.salida).toContain("anterior a la corrida");
    const juntas = evidencia(
      [
        ...base,
        "--fecha",
        "2026-10-13",
        "--separar",
        "SOB-0001",
        "--revisar-uno-por-uno",
      ],
      raiz,
    );
    expect(juntas.codigo).toBe(3);
    const fantasma = evidencia(
      ["confirmar-lote", "LOTE-0099", "--por", "Ana", "--fecha", "2026-10-13"],
      raiz,
    );
    expect(fantasma.codigo).toBe(3);
    expect(leer(raiz, L1)).toBe(antes);
  });

  it("6 · separando las dos fallas el lote se confirma: sus sobres no cambian de archivo y el lote conserva su semilla", () => {
    const sobresAntes = ["SOB-0001", "SOB-0002", "SOB-0003"].map((id) =>
      leer(raiz, `datos/privado/evidencia/${id}.json`),
    );
    const semilla = (json(raiz, L1).huellas as { lote: string }).lote;
    const r = evidencia(
      [
        "confirmar-lote",
        "LOTE-0001",
        "--por",
        "Ana",
        "--fecha",
        "2026-10-13",
        "--separar",
        "SOB-0001",
        "--separar",
        "SOB-0003",
      ],
      raiz,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain(
      "Lote LOTE-0001 confirmado por Ana el 2026-10-13: 1 sobres cuentan desde hoy; 2 se confirman uno por uno (SOB-0001, SOB-0003)",
    );
    const lote = json(raiz, L1);
    expect(lote.confirmacion).toEqual({
      por: "Ana",
      fecha: "2026-10-13",
      decision: "confirmado",
      revisados: ["SOB-0001", "SOB-0002", "SOB-0003"],
      separados: ["SOB-0001", "SOB-0003"],
    });
    expect((lote.huellas as { lote: string }).lote).toBe(semilla);
    expect(modo(path.join(raiz, L1))).toBe(0o600);
    expect(
      ["SOB-0001", "SOB-0002", "SOB-0003"].map((id) =>
        leer(raiz, `datos/privado/evidencia/${id}.json`),
      ),
    ).toEqual(sobresAntes);
  });

  it("7 · un lote decidido es inmutable (2)", () => {
    const r = evidencia(
      [
        "confirmar-lote",
        "LOTE-0001",
        "--por",
        "Otra",
        "--fecha",
        "2026-10-14",
        "--revisar-uno-por-uno",
      ],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("inmutable");
    expect(json(raiz, L1).confirmacion).toMatchObject({ por: "Ana" });
  });

  it("8 · el sobre que el lote confirmó no se confirma otra vez (2); los separados, uno por uno y con severidad", () => {
    const yaPorLote = evidencia(
      ["confirmar", "SOB-0002", "--por", "Ana", "--fecha", "2026-10-13"],
      raiz,
    );
    expect(yaPorLote.codigo).toBe(2);
    expect(yaPorLote.salida).toContain("ya lo confirmó el lote LOTE-0001");

    const sinSeveridad = evidencia(
      ["confirmar", "SOB-0001", "--por", "Ana", "--fecha", "2026-10-13"],
      raiz,
    );
    expect(sinSeveridad.codigo).toBe(3);
    expect(
      json(raiz, "datos/privado/evidencia/SOB-0001.json").confirmacion,
    ).toBeNull();

    const a = evidencia(
      ["confirmar", "SOB-0001", "--por", "Ana", "--fecha", "2026-10-13", ...IA],
      raiz,
    );
    expect(a.codigo).toBe(0);
    expect(a.salida).toContain("Se abre el hallazgo HZ-0001");
    const b = evidencia(
      ["confirmar", "SOB-0003", "--por", "Ana", "--fecha", "2026-10-13", ...IA],
      raiz,
    );
    expect(b.codigo).toBe(0);
    expect(b.salida).toContain("Se abre el hallazgo HZ-0002");
    expect(
      json(raiz, "datos/privado/evidencia/SOB-0001.json").confirmacion,
    ).toEqual({ por: "Ana", fecha: "2026-10-13", modo: "individual" });
    expect(json(raiz, "datos/privado/hallazgos/HZ-0001.json")).toMatchObject({
      sobre_origen: "SOB-0001",
      origen: "propio",
    });
  });

  it("9 · confirmar a los separados no rompe al lote: todo valida", () => {
    const r = evidencia(["validar", "--json"], raiz);
    expect(r.codigo).toBe(0);
    const j = JSON.parse(r.salida);
    expect(j.lotes.validos).toEqual(["LOTE-0001"]);
    expect(j.hallazgos.validos).toEqual(["HZ-0001", "HZ-0002"]);
    const h = evidencia(["hallazgos-listar", "--fecha", "2026-10-14"], raiz);
    expect(h.salida).toContain("HZ-0001");
    expect(h.salida).toContain("HZ-0002");
  });

  it("10 · importar zap: seis sobres, una fallida, una no ejecutada, sin zona porque el reporte la trae", () => {
    const r = evidencia(
      ["importar", "--zap", zap, "--activo", "mi-asistente", "--por", "Ana"],
      raiz,
    );
    expect([0, 1]).toContain(r.codigo);
    expect(r.salida).toContain("Lote LOTE-0002 armado");
    expect(r.salida).toContain(
      "6 sobres (1 fallidas, 0 parciales, 1 no ejecutadas, 4 superadas), SIN confirmar",
    );
    expect(json(raiz, L2)).toMatchObject({
      herramienta: { id: "zap", version: "2.17.0" },
      zona_horaria: "UTC",
      confirmacion: null,
    });
    expect(modo(path.join(raiz, L2))).toBe(0o600);
    for (const f of todosLosArchivos(path.join(raiz, "datos/privado"))) {
      const t = readFileSync(f, "utf8");
      expect(t, f).not.toContain("SALIDA-CRUDA");
      expect(t, f).not.toContain("ATAQUE-MARCADOR");
      expect(t, f).not.toContain("CUERPO-DE-PETICION");
    }
  });

  it("11 · «revisar uno por uno» deja el lote decidido sin confirmar a nadie", () => {
    const r = evidencia(
      [
        "confirmar-lote",
        "LOTE-0002",
        "--por",
        "Ana",
        "--fecha",
        "2026-10-14",
        "--revisar-uno-por-uno",
      ],
      raiz,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("enviado a revisión individual");
    expect(r.salida).toContain("0 sobres cuentan desde hoy");
    expect(json(raiz, L2).confirmacion).toMatchObject({
      decision: "a_revision_individual",
      revisados: [],
      separados: [],
    });
    const v = evidencia(["validar", "--json"], raiz);
    expect(v.codigo).toBe(0);
    expect(JSON.parse(v.salida).lotes.validos).toEqual([
      "LOTE-0001",
      "LOTE-0002",
    ]);
    // Ninguno de los sobres de ZAP cuenta: el hallazgo de su fallida no se abre solo.
    expect(JSON.parse(v.salida).hallazgos.validos).toEqual([
      "HZ-0001",
      "HZ-0002",
    ]);
  });

  it("12 · el CLI en inglés dice lo mismo", () => {
    const r = evidencia(["validar", "--idioma", "en"], raiz);
    expect(r.codigo).toBe(0);
    expect(r.salida).toMatch(/Batches/);
  });
});

describe("importar: lo que se rechaza", () => {
  const raiz = raizConPropio();
  // La raíz de juguete también tiene el activo demo, para comprobar que no recibe archivos reales.
  mkdirSync(path.join(raiz, "datos/activos/demo"), { recursive: true });
  cpSync(
    path.join(RAIZ, `datos/activos/demo/${ASISTENTE}.json`),
    path.join(raiz, `datos/activos/demo/${ASISTENTE}.json`),
  );
  const garak = reporteDeGarak(raiz);
  const base = ["--por", "Ana"];

  it("un activo demo no recibe archivos reales de una herramienta (2)", () => {
    const r = evidencia(
      [
        "importar",
        "--garak",
        garak,
        "--activo",
        ASISTENTE,
        ...base,
        "--zona",
        "UTC",
      ],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("Un activo demo no recibe archivos reales");
    expect(readdirSync(path.join(raiz, "datos")).includes("lotes")).toBe(false);
  });

  it("un activo que no existe, y las banderas que faltan, son de uso (3)", () => {
    expect(
      evidencia(
        [
          "importar",
          "--garak",
          garak,
          "--activo",
          "no-existe",
          ...base,
          "--zona",
          "UTC",
        ],
        raiz,
      ).codigo,
    ).toBe(3);
    expect(
      evidencia(["importar", "--garak", garak, ...base, "--zona", "UTC"], raiz)
        .codigo,
    ).toBe(3);
    expect(
      evidencia(["importar", "--activo", "mi-asistente", ...base], raiz).codigo,
    ).toBe(3);
    expect(
      evidencia(
        [
          "importar",
          "--garak",
          garak,
          "--zap",
          garak,
          "--activo",
          "mi-asistente",
          ...base,
        ],
        raiz,
      ).codigo,
    ).toBe(3);
    // garak no declara su zona horaria: sin --zona no se inventa una.
    const sinZona = evidencia(
      ["importar", "--garak", garak, "--activo", "mi-asistente", ...base],
      raiz,
    );
    expect(sinZona.codigo).toBe(3);
    expect(sinZona.errores).toContain("--zona");
  });

  it("un archivo que no es del formato no arma ningún lote (2) y no escribe nada", () => {
    const basura = path.join(raiz, "basura.jsonl");
    writeFileSync(basura, '{"esto":"no es un reporte de garak"}\n');
    const r = evidencia(
      [
        "importar",
        "--garak",
        basura,
        "--activo",
        "mi-asistente",
        ...base,
        "--zona",
        "UTC",
      ],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("No se armó ningún lote");
    const zapMalo = path.join(raiz, "zap-malo.json");
    writeFileSync(zapMalo, "{}");
    expect(
      evidencia(
        ["importar", "--zap", zapMalo, "--activo", "mi-asistente", ...base],
        raiz,
      ).codigo,
    ).toBe(2);
    expect(readdirSync(path.join(raiz, "datos/privado")).sort()).toEqual([
      "activos",
      "planes",
    ]);
  });

  it("con --fecha y --zona el reporte de garak se importa en otra zona, y la fecha dada manda solo si el reporte no la trae", () => {
    const r = evidencia(
      [
        "importar",
        "--garak",
        garak,
        "--activo",
        "mi-asistente",
        ...base,
        "--zona",
        "Europe/Madrid",
        "--fecha",
        "2030-01-01",
      ],
      raiz,
    );
    expect([0, 1]).toContain(r.codigo);
    const lote = json(raiz, "datos/privado/lotes/LOTE-0001.json");
    expect(lote.zona_horaria).toBe("Europe/Madrid");
    // El reporte de garak trae su fecha: --fecha no la pisa.
    expect(lote.fecha).not.toBe("2030-01-01");
  });
});
