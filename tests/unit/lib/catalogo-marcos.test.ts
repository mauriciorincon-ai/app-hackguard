// @vitest-environment node
// La vista de «Marcos y versiones»: las cuentas son las de la instantánea oficial, la vigencia de cada marco es la del
// semáforo del catálogo (una cuenta, un cálculo) y, en cada fecha en que algo cambia de estado, la vista sigue entera
// (regla 23). Lo que la instantánea no sabe se dice «sin registro»: aquí se comprueba que no se inventa.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import { fechaMasDias } from "../../../src/engine/fecha.ts";
import { listarInstantaneas } from "../../../src/lib/catalogo/cargar-instantanea.ts";
import {
  construirVistaDeMarcos,
  type InstantaneaListada,
} from "../../../src/lib/catalogo/marcos.ts";
import { semaforoDe } from "../../../src/lib/catalogo/vista.ts";

const RAIZ = join(__dirname, "..", "..", "..");
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
const NOMBRE = archivo.replace(/\.json$/, "");
const HOY = snap.fecha_evaluacion;
const listadas: InstantaneaListada[] = [
  {
    nombre: NOMBRE,
    fecha: HOY,
    pruebas: snap.catalogo.pruebas.length,
    huella: snap.huella,
  },
];
const vista = (fecha = HOY) =>
  construirVistaDeMarcos(snap, NOMBRE, fecha, listadas);

describe("la vista de marcos dice lo que la instantánea oficial dice", () => {
  it("trae un marco por cada marco de la instantánea, con su versión, su editor y sus familias", () => {
    const v = vista();
    expect(v.filas.map((f) => f.id)).toEqual(
      snap.catalogo.marcos.map((m) => m.id),
    );
    expect(v.filas).toHaveLength(14);
    for (const f of v.filas) {
      const m = snap.catalogo.marcos.find((x) => x.id === f.id)!;
      expect(f.version).toBe(m.version_vigente);
      expect(f.editor).toBe(m.editor);
      expect(f.familias).toHaveLength(m.familias_aplicables.length);
      expect(f.licencia.nombre.es.length).toBeGreaterThan(0);
      expect(f.licencia.exige.en.length).toBeGreaterThan(0);
    }
  });

  it("«La citan: N pruebas» suma las 38 pruebas: cada prueba cita un solo marco", () => {
    const v = vista();
    expect(v.filas.reduce((n, f) => n + f.citan, 0)).toBe(
      snap.catalogo.pruebas.length,
    );
    expect(v.filas.find((f) => f.id === "owasp-llm-top10")!.citan).toBe(
      snap.catalogo.pruebas.filter((p) => p.marco_id === "owasp-llm-top10")
        .length,
    );
  });

  it("la vigencia de cada marco es la del semáforo del catálogo en esa fecha", () => {
    const v = vista("2026-11-04");
    const s = semaforoDe(snap, "2026-11-04");
    for (const f of v.filas) {
      const del = s.marcos.find((x) => x.id === f.id)!;
      expect(f.vigencia.estado).toBe(del.estado);
      expect(f.vigencia.dias).toBe(del.dias);
      expect(f.vigencia.desde).toBe(del.fecha_verificacion);
    }
  });

  it("el marco cuya fuente el agente no puede leer lo dice, y no inventa la fecha de su versión", () => {
    const iso = vista().filas.find((f) => f.id === "iso-iec-42001")!;
    expect(iso.fuente?.nombre.es).toBe("Fuente no accesible al agente");
    const otros = vista().filas.filter((f) => f.id !== "iso-iec-42001");
    expect(otros.every((f) => f.fuente === null)).toBe(true);
    // «Por verificar» es lo que el dato declara de cada marco (ISO/IEC 42001 y OWASP Top 10 hoy), ni más ni menos.
    for (const f of vista().filas) {
      const m = snap.catalogo.marcos.find((x) => x.id === f.id)!;
      expect(f.fechaPorVerificar, f.id).toBe(
        m.por_verificar.includes("fecha_version"),
      );
    }
    expect(iso.fechaPorVerificar).toBe(true);
  });

  it("el mapa de equivalencias trae los pares de la instantánea, con qué cambió y qué pruebas citan la entrada nueva", () => {
    const v = vista();
    expect(v.mapas).toHaveLength(1);
    const m = v.mapas[0]!;
    expect([m.desde, m.hasta]).toEqual(["2025", "2026"]);
    expect(m.pares).toHaveLength(snap.catalogo.equivalencias[0]!.pares.length);
    const llm03 = m.pares.find((p) => p.desde === "LLM03")!;
    expect(llm03.hacia).toEqual(["LLM04"]);
    expect(llm03.cambios.map((c) => c.es)).toEqual(["Cambia de número"]);
    expect(llm03.nota?.es.length).toBeGreaterThan(0);
    // Las pruebas que citan una entrada nueva son pruebas del marco, en la versión nueva.
    for (const p of m.pares) {
      for (const id of p.citadaPor) {
        const t = snap.catalogo.pruebas.find((x) => x.id === id)!;
        expect(t.marco_id).toBe("owasp-llm-top10");
        expect(t.version_marco).toBe("2026");
        expect(p.hacia).toContain(t.referencia_en_marco);
      }
    }
    expect(m.pares.some((p) => p.citadaPor.length > 0)).toBe(true);
    expect(m.sinEquivalente).toBe(
      m.pares.filter((p) => p.hacia.length === 0).length,
    );
  });

  it("las instantáneas listadas marcan la oficial, y el directorio real trae al menos esa", () => {
    const v = vista();
    expect(v.instantaneas).toHaveLength(1);
    expect(v.instantaneas[0]).toMatchObject({
      nombre: NOMBRE,
      oficial: true,
      pruebas: 38,
    });
    const reales = listarInstantaneas(RAIZ);
    expect(reales.map((r) => r.nombre)).toContain(NOMBRE);
    expect(reales.find((r) => r.nombre === NOMBRE)!.huella).toBe(snap.huella);
    const otra = construirVistaDeMarcos(snap, "otra", HOY, listadas);
    expect(otra.instantaneas[0]!.oficial).toBe(false);
  });
});

describe("la matriz de envejecimiento de «Marcos» (regla 23)", () => {
  // La fecha de consulta no puede ser anterior a la última verificación del catálogo (el motor lo rechaza): se parte de la
  // fecha de la instantánea y se cuentan los días desde ahí.
  const masAntigua = HOY;
  const { por_revisar, vencido } = snap.catalogo.umbrales.vigencia;
  const fechas = [
    masAntigua,
    fechaMasDias(masAntigua, por_revisar - 1),
    fechaMasDias(masAntigua, por_revisar),
    fechaMasDias(masAntigua, vencido - 1),
    fechaMasDias(masAntigua, vencido),
    fechaMasDias(masAntigua, 100),
  ];

  it.each(fechas)(
    "el %s la vista sigue entera: 14 marcos, ningún estado sin etiqueta",
    (fecha) => {
      const v = vista(fecha);
      expect(v.filas).toHaveLength(14);
      for (const f of v.filas) {
        expect(["vigente", "por_revisar", "vencido"]).toContain(
          f.vigencia.estado,
        );
        expect(f.vigencia.etiqueta.nombre.es.length).toBeGreaterThan(0);
        expect(f.vigencia.etiqueta.nombre.en.length).toBeGreaterThan(0);
        expect(Number.isFinite(f.vigencia.dias)).toBe(true);
      }
    },
  );

  it("al llegar a los umbrales, algún marco pasa a «por revisar» y luego a «vencido»", () => {
    const estados = (f: string) =>
      new Set(vista(f).filas.map((x) => x.vigencia.estado));
    expect(estados(fechas[0]!).has("vigente")).toBe(true);
    expect(estados(fechas[2]!).has("por_revisar")).toBe(true);
    expect(estados(fechas[4]!).has("vencido")).toBe(true);
  });
});
