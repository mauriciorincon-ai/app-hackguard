// Lo que dejó la auditoría del S7 como deuda de la vista (lote L8): claves únicas aunque una prueba esté en dos activos, la fecha de cierre
// real, ninguna acción cuando todo está vigente, quién confirmó, los textos de las cifras como dato, y el riesgo aceptado dicho aparte.
import { readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TablaDeAlertas } from "../../../src/components/brecha/piezas";
import { ControlPantalla } from "../../../src/components/control/control-pantalla";
import { TableroPantalla } from "../../../src/components/tablero/tablero-pantalla";
import {
  EtiquetasDeBrecha,
  IDS_DE_TEXTOS_DE_BRECHA,
} from "../../../src/engine/brecha/esquemas.ts";
import { evaluarHallazgo } from "../../../src/engine/hallazgos/ciclo.ts";
import {
  construirVistaDeControl,
  construirVistaDeInforme,
  construirVistaDeTablero,
} from "../../../src/lib/brecha/vista.ts";
import { FECHAS } from "../lib/fechas-de-la-matriz";
import { entradaDemo, mundoDeBrecha } from "../lib/mundo-de-brecha";

const m = await mundoDeBrecha();
const nombre = { es: "x", en: "x" };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("claves únicas aunque una prueba esté en dos activos (S7-M3)", () => {
  it("la tabla de alertas no repite clave con la misma prueba en dos activos", () => {
    const aviso = construirVistaDeTablero(m).vacio;
    const fila = (activoId: string) => ({
      clase: "catalogo" as const,
      id: "PR-X-001",
      tipo: aviso,
      prueba: { id: "PR-X-001", nombre },
      activoId,
      activo: nombre,
      ficha: { desde: "2026-01-01", dias: 300, etiqueta: aviso },
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // Render de CLIENTE: el de cadena no valida las claves de una lista.
    render(
      <TablaDeAlertas filas={[fila("act-a"), fila("act-b")]} titulo={nombre} />,
    );
    expect(
      error.mock.calls.flat().join(" "),
      "React avisó de una clave repetida",
    ).not.toContain("same key");
  });
  it("la vista por control no repite clave con la misma prueba en dos activos", () => {
    const v = construirVistaDeControl(m.brecha.controles[0]!.id, m);
    const p0 = v.pruebas[0]!;
    const doble = {
      ...v,
      pruebas: [p0, { ...p0, activoId: `${p0.activoId}-otro` }],
    };
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ControlPantalla v={doble} />);
    expect(error.mock.calls.flat().join(" ")).not.toContain("same key");
  });
});

describe("el informe dice cuándo se cerró un hallazgo, no cuándo se abrió (S7-M4)", () => {
  it("la fecha de «Cerrado el» es la del cierre del ciclo de vida", () => {
    const informe = construirVistaDeInforme(m);
    const cerrados = informe.hallazgos.filter(
      (h) => h.tiempo.tipo === "cerrado",
    );
    expect(cerrados.length).toBeGreaterThan(0);
    const base = entradaDemo();
    for (const h of cerrados) {
      const origen = base.hallazgos.find((x) => x.id === h.hallazgo.id)!;
      const r = evaluarHallazgo(origen, base.libro);
      if (!r.ok || r.evaluacion.cierre === null) throw new Error(h.hallazgo.id);
      if (h.tiempo.tipo === "cerrado")
        expect(h.tiempo.fecha).toBe(r.evaluacion.cierre.fecha);
    }
  });
});

describe("ninguna acción cuando no hay nada que hacer (S7-B1)", () => {
  it("un control con evidencia vigente dice «ninguna», no «cargar 0 de N»; uno con evidencia antigua abre el plan del activo que envejeció", async () => {
    let vistoVigente = false;
    let vistoAntigua = false;
    for (const fecha of [m.consulta, ...FECHAS]) {
      if (vistoVigente && vistoAntigua) break;
      const mundo = await mundoDeBrecha(fecha);
      for (const c of mundo.brecha.controles) {
        const a = construirVistaDeControl(c.id, mundo).accion;
        if (c.estado === "con_evidencia_vigente" && c.totales.planeadas > 0) {
          vistoVigente = true;
          expect(a.tipo, `${c.id} el ${fecha}`).toBe("ninguna");
        }
        if (c.estado === "evidencia_antigua") {
          vistoAntigua = true;
          expect(a.tipo).toBe("plan");
          if (a.tipo === "plan") {
            const activo = mundo.brecha.filas.find(
              (f) =>
                f.activo === a.activo &&
                c.filas.some((x) => x.prueba === f.prueba),
            );
            expect(activo?.edad?.estado, `${c.id} el ${fecha}`).toBe("antigua");
          }
        }
      }
    }
    expect(vistoVigente, "ninguna fecha tuvo un control vigente").toBe(true);
    expect(vistoAntigua, "ninguna fecha tuvo evidencia antigua").toBe(true);
  }, 60_000);
});

describe("la vista por control dice quién confirmó (S7-O8)", () => {
  it("cada prueba con sobre confirmado muestra el nombre de quien lo confirmó", () => {
    let visto = 0;
    for (const c of m.brecha.controles) {
      const v = construirVistaDeControl(c.id, m);
      const html = renderToStaticMarkup(<ControlPantalla v={v} />);
      for (const p of v.pruebas)
        if (p.sobre !== null) {
          visto++;
          expect(html).toContain(p.sobre.confirmadaPor);
        }
    }
    expect(visto).toBeGreaterThan(0);
  });
});

describe("los textos de las cifras son dato (S7-B4)", () => {
  const datos = JSON.parse(
    readFileSync("datos/brecha/etiquetas.json", "utf8"),
  ) as { textos: Record<string, { es: string; en: string }> };
  it("el esquema exige cada texto, y el dato los trae todos", () => {
    expect(Object.keys(datos.textos).sort()).toEqual(
      [...IDS_DE_TEXTOS_DE_BRECHA].sort(),
    );
    const sinUno = { ...datos, textos: { ...datos.textos } } as Record<
      string,
      unknown
    >;
    delete (sinUno.textos as Record<string, unknown>).cifra_sin_cerrar;
    expect(EtiquetasDeBrecha.safeParse(sinUno).success).toBe(false);
  });
  it("la vista no los escribe: salen del dato", () => {
    const fuente = readFileSync("src/lib/brecha/vista.ts", "utf8");
    for (const t of Object.values(datos.textos))
      expect(fuente, t.es).not.toContain(`"${t.es}"`);
  });
});

describe("el tablero dice aparte los hallazgos con el riesgo aceptado (S7-B3)", () => {
  it("«sin cerrar» cuenta lo que pide trabajo, y los aceptados se nombran en la misma tarjeta", () => {
    const v = construirVistaDeTablero(m);
    expect(v.aceptados).toBeGreaterThan(0);
    const html = renderToStaticMarkup(<TableroPantalla v={v} />);
    expect(html).toContain("con el riesgo aceptado");
    expect(html).toContain("no pide");
  });
});
