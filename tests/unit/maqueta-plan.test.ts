// Gate «autorización antes que plan» (regla dura 5) sobre la maqueta: la página del plan de un activo
// solo lista pruebas si la página de ESE activo declara alcance autorizado y reglas de enfrentamiento.
// Y el plan es coherente consigo mismo: las cifras de arriba son las filas de abajo, ninguna prueba está
// planeada y excluida a la vez, y toda exclusión dice su motivo y su razón.
import { describe, expect, it } from "vitest";
import { documentoDe, leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const paginas = paginasDe(RAIZ_MAQUETA);
const activos = paginas
  .filter((p) => p.startsWith("activo-"))
  .map((archivo) => {
    const raiz = documentoDe(leerPagina(RAIZ_MAQUETA, archivo)).querySelector("[data-activo]")!;
    return { archivo, id: raiz.getAttribute("data-activo")!, autorizado: raiz.getAttribute("data-autorizado") === "true" };
  });

const planDe = (id: string) => {
  const archivo = `plan-${id.toLowerCase()}.html`;
  return { archivo, doc: documentoDe(leerPagina(RAIZ_MAQUETA, archivo)) };
};
const ids = (doc: Document, atributo: string) => [...doc.querySelectorAll(`[${atributo}]`)].map((el) => el.getAttribute(atributo)!);

describe("maqueta: autorización antes que plan", () => {
  it("hay activos autorizados y al menos uno sin autorizar (los dos estados se ven)", () => {
    expect(activos.filter((a) => a.autorizado).length).toBeGreaterThan(0);
    expect(activos.filter((a) => !a.autorizado).length).toBeGreaterThan(0);
  });

  it.each(activos)("$id: su plan existe y es el de ese activo", ({ id }) => {
    const { archivo, doc } = planDe(id);
    expect(paginas, `${id}: falta la página de su plan`).toContain(archivo);
    expect(doc.querySelector("[data-plan-de]")?.getAttribute("data-plan-de"), `${archivo} muestra el plan de otro activo`).toBe(id);
  });

  it.each(activos.filter((a) => !a.autorizado))("$id sin autorización: su plan no lista ninguna prueba", ({ id }) => {
    const { archivo, doc } = planDe(id);
    expect(ids(doc, "data-planeada"), `${archivo}: plan emitido sin alcance ni reglas`).toEqual([]);
    expect(ids(doc, "data-excluida")).toEqual([]);
  });

  it.each(activos.filter((a) => a.autorizado))("$id autorizado: el plan es coherente consigo mismo", ({ id }) => {
    const { archivo, doc } = planDe(id);
    const planeadas = ids(doc, "data-planeada");
    const excluidas = ids(doc, "data-excluida");
    expect(planeadas.length, `${archivo}: plan sin pruebas`).toBeGreaterThan(0);
    expect(planeadas.filter((p) => excluidas.includes(p)), `${archivo}: prueba planeada y excluida a la vez`).toEqual([]);
    expect(new Set(planeadas).size).toBe(planeadas.length);

    const cifras = [...doc.querySelectorAll(".hg-resumen .hg-cifra")].map((c) => Number(c.textContent));
    expect(cifras[0], `${archivo}: la cifra de planeadas no es el número de filas`).toBe(planeadas.length);
    expect(cifras[1], `${archivo}: la cifra de excluidas no es el número de filas`).toBe(excluidas.length);

    for (const fila of doc.querySelectorAll("[data-excluida]")) {
      const quien = `${archivo} · ${fila.getAttribute("data-excluida")}`;
      expect(["perfil", "alcance", "operador"], `${quien}: motivo desconocido`).toContain(fila.getAttribute("data-motivo"));
      for (const idioma of ["es", "en"]) {
        const razon = [...fila.querySelectorAll(`.hg-menor [lang="${idioma}"]`)].map((el) => el.textContent ?? "").join(" ");
        expect(razon.trim().length, `${quien}: exclusión sin razón (${idioma})`).toBeGreaterThan(20);
      }
    }
    for (const p of planeadas) expect(paginas, `${archivo}: ${p} no tiene ficha`).toContain(`prueba-${p.toLowerCase()}.html`);
  });
});
