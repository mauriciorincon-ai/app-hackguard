// El script de tema e idioma que va en línea en <head>: aplica lo guardado, ignora lo que no es válido y no revienta sin almacenamiento.
import { beforeEach, describe, expect, it } from "vitest";
import {
  PREFIJO_DE_PREFERENCIAS,
  SCRIPT_DE_PREFERENCIAS,
} from "../../src/lib/preferencias";

const raiz = () => document.documentElement;
const correr = () => new Function(SCRIPT_DE_PREFERENCIAS)();

describe("script de preferencias antes del primer pintado", () => {
  beforeEach(() => {
    window.localStorage.clear();
    raiz().setAttribute("data-theme", "oscuro");
    raiz().setAttribute("data-lang", "es");
    raiz().setAttribute("lang", "es");
  });

  it("aplica el tema y el idioma guardados", () => {
    window.localStorage.setItem(`${PREFIJO_DE_PREFERENCIAS}tema`, "claro");
    window.localStorage.setItem(`${PREFIJO_DE_PREFERENCIAS}idioma`, "en");
    correr();
    expect(raiz().getAttribute("data-theme")).toBe("claro");
    expect(raiz().getAttribute("data-lang")).toBe("en");
    expect(raiz().getAttribute("lang")).toBe("en");
  });

  it("sin nada guardado deja los valores por defecto (oscuro, español)", () => {
    correr();
    expect(raiz().getAttribute("data-theme")).toBe("oscuro");
    expect(raiz().getAttribute("lang")).toBe("es");
  });

  it("ignora un valor que no es de la lista, en vez de pintar con él", () => {
    window.localStorage.setItem(`${PREFIJO_DE_PREFERENCIAS}tema`, "morado");
    window.localStorage.setItem(`${PREFIJO_DE_PREFERENCIAS}idioma`, "fr");
    correr();
    expect(raiz().getAttribute("data-theme")).toBe("oscuro");
    expect(raiz().getAttribute("data-lang")).toBe("es");
  });

  it("no revienta si el almacenamiento no está disponible", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage")!;
    Object.defineProperty(window, "localStorage", {
      get: () => {
        throw new Error("bloqueado");
      },
      configurable: true,
    });
    try {
      expect(correr).not.toThrow();
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });

  it("usa el mismo prefijo que el botón de tema e idioma", async () => {
    const fuente = (await import("node:fs")).readFileSync(
      "src/components/consola/conmutadores.tsx",
      "utf8",
    );
    expect(fuente).toContain(`const CLAVE = "${PREFIJO_DE_PREFERENCIAS}";`);
  });
});
