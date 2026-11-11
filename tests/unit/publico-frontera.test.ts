// @vitest-environment node
// C19 · la frontera del modo público: la lista blanca decide qué rutas y qué datos viajan, y el barrido de lo exportado falla con
// cualquier cosa que no esté en ella. Se prueba con exportaciones sintéticas (una carpeta temporal) y con los demos reales de `datos/`.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { cierreDeEstaticos } from "../../src/lib/publico/estaticos.ts";
import {
  barrerCarpeta,
  barrerTexto,
  conocidosDeDemo,
  type ConocidosPublicos,
} from "../../src/lib/publico/frontera.ts";
import {
  archivoPermitido,
  enlaceVisible,
  CARPETAS_DE_EVIDENCIA_DEMO,
  esActivoPublico,
  esControlPropioPublico,
  esRutaPublica,
  rutaDeArchivo,
} from "../../src/lib/publico/lista-blanca.ts";

const RAIZ = process.cwd();
const conocidos: ConocidosPublicos = conocidosDeDemo(RAIZ);
const reglas = (archivo: string, texto: string) =>
  barrerTexto(archivo, texto, conocidos).map((h) => h.regla);

const temporales: string[] = [];
const exportacion = (archivos: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "hg-publico-"));
  temporales.push(dir);
  for (const [rel, texto] of Object.entries(archivos)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), texto);
  }
  return dir;
};
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);
afterEach(() => vi.unstubAllEnvs());

describe("la lista blanca de rutas", () => {
  it("deja pasar el catálogo, la ficha de una prueba, marcos, controles, la brecha y el control de la brecha", () => {
    for (const r of [
      "/",
      "/catalogo",
      "/catalogo/PR-AG-CONF-001",
      "/catalogo/marcos",
      "/catalogo/controles",
      "/brecha",
      "/brecha/control",
      "/brecha/control/iso42001-a-6-2-4",
      "/brecha/control/iso42001-a-6-2-4#evidencia",
      "/catalogo/",
    ])
      expect(esRutaPublica(r), r).toBe(true);
  });

  it("no deja pasar lo demás: activos, planes, evidencia, hallazgos, informe, propuestas, ejecutor, ni un enlace externo o relativo", () => {
    for (const r of [
      "/tablero",
      "/activos/act-demo-asistente",
      "/activos/act-demo-asistente/plan",
      "/activos/desde-ficha",
      "/evidencia/carga",
      "/evidencia/hallazgos/HZ-0007",
      "/brecha/informe",
      "/brecha/tendencia",
      "/catalogo/propuestas",
      "/catalogo/diferencias",
      "/catalogo/diferencias/a/b",
      "/ejecutor",
      "/diseno/index.html",
      "https://ejemplo.org/catalogo",
      "//ejemplo.org/catalogo",
      "catalogo",
      "../catalogo",
    ])
      expect(esRutaPublica(r), r).toBe(false);
  });

  it("un enlace se ve como tal fuera del modo público, y dentro solo si su destino está en la lista o es un ancla", () => {
    vi.stubEnv("HACKGUARD_PUBLICO", "");
    expect(enlaceVisible("/activos/act-demo-asistente")).toBe(true);
    vi.stubEnv("HACKGUARD_PUBLICO", "1");
    expect(enlaceVisible("/activos/act-demo-asistente")).toBe(false);
    expect(enlaceVisible("https://ejemplo.org")).toBe(false);
    expect(enlaceVisible("/catalogo/marcos")).toBe(true);
    expect(enlaceVisible("#contenido")).toBe(true);
  });

  it("dice a qué ruta pertenece cada archivo del export; los de soporte no pertenecen a ninguna", () => {
    expect(rutaDeArchivo("brecha.html")).toBe("/brecha");
    expect(rutaDeArchivo("brecha/__next.brecha.__PAGE__.txt")).toBe("/brecha");
    expect(rutaDeArchivo("brecha/control/iso42001-a-9-2.txt")).toBe(
      "/brecha/control/iso42001-a-9-2",
    );
    expect(rutaDeArchivo("index.html")).toBe("/");
    expect(rutaDeArchivo("__next._full.txt")).toBe("/");
    expect(rutaDeArchivo("activos/act-demo-asistente/paquete.json")).toBe(
      "/activos/act-demo-asistente/paquete",
    );
    expect(rutaDeArchivo("_next/static/chunks/a.js")).toBeNull();
    expect(rutaDeArchivo("favicon.ico")).toBeNull();
    expect(archivoPermitido("activos/act-demo-asistente.html")).toBe(false);
    expect(archivoPermitido("evidencia/hallazgos/HZ-0007.txt")).toBe(false);
    expect(archivoPermitido("diseno/index.html")).toBe(false);
    expect(archivoPermitido("catalogo.html")).toBe(true);
  });
});

describe("el barrido de lo exportado", () => {
  it("una página de la lista, con datos demo, no tiene hallazgos", () => {
    const html =
      '<a href="/catalogo/marcos">Marcos</a><a href="/_next/static/a.css">x</a><span>act-demo-asistente HZ-0007 SOB-0003 LOTE-0007</span><svg xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(reglas("brecha.html", html)).toEqual([]);
  });

  it("falla con un activo que no es demo", () => {
    expect(reglas("a.html", "act-mi-asistente")).toEqual(["activo-no-demo"]);
    expect(reglas("a.js", '"act-acme-produccion"')).toEqual(["activo-no-demo"]);
    // El prefijo de una palabra más larga no es un activo.
    expect(reglas("a.js", "react-dom exact-match fact-check")).toEqual([]);
  });

  it("falla con un hallazgo, un sobre o un lote que no son de los demos versionados", () => {
    expect(reglas("a.html", "HZ-9999")).toEqual(["hallazgo-no-demo"]);
    expect(reglas("a.txt", "SOB-9999")).toEqual(["sobre-no-demo"]);
    expect(reglas("a.js", "LOTE-9999")).toEqual(["lote-no-demo"]);
  });

  it("falla con datos privados, con el formato de un sobre, un lote o un plan, y con el alcance o las reglas de un activo", () => {
    expect(reglas("a.html", "datos/privado/activos/x.json")).toEqual([
      "dato-privado",
    ]);
    expect(reglas("a.txt", "datos\\/ejecutor\\/salidas")).toEqual([
      "dato-privado",
    ]);
    expect(reglas("a.json", '{"formato":"hackguard/sobre@1"}')).toEqual([
      "formato-de-evidencia",
    ]);
    expect(reglas("a.txt", '\\"formato\\":\\"hackguard/plan@1\\"')).toEqual([
      "formato-de-evidencia",
    ]);
    expect(reglas("a.html", '{"alcance":{"dentro":[]}}')).toEqual([
      "alcance-o-reglas-de-un-activo",
    ]);
    expect(reglas("a.txt", '\\"reglas\\":[1]')).toEqual([
      "alcance-o-reglas-de-un-activo",
    ]);
  });

  it("el código del cliente puede llevar las constantes de sus esquemas, pero no datos", () => {
    expect(reglas("chunk.js", 'z.literal("hackguard/sobre@1")')).toEqual([]);
    expect(reglas("chunk.js", 'dueno:"x",alcance:"y"')).toEqual([]);
    expect(
      reglas("chunk.js", "datos/privado/activos/${c}.perfil.json"),
    ).toEqual(["dato-privado"]);
  });

  it("falla con cualquier host externo salvo las cadenas del framework", () => {
    expect(reglas("a.html", "https://ejemplo.org/x")).toEqual(["host-externo"]);
    // Tampoco una dirección local: ni un enlace de acceso ni un host (ni 127.0.0.1) viaja en lo exportado.
    expect(reglas("a.js", "http://127.0.0.1:3000/x")).toEqual(["host-externo"]);
    expect(reglas("a.js", "http://malo.example.com:8080/x")).toEqual([
      "host-externo",
    ]);
    expect(
      reglas(
        "a.js",
        "http://www.w3.org/2000/svg https://nextjs.org/docs/messages/x https://react.dev/errors/1 https://github.com/zloirock/core-js/blob/v3/LICENSE https://json-schema.org/draft/2020-12/schema",
      ),
    ).toEqual([]);
    expect(reglas("a.js", "https://github.com/otro/repo")).toEqual([
      "host-externo",
    ]);
  });

  it("falla con un enlace de una página que sale de la lista (HTML y RSC)", () => {
    expect(
      reglas("catalogo.html", '<a href="/activos/act-demo-asistente">x</a>'),
    ).toEqual(["enlace-fuera-de-la-lista"]);
    expect(
      reglas("catalogo.txt", '{\\"href\\":\\"/evidencia/carga\\"}'),
    ).toEqual(["enlace-fuera-de-la-lista"]);
    expect(reglas("catalogo.txt", '"href":"/brecha/informe#x"')).toEqual([
      "enlace-fuera-de-la-lista",
    ]);
  });

  it("una carpeta con una ruta fuera de la lista falla aunque su contenido esté limpio", () => {
    const limpia = exportacion({
      "brecha.html": "<h1>Brecha</h1>",
      "catalogo/PR-AG-CONF-001.html": "x",
      "_next/static/chunks/a.js": 'z.literal("hackguard/sobre@1")',
      "favicon.ico": "x",
    });
    expect(barrerCarpeta(limpia, conocidos)).toEqual([]);
    const sucia = exportacion({
      "brecha.html": "<h1>Brecha</h1>",
      "activos/act-demo-asistente.html": "<h1>Activo</h1>",
      "evidencia/carga/__next.evidencia.carga.txt": "x",
    });
    expect(
      barrerCarpeta(sucia, conocidos)
        .map((h) => `${h.regla}:${h.archivo}`)
        .sort(),
    ).toEqual([
      "ruta-fuera-de-la-lista:activos/act-demo-asistente.html",
      "ruta-fuera-de-la-lista:evidencia/carga/__next.evidencia.carga.txt",
    ]);
  });

  it("con un sobre real sembrado en una página de la lista, la carpeta falla", () => {
    const dir = exportacion({
      "brecha.html": "<p>SOB-4242 hallazgo HZ-4242</p>",
    });
    expect(
      barrerCarpeta(dir, conocidos)
        .map((h) => h.regla)
        .sort(),
    ).toEqual(["hallazgo-no-demo", "sobre-no-demo"]);
  });
});

describe("los demos conocidos y los archivos estáticos", () => {
  it("los demos versionados son los únicos ids que pueden aparecer", () => {
    expect(conocidos.hallazgos.has("HZ-0007")).toBe(true);
    expect(conocidos.sobres.has("SOB-0003")).toBe(true);
    expect(conocidos.lotes.has("LOTE-0007")).toBe(true);
    expect(conocidos.hallazgos.size).toBeGreaterThan(0);
  });

  it("la lista blanca de datos deja pasar solo un activo demo sintético, y la frontera la usa", () => {
    for (const ok of ["act-demo-asistente", "act-demo-agente-uno"])
      expect(esActivoPublico(ok), ok).toBe(true);
    for (const no of ["act-mi-asistente", "act-demo", "act-demox-uno", "act-"])
      expect(esActivoPublico(no), no).toBe(false);
    const reglas = (t: string) =>
      barrerTexto("catalogo.html", t, conocidos).map((h) => h.regla);
    expect(reglas("act-demo-asistente")).toEqual([]);
    expect(reglas("act-mi-asistente")).toEqual(["activo-no-demo"]);
  });

  it("la capa propia de controles viaja solo si es la demo, y los ids de evidencia salen solo de carpetas demo versionadas", () => {
    for (const ok of ["org-demo", "org-demo-O.1.1", "org-demo-o.1.2"])
      expect(esControlPropioPublico(ok), ok).toBe(true);
    for (const no of ["org-acme", "org-acme-O.1.1", "org-demox-O.1", "org-"])
      expect(esControlPropioPublico(no), no).toBe(false);
    expect(reglas("catalogo.html", "org-demo-O.1.1")).toEqual([]);
    expect(reglas("catalogo.html", "org-acme-O.1.1")).toEqual([
      "control-propio-no-demo",
    ]);
    for (const carpeta of Object.values(CARPETAS_DE_EVIDENCIA_DEMO)) {
      expect(carpeta, carpeta).toMatch(/\/demo$/);
      expect(carpeta, carpeta).not.toMatch(/privado|ejecutor/);
    }
  });

  it("de `_next/` solo viaja lo que las páginas permitidas nombran, y lo que eso nombra a su vez", () => {
    const dir = exportacion({
      "brecha.html": '<script src="/_next/static/chunks/a.js"></script>',
      "_next/static/chunks/a.js": 'load("static/chunks/b.js")',
      "_next/static/chunks/b.js": "x",
      "_next/static/chunks/solo-del-alta.js": "datos/privado",
    });
    expect(cierreDeEstaticos(dir, ["brecha.html"])).toEqual([
      "_next/static/chunks/a.js",
      "_next/static/chunks/b.js",
    ]);
  });
});
