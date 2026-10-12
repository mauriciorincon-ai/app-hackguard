// La pasada de INTERACCIÓN de la carga (regla 22): cada control dibujado se activa y algo cambia. Los controles son las
// pestañas de vía, el selector de lote y el identificador de cada fila; todos son botones con `aria-pressed` que solo cambian
// lo que se ve. Lo que la persona DECIDE (confirmar el lote, separar fallas) no es un botón: es un comando del CLI.
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CargaPantalla } from "../../src/components/carga/carga-pantalla";
import {
  conLoteDecidido,
  mundoDeCarga,
  vistaDeCarga,
} from "./lib/mundo-de-carga";

afterEach(cleanup);

const botones = (c: HTMLElement) => [
  ...c.querySelectorAll<HTMLButtonElement>("button"),
];
const pulsado = (b: Element) => b.getAttribute("aria-pressed") === "true";
const visible = (el: Element | null) =>
  el !== null && !el.hasAttribute("hidden");
const porTexto = (c: HTMLElement, selector: string, texto: string) =>
  [...c.querySelectorAll<HTMLButtonElement>(selector)].find((b) =>
    b.textContent?.includes(texto),
  )!;

describe("las pestañas de vía", () => {
  it("abre en «Archivo de herramienta»; cada pestaña muestra su vía y esconde las demás", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    const vias = ["adaptador", "pegado", "manual"] as const;
    const hay = () =>
      vias.map((x) => visible(container.querySelector(`[data-si-via="${x}"]`)));
    expect(hay()).toEqual([true, false, false]);
    for (const [i, nombre] of [
      "Texto pegado",
      "Sobre manual",
      "Archivo de herramienta",
    ].entries()) {
      const destino = vias[[1, 2, 0][i]!]!;
      fireEvent.click(porTexto(container, ".hg-pestana", nombre));
      expect(hay()).toEqual(vias.map((x) => x === destino));
      expect(
        [...container.querySelectorAll(".hg-pestana")].map(pulsado),
      ).toEqual(vias.map((x) => x === destino));
      expect(
        container.querySelector("[data-pestanas]")?.getAttribute("data-via"),
      ).toBe(destino);
    }
  });

  it("«Texto pegado» dice que esa vía no existe en esta versión y no ofrece campo ni botón", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    fireEvent.click(porTexto(container, ".hg-pestana", "Texto pegado"));
    const via = container.querySelector('[data-si-via="pegado"]')!;
    expect(via.textContent).toContain("Esta vía no existe en esta versión");
    expect(via.querySelector("button, textarea, input")).toBeNull();
  });

  it("«Sobre manual» trae los dos comandos del CLI, en orden", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    fireEvent.click(porTexto(container, ".hg-pestana", "Sobre manual"));
    const via = container.querySelector('[data-si-via="manual"]')!;
    const comandos = [...via.querySelectorAll(".hg-vector")].map(
      (c) => c.textContent,
    );
    expect(comandos).toEqual([
      "pnpm evidencia:registrar <resultado.json> --crudo <archivo>",
      "pnpm evidencia:confirmar <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD",
    ]);
    expect(via.querySelector("button, textarea, input")).toBeNull();
  });
});

describe("el selector de lote", () => {
  it("cambia de lote: el elegido queda pulsado y es el único que se ve", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    const zona = (id: string) => container.querySelector(`[data-lote="${id}"]`);
    expect([zona("LOTE-0007"), zona("LOTE-0008")].map(visible)).toEqual([
      true,
      false,
    ]);
    fireEvent.click(
      porTexto(container, ".hg-selector .hg-opcion", "LOTE-0008"),
    );
    expect([zona("LOTE-0007"), zona("LOTE-0008")].map(visible)).toEqual([
      false,
      true,
    ]);
    expect(
      [...container.querySelectorAll(".hg-selector .hg-opcion")].map(pulsado),
    ).toEqual([false, true]);
    fireEvent.click(
      porTexto(container, ".hg-selector .hg-opcion", "LOTE-0007"),
    );
    expect([zona("LOTE-0007"), zona("LOTE-0008")].map(visible)).toEqual([
      true,
      false,
    ]);
  });

  it("cambia todo: «no ejecutada» se distingue de «superada» y dice por qué no cuenta", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    fireEvent.click(
      porTexto(container, ".hg-selector .hg-opcion", "LOTE-0008"),
    );
    const zona = container.querySelector('[data-lote="LOTE-0008"]')!;
    const fila = zona.querySelector('tr[data-sobre="SOB-0035"]')!;
    expect(fila.querySelector('[data-celda="estado"]')?.textContent).toContain(
      "No ejecutada",
    );
    fireEvent.click(fila.querySelector("button")!);
    const ficha = zona.querySelector('[data-si-seleccion="SOB-0035"]')!;
    expect(visible(ficha)).toBe(true);
    expect(ficha.textContent).toContain("falta la constancia de que corrió");
  });
});

describe("la fila de un sobre", () => {
  it("al pulsar el identificador, la fila queda marcada y «Sobre seleccionado» muestra su regla, sus huellas y su hallazgo", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    const zona = container.querySelector('[data-lote="LOTE-0007"]')!;
    const fila = (id: string) => zona.querySelector(`tr[data-sobre="${id}"]`)!;
    // Abre en la primera fallida: SOB-0032.
    expect(zona.getAttribute("data-seleccion")).toBe("SOB-0032");
    expect(fila("SOB-0032").getAttribute("data-seleccionada")).toBe("true");
    fireEvent.click(fila("SOB-0033").querySelector("button")!);
    expect(zona.getAttribute("data-seleccion")).toBe("SOB-0033");
    expect(fila("SOB-0033").getAttribute("data-seleccionada")).toBe("true");
    expect(fila("SOB-0032").getAttribute("data-seleccionada")).toBe("false");
    expect(pulsado(fila("SOB-0033").querySelector("button")!)).toBe(true);
    expect(pulsado(fila("SOB-0032").querySelector("button")!)).toBe(false);
    const panel = (id: string) =>
      zona.querySelector(`[data-si-seleccion="${id}"]`)!;
    expect([
      visible(panel("SOB-0031")),
      visible(panel("SOB-0032")),
      visible(panel("SOB-0033")),
    ]).toEqual([false, false, true]);
    expect(panel("SOB-0033").textContent).toContain("PR-IA-PINJ-001");
    expect(panel("SOB-0033").textContent).toContain("Regla de veredicto");
    expect(panel("SOB-0033").textContent).toContain("Huella del sobre");
    fireEvent.click(fila("SOB-0032").querySelector("button")!);
    expect(panel("SOB-0032").textContent).toContain("HZ-0007");
  });

  it("la selección es de cada lote: cambiar de lote no la pierde", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    const z7 = container.querySelector('[data-lote="LOTE-0007"]')!;
    fireEvent.click(z7.querySelector('tr[data-sobre="SOB-0031"] button')!);
    fireEvent.click(
      porTexto(container, ".hg-selector .hg-opcion", "LOTE-0008"),
    );
    fireEvent.click(
      porTexto(container, ".hg-selector .hg-opcion", "LOTE-0007"),
    );
    expect(z7.getAttribute("data-seleccion")).toBe("SOB-0031");
    expect(
      container
        .querySelector('[data-lote="LOTE-0008"]')
        ?.getAttribute("data-seleccion"),
    ).toBe("SOB-0034");
  });
});

describe("todos los controles dibujados", () => {
  it("cada botón está pulsado o se puede pulsar, y al pulsarlo algo cambia (ninguno está muerto)", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    const todos = botones(container);
    expect(todos.length).toBeGreaterThanOrEqual(3 + 2 + 6);
    const huella = () =>
      [
        ...container.querySelectorAll(
          "[aria-pressed], [hidden], [data-seleccion], [data-via]",
        ),
      ]
        .map((e) =>
          [
            e.getAttribute("aria-pressed"),
            e.hasAttribute("hidden"),
            e.getAttribute("data-seleccion"),
            e.getAttribute("data-via"),
          ].join("|"),
        )
        .join("/");
    for (const b of todos) {
      if (pulsado(b)) continue;
      const antes = huella();
      fireEvent.click(b);
      expect(huella(), b.textContent ?? "").not.toBe(antes);
    }
  });

  it("no hay botón que decida: «Confirmar el lote» y «Revisar uno por uno» son comandos, no botones", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    for (const b of botones(container))
      expect(b.textContent).not.toMatch(
        /Confirmar el lote|Revisar uno por uno|Confirm the batch|Review one by one/,
      );
    expect(container.textContent).toContain(
      "pnpm evidencia:confirmar-lote LOTE-0007",
    );
  });

  it("el árbol es el mismo en los dos idiomas: cada texto viaja en sus dos idiomas", () => {
    const { container } = render(<CargaPantalla v={vistaDeCarga()} />);
    expect(container.querySelectorAll('[lang="es"]').length).toBe(
      container.querySelectorAll('[lang="en"]').length,
    );
  });
});

describe("la pantalla con un lote decidido y sin lotes", () => {
  it("un lote confirmado lo dice, y su comando desaparece: ya no hay nada que decidir", async () => {
    const v = vistaDeCarga(
      await conLoteDecidido("LOTE-0008", {
        por: "Revisora demo",
        fecha: "2026-10-03",
        decision: "confirmado",
        revisados: ["SOB-0034", "SOB-0035", "SOB-0036"],
        separados: ["SOB-0034"],
      }),
    );
    const { container } = render(<CargaPantalla v={v} />);
    const zona = container.querySelector('[data-lote="LOTE-0008"]')!;
    expect(zona.getAttribute("data-decision")).toBe("confirmado");
    expect(zona.querySelector(".hg-consecuencia")?.textContent).toContain(
      "Revisora demo",
    );
    expect(zona.querySelector(".hg-consecuencia")?.textContent).toContain(
      "SOB-0034",
    );
    expect(zona.querySelector(".hg-tarjeta-accion .hg-vector")).toBeNull();
    expect(container.querySelector(".hg-resumen .hg-cifra")?.textContent).toBe(
      "1",
    );
  });

  it("sin lotes dice «No hay nada por confirmar» y no dibuja pestañas ni tablas", () => {
    const v = vistaDeCarga({ ...mundoDeCarga, lotes: [], revisiones: {} });
    const { container } = render(<CargaPantalla v={v} />);
    expect(container.textContent).toContain("No hay nada por confirmar");
    expect(container.querySelector(".hg-pestana, table")).toBeNull();
    expect(container.querySelector(".hg-resumen .hg-cifra")?.textContent).toBe(
      "0",
    );
  });
});
