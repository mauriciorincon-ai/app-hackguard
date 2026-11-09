// La pantalla de re-plan por dentro (D4, Sprint 10): lo que una persona comprueba al abrirla, en HTML. El motor ya calculó; aquí se ve que
// la pantalla dice cada movimiento con su causa, con símbolo, texto y color (nunca el color solo), que la base demo va rotulada «no oficial»
// y que un plan vigente no tiene esta página.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReplanPantalla } from "../../src/components/replan/replan-pantalla";
import {
  construirVistaDeReplan,
  notaDeCausaConjunta,
} from "../../src/lib/activos/replan-vista";
import { cargarInstantaneaDemo } from "../../src/lib/catalogo/cargar-instantanea";
import { documentoDelProducto } from "./lib/fidelidad";
import {
  instantanea,
  mundo,
  nombreDeLaInstantanea,
} from "./lib/mundo-de-activos";

const doc = (nodo: React.ReactElement) =>
  documentoDelProducto(renderToStaticMarkup(nodo));
const CLASIFICADOR = "act-demo-clasificador";

async function vista(
  id = CLASIFICADOR,
  conDemo = true,
  consulta = "2026-11-08",
) {
  return construirVistaDeReplan(
    id,
    mundo,
    instantanea,
    nombreDeLaInstantanea,
    consulta,
    conDemo ? await cargarInstantaneaDemo() : null,
  );
}

describe("/activos/<id>/re-planear", () => {
  it("un activo con el plan vigente no tiene esta página", async () => {
    expect(await vista("act-demo-asistente")).toBeNull();
  });

  it("una fecha de consulta anterior al plan no rompe la vista previa: sube a la fecha del plan en vez de lanzar", async () => {
    const v = (await vista(CLASIFICADOR, true, "2026-10-08"))!;
    expect(v.bases.map((b) => b.clave)).toEqual(["oficial", "demo"]);
  });

  it("trae primero la base oficial y después la demo, rotulada «no oficial»", async () => {
    const v = (await vista())!;
    expect(v.bases.map((b) => b.clave)).toEqual(["oficial", "demo"]);
    const d = doc(<ReplanPantalla v={v} />);
    const oficial = d.querySelector('[data-base="oficial"]')!;
    const demo = d.querySelector('[data-base="demo"]')!;
    expect(oficial.textContent).not.toContain("no oficial");
    expect(demo.textContent).toContain("Demo, no oficial");
    expect(demo.textContent).toContain("Demo, not official");
  });

  it("sin la instantánea demo solo hay una base", async () => {
    const v = (await vista(CLASIFICADOR, false))!;
    expect(v.bases.map((b) => b.clave)).toEqual(["oficial"]);
  });

  it("sobre la base oficial entra PR-MD-DER-001 por el perfil", async () => {
    const d = doc(<ReplanPantalla v={(await vista())!} />);
    const fila = d.querySelector(
      '[data-base="oficial"] [data-movimiento="entra"][data-prueba="PR-MD-DER-001"]',
    )!;
    expect(fila.getAttribute("data-causas")).toBe("perfil");
    expect(fila.getAttribute("data-conjunta")).toBe("false");
    expect(fila.querySelector("a")!.getAttribute("href")).toBe(
      "/catalogo/PR-MD-DER-001",
    );
  });

  it("sobre la base demo cada movimiento dice su causa y el control que gana o pierde", async () => {
    const d = doc(<ReplanPantalla v={(await vista())!} />);
    const fila = (id: string) =>
      d.querySelector(`[data-base="demo"] [data-prueba="${id}"]`)!;
    expect(fila("PR-MD-DEMO-002").getAttribute("data-causas")).toBe(
      "catalogo perfil",
    );
    expect(fila("PR-MD-DEMO-002").getAttribute("data-conjunta")).toBe("true");
    expect(fila("PR-MD-DEMO-002").textContent).toContain("Conjunta");
    expect(fila("PR-MD-INV-001").getAttribute("data-causas")).toBe("regla");
    expect(fila("PR-MD-INV-001").getAttribute("data-movimiento")).toBe("sale");
    expect(
      fila("PR-MD-LIM-001").querySelector(
        '[data-control="iso42001-A.6.2.2"][data-efecto="pierde"]',
      ),
    ).not.toBeNull();
    expect(
      fila("PR-MD-DEMO-001").querySelector(
        '[data-control="iso42001-A.7.4"][data-efecto="gana"]',
      ),
    ).not.toBeNull();
    expect(fila("PR-MD-LIM-001").textContent).not.toContain("n.º 0");
  });

  it("la nota de una causa conjunta dice cuántas causas actúan y cuáles, con dos o con tres factores", () => {
    const dos = notaDeCausaConjunta(["catalogo", "perfil"]);
    expect(dos.es).toBe(
      "Conjunta: ninguna de las 2 basta por sí sola, se mueve por las dos a la vez (catálogo y perfil del activo).",
    );
    expect(dos.en).toContain("both at once (catalog and asset profile)");
    const tres = notaDeCausaConjunta(["catalogo", "regla", "perfil"]);
    expect(tres.es).toContain("ninguna de las 3");
    expect(tres.es).toContain("por las tres a la vez");
    expect(tres.es).toContain(
      "(catálogo, regla de aplicabilidad y perfil del activo)",
    );
    expect(tres.en).toContain("none of the 3");
    expect(tres.en).toContain("all three at once");
    expect(tres.en).toContain(
      "(catalog, applicability rule and asset profile)",
    );
  });

  it("la pantalla pinta la nota de la vista, no una frase fija: una conjunta de tres factores dice «las tres»", async () => {
    const v = (await vista())!;
    const demo = v.bases.find((b) => b.clave === "demo")!;
    const m = [...demo.entran, ...demo.salen, ...demo.seQuedan].find(
      (x) => x.id === "PR-MD-DEMO-002",
    )!;
    expect(m.notaConjunta).not.toBeNull();
    m.causas = [
      { id: "catalogo", nombre: { es: "Catálogo", en: "Catalog" } },
      { id: "regla", nombre: { es: "Regla", en: "Rule" } },
      { id: "perfil", nombre: { es: "Perfil", en: "Profile" } },
    ];
    m.notaConjunta = notaDeCausaConjunta(["catalogo", "regla", "perfil"]);
    const fila = doc(<ReplanPantalla v={v} />).querySelector(
      '[data-base="demo"] [data-prueba="PR-MD-DEMO-002"]',
    )!;
    const nota = fila.querySelector("[data-conjunta-nota]")!;
    expect(nota.textContent).toContain("las tres");
    expect(nota.textContent).not.toContain("las dos");
  });

  it("el color nunca solo: cada estado lleva símbolo y texto, en los dos idiomas", async () => {
    const d = doc(<ReplanPantalla v={(await vista())!} />);
    const estados = [...d.querySelectorAll(".hg-chip, .hg-estado")];
    expect(estados.length).toBeGreaterThan(0);
    for (const e of estados) {
      expect(e.querySelector("svg")).not.toBeNull();
      expect(e.textContent!.trim().length).toBeGreaterThan(0);
    }
    expect(d.body.textContent).toContain("Gana cobertura");
    expect(d.body.textContent).toContain("Gains coverage");
    expect(d.body.textContent).toContain("Pierde cobertura");
  });

  it("dice que es una vista previa y que nada se escribe", async () => {
    const d = doc(<ReplanPantalla v={(await vista())!} />);
    expect(d.body.textContent).toContain("vista previa");
    expect(d.body.textContent).toContain("it writes nothing");
  });
});
