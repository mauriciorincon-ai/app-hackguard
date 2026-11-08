// @vitest-environment node
// Qué cambió entre dos instantáneas (D1, Sprint 10): lo que entra, sale y cambia, campo por campo, con la regla del validador y la huella
// de cada lado. El orden de las claves de un JSON NO es un cambio; la licencia de un marco manda sobre lo que se muestra.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  REGLAS_NOMBRADAS,
  SECCIONES,
  nombreDeRegla,
  diferenciasEntreInstantaneas,
} from "../../../src/engine/catalogo/diferencias.ts";
import { informeDeDiferencias } from "../../../src/engine/catalogo/informe-diferencias.ts";
import {
  construirInstantanea,
  huellaDeInstantanea,
  type Instantanea,
} from "../../../src/engine/catalogo/instantanea.ts";
import {
  FECHA_DE_LA_INSTANTANEA_DEMO,
  MOVIMIENTOS_DE_LA_RECETA,
  aplicarRecetaDemo,
} from "../../../src/engine/catalogo/instantanea-demo.ts";
import { REGLAS } from "../../../src/engine/catalogo/reglas.ts";
import { RAIZ, catalogoReal } from "./ayuda.ts";

/** Las licencias reales (`datos/propuestas/licencias.json`): lo que la pantalla y el CLI usan. */
const LICENCIAS = (
  JSON.parse(
    readFileSync(path.join(RAIZ, "datos/propuestas/licencias.json"), "utf8"),
  ) as {
    marcos: Record<string, "cita_con_atribucion" | "solo_identificadores">;
  }
).marcos;

const leerInstantanea = (relativa: string) =>
  JSON.parse(readFileSync(path.join(RAIZ, relativa), "utf8")) as Instantanea;
const oficial = () => {
  const n = readdirSync(path.join(RAIZ, "datos/instantaneas"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .at(-1)!;
  return leerInstantanea(`datos/instantaneas/${n}`);
};
const demoVersionada = () => {
  const n = readdirSync(path.join(RAIZ, "datos/instantaneas/demo"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .at(-1)!;
  return leerInstantanea(`datos/instantaneas/demo/${n}`);
};

/** Reordena las claves de todo objeto (deep) sin tocar el orden de los arreglos: el mismo dato, otros bytes. */
function conClavesAlReves(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(conClavesAlReves);
  if (typeof v === "object" && v !== null)
    return Object.fromEntries(
      Object.entries(v)
        .reverse()
        .map(([k, x]) => [k, conClavesAlReves(x)]),
    );
  return v;
}

let a: Instantanea;
let b: Instantanea;
beforeAll(() => {
  a = oficial();
  b = demoVersionada();
});

describe("la instantánea demo", () => {
  it("la versionada es la que emite la receta hoy: si el catálogo cambió, se re-emite con pnpm catalogo:instantanea --demo", async () => {
    const r = await construirInstantanea(
      aplicarRecetaDemo(catalogoReal()),
      FECHA_DE_LA_INSTANTANEA_DEMO,
    );
    expect(r.emitida).toBe(true);
    if (!r.emitida) return;
    expect(r.instantanea.huella).toBe(b.huella);
    expect(`${JSON.stringify(r.instantanea, null, 2)}\n`).toBe(
      readFileSync(
        path.join(RAIZ, "datos/instantaneas/demo", r.archivo),
        "utf8",
      ),
    );
  });

  it("es la misma huella cada vez: la receta no tiene reloj ni azar", async () => {
    const x = await construirInstantanea(
      aplicarRecetaDemo(catalogoReal()),
      FECHA_DE_LA_INSTANTANEA_DEMO,
    );
    const y = await construirInstantanea(
      aplicarRecetaDemo(catalogoReal()),
      FECHA_DE_LA_INSTANTANEA_DEMO,
    );
    expect(x.emitida && y.emitida && x.instantanea.huella).toBe(
      y.emitida && y.instantanea.huella,
    );
  });

  it("no es la oficial: otra huella y otro nombre, y la oficial no se toca", () => {
    expect(b.huella).not.toBe(a.huella);
    expect(b.fecha_evaluacion).toBe(FECHA_DE_LA_INSTANTANEA_DEMO);
  });
});

describe("diferenciasEntreInstantaneas", () => {
  it("una instantánea frente a sí misma no tiene cambios", async () => {
    const d = await diferenciasEntreInstantaneas(a, a);
    expect(d.movimientos).toEqual([]);
    expect(d.resumen).toEqual({ entra: 0, sale: 0, cambia: 0 });
  });

  it("un JSON con las claves en otro orden NO es un cambio (JCS)", async () => {
    const reordenada = conClavesAlReves(a) as Instantanea;
    // El texto es otro…
    expect(JSON.stringify(reordenada)).not.toBe(JSON.stringify(a));
    // …y el dato es el mismo: ni su huella ni la comparación ven diferencia.
    expect(await huellaDeInstantanea(reordenada)).toBe(a.huella);
    const d = await diferenciasEntreInstantaneas(a, reordenada);
    expect(d.movimientos).toEqual([]);
  });

  it("lo que cambia es el CONTENIDO de las entradas: otra fecha de evaluación u otra huella del sobre no es un movimiento", async () => {
    const otra = structuredClone(a);
    otra.fecha_evaluacion = "2099-01-01";
    otra.huella = "f".repeat(64);
    const d = await diferenciasEntreInstantaneas(a, otra);
    expect(d.movimientos).toEqual([]);
    expect(d.resumen).toEqual({ entra: 0, sale: 0, cambia: 0 });
    // Pero el encabezado sí dice de qué a qué se comparó.
    expect(d.a.fecha).toBe("2099-01-01");
    expect(d.de.fecha).toBe(a.fecha_evaluacion);
  });

  it("un cambio en UNA entrada es UN movimiento: ninguna otra entrada se marca de paso", async () => {
    const otra = structuredClone(a);
    const h = otra.catalogo.herramientas[0]!;
    (h as Record<string, unknown>).campo_nuevo = "x";
    const d = await diferenciasEntreInstantaneas(a, otra);
    expect(d.movimientos.map((m) => `${m.seccion} ${m.id} ${m.tipo}`)).toEqual([
      `herramientas ${h.id} cambia`,
    ]);
  });

  it("el orden de un ARREGLO sí es un cambio: es dato", async () => {
    const otra = structuredClone(a);
    const p = otra.catalogo.pruebas.find((x) => x.controles.length > 0)!;
    p.controles = [...p.controles, "iso42001-A.2.2"];
    const d = await diferenciasEntreInstantaneas(a, otra);
    expect(d.movimientos.map((m) => `${m.tipo} ${m.id}`)).toEqual([
      `cambia ${p.id}`,
    ]);
  });

  it("de la oficial a la demo: lo que dice la receta, ni más ni menos", async () => {
    const d = await diferenciasEntreInstantaneas(a, b);
    const esperado = MOVIMIENTOS_DE_LA_RECETA.map(
      (m) => `${m.tipo} pruebas/${m.id}`,
    ).sort();
    expect(
      d.movimientos.map((m) => `${m.tipo} ${m.seccion}/${m.id}`).sort(),
    ).toEqual(esperado);
    expect(d.resumen).toEqual({ entra: 2, sale: 1, cambia: 2 });
    expect(d.de).toEqual({ fecha: a.fecha_evaluacion, huella: a.huella });
    expect(d.a).toEqual({ fecha: b.fecha_evaluacion, huella: b.huella });
  });

  it("cada «cambia» dice el campo, la regla del validador y las dos huellas, distintas", async () => {
    const d = await diferenciasEntreInstantaneas(a, b, LICENCIAS);
    const inv = d.movimientos.find((m) => m.id === "PR-MD-INV-001")!;
    expect(inv.tipo).toBe("cambia");
    expect(inv.huella_antes).toMatch(/^[0-9a-f]{64}$/);
    expect(inv.huella_despues).toMatch(/^[0-9a-f]{64}$/);
    expect(inv.huella_antes).not.toBe(inv.huella_despues);
    const aplicabilidad = inv.campos.find((c) => c.campo === "aplicabilidad")!;
    expect(aplicabilidad.regla).toBe("prueba/sin-aplicabilidad");
    expect(aplicabilidad.oculto).toBe(false);
    expect(aplicabilidad.antes).not.toEqual(aplicabilidad.despues);
    const coh = d.movimientos.find((m) => m.id === "PR-MD-COH-001")!;
    expect(coh.campos.map((c) => c.campo)).toContain("prioridad_base");
    // Lo que no cambió no aparece.
    expect(coh.campos.map((c) => c.campo)).not.toContain("aplicabilidad");
  });

  it("«entra» y «sale» solo traen la huella del lado donde está", async () => {
    const d = await diferenciasEntreInstantaneas(a, b);
    const entra = d.movimientos.find((m) => m.id === "PR-MD-DEMO-001")!;
    expect([entra.huella_antes, entra.campos]).toEqual([null, []]);
    expect(entra.huella_despues).toMatch(/^[0-9a-f]{64}$/);
    const sale = d.movimientos.find((m) => m.id === "PR-MD-LIM-001")!;
    expect([sale.huella_despues, sale.campos]).toEqual([null, []]);
    expect(sale.huella_antes).toMatch(/^[0-9a-f]{64}$/);
  });

  it("al revés, lo que entraba sale y lo que salía entra", async () => {
    const ida = await diferenciasEntreInstantaneas(a, b);
    const vuelta = await diferenciasEntreInstantaneas(b, a);
    expect(vuelta.resumen).toEqual({
      entra: ida.resumen.sale,
      sale: ida.resumen.entra,
      cambia: ida.resumen.cambia,
    });
    expect(vuelta.huella).not.toBe(ida.huella);
  });

  it("es determinista: dos corridas dan los mismos bytes y la misma huella", async () => {
    const x = await diferenciasEntreInstantaneas(a, b);
    const y = await diferenciasEntreInstantaneas(a, b);
    expect(JSON.stringify(x)).toBe(JSON.stringify(y));
    expect(x.huella).toMatch(/^[0-9a-f]{64}$/);
  });

  it("los movimientos salen ordenados por sección y por id, sin depender del orden de entrada", async () => {
    const d = await diferenciasEntreInstantaneas(a, b);
    const clave = (m: { seccion: string; id: string }) =>
      `${SECCIONES.indexOf(m.seccion as (typeof SECCIONES)[number])}|${m.id}`;
    expect(d.movimientos.map(clave)).toEqual(
      [...d.movimientos.map(clave)].sort(),
    );
    const mezclada = structuredClone(b);
    mezclada.catalogo.pruebas.reverse();
    const e = await diferenciasEntreInstantaneas(a, mezclada);
    // Mezclar el orden de las pruebas no es un cambio de ninguna prueba: la misma lista de movimientos.
    expect(e.movimientos.map((m) => `${m.tipo} ${m.id}`)).toEqual(
      d.movimientos.map((m) => `${m.tipo} ${m.id}`),
    );
  });
});

describe("un «cambia» siempre dice qué campo cambió", () => {
  it("un campo que pasa de AUSENTE a null cambia la huella de la entrada y por eso se nombra (no queda una lista de campos vacía)", async () => {
    const otra = structuredClone(a);
    (otra.catalogo.herramientas[0] as Record<string, unknown>).campo_nuevo =
      null;
    const d = await diferenciasEntreInstantaneas(a, otra, {});
    expect(d.movimientos).toHaveLength(1);
    expect(d.movimientos[0]!.tipo).toBe("cambia");
    expect(d.movimientos[0]!.campos.map((c) => c.campo)).toEqual([
      "campo_nuevo",
    ]);
  });

  it("entre la oficial y la demo, ningún «cambia» trae una lista de campos vacía", async () => {
    const d = await diferenciasEntreInstantaneas(
      oficial(),
      demoVersionada(),
      LICENCIAS,
    );
    for (const m of d.movimientos.filter((x) => x.tipo === "cambia"))
      expect(m.campos.length, `${m.seccion} ${m.id}`).toBeGreaterThan(0);
  });
});

describe("la licencia manda sobre lo que se muestra (regla dura 11)", () => {
  it("un cambio en un marco «solo_identificadores» dice que cambió, no qué decía", async () => {
    const otra = structuredClone(a);
    const m = otra.catalogo.marcos.find((x) => x.id === "iso-iec-42001")!;
    m.nombre = "Un nombre distinto del marco";
    const d = await diferenciasEntreInstantaneas(a, otra, {
      "iso-iec-42001": "solo_identificadores",
    });
    const mov = d.movimientos.find((x) => x.id === "iso-iec-42001")!;
    const campo = mov.campos.find((c) => c.campo === "nombre")!;
    expect(campo.oculto).toBe(true);
    expect([campo.antes, campo.despues]).toEqual([null, null]);
    expect(JSON.stringify(d)).not.toContain("Un nombre distinto del marco");
    // Pero las huellas sí prueban que cambió.
    expect(mov.huella_antes).not.toBe(mov.huella_despues);
  });

  it("un marco que no figura en las licencias cuenta como «solo_identificadores»", async () => {
    const otra = structuredClone(a);
    otra.catalogo.marcos[0]!.nombre = "Otro nombre";
    const d = await diferenciasEntreInstantaneas(a, otra, {});
    expect(d.movimientos[0]!.campos[0]!.oculto).toBe(true);
  });

  it("un marco con «cita_con_atribucion» sí muestra sus valores", async () => {
    const otra = structuredClone(a);
    const m = otra.catalogo.marcos.find((x) => x.id === "cwe")!;
    m.nombre = "Un nombre nuevo de CWE";
    const d = await diferenciasEntreInstantaneas(a, otra, {
      cwe: "cita_con_atribucion",
    });
    const campo = d.movimientos
      .find((x) => x.id === "cwe")!
      .campos.find((c) => c.campo === "nombre")!;
    expect(campo.oculto).toBe(false);
    expect(campo.despues).toBe("Un nombre nuevo de CWE");
  });

  it("si UNO de los dos lados es de un marco «solo_identificadores», nada se muestra, aunque el otro lado cite con atribución", async () => {
    // Una prueba que pasa de un marco restringido a uno que cita: el valor viejo sigue siendo texto de la norma restringida.
    const p0 = a.catalogo.pruebas.find((p) => p.marco_id !== "cwe")!;
    const otra = structuredClone(a);
    const p1 = otra.catalogo.pruebas.find((p) => p.id === p0.id)!;
    p1.marco_id = "cwe";
    p1.que_verifica = {
      es: "Texto nuevo que verifica, del marco que cita",
      en: "New verification text, from the framework that quotes",
    };
    const d = await diferenciasEntreInstantaneas(a, otra, {
      [p0.marco_id]: "solo_identificadores",
      cwe: "cita_con_atribucion",
    });
    const mov = d.movimientos.find((x) => x.id === p0.id)!;
    expect(mov.campos.length).toBeGreaterThan(1);
    expect(mov.campos.every((c) => c.oculto)).toBe(true);
    const salida = JSON.stringify(d);
    expect(salida).not.toContain("Texto nuevo que verifica");
    expect(salida).not.toContain(p0.que_verifica.es);
  });

  it("el resumen de un control de ISO/IEC 42001 no se muestra: es su texto (los controles se aplanan por id)", async () => {
    const otra = structuredClone(a);
    const control = otra.catalogo.controles[0]!.areas[0]!.controles[0]!;
    control.resumen_llano = { es: "Un resumen nuevo", en: "A new summary" };
    const d = await diferenciasEntreInstantaneas(a, otra, {});
    expect(d.movimientos).toHaveLength(1);
    const m = d.movimientos[0]!;
    expect([m.seccion, m.id, m.tipo]).toEqual([
      "controles",
      control.id,
      "cambia",
    ]);
    expect(m.campos[0]!.oculto).toBe(true);
    expect(JSON.stringify(d)).not.toContain("Un resumen nuevo");
  });
});

describe("las reglas que nombra la tabla existen", () => {
  it("cada regla de la tabla está en el validador, con su nombre en los dos idiomas", () => {
    for (const id of REGLAS_NOMBRADAS) {
      expect(REGLAS[id], id).toBeDefined();
      expect(REGLAS[id].nombre.es.length).toBeGreaterThan(0);
      expect(REGLAS[id].nombre.en.length).toBeGreaterThan(0);
    }
  });
});

describe("informeDeDiferencias", () => {
  it("dice los tres movimientos, la regla y las huellas, en los dos idiomas", async () => {
    const d = await diferenciasEntreInstantaneas(a, b);
    const es = informeDeDiferencias(d, "es");
    expect(es).toContain("2 entran · 1 salen · 2 cambian");
    expect(es).toContain("ENTRA  pruebas/PR-MD-DEMO-001");
    expect(es).toContain("SALE  pruebas/PR-MD-LIM-001");
    expect(es).toContain("CAMBIA  pruebas/PR-MD-INV-001");
    expect(es).toContain("prueba/sin-aplicabilidad");
    expect(es).toContain(d.huella);
    const en = informeDeDiferencias(d, "en");
    expect(en).toContain("2 enter · 1 leave · 2 change");
    expect(en).toContain("ENTERS  pruebas/PR-MD-DEMO-001");
    expect(en).toContain("LEAVES");
    expect(en).toContain("CHANGES");
  });

  it("un campo oculto dice «texto no mostrado» y no el texto", async () => {
    const otra = structuredClone(a);
    otra.catalogo.marcos[0]!.nombre = "Texto secreto del marco";
    const d = await diferenciasEntreInstantaneas(a, otra, {});
    const t = informeDeDiferencias(d, "es");
    expect(t).toContain("texto no mostrado");
    expect(t).not.toContain("Texto secreto del marco");
  });
});

describe("el nombre de la regla de un campo que solo cambió", () => {
  it("el campo sin regla propia no se muestra como un fallo del esquema", () => {
    const n = nombreDeRegla("esquema/campo-invalido");
    expect(n.es).not.toMatch(/no cumple/i);
    expect(n.en).not.toMatch(/does not match/i);
    expect(nombreDeRegla("prueba/sin-marco")).toEqual(
      REGLAS["prueba/sin-marco"].nombre,
    );
  });
});
