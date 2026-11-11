// @vitest-environment node
// D2: el perfil desde la ficha. Una tabla, no una IA: sin fragmento no hay propuesta; el choque entre dos reglas lo decide la persona.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAMPOS_LEIBLES,
  FichaLeida,
  TablaFichaARasgos,
  armarPerfilPropuesto,
  comandoDeAceptar,
  comillasDeShell,
  contieneTermino,
  inerte,
  textoDeFicha,
  fragmentosDe,
  plegar,
  proponerDesdeFicha,
} from "../../../src/engine/activos/desde-ficha.ts";

const RAIZ = process.cwd();
const json = (ruta: string) =>
  JSON.parse(readFileSync(join(RAIZ, ruta), "utf8"));
const tabla = TablaFichaARasgos.parse(
  json("datos/planificador/ficha-a-rasgos.json"),
);
const contrato: Esquema = json(
  "datos/contratos/ficha-tecnica/1.3.1.schema.json",
);
const ficha = FichaLeida.parse(
  json("datos/fichas/demo/ficha-demo-asistente.json"),
);
const rasgos: { id: string; tipo: "booleano" | "opcion" }[] = json(
  "datos/rasgos-de-perfil.json",
).rasgos.map((r: { id: string; tipo: "booleano" | "opcion" }) => ({
  id: r.id,
  tipo: r.tipo,
}));

interface Esquema {
  type?: string;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  exclusiveMinimum?: number;
  minItems?: number;
  maxItems?: number;
  items?: Esquema;
  required?: string[];
  properties?: Record<string, Esquema>;
  additionalProperties?: boolean;
  anyOf?: Esquema[];
}

/** Un validador mínimo del subconjunto de JSON Schema que usa el contrato (no hay ajv en el repo). Devuelve los errores. */
function validar(valor: unknown, esquema: Esquema, ruta = "$"): string[] {
  const errores: string[] = [];
  if (esquema.anyOf) {
    const ok = esquema.anyOf.some(
      (s: Esquema) => validar(valor, s, ruta).length === 0,
    );
    return ok ? [] : [`${ruta}: ninguna alternativa`];
  }
  const tipo = esquema.type as string | undefined;
  const es = (v: unknown) =>
    tipo === "array"
      ? Array.isArray(v)
      : tipo === "object"
        ? typeof v === "object" && v !== null && !Array.isArray(v)
        : tipo === "integer"
          ? Number.isInteger(v)
          : tipo === "null"
            ? v === null
            : typeof v === tipo;
  if (tipo !== undefined && !es(valor)) return [`${ruta}: no es ${tipo}`];
  if (esquema.enum && !esquema.enum.includes(valor))
    errores.push(`${ruta}: fuera del enum`);
  if (typeof valor === "string") {
    if (esquema.minLength !== undefined && valor.length < esquema.minLength)
      errores.push(`${ruta}: corto`);
    if (esquema.maxLength !== undefined && valor.length > esquema.maxLength)
      errores.push(`${ruta}: largo`);
    if (esquema.pattern && !new RegExp(esquema.pattern).test(valor))
      errores.push(`${ruta}: patrón`);
  }
  if (typeof valor === "number") {
    if (esquema.minimum !== undefined && valor < esquema.minimum)
      errores.push(`${ruta}: menor`);
    if (
      esquema.exclusiveMinimum !== undefined &&
      valor <= esquema.exclusiveMinimum
    )
      errores.push(`${ruta}: menor`);
  }
  if (Array.isArray(valor)) {
    if (esquema.minItems !== undefined && valor.length < esquema.minItems)
      errores.push(`${ruta}: pocos`);
    if (esquema.maxItems !== undefined && valor.length > esquema.maxItems)
      errores.push(`${ruta}: muchos`);
    const items = esquema.items;
    if (items)
      valor.forEach((v, i) =>
        errores.push(...validar(v, items, `${ruta}[${i}]`)),
      );
  }
  if (tipo === "object") {
    const o = valor as Record<string, unknown>;
    for (const k of esquema.required ?? [])
      if (!(k in o)) errores.push(`${ruta}.${k}: falta`);
    for (const [k, v] of Object.entries(o)) {
      const sub = esquema.properties?.[k];
      if (sub) errores.push(...validar(v, sub, `${ruta}.${k}`));
      else if (esquema.additionalProperties === false)
        errores.push(`${ruta}.${k}: no declarado`);
    }
  }
  return errores;
}

/** El esquema que describe una ruta de la tabla (`stack[].papel`) dentro del contrato, o null si no existe. */
function esquemaDeCampo(campo: string): Esquema | null {
  let actual: Esquema = contrato;
  for (const parte of campo.split(".")) {
    const lista = parte.endsWith("[]");
    const nombre = lista ? parte.slice(0, -2) : parte;
    const sig = actual.properties?.[nombre];
    if (!sig) return null;
    const siguiente = lista ? sig.items : sig;
    if (!siguiente) return null;
    actual = siguiente;
  }
  return actual;
}

describe("la tabla ficha → rasgos", () => {
  it("cada campo que lee existe en el contrato vendorizado y es texto", () => {
    for (const campo of CAMPOS_LEIBLES) {
      const e = esquemaDeCampo(campo);
      expect(e, `${campo} no está en el contrato`).not.toBeNull();
      expect(e!.type, campo).toBe("string");
    }
    for (const r of tabla.reglas)
      for (const campo of r.campos) expect(CAMPOS_LEIBLES).toContain(campo);
  });

  it("toda regla nombra un rasgo booleano del perfil, y todo rasgo booleano tiene al menos una regla", () => {
    const booleanos = rasgos
      .filter((r) => r.tipo === "booleano")
      .map((r) => r.id);
    for (const r of tabla.reglas) expect(booleanos, r.id).toContain(r.rasgo);
    for (const id of booleanos)
      expect(
        tabla.reglas.some((r) => r.rasgo === id),
        id,
      ).toBe(true);
  });

  it("las reglas de «no» leen solo lo que la ficha declara que no hace", () => {
    for (const r of tabla.reglas.filter((x) => !x.valor))
      expect(
        r.campos.every((c) => c === "nunca[]" || c === "limites[]"),
        r.id,
      ).toBe(true);
  });

  it("los ids de regla son únicos y cada razón está en es y en", () => {
    const ids = tabla.reglas.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of tabla.reglas) {
      expect(r.razon.es.length).toBeGreaterThan(10);
      expect(r.razon.en.length).toBeGreaterThan(10);
    }
  });

  it("no hay modelo ni red en el motor: el módulo no importa nada de Node ni de la red", () => {
    const fuente = readFileSync(
      join(RAIZ, "src/engine/activos/desde-ficha.ts"),
      "utf8",
    );
    expect(fuente).not.toMatch(/from "node:|fetch\(|XMLHttpRequest|anthropic/i);
  });
});

describe("la ficha demo", () => {
  it("cumple el contrato vendorizado (el que lee CV Viva)", () => {
    expect(
      validar(json("datos/fichas/demo/ficha-demo-asistente.json"), contrato),
    ).toEqual([]);
  });
});

describe("proponerDesdeFicha", () => {
  const salida = proponerDesdeFicha(ficha, tabla, rasgos);
  const de = (id: string) => salida.find((r) => r.rasgo === id)!;

  it("devuelve un resultado por rasgo del perfil, en su orden", () => {
    expect(salida.map((r) => r.rasgo)).toEqual(rasgos.map((r) => r.id));
  });

  it("propone con el fragmento literal y su ruta", () => {
    const r = de("expone_texto_libre_a_modelo");
    expect(r.estado).toBe("propuesto");
    if (r.estado !== "propuesto") return;
    expect(r.valor).toBe(true);
    expect(r.cita.fragmento.texto).toContain("texto libre");
    expect(r.cita.fragmento.ruta).toMatch(/^(promesa|bloques|stack)/);
  });

  it("un «nunca» respalda un rasgo en falso", () => {
    const r = de("acciones_irreversibles");
    expect(r.estado).toBe("propuesto");
    if (r.estado === "propuesto") {
      expect(r.valor).toBe(false);
      expect(r.cita.fragmento.campo).toBe("nunca[]");
    }
  });

  it("sin fragmento no hay propuesta: el rasgo queda sin responder y sin citas", () => {
    const r = de("tiene_sesiones");
    expect(r).toMatchObject({
      estado: "sin_responder",
      motivo: "sin_fragmento",
      citas: [],
    });
  });

  it("dos reglas que chocan dejan el rasgo sin responder, con las dos citas", () => {
    const r = de("accede_a_datos_sensibles");
    expect(r.estado).toBe("sin_responder");
    if (r.estado !== "sin_responder") return;
    expect(r.motivo).toBe("conflicto");
    expect(r.citas.map((c) => c.valor).sort()).toEqual([false, true]);
  });

  it("el rasgo que no es de sí o no (tipo_de_acceso) no se contesta desde una ficha", () => {
    expect(de("tipo_de_acceso")).toMatchObject({
      estado: "sin_responder",
      motivo: "no_es_si_o_no",
    });
  });

  it("es determinista: la misma ficha da la misma salida", () => {
    expect(JSON.stringify(proponerDesdeFicha(ficha, tabla, rasgos))).toBe(
      JSON.stringify(salida),
    );
  });

  it("al menos un rasgo propuesto con fragmento y al menos uno sin responder (criterio de la fase)", () => {
    expect(salida.some((r) => r.estado === "propuesto")).toBe(true);
    expect(salida.some((r) => r.estado === "sin_responder")).toBe(true);
  });
});

describe("coincidencia de términos", () => {
  it("compara sin tildes ni mayúsculas, como palabra completa", () => {
    expect(plegar("  Sesión  DE Usuario ")).toBe("sesion de usuario");
    expect(contieneTermino("Una SESIÓN de usuario", "sesion de usuario")).toBe(
      true,
    );
    expect(contieneTermino("el login", "login")).toBe(true);
    expect(contieneTermino("mysqlite", "mysql")).toBe(false);
    expect(contieneTermino("herramientas", "herramienta")).toBe(false);
  });

  it("los términos con signos de expresión regular no rompen", () => {
    expect(contieneTermino("a (b) c", "(b")).toBe(true);
    expect(contieneTermino("ver c++ aquí", "c++")).toBe(true);
    expect(contieneTermino("ver c aquí", "c++")).toBe(false);
  });

  it("fragmentosDe da la ruta de cada elemento", () => {
    expect(fragmentosDe(ficha, "nunca[]").map((f) => f.ruta)).toEqual([
      "nunca[0]",
      "nunca[1]",
    ]);
    expect(fragmentosDe(ficha, "stack[].papel")[1]!.ruta).toBe(
      "stack[1].papel",
    );
  });
});

describe("armarPerfilPropuesto", () => {
  const propuestas = proponerDesdeFicha(ficha, tabla, rasgos);
  const base = {
    id: "act-propio-uno",
    por: "Ana",
    fecha: "2026-11-10",
    fichaVersion: "1.3.1",
    fichaHuella: "a".repeat(64),
    propuestas,
  };

  it("solo guarda los rasgos que la persona confirmó, cada uno con su cita", () => {
    const p = armarPerfilPropuesto({
      ...base,
      confirmados: new Set(["usa_herramientas"]),
    });
    expect(p.rasgos).toEqual({ usa_herramientas: true });
    expect(p.citas.usa_herramientas!.texto.length).toBeGreaterThan(0);
    expect(p.sin_responder).toContain("expone_texto_libre_a_modelo");
    expect(p.sin_responder).toContain("accede_a_datos_sensibles");
  });

  it("un rasgo sin responder no se guarda aunque se pida confirmarlo", () => {
    const p = armarPerfilPropuesto({
      ...base,
      confirmados: new Set(["tiene_sesiones", "accede_a_datos_sensibles"]),
    });
    expect(p.rasgos).toEqual({});
  });

  it("no guarda la ficha: solo su versión y su huella", () => {
    const p = armarPerfilPropuesto({
      ...base,
      confirmados: new Set(["usa_herramientas"]),
    });
    const texto = JSON.stringify(p);
    expect(texto).not.toContain(ficha.promesa.intro);
    expect(texto).not.toContain(ficha.stack[0]!.papel!);
    expect(p.ficha).toEqual({
      schema_version: "1.3.1",
      huella: "a".repeat(64),
    });
    expect(p.nota.es).toMatch(/no es un activo/i);
  });
});

describe("las negaciones de la tabla no se dejan engañar", () => {
  const con = (nunca: string[]) =>
    proponerDesdeFicha(
      FichaLeida.parse({
        ...json("datos/fichas/demo/ficha-demo-asistente.json"),
        nunca,
        limites: ["Atiende solo soporte.", "Responde en un turno."],
      }),
      tabla,
      rasgos,
    ).find((r) => r.rasgo === "acciones_irreversibles")!;

  it("«nunca hace acciones irreversibles» propone «no»", () => {
    const r = con(["Nunca hace acciones irreversibles.", "Nunca vende."]);
    expect(r.estado === "propuesto" && r.valor === false).toBe(true);
  });

  it("«nunca omite confirmar las acciones irreversibles» NO propone «no»: dice lo contrario", () => {
    const r = con([
      "Nunca omite confirmar las acciones irreversibles.",
      "Nunca vende.",
    ]);
    expect(r.estado).toBe("sin_responder");
  });
});

describe("lo que la ficha dice es dato ajeno", () => {
  it("el texto inerte no lleva control, dirección ni ancho cero", () => {
    expect(inerte("a\u001b[31mb\u202ec\u200bd\u2066e")).toBe("a [31mb c d e");
  });

  it("los bytes con BOM dan el mismo texto que sin él", () => {
    const sin = new TextEncoder().encode('{"a":1}');
    const con = new Uint8Array([0xef, 0xbb, 0xbf, ...sin]);
    expect(textoDeFicha(con)).toBe(textoDeFicha(sin));
  });

  it("un campo de la ficha más largo que el contrato no la deja pasar", () => {
    const larga = {
      ...json("datos/fichas/demo/ficha-demo-asistente.json"),
      titular: "x".repeat(401),
    };
    expect(FichaLeida.safeParse(larga).success).toBe(false);
  });

  it("una fecha que no existe no arma un perfil", () => {
    const propuestas = proponerDesdeFicha(ficha, tabla, rasgos);
    expect(() =>
      armarPerfilPropuesto({
        id: "act-x",
        por: "Ana",
        fecha: "2026-13-45",
        fichaVersion: "1.3.1",
        fichaHuella: "a".repeat(64),
        propuestas,
        confirmados: new Set(),
      }),
    ).toThrow();
  });
});

describe("el comando que se copia a una terminal", () => {
  it("cita lo que la persona escribió: un nombre con espacio o con comillas no rompe el argumento", () => {
    expect(comillasDeShell("Ana")).toBe("Ana");
    expect(comillasDeShell("Mauricio Rincón")).toBe("'Mauricio Rincón'");
    expect(comillasDeShell("a'b; rm -rf ~")).toBe(`'a'\\''b; rm -rf ~'`);
    const c = comandoDeAceptar({
      aceptados: ["usa_herramientas"],
      por: "Mauricio Rincón",
      id: "act-uno",
      fecha: "2026-11-10",
    });
    expect(c).toContain(
      "--por 'Mauricio Rincón' --id act-uno --fecha 2026-11-10 --salida datos/privado/activos/act-uno.perfil.json",
    );
  });

  it("lo que falta se muestra como marcador", () => {
    expect(
      comandoDeAceptar({ aceptados: [], por: "", id: "", fecha: "" }),
    ).toBe(
      "pnpm activo:desde-ficha <ficha.json> --aceptar <rasgos> --por <tu-nombre> --id <id> --fecha AAAA-MM-DD --salida datos/privado/activos/<id>.perfil.json",
    );
  });
});
