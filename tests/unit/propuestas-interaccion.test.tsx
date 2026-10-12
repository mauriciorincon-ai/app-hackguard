// La pasada de INTERACCIÓN de la bandeja de propuestas (regla 22): cada control dibujado se activa y algo cambia. Los controles son los
// filtros de «quién propone», los botones de decisión de cada propuesta (marcar, cambiar, deshacer), el selector de la prueba cuando el
// texto cuadra con varias, y nada más. Ninguno guarda nada: marcar una decisión muestra el comando que la registra, y ese comando lo
// corre una persona en su terminal (decisión 12 de diseño).
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PropuestasPantalla } from "../../src/components/propuestas/propuestas-pantalla";
import { armarMundoDePropuestas } from "../../src/lib/propuestas/pagina";
import { construirVistaDePropuestas } from "../../src/lib/propuestas/vista";
import { propuestasDelRepo as base } from "./lib/mundo-de-brecha";

afterEach(cleanup);

const v = construirVistaDePropuestas(base);
const visible = (el: Element | null) =>
  el !== null && !el.hasAttribute("hidden");
const articulo = (c: HTMLElement, id: string) =>
  c.querySelector<HTMLElement>(`[data-propuesta="${id}"]`)!;
const boton = (a: Element, valor: string) =>
  a.querySelector<HTMLButtonElement>(
    `[data-controlador="decidir"][data-valor="${valor}"]`,
  )!;
const pulsado = (b: Element) => b.getAttribute("aria-pressed") === "true";
const porDecidir = (c: HTMLElement) =>
  c.querySelector('[data-cifra="por_decidir"] .hg-cifra')!.textContent;
const comando = (a: Element) =>
  [
    ...(a
      .querySelector("[data-comando] p:nth-of-type(2)")
      ?.querySelectorAll(".hg-dato") ?? []),
  ]
    .map((x) => x.textContent)
    .join(" ");
const visibles = (c: HTMLElement) =>
  [...c.querySelectorAll<HTMLElement>("[data-propuesta]")].filter(
    (a) => !a.hasAttribute("hidden"),
  );

describe("el filtro de «quién propone»", () => {
  it("abre con todas; «Extractor» deja solo las del extractor, el contador lo dice y vuelve con «Todas»", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    const filtro = (valor: string) =>
      container.querySelector<HTMLButtonElement>(
        `[data-controlador="filtro"][data-valor="${valor}"]`,
      )!;
    expect(visibles(container)).toHaveLength(7);
    expect(pulsado(filtro(""))).toBe(true);
    fireEvent.click(filtro("extractor"));
    expect(
      visibles(container).map((a) => a.getAttribute("data-propuesta")),
    ).toEqual(["PROP-0036", "PROP-0037"]);
    expect(pulsado(filtro("extractor"))).toBe(true);
    expect(pulsado(filtro(""))).toBe(false);
    expect(container.querySelector("[data-cuenta-filtrada]")?.textContent).toBe(
      "2",
    );
    fireEvent.click(filtro("investigador"));
    expect(visibles(container)).toHaveLength(5);
    expect(
      visibles(container).every(
        (a) => a.getAttribute("data-origen") === "investigador",
      ),
    ).toBe(true);
    fireEvent.click(filtro(""));
    expect(visibles(container)).toHaveLength(7);
    expect(container.querySelector("[data-cuenta-filtrada]")?.textContent).toBe(
      "7",
    );
  });
  it("filtrar no cambia lo que está por decidir", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    fireEvent.click(
      container.querySelector(
        '[data-controlador="filtro"][data-valor="extractor"]',
      )!,
    );
    expect(porDecidir(container)).toBe("7");
  });
});

describe("marcar, cambiar y deshacer una decisión", () => {
  it("«Aprobar» queda pulsado, dice qué pasaría, baja «por decidir» y muestra el comando; pulsarlo otra vez lo deshace", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    const a = articulo(container, "PROP-0031");
    expect(a.getAttribute("data-decision")).toBe("");
    expect(visible(a.querySelector('[data-si-decision=""]'))).toBe(true);
    expect(a.querySelector("[data-comando]")).toBeNull();

    fireEvent.click(boton(a, "aprobar"));
    expect(pulsado(boton(a, "aprobar"))).toBe(true);
    expect(a.getAttribute("data-decision")).toBe("aprobar");
    expect(visible(a.querySelector('[data-si-decision="aprobar"]'))).toBe(true);
    expect(visible(a.querySelector('[data-si-decision=""]'))).toBe(false);
    expect(porDecidir(container)).toBe("6");
    expect(comando(a)).toBe(
      'pnpm propuestas:decidir PROP-0031 --decision aprobar --por "<tu nombre>" --fecha AAAA-MM-DD --aplicar-a-demo',
    );

    fireEvent.click(boton(a, "aprobar"));
    expect(pulsado(boton(a, "aprobar"))).toBe(false);
    expect(a.getAttribute("data-decision")).toBe("");
    expect(visible(a.querySelector('[data-si-decision=""]'))).toBe(true);
    expect(a.querySelector("[data-comando]")).toBeNull();
    expect(porDecidir(container)).toBe("7");
  });
  it("cambiar de «Aprobar» a «Rechazar» deja una sola decisión, con su consecuencia y su comando (con el motivo)", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    const a = articulo(container, "PROP-0033");
    fireEvent.click(boton(a, "aprobar"));
    fireEvent.click(boton(a, "rechazar"));
    expect(pulsado(boton(a, "aprobar"))).toBe(false);
    expect(pulsado(boton(a, "rechazar"))).toBe(true);
    expect(visible(a.querySelector('[data-si-decision="aprobar"]'))).toBe(
      false,
    );
    expect(visible(a.querySelector('[data-si-decision="rechazar"]'))).toBe(
      true,
    );
    expect(comando(a)).toContain("--decision rechazar");
    expect(comando(a)).toContain('--motivo "<por qué>"');
    expect(comando(a)).not.toContain("--aplicar-a-demo");
    expect(porDecidir(container)).toBe("6");
  });
  it("cada propuesta decide por separado: la cuenta baja una por cada una marcada", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    for (const id of ["PROP-0031", "PROP-0032", "PROP-0035"])
      fireEvent.click(boton(articulo(container, id), "aprobar"));
    expect(porDecidir(container)).toBe("4");
    expect(articulo(container, "PROP-0033").getAttribute("data-decision")).toBe(
      "",
    );
  });
  it("una propuesta marcada por el filtro solo se aprueba diciendo que la revisaste", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    const a = articulo(container, "PROP-0034");
    expect(boton(a, "aprobar")).toBeNull();
    fireEvent.click(boton(a, "aprobar_tras_revisar"));
    expect(boton(a, "aprobar_tras_revisar").textContent).toContain(
      "La revisé y la apruebo",
    );
    expect(comando(a)).toContain("--decision aprobar-tras-revisar");
    expect(
      a.querySelector('[data-si-decision="aprobar_tras_revisar"]')?.textContent,
    ).toContain("Queda registrado que la revisaste tú");
  });
  it("un texto que mezcla pruebas se separa, no se aprueba, y dice en cuántas", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    const a = articulo(container, "PROP-0037");
    expect(boton(a, "aprobar")).toBeNull();
    expect(boton(a, "separar").textContent).toContain("Separar en dos");
    fireEvent.click(boton(a, "separar"));
    expect(comando(a)).toContain("--decision separar");
    expect(
      a.querySelector('[data-si-decision="separar"]')?.textContent,
    ).toContain("2 propuestas");
  });
});

describe("el texto que cuadra con varias pruebas", () => {
  it("la primera viene elegida; elegir otra cambia la prueba del comando, y el cambio se ve", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    const a = articulo(container, "PROP-0036");
    const radios = [
      ...a.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ];
    expect(radios.map((r) => [r.value, r.checked])).toEqual([
      ["PR-IA-PINJ-001", true],
      ["PR-IA-ENC-002", false],
    ]);
    fireEvent.click(boton(a, "aprobar"));
    expect(comando(a)).toContain("--prueba PR-IA-PINJ-001");
    fireEvent.click(radios[1]!);
    expect(radios.map((r) => r.checked)).toEqual([false, true]);
    expect(comando(a)).toContain("--prueba PR-IA-ENC-002");
    expect(comando(a)).not.toContain("PR-IA-PINJ-001");
  });
  it("con una sola candidata no hay selector", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    expect(
      articulo(container, "PROP-0037").querySelector('input[type="radio"]'),
    ).toBeNull();
    expect(
      articulo(container, "PROP-0031").querySelector('input[type="radio"]'),
    ).toBeNull();
  });
});

describe("la pantalla no guarda nada", () => {
  it("no hay formulario, campo de texto ni botón de enviar; el único camino a una decisión es el comando", () => {
    const { container } = render(<PropuestasPantalla v={v} />);
    expect(
      container.querySelector(
        "form, textarea, input[type='text'], button[type='submit']",
      ),
    ).toBeNull();
    for (const a of container.querySelectorAll("[data-propuesta]"))
      fireEvent.click(a.querySelector('[data-controlador="decidir"]')!);
    expect(container.querySelectorAll("[data-comando]").length).toBe(7);
    expect(container.textContent).toContain("no se guardó");
    expect(container.querySelector("[data-comando]")?.textContent).toContain(
      "terminal",
    );
  });
});

describe("lo que ya se decidió en el libro", () => {
  const w = construirVistaDePropuestas(
    armarMundoDePropuestas({
      instantanea: base.instantanea,
      nombre: base.nombre,
      consulta: base.consulta,
      activos: base.activos,
      etiquetas: base.etiquetas,
      umbrales: base.umbrales,
      corridas: base.corridas,
      problemasDeCarga: [],
      decisiones: [
        {
          formato: "hackguard/decision@1",
          propuesta: "PROP-0033",
          decision: "rechazar",
          por: "Ana",
          fecha: "2026-10-12",
          motivo: "una sola fuente",
        },
      ],
    }),
  );
  it("muestra quién decidió, cuándo y por qué, y ya no ofrece botones; la cuenta de arriba la lleva el libro", () => {
    const { container } = render(<PropuestasPantalla v={w} />);
    const a = articulo(container, "PROP-0033");
    expect(a.getAttribute("data-estado")).toBe("rechazada");
    expect(a.getAttribute("data-decision")).toBe("rechazada");
    expect(a.querySelector('[data-controlador="decidir"]')).toBeNull();
    expect(a.querySelector("[data-decidida]")?.textContent).toContain("Ana");
    expect(a.querySelector("[data-decidida]")?.textContent).toContain(
      "una sola fuente",
    );
    expect(porDecidir(container)).toBe("6");
  });
});
