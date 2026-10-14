// @vitest-environment node
// El CLI del libro como lo usa una persona. La cadena entera por línea de comandos, en una raíz de juguete con un
// activo PROPIO: registrar → confirmar → hallazgo → corrección → re-prueba que falla → re-prueba válida → cerrado;
// y los rechazos: cerrar a mano, confirmar dos veces, una herramienta que el paquete no fija. Lo propio nace
// privado (archivos 0600, carpetas 0700) y el crudo de la herramienta no queda en ningún archivo (regla dura 4).
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
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
import { ASISTENTE, copia, RAIZ } from "./ayuda.ts";

const FECHA_DEL_PLAN = "2026-10-11";

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

/** Una raíz de juguete con la instantánea, el filtro, el planificador y un activo propio con su plan emitido. */
function raizConPropio() {
  const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-evidencia-"));
  temporales.push(raiz);
  for (const c of ["instantaneas", "filtro", "planificador", "severidad"])
    cpSync(path.join(RAIZ, "datos", c), path.join(raiz, "datos", c), {
      recursive: true,
    });
  // Los plazos son datos del libro; los hallazgos demo NO viajan: la raíz de juguete solo tiene lo propio.
  mkdirSync(path.join(raiz, "datos/hallazgos"), { recursive: true });
  cpSync(
    path.join(RAIZ, "datos/hallazgos/plazos.json"),
    path.join(raiz, "datos/hallazgos/plazos.json"),
  );
  // El plan de muestreo de los lotes también es un dato del libro.
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

const CRUDO =
  "SALIDA-CRUDA-SECRETA-DE-LA-HERRAMIENTA token=abc123 respuesta completa del modelo";
function resultado(
  raiz: string,
  nombre: string,
  cambios: Record<string, unknown> = {},
) {
  const base = {
    activo: "mi-asistente",
    prueba: "PR-IA-PINJ-001",
    herramienta: { id: "garak", version: "0.17.0" },
    fecha: "2026-10-12",
    zona_horaria: "America/Bogota",
    ejecutado_por: "Ana",
    resultado: {
      ejecutada: true,
      evaluadas: 20,
      fallidas: 6,
      alertas: null,
      metrica: null,
    },
  };
  const ruta = path.join(raiz, nombre);
  writeFileSync(ruta, JSON.stringify({ ...base, ...cambios }));
  writeFileSync(path.join(raiz, "crudo.txt"), CRUDO);
  return ruta;
}
const registrar = (
  raiz: string,
  nombre: string,
  cambios: Record<string, unknown> = {},
) =>
  evidencia(
    [
      "registrar",
      resultado(raiz, nombre, cambios),
      "--crudo",
      path.join(raiz, "crudo.txt"),
    ],
    raiz,
  );
const modo = (ruta: string) => statSync(ruta).mode & 0o777;
const leer = (raiz: string, relativa: string) =>
  readFileSync(path.join(raiz, relativa), "utf8");

describe("la cadena entera, con un activo propio", () => {
  const raiz = raizConPropio();
  const IA = ["--impacto", "3", "--alcance", "2", "--detectabilidad", "3"];

  it("1 · registrar: un sobre propuesto, sin confirmar, 0600 en una carpeta 0700, sin el crudo", async () => {
    const r = registrar(raiz, "r1.json");
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("SOB-0001");
    expect(r.salida).toContain("SIN confirmar");
    const ruta = path.join(raiz, "datos/privado/evidencia/SOB-0001.json");
    expect(modo(ruta)).toBe(0o600);
    expect(modo(path.dirname(ruta))).toBe(0o700);
    const s = JSON.parse(readFileSync(ruta, "utf8"));
    expect(s).toMatchObject({
      id: "SOB-0001",
      origen: "propio",
      veredicto: "fallida",
      confirmacion: null,
      k: 20,
    });
    expect(s.huellas.crudo).toBe(await sha256(CRUDO));
    // El crudo no está en NINGÚN archivo que la CLI escribió.
    for (const carpeta of ["datos/privado"]) {
      const todos = (function recorrer(d: string): string[] {
        return readdirSync(d, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory()
            ? recorrer(path.join(d, e.name))
            : [path.join(d, e.name)],
        );
      })(path.join(raiz, carpeta));
      for (const f of todos) {
        const texto = readFileSync(f, "utf8");
        expect(texto, f).not.toContain("SALIDA-CRUDA");
        expect(texto, f).not.toContain("abc123");
      }
    }
  });

  it("2 · el libro con un sobre propuesto valida (0) y la propuesta no cuenta", () => {
    const r = evidencia(["validar", "--json"], raiz);
    expect(r.codigo).toBe(0);
    const j = JSON.parse(r.salida);
    expect(j.sobres.validos).toEqual(["SOB-0001"]);
    expect(j.hallazgos.validos).toEqual([]);
  });

  it("3 · confirmar una falla pide la severidad ANTES de escribir nada (3), y con ella abre el hallazgo", () => {
    const sin = evidencia(
      ["confirmar", "SOB-0001", "--por", "Ana", "--fecha", "2026-10-12"],
      raiz,
    );
    expect(sin.codigo).toBe(3);
    expect(sin.errores).toContain("--impacto");
    expect(
      JSON.parse(leer(raiz, "datos/privado/evidencia/SOB-0001.json"))
        .confirmacion,
    ).toBeNull();
    expect(existsSync(path.join(raiz, "datos/privado/hallazgos"))).toBe(false);

    const con = evidencia(
      ["confirmar", "SOB-0001", "--por", "Ana", "--fecha", "2026-10-12", ...IA],
      raiz,
    );
    expect(con.codigo).toBe(0);
    expect(con.salida).toContain("confirmado por Ana");
    expect(con.salida).toContain("Se abre el hallazgo HZ-0001");
    expect(
      JSON.parse(leer(raiz, "datos/privado/evidencia/SOB-0001.json"))
        .confirmacion,
    ).toEqual({ por: "Ana", fecha: "2026-10-12", modo: "individual" });
    const h = path.join(raiz, "datos/privado/hallazgos/HZ-0001.json");
    expect(modo(h)).toBe(0o600);
    expect(modo(path.dirname(h))).toBe(0o700);
    expect(JSON.parse(readFileSync(h, "utf8"))).toMatchObject({
      id: "HZ-0001",
      origen: "propio",
      sobre_origen: "SOB-0001",
      severidad: { tipo: "escala_ia", impacto: 3 },
      eventos: [],
    });
  });

  it("4 · la evidencia confirmada es inmutable: no se confirma otra vez (2)", () => {
    const r = evidencia(
      [
        "confirmar",
        "SOB-0001",
        "--por",
        "Otra",
        "--fecha",
        "2026-10-13",
        ...IA,
      ],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("inmutable");
    expect(
      JSON.parse(leer(raiz, "datos/privado/evidencia/SOB-0001.json"))
        .confirmacion.por,
    ).toBe("Ana");
  });

  it("5 · el hallazgo está abierto y sigue contando como falla del control", () => {
    const r = evidencia(["hallazgos-listar", "--fecha", "2026-10-13"], raiz);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain(
      "HZ-0001 · Abierto · sigue contando como falla del control",
    );
  });

  it("6 · cerrar a mano se rechaza (2): solo una re-prueba válida cierra", () => {
    const r = evidencia(
      [
        "hallazgos-declarar",
        "HZ-0001",
        "cerrado",
        "--por",
        "Ana",
        "--fecha",
        "2026-10-14",
        "--justificacion-es",
        "ya",
        "--justificacion-en",
        "done",
      ],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("solo se cierra con una re-prueba válida");
    expect(
      JSON.parse(leer(raiz, "datos/privado/hallazgos/HZ-0001.json")).eventos,
    ).toEqual([]);
  });

  it("7 · declarar la corrección lo deja «corregido»; sigue contando", () => {
    const r = evidencia(
      [
        "hallazgos-declarar",
        "HZ-0001",
        "corregido",
        "--por",
        "Ana",
        "--fecha",
        "2026-10-14",
        "--justificacion-es",
        "Se separó el contenido leído",
        "--justificacion-en",
        "Read content was separated",
      ],
      raiz,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("Estado ahora: Corregido");
    expect(
      evidencia(["hallazgos-listar", "--fecha", "2026-10-14"], raiz).salida,
    ).toContain("HZ-0001 · Corregido");
  });

  it("8 · una re-prueba que sigue fallando se confirma, no abre otro hallazgo y NO cierra (re_probado)", () => {
    const rep = registrar(raiz, "r2.json", {
      fecha: "2026-10-15",
      reprueba_de: "HZ-0001",
      resultado: {
        ejecutada: true,
        evaluadas: 20,
        fallidas: 1,
        alertas: null,
        metrica: null,
      },
    });
    expect(rep.codigo).toBe(0);
    const conf = evidencia(
      ["confirmar", "SOB-0002", "--por", "Ana", "--fecha", "2026-10-15"],
      raiz,
    );
    expect(conf.codigo).toBe(0);
    expect(conf.salida).toContain("re-prueba");
    expect(
      existsSync(path.join(raiz, "datos/privado/hallazgos/HZ-0002.json")),
    ).toBe(false);
    const lista = evidencia(
      ["hallazgos-listar", "--fecha", "2026-10-15"],
      raiz,
    ).salida;
    expect(lista).toContain("HZ-0001 · Re-probado");
    expect(lista).toContain("re-prueba SOB-0002 no cierra: no_superada");
  });

  it("9 · una re-prueba SIN confirmar se ve «por confirmar» y no cierra", () => {
    expect(
      registrar(raiz, "r3.json", {
        fecha: "2026-10-16",
        reprueba_de: "HZ-0001",
        resultado: {
          ejecutada: true,
          evaluadas: 20,
          fallidas: 0,
          alertas: null,
          metrica: null,
        },
      }).codigo,
    ).toBe(0);
    const lista = evidencia(
      ["hallazgos-listar", "--fecha", "2026-10-16"],
      raiz,
    ).salida;
    expect(lista).toContain("re-prueba por confirmar: SOB-0003");
    expect(lista).not.toContain("Cerrado por re-prueba");
  });

  it("10 · confirmada la re-prueba válida, el hallazgo se cierra y deja de contar", () => {
    expect(
      evidencia(
        ["confirmar", "SOB-0003", "--por", "Ana", "--fecha", "2026-10-16"],
        raiz,
      ).codigo,
    ).toBe(0);
    const lista = evidencia(
      ["hallazgos-listar", "--fecha", "2026-10-16"],
      raiz,
    ).salida;
    expect(lista).toContain("HZ-0001 · Cerrado por re-prueba");
    expect(lista).not.toContain("sigue contando como falla del control");
    expect(lista).toContain("cierre: reprueba · SOB-0003 · 2026-10-16");
    const j = JSON.parse(
      evidencia(["hallazgos-listar", "--fecha", "2026-10-16", "--json"], raiz)
        .salida,
    );
    expect(j.hallazgos[0]).toMatchObject({
      id: "HZ-0001",
      estado: "cerrado",
      cuenta_como_falla: false,
    });
  });

  it("11 · una herramienta que el paquete no fija no se registra (2) y no deja archivo", () => {
    const antes = readdirSync(
      path.join(raiz, "datos/privado/evidencia"),
    ).length;
    const r = registrar(raiz, "r4.json", {
      herramienta: { id: "promptfoo", version: "0.123.1" },
    });
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("herramienta");
    expect(readdirSync(path.join(raiz, "datos/privado/evidencia")).length).toBe(
      antes,
    );
  });

  it("12 · el libro entero sigue válido", () => {
    expect(evidencia(["validar"], raiz).codigo).toBe(0);
  });

  it("13 · un hallazgo ya cerrado no admite otra declaración: «corregido» se bloquea (2) y el archivo no cambia", () => {
    const ruta = path.join(raiz, "datos/privado/hallazgos/HZ-0001.json");
    const antes = readFileSync(ruta, "utf8");
    const r = evidencia(
      [
        "hallazgos-declarar",
        "HZ-0001",
        "corregido",
        "--por",
        "Ana",
        "--fecha",
        "2026-10-17",
        "--justificacion-es",
        "x",
        "--justificacion-en",
        "x",
      ],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("ya está «Cerrado por re-prueba»");
    expect(readFileSync(ruta, "utf8")).toBe(antes);
  });
});

describe("registrar: lo que se rechaza", () => {
  const raiz = raizConPropio();

  it("un activo que no existe es un error de uso (3)", () => {
    const r = registrar(raiz, "x.json", { activo: "no-existe" });
    expect(r.codigo).toBe(3);
  });

  it("una prueba que no está en el plan se bloquea (2)", () => {
    const r = registrar(raiz, "x.json", { prueba: "PR-SW-SQLI-001" });
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("prueba_fuera_del_plan");
  });

  it("sin --crudo, o con un resultado que no cumple el esquema, es un error de uso (3)", () => {
    expect(
      evidencia(["registrar", resultado(raiz, "y.json")], raiz).codigo,
    ).toBe(3);
    const mal = registrar(raiz, "z.json", { crudo: "no cabe" });
    expect(mal.codigo).toBe(3);
    expect(mal.errores).toContain("no cumple el esquema");
  });

  it("un sobre «sin ejecución» queda no_ejecutada, nunca superada", () => {
    const r = registrar(raiz, "n.json", {
      resultado: {
        ejecutada: false,
        evaluadas: null,
        fallidas: null,
        alertas: null,
        metrica: null,
      },
    });
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("no_ejecutada");
  });

  it("conteos que no cuadran se bloquean (2): más fallidas que evaluadas, o conteos de una prueba que no corrió (S5-7a)", () => {
    const masFallidas = registrar(raiz, "f.json", {
      resultado: {
        ejecutada: true,
        evaluadas: 5,
        fallidas: 9,
        alertas: null,
        metrica: null,
      },
    });
    expect(masFallidas.codigo).toBe(2);
    expect(masFallidas.salida).toContain("Los conteos del sobre no cuadran");
    const sinCorrer = registrar(raiz, "g.json", {
      resultado: {
        ejecutada: false,
        evaluadas: 20,
        fallidas: 0,
        alertas: null,
        metrica: null,
      },
    });
    expect(sinCorrer.codigo).toBe(2);
    expect(sinCorrer.salida).toContain("Los conteos del sobre no cuadran");
  });
});

describe("los comandos y sus errores de uso", () => {
  const raiz = raizConPropio();
  it("un comando desconocido, sin comando, un idioma inválido o argumentos de más (3)", () => {
    expect(evidencia(["inventado"], raiz).codigo).toBe(3);
    expect(evidencia([], raiz).codigo).toBe(3);
    expect(evidencia(["validar", "--idioma", "fr"], raiz).codigo).toBe(3);
    expect(
      evidencia(["validar", "uno", "dos", "tres", "cuatro"], raiz).codigo,
    ).toBe(3);
  });
  it("confirmar un sobre que no existe (3); listar sin fecha (3); declarar sin justificación (3)", () => {
    expect(
      evidencia(
        ["confirmar", "SOB-0099", "--por", "Ana", "--fecha", "2026-10-12"],
        raiz,
      ).codigo,
    ).toBe(3);
    expect(evidencia(["hallazgos-listar"], raiz).codigo).toBe(3);
    expect(
      evidencia(
        [
          "hallazgos-declarar",
          "HZ-0099",
          "corregido",
          "--por",
          "Ana",
          "--fecha",
          "2026-10-12",
          "--justificacion-es",
          "a",
          "--justificacion-en",
          "a",
        ],
        raiz,
      ).codigo,
    ).toBe(3);
  });
  it("la salida sale en inglés si se pide", () => {
    const r = evidencia(["validar", "--idioma", "en"], raiz);
    expect(r.salida).toContain("Envelopes: ok");
    expect(r.salida).toContain("Findings: ok");
  });
});

describe("los demo versionados", () => {
  it("el libro demo valida con salida 0 y trae 16 sobres, 2 lotes y 4 hallazgos", () => {
    const r = evidencia(["validar", "--json"], RAIZ);
    expect(r.codigo).toBe(0);
    const j = JSON.parse(r.salida);
    expect(j.sobres.validos).toHaveLength(16);
    expect(j.lotes.validos).toEqual(["LOTE-0007", "LOTE-0008"]);
    expect(j.hallazgos.validos).toEqual([
      "HZ-0003",
      "HZ-0005",
      "HZ-0007",
      "HZ-0009",
    ]);
  });

  it("el listado lleva los cuatro estados de la maqueta", () => {
    const j = JSON.parse(
      evidencia(["hallazgos-listar", "--fecha", "2026-10-12", "--json"], RAIZ)
        .salida,
    );
    expect(
      j.hallazgos.map((h: { id: string; estado: string }) => [h.id, h.estado]),
    ).toEqual([
      ["HZ-0003", "cerrado"],
      ["HZ-0005", "aceptado_con_riesgo"],
      ["HZ-0007", "abierto"],
      ["HZ-0009", "corregido"],
    ]);
  });

  it("un archivo demo nunca se modifica al validar", () => {
    const antes = copia(
      readFileSync(
        path.join(RAIZ, "datos/evidencia/demo/SOB-0012.json"),
        "utf8",
      ),
    );
    evidencia(["validar"], RAIZ);
    expect(
      readFileSync(
        path.join(RAIZ, "datos/evidencia/demo/SOB-0012.json"),
        "utf8",
      ),
    ).toBe(antes);
  });
});

describe("las escrituras de la CLI son todo o nada (S5-4a)", () => {
  const IA = ["--impacto", "3", "--alcance", "2", "--detectabilidad", "3"];
  it("si el hallazgo no se puede escribir, el sobre NO queda confirmado ni queda un archivo a medias", () => {
    const raiz = raizConPropio();
    expect(registrar(raiz, "t.json").codigo).toBe(0);
    const sobre = "datos/privado/evidencia/SOB-0001.json";
    const antes = readFileSync(path.join(raiz, sobre), "utf8");
    // Un ARCHIVO donde debería haber una carpeta: crear la carpeta del hallazgo falla, también para root.
    writeFileSync(
      path.join(raiz, "datos/privado/hallazgos"),
      "no soy una carpeta",
    );
    const r = evidencia(
      ["confirmar", "SOB-0001", "--por", "Ana", "--fecha", "2026-10-12", ...IA],
      raiz,
    );
    expect(r.codigo).not.toBe(0);
    expect(readFileSync(path.join(raiz, sobre), "utf8")).toBe(antes);
    expect(JSON.parse(antes).confirmacion).toBeNull();
    expect(existsSync(path.join(raiz, `${sobre}.tmp`))).toBe(false);
  });
});
