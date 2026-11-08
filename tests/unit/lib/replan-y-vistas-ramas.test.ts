// @vitest-environment node
// Ramas de D1, D3 y D4 que ningún otro test pisaba (deuda de cobertura del S10): la base que falta para re-planear (cada causa con su mensaje),
// los valores del historial y del diff puestos en palabras, y la normalización de un activo sin alcance.
import { describe, expect, it } from "vitest";
import { Activo } from "../../../src/engine/activos/esquemas.ts";
import { normalizarActivo } from "../../../src/engine/activos/normalizar.ts";
import {
  SinBaseParaReplanear,
  entradaDeReplan,
} from "../../../src/lib/activos/replan.ts";
import { enPalabras } from "../../../src/lib/activos/historial-vista.ts";
import { legible } from "../../../src/lib/catalogo/diferencias-vista.ts";
import { cargarInstantaneaOficial } from "../../../src/lib/catalogo/cargar-instantanea.ts";
import { instantanea, mundo } from "./mundo-de-activos.ts";

const ID = "act-demo-clasificador";
const cargado = () => mundo.activos.find((a) => a.activo.id === ID)!;

describe("entradaDeReplan: sin base no hay re-plan, y dice cuál falta", () => {
  it("sin plan emitido", async () => {
    await expect(
      entradaDeReplan(
        { ...cargado(), plan: null },
        mundo.datos,
        instantanea,
        "2026-11-08",
      ),
    ).rejects.toThrow(/no tiene un plan emitido/);
  });

  it("sin historial, o con un historial sin la versión con que se emitió el plan", async () => {
    await expect(
      entradaDeReplan(
        { ...cargado(), versiones: null },
        mundo.datos,
        instantanea,
        "2026-11-08",
      ),
    ).rejects.toThrow(/no está en su historial/);
    await expect(
      entradaDeReplan(
        { ...cargado(), versiones: [] },
        mundo.datos,
        instantanea,
        "2026-11-08",
      ),
    ).rejects.toThrow(SinBaseParaReplanear);
  });

  it("con la instantánea que el plan cita fuera de datos/instantaneas/", async () => {
    const c = cargado();
    const plan = {
      ...c.plan!,
      instantanea: { ...c.plan!.instantanea, huella: "0".repeat(64) },
    };
    // La versión del activo se busca por la huella del activo del plan, que no cambió: solo falta la instantánea.
    await expect(
      entradaDeReplan({ ...c, plan }, mundo.datos, instantanea, "2026-11-08"),
    ).rejects.toThrow(/la instantánea que el plan cita no está/);
  });

  it("con todo en su sitio arma la entrada: activo anterior del historial e instantánea del plan", async () => {
    const e = await entradaDeReplan(
      cargado(),
      mundo.datos,
      (await cargarInstantaneaOficial()).instantanea,
      "2026-11-08",
    );
    expect(e.fecha).toBe("2026-11-08");
    expect(e.activoAnterior.id).toBe(ID);
    expect(e.instantaneaAnterior.huella).toBe(
      cargado().plan!.instantanea.huella,
    );
  });
});

describe("historial: los valores puestos en palabras", () => {
  it("nada, sí/no, texto bilingüe", () => {
    expect(enPalabras("x", null).es).toBe("no declarado");
    expect(enPalabras("x", true).es).toBe("sí");
    expect(enPalabras("x", false).es).toBe("no");
    expect(enPalabras("x", { es: "a", en: "b" })).toEqual({ es: "a", en: "b" });
  });
  it("una cadena con tabla de nombres llanos, y sin ella tal cual", () => {
    expect(enPalabras("perfil.exposicion", "publica").es).not.toBe("publica");
    expect(enPalabras("perfil.datos", "personales").es).not.toBe("personales");
    expect(enPalabras("acceso", "caja_blanca").es).not.toBe("caja_blanca");
    expect(enPalabras("otro", "valor")).toEqual({ es: "valor", en: "valor" });
  });
  it("listas: vacía, de cadenas, de textos y de objetos opacos", () => {
    expect(enPalabras("x", []).es).toBe("ninguno");
    expect(enPalabras("x", ["a", "b"])).toEqual({ es: "a · b", en: "a · b" });
    expect(
      enPalabras("x", [
        { es: "a", en: "A" },
        { es: "b", en: "B" },
      ]),
    ).toEqual({ es: "a · b", en: "A · B" });
    expect(enPalabras("x", [{ k: 1 }]).es).toBe("…");
  });
  it("un objeto cualquiera sale como su JSON", () => {
    expect(enPalabras("x", { k: 1 })).toEqual({ es: '{"k":1}', en: '{"k":1}' });
  });
});

describe("diferencias: un valor del catálogo en una frase", () => {
  it("nada, booleano, número y cadena", () => {
    expect(legible(null)).toEqual({ es: "—", en: "—" });
    expect(legible(undefined).es).toBe("—");
    expect(legible(true)).toEqual({ es: "sí", en: "yes" });
    expect(legible(false)).toEqual({ es: "no", en: "no" });
    expect(legible(3)).toEqual({ es: "3", en: "3" });
    expect(legible("a")).toEqual({ es: "a", en: "a" });
  });
  it("listas de cadenas, vacías, y de objetos contadas en singular y plural", () => {
    expect(legible(["a", "b"])).toEqual({ es: "a, b", en: "a, b" });
    expect(legible([])).toEqual({ es: "ninguno", en: "none" });
    expect(legible([{}])).toEqual({ es: "1 elemento", en: "1 item" });
    expect(legible([{}, {}])).toEqual({ es: "2 elementos", en: "2 items" });
  });
  it("un objeto: su descripción si la tiene, y si no cuántos campos", () => {
    expect(legible({ descripcion: { es: "d", en: "D" } })).toEqual({
      es: "d",
      en: "D",
    });
    expect(legible({ a: 1, b: 2 })).toEqual({ es: "2 campos", en: "2 fields" });
  });
});

describe("normalizarActivo", () => {
  it("un activo sin alcance sigue sin alcance, y el orden de sus conjuntos no cambia su forma", () => {
    const a = cargado().activo;
    const sinAlcance = Activo.parse({ ...a, alcance: null });
    const n = normalizarActivo(sinAlcance);
    expect(n.alcance).toBeNull();
    const barajado = Activo.parse({
      ...sinAlcance,
      familias: [...sinAlcance.familias].reverse(),
    });
    expect(JSON.stringify(normalizarActivo(barajado))).toBe(JSON.stringify(n));
  });
});
