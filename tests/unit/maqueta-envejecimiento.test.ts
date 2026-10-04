// MATRIZ DE ENVEJECIMIENTO de la maqueta (regla 23): la fecha de consulta es una perilla del generador
// (MAQUETA_FECHA), y la maqueta se genera en CADA fecha en que algo cambia de estado: hoy, la víspera y
// el día de cada umbral de cada pieza, +100 y +400 días. En cada fecha: el generador no lanza, no deja
// avisos en el HTML y el estado de cada fila es el que los umbrales mandan. Un gate que solo mira hoy
// no ve lo que el calendario toca (Big-D S1: el atlas se habría roto solo 27 días después).
//
// Los umbrales están LITERALES aquí a propósito (RF-01.5: por revisar desde 30 días, vencido desde 60):
// si datos/umbrales.json cambia, este test lo nombra en vez de seguirlo en silencio.
import { readFileSync, rmSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { documentoDe, generarEnTemporal, leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const POR_REVISAR = 30;
const VENCIDO = 60;
const DIA = 86_400_000;

const aDia = (fecha: string) => Date.parse(`${fecha}T00:00:00Z`) / DIA;
const aFecha = (dia: number) => new Date(dia * DIA).toISOString().slice(0, 10);
const estadoEsperado = (dias: number) => (dias >= VENCIDO ? "vencido" : dias >= POR_REVISAR ? "por_revisar" : "vigente");

const hoy: string = JSON.parse(readFileSync("scripts/maqueta/datos/consulta.json", "utf8")).fecha;

function filasConVigencia(dir: string) {
  return paginasDe(dir).flatMap((pagina) =>
    [...documentoDe(leerPagina(dir, pagina)).querySelectorAll("[data-vigencia]")].map((fila) => ({ pagina, fila })),
  );
}

const verificaciones = [...new Set(filasConVigencia(RAIZ_MAQUETA).map(({ fila }) => fila.getAttribute("data-verificada")!))];
const fechas = [
  ...new Set([
    hoy,
    ...verificaciones.flatMap((v) => [POR_REVISAR - 1, POR_REVISAR, VENCIDO - 1, VENCIDO].map((d) => aFecha(aDia(v) + d))),
    aFecha(aDia(hoy) + 100),
    aFecha(aDia(hoy) + 400),
  ]),
]
  .filter((f) => aDia(f) >= aDia(hoy))
  .sort();

const temporales: string[] = [];
afterAll(() => temporales.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe("maqueta: matriz de envejecimiento", () => {
  it("la maqueta tiene filas con vigencia y la matriz cubre los tres estados", () => {
    expect(verificaciones.length).toBeGreaterThan(0);
    expect(fechas.length).toBeGreaterThan(3);
    const estados = new Set(filasConVigencia(RAIZ_MAQUETA).map(({ fila }) => fila.getAttribute("data-vigencia")));
    expect([...estados].sort()).toEqual(["por_revisar", "vencido", "vigente"]);
  });

  it.each(fechas)("fecha de consulta %s: genera sin avisos y cada estado es el que mandan los umbrales", (fecha) => {
    const dir = generarEnTemporal(fecha);
    temporales.push(dir);
    for (const pagina of paginasDe(dir)) {
      const html = leerPagina(dir, pagina);
      expect(/\bNaN\b|\bundefined\b|Invalid Date|\[object Object\]/.test(html), `${pagina} @ ${fecha}: aviso en el HTML`).toBe(false);
    }
    const filas = filasConVigencia(dir);
    expect(filas.length).toBeGreaterThan(0);
    for (const { pagina, fila } of filas) {
      const dias = aDia(fecha) - aDia(fila.getAttribute("data-verificada")!);
      const quien = `${pagina} @ ${fecha} (verificada ${fila.getAttribute("data-verificada")})`;
      expect(Number(fila.getAttribute("data-dias")), `${quien}: días`).toBe(dias);
      expect(fila.getAttribute("data-vigencia"), `${quien}: estado a los ${dias} días`).toBe(estadoEsperado(dias));
      // El color nunca solo: la fila lleva su marca dibujada Y su texto en ambos idiomas.
      expect(fila.querySelector("svg.marca"), `${quien}: sin símbolo`).not.toBeNull();
      expect(fila.querySelector('.mq-estado-texto [lang="es"]')?.textContent, `${quien}: sin texto de estado`).toBeTruthy();
      expect(fila.querySelector('.mq-estado-texto [lang="en"]')?.textContent, `${quien}: sin texto de estado (en)`).toBeTruthy();
      const frase = dias === 0 ? "verificada hoy" : dias === 1 ? "verificada hace 1 día" : `verificada hace ${dias} días`;
      const leidas = [...fila.querySelectorAll('[lang="es"]')].map((el) => el.textContent);
      expect(leidas, `${quien}: los días no se leen en la fila`).toContain(frase);
    }
  });
});
