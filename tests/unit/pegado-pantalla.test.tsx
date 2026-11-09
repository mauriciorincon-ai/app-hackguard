// La vía «Texto pegado» como la ve la persona (regla 22: cada control se activa y algo cambia): se pega, se propone, se ve la brecha antes
// y después, se descarga el sobre sin el texto de la herramienta y se borra. Las cuentas no se calculan aquí: salen del motor.
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PegadoPantalla } from "../../src/components/carga/pegado-pantalla";
import { GARAK, mundoDePegado, textoDeFixture } from "./lib/mundo-de-pegado";
import { vistaDeCarga } from "./lib/mundo-de-carga";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const CONSULTA = "2026-11-08";
const etiquetas = () => {
  const e = vistaDeCarga().etiquetas;
  return { local: e.via_local, sinSobre: e.pegado_sin_sobre };
};
const montar = (mundo = mundoDePegado(CONSULTA)) =>
  render(<PegadoPantalla mundo={mundo} etiquetas={etiquetas()} />);

const escribir = (c: HTMLElement, id: string, valor: string) =>
  fireEvent.change(c.querySelector<HTMLInputElement>(`#${id}`)!, {
    target: { value: valor },
  });
const proponer = async (c: HTMLElement, texto = textoDeFixture(GARAK)) => {
  escribir(c, "pegado-texto", texto);
  escribir(c, "pegado-zona", "America/Bogota");
  fireEvent.click(c.querySelector("[data-proponer]")!);
  await waitFor(() =>
    expect(c.querySelector("[data-pegado-resultado]")).not.toBeNull(),
  );
};

describe("proponer desde el texto pegado", () => {
  it("un sobre por prueba, con el veredicto de la regla, y la brecha antes y después con su diferencia", async () => {
    const { container: c } = montar();
    await proponer(c);
    expect(c.querySelectorAll("[data-sobre-propuesto]")).toHaveLength(3);
    const filas = [...c.querySelectorAll("[data-cifra-pegado]")];
    expect(filas.length).toBeGreaterThan(3);
    for (const f of filas) {
      const n = (celda: string) =>
        Number(
          f
            .querySelector(`[data-celda="${celda}"]`)!
            .textContent!.replace("−", "-")
            .replace("+", ""),
        );
      expect(n("cambio"), f.getAttribute("data-cifra-pegado")!).toBe(
        n("despues") - n("antes"),
      );
    }
    expect(
      c
        .querySelector('[data-cambio-control="iso42001-A.9.4"]')
        ?.getAttribute("data-sentido"),
    ).toBe("empeoro");
    expect(c.querySelector("[data-pegado-resultado]")!.textContent).toContain(
      "pnpm evidencia:confirmar-lote",
    );
  });

  it("lo que hace no es un botón de confirmar: no hay ninguno, y proponer no escribe en el almacenamiento ni llama a la red", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const traer = vi.fn();
    vi.stubGlobal("fetch", traer);
    const { container: c } = montar();
    await proponer(c);
    expect(setItem).not.toHaveBeenCalled();
    expect(traer).not.toHaveBeenCalled();
    const textos = [...c.querySelectorAll("button")].map((b) =>
      b.textContent!.toLowerCase(),
    );
    expect(textos.some((t) => /confirmar|confirm it\b/.test(t))).toBe(false);
    vi.unstubAllGlobals();
  });

  it("«Descargar sobre-propuesto.json» baja el sobre propuesto: sin confirmar y sin el texto de la herramienta", async () => {
    const bajadas: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      bajadas.push(b as Blob);
      return "blob:prueba";
    });
    URL.revokeObjectURL = vi.fn();
    const nombres: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      nombres.push(this.download);
    });
    const { container: c } = montar();
    const canario = "CANARIO-DE-LA-PRUEBA-5521";
    await proponer(
      c,
      `${textoDeFixture(GARAK).trimEnd()}\n${JSON.stringify({ entry_type: "nota", texto: canario })}`,
    );
    fireEvent.click(c.querySelector("[data-descargar-sobre]")!);
    expect(nombres).toEqual(["sobre-propuesto.json"]);
    const cuerpo = await new Promise<string>((ok) => {
      const lector = new FileReader();
      lector.onload = () => ok(String(lector.result));
      lector.readAsText(bajadas[0]!);
    });
    const json = JSON.parse(cuerpo) as {
      formato: string;
      lote: { confirmacion: unknown };
      sobres: { confirmacion: unknown }[];
    };
    expect(json.formato).toBe("hackguard/propuesta-pegada@1");
    expect(json.lote.confirmacion).toBeNull();
    expect(json.sobres).toHaveLength(3);
    expect(json.sobres.every((s) => s.confirmacion === null)).toBe(true);
    expect(cuerpo).not.toContain(canario);
    // Lo pegado vive en el campo (es de la persona); fuera del campo no se repite.
    const copia = c.cloneNode(true) as HTMLElement;
    copia.querySelectorAll("textarea").forEach((n) => n.remove());
    expect(copia.textContent).not.toContain(canario);
  });

  it("«Borrar el texto» vacía el campo y quita el resultado; sin texto, el botón está apagado", async () => {
    const { container: c } = montar();
    const borrar = c.querySelector<HTMLButtonElement>("[data-borrar-texto]")!;
    expect(borrar.disabled).toBe(true);
    await proponer(c);
    expect(borrar.disabled).toBe(false);
    fireEvent.click(borrar);
    expect(c.querySelector<HTMLTextAreaElement>("#pegado-texto")!.value).toBe(
      "",
    );
    expect(c.querySelector("[data-pegado-resultado]")).toBeNull();
    expect(borrar.disabled).toBe(true);
  });

  it("cambiar de herramienta cambia lo que se lee: ZAP con un reporte de Garak dice que no es el formato", async () => {
    const { container: c } = montar();
    escribir(c, "pegado-herramienta", "zap");
    escribir(c, "pegado-texto", textoDeFixture(GARAK));
    fireEvent.click(c.querySelector("[data-proponer]")!);
    await waitFor(() =>
      expect(c.querySelector("[data-pegado-error]")).not.toBeNull(),
    );
    expect(
      c.querySelector("[data-pegado-error]")!.getAttribute("data-pegado-error"),
    ).toBe("no_leyo_no_es_el_formato");
    expect(c.querySelectorAll("[data-sobre-propuesto]")).toHaveLength(0);
  });
});

describe("lo que no se puede proponer, se dice", () => {
  it("sin texto dice «sin texto»; con Garak y sin zona pide la zona", async () => {
    const { container: c } = montar();
    fireEvent.click(c.querySelector("[data-proponer]")!);
    await waitFor(() =>
      expect(c.querySelector("[data-pegado-error]")).not.toBeNull(),
    );
    expect(
      c.querySelector("[data-pegado-error]")!.getAttribute("data-pegado-error"),
    ).toBe("sin_texto");
    escribir(c, "pegado-texto", textoDeFixture(GARAK));
    fireEvent.click(c.querySelector("[data-proponer]")!);
    await waitFor(() =>
      expect(
        c
          .querySelector("[data-pegado-error]")
          ?.getAttribute("data-pegado-error"),
      ).toBe("falta_zona"),
    );
  });

  it("sin un activo con plan de Garak o de ZAP no hay formulario: dice por qué", () => {
    const { container: c } = montar({
      ...mundoDePegado(CONSULTA),
      activos: [],
    });
    expect(c.querySelector("#pegado-texto")).toBeNull();
    expect(c.textContent).toContain("Ningún activo con plan de Garak o de ZAP");
    expect(c.textContent).toContain("No asset with a Garak or ZAP plan");
  });
});

beforeEach(() => {
  URL.createObjectURL ??= () => "blob:prueba";
  URL.revokeObjectURL ??= () => undefined;
});
