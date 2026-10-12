// La vista del hallazgo en sus ramas: lo que la fidelidad (los cuatro hallazgos demo) no recorre. Cada escenario cambia el
// libro o el hallazgo de la demo y comprueba la cadena de cierre, el plazo, las salidas y lo que la pantalla dice.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SobreEfectivo } from "../../src/engine/evidencia/esquemas.ts";
import type { Evento, Hallazgo } from "../../src/engine/hallazgos/esquemas.ts";
import { HallazgoPantalla } from "../../src/components/hallazgo/hallazgo-pantalla";
import {
  accionesDe,
  conteoDeSobre,
  construirVistaDeHallazgo,
  ordenarParaSelector,
  primerHallazgo,
} from "../../src/lib/evidencia/vista.ts";
import { PRIMER_HALLAZGO } from "../../src/lib/evidencia/etiquetas.ts";
import { situacionDeHallazgo } from "../../src/engine/hallazgos/situacion.ts";
import { copia, con, mundo as mundoDeLibro, nuevo } from "./evidencia/ayuda.ts";
import { documentoDelProducto } from "./lib/fidelidad";
import { instantanea, mundo as activos, nombreDeLaInstantanea } from "./lib/mundo-de-activos";
import { mundoDeHallazgos } from "./lib/mundo-de-hallazgos";
// El mundo de la maqueta aprobada: el estado, la severidad y las fechas de sus cuatro hallazgos son el oráculo del motor.
import { HALLAZGOS as DE_LA_MAQUETA } from "../../scripts/maqueta/datos/mundo.mjs";

const CONSULTA = instantanea.fecha_evaluacion;

/** Una copia del mundo con otro libro y/u otros hallazgos. */
function escenario(cambios: { libro?: (l: SobreEfectivo[]) => SobreEfectivo[]; hallazgos?: (h: Hallazgo[]) => Hallazgo[] }) {
  const base = mundoDeHallazgos;
  return {
    ...base,
    libro: cambios.libro ? cambios.libro(copia(base.libro)) : base.libro,
    hallazgos: cambios.hallazgos ? cambios.hallazgos(copia(base.hallazgos)) : base.hallazgos,
  };
}
const vista = (m: typeof mundoDeHallazgos, id: string, consulta = CONSULTA) =>
  construirVistaDeHallazgo(id, m, activos, instantanea, nombreDeLaInstantanea, consulta);
const pantalla = (m: typeof mundoDeHallazgos, id: string) =>
  documentoDelProducto(renderToStaticMarkup(<HallazgoPantalla v={vista(m, id)} />));
const conEvento = (id: string, e: Evento) => (hs: Hallazgo[]) =>
  hs.map((h) => (h.id === id ? { ...h, eventos: [...h.eventos, e] } : h));
const evaluacionDe = (m: typeof mundoDeHallazgos, id: string) => {
  const r = situacionDeHallazgo(m.hallazgos.find((h) => h.id === id)!, m.libro, { escala: m.escala, plazos: m.plazos, fecha: CONSULTA });
  if (!r.ok) throw new Error(r.motivo);
  return r.situacion.evaluacion;
};
const eslabones = (m: typeof mundoDeHallazgos, id: string) =>
  vista(m, id).cadena.map((e) => `${e.pendiente ? "·" : "■"} ${e.etiqueta.nombre.es}`);

describe("el motor y la maqueta aprobada dicen lo mismo de los cuatro hallazgos", () => {
  it.each(DE_LA_MAQUETA.map((h: { id: string }) => h.id))("%s", (id: string) => {
    const m = DE_LA_MAQUETA.find((h: { id: string }) => h.id === id)!;
    const v = vista(mundoDeHallazgos, id);
    expect(v.estadoId).toBe(m.estado);
    expect(v.nivelId).toBe(m.severidad);
    expect(v.propiedades.abierto).toBe(m.apertura);
    expect(v.propiedades.activo.id).toBe(m.activo.toLowerCase());
    expect(v.propiedades.prueba.id).toBe(m.prueba);
    if (m.cvss !== undefined) expect(v.escala).toEqual({ tipo: "cvss", puntaje: m.cvss.puntaje });
    else expect(v.escala).toEqual({ tipo: "escala_ia" });
  });
});

describe("el selector", () => {
  it("pone primero lo que pide acción, y el primero es el que abre «Evidencia»", () => {
    const v = vista(mundoDeHallazgos, "HZ-0003");
    expect(v.selector.map((s) => s.id)).toEqual(["HZ-0007", "HZ-0009", "HZ-0005", "HZ-0003"]);
    expect(v.selector.filter((s) => s.actual).map((s) => s.id)).toEqual(["HZ-0003"]);
    expect(primerHallazgo(mundoDeHallazgos, CONSULTA)).toBe(PRIMER_HALLAZGO);
  });
  it("a igual estado, por identificador", () => {
    const m = mundoDeHallazgos;
    const situar = (h: Hallazgo) => {
      const r = situacionDeHallazgo(h, m.libro, { escala: m.escala, plazos: m.plazos, fecha: CONSULTA });
      if (!r.ok) throw new Error(r.motivo);
      return r.situacion;
    };
    const a = situar(m.hallazgos.find((h) => h.id === "HZ-0007")!);
    const b = situar({ ...copia(m.hallazgos.find((h) => h.id === "HZ-0007")!), id: "HZ-0001" });
    expect(ordenarParaSelector([a, b], m.etiquetas.orden_del_selector).map((s) => s.evaluacion.id)).toEqual(["HZ-0001", "HZ-0007"]);
  });
});

describe("la cadena de cierre en sus ramas", () => {
  it("la demo: abierto, corregido con re-prueba por confirmar, aceptado y cerrado por re-prueba", () => {
    expect(eslabones(mundoDeHallazgos, "HZ-0007")).toEqual(["■ Hallazgo abierto", "· Corrección pendiente", "· Re-prueba pendiente", "· Sin cerrar"]);
    expect(eslabones(mundoDeHallazgos, "HZ-0009")).toEqual(["■ Hallazgo abierto", "■ Corrección declarada", "■ Re-prueba por confirmar", "· Sin cerrar"]);
    expect(eslabones(mundoDeHallazgos, "HZ-0005")).toEqual(["■ Hallazgo abierto", "■ Riesgo aceptado", "· Sin corrección ni re-prueba", "· Sin cerrar: sigue contando como falla del control"]);
    expect(eslabones(mundoDeHallazgos, "HZ-0003")).toEqual(["■ Hallazgo abierto", "■ Corrección declarada", "■ Re-prueba superada", "■ Cerrado por re-prueba"]);
  });

  it("una re-prueba confirmada que no cierra se ve, con lo que le falta, y el hallazgo sigue contando", async () => {
    const m0 = await mundoDeLibro();
    const base = m0.sobres["SOB-0019"]!;
    const reprueba = await nuevo(base, "SOB-0100", {
      fecha: "2026-09-20",
      reprueba_de: "HZ-0007",
      resultado: { ejecutada: true, evaluadas: 116, fallidas: 3, alertas: null, metrica: null },
      veredicto: "fallida",
      confirmacion: { por: "Operador demo", fecha: "2026-09-20", modo: "individual" },
    });
    const m = escenario({
      libro: (l) => [...l, reprueba],
      hallazgos: conEvento("HZ-0007", { tipo: "correccion", fecha: "2026-09-10", por: "Operador demo", nota: { es: "Se ajustó", en: "Adjusted" } }),
    });
    const v = vista(m, "HZ-0007");
    expect(v.estadoId).toBe("re_probado");
    expect(eslabones(m, "HZ-0007")).toEqual(["■ Hallazgo abierto", "■ Corrección declarada", "■ Re-prueba que no cierra", "· Sin cerrar"]);
    const tercero = v.cadena[2]!;
    expect(tercero.lineas.find((l) => l.tipo === "motivos")).toMatchObject({ motivos: [{ es: expect.stringMatching(/.{10,}/), en: expect.stringMatching(/.{10,}/) }] });
    expect(v.acciones.lista.map((a) => a.id)).toEqual(["corregir", "reprobar", "aceptar", "eliminar", "no_reproducible"]);
    const doc = pantalla(m, "HZ-0007");
    expect(doc.querySelectorAll(".hg-eslabon .hg-lista li").length).toBeGreaterThan(0);
  });

  it.each([
    ["eliminacion", "cadena_eliminacion", "Cerrado por eliminación"],
    ["no_reproducible", "cadena_no_reproducible", "No reproducible"],
  ] as const)("un cierre alternativo (%s) no usa re-prueba y se muestra aparte", (tipo, _id, titulo) => {
    const m = escenario({
      hallazgos: conEvento("HZ-0007", {
        tipo,
        fecha: "2026-09-18",
        por: "Operador demo",
        justificacion: { es: "El componente ya no existe", en: "The component no longer exists" },
      } as Evento),
    });
    const v = vista(m, "HZ-0007");
    expect(eslabones(m, "HZ-0007")).toEqual(["■ Hallazgo abierto", `■ ${titulo}`, "· Sin re-prueba: este cierre no la pide", "■ Cerrado sin re-prueba"]);
    expect(v.cadena[1]!.lineas).toContainEqual({ tipo: "texto", menor: true, texto: { es: "El componente ya no existe", en: "The component no longer exists" } });
    expect(v.acciones.nada).not.toBeNull();
    expect(v.acciones.lista).toEqual([]);
    expect(v.propiedades.plazo).toMatchObject({ corre: false, estadoId: "no_corre", razon: "cerrado" });
  });

  it("sin la k del original la re-prueba pendiente pide «la misma configuración» sin inventar un número", async () => {
    const m0 = await mundoDeLibro();
    const sinK = await con(m0.sobres["SOB-0019"]!, { k: null });
    const m = escenario({ libro: (l) => l.map((s) => (s.id === "SOB-0019" ? sinK : s)) });
    const linea = vista(m, "HZ-0007").cadena[2]!.lineas[0];
    expect(linea).toMatchObject({ tipo: "texto", texto: { es: "Misma configuración que la prueba original." } });
    expect(accionesDe("HZ-0007", evaluacionDe(m, "HZ-0007")).lista.find((x) => x.id === "no_reproducible")?.consecuencia.es).toContain("dos intentos registrados");
  });
});

describe("el plazo", () => {
  it("una severidad sin plazo lo dice, y un riesgo aceptado o un cierre lo suspenden", async () => {
    const m0 = await mundoDeLibro();
    const poco = await con(m0.sobres["SOB-0019"]!, { resultado: { ejecutada: true, evaluadas: 116, fallidas: 1, alertas: null, metrica: null } });
    const m = escenario({
      libro: (l) => l.map((s) => (s.id === "SOB-0019" ? poco : s)),
      hallazgos: (hs) =>
        hs.map((h) => (h.id === "HZ-0007" ? { ...h, severidad: { tipo: "escala_ia" as const, impacto: 1, alcance: 1, detectabilidad: 1 } } : h)),
    });
    const v = vista(m, "HZ-0007");
    expect(v.nivelId).toBe("bajo");
    expect(v.propiedades.plazo).toMatchObject({ corre: false, estadoId: "sin_plazo", razon: "sin_plazo" });
    expect(pantalla(m, "HZ-0007").body.textContent).toContain("Esta severidad no tiene plazo.");
    expect(vista(mundoDeHallazgos, "HZ-0005").propiedades.plazo).toMatchObject({ corre: false, razon: "riesgo_aceptado" });
    expect(vista(mundoDeHallazgos, "HZ-0003").propiedades.plazo).toMatchObject({ corre: false, razon: "cerrado" });
  });
});

describe("la severidad", () => {
  it("un vector con métricas opcionales las nombra por grupo, sin inventar un valor", () => {
    const m = escenario({
      hallazgos: (hs) =>
        hs.map((h) =>
          h.id === "HZ-0009"
            ? { ...h, severidad: { tipo: "cvss" as const, vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N/E:A/CR:H" } }
            : h,
        ),
    });
    const v = vista(m, "HZ-0009");
    expect(v.severidad.tipo).toBe("cvss");
    if (v.severidad.tipo !== "cvss") return;
    const e = v.severidad.metricas.find((x) => x.clave === "E")!;
    expect(e).toMatchObject({ valor: "A", metrica: { es: "Métrica de amenaza" }, nombreDelValor: null });
    expect(v.severidad.metricas.find((x) => x.clave === "AV")!.nombreDelValor).toEqual({ es: "Red", en: "Network" });
    expect(pantalla(m, "HZ-0009").querySelectorAll(".hg-metricas li")).toHaveLength(13);
  });

  it("un sobre sin conteo dice que la frecuencia es de su única medición", async () => {
    const m0 = await mundoDeLibro();
    const sinConteo = await con(m0.sobres["SOB-0019"]!, { resultado: { ejecutada: true, evaluadas: null, fallidas: null, alertas: null, metrica: null } });
    const m = escenario({ libro: (l) => l.map((s) => (s.id === "SOB-0019" ? sinConteo : s)) });
    const doc = pantalla(m, "HZ-0007");
    expect(doc.body.textContent).toContain("no trae conteo");
    expect(doc.body.textContent).toContain("carries no count");
  });
});

describe("lo que dio un sobre, en palabras", () => {
  const sobre = async (resultado: SobreEfectivo["resultado"], razon: SobreEfectivo["razon"] = null) => {
    const m0 = await mundoDeLibro();
    return con(m0.sobres["SOB-0019"]!, { resultado, razon });
  };
  const r = (c: Partial<SobreEfectivo["resultado"]>): SobreEfectivo["resultado"] => ({ ejecutada: true, evaluadas: null, fallidas: null, alertas: null, metrica: null, ...c });
  it("la razón manda sobre el conteo", async () => {
    expect(conteoDeSobre(await sobre(r({ evaluadas: 5, fallidas: 1 }), { es: "porque sí", en: "just so" }))).toEqual({ es: "porque sí", en: "just so" });
  });
  it("una falla, varias y ninguna con la cota de la regla del tres", async () => {
    expect(conteoDeSobre(await sobre(r({ evaluadas: 20, fallidas: 1 })))).toEqual({ es: "1 de 20 salidas falló", en: "1 of 20 outputs failed" });
    expect(conteoDeSobre(await sobre(r({ evaluadas: 20, fallidas: 6 })))).toEqual({ es: "6 de 20 salidas fallaron", en: "6 of 20 outputs failed" });
    expect(conteoDeSobre(await sobre(r({ evaluadas: 20, fallidas: 0 })))).toEqual({ es: "0 de 20 fallaron · cota: hasta 15 %", en: "0 of 20 failed · upper bound: 15%" });
  });
  it("alertas, una métrica contra su umbral y nada que contar", async () => {
    expect(conteoDeSobre(await sobre(r({ alertas: 1 })))).toEqual({ es: "1 alerta", en: "1 alert" });
    expect(conteoDeSobre(await sobre(r({ alertas: 3 })))).toEqual({ es: "3 alertas", en: "3 alerts" });
    const m = { nombre: { es: "Error de calibración", en: "Calibration error" }, valor: 0.04, umbral: 0.06, sentido: "maximo" as const };
    expect(conteoDeSobre(await sobre(r({ metrica: m })))).toEqual({ es: "Error de calibración: 0.04 (umbral 0.06)", en: "Calibration error: 0.04 (threshold 0.06)" });
    expect(conteoDeSobre(await sobre(r({})))).toEqual({ es: "Sin conteo registrado", en: "No count recorded" });
  });
});

describe("las salidas, según el estado", () => {
  const evaluacion = (id: string) => evaluacionDe(mundoDeHallazgos, id);
  it("abierto: corregir, aceptar, eliminar y no se reproduce, cada una con su comando", () => {
    const a = accionesDe("HZ-0007", evaluacion("HZ-0007"));
    expect(a.lista.map((x) => x.id)).toEqual(["corregir", "aceptar", "eliminar", "no_reproducible"]);
    expect(a.lista[0]!.comando).toContain("pnpm hallazgos:declarar HZ-0007 corregido");
    expect(a.lista[1]!.comando).toContain("--revision-en-dias <n>");
  });
  it("corregido: la re-prueba se registra con sobre y se confirma; no se vuelve a «corregir»", () => {
    const a = accionesDe("HZ-0009", evaluacion("HZ-0009"));
    expect(a.lista.map((x) => x.id)).toEqual(["reprobar", "aceptar", "eliminar", "no_reproducible"]);
    expect(a.lista[0]!.comando).toContain("evidencia:registrar");
    expect(a.lista[0]!.comando).toContain("evidencia:confirmar");
  });
  it("aceptado con riesgo: solo se cierra por eliminación o porque no se reproduce", () => {
    expect(accionesDe("HZ-0005", evaluacion("HZ-0005")).lista.map((x) => x.id)).toEqual(["eliminar", "no_reproducible"]);
  });
  it("cerrado: nada, y lo dice", () => {
    const a = accionesDe("HZ-0003", evaluacion("HZ-0003"));
    expect(a.lista).toEqual([]);
    expect(a.nada?.es).toContain("la evidencia confirmada es inmutable");
  });
});

describe("lo que no cuadra rompe en vez de mostrarse", () => {
  it("un hallazgo que no existe, un activo que no está registrado y una fecha anterior a la apertura", () => {
    expect(() => vista(mundoDeHallazgos, "HZ-9999")).toThrow(/no hay un hallazgo/);
    const sinActivos = { ...activos, activos: [] };
    expect(() => construirVistaDeHallazgo("HZ-0007", mundoDeHallazgos, sinActivos, instantanea, nombreDeLaInstantanea, CONSULTA)).toThrow(/no está registrado/);
    expect(() => vista(mundoDeHallazgos, "HZ-0007", "2026-08-01")).toThrow(/fecha_anterior_a_la_apertura/);
  });
  it("una etiqueta que falta en los datos se dice con su nombre", () => {
    const sin = { ...mundoDeHallazgos, etiquetas: { ...mundoDeHallazgos.etiquetas, etiquetas: mundoDeHallazgos.etiquetas.etiquetas.filter((e) => e.id !== "cadena_abierto") } };
    expect(() => vista(sin, "HZ-0007")).toThrow(/cadena_abierto/);
  });
});
