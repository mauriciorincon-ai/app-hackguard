// @vitest-environment node
// Lo que entra al extractor y quién puede decidir: el texto pegado solo se lee de dos carpetas (el kit de prueba y las entradas de una
// persona), se guarda con permisos 600 y por su huella; y decidir una propuesta lo hace una persona en su terminal, nunca una sesión.
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  huellaDeTexto,
  normalizarEspacios,
} from "../../../src/engine/propuestas/citas.ts";
import { puedeDecidir } from "../../../src/lib/propuestas/frontera.ts";
import {
  leerTextoPegado,
  MAXIMO_DE_TEXTO,
} from "../../../src/lib/propuestas/leer.ts";
import {
  ANCHO_DE_LINEA,
  envolver,
  guardarLectura,
} from "../../../src/lib/propuestas/lecturas.ts";

const temporales: string[] = [];
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);
const raizTemporal = () => {
  const d = mkdtempSync(path.join(tmpdir(), "hackguard-leer-"));
  temporales.push(d);
  for (const c of [
    "docs/kit-de-prueba",
    "propuestas/entradas",
    "datos/privado",
  ])
    mkdirSync(path.join(d, c), { recursive: true });
  return d;
};
const escribir = (
  raiz: string,
  relativa: string,
  contenido: string | Buffer,
) => {
  writeFileSync(path.join(raiz, relativa), contenido);
  return relativa;
};

describe("el texto pegado solo se lee de dos carpetas", () => {
  it("lee un texto del kit de prueba y uno de las entradas de una persona", () => {
    const raiz = raizTemporal();
    const a = leerTextoPegado(
      raiz,
      escribir(raiz, "docs/kit-de-prueba/a.txt", "uno dos"),
    );
    const b = leerTextoPegado(
      raiz,
      escribir(raiz, "propuestas/entradas/b.txt", "tres"),
    );
    expect(a).toEqual({
      ok: true,
      texto: "uno dos",
      ruta: "docs/kit-de-prueba/a.txt",
    });
    expect(b.ok && b.ruta).toBe("propuestas/entradas/b.txt");
  });
  it("no lee nada de datos/privado ni de ninguna otra carpeta, ni con rutas que se escapan", () => {
    const raiz = raizTemporal();
    escribir(raiz, "datos/privado/real.txt", "salida de un activo real");
    escribir(raiz, "otro.txt", "x");
    for (const intento of [
      "datos/privado/real.txt",
      "otro.txt",
      "docs/kit-de-prueba/../../datos/privado/real.txt",
      "propuestas/entradas/../../otro.txt",
    ]) {
      const r = leerTextoPegado(raiz, intento);
      expect(r.ok, intento).toBe(false);
      expect(!r.ok && r.motivo, intento).toContain("solo se lee de");
    }
  });
  it("un enlace simbólico dentro de la carpeta permitida no saca a otra carpeta", () => {
    const raiz = raizTemporal();
    escribir(raiz, "datos/privado/real.txt", "salida de un activo real");
    symlinkSync(
      path.join(raiz, "datos/privado/real.txt"),
      path.join(raiz, "propuestas/entradas/enlace.txt"),
    );
    const r = leerTextoPegado(raiz, "propuestas/entradas/enlace.txt");
    expect(r.ok).toBe(false);
  });
  it("rechaza lo que no existe, una carpeta, lo vacío, lo binario, lo que no es UTF-8 y lo demasiado grande", () => {
    const raiz = raizTemporal();
    const motivo = (ruta: string) => {
      const r = leerTextoPegado(raiz, ruta);
      return r.ok ? "ok" : r.motivo;
    };
    expect(motivo("docs/kit-de-prueba/no-existe.txt")).toContain("no existe");
    expect(motivo("docs/kit-de-prueba")).toContain("no es un archivo");
    expect(
      motivo(escribir(raiz, "docs/kit-de-prueba/vacio.txt", "  \n ")),
    ).toContain("vacío");
    expect(
      motivo(escribir(raiz, "docs/kit-de-prueba/nul.txt", "a\u0000b")),
    ).toContain("no es texto");
    expect(
      motivo(
        escribir(
          raiz,
          "docs/kit-de-prueba/latin.txt",
          Buffer.from([0xff, 0xfe, 0x41]),
        ),
      ),
    ).toContain("UTF-8");
    expect(
      motivo(
        escribir(
          raiz,
          "docs/kit-de-prueba/grande.txt",
          "x".repeat(MAXIMO_DE_TEXTO + 1),
        ),
      ),
    ).toContain("máximo");
  });
});

describe("guardar lo leído", () => {
  it("guarda el texto normalizado con su huella por nombre, la carpeta 700 y el archivo 600", async () => {
    const raiz = raizTemporal();
    const huella = await guardarLectura(raiz, "uno\n\n  dos\t tres ");
    expect(huella).toBe(await huellaDeTexto("uno dos tres"));
    const archivo = path.join(raiz, "propuestas/.lecturas", `${huella}.txt`);
    expect(readFileSync(archivo, "utf8")).toBe("uno dos tres");
    expect(statSync(archivo).mode & 0o777).toBe(0o600);
    expect(statSync(path.dirname(archivo)).mode & 0o777).toBe(0o700);
  });
  it("lo guardado se lee por líneas, y su huella sigue siendo la del texto normalizado", async () => {
    const raiz = raizTemporal();
    const largo = Array.from({ length: 400 }, (_, i) => `palabra${i}`).join(
      " ",
    );
    const huella = await guardarLectura(raiz, largo);
    const guardado = readFileSync(
      path.join(raiz, "propuestas/.lecturas", `${huella}.txt`),
      "utf8",
    );
    const lineas = guardado.split("\n");
    expect(lineas.length).toBeGreaterThan(20);
    expect(lineas.every((l) => l.length <= ANCHO_DE_LINEA)).toBe(true);
    expect(guardado.length).toBe(largo.length);
    expect(await huellaDeTexto(guardado)).toBe(huella);
  });
  it("envolver solo cambia espacios por saltos: nunca agrega ni quita un carácter, y una palabra más larga que el ancho queda entera", () => {
    const texto = `a ${"x".repeat(150)} b c`;
    const envuelto = envolver(texto, 20);
    expect(normalizarEspacios(envuelto)).toBe(texto);
    expect(envuelto.split("\n")).toEqual(["a", "x".repeat(150), "b c"]);
  });
  it("dos copias que solo difieren en los espacios son la misma lectura", async () => {
    const raiz = raizTemporal();
    expect(await guardarLectura(raiz, "a b")).toBe(
      await guardarLectura(raiz, "a\n b "),
    );
  });
});

describe("decidir lo hace una persona en su terminal", () => {
  const repo = "/repo";
  const sesion = { CLAUDECODE: "1" };
  it("dentro de una sesión de Claude Code, sobre el repositorio real, se niega", () => {
    const r = puedeDecidir({ raiz: repo, repo, env: sesion, tty: true });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivo).toContain("sesión de Claude Code");
  });
  it("la presencia de la variable basta, aunque esté vacía, y también las que empiezan por CLAUDE_CODE_", () => {
    expect(
      puedeDecidir({ raiz: repo, repo, env: { CLAUDECODE: "" }, tty: true }).ok,
    ).toBe(false);
    expect(
      puedeDecidir({
        raiz: repo,
        repo,
        env: { CLAUDE_CODE_ENTRYPOINT: "cli" },
        tty: true,
      }).ok,
    ).toBe(false);
  });
  it("sin terminal interactiva se niega", () => {
    const r = puedeDecidir({ raiz: repo, repo, env: {}, tty: false });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivo).toContain("terminal interactiva");
  });
  it("una persona en su terminal pasa", () => {
    expect(
      puedeDecidir({ raiz: repo, repo, env: { HOME: "/x" }, tty: true }),
    ).toEqual({ ok: true });
  });
  it("sobre una raíz temporal (pruebas, kit de prueba) no aplica", () => {
    expect(
      puedeDecidir({ raiz: raizTemporal(), repo, env: sesion, tty: false }),
    ).toEqual({ ok: true });
  });
});
