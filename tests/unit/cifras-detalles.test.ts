// @vitest-environment node
// La prosa del export (`detalle` de cada métrica) la escribe `scripts/cifras-del-export.mjs`. No puede asumir la cardinalidad de hoy: una
// familia nueva o una herramienta más no deja un export falso ni un «undefined» (auditoría S9, A3: los datos dicen N, el texto no cuenta cuatro).
import { describe, expect, it } from "vitest";
import {
  detalles,
  enumerar,
  navegadoresDeLaConfig,
} from "../../scripts/cifras-del-export.mjs";

const baratas = {
  pruebas_en_el_catalogo: 45,
  por_familia: {},
  familias: [
    { id: "software", nombre: "software", pruebas: 10 },
    { id: "agente", nombre: "agente", pruebas: 9 },
    { id: "modelo_generativo", nombre: "modelo generativo", pruebas: 7 },
    { id: "modelo_decision", nombre: "modelo de decisión", pruebas: 12 },
    { id: "robotica", nombre: "robótica", pruebas: 7 },
  ],
  navegadores_e2e: ["Chromium", "Firefox", "WebKit", "Edge"],
  herramientas: 14,
  herramientas_publicas: 12,
  herramientas_propias: 2,
  secciones_del_manual: 9,
};
const caras = { pruebas_unitarias: 10, pruebas_e2e: 20, archivos_unitarios: 2 };
const textos = detalles(baratas, caras, "2026-10-13");

describe("la prosa del export cuenta lo que dicen los datos", () => {
  it("enumera cada familia que hay, con su cuenta, en el orden del dato", () => {
    const t = textos.pruebas_en_el_catalogo();
    expect(t).toContain(
      "software 10, agente 9, modelo generativo 7, modelo de decisión 12 y robótica 7",
    );
    expect(t).not.toContain("undefined");
  });
  it("cuenta las herramientas públicas y las propias por su tipo, no restando una", () => {
    const t = textos.herramientas();
    expect(t).toContain("12 públicas");
    expect(t).toContain("2 propias");
    expect(t).not.toContain("undefined");
  });
  it("una sola propia va en singular, y ninguna no se menciona", () => {
    const una = detalles(
      { ...baratas, herramientas_propias: 1 },
      caras,
      "2026-10-13",
    ).herramientas();
    expect(una).toContain("1 propia de HackGuard");
    const ninguna = detalles(
      { ...baratas, herramientas_propias: 0 },
      caras,
      "2026-10-13",
    ).herramientas();
    expect(ninguna).not.toContain("propia");
  });
  it("los navegadores salen de la configuración, y la prosa los lista todos", () => {
    expect(textos.pruebas_automaticas()).toContain(
      "en Chromium, Firefox, WebKit y Edge sobre el build",
    );
    expect(navegadoresDeLaConfig()).toEqual(["Chromium", "Firefox", "WebKit"]);
  });
  it("no repite el total de funciones de la visión: ese número no tiene fuente en el repo", () => {
    expect(textos.funcionalidades(18)).not.toMatch(/de las \d+/);
  });
  it("enumerar escribe la lista como una persona", () => {
    expect(enumerar([])).toBe("");
    expect(enumerar(["a"])).toBe("a");
    expect(enumerar(["a", "b"])).toBe("a y b");
    expect(enumerar(["a", "b", "c"])).toBe("a, b y c");
  });
});
