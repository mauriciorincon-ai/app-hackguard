// @vitest-environment node
// La matriz de cobertura de la guía (S10): cada funcionalidad de la VISION (C1–C20 del brief, D1–D12 del roadmap) o tiene la parada que
// la prueba, o dice por qué no la tiene. El criterio del G-Plan del 2026-11-08: «un test falla si una construida queda sin parada o si
// un id aparece en dos paradas». Sin esta prueba, una funcionalidad nueva se construye y la guía del ensayo no la camina.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./catalogo/ayuda.ts";

interface Fila {
  id: string;
  estado: string;
  parada: string | null;
}
interface Parada {
  ancla: string;
  cubre: string[];
}

/** Las filas de la matriz y las paradas de un texto de guía. Se exporta para probar el propio gate con guías rotas. */
function leerGuia(html: string): { filas: Fila[]; paradas: Parada[] } {
  const filas = [
    ...html.matchAll(
      /<tr data-id="([A-Z]\d+)" data-estado="([a-z]+)">([\s\S]*?)<\/tr>/g,
    ),
  ].map((m) => ({
    id: m[1]!,
    estado: m[2]!,
    parada: m[3]!.match(/href="#(p-[^"]+)"/)?.[1] ?? null,
  }));
  const paradas = [
    ...html.matchAll(/<li [^>]*\bid="(p-[^"]+)"[^>]*\bdata-cubre="([^"]*)"/g),
  ].map((m) => ({
    ancla: m[1]!,
    cubre: m[2]!.split(",").filter((x) => x !== ""),
  }));
  return { filas, paradas };
}

/** Lo que está mal en una guía, en frases; vacío si la cobertura cuadra. */
function problemasDeCobertura(html: string): string[] {
  const { filas, paradas } = leerGuia(html);
  const problemas: string[] = [];
  const conocidos = new Set(filas.map((f) => f.id));
  for (const f of filas) {
    const quienes = paradas.filter((p) => p.cubre.includes(f.id));
    if (f.estado === "construida") {
      if (quienes.length === 0)
        problemas.push(`${f.id} está construida y ninguna parada la cubre`);
      if (quienes.length > 1)
        problemas.push(
          `${f.id} aparece en ${quienes.length} paradas: ${quienes.map((p) => p.ancla).join(", ")}`,
        );
      if (quienes.length === 1 && f.parada !== quienes[0]!.ancla)
        problemas.push(
          `${f.id}: la matriz apunta a ${f.parada ?? "nada"} y la parada es ${quienes[0]!.ancla}`,
        );
    } else if (quienes.length > 0) {
      problemas.push(
        `${f.id} está ${f.estado} y la parada ${quienes[0]!.ancla} dice cubrirla`,
      );
    }
  }
  for (const p of paradas)
    for (const id of p.cubre)
      if (!conocidos.has(id))
        problemas.push(`${p.ancla} cubre ${id}, que la matriz no conoce`);
  return problemas;
}

const guia = readFileSync(`${RAIZ}/docs/GUIA-DE-PRUEBA.html`, "utf8");
const { filas, paradas } = leerGuia(guia);

describe("la matriz de cobertura de la guía de prueba", () => {
  it("lista las 32 funcionalidades de la VISION, una vez cada una", () => {
    const esperadas = [
      ...Array.from({ length: 20 }, (_, i) => `C${i + 1}`),
      ...Array.from({ length: 12 }, (_, i) => `D${i + 1}`),
    ];
    expect(filas.map((f) => f.id)).toEqual(esperadas);
  });

  it("cada fila dice su estado con una de las tres palabras", () => {
    expect(
      filas.filter(
        (f) => !["construida", "pendiente", "descartada"].includes(f.estado),
      ),
    ).toEqual([]);
  });

  it("D7 está descartada por decisión del usuario, no pendiente", () => {
    expect(filas.find((f) => f.id === "D7")?.estado).toBe("descartada");
  });

  it("toda funcionalidad construida tiene exactamente una parada, y ningún id está en dos", () => {
    expect(problemasDeCobertura(guia)).toEqual([]);
  });

  it("las construidas del S10 (D1, D3, D4) tienen su parada nueva", () => {
    for (const id of ["D1", "D3", "D4"]) {
      const fila = filas.find((f) => f.id === id);
      expect(fila?.estado, id).toBe("construida");
      expect(fila?.parada, id).not.toBeNull();
    }
    expect(paradas.length).toBeGreaterThan(0);
  });

  // Un gate se demuestra fallando (regla 15): tres guías rotas a propósito, cada una debe nombrar su problema.
  describe("el gate falla cuando la cobertura se rompe", () => {
    const fila = (id: string, estado: string, parada: string | null) =>
      `<tr data-id="${id}" data-estado="${estado}"><td>${id}</td><td>x</td><td>x</td><td>${parada === null ? "—" : `<a href="#${parada}">Parada</a>`}</td></tr>`;
    const li = (ancla: string, cubre: string) =>
      `<li data-origen="nuevo" data-min="1" id="${ancla}" data-cubre="${cubre}"></li>`;

    it("una construida sin parada", () => {
      const html = fila("C1", "construida", null) + li("p-a", "");
      expect(problemasDeCobertura(html)).toEqual([
        "C1 está construida y ninguna parada la cubre",
      ]);
    });

    it("un id en dos paradas", () => {
      const html =
        fila("C1", "construida", "p-a") + li("p-a", "C1") + li("p-b", "C1");
      expect(problemasDeCobertura(html)[0]).toBe(
        "C1 aparece en 2 paradas: p-a, p-b",
      );
    });

    it("una parada que cubre algo pendiente, o un id que la matriz no conoce", () => {
      const html =
        fila("C19", "pendiente", null) + li("p-a", "C19") + li("p-b", "Z9");
      expect(problemasDeCobertura(html)).toEqual([
        "C19 está pendiente y la parada p-a dice cubrirla",
        "p-b cubre Z9, que la matriz no conoce",
      ]);
    });
  });
});
