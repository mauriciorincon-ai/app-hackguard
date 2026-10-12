// @vitest-environment node
// La búsqueda del investigador es la ÚNICA pieza con red, y aquí corre contra un `fetch` falso: la CI nunca toca la red. Se prueban sus
// reglas duras: solo https y lista blanca (también al redirigir), una cabecera fija sin identificadores, un 403 se registra y nunca se
// reintenta, una página con sesión no se lee, y lo leído se guarda con permisos 600 fuera de git.
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import {
  huellaDeTexto,
  normalizarEspacios,
} from "../../../src/engine/propuestas/citas.ts";
import { Consulta } from "../../../src/engine/propuestas/esquemas.ts";
import {
  buscar,
  CABECERAS_DE_BUSQUEDA,
  type Peticion,
} from "../../../src/lib/propuestas/buscar.ts";
import { CARPETA_DE_LECTURAS } from "../../../src/lib/propuestas/cargar.ts";

const marco = (
  id: string,
  familias: string[],
  lista: string[],
  vias: string[],
) => ({
  id,
  nombre: `Marco ${id}`,
  familias_aplicables: familias,
  lista_blanca_de_fuentes: lista,
  vias_de_acceso: vias.map((url) => ({ url })),
});
const instantanea = {
  catalogo: {
    marcos: [
      marco(
        "uno",
        ["agente"],
        ["uno.test"],
        ["https://uno.test/a", "https://uno.test/b"],
      ),
      marco(
        "dos",
        ["modelo_decision"],
        ["dos.test/docs"],
        ["https://dos.test/docs/v2"],
      ),
    ],
  },
} as unknown as Instantanea;

const OPCIONES = {
  fecha: "2026-10-12",
  corrida: "INV-2026-10-12-01",
  alcance: { es: "prueba", en: "test" },
};

interface Llamada {
  url: string;
  headers: Record<string, string>;
  redirect: string;
}
type Respuesta = {
  status: number;
  tipo?: string;
  cuerpo?: string;
  location?: string;
};
/** Un `fetch` falso: contesta lo que se le dice por dirección y apunta cada petición que recibe. */
function falso(respuestas: Record<string, Respuesta | "error">) {
  const llamadas: Llamada[] = [];
  const peticion: Peticion = async (url, init) => {
    llamadas.push({ url, headers: init.headers, redirect: init.redirect });
    const r = respuestas[url];
    if (r === undefined) throw new Error(`petición inesperada a ${url}`);
    if (r === "error") throw new Error("ECONNRESET");
    const cabeceras = new Map<string, string>();
    if (r.location !== undefined) cabeceras.set("location", r.location);
    cabeceras.set("content-type", r.tipo ?? "text/html; charset=utf-8");
    return {
      status: r.status,
      headers: { get: (n: string) => cabeceras.get(n.toLowerCase()) ?? null },
      text: async () => r.cuerpo ?? "",
    };
  };
  return { peticion, llamadas };
}

let raiz: string;
beforeEach(() => {
  raiz = mkdtempSync(path.join(tmpdir(), "hackguard-buscar-"));
});
afterEach(() => rmSync(raiz, { recursive: true, force: true }));

const filas = async (
  respuestas: Record<string, Respuesta | "error">,
  opciones: Partial<Parameters<typeof buscar>[1]> = {},
) => {
  const { peticion, llamadas } = falso(respuestas);
  const consulta = await buscar(
    instantanea,
    { ...OPCIONES, ...opciones },
    peticion,
    raiz,
  );
  return { consulta, llamadas };
};

describe("lo que se lee y lo que se guarda", () => {
  it("una página legible queda leída, con la huella de su texto y su texto guardado", async () => {
    const { consulta } = await filas({
      "https://uno.test/a": {
        status: 200,
        cuerpo: "<html><body><h1>Versión</h1><p>v2 &amp; más</p></body></html>",
      },
      "https://uno.test/b": {
        status: 200,
        tipo: "text/plain",
        cuerpo: "plano",
      },
    });
    const a = consulta.fuentes[0]!;
    expect(a).toMatchObject({
      marco: "uno",
      estado: "leida",
      http: 200,
      motivo: null,
    });
    const texto = "Versión v2 & más";
    expect(a.huella_de_la_pagina).toBe(await huellaDeTexto(texto));
    expect(a.caracteres).toBe(texto.length);
    const archivo = path.join(
      raiz,
      CARPETA_DE_LECTURAS,
      `${a.huella_de_la_pagina}.txt`,
    );
    expect(normalizarEspacios(readFileSync(archivo, "utf8"))).toBe(texto);
  });
  it("la lectura se guarda con permisos 600 (un derivado nunca nace menos privado que su fuente)", async () => {
    const { consulta } = await filas(
      {
        "https://uno.test/a": { status: 200, cuerpo: "<p>a</p>" },
        "https://uno.test/b": { status: 200, cuerpo: "<p>b</p>" },
      },
      { marco: "uno" },
    );
    for (const f of consulta.fuentes) {
      const archivo = path.join(
        raiz,
        CARPETA_DE_LECTURAS,
        `${f.huella_de_la_pagina}.txt`,
      );
      expect(statSync(archivo).mode & 0o777).toBe(0o600);
    }
    expect(readdirSync(path.join(raiz, CARPETA_DE_LECTURAS))).toHaveLength(2);
  });
  it("la consulta que arma cumple su esquema", async () => {
    const { consulta } = await filas({
      "https://uno.test/a": { status: 200, cuerpo: "<p>a</p>" },
      "https://uno.test/b": { status: 404 },
      "https://dos.test/docs/v2": { status: 200, cuerpo: "<p>c</p>" },
    });
    expect(Consulta.safeParse(consulta).success).toBe(true);
    expect(consulta.fuentes).toHaveLength(3);
  });
  it("pedir un marco o una familia lee solo sus vías de acceso", async () => {
    const respuestas = {
      "https://uno.test/a": { status: 200, cuerpo: "a" },
      "https://uno.test/b": { status: 200, cuerpo: "b" },
      "https://dos.test/docs/v2": { status: 200, cuerpo: "c" },
    };
    const uno = await filas(respuestas, { marco: "uno" });
    expect(uno.llamadas.map((l) => l.url)).toEqual([
      "https://uno.test/a",
      "https://uno.test/b",
    ]);
    const familia = await filas(respuestas, { familia: "modelo_decision" });
    expect(familia.llamadas.map((l) => l.url)).toEqual([
      "https://dos.test/docs/v2",
    ]);
  });
  it("un texto demasiado largo se recorta", async () => {
    const { consulta } = await filas(
      {
        "https://dos.test/docs/v2": {
          status: 200,
          cuerpo: "x".repeat(500_000),
        },
      },
      { marco: "dos" },
    );
    expect(consulta.fuentes[0]!.caracteres).toBe(400_000);
  });
});

describe("la petición no lleva nada de quien corre", () => {
  it("manda exactamente la cabecera fija, sin cookie, credencial, referencia ni identificador, y no sigue redirecciones solo", async () => {
    const { llamadas } = await filas(
      { "https://dos.test/docs/v2": { status: 200, cuerpo: "c" } },
      { marco: "dos" },
    );
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]!.headers).toEqual({ ...CABECERAS_DE_BUSQUEDA });
    expect(Object.keys(llamadas[0]!.headers).sort()).toEqual([
      "Accept",
      "User-Agent",
    ]);
    expect(llamadas[0]!.headers["User-Agent"]).toBe("hackguard-investigador");
    expect(llamadas[0]!.redirect).toBe("manual");
  });
  it("la cabecera no contiene el nombre del usuario, de la máquina ni del repositorio", () => {
    const todo = JSON.stringify(CABECERAS_DE_BUSQUEDA).toLowerCase();
    for (const prohibido of [
      "henry",
      "mauricio",
      "rincon",
      "users",
      "@",
      "app-hackguard",
      "cookie",
      "authorization",
      "referer",
    ])
      expect(todo, prohibido).not.toContain(prohibido);
  });
});

describe("un 401, 403 o 429 se registra y nunca se reintenta (RF-07.2b)", () => {
  for (const status of [401, 403, 429]) {
    it(`un ${status}: una sola petición, «no_accesible», sin segundo intento con otras cabeceras`, async () => {
      const { consulta, llamadas } = await filas(
        { "https://dos.test/docs/v2": { status } },
        { marco: "dos" },
      );
      expect(llamadas).toHaveLength(1);
      expect(consulta.fuentes[0]).toMatchObject({
        estado: "no_accesible",
        http: status,
        motivo: `http_${status}`,
        huella_de_la_pagina: null,
        caracteres: 0,
      });
      expect(readdirSyncSiExiste(path.join(raiz, CARPETA_DE_LECTURAS))).toEqual(
        [],
      );
    });
  }
  it("la red caída se registra «sin_red» y la búsqueda sigue con la siguiente", async () => {
    const { consulta, llamadas } = await filas(
      {
        "https://uno.test/a": "error",
        "https://uno.test/b": { status: 200, cuerpo: "b" },
      },
      { marco: "uno" },
    );
    expect(llamadas).toHaveLength(2);
    expect(consulta.fuentes.map((f) => [f.estado, f.motivo])).toEqual([
      ["no_accesible", "sin_red"],
      ["leida", null],
    ]);
  });
  it("otros códigos (404, 500) quedan «http_otro»", async () => {
    const { consulta } = await filas(
      { "https://dos.test/docs/v2": { status: 500 } },
      { marco: "dos" },
    );
    expect(consulta.fuentes[0]).toMatchObject({
      estado: "no_accesible",
      motivo: "http_otro",
      http: 500,
    });
  });
});

describe("la lista blanca manda, también al redirigir", () => {
  it("una vía fuera de la lista blanca no se pide", async () => {
    const fuera = {
      catalogo: {
        marcos: [
          marco(
            "tres",
            ["agente"],
            ["tres.test"],
            ["https://ajeno.test/x", "http://tres.test/y"],
          ),
        ],
      },
    } as unknown as Instantanea;
    const { peticion, llamadas } = falso({});
    const consulta = await buscar(fuera, OPCIONES, peticion, raiz);
    expect(llamadas).toEqual([]);
    expect(consulta.fuentes.map((f) => f.estado)).toEqual([
      "fuera_de_lista_blanca",
      "fuera_de_lista_blanca",
    ]);
  });
  it("una redirección dentro de la lista se sigue, y la fila lleva la dirección final", async () => {
    const { consulta, llamadas } = await filas(
      {
        "https://dos.test/docs/v2": { status: 301, location: "/docs/v3" },
        "https://dos.test/docs/v3": { status: 200, cuerpo: "nueva" },
      },
      { marco: "dos" },
    );
    expect(llamadas.map((l) => l.url)).toEqual([
      "https://dos.test/docs/v2",
      "https://dos.test/docs/v3",
    ]);
    expect(consulta.fuentes[0]).toMatchObject({
      estado: "leida",
      url: "https://dos.test/docs/v3",
    });
  });
  it("una redirección fuera de la lista blanca se detiene: no se pide", async () => {
    const { consulta, llamadas } = await filas(
      {
        "https://dos.test/docs/v2": {
          status: 302,
          location: "https://ajeno.test/docs/v2",
        },
      },
      { marco: "dos" },
    );
    expect(llamadas.map((l) => l.url)).toEqual(["https://dos.test/docs/v2"]);
    expect(consulta.fuentes[0]!.estado).toBe("fuera_de_lista_blanca");
  });
  it("una redirección a http (sin TLS) se detiene aunque el dominio sea el mismo", async () => {
    const { consulta, llamadas } = await filas(
      {
        "https://dos.test/docs/v2": {
          status: 302,
          location: "http://dos.test/docs/v2",
        },
      },
      { marco: "dos" },
    );
    expect(llamadas).toHaveLength(1);
    expect(consulta.fuentes[0]!.estado).toBe("fuera_de_lista_blanca");
  });
  it("una lista con prefijo no admite otra ruta del mismo dominio", async () => {
    const { consulta } = await filas(
      {
        "https://dos.test/docs/v2": {
          status: 302,
          location: "https://dos.test/otra-cosa",
        },
      },
      { marco: "dos" },
    );
    expect(consulta.fuentes[0]!.estado).toBe("fuera_de_lista_blanca");
  });
  it("una redirección sin destino, o un bucle de redirecciones, queda «http_otro»", async () => {
    const sin = await filas(
      { "https://dos.test/docs/v2": { status: 302 } },
      { marco: "dos" },
    );
    expect(sin.consulta.fuentes[0]).toMatchObject({
      estado: "no_accesible",
      motivo: "http_otro",
    });
    const bucle = await filas(
      { "https://dos.test/docs/v2": { status: 302, location: "/docs/v2" } },
      { marco: "dos" },
    );
    expect(bucle.llamadas).toHaveLength(4);
    expect(bucle.consulta.fuentes[0]).toMatchObject({
      estado: "no_accesible",
      motivo: "http_otro",
    });
  });
});

describe("lo que no es una página de texto o pide sesión no se lee", () => {
  it("una página de inicio de sesión se registra «requiere_sesion» sin pedirla", async () => {
    const conLogin = {
      catalogo: {
        marcos: [
          marco(
            "cuatro",
            ["agente"],
            ["cuatro.test"],
            ["https://cuatro.test/login", "https://cuatro.test/sso/entrar"],
          ),
        ],
      },
    } as unknown as Instantanea;
    const { peticion, llamadas } = falso({});
    const consulta = await buscar(conLogin, OPCIONES, peticion, raiz);
    expect(llamadas).toEqual([]);
    expect(consulta.fuentes.map((f) => [f.estado, f.motivo])).toEqual([
      ["no_accesible", "requiere_sesion"],
      ["no_accesible", "requiere_sesion"],
    ]);
  });
  it("una redirección que termina en un inicio de sesión tampoco se lee", async () => {
    const { consulta, llamadas } = await filas(
      {
        "https://dos.test/docs/v2": {
          status: 302,
          location: "https://dos.test/docs/login",
        },
      },
      { marco: "dos" },
    );
    expect(llamadas).toHaveLength(1);
    expect(consulta.fuentes[0]).toMatchObject({
      estado: "no_accesible",
      motivo: "requiere_sesion",
    });
  });
  it("un tipo que no es texto (PDF, zip, imagen) no se guarda", async () => {
    for (const tipo of ["application/pdf", "application/zip", "image/png"]) {
      const { consulta } = await filas(
        {
          "https://dos.test/docs/v2": { status: 200, tipo, cuerpo: "%PDF-1.7" },
        },
        { marco: "dos" },
      );
      expect(consulta.fuentes[0], tipo).toMatchObject({
        estado: "no_accesible",
        motivo: "http_otro",
      });
    }
    expect(readdirSyncSiExiste(path.join(raiz, CARPETA_DE_LECTURAS))).toEqual(
      [],
    );
  });
  it("JSON y XML sí son texto", async () => {
    for (const tipo of [
      "application/json",
      "application/xml",
      "text/markdown",
    ]) {
      const { consulta } = await filas(
        {
          "https://dos.test/docs/v2": { status: 200, tipo, cuerpo: '{"v":2}' },
        },
        { marco: "dos" },
      );
      expect(consulta.fuentes[0]!.estado, tipo).toBe("leida");
    }
  });
});

function readdirSyncSiExiste(ruta: string): string[] {
  try {
    return readdirSync(ruta);
  } catch {
    return [];
  }
}
