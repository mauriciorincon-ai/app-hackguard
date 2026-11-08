// Las pantallas de D1 y D3 por dentro: lo que una persona comprueba al abrirlas, en HTML. El motor ya calculó; aquí se ve que la
// pantalla lo dice (con símbolo, texto y color, nunca el color solo) y que el texto de un marco con licencia restringida no sale.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivoPantalla } from "../../src/components/activos/activo-pantalla";
import { PlanPantalla } from "../../src/components/plan/plan-pantalla";
import { HistorialPantalla } from "../../src/components/historial/historial-pantalla";
import { DiferenciasPantalla } from "../../src/components/diferencias/diferencias-pantalla";
import { diferenciasEntreInstantaneas } from "../../src/engine/catalogo/diferencias";
import { construirVistaDeHistorial } from "../../src/lib/activos/historial-vista";
import {
  cargarInstantaneaDemo,
  cargarInstantaneaOficial,
} from "../../src/lib/catalogo/cargar-instantanea";
import { construirVistaDeDiferencias } from "../../src/lib/catalogo/diferencias-vista";
import { cargarLicenciasDeMarcos } from "../../src/lib/propuestas/cargar";
import { documentoDelProducto } from "./lib/fidelidad";
import {
  instantanea,
  mundo,
  nombreDeLaInstantanea,
  vistaDeActivo,
  vistaDePlan,
} from "./lib/mundo-de-activos";

const doc = (nodo: React.ReactElement) =>
  documentoDelProducto(renderToStaticMarkup(nodo));
const CLASIFICADOR = "act-demo-clasificador";
const ASISTENTE = "act-demo-asistente";

describe("el aviso «Plan desactualizado» del clasificador", () => {
  it("sale en la página del activo y en la del plan, con su causa y el enlace al historial", () => {
    for (const d of [
      doc(<ActivoPantalla v={vistaDeActivo(CLASIFICADOR)} />),
      doc(<PlanPantalla v={vistaDePlan(CLASIFICADOR)} />),
    ]) {
      expect(d.body.textContent).toContain("Plan desactualizado");
      expect(d.body.textContent).toContain("Plan out of date");
      expect(
        d.querySelector(`a[href="/activos/${CLASIFICADOR}/historial"]`),
      ).not.toBeNull();
    }
  });

  it("el activo sin historial no lo trae", () => {
    const d = doc(<PlanPantalla v={vistaDePlan(ASISTENTE)} />);
    expect(d.body.textContent).not.toContain("Plan desactualizado");
    expect(d.querySelector(`a[href$="/historial"]`)).toBeNull();
  });
});

describe("/activos/<id>/historial", () => {
  it("lista las versiones de la más nueva a la más vieja y dice con cuál se emitió el plan", async () => {
    const v = await construirVistaDeHistorial(
      CLASIFICADOR,
      mundo,
      instantanea,
      nombreDeLaInstantanea,
      instantanea.fecha_evaluacion,
    );
    const d = doc(<HistorialPantalla v={v} />);
    const filas = [...d.querySelectorAll("[data-version]")];
    expect(filas.map((f) => f.getAttribute("data-version"))).toEqual([
      "2",
      "1",
    ]);
    expect(filas[0]!.getAttribute("data-vigente")).toBe("true");
    expect(filas[1]!.textContent).toContain(
      "El plan se emitió con esta versión",
    );
    expect(filas[1]!.textContent).toContain("Plan desactualizado");
    expect(filas[0]!.textContent).not.toContain("El plan se emitió");
    expect(d.querySelector("[data-cambios-de]")).not.toBeNull();
    expect(
      d.querySelector('[data-campo="rasgos.modelo_de_terceros"]'),
    ).not.toBeNull();
  });

  it("un activo sin historial no tiene vista", async () => {
    await expect(
      construirVistaDeHistorial(
        ASISTENTE,
        mundo,
        instantanea,
        nombreDeLaInstantanea,
        instantanea.fecha_evaluacion,
      ),
    ).rejects.toThrow("no tiene historial");
  });
});

describe("/catalogo/diferencias", () => {
  async function vista(conDemo: boolean) {
    const oficial = await cargarInstantaneaOficial();
    const demo = conDemo ? await cargarInstantaneaDemo() : null;
    const nueva = demo ?? oficial;
    const d = await diferenciasEntreInstantaneas(
      oficial.instantanea,
      nueva.instantanea,
      cargarLicenciasDeMarcos().marcos,
    );
    return construirVistaDeDiferencias(d, oficial, {
      ...nueva,
      demo: demo !== null,
    });
  }

  it("oficial → demo: marca la demo como «no oficial» y lista entra, sale y cambia", async () => {
    const d = doc(<DiferenciasPantalla v={await vista(true)} />);
    expect(d.body.textContent).toContain("Demo, no oficial");
    expect(d.querySelector('[data-movimiento="entra"]')).not.toBeNull();
    expect(d.querySelector('[data-movimiento="sale"]')).not.toBeNull();
    expect(d.querySelector('[data-movimiento="cambia"]')).not.toBeNull();
    expect(d.body.textContent).toContain("PR-MD-DEMO-001");
    // Cada movimiento trae símbolo (trazo SVG) además del texto.
    for (const m of d.querySelectorAll("[data-movimiento]"))
      expect(m.querySelector("svg"), m.textContent ?? "").not.toBeNull();
  });

  it("de la oficial contra sí misma dice «sin cambios»", async () => {
    const d = doc(<DiferenciasPantalla v={await vista(false)} />);
    expect(d.querySelector("[data-movimiento]")).toBeNull();
    expect(d.body.textContent).not.toContain("Demo, no oficial");
  });
});
