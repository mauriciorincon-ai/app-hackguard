// @vitest-environment node
// Matriz de envejecimiento del catálogo real (regla 23, patrón `matriz-de-envejecimiento`): la instantánea
// se construye el día de la última verificación, la víspera y el día de cada umbral de cada fecha de
// verificación, y a +100 días. En cada celda: se emite, ningún día es negativo ni NaN, todo estado tiene su
// símbolo y su nombre en los dos idiomas, y cada entidad está en el estado que le toca. El estado esperado se
// calcula aquí comparando FECHAS (`fechaMasDias`), no días, para no repetir la cuenta del motor.
import { describe, expect, it } from "vitest";
import {
  construirInstantanea,
  type Instantanea,
} from "../../../src/engine/catalogo/instantanea.ts";
import {
  etiquetaDe,
  type EstadoDeVigencia,
  type Vigencia,
} from "../../../src/engine/catalogo/semaforo.ts";
import { validarCatalogo } from "../../../src/engine/catalogo/validar.ts";
import { fechaMasDias } from "../../../src/engine/fecha.ts";
import { catalogoReal } from "./ayuda.ts";

const { catalogo } = await validarCatalogo(catalogoReal());
if (catalogo.umbrales === null) throw new Error("faltan los umbrales");
const { por_revisar, vencido } = catalogo.umbrales.vigencia;

const fechados = [
  ...catalogo.pruebas.filter((p) => p.publicable).map((p) => p.prueba),
  ...catalogo.marcos,
  ...catalogo.herramientas,
];
const verificaciones = [
  ...new Set(fechados.map((f) => f.fecha_verificacion)),
].sort();
const hoy = verificaciones[verificaciones.length - 1];

const FECHAS = [
  ...new Set([
    hoy,
    ...verificaciones.flatMap((v) => [
      fechaMasDias(v, por_revisar - 1),
      fechaMasDias(v, por_revisar),
      fechaMasDias(v, vencido - 1),
      fechaMasDias(v, vencido),
    ]),
    fechaMasDias(hoy, 100),
  ]),
]
  // El motor rechaza las fechas anteriores a la última verificación: los umbrales de lo verificado antes que
  // caen ahí los cubre semaforo.test.ts.
  .filter((f) => f >= hoy)
  .sort();

function esperado(verificada: string, fecha: string): EstadoDeVigencia {
  if (fecha >= fechaMasDias(verificada, vencido)) return "vencido";
  if (fecha >= fechaMasDias(verificada, por_revisar)) return "por_revisar";
  return "vigente";
}

const instantaneas = new Map<string, Instantanea>();
for (const fecha of FECHAS) {
  const r = await construirInstantanea(catalogoReal(), fecha);
  if (r.emitida) instantaneas.set(fecha, r.instantanea);
}

describe("matriz de envejecimiento del catálogo real", () => {
  it("recorre hoy, la víspera y el día de cada umbral, y +100 días", () => {
    expect(FECHAS.length).toBeGreaterThanOrEqual(6);
    expect(FECHAS).toContain(fechaMasDias(hoy, 100));
  });

  it.each(FECHAS)("%s: la instantánea se emite", (fecha) => {
    expect(instantaneas.has(fecha)).toBe(true);
  });

  it.each(FECHAS)(
    "%s: cada entidad está en el estado que le toca, con días enteros y no negativos",
    (fecha) => {
      const s = instantaneas.get(fecha)?.semaforo;
      if (s === undefined) throw new Error(`sin instantánea en ${fecha}`);
      const todas: Vigencia[] = [...s.pruebas, ...s.marcos, ...s.herramientas];
      expect(todas).toHaveLength(fechados.length);
      for (const v of todas) {
        expect(Number.isSafeInteger(v.dias) && v.dias >= 0, v.id).toBe(true);
        expect(v.estado, `${v.id} el ${fecha}`).toBe(
          esperado(v.fecha_verificacion, fecha),
        );
      }
    },
  );

  it.each(FECHAS)(
    "%s: cada familia está como su prueba más atrasada",
    (fecha) => {
      const s = instantaneas.get(fecha)?.semaforo;
      if (s === undefined) throw new Error(`sin instantánea en ${fecha}`);
      const publicadas = catalogo.pruebas.filter((p) => p.publicable);
      for (const f of s.familias) {
        const suyas = s.pruebas.filter(
          (v) =>
            publicadas.find((p) => p.prueba.id === v.id)?.prueba.familia ===
            f.id,
        );
        expect(suyas.length, f.id).toBeGreaterThan(0);
        const peor = Math.max(...suyas.map((v) => v.dias));
        expect(f.dias).toBe(peor);
        expect(f.estado).toBe(suyas.find((v) => v.dias === peor)?.estado);
      }
    },
  );

  it.each(FECHAS)(
    "%s: todo estado tiene símbolo, papel y nombre en los dos idiomas",
    (fecha) => {
      const i = instantaneas.get(fecha);
      if (i === undefined) throw new Error(`sin instantánea en ${fecha}`);
      const estados = [
        ...i.semaforo.pruebas,
        ...i.semaforo.marcos,
        ...i.semaforo.herramientas,
        ...i.semaforo.familias,
      ].map((v) => v.estado);
      for (const estado of new Set(estados)) {
        const e = etiquetaDe(i.catalogo.estados, "vigencia", String(estado));
        expect(e, String(estado)).toBeDefined();
        expect(e?.nombre.es.trim() && e.nombre.en.trim()).toBeTruthy();
      }
    },
  );

  it("el semáforo cambia el día de cada umbral, y no la víspera", () => {
    const vigencias = (fecha: string) => {
      const s = instantaneas.get(fecha)?.semaforo;
      return JSON.stringify(
        [
          ...(s?.pruebas ?? []),
          ...(s?.marcos ?? []),
          ...(s?.herramientas ?? []),
        ].map((v) => [v.id, v.estado]),
      );
    };
    for (const v of verificaciones) {
      for (const umbral of [por_revisar, vencido]) {
        const vispera = fechaMasDias(v, umbral - 1);
        const dia = fechaMasDias(v, umbral);
        if (vispera < hoy) continue;
        expect(vigencias(vispera), `${v} + ${umbral}`).not.toBe(vigencias(dia));
      }
    }
  });

  it("a +100 días todo está vencido; hoy, lo verificado hoy está vigente", () => {
    const s100 = instantaneas.get(fechaMasDias(hoy, 100))?.semaforo;
    expect(
      new Set(
        [...(s100?.pruebas ?? []), ...(s100?.familias ?? [])].map(
          (v) => v.estado,
        ),
      ),
    ).toEqual(new Set(["vencido"]));
    const deHoy = [
      ...(instantaneas.get(hoy)?.semaforo.pruebas ?? []),
      ...(instantaneas.get(hoy)?.semaforo.marcos ?? []),
      ...(instantaneas.get(hoy)?.semaforo.herramientas ?? []),
    ].filter((v) => v.fecha_verificacion === hoy);
    expect(deHoy.length).toBeGreaterThan(0);
    expect(deHoy.every((v) => v.estado === "vigente" && v.dias === 0)).toBe(
      true,
    );
  });
});
