// La pasada de INTERACCIÓN de las pantallas de la brecha (regla 22): cada control dibujado se activa y algo cambia. Los controles
// son las pestañas de cobertura, los filtros de la tabla por prueba (un botón por activo y un selector de veredicto), «Quitar
// filtros», «Ver las comprobaciones» del tablero e «Imprimir o guardar como PDF» del informe. Ninguno decide nada: solo cambian
// lo que se ve o abren el diálogo de impresión. Lo que la persona DECIDE sigue siendo un comando del CLI.
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrechaPantalla } from "../../src/components/brecha/brecha-pantalla";
import { BotonImprimir } from "../../src/components/informe/boton-imprimir";
import { Revelador } from "../../src/components/tablero/revelador";
import { construirVistaDeBrecha } from "../../src/lib/brecha/vista";
import { mundoDeBrecha } from "./lib/mundo-de-brecha";

afterEach(cleanup);

const v = construirVistaDeBrecha(await mundoDeBrecha());
const pulsado = (b: Element) => b.getAttribute("aria-pressed") === "true";
const visible = (el: Element | null) =>
  el !== null && !el.hasAttribute("hidden");
const porTexto = (c: HTMLElement, selector: string, texto: string) =>
  [...c.querySelectorAll<HTMLButtonElement>(selector)].find((b) =>
    b.textContent?.includes(texto),
  )!;
const filasVisibles = (c: HTMLElement) =>
  [...c.querySelectorAll("tr[data-fila-brecha]")].filter(
    (f) => !f.hasAttribute("hidden"),
  );

describe("las pestañas de cobertura", () => {
  it("abre en «Por activo»; cada pestaña muestra su tabla y esconde las demás", () => {
    const { container } = render(<BrechaPantalla v={v} />);
    const vias = ["activo", "familia", "control"] as const;
    const hay = () =>
      vias.map((x) =>
        visible(container.querySelector(`table[data-si-via="${x}"]`)),
      );
    expect(hay()).toEqual([true, false, false]);
    for (const [nombre, destino] of [
      ["Por familia", "familia"],
      ["Por control", "control"],
      ["Por activo", "activo"],
    ] as const) {
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
});

describe("los filtros de «esperado contra obtenido»", () => {
  it("abre con todas las pruebas y sin «Quitar filtros»", () => {
    const { container } = render(<BrechaPantalla v={v} />);
    expect(filasVisibles(container)).toHaveLength(v.filas.length);
    expect(container.querySelector("[data-cuenta-filtrada]")?.textContent).toBe(
      String(v.filas.length),
    );
    expect(
      container
        .querySelector('[data-controlador="filtro-limpiar"]')
        ?.hasAttribute("hidden"),
    ).toBe(true);
    expect(pulsado(porTexto(container, '[data-campo="activo"]', "Todos"))).toBe(
      true,
    );
  });

  it("un botón de activo deja solo las pruebas de ese activo y se marca; «Todos» las devuelve", () => {
    const { container } = render(<BrechaPantalla v={v} />);
    for (const a of v.filtros.activos) {
      const boton = [
        ...container.querySelectorAll<HTMLButtonElement>(
          '[data-campo="activo"]',
        ),
      ].find((b) => b.getAttribute("data-valor") === a.id)!;
      fireEvent.click(boton);
      const esperadas = v.filas.filter((f) => f.activo.id === a.id).length;
      expect(esperadas).toBeGreaterThan(0);
      expect(filasVisibles(container)).toHaveLength(esperadas);
      expect(pulsado(boton)).toBe(true);
      expect(
        container.querySelector("[data-cuenta-filtrada]")?.textContent,
      ).toBe(String(esperadas));
      for (const f of filasVisibles(container))
        expect(f.getAttribute("data-activo")).toBe(a.id);
    }
    fireEvent.click(porTexto(container, '[data-campo="activo"]', "Todos"));
    expect(filasVisibles(container)).toHaveLength(v.filas.length);
  });

  it("el selector de veredicto deja solo las pruebas con ese veredicto", () => {
    const { container } = render(<BrechaPantalla v={v} />);
    const select =
      container.querySelector<HTMLSelectElement>("#filtro-veredicto")!;
    for (const o of v.filtros.veredictos) {
      fireEvent.change(select, { target: { value: o.id } });
      const esperadas = v.filas.filter((f) => f.veredictoId === o.id).length;
      expect(filasVisibles(container)).toHaveLength(esperadas);
      for (const f of filasVisibles(container))
        expect(f.getAttribute("data-veredicto")).toBe(o.id);
    }
  });

  it("con filtros aparece «Quitar filtros», que los limpia; sin coincidencias dice que ninguna prueba cumple", () => {
    const { container } = render(<BrechaPantalla v={v} />);
    const limpiar = container.querySelector<HTMLButtonElement>(
      '[data-controlador="filtro-limpiar"]',
    )!;
    const sinResultados = container.querySelector("[data-sin-resultados]")!;
    expect(visible(sinResultados)).toBe(false);

    // Un activo y un veredicto que no se cruzan: el clasificador no tiene ninguna fallida.
    const clasificador = v.filtros.activos.find(
      (a) => a.id === "act-demo-clasificador",
    )!;
    fireEvent.click(
      [
        ...container.querySelectorAll<HTMLButtonElement>(
          '[data-campo="activo"]',
        ),
      ].find((b) => b.getAttribute("data-valor") === clasificador.id)!,
    );
    fireEvent.change(container.querySelector("#filtro-veredicto")!, {
      target: { value: "fallida" },
    });
    expect(filasVisibles(container)).toHaveLength(0);
    expect(visible(sinResultados)).toBe(true);
    expect(visible(limpiar)).toBe(true);

    fireEvent.click(limpiar);
    expect(filasVisibles(container)).toHaveLength(v.filas.length);
    expect(visible(sinResultados)).toBe(false);
    expect(visible(limpiar)).toBe(false);
    expect(
      container.querySelector<HTMLSelectElement>("#filtro-veredicto")!.value,
    ).toBe("");
  });
});

describe("«Ver las comprobaciones» del tablero", () => {
  it("abre cerrado y cada pulsación lo abre o lo cierra", () => {
    const { container } = render(
      <Revelador
        rotulo={{ es: "Ver las comprobaciones", en: "See the checks" }}
      >
        <p>contenido</p>
      </Revelador>,
    );
    const boton = container.querySelector("button")!;
    expect(boton.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(boton);
    expect(boton.getAttribute("aria-pressed")).toBe("true");
    // La hoja del sistema muestra lo que sigue al botón con aria-pressed="true": el contenido está justo después.
    expect(boton.nextElementSibling?.className).toBe("hg-revelado");
    fireEvent.click(boton);
    expect(boton.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("«Imprimir o guardar como PDF» del informe", () => {
  it("abre el diálogo de impresión del navegador y avisa de que se abrió", () => {
    const imprimir = vi.fn();
    vi.stubGlobal("print", imprimir);
    const { container } = render(<BotonImprimir />);
    const aviso = container.querySelector("[data-aviso-impresion]")!;
    expect(visible(aviso)).toBe(false);
    fireEvent.click(container.querySelector("button")!);
    expect(imprimir).toHaveBeenCalledTimes(1);
    expect(visible(aviso)).toBe(true);
    vi.unstubAllGlobals();
  });
});
