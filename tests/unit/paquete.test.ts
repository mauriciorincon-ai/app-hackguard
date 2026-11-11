// @vitest-environment node
// C20 · el paquete de la vitrina: la base de CV Viva en cada enlace, el manifiesto con el SHA-256 de cada archivo y su verificación, que
// falla con un archivo cambiado, uno de más, uno que falta, un enlace roto o sin la base, un host externo, una dirección local o un
// dominio de despliegue.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { conocidosDeDemo } from "../../src/lib/publico/frontera.ts";
import {
  armarManifiesto,
  CARPETA_DE_LA_PIEZA,
  FORMATO_DEL_PAQUETE,
  verificarPaquete,
} from "../../src/lib/publico/manifiesto.ts";
import {
  BASE_DEL_PAQUETE,
  hrefDelPaquete,
} from "../../src/lib/publico/paquete.ts";

const conocidos = conocidosDeDemo(process.cwd());
const DOMINIOS = ["vercel.app", "pages.dev", "github.io"];
const temporales: string[] = [];
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

const PIEZA: Record<string, string> = {
  "index.html": `<a href="${BASE_DEL_PAQUETE}/catalogo.html">Catálogo</a><link rel="preconnect" href="/"/><script src="${BASE_DEL_PAQUETE}/_next/static/chunks/a.js"></script>`,
  "catalogo.html": `<a href="${BASE_DEL_PAQUETE}/index.html">Inicio</a><a href="${BASE_DEL_PAQUETE}/catalogo/PR-AG-CONF-001.html#x">Ficha</a>`,
  "catalogo/PR-AG-CONF-001.html": `<a href="${BASE_DEL_PAQUETE}/catalogo.html">Volver</a>`,
  "_next/static/chunks/a.js": "console.log(1)",
  "favicon.ico": "x",
};

async function paquete(
  cambios: Record<string, string | null> = {},
  despuesDelManifiesto: Record<string, string | null> = {},
) {
  const raiz = mkdtempSync(join(tmpdir(), "hg-paquete-"));
  temporales.push(raiz);
  const escribir = (archivos: Record<string, string | null>) => {
    for (const [rel, texto] of Object.entries(archivos)) {
      const abs = join(raiz, CARPETA_DE_LA_PIEZA, rel);
      if (texto === null) rmSync(abs, { force: true });
      else {
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, texto);
      }
    }
  };
  escribir({ ...PIEZA, ...cambios });
  const m = await armarManifiesto({
    raiz,
    version: "0.1.0",
    commit: "abc",
    arbolLimpio: true,
  });
  writeFileSync(join(raiz, "manifiesto.json"), JSON.stringify(m));
  escribir(despuesDelManifiesto);
  return { raiz, m };
}
const reglas = async (p: { raiz: string }) =>
  (await verificarPaquete(p.raiz, conocidos, DOMINIOS)).map((h) => h.regla);

describe("la base del paquete", () => {
  it("cada destino lleva la base de CV Viva y la extensión .html explícita", () => {
    expect(BASE_DEL_PAQUETE).toBe("/piezas/hackguard");
    expect(hrefDelPaquete("/")).toBe("/piezas/hackguard/index.html");
    expect(hrefDelPaquete("/catalogo")).toBe("/piezas/hackguard/catalogo.html");
    expect(hrefDelPaquete("/catalogo/")).toBe(
      "/piezas/hackguard/catalogo.html",
    );
    expect(hrefDelPaquete("/catalogo/PR-AG-CONF-001#x")).toBe(
      "/piezas/hackguard/catalogo/PR-AG-CONF-001.html#x",
    );
    expect(hrefDelPaquete("#contenido")).toBe("#contenido");
    expect(hrefDelPaquete("https://ejemplo.org")).toBe("https://ejemplo.org");
  });
});

describe("el manifiesto", () => {
  it("lleva el SHA-256 de cada archivo, la base, la entrada y su propia huella", async () => {
    const { m } = await paquete();
    expect(m.formato).toBe(FORMATO_DEL_PAQUETE);
    expect(m.base).toBe("/piezas/hackguard");
    expect(m.entrada).toBe("index.html");
    expect(m.n_archivos).toBe(Object.keys(PIEZA).length);
    expect(Object.keys(m.archivos).sort()).toEqual(
      Object.keys(PIEZA)
        .map((r) => `${CARPETA_DE_LA_PIEZA}/${r}`)
        .sort(),
    );
    for (const h of Object.values(m.archivos))
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(m.huella).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("la verificación del paquete", () => {
  it("un paquete íntegro y limpio pasa", async () => {
    expect(await reglas(await paquete())).toEqual([]);
  });

  it("falla con un archivo cambiado, uno de más y uno que falta", async () => {
    expect(
      await reglas(
        await paquete({}, { "catalogo.html": PIEZA["catalogo.html"] + " " }),
      ),
    ).toEqual(["archivo-cambiado"]);
    expect(await reglas(await paquete({}, { "extra.html": "x" }))).toContain(
      "archivo-de-mas",
    );
    expect(await reglas(await paquete({}, { "favicon.ico": null }))).toEqual([
      "archivo-que-falta",
    ]);
  });

  it("falla si el manifiesto fue tocado a mano (su huella no es la de su contenido)", async () => {
    const p = await paquete();
    writeFileSync(
      join(p.raiz, "manifiesto.json"),
      JSON.stringify({ ...p.m, version: "9.9.9" }),
    );
    expect(await reglas(p)).toEqual(["manifiesto"]);
  });

  it("falla con una entrada que falta", async () => {
    expect(await reglas(await paquete({ "index.html": null }))).toContain(
      "entrada",
    );
  });

  it("falla con un enlace sin la base, sin .html o que no lleva a un archivo", async () => {
    expect(
      await reglas(
        await paquete({ "catalogo.html": '<a href="/catalogo.html">x</a>' }),
      ),
    ).toEqual(["enlace-sin-la-base"]);
    expect(
      await reglas(
        await paquete({
          "catalogo.html": `<a href="${BASE_DEL_PAQUETE}/catalogo">x</a>`,
        }),
      ),
    ).toEqual(["enlace-sin-extension"]);
    expect(
      await reglas(
        await paquete({
          "catalogo.html": `<a href="${BASE_DEL_PAQUETE}/brecha/control/iso42001-a-8-2.html">x</a>`,
        }),
      ),
    ).toEqual(["enlace-roto"]);
  });

  it("falla con un enlace que sale de la lista blanca aunque el archivo exista", async () => {
    const p = await paquete({
      "activos/act-demo-asistente.html": "x",
      "catalogo.html": `<a href="${BASE_DEL_PAQUETE}/activos/act-demo-asistente.html">x</a>`,
    });
    expect(await reglas(p)).toEqual(
      expect.arrayContaining([
        "enlace-fuera-de-la-lista",
        "ruta-fuera-de-la-lista",
      ]),
    );
  });

  it("falla con un host externo, una dirección local, un dominio de despliegue y un DSN de Sentry", async () => {
    for (const [texto, regla] of [
      ["<a>https://ejemplo.org/x</a>", "host-externo"],
      ["<p>localhost:3000</p>", "direccion-local"],
      ["<p>mi-app.vercel.app</p>", "dominio-de-despliegue"],
      ["<p>abc@o123.ingest.sentry.io/1</p>", "dsn-de-sentry"],
    ] as const)
      expect(
        await reglas(
          await paquete({ "catalogo.html": PIEZA["catalogo.html"] + texto }),
        ),
        texto,
      ).toContain(regla);
  });

  it("falla con un archivo RSC, un mapa o un documento: el paquete navega con el navegador", async () => {
    expect(await reglas(await paquete({ "catalogo.txt": "x" }))).toContain(
      "archivo-que-no-viaja",
    );
    expect(await reglas(await paquete({ "_next/a.js.map": "{}" }))).toContain(
      "archivo-que-no-viaja",
    );
  });

  it("falla con un id de activo que no es demo y con un sobre real sembrado", async () => {
    const r = await reglas(
      await paquete({
        "catalogo.html": PIEZA["catalogo.html"] + "act-mi-asistente SOB-4242",
      }),
    );
    expect(r).toEqual(
      expect.arrayContaining(["activo-no-demo", "sobre-no-demo"]),
    );
  });

  it("falla sin manifiesto", async () => {
    const raiz = mkdtempSync(join(tmpdir(), "hg-paquete-"));
    temporales.push(raiz);
    expect(
      (await verificarPaquete(raiz, conocidos, DOMINIOS)).map((h) => h.regla),
    ).toEqual(["manifiesto"]);
  });
});
