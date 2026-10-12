// @vitest-environment node
// El validador de hallazgos: los demo son válidos, y cada regla se ve fallar con la mutación que la dispara.
// «Cerrado» no se escribe: un archivo con un estado a mano no pasa el esquema.
import { describe, expect, it } from "vitest";
import type { Sobre } from "../../../src/engine/evidencia/esquemas.ts";
import { REGLAS_DE_HALLAZGO, validarHallazgos, type ContextoDeHallazgos, type IdReglaDeHallazgo } from "../../../src/engine/hallazgos/validar.ts";
import type { Hallazgo } from "../../../src/engine/hallazgos/esquemas.ts";
import { con, copia, mundo, nuevo } from "../evidencia/ayuda.ts";

const reglas = (r: { hallazgos: { regla: string }[] }) => r.hallazgos.map((h) => h.regla);
const ruta = (id: string) => `datos/hallazgos/demo/${id}.json`;

async function contexto(extra: Sobre[] = [], sin: string[] = []): Promise<ContextoDeHallazgos> {
  const m = await mundo();
  const libro = [...Object.values(m.sobres).filter((s) => !sin.includes(s.id)), ...extra].map((sobre) => ({
    ruta: `datos/evidencia/demo/${sobre.id}.json`,
    sobre,
  }));
  return { libro, pruebas: m.contexto.pruebas };
}
/**
 * Valida un archivo dentro del conjunto completo de hallazgos (los demás siguen ahí, para que las re-pruebas de
 * los otros no queden huérfanas) y devuelve solo lo que toca a ESE archivo.
 */
async function validar(h: Hallazgo | Record<string, unknown>, r?: string, ctx?: ContextoDeHallazgos) {
  const m = await mundo();
  const id = (h as { id: string }).id;
  const donde = r ?? ruta(id);
  const otros = m.archivosDeHallazgos.filter((a) => a.ruta !== ruta(id) && a.ruta !== donde);
  const res = validarHallazgos([...otros, { ruta: donde, texto: JSON.stringify(h) }], ctx ?? (await contexto()));
  const suyos = res.hallazgos.filter((x) => x.ruta === donde);
  return {
    hallazgos: suyos,
    validos: res.validos.filter((x) => x.id === id),
    estado: suyos.some((x) => x.severidad === "error") ? "invalido" : "ok",
  };
}

it("los cuatro hallazgos demo son válidos", async () => {
  const m = await mundo();
  const r = validarHallazgos(m.archivosDeHallazgos, await contexto());
  expect(r.hallazgos).toEqual([]);
  expect(r.estado).toBe("ok");
  expect(r.validos.map((h) => h.id)).toEqual(["HZ-0003", "HZ-0005", "HZ-0007", "HZ-0009"]);
});

describe("cada regla, con la mutación que la dispara", () => {
  const casos: [string, IdReglaDeHallazgo, string, (h: Hallazgo) => Record<string, unknown>][] = [
    ["un estado escrito a mano (cerrado no se escribe)", "esquema/campo-invalido", "HZ-0007", (h) => ({ ...copia(h), estado: "cerrado" })],
    ["una severidad que no existe", "esquema/campo-invalido", "HZ-0007", (h) => ({ ...copia(h), severidad: { tipo: "inventada" } })],
    ["un impacto fuera de la escala", "esquema/campo-invalido", "HZ-0007", (h) => ({ ...copia(h), severidad: { tipo: "escala_ia", impacto: 5, alcance: 2, detectabilidad: 3 } })],
    ["una aceptación sin revisión", "esquema/campo-invalido", "HZ-0005", (h) => ({ ...copia(h), eventos: [{ tipo: "aceptacion", fecha: "2026-09-01", por: "x", justificacion: { es: "j", en: "j" } }] })],
    ["una eliminación sin justificación", "esquema/campo-invalido", "HZ-0007", (h) => ({ ...copia(h), eventos: [{ tipo: "eliminacion", fecha: "2026-09-01", por: "x" }] })],
    ["un sobre de origen que no existe", "hallazgo/sobre-origen-inexistente", "HZ-0007", (h) => ({ ...copia(h), sobre_origen: "SOB-9999" })],
    ["un sobre de origen sin confirmar", "hallazgo/sobre-origen-sin-confirmar", "HZ-0007", (h) => ({ ...copia(h), sobre_origen: "SOB-0036" })],
    ["un sobre de origen que no es una falla", "hallazgo/sobre-origen-no-es-falla", "HZ-0007", (h) => ({ ...copia(h), sobre_origen: "SOB-0016" })],
    ["un origen que no es el del sobre", "hallazgo/origen-distinto-del-sobre", "HZ-0007", (h) => ({ ...copia(h), origen: "propio" })],
    ["CVSS en un hallazgo de IA", "hallazgo/severidad-no-es-la-de-la-familia", "HZ-0007", (h) => ({ ...copia(h), severidad: { tipo: "cvss", vector: "CVSS:4.0/AV:N" } })],
    ["escala de IA en un hallazgo de software", "hallazgo/severidad-no-es-la-de-la-familia", "HZ-0009", (h) => ({ ...copia(h), severidad: { tipo: "escala_ia", impacto: 2, alcance: 2, detectabilidad: 2 } })],
    ["un evento anterior a la apertura", "hallazgo/evento-anterior-a-la-apertura", "HZ-0003", (h) => ({ ...copia(h), eventos: [{ ...h.eventos[0]!, fecha: "2026-08-01" }] })],
    ["eventos en desorden", "hallazgo/eventos-fuera-de-orden", "HZ-0003", (h) => ({
      ...copia(h),
      eventos: [{ ...h.eventos[0]!, fecha: "2026-09-20" }, { ...h.eventos[0]!, fecha: "2026-09-10" }],
    })],
  ];

  it.each(casos)("%s → %s", async (_c, regla, id, mutar) => {
    const m = await mundo();
    const r = await validar(mutar(m.hallazgos[id]!), ruta(id));
    expect(reglas(r)).toContain(regla);
    expect(REGLAS_DE_HALLAZGO[regla].severidad).toBe("error");
    expect(r.estado).toBe("invalido");
    expect(r.validos, "un hallazgo con un error no entra").toEqual([]);
  });

  it("un archivo que no es JSON", async () => {
    const m = await mundo();
    const otros = m.archivosDeHallazgos.filter((a) => a.ruta !== ruta("HZ-0007"));
    const r = validarHallazgos([...otros, { ruta: ruta("HZ-0007"), texto: "no json" }], await contexto());
    expect(r.hallazgos.filter((h) => h.ruta === ruta("HZ-0007")).map((h) => h.regla)).toEqual(["archivo/json-invalido"]);
  });

  it("el nombre del archivo no es el id", async () => {
    const m = await mundo();
    expect(reglas(await validar(m.hallazgos["HZ-0007"]!, ruta("HZ-0099")))).toContain("archivo/nombre-no-coincide");
  });

  it("dos archivos con el mismo id", async () => {
    const m = await mundo();
    const r = validarHallazgos([...m.archivosDeHallazgos, { ruta: "datos/hallazgos/demo/otra/HZ-0007.json", texto: JSON.stringify(m.hallazgos["HZ-0007"]!) }], await contexto());
    expect(reglas(r)).toContain("hallazgo/id-duplicado");
  });
});

describe("el origen y la carpeta cuadran (regla dura 8)", () => {
  it("un hallazgo propio en la carpeta pública es un error", async () => {
    const m = await mundo();
    const propio = await con(m.sobres["SOB-0019"]!, { origen: "propio" });
    const ctx = await contexto([propio], ["SOB-0019"]);
    const r = await validar({ ...copia(m.hallazgos["HZ-0007"]!), origen: "propio" }, ruta("HZ-0007"), ctx);
    expect(reglas(r)).toContain("hallazgo/origen-no-demo-en-datos-publicos");
  });

  it("un hallazgo demo en datos/privado/ es un error: saldría como público", async () => {
    const m = await mundo();
    const r = await validar(m.hallazgos["HZ-0007"]!, "datos/privado/hallazgos/HZ-0007.json");
    expect(reglas(r)).toContain("hallazgo/demo-en-carpeta-privada");
  });
});

describe("el vector CVSS pasa por el validador estricto cuando hay uno", () => {
  it("si el validador dice que no, el hallazgo no entra", async () => {
    const m = await mundo();
    const ctx = { ...(await contexto()), vectorInvalido: (v: string) => (v.includes("UI:A") ? "falta SA" : null) };
    const r = await validar(m.hallazgos["HZ-0009"]!, ruta("HZ-0009"), ctx);
    expect(reglas(r)).toContain("hallazgo/vector-invalido");
    expect(r.hallazgos.find((h) => h.regla === "hallazgo/vector-invalido")?.detalle?.es).toBe("falta SA");
  });

  it("si dice que sí, pasa; y sin validador no se mira", async () => {
    const m = await mundo();
    const ok = { ...(await contexto()), vectorInvalido: () => null };
    expect(reglas(await validar(m.hallazgos["HZ-0009"]!, ruta("HZ-0009"), ok))).toEqual([]);
    expect(reglas(await validar(m.hallazgos["HZ-0009"]!, ruta("HZ-0009")))).toEqual([]);
  });
});

describe("una re-prueba que cita un hallazgo que no existe", () => {
  it("el libro lo sabe y el hallazgo no está: error, con la ruta del sobre", async () => {
    const m = await mundo();
    const huerfano = await nuevo(m.sobres["SOB-0027"]!, "SOB-0060", { reprueba_de: "HZ-0099" });
    const ctx = await contexto([huerfano]);
    const r = validarHallazgos(m.archivosDeHallazgos, ctx);
    const h = r.hallazgos.find((x) => x.regla === "hallazgo/reprueba-huerfana");
    expect(h).toMatchObject({ ruta: "datos/evidencia/demo/SOB-0060.json", campo: "reprueba_de" });
    expect(r.estado).toBe("invalido");
  });

  it("los demo no tienen ninguna", async () => {
    const m = await mundo();
    expect(reglas(validarHallazgos(m.archivosDeHallazgos, await contexto()))).not.toContain("hallazgo/reprueba-huerfana");
  });
});

it("las reglas de hallazgo tienen nombre en español y en inglés", () => {
  for (const [id, r] of Object.entries(REGLAS_DE_HALLAZGO)) {
    expect(r.nombre.es.length, id).toBeGreaterThan(5);
    expect(r.nombre.en.length, id).toBeGreaterThan(5);
  }
});
