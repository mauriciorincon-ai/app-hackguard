// @vitest-environment node
// El validador del libro: los sobres demo versionados son válidos, y cada regla se ve fallar con la mutación que
// la dispara. Un sobre que contradice al catálogo, al plan, a su regla o a sus propias huellas no entra al libro.
import { describe, expect, it } from "vitest";
import { Sobre } from "../../../src/engine/evidencia/esquemas.ts";
import {
  REGLAS_DE_SOBRE,
  validarEvidencia,
  type ContextoDeEvidencia,
  type IdReglaDeSobre,
} from "../../../src/engine/evidencia/validar.ts";
import { archivoDe, ASISTENTE, con, copia, editado, mundo, nuevo, rutaDemo, rutaPrivada } from "./ayuda.ts";

const reglas = (r: { hallazgos: { regla: string }[] }) => r.hallazgos.map((h) => h.regla);

async function validar(sobre: Sobre | Record<string, unknown>, ruta?: string, contexto?: ContextoDeEvidencia) {
  const m = await mundo();
  const id = (sobre as { id: string }).id;
  return validarEvidencia([archivoDe(ruta ?? rutaDemo(id), sobre)], contexto ?? m.contexto);
}

describe("el libro demo", () => {
  it("los 11 sobres son válidos: solo notas (sin confirmar y fechas de la maqueta)", async () => {
    const m = await mundo();
    const r = await validarEvidencia(m.archivosDeSobres, m.contexto);
    expect(r.hallazgos.filter((h) => h.severidad !== "nota")).toEqual([]);
    expect(r.estado).toBe("ok");
    expect(r.sobres).toHaveLength(11);
    expect(new Set(reglas(r))).toEqual(new Set(["sobre/sin-confirmar", "sobre/demo-anterior-al-plan"]));
  });

  it("cada sobre demo cita el plan y el paquete emitidos, y la herramienta, el selector y las k del paquete", async () => {
    const m = await mundo();
    for (const s of Object.values(m.sobres)) {
      const emitido = m.contexto.planes[s.activo]!;
      expect(s.plan.huella, s.id).toBe(emitido.plan.huella);
      expect(s.paquete.huella, s.id).toBe(emitido.paquete.huella);
    }
  });
});

describe("cada regla, con la mutación que la dispara", () => {
  const casos: [string, IdReglaDeSobre, string, (s: Sobre) => Promise<Sobre | Record<string, unknown>>][] = [
    ["un campo que no existe (el crudo no cabe)", "esquema/campo-invalido", "SOB-0012", async (s) => ({ ...copia(s), crudo: "salida de la herramienta" })],
    ["otro campo que no existe", "esquema/campo-invalido", "SOB-0012", async (s) => ({ ...copia(s), raw: "x" })],
    ["un veredicto que no existe", "esquema/campo-invalido", "SOB-0012", async (s) => ({ ...copia(s), veredicto: "quizas" })],
    ["una confirmación por lote (aún no existe)", "esquema/campo-invalido", "SOB-0012", async (s) => ({ ...copia(s), confirmacion: { por: "x", fecha: "2026-08-18", modo: "lote" } })],
    ["un extracto de más de 1500 caracteres", "esquema/campo-invalido", "SOB-0012", async (s) => ({ ...copia(s), extracto_redactado: "a".repeat(1501) })],
    ["el plan que cita no es el emitido", "sobre/plan-no-cuadra", "SOB-0012", (s) => con(s, { plan: { huella: "a".repeat(64) } })],
    ["el paquete que cita no es el del plan", "sobre/paquete-no-cuadra", "SOB-0012", (s) => con(s, { paquete: { huella: "b".repeat(64) } })],
    ["una prueba que el paquete no trae", "sobre/prueba-fuera-del-plan", "SOB-0012", (s) => con(s, { prueba: "PR-SW-SQLI-001" })],
    ["una regla distinta de la del catálogo", "sobre/regla-distinta-del-catalogo", "SOB-0012", (s) => con(s, { regla: "metrica_con_umbral" })],
    ["otras repeticiones k", "sobre/k-distinto-del-paquete", "SOB-0012", (s) => con(s, { k: 5 })],
    ["otra herramienta", "sobre/herramienta-distinta-del-paquete", "SOB-0012", (s) => con(s, { herramienta: { id: "zap", version: "2.17.0" } })],
    ["una versión menor que la mínima", "sobre/version-menor-que-la-minima", "SOB-0012", (s) => con(s, { herramienta: { id: s.herramienta.id, version: "0.16.9" } })],
    ["otro selector", "sobre/selector-distinto-del-paquete", "SOB-0012", (s) => con(s, { selector: { ...copia(s.selector), probes: ["otra"] } as Sobre["selector"] })],
    ["sin los conteos que la regla pide", "sobre/faltan-datos-de-la-regla", "SOB-0012", (s) => con(s, { resultado: { ...s.resultado, fallidas: null } })],
    ["un veredicto «superada» con 6 fallas de 20", "sobre/veredicto-no-es-el-de-la-regla", "SOB-0012", (s) => con(s, { veredicto: "superada" })],
    ["un «superada» sin constancia de que la regla corrió", "sobre/veredicto-no-es-el-de-la-regla", "SOB-0023", (s) => con(s, { veredicto: "superada" })],
    ["una edición después de sellar (la fecha)", "sobre/huella-no-cuadra", "SOB-0012", async (s) => editado(s, { fecha: "2026-08-19" })],
    ["una edición después de sellar (la herramienta)", "sobre/huella-no-cuadra", "SOB-0012", async (s) => editado(s, { extracto_redactado: "otro" })],
    ["una huella de resultado que no es la del contenido", "sobre/huella-no-cuadra", "SOB-0012", async (s) => ({ ...copia(s), huellas: { ...s.huellas, resultado: "c".repeat(64) } })],
    ["una huella de crudo que no es la del crudo sintético", "sobre/crudo-demo-no-sintetico", "SOB-0012", async (s) => ({ ...copia(s), huellas: { ...s.huellas, crudo: "d".repeat(64) } })],
    ["una confirmación anterior a la corrida", "sobre/confirmacion-anterior-a-la-corrida", "SOB-0012", (s) => con(s, { confirmacion: { por: "x", fecha: "2026-01-01", modo: "individual" } })],
    ["corregir a un sobre que no existe", "sobre/corrige-inexistente", "SOB-0012", (s) => con(s, { corrige: "SOB-9999" })],
    ["corregirse a sí mismo", "sobre/corrige-inexistente", "SOB-0012", (s) => con(s, { corrige: "SOB-0012" })],
  ];

  it.each(casos)("%s → %s", async (_c, regla, id, mutar) => {
    const m = await mundo();
    const r = await validar(await mutar(m.sobres[id]!), rutaDemo(id));
    expect(reglas(r)).toContain(regla);
    expect(REGLAS_DE_SOBRE[regla].severidad).toBe("error");
    expect(r.estado).toBe("invalido");
    expect(r.sobres, "un sobre con un error no entra al libro").toEqual([]);
  });

  it("un archivo que no es JSON", async () => {
    const m = await mundo();
    const r = await validarEvidencia([{ ruta: rutaDemo("SOB-0012"), texto: "{no es json" }], m.contexto);
    expect(reglas(r)).toEqual(["archivo/json-invalido"]);
  });

  it("el nombre del archivo no es el id del sobre", async () => {
    const m = await mundo();
    const r = await validar(m.sobres["SOB-0012"]!, rutaDemo("SOB-0099"));
    expect(reglas(r)).toContain("archivo/nombre-no-coincide");
  });

  it("dos archivos con el mismo id", async () => {
    const m = await mundo();
    const s = m.sobres["SOB-0012"]!;
    const r = await validarEvidencia([archivoDe(rutaDemo("SOB-0012"), s), archivoDe("datos/evidencia/demo/otro/SOB-0012.json", s)], m.contexto);
    expect(reglas(r)).toContain("sobre/id-duplicado");
  });

  it("un sobre de un activo que no tiene plan: sin plan no hay evidencia", async () => {
    const m = await mundo();
    const r = await validar(await con(m.sobres["SOB-0012"]!, { activo: "act-demo-portal" }));
    expect(reglas(r)).toContain("sobre/activo-sin-plan");
  });
});

describe("el origen y la carpeta cuadran (regla dura 8)", () => {
  it("un sobre propio en la carpeta pública es un error", async () => {
    const m = await mundo();
    const r = await validar(await con(m.sobres["SOB-0012"]!, { origen: "propio" }));
    expect(reglas(r)).toContain("sobre/origen-no-demo-en-datos-publicos");
  });

  it("un sobre demo en datos/privado/ es un error: saldría como público", async () => {
    const m = await mundo();
    const r = await validar(m.sobres["SOB-0012"]!, rutaPrivada("SOB-0012"));
    expect(reglas(r)).toContain("sobre/demo-en-carpeta-privada");
    expect(r.estado).toBe("invalido");
  });

  it("un sobre propio en datos/privado/ pasa su origen y avisa, como advertencia, que es anterior al plan", async () => {
    const m = await mundo();
    const propio = await con(m.sobres["SOB-0012"]!, { origen: "propio" });
    const r = await validar(propio, rutaPrivada("SOB-0012"));
    expect(reglas(r)).not.toContain("sobre/origen-no-demo-en-datos-publicos");
    expect(reglas(r)).toContain("sobre/anterior-al-plan");
    expect(r.estado).toBe("con_advertencias");
  });
});

describe("una revisión de diseño la declara una persona y exige su razón", () => {
  async function conRegla(razon: Sobre["razon"]) {
    const m = await mundo();
    const base = m.sobres["SOB-0016"]!;
    const s = await con(base, { regla: "revision_de_diseno", razon, veredicto: "superada" });
    const contexto: ContextoDeEvidencia = {
      ...m.contexto,
      pruebas: m.contexto.pruebas.map((p) => (p.id === s.prueba ? { ...p, regla: "revision_de_diseno" } : p)),
    };
    return validar(s, rutaDemo(s.id), contexto);
  }

  it("sin razón es un error", async () => {
    expect(reglas(await conRegla(null))).toContain("sobre/veredicto-declarado-sin-razon");
  });

  it("con razón no hay error de veredicto", async () => {
    const r = await conRegla({ es: "Revisado con el dueño", en: "Reviewed with the owner" });
    expect(reglas(r)).not.toContain("sobre/veredicto-declarado-sin-razon");
    expect(reglas(r)).not.toContain("sobre/veredicto-no-es-el-de-la-regla");
  });
});

describe("corregir un sobre es registrar otro que lo cita", () => {
  it("un sobre de la misma prueba y activo puede corregir a otro", async () => {
    const m = await mundo();
    const corrector = await nuevo(m.sobres["SOB-0012"]!, "SOB-0040", { corrige: "SOB-0012" });
    const r = await validarEvidencia(
      [archivoDe(rutaDemo("SOB-0012"), m.sobres["SOB-0012"]!), archivoDe(rutaDemo("SOB-0040"), corrector)],
      m.contexto,
    );
    expect(reglas(r)).not.toContain("sobre/corrige-inexistente");
    expect(reglas(r)).not.toContain("sobre/corrige-otra-prueba");
    expect(r.sobres.map((s) => s.sobre.id)).toEqual(["SOB-0012", "SOB-0040"]);
  });

  it("no puede corregir a un sobre de otra prueba", async () => {
    const m = await mundo();
    const corrector = await nuevo(m.sobres["SOB-0012"]!, "SOB-0040", { corrige: "SOB-0019" });
    const r = await validarEvidencia(
      [archivoDe(rutaDemo("SOB-0019"), m.sobres["SOB-0019"]!), archivoDe(rutaDemo("SOB-0040"), corrector)],
      m.contexto,
    );
    expect(reglas(r)).toContain("sobre/corrige-otra-prueba");
  });
});

describe("el filtro de contenido del S1 marca y no rechaza (regla dura 3)", () => {
  it("un extracto que parece un procedimiento se marca como advertencia y el sobre sigue en el libro", async () => {
    const m = await mundo();
    const carnada = (await import("../../../datos/filtro/patrones.json")).default.patrones[0]!.carnadas[0]!;
    const s = await con(m.sobres["SOB-0012"]!, { extracto_redactado: carnada });
    const r = await validar(s);
    expect(reglas(r)).toContain("sobre/extracto-marcado");
    expect(r.hallazgos.find((h) => h.regla === "sobre/extracto-marcado")?.severidad).toBe("advertencia");
    expect(r.sobres.map((x) => x.sobre.id)).toEqual(["SOB-0012"]);
  });

  it("el extracto de los demo no se marca", async () => {
    const m = await mundo();
    const r = await validarEvidencia(m.archivosDeSobres, m.contexto);
    expect(reglas(r)).not.toContain("sobre/extracto-marcado");
  });
});

it("las reglas del libro tienen nombre en español y en inglés", () => {
  for (const [id, r] of Object.entries(REGLAS_DE_SOBRE)) {
    expect(r.nombre.es.length, id).toBeGreaterThan(5);
    expect(r.nombre.en.length, id).toBeGreaterThan(5);
  }
});

it("el sobre de otro activo con su propio plan también se valida contra SU paquete", async () => {
  const m = await mundo();
  const clas = m.sobres["SOB-0003"]!;
  expect(clas.activo).not.toBe(ASISTENTE);
  const r = await validar(await con(clas, { k: 99 }));
  expect(reglas(r)).toContain("sobre/k-distinto-del-paquete");
});
