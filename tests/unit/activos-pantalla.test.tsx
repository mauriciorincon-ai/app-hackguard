// Las pantallas de activo y plan por dentro: lo que un humano comprueba al mirarlas, en HTML. El gate de fidelidad compara
// rótulos con la maqueta; esto comprueba que el producto dice lo que su motor calculó, sin sumar una cifra a mano.
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivoPantalla } from "../../src/components/activos/activo-pantalla";
import { PlantillaParaActivosPropios } from "../../src/components/activos/plantilla";
import {
  SelectorDeActivos,
  SubnavDelActivo,
} from "../../src/components/activos/piezas";
import { PlanPantalla } from "../../src/components/plan/plan-pantalla";
import {
  GET,
  generateStaticParams,
} from "../../src/app/activos/[id]/paquete.json/route";
import { documentoDelProducto } from "./lib/fidelidad";
import { mundo, vistaDeActivo, vistaDePlan } from "./lib/mundo-de-activos";
import { readFileSync } from "node:fs";

const doc = (nodo: React.ReactElement) =>
  documentoDelProducto(renderToStaticMarkup(nodo));
const ASISTENTE = "act-demo-asistente";
const PORTAL = "act-demo-portal";

describe("el activo sin autorización (el portal)", () => {
  const d = doc(<ActivoPantalla v={vistaDeActivo(PORTAL)} />);
  it("dice arriba que sin autorización no hay plan, sin botón para abrirlo", () => {
    expect(d.querySelector(".hg-sello")?.textContent).toContain(
      "Sin autorización no hay plan",
    );
    expect(
      d.querySelector("[data-autorizado]")?.getAttribute("data-autorizado"),
    ).toBe("false");
    expect(d.querySelector('a[href$="/plan"].hg-boton-primario')).toBeNull();
    expect(d.body.textContent).toContain("Falta alcance y reglas");
    expect(d.body.textContent).toContain("Política sin leer");
  });
  it("ofrece la plantilla para activos propios, cerrada hasta que se pulsa", () => {
    const boton = d.querySelector('[data-controlador="alternar"]');
    expect(boton?.getAttribute("aria-expanded")).toBe("false");
    expect(boton?.nextElementSibling?.className).toBe("hg-revelado");
  });
});

describe("el botón de la plantilla", () => {
  it("se pulsa y se despulsa", () => {
    render(
      <PlantillaParaActivosPropios
        alcance={[{ es: "A", en: "A" }]}
        reglas={[{ es: "R", en: "R" }]}
      />,
    );
    const boton = screen.getByRole("button");
    expect(boton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(boton);
    expect(boton.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(boton);
    expect(boton.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("el activo autorizado (el asistente)", () => {
  const d = doc(<ActivoPantalla v={vistaDeActivo(ASISTENTE)} />);
  it("separa dueño y proveedor, cita la política y la fecha en que se leyó", () => {
    expect(d.querySelector("#quien")?.textContent).toContain(
      "Dueño y proveedor",
    );
    expect(d.querySelectorAll('[data-fechado="vigencia"]')).toHaveLength(1);
    expect(d.body.textContent).toContain("cita la política del proveedor");
  });
  it("lleva al plan con un solo botón primario, y el estado sale del plan", () => {
    expect(d.querySelectorAll(".hg-boton-primario")).toHaveLength(1);
    expect(d.querySelector(".hg-boton-primario")?.getAttribute("href")).toBe(
      `/activos/${ASISTENTE}/plan`,
    );
    expect(d.querySelector(".hg-cabecera-linea")?.textContent).toContain(
      "Con plan",
    );
  });
});

describe("el plan del asistente", () => {
  const v = vistaDePlan(ASISTENTE);
  const d = doc(<PlanPantalla v={v} />);
  it("muestra una fila por prueba planeada y por excluida, igual que el plan emitido", () => {
    expect(d.querySelectorAll("tr[data-planeada]")).toHaveLength(14);
    expect(d.querySelectorAll("tr[data-excluida]")).toHaveLength(12);
    expect(v.plan?.resumen.planeadas).toBe(14);
  });
  it("las cifras de arriba son las filas", () => {
    const cifras = [...d.querySelectorAll(".hg-resumen .hg-cifra")].map((e) =>
      Number(e.textContent),
    );
    expect(cifras).toEqual([
      14,
      12,
      v.plan!.resumen.conPrueba,
      v.plan!.resumen.sinPrueba,
    ]);
    expect(d.querySelectorAll("tbody tr").length).toBeGreaterThan(14 + 12);
  });
  it("la agregada dice por qué, y las exclusiones distinguen sus tres motivos por marca y texto", () => {
    const agregada = d.querySelector("tr[data-agregada]");
    expect(agregada?.getAttribute("data-planeada")).toBe("PR-SW-CLK-001");
    expect(
      agregada?.querySelector("[data-justificacion]")?.textContent,
    ).toContain("portal de clientes");
    const motivos = new Set(
      [...d.querySelectorAll("tr[data-excluida]")].map((e) =>
        e.getAttribute("data-motivo"),
      ),
    );
    expect([...motivos].sort()).toEqual(["alcance", "operador", "perfil"]);
    for (const fila of d.querySelectorAll("tr[data-excluida]")) {
      expect(fila.querySelector(".hg-chip svg")).not.toBeNull();
      expect(
        fila.querySelector(".hg-chip")?.textContent?.length,
      ).toBeGreaterThan(5);
    }
  });
  it("un control sin prueba se marca con chip y se explica", () => {
    const sin = [
      ...d.querySelectorAll("section[aria-labelledby=cobertura] tbody tr"),
    ].filter((tr) => tr.textContent?.includes("Sin prueba"));
    expect(sin).toHaveLength(v.plan!.resumen.sinPrueba);
    expect(sin[0]?.textContent).toContain("quedaron fuera de este plan");
  });
  it("el paquete es declarativo y se descarga como el archivo versionado", () => {
    const enlace = d.querySelector("a[download]");
    expect(enlace?.getAttribute("href")).toBe(
      `/activos/${ASISTENTE}/paquete.json`,
    );
    expect(d.querySelectorAll(".hg-rejilla .hg-caja")).toHaveLength(
      v.plan!.paquetes.length,
    );
    expect(
      d.querySelector("#paquete")?.closest("section")?.textContent,
    ).not.toMatch(/payload:|exploit|curl /i);
  });
});

describe("el plan del portal", () => {
  const d = doc(<PlanPantalla v={vistaDePlan(PORTAL)} />);
  it("no tiene plan: lo dice y lleva a la página del activo", () => {
    expect(d.querySelector(".hg-sello")?.textContent).toContain(
      "Sin autorización no hay plan",
    );
    expect(d.querySelector(".hg-sello a")?.getAttribute("href")).toBe(
      `/activos/${PORTAL}`,
    );
    expect(d.querySelectorAll("table")).toHaveLength(0);
    expect(
      d.querySelector("[data-plan-de]")?.getAttribute("data-plan-de"),
    ).toBe(PORTAL);
  });
});

describe("el selector y las dos páginas del activo", () => {
  it("marcan el activo y la página abiertos", () => {
    const v = vistaDeActivo(ASISTENTE);
    const s = doc(<SelectorDeActivos items={v.selector} hacia="plan" />);
    expect(s.querySelectorAll("a.hg-opcion")).toHaveLength(
      mundo.activos.length,
    );
    expect(
      s.querySelector('a[aria-current="page"]')?.getAttribute("href"),
    ).toBe(`/activos/${ASISTENTE}/plan`);
    const n = doc(<SubnavDelActivo id={ASISTENTE} abierta="plan" />);
    expect(
      n.querySelector('a[aria-current="page"]')?.getAttribute("href"),
    ).toBe(`/activos/${ASISTENTE}/plan`);
  });
});

describe("la descarga del paquete", () => {
  it("son los bytes del archivo versionado, solo para los autorizados", async () => {
    const respuesta = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: ASISTENTE }),
    });
    expect(await respuesta.text()).toBe(
      readFileSync(`datos/planes/${ASISTENTE}.paquete.json`, "utf8"),
    );
    expect(respuesta.headers.get("content-type")).toContain("application/json");
    expect(
      (
        await GET(new Request("http://x"), {
          params: Promise.resolve({ id: "act-fantasma" }),
        })
      ).status,
    ).toBe(404);
    expect(await generateStaticParams()).toEqual([
      { id: "act-demo-asistente" },
      { id: "act-demo-clasificador" },
    ]);
  });
});
