// @vitest-environment node
// Las pantallas `/catalogo/marcos` y `/catalogo/controles` tal como las ve quien las abre: lo que dicen es lo que la
// instantánea oficial dice, cada estado lleva símbolo + texto + color en los dos idiomas, cada enlace lleva a una ficha
// que existe, y lo que la instantánea no sabe se dice así en vez de simularse.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Instantanea } from "../../src/engine/catalogo/instantanea.ts";
import { fechaMasDias } from "../../src/engine/fecha.ts";
import { ControlesPantalla } from "../../src/components/controles/controles-pantalla";
import { MarcosPantalla } from "../../src/components/marcos/marcos-pantalla";
import { construirVistaDeControles } from "../../src/lib/catalogo/controles.ts";
import { construirVistaDeMarcos } from "../../src/lib/catalogo/marcos.ts";
import { propuestasSinAvisos } from "./lib/mundo-de-brecha";

const RAIZ = process.cwd();
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
const NOMBRE = archivo.replace(/\.json$/, "");
const IDS = new Set(snap.catalogo.pruebas.map((p) => p.id));
const { por_revisar, vencido } = snap.catalogo.umbrales.vigencia;
const listadas = [
  {
    nombre: NOMBRE,
    fecha: snap.fecha_evaluacion,
    pruebas: snap.catalogo.pruebas.length,
    huella: snap.huella,
  },
];

const marcos = (fecha = snap.fecha_evaluacion) =>
  renderToStaticMarkup(
    <MarcosPantalla
      vista={construirVistaDeMarcos(
        snap,
        NOMBRE,
        fecha,
        listadas,
        propuestasSinAvisos,
      )}
    />,
  );
const controles = () =>
  renderToStaticMarkup(
    <ControlesPantalla
      vista={construirVistaDeControles(snap, NOMBRE, snap.fecha_evaluacion)}
    />,
  );
const cuantas = (html: string, patron: RegExp) =>
  (html.match(patron) ?? []).length;
const enlaces = (html: string) =>
  [...html.matchAll(/href="\/catalogo\/([^"]+)"/g)].map((m) => m[1]!);

describe("/catalogo/marcos", () => {
  it("muestra los 14 marcos, uno por fila, con la instantánea y la fecha de consulta", () => {
    const html = marcos();
    expect(cuantas(html, /data-marco="/g)).toBe(14);
    expect(html).toContain(NOMBRE);
    expect(html).toContain(snap.fecha_evaluacion);
    expect(html).toContain("OWASP Top 10 for LLM Applications".slice(0, 5));
  });

  it("dice «sin avisos registrados» y «sin aviso registrado» en vez de simular una comparación con la fuente", () => {
    const html = marcos();
    expect(html).toContain("Sin avisos registrados");
    expect(html).toContain("No notices recorded");
    expect(cuantas(html, /Sin aviso registrado/g)).toBe(13);
    expect(html).not.toContain("Hay una versión más nueva");
    // Y no promete una fecha ni un «más adelante».
    expect(html).not.toMatch(/próximamente|más adelante|por ahora/i);
  });

  it("el marco cuya fuente el agente no puede leer lo dice con símbolo, texto y color", () => {
    const html = marcos();
    expect(html).toMatch(
      /hg-chip es-atencion"><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span><span lang="es">Fuente no accesible al agente<\/span><span lang="en">Source not reachable by the agent<\/span>/,
    );
    expect(cuantas(html, /Fuente no accesible al agente/g)).toBe(1);
  });

  it("el mapa de equivalencias lista cada par y enlaza solo a fichas que existen", () => {
    const html = marcos();
    expect(html).toContain("Mapa de equivalencias");
    expect(html).toContain("Cambia de número");
    expect(html).toContain("Renumbered");
    const ids = enlaces(html);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(IDS.has(id), id).toBe(true);
  });

  it("la instantánea oficial sale marcada como oficial", () => {
    const html = marcos();
    expect(html).toContain(`data-instantanea="${NOMBRE}" data-oficial="true"`);
    expect(html).toContain("Oficial");
  });

  it("cuando un marco envejece, la pantalla lo dice con el estado y los días, no lo calla", () => {
    const base = snap.fecha_evaluacion;
    const aLos30 = marcos(fechaMasDias(base, por_revisar + 2));
    const aLos60 = marcos(fechaMasDias(base, vencido + 2));
    expect(aLos30).toMatch(/data-estado-fechado="por_revisar"/);
    expect(aLos60).toMatch(/data-estado-fechado="vencido"/);
    expect(aLos60).toContain("Vencido");
    expect(aLos60).toContain("Overdue");
  });
});

describe("/catalogo/controles", () => {
  it("muestra las 9 áreas, los controles con pruebas y las 10 pruebas sin control", () => {
    const html = controles();
    expect(cuantas(html, /data-area="/g)).toBe(9);
    expect(cuantas(html, /data-control="/g)).toBe(8);
    expect(cuantas(html, /<tr data-prueba="/g)).toBe(10);
  });

  it("dice con símbolo, texto y color que los resúmenes no se contrastaron con la norma", () => {
    const html = controles();
    expect(html).toMatch(
      /hg-chip es-atencion"><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span><span lang="es">No contrastado con la norma<\/span><span lang="en">Not checked against the standard<\/span>/,
    );
    expect(html).toContain("38 de 38 resúmenes");
    expect(html).toContain("38 of 38 summaries");
  });

  it("cada prueba enlazada existe, y ningún texto de la norma ni de una carga viaja en la página", () => {
    const html = controles();
    for (const id of enlaces(html)) expect(IDS.has(id), id).toBe(true);
    expect(html).toContain("Solo identificadores y resúmenes propios");
  });

  it("las pruebas sin control llevan el chip «Sin control» del catálogo y no se confunden con un error", () => {
    const html = controles();
    expect(
      cuantas(
        html,
        /es-atencion"><svg[^>]*>.*?<\/svg><span><span lang="es">Sin control</g,
      ),
    ).toBe(10);
    expect(html).toContain("una deuda a la vista, no un error");
  });

  it("los equivalentes de otro marco llevan el estado «mapa incompleto»", () => {
    const html = controles();
    expect(cuantas(html, /Mapa incompleto/g)).toBeGreaterThan(0);
    expect(html).toContain("Incomplete map");
  });
});
