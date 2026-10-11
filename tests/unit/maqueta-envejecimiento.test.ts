// MATRIZ DE ENVEJECIMIENTO de la maqueta (regla 23): la fecha de consulta es una perilla del generador
// (MAQUETA_FECHA), y la maqueta se genera en CADA fecha en que algo cambia de estado: hoy, la víspera y
// el día de cada umbral de cada dato fechado, +100 y +400 días. En cada fecha: el generador no lanza,
// no deja avisos en el HTML y cada estado es el que los umbrales mandan. Un gate que solo mira hoy no
// ve lo que el calendario toca (Big-D S1: el atlas se habría roto solo 27 días después).
//
// Protocolo en el HTML: todo dato fechado lleva data-fechado="<clase>", data-desde, data-dias y
// data-estado-fechado. Y todo estado de un control, data-control y data-control-estado (mismo estado en
// cada pantalla y en cada fecha). Los umbrales están LITERALES aquí a propósito: si datos/umbrales.json cambia,
// este test lo nombra en vez de seguirlo en silencio.
//   vigencia  (RF-01.5): por revisar desde 30 días, vencido desde 60.
//   evidencia (DA-04):   antigua desde 180 días.
//   plazo     (§ 11.3):  crítico 7 días, alto 30, medio 90; vencido al día siguiente del plazo.
//   revision  (RF-04.7): un riesgo aceptado toca revisarlo a los días que su hallazgo declara.
import { readFileSync, rmSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { documentoDe, generarEnTemporal, leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const DIA = 86_400_000;
const PLAZO: Record<string, number> = { critico: 7, alto: 30, medio: 90 };

const aDia = (fecha: string) => Date.parse(`${fecha}T00:00:00Z`) / DIA;
const aFecha = (dia: number) => new Date(dia * DIA).toISOString().slice(0, 10);

type Regla = { umbrales: (el: Element) => number[]; estado: (dias: number, el: Element) => string };
const REGLA: Record<string, Regla> = {
  vigencia: {
    umbrales: () => [30, 60],
    estado: (dias) => (dias >= 60 ? "vencido" : dias >= 30 ? "por_revisar" : "vigente"),
  },
  evidencia: {
    umbrales: () => [180],
    estado: (dias) => (dias >= 180 ? "antigua" : "vigente"),
  },
  // Riesgo aceptado: se revisa a los N días que el propio hallazgo declara (data-plazo).
  revision: {
    umbrales: (el) => [Number(el.getAttribute("data-plazo"))],
    estado: (dias, el) => (dias >= Number(el.getAttribute("data-plazo")) ? "toca_revisar" : "vigente"),
  },
  plazo: {
    umbrales: (el) => [PLAZO[el.getAttribute("data-severidad")!] + 1],
    estado: (dias, el) => (dias > PLAZO[el.getAttribute("data-severidad")!] ? "vencido" : "en_plazo"),
  },
};

const hoy: string = JSON.parse(readFileSync("scripts/maqueta/datos/consulta.json", "utf8")).fecha;

// Cada página se lee y se analiza UNA vez por fecha: con 47 páginas y medio centenar de fechas, el
// análisis del DOM es casi todo el tiempo del gate.
function documentos(dir: string) {
  return paginasDe(dir).map((pagina) => {
    const html = leerPagina(dir, pagina);
    return { pagina, html, doc: documentoDe(html) };
  });
}

const fechados = (docs: ReturnType<typeof documentos>) =>
  docs.flatMap(({ pagina, doc }) => [...doc.querySelectorAll("[data-fechado]")].map((el) => ({ pagina, el })));

const versionados = fechados(documentos(RAIZ_MAQUETA));

// Qué datos fechados hay, por página, clase y fecha de origen. Los que viven en una fila de ALERTA
// (vencidos, fichas vencidas, evidencia antigua) se acumulan con el tiempo; los demás son fijos.
type Fechado = { pagina: string; el: Element };
function inventario(datos: Fechado[]) {
  const cuenta = new Map<string, number>();
  for (const { pagina, el } of datos) {
    const lugar = el.closest("[data-alerta]") ? "alerta" : "fijo";
    const clave = `${pagina} · ${el.getAttribute("data-fechado")} desde ${el.getAttribute("data-desde")} · ${lugar}`;
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
  }
  return cuenta;
}
const deHoy = inventario(versionados);
const fechas = [
  ...new Set([
    hoy,
    ...versionados.flatMap(({ el }) =>
      REGLA[el.getAttribute("data-fechado")!]
        .umbrales(el)
        .flatMap((u) => [u - 1, u])
        .map((d) => aFecha(aDia(el.getAttribute("data-desde")!) + d)),
    ),
    aFecha(aDia(hoy) + 100),
    aFecha(aDia(hoy) + 400),
  ]),
]
  .filter((f) => aDia(f) >= aDia(hoy))
  .sort();

const temporales: string[] = [];
afterAll(() => temporales.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const vistos = new Map<string, Set<string>>();

describe("maqueta: matriz de envejecimiento", () => {
  it("la maqueta tiene datos fechados de clases conocidas", () => {
    expect(versionados.length).toBeGreaterThan(0);
    for (const { pagina, el } of versionados) {
      expect(Object.keys(REGLA), `${pagina}: clase de dato fechado desconocida`).toContain(el.getAttribute("data-fechado"));
    }
    expect(fechas.length).toBeGreaterThan(3);
  });

  it.each(fechas)("fecha de consulta %s: genera sin avisos y cada estado es el que mandan los umbrales", (fecha) => {
    const dir = generarEnTemporal(fecha);
    temporales.push(dir);
    const docs = documentos(dir);
    for (const { pagina, html } of docs) {
      expect(/\bNaN\b|\bundefined\b|Invalid Date|\[object Object\]/.test(html), `${pagina} @ ${fecha}: aviso en el HTML`).toBe(false);
    }
    const datos = fechados(docs);
    // Ningún dato fechado desaparece con el calendario, y fuera de una alerta ninguno aparece: solo las
    // alertas se acumulan (una ficha que vence, una evidencia que envejece).
    const enFecha = inventario(datos);
    for (const [clave, n] of deHoy) {
      expect(enFecha.get(clave) ?? 0, `@ ${fecha}: ${clave} (hoy hay ${n})`).toBeGreaterThanOrEqual(n);
    }
    for (const [clave, n] of enFecha) {
      if (clave.endsWith("· fijo")) expect(deHoy.get(clave) ?? 0, `@ ${fecha}: ${clave} aparece fuera de una alerta`).toBe(n);
    }
    for (const { pagina, el } of datos) {
      const clase = el.getAttribute("data-fechado")!;
      const desde = el.getAttribute("data-desde")!;
      const dias = aDia(fecha) - aDia(desde);
      const quien = `${pagina} @ ${fecha} (${clase} desde ${desde})`;
      const esperado = REGLA[clase].estado(dias, el);
      expect(Number(el.getAttribute("data-dias")), `${quien}: días`).toBe(dias);
      expect(el.getAttribute("data-estado-fechado"), `${quien}: estado a los ${dias} días`).toBe(esperado);
      vistos.set(clase, (vistos.get(clase) ?? new Set()).add(esperado));

      // Lo calculado se LEE: la cifra está en el texto, en los dos idiomas.
      if (clase === "plazo") {
        const plazo = PLAZO[el.getAttribute("data-severidad")!];
        expect(Number(el.getAttribute("data-plazo")), `${quien}: plazo`).toBe(plazo);
        const atraso = Math.max(0, dias - plazo);
        expect(Number(el.getAttribute("data-atraso")), `${quien}: atraso`).toBe(atraso);
        const frase = el.querySelector("[data-frase-plazo]")!;
        const dice = atraso > 0 ? String(atraso) : aFecha(aDia(desde) + plazo);
        for (const idioma of ["es", "en"]) {
          expect(frase.querySelector(`[lang="${idioma}"]`)?.textContent, `${quien}: el plazo no se lee (${idioma})`).toContain(dice);
        }
      } else {
        const frase = el.querySelector("[data-frase-dias]")!;
        expect(frase.querySelector('[lang="es"]')?.textContent, `${quien}: los días no se leen`).toBe(
          dias === 0 ? "hoy" : dias === 1 ? "hace 1 día" : `hace ${dias} días`,
        );
        expect(frase.querySelector('[lang="en"]')?.textContent, `${quien}: los días no se leen (en)`).toBe(
          dias === 0 ? "today" : dias === 1 ? "1 day ago" : `${dias} days ago`,
        );
      }
    }

    // El estado de un control es el que mandan sus filas (la evidencia envejece y el control cambia), y
    // es el MISMO en cada pantalla que lo muestra: el tablero, la brecha, la vista por control, su página
    // y el informe no pueden contradecirse en ninguna fecha. Protocolo: data-control + data-control-estado;
    // el sello con data-por-filas se deduce de las filas [data-fila-control][data-de-control] de su página.
    const dice = new Map<string, Map<string, string[]>>();
    for (const { pagina, doc } of docs) {
      for (const el of doc.querySelectorAll("[data-control-estado]")) {
        const control = el.getAttribute("data-control");
        const estado = el.getAttribute("data-control-estado")!;
        expect(control, `${pagina} @ ${fecha}: un estado de control sin data-control`).toBeTruthy();
        const porEstado = dice.get(control!) ?? new Map<string, string[]>();
        porEstado.set(estado, [...(porEstado.get(estado) ?? []), pagina]);
        dice.set(control!, porEstado);
        if (!el.hasAttribute("data-por-filas")) continue;
        const filas = [...doc.querySelectorAll(`[data-fila-control][data-de-control="${control}"]`)].map((f) => f.getAttribute("data-fila-control"));
        const hay = (e: string) => filas.includes(e);
        const esperado = hay("con_fallas")
          ? "con_fallas"
          : filas.every((f) => f === "sin_evidencia")
            ? "sin_evidencia"
            : hay("con_evidencia_vigente")
              ? "con_evidencia_vigente"
              : "evidencia_antigua";
        expect(estado, `${pagina} @ ${fecha}: estado de ${control} frente a sus filas`).toBe(esperado);
      }
    }
    expect(dice.size, `@ ${fecha}: ninguna pantalla dice el estado de un control`).toBeGreaterThan(0);
    for (const [control, porEstado] of dice) {
      const resumen = [...porEstado].map(([e, ps]) => `${e} en ${ps.join(", ")}`).join(" · ");
      expect(porEstado.size, `${control} @ ${fecha}: las pantallas no dicen el mismo estado (${resumen})`).toBe(1);
    }
    // Cada fecha genera y lee TODAS las páginas: el tiempo crece con la maqueta, no es un cuelgue.
  }, 30_000);

  it("la matriz recorrió todos los estados de cada clase presente", () => {
    const completos: Record<string, string[]> = {
      vigencia: ["por_revisar", "vencido", "vigente"],
      evidencia: ["antigua", "vigente"],
      plazo: ["en_plazo", "vencido"],
      revision: ["toca_revisar", "vigente"],
    };
    for (const [clase, estados] of vistos) {
      for (const estado of completos[clase]) {
        expect([...estados], `la matriz nunca mostró «${estado}» en ${clase}`).toContain(estado);
      }
    }
    expect(vistos.size).toBeGreaterThan(0);
  });
});
