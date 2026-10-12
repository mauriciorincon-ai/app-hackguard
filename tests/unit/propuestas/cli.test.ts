// @vitest-environment node
// El CLI de las propuestas como lo usa una persona, en una raíz de juguete (copia de los datos públicos y de las corridas demo): validar,
// listar, verificar y decidir. El libro de decisiones es de SOLO AGREGAR; una propuesta de demostración no escribe en el catálogo ni en el
// libro de evidencia sin `--aplicar-a-demo`; aprobar un sobre lo deja POR CONFIRMAR; y un criterio roto o una huella editada se nombran.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { RAIZ } from "./ayuda.ts";

function propuestas(args: string[], cwd: string) {
  const r = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      path.join(RAIZ, "src/cli/propuestas.ts"),
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

/** Una raíz de juguete: los datos públicos (sin `datos/privado/`), las corridas demo y las lecturas del kit. Nunca toca el repositorio. */
function raizDeJuguete() {
  const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-propuestas-"));
  temporales.push(raiz);
  cpSync(path.join(RAIZ, "datos"), path.join(raiz, "datos"), {
    recursive: true,
    filter: (origen) =>
      !path.relative(RAIZ, origen).startsWith(path.join("datos", "privado")),
  });
  cpSync(
    path.join(RAIZ, "propuestas/demo"),
    path.join(raiz, "propuestas/demo"),
    {
      recursive: true,
    },
  );
  cpSync(
    path.join(RAIZ, "docs/kit-de-prueba/propuestas-demo"),
    path.join(raiz, "docs/kit-de-prueba/propuestas-demo"),
    { recursive: true },
  );
  rmSync(path.join(raiz, "datos/propuestas/decisiones.jsonl"), { force: true });
  return raiz;
}

const FIRMA = ["--por", "Ana", "--fecha", "2026-10-12"];
const decidir = (
  raiz: string,
  id: string,
  decision: string,
  extra: string[] = [],
) =>
  propuestas(["decidir", id, "--decision", decision, ...FIRMA, ...extra], raiz);
const libro = (raiz: string) => {
  const ruta = path.join(raiz, "datos/propuestas/decisiones.jsonl");
  return existsSync(ruta) ? readFileSync(ruta, "utf8") : "";
};
const lineas = (raiz: string) =>
  libro(raiz)
    .split("\n")
    .filter((l) => l !== "");
const listar = (raiz: string) =>
  JSON.parse(propuestas(["listar", "--json"], raiz).salida) as {
    id: string;
    estado: string;
    marcada: boolean;
  }[];
const archivosDeEvidencia = (raiz: string) => {
  const salida: string[] = [];
  const visitar = (d: string) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) visitar(path.join(d, e.name));
      else salida.push(path.join(d, e.name));
    }
  };
  visitar(path.join(raiz, "datos/evidencia"));
  return salida.sort();
};

describe("validar y listar", () => {
  const raiz = raizDeJuguete();
  it("validar: las dos corridas demo, las siete propuestas y los cinco criterios", () => {
    const r = propuestas(["validar"], raiz);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("2 corridas");
    expect(r.salida).toContain("7 propuestas");
    expect(r.salida).toContain("0 decisiones");
    for (const c of ["C1", "C2", "C3", "C4", "C5"])
      expect(r.salida).toContain(`${c} ✓`);
  });
  it("validar --json trae la lista de problemas (vacía) y los criterios", () => {
    const r = propuestas(["validar", "--json"], raiz);
    const j = JSON.parse(r.salida) as {
      problemas: string[];
      criterios: unknown[];
    };
    expect(j.problemas).toEqual([]);
    expect(j.criterios).toHaveLength(5);
  });
  it("listar: la bandeja de siete, todas por decidir, con las marcadas señaladas", () => {
    const filas = listar(raiz);
    expect(filas.map((f) => f.id)).toEqual([
      "PROP-0031",
      "PROP-0032",
      "PROP-0033",
      "PROP-0034",
      "PROP-0035",
      "PROP-0036",
      "PROP-0037",
    ]);
    expect(new Set(filas.map((f) => f.estado))).toEqual(
      new Set(["por_decidir"]),
    );
    expect(filas.filter((f) => f.marcada).map((f) => f.id)).toEqual([
      "PROP-0033",
      "PROP-0034",
      "PROP-0036",
      "PROP-0037",
    ]);
  });
  it("listar sin --json imprime una fila por propuesta", () => {
    const r = propuestas(["listar"], raiz);
    expect(r.salida.trim().split("\n")).toHaveLength(7);
    expect(r.salida).toContain(
      "PROP-0033\tinvestigador\tprueba_nueva\tpor_decidir\tmarcada",
    );
  });
});

describe("decidir: el libro es de solo agregar", () => {
  it("rechazar con motivo agrega una línea, baja la cuenta y el libro sigue válido", () => {
    const raiz = raizDeJuguete();
    const r = decidir(raiz, "PROP-0033", "rechazar", [
      "--motivo",
      "Una sola fuente",
    ]);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain(
      "PROP-0033: rechazar registrada por Ana el 2026-10-12",
    );
    expect(lineas(raiz)).toHaveLength(1);
    expect(JSON.parse(lineas(raiz)[0]!)).toMatchObject({
      formato: "hackguard/decision@1",
      propuesta: "PROP-0033",
      decision: "rechazar",
      por: "Ana",
      motivo: "Una sola fuente",
    });
    expect(listar(raiz).find((f) => f.id === "PROP-0033")!.estado).toBe(
      "rechazada",
    );
    expect(propuestas(["validar"], raiz).codigo).toBe(0);
  });
  it("rechazar sin motivo no escribe nada y sale con 2", () => {
    const raiz = raizDeJuguete();
    const r = decidir(raiz, "PROP-0033", "rechazar");
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("decision/rechazo-sin-motivo");
    expect(r.salida).toContain("No se registró nada");
    expect(libro(raiz)).toBe("");
  });
  it("decidir dos veces la misma propuesta se bloquea y el libro queda igual", () => {
    const raiz = raizDeJuguete();
    expect(decidir(raiz, "PROP-0032", "aprobar").codigo).toBe(0);
    const antes = libro(raiz);
    const r = decidir(raiz, "PROP-0032", "rechazar", [
      "--motivo",
      "me arrepentí",
    ]);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("decision/repetida");
    expect(libro(raiz)).toBe(antes);
  });
  it("cada decisión nueva solo AGREGA: las líneas anteriores no cambian", () => {
    const raiz = raizDeJuguete();
    decidir(raiz, "PROP-0032", "aprobar");
    const primera = lineas(raiz);
    decidir(raiz, "PROP-0033", "rechazar", ["--motivo", "x"]);
    decidir(raiz, "PROP-0035", "aprobar");
    const todas = lineas(raiz);
    expect(todas).toHaveLength(3);
    expect(todas.slice(0, 1)).toEqual(primera);
    expect(libro(raiz).endsWith("\n")).toBe(true);
  });
  it("aprobar un cambio de versión o una herramienta solo registra: no toca el catálogo", () => {
    const raiz = raizDeJuguete();
    const antes = readFileSync(
      path.join(raiz, "datos/marcos/lista-decision-14.json"),
      "utf8",
    );
    const r = decidir(raiz, "PROP-0032", "aprobar");
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("El cambio en datos/ lo haces tú");
    expect(
      readFileSync(
        path.join(raiz, "datos/marcos/lista-decision-14.json"),
        "utf8",
      ),
    ).toBe(antes);
  });
  it("separar un texto que mezcla pruebas deja a sus dos hijas por decidir", () => {
    const raiz = raizDeJuguete();
    const r = decidir(raiz, "PROP-0037", "separar");
    expect(r.codigo).toBe(0);
    expect(JSON.parse(lineas(raiz)[0]!).hijas).toEqual([
      "PROP-0037.1",
      "PROP-0037.2",
    ]);
    const filas = listar(raiz);
    expect(filas).toHaveLength(9);
    expect(filas.filter((f) => f.estado === "por_decidir")).toHaveLength(8);
    expect(propuestas(["validar"], raiz).codigo).toBe(0);
  });
  it("separar lo que no mezcla se bloquea; aprobar la mezcla sin separar también", () => {
    const raiz = raizDeJuguete();
    expect(decidir(raiz, "PROP-0031", "separar").salida).toContain(
      "decision/separar-no-aplica",
    );
    expect(
      decidir(raiz, "PROP-0037", "aprobar", ["--aplicar-a-demo"]).salida,
    ).toContain("decision/mezcla-sin-separar");
    expect(libro(raiz)).toBe("");
  });
  it("una propuesta que no existe, o una decisión desconocida, salen con 3 y no escriben", () => {
    const raiz = raizDeJuguete();
    const a = decidir(raiz, "PROP-9999", "aprobar");
    expect(a.codigo).toBe(3);
    expect(a.errores).toContain("no hay una propuesta PROP-9999");
    const b = decidir(raiz, "PROP-0031", "borrar");
    expect(b.codigo).toBe(3);
    expect(b.errores).toContain("la decisión no cumple el esquema");
    expect(libro(raiz)).toBe("");
  });
  it("faltan datos de la firma: sale con 3 y dice cuál", () => {
    const raiz = raizDeJuguete();
    const r = propuestas(
      [
        "decidir",
        "PROP-0031",
        "--decision",
        "aprobar",
        "--fecha",
        "2026-10-12",
      ],
      raiz,
    );
    expect(r.codigo).toBe(3);
    expect(r.errores).toContain("--por");
  });
});

describe("aprobar una propuesta de demostración exige --aplicar-a-demo", () => {
  it("sin la bandera: un sobre no se crea, una prueba no se escribe y el libro queda vacío", () => {
    const raiz = raizDeJuguete();
    const antes = archivosDeEvidencia(raiz);
    const pruebas = readdirSync(
      path.join(raiz, "datos/pruebas/modelo_decision"),
    );
    const a = decidir(raiz, "PROP-0036", "aprobar", [
      "--prueba",
      "PR-IA-PINJ-001",
    ]);
    expect(a.codigo).toBe(2);
    expect(a.salida).toContain("--aplicar-a-demo");
    const b = decidir(raiz, "PROP-0031", "aprobar");
    expect(b.codigo).toBe(2);
    expect(archivosDeEvidencia(raiz)).toEqual(antes);
    expect(
      readdirSync(path.join(raiz, "datos/pruebas/modelo_decision")),
    ).toEqual(pruebas);
    expect(libro(raiz)).toBe("");
  });
  it("con la bandera, aprobar un sobre crea un sobre POR CONFIRMAR y lo enlaza en el libro", () => {
    const raiz = raizDeJuguete();
    const antes = archivosDeEvidencia(raiz);
    const r = decidir(raiz, "PROP-0036", "aprobar", [
      "--prueba",
      "PR-IA-PINJ-001",
      "--aplicar-a-demo",
    ]);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("SIN confirmar");
    expect(r.salida).toContain("pnpm evidencia:confirmar");
    const nuevos = archivosDeEvidencia(raiz).filter((a) => !antes.includes(a));
    expect(nuevos).toHaveLength(1);
    const sobre = JSON.parse(readFileSync(nuevos[0]!, "utf8")) as {
      formato: string;
      origen: string;
      confirmacion: unknown;
      prueba: string;
      advertencias: { es: string }[];
    };
    expect(sobre.formato).toBe("hackguard/sobre@1");
    expect(sobre.confirmacion).toBeNull();
    expect(sobre.prueba).toBe("PR-IA-PINJ-001");
    expect(sobre.origen).toBe("demo");
    expect(sobre.advertencias.map((a) => a.es).join(" ")).toContain(
      "PROP-0036",
    );
    const d = JSON.parse(lineas(raiz)[0]!);
    expect(d.efecto.sobre).toMatch(/^SOB-\d{4,}$/);
    expect(d.efecto.veredicto_resultante).toBe("fallida");
    expect(d.veredicto_corregido_por_persona).toBe(false);
  });
  it("corregir un conteo a mano deja el veredicto recalculado por la regla y la corrección dicha", () => {
    const raiz = raizDeJuguete();
    const r = decidir(raiz, "PROP-0036", "aprobar", [
      "--prueba",
      "PR-IA-PINJ-001",
      "--fallidas",
      "0",
      "--aplicar-a-demo",
    ]);
    expect(r.codigo).toBe(0);
    const d = JSON.parse(lineas(raiz)[0]!);
    expect(d.efecto.veredicto_sugerido).toBe("fallida");
    expect(d.efecto.veredicto_resultante).toBe("superada");
    expect(d.veredicto_corregido_por_persona).toBe(true);
  });
  it("con la bandera, aprobar una prueba nueva la escribe «aprobada» en el catálogo", () => {
    const raiz = raizDeJuguete();
    const r = decidir(raiz, "PROP-0031", "aprobar", ["--aplicar-a-demo"]);
    expect(r.codigo).toBe(0);
    const ruta = path.join(
      raiz,
      "datos/pruebas/modelo_decision/PR-MD-DES-001.json",
    );
    expect(existsSync(ruta)).toBe(true);
    const prueba = JSON.parse(readFileSync(ruta, "utf8")) as {
      estado_aprobacion: string;
    };
    expect(prueba.estado_aprobacion).toBe("aprobada");
    expect(JSON.parse(lineas(raiz)[0]!).efecto).toEqual({
      prueba: "PR-MD-DES-001",
    });
  });
  it("una propuesta marcada por el filtro no se aprueba a secas: exige aprobar-tras-revisar", () => {
    const raiz = raizDeJuguete();
    const a = decidir(raiz, "PROP-0034", "aprobar", ["--aplicar-a-demo"]);
    expect(a.codigo).toBe(2);
    expect(a.salida).toContain("decision/marcada-sin-revision");
    expect(
      existsSync(
        path.join(raiz, "datos/pruebas/modelo_decision/PR-MD-CONV-001.json"),
      ),
    ).toBe(false);
    const b = decidir(raiz, "PROP-0034", "aprobar-tras-revisar", [
      "--aplicar-a-demo",
    ]);
    expect(b.codigo).toBe(0);
    expect(JSON.parse(lineas(raiz)[0]!).decision).toBe("aprobar_tras_revisar");
  });
});

describe("verificar sella con la misma huella y se detiene si algo se rompe", () => {
  it("volver a sellar una corrida demo da los mismos bytes", () => {
    const raiz = raizDeJuguete();
    const ruta = path.join(
      raiz,
      "propuestas/demo/INV-2026-10-02-01/corrida.json",
    );
    const antes = readFileSync(ruta, "utf8");
    const r = propuestas(
      ["verificar", "propuestas/demo/INV-2026-10-02-01"],
      raiz,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("5 propuestas");
    expect(r.salida).toContain("C1 ✓ · C2 ✓ · C3 ✓ · C4 ✓ · C5 ✓");
    expect(readFileSync(ruta, "utf8")).toBe(antes);
  });
  it("solo sella dentro de propuestas/corridas o propuestas/demo", () => {
    const raiz = raizDeJuguete();
    for (const fuera of ["datos", "../fuera", "propuestas"]) {
      const r = propuestas(["verificar", fuera], raiz);
      expect(r.codigo, fuera).toBe(3);
      expect(r.errores, fuera).toContain("la carpeta debe ser");
    }
  });
  it("un borrador incoherente no sella nada y nombra la regla", () => {
    const raiz = raizDeJuguete();
    const ruta = path.join(
      raiz,
      "propuestas/demo/INV-2026-10-02-01/propuesta.json",
    );
    const b = JSON.parse(readFileSync(ruta, "utf8"));
    b.propuestas[1].ref = b.propuestas[0].ref;
    writeFileSync(ruta, JSON.stringify(b));
    const corrida = path.join(
      raiz,
      "propuestas/demo/INV-2026-10-02-01/corrida.json",
    );
    const antes = readFileSync(corrida, "utf8");
    const r = propuestas(
      ["verificar", "propuestas/demo/INV-2026-10-02-01"],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("borrador/ref-repetida");
    expect(r.salida).toContain("No se selló nada");
    expect(readFileSync(corrida, "utf8")).toBe(antes);
  });
  it("una corrida nueva de las skills se sella en propuestas/corridas con el número siguiente", () => {
    const raiz = raizDeJuguete();
    const destino = path.join(raiz, "propuestas/corridas/EXT-2026-10-12-01");
    mkdirSync(destino, { recursive: true });
    cpSync(
      path.join(raiz, "propuestas/demo/EXT-2026-10-03-01/propuesta.json"),
      path.join(destino, "propuesta.json"),
    );
    const b = JSON.parse(
      readFileSync(path.join(destino, "propuesta.json"), "utf8"),
    );
    b.corrida = "EXT-2026-10-12-01";
    b.fecha = "2026-10-12";
    writeFileSync(path.join(destino, "propuesta.json"), JSON.stringify(b));
    const r = propuestas(
      ["verificar", "propuestas/corridas/EXT-2026-10-12-01"],
      raiz,
    );
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("PROP-0038");
    expect(r.salida).toContain("PROP-0039");
    expect(existsSync(path.join(destino, "corrida.json"))).toBe(true);
    // la corrida real queda marcada como real: aprobarla no pide la bandera de demostración
    expect(propuestas(["validar"], raiz).codigo).toBe(0);
    expect(listar(raiz)).toHaveLength(9);
  });
  it("una corrida con decisiones no se vuelve a sellar con otro contenido", () => {
    const raiz = raizDeJuguete();
    expect(
      decidir(raiz, "PROP-0033", "rechazar", ["--motivo", "x"]).codigo,
    ).toBe(0);
    const ruta = path.join(
      raiz,
      "propuestas/demo/INV-2026-10-02-01/propuesta.json",
    );
    const b = JSON.parse(readFileSync(ruta, "utf8"));
    b.propuestas[0].titulo.es = `${b.propuestas[0].titulo.es} (editado)`;
    writeFileSync(ruta, JSON.stringify(b));
    const r = propuestas(
      ["verificar", "propuestas/demo/INV-2026-10-02-01"],
      raiz,
    );
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("ya tiene decisiones");
  });
});

describe("lo que se edita a mano después de sellar se nombra", () => {
  it("una corrida editada ya no tiene su huella: validar sale con 2 y nombra la ruta", () => {
    const raiz = raizDeJuguete();
    const ruta = path.join(
      raiz,
      "propuestas/demo/EXT-2026-10-03-01/corrida.json",
    );
    const c = JSON.parse(readFileSync(ruta, "utf8"));
    c.propuestas[0].candidatas[0].veredicto_sugerido.veredicto = "superada";
    writeFileSync(ruta, JSON.stringify(c));
    const r = propuestas(["validar"], raiz);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("EXT-2026-10-03-01/corrida.json");
    expect(r.salida).toContain("huella");
  });
  it("un libro con una línea que no cumple el esquema detiene la validación", () => {
    const raiz = raizDeJuguete();
    mkdirSync(path.join(raiz, "datos/propuestas"), { recursive: true });
    writeFileSync(
      path.join(raiz, "datos/propuestas/decisiones.jsonl"),
      '{"propuesta":"PROP-0031"}\n',
    );
    const r = propuestas(["validar"], raiz);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("decisiones.jsonl:1");
  });
  it("una decisión sobre una propuesta que no existe es un problema del libro", () => {
    const raiz = raizDeJuguete();
    mkdirSync(path.join(raiz, "datos/propuestas"), { recursive: true });
    writeFileSync(
      path.join(raiz, "datos/propuestas/decisiones.jsonl"),
      `${JSON.stringify({ formato: "hackguard/decision@1", propuesta: "PROP-0999", decision: "aprobar", por: "Ana", fecha: "2026-10-12" })}\n`,
    );
    const r = propuestas(["validar"], raiz);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("decision/propuesta-desconocida");
  });
});

describe("el uso", () => {
  const raiz = raizDeJuguete();
  it("un comando desconocido o ausente sale con 3 y muestra el uso en los dos idiomas", () => {
    for (const args of [[], ["inventar"]]) {
      const r = propuestas(args, raiz);
      expect(r.codigo).toBe(3);
      expect(r.errores).toContain("uso: propuestas");
      expect(r.errores).toContain("usage: propuestas");
    }
  });
  it("buscar exige una fecha y qué buscar antes de abrir ninguna conexión", () => {
    const sinFecha = propuestas(["buscar", "--marco", "x"], raiz);
    expect(sinFecha.codigo).toBe(3);
    expect(sinFecha.errores).toContain("--fecha");
    const sinQue = propuestas(["buscar", "--fecha", "2026-10-12"], raiz);
    expect(sinQue.codigo).toBe(3);
    expect(sinQue.errores).toContain("--marco");
    expect(existsSync(path.join(raiz, "propuestas/corridas"))).toBe(false);
  });
  it("sobran argumentos: sale con 3", () => {
    expect(propuestas(["listar", "uno", "dos"], raiz).codigo).toBe(3);
  });
});
