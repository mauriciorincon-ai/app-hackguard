// @vitest-environment node
// RF-07.2b: una persona aporta el documento que el agente no pudo leer (403, sesión, no era texto). El comando `aportar` registra el
// documento en un archivo aparte (`aportes.json`) y guarda su lectura; el sellado lo cuenta como una página leída y la verificación es la
// misma. Solo lo corre una persona (misma frontera que `decidir`), solo sobre lo que el agente no pudo leer, solo dentro de la lista
// blanca del marco, solo si la licencia del marco deja citar su texto (S9-E-M2), y nunca sobre una corrida ya decidida.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  Aportes,
  FORMATO_DE_CONSULTA,
} from "../../../src/engine/propuestas/esquemas.ts";
import { cargarAportes } from "../../../src/lib/propuestas/cargar.ts";
import { RAIZ } from "./ayuda.ts";

const temporales: string[] = [];
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

const URL_NIST = "https://airc.nist.gov/airmf-resources/airmf/";
const URL_ISO = "https://www.iso.org/standard/81230.html";
const CORRIDA = "INV-2026-10-12-07";

/** Una raíz de juguete con los datos, la demo y UNA corrida del investigador cuya consulta tiene fuentes que dieron 403. */
function raizConUna403() {
  const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-aportar-"));
  temporales.push(raiz);
  cpSync(path.join(RAIZ, "datos"), path.join(raiz, "datos"), {
    recursive: true,
    filter: (o) =>
      !path.relative(RAIZ, o).startsWith(path.join("datos", "privado")),
  });
  for (const rel of ["propuestas/demo", "docs/kit-de-prueba/propuestas-demo"])
    cpSync(path.join(RAIZ, rel), path.join(raiz, rel), { recursive: true });
  const carpeta = path.join(raiz, "propuestas/corridas", CORRIDA);
  mkdirSync(carpeta, { recursive: true });
  const fila = (url: string, marco: string) => ({
    marco,
    nombre: "Fuente",
    url,
    estado: "no_accesible",
    http: 403,
    huella_de_la_pagina: null,
    caracteres: 0,
    motivo: "http_403",
  });
  writeFileSync(
    path.join(carpeta, "consulta.json"),
    JSON.stringify({
      formato: FORMATO_DE_CONSULTA,
      corrida: CORRIDA,
      fecha: "2026-10-12",
      alcance: { es: "prueba", en: "test" },
      fuentes: [
        fila(URL_NIST, "nist-ai-rmf"),
        // Fuera de la lista blanca del marco: aunque dé 403, no se acepta un documento de ahí.
        fila("https://ajeno.example/nist", "nist-ai-rmf"),
        // En la lista blanca de su marco, pero su licencia no deja reproducir el texto.
        fila(URL_ISO, "iso-iec-42001"),
      ],
    }),
  );
  mkdirSync(path.join(raiz, "propuestas/entradas"), { recursive: true });
  writeFileSync(
    path.join(raiz, "propuestas/entradas/nist.txt"),
    "El AI RMF de NIST organiza la gestión del riesgo de la inteligencia artificial en cuatro funciones. Esta es una copia que leyó una persona.",
  );
  return raiz;
}

const aportar = (
  raiz: string,
  extra: Partial<Record<string, string>> = {},
  archivo = "propuestas/entradas/nist.txt",
) => {
  const a = {
    corrida: CORRIDA,
    url: URL_NIST,
    por: "Ana",
    fecha: "2026-10-12",
    ...extra,
  };
  const r = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      path.join(RAIZ, "src/cli/propuestas.ts"),
      "aportar",
      archivo,
      "--corrida",
      a.corrida,
      "--url",
      a.url,
      "--por",
      a.por,
      "--fecha",
      a.fecha,
    ],
    { cwd: raiz, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
};
const rutaAportes = (raiz: string) =>
  path.join(raiz, "propuestas/corridas", CORRIDA, "aportes.json");

describe("aportar un documento que el agente no pudo leer", () => {
  it("lo registra aparte, guarda su lectura con permisos 600 y dice la huella para citarla", () => {
    const raiz = raizConUna403();
    const r = aportar(raiz);
    expect(r.codigo, r.salida + r.errores).toBe(0);
    const aportes = Aportes.parse(
      JSON.parse(readFileSync(rutaAportes(raiz), "utf8")),
    );
    expect(aportes.aportes).toHaveLength(1);
    const a = aportes.aportes[0]!;
    expect(a).toMatchObject({ url: URL_NIST, por: "Ana", fecha: "2026-10-12" });
    const lectura = path.join(
      raiz,
      "propuestas/.lecturas",
      `${a.huella_de_la_pagina}.txt`,
    );
    expect(existsSync(lectura)).toBe(true);
    expect(statSync(lectura).mode & 0o777).toBe(0o600);
    expect(r.salida).toContain(a.huella_de_la_pagina);
    // La consulta que escribió el código no se toca.
    expect(
      JSON.parse(
        readFileSync(
          path.join(raiz, "propuestas/corridas", CORRIDA, "consulta.json"),
          "utf8",
        ),
      ).fuentes[0].estado,
    ).toBe("no_accesible");
  });

  it("rechaza lo que el agente SÍ pudo leer o que no figura en la consulta", () => {
    const raiz = raizConUna403();
    const r = aportar(raiz, { url: "https://airc.nist.gov/otra" });
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("no figura como no accesible");
    expect(existsSync(rutaAportes(raiz))).toBe(false);
  });

  it("rechaza una dirección fuera de la lista blanca del marco", () => {
    const raiz = raizConUna403();
    const r = aportar(raiz, { url: "https://ajeno.example/nist" });
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("lista blanca");
    expect(existsSync(rutaAportes(raiz))).toBe(false);
  });

  // S9-E-M2: lo aportado se cita literal en una corrida que se publica con el repositorio; la licencia de ISO/IEC 42001 no lo permite.
  it("rechaza el documento de un marco cuya licencia no deja reproducir su texto, y no guarda nada", () => {
    const raiz = raizConUna403();
    const r = aportar(raiz, { url: URL_ISO });
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("no deja reproducir su texto");
    expect(r.salida).toContain("ISO/IEC 42001");
    expect(existsSync(rutaAportes(raiz))).toBe(false);
    const lecturas = path.join(raiz, "propuestas/.lecturas");
    expect(existsSync(lecturas) ? readdirSync(lecturas) : []).toEqual([]);
  });

  it("un marco sin clasificar en licencias.json cuenta como «solo identificadores»: ante la duda, su texto no entra", () => {
    const raiz = raizConUna403();
    const archivo = path.join(raiz, "datos/propuestas/licencias.json");
    const datos = JSON.parse(readFileSync(archivo, "utf8")) as {
      marcos: Record<string, string>;
    };
    delete datos.marcos["nist-ai-rmf"];
    writeFileSync(archivo, JSON.stringify(datos));
    const r = aportar(raiz);
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("no deja reproducir su texto");
    expect(existsSync(rutaAportes(raiz))).toBe(false);
  });

  it("solo lee de las carpetas de textos: un archivo de otra parte no se acepta", () => {
    const raiz = raizConUna403();
    writeFileSync(path.join(raiz, "fuera.txt"), "texto de otra parte");
    const r = aportar(raiz, {}, "fuera.txt");
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("solo se lee de");
    expect(existsSync(rutaAportes(raiz))).toBe(false);
  });

  it("no acepta dos documentos para la misma dirección", () => {
    const raiz = raizConUna403();
    expect(aportar(raiz).codigo).toBe(0);
    const otra = aportar(raiz);
    expect(otra.codigo).toBe(2);
    expect(otra.salida).toContain("Ya se aportó");
  });

  // S9-E-B3: una fecha con forma válida pero que no existe falla el esquema; la lectura no se guarda antes.
  it("una fecha que no existe en el calendario no deja una lectura huérfana", () => {
    const raiz = raizConUna403();
    const r = aportar(raiz, { fecha: "2026-13-45" });
    expect(r.codigo).not.toBe(0);
    expect(existsSync(rutaAportes(raiz))).toBe(false);
    const lecturas = path.join(raiz, "propuestas/.lecturas");
    expect(existsSync(lecturas) ? readdirSync(lecturas) : []).toEqual([]);
  });

  // S9-E-M6: lo aportado es de la corrida que lo nombra; un archivo copiado a otra carpeta no se acepta.
  it("un aportes.json que nombra a otra corrida se rechaza al cargar", () => {
    const raiz = raizConUna403();
    expect(aportar(raiz).codigo).toBe(0);
    const otra = path.join(raiz, "propuestas/corridas/INV-2026-10-12-08");
    mkdirSync(otra, { recursive: true });
    cpSync(rutaAportes(raiz), path.join(otra, "aportes.json"));
    expect(() =>
      cargarAportes(raiz, "propuestas/corridas/INV-2026-10-12-08"),
    ).toThrow(/aportes\.json es de otra corrida/);
    // En su propia carpeta se carga.
    expect(cargarAportes(raiz, `propuestas/corridas/${CORRIDA}`)).toHaveLength(
      1,
    );
  });

  // S9-E-M1: `buscar` siempre abre una corrida nueva; el aporte está atado a la corrida donde se hizo. El skill dice cómo citarlo.
  it("el skill del investigador dice cómo citar un aporte y ya no promete «volver a buscar»", () => {
    const skill = readFileSync(
      path.join(RAIZ, ".claude/skills/investigar/SKILL.md"),
      "utf8",
    );
    expect(skill).toContain("aportes.json");
    expect(skill).not.toContain("volver a buscar");
  });

  it("una corrida que ya tiene decisiones no recibe más documentos", () => {
    const raiz = raizConUna403();
    // La corrida demo del investigador, ya sellada, pasa a ser «real» en esta raíz y se le decide una propuesta.
    rmSync(path.join(raiz, "propuestas/demo/INV-2026-10-02-01"), {
      recursive: true,
    });
    cpSync(
      path.join(RAIZ, "propuestas/demo/INV-2026-10-02-01"),
      path.join(raiz, "propuestas/corridas/INV-2026-10-02-01"),
      { recursive: true },
    );
    writeFileSync(
      path.join(raiz, "datos/propuestas/decisiones.jsonl"),
      `${JSON.stringify({
        formato: "hackguard/decision@1",
        propuesta: "PROP-0033",
        decision: "rechazar",
        por: "Ana",
        fecha: "2026-10-12",
        motivo: "una sola fuente",
      })}\n`,
    );
    const r = aportar(raiz, {
      corrida: "INV-2026-10-02-01",
      url: "https://arxiv.org/src/2609.32160/anc",
    });
    expect(r.codigo).toBe(2);
    expect(r.salida).toContain("ya tiene decisiones");
  });

  it("sin la persona delante (dentro de una sesión de Claude Code) no registra nada, sobre el repositorio real", () => {
    const r = spawnSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        path.join(RAIZ, "src/cli/propuestas.ts"),
        "aportar",
        "propuestas/entradas/nist.txt",
        "--corrida",
        CORRIDA,
        "--url",
        URL_NIST,
        "--por",
        "Ana",
        "--fecha",
        "2026-10-12",
      ],
      {
        cwd: RAIZ,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          CLAUDECODE: "1",
        } as unknown as NodeJS.ProcessEnv,
      },
    );
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("Aportar un documento lo hace una persona");
    expect(existsSync(path.join(RAIZ, "propuestas/corridas", CORRIDA))).toBe(
      false,
    );
  });
});
