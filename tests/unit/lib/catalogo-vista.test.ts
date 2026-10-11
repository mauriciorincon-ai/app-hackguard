// @vitest-environment node
// La vista del catálogo y la ficha de cada prueba. Dos cosas importan más que el resto: la pantalla muestra la MISMA
// cuenta que la instantánea publicó («una cuenta, un cálculo», design-system § 9), y en cada fecha en que algo cambia
// de estado la vista sigue entera (regla 23: la fecha de consulta es una perilla del build, no el reloj).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fechaMasDias } from "../../../src/engine/fecha.ts";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import {
  construirFicha,
  construirVista,
  idsDePruebas,
  semaforoDe,
} from "../../../src/lib/catalogo/vista.ts";

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

const verificaciones = [
  ...snap.catalogo.pruebas,
  ...snap.catalogo.marcos,
  ...snap.catalogo.herramientas,
].map((x) => x.fecha_verificacion);
const MAS_ANTIGUA = [...verificaciones].sort()[0]!;

describe("una cuenta, un cálculo", () => {
  it("a la fecha de la instantánea, el semáforo recalculado es el que ella publicó", () => {
    expect(semaforoDe(snap, HOY)).toEqual(snap.semaforo);
  });

  it("la vista dice, prueba por prueba, lo mismo que el semáforo publicado", () => {
    const vista = construirVista(snap, NOMBRE, HOY);
    const publicado = new Map(snap.semaforo.pruebas.map((v) => [v.id, v]));
    expect(vista.filas).toHaveLength(snap.catalogo.pruebas.length);
    for (const f of vista.filas) {
      expect(f.vigencia.estado).toBe(publicado.get(f.id)!.estado);
      expect(f.vigencia.dias).toBe(publicado.get(f.id)!.dias);
    }
  });

  it("las cifras de arriba y el panel por familia cuentan las mismas pruebas que la tabla", () => {
    const vista = construirVista(snap, NOMBRE, HOY);
    const [vigente, porRevisar, vencido, sinControl] = vista.cifras;
    expect(vigente!.n + porRevisar!.n + vencido!.n).toBe(vista.total);
    expect(sinControl!.n).toBe(
      vista.filas.filter((f) => f.controles.length === 0).length,
    );
    expect(vista.panel.reduce((suma, f) => suma + f.pruebas, 0)).toBe(
      vista.total,
    );
    for (const f of vista.panel) {
      expect(f.desglose.reduce((suma, d) => suma + d.n, 0)).toBe(f.pruebas);
      expect(f.pruebas).toBe(
        vista.filas.filter((x) => x.familia === f.id).length,
      );
    }
  });

  it("describe lo que lee: instantánea, huella, fecha de consulta y las familias", () => {
    const vista = construirVista(snap, NOMBRE, HOY);
    expect(vista.instantanea).toBe(NOMBRE);
    expect(vista.huella).toBe(snap.huella);
    expect(vista.consulta).toBe(HOY);
    expect(vista.totalDeFamilias).toBe(snap.catalogo.familias.length);
    expect(vista.familias[0]).toEqual({
      valor: "",
      texto: { es: "Todas", en: "All" },
    });
    expect(vista.listas.map((l) => l.campo)).toEqual([
      "marco",
      "control",
      "madurez",
      "vigencia",
      "revision",
    ]);
    expect(vista.pendientes).toEqual([]);
  });
});

describe("la matriz de envejecimiento de la pantalla (regla 23)", () => {
  // Cada fecha en que algo cambia de estado: el día anterior y el del cambio de cada umbral, y 100 días después.
  const { por_revisar, vencido } = snap.catalogo.umbrales.vigencia;
  const fechas = [
    HOY,
    ...[por_revisar - 1, por_revisar, vencido - 1, vencido, 100].map((d) =>
      fechaMasDias(MAS_ANTIGUA, d),
    ),
  ];

  it.each(fechas)(
    "la vista del %s está entera: todo contado, todo con símbolo y nombre, ningún número roto",
    (fecha) => {
      const vista = construirVista(snap, NOMBRE, fecha);
      expect(vista.consulta).toBe(fecha);
      expect(vista.cifras[0]!.n + vista.cifras[1]!.n + vista.cifras[2]!.n).toBe(
        vista.total,
      );
      for (const f of vista.filas) {
        expect(Number.isInteger(f.vigencia.dias) && f.vigencia.dias >= 0).toBe(
          true,
        );
        expect(f.vigencia.etiqueta.simbolo).not.toBe("");
        expect(f.vigencia.etiqueta.nombre.es).not.toBe("");
        expect(f.vigencia.etiqueta.nombre.en).not.toBe("");
      }
      for (const p of vista.panel) {
        expect(p.estado.nombre.es).not.toBe("");
        expect(
          p.desglose.every((d) => d.etiqueta.nombre.es && d.etiqueta.nombre.en),
        ).toBe(true);
      }
    },
  );

  it("algo pasa a «por revisar» el día del primer umbral y a «vencido» el del segundo", () => {
    const estados = (dias: number) =>
      new Set(
        construirVista(snap, NOMBRE, fechaMasDias(MAS_ANTIGUA, dias)).filas.map(
          (f) => f.vigencia.estado,
        ),
      );
    expect(estados(por_revisar - 1).has("por_revisar")).toBe(false);
    expect(estados(por_revisar).has("por_revisar")).toBe(true);
    expect(estados(vencido - 1).has("vencido")).toBe(false);
    expect(estados(vencido).has("vencido")).toBe(true);
  });

  it("antes de la última verificación el motor se niega, y la vista también", () => {
    expect(() => construirVista(snap, NOMBRE, "2026-09-30")).toThrow(
      RangeError,
    );
  });
});

describe("las etiquetas nuevas (AU-14) llegan a la pantalla", () => {
  it("un motivo de revisión pendiente sale con el símbolo y el nombre del vocabulario", () => {
    const copia = structuredClone(snap);
    copia.pendientes_de_revision = [
      { id: "PR-X-001", motivo: "propuesta" },
      { id: "PR-X-002", motivo: "revision_desactualizada" },
    ];
    const { pendientes } = construirVista(copia, NOMBRE, HOY);
    expect(pendientes.map((p) => [p.id, p.etiqueta.nombre.es])).toEqual([
      ["PR-X-001", "Propuesta, sin aprobar"],
      ["PR-X-002", "Revisión desactualizada"],
    ]);
  });

  it("una familia sin pruebas publicadas sale «sin pruebas publicadas», no vacía", () => {
    const copia = structuredClone(snap);
    const familia = copia.catalogo.familias[0]!.id;
    copia.catalogo.pruebas = copia.catalogo.pruebas.filter(
      (p) => p.familia !== familia,
    );
    copia.semaforo = semaforoDe(copia, HOY);
    const fila = construirVista(copia, NOMBRE, HOY).panel.find(
      (f) => f.id === familia,
    )!;
    expect(fila.pruebas).toBe(0);
    expect(fila.estado.nombre).toEqual({
      es: "Sin pruebas publicadas",
      en: "No published tests",
    });
    expect(fila.dias).toBeNull();
    expect(fila.desglose).toEqual([]);
  });

  it("si el vocabulario no nombra un estado, la vista lo dice en vez de inventarlo", () => {
    const copia = structuredClone(snap);
    copia.catalogo.estados = copia.catalogo.estados.filter(
      (v) => v.id !== "vigencia",
    );
    expect(() => construirVista(copia, NOMBRE, HOY)).toThrow(
      /no nombra «vigencia\.vigente»/,
    );
  });
});

describe("la ficha de cada prueba", () => {
  const ids = idsDePruebas(snap);

  it("hay una ficha por prueba de la instantánea, 38", () => {
    expect(ids).toHaveLength(38);
    expect(new Set(ids).size).toBe(38);
  });

  it.each(ids)("%s: su ficha dice lo mismo que su fila", (id) => {
    const vista = construirVista(snap, NOMBRE, HOY);
    const fila = vista.filas.find((f) => f.id === id)!;
    const ficha = construirFicha(snap, id, HOY);
    expect(ficha.id).toBe(id);
    expect(ficha.vigencia).toEqual(fila.vigencia);
    expect(ficha.marcada).toBe(fila.revision === "marcada_para_revision");
    expect(ficha.controles.map((c) => c.id)).toEqual(fila.controles);
    expect(ficha.resultadoEsperado.es).not.toBe("");
    expect(ficha.resultadoEsperado.en).not.toBe("");
    expect(ficha.corrida.herramienta).toBe(fila.herramienta);
    expect(ficha.fuentes.length).toBeGreaterThanOrEqual(1);
    expect(ficha.aplicabilidad.condiciones.length).toBeGreaterThan(0);
  });

  it("solo la regla asimétrica dice la cota de la tasa de fallo, y con la cuenta de 3/k", () => {
    const conK = ids
      .map((id) => construirFicha(snap, id, HOY))
      .filter((f) => f.repeticiones.k !== null);
    expect(conK.length).toBeGreaterThan(0);
    for (const f of conK) {
      expect(f.repeticiones.cotaPorCiento !== null).toBe(
        f.regla.id === "asimetrica_k",
      );
      if (f.repeticiones.cotaPorCiento !== null) {
        expect(f.repeticiones.cotaPorCiento).toBe(
          Math.round((3 / f.repeticiones.k!) * 100),
        );
      }
    }
    const deterministas = ids
      .map((id) => construirFicha(snap, id, HOY))
      .filter((f) => f.repeticiones.k === null);
    expect(
      deterministas.every((f) => f.repeticiones.cotaPorCiento === null),
    ).toBe(true);
  });

  it("el selector de cada herramienta sale con su forma: módulo, garak, zap o revisión", () => {
    const todos = ids.map(
      (id) => construirFicha(snap, id, HOY).corrida.selector,
    );
    expect(
      todos.some((s) => s.detectores !== null && s.agregacion !== null),
    ).toBe(true); // garak
    expect(todos.some((s) => s.texto !== null && s.detectores === null)).toBe(
      true,
    ); // módulo
    expect(todos.every((s) => s.texto !== null || s.revision !== null)).toBe(
      true,
    );
  });

  it("las pruebas sin control lo dicen: ficha sin controles", () => {
    const sin = ids
      .map((id) => construirFicha(snap, id, HOY))
      .filter((f) => f.controles.length === 0);
    expect(sin.length).toBe(construirVista(snap, NOMBRE, HOY).cifras[3]!.n);
  });

  it("una prueba que no está en la instantánea es un error, no una ficha vacía", () => {
    expect(() => construirFicha(snap, "PR-NO-EXISTE-001", HOY)).toThrow(
      /no está en la instantánea/,
    );
  });

  it("la ficha de una prueba cuyo rasgo es de opción nombra la opción, no su identificador", () => {
    const rasgoDeOpcion = snap.catalogo.rasgos.find((r) => r.tipo === "opcion");
    if (!rasgoDeOpcion) return;
    const prueba = snap.catalogo.pruebas.find((p) =>
      p.aplicabilidad.condiciones.some((c) => c.rasgo === rasgoDeOpcion.id),
    );
    if (!prueba) return;
    const cond = construirFicha(
      snap,
      prueba.id,
      HOY,
    ).aplicabilidad.condiciones.find(
      (c) => JSON.stringify(c.rasgo) === JSON.stringify(rasgoDeOpcion.nombre),
    )!;
    expect(
      typeof cond.valor === "string" ? cond.valor : cond.valor.es,
    ).not.toMatch(/^[a-z]+_[a-z_]+$/);
  });
});
