// El armazón de toda pantalla y sus conmutadores de tema e idioma (S2-B6b): lo que cada pantalla da por hecho. El árbol sale igual en
// los dos idiomas (cambian los atributos de <html>, no la forma), y las preferencias se guardan con el prefijo `hackguard:`.
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Consola } from "../../src/components/consola/consola";
import { Conmutadores } from "../../src/components/consola/conmutadores";
import { en, useIdioma } from "../../src/components/consola/idioma";

const raiz = document.documentElement;

beforeEach(() => {
  raiz.setAttribute("data-theme", "oscuro");
  raiz.setAttribute("data-lang", "es");
  raiz.setAttribute("lang", "es");
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Consola", () => {
  const pintar = () =>
    render(
      <Consola
        seccion="catalogo"
        pagina="/catalogo"
        migas={[
          { es: "Catálogo", en: "Catalog" },
          { es: "Pruebas", en: "Tests" },
        ]}
        cuenta={38}
      >
        <p>contenido de la pantalla</p>
      </Consola>,
    );

  it("lleva el salto al contenido, la navegación, las migas y el contenido en <main id=contenido>", () => {
    const { container } = pintar();
    const salto = container.querySelector("a.hg-salto")!;
    expect(salto.getAttribute("href")).toBe("#contenido");
    const main = container.querySelector("main#contenido")!;
    expect(main.textContent).toContain("contenido de la pantalla");
    expect(container.querySelector("nav")).not.toBeNull();
  });

  it("las migas se separan con una barra que el lector de pantalla no lee, y la última es la página actual", () => {
    const { container } = pintar();
    const migas = container.querySelector(".hg-migas")!;
    expect(migas.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(migas.querySelector("strong")!.textContent).toContain("Pruebas");
    expect(migas.querySelector("strong")!.textContent).toContain("Tests");
  });

  it("incluye los conmutadores de tema e idioma", () => {
    pintar();
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(2);
  });
});

describe("Conmutadores", () => {
  it("el botón de tema alterna <html data-theme> y guarda la preferencia", () => {
    render(<Conmutadores />);
    const boton = screen.getByRole("button", {
      name: "Cambiar entre tema oscuro y claro",
    });
    fireEvent.click(boton);
    expect(raiz.getAttribute("data-theme")).toBe("claro");
    expect(window.localStorage.getItem("hackguard:tema")).toBe("claro");
    fireEvent.click(boton);
    expect(raiz.getAttribute("data-theme")).toBe("oscuro");
    expect(window.localStorage.getItem("hackguard:tema")).toBe("oscuro");
  });

  it("el botón de idioma alterna data-lang y lang, guarda la preferencia y cambia su propio nombre accesible", async () => {
    render(<Conmutadores />);
    fireEvent.click(
      screen.getByRole("button", { name: "Cambiar el idioma a inglés" }),
    );
    expect(raiz.getAttribute("data-lang")).toBe("en");
    expect(raiz.getAttribute("lang")).toBe("en");
    expect(window.localStorage.getItem("hackguard:idioma")).toBe("en");
    // El nombre accesible sigue al idioma activo (lo observa un MutationObserver).
    expect(
      await screen.findByRole("button", {
        name: "Switch the language to Spanish",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Switch between dark and light theme",
      }),
    ).toBeTruthy();
  });

  it("sin almacenamiento la preferencia vale lo que la página y nada se rompe", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cuota");
    });
    render(<Conmutadores />);
    fireEvent.click(
      screen.getByRole("button", { name: "Cambiar entre tema oscuro y claro" }),
    );
    expect(raiz.getAttribute("data-theme")).toBe("claro");
  });

  it("la forma del árbol es la misma en los dos idiomas: solo cambian los atributos", () => {
    const { container, rerender } = render(<Conmutadores />);
    const antes = container.querySelectorAll("*").length;
    act(() => raiz.setAttribute("data-lang", "en"));
    rerender(<Conmutadores />);
    expect(container.querySelectorAll("*").length).toBe(antes);
  });
});

describe("useIdioma", () => {
  function Sonda() {
    const idioma = useIdioma();
    return <p>{en(idioma, { es: "hola", en: "hello" })}</p>;
  }
  it("sigue el atributo data-lang de <html>", async () => {
    render(<Sonda />);
    expect(screen.getByText("hola")).toBeTruthy();
    act(() => raiz.setAttribute("data-lang", "en"));
    expect(await screen.findByText("hello")).toBeTruthy();
  });

  it("cualquier valor que no sea «en» se lee como español", () => {
    raiz.setAttribute("data-lang", "fr");
    render(<Sonda />);
    expect(screen.getByText("hola")).toBeTruthy();
  });
});
