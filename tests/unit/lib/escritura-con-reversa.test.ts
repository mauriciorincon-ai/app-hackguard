// @vitest-environment node
// Si un renombrado falla a mitad de `escribirDatosJuntos`, los archivos que ya se movieron vuelven a lo que eran y no queda ningún temporal
// (auditoría S9, B4: un sobre confirmado sin su hallazgo es un libro a medias). El fallo se fuerza sustituyendo `renameSync` por uno que
// falla en la segunda llamada: un fallo real de disco no se puede pedir.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({ llamadas: 0, fallarEn: 0 }));
vi.mock("node:fs", async (importar) => {
  const real = await importar<typeof import("node:fs")>();
  return {
    ...real,
    renameSync: (de: string, a: string) => {
      estado.llamadas += 1;
      if (estado.llamadas === estado.fallarEn)
        throw new Error("el disco se llenó");
      return real.renameSync(de, a);
    },
  };
});
const { escribirDatosJuntos } =
  await import("../../../src/lib/evidencia/cargar-evidencia.ts");

const temporales: string[] = [];
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);
const raizConDatos = () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-reversa-"));
  temporales.push(raiz);
  mkdirSync(path.join(raiz, "datos/privado/a"), { recursive: true });
  writeFileSync(path.join(raiz, "datos/privado/a/uno.json"), "viejo-uno");
  return raiz;
};
const intentar = (raiz: string) => {
  estado.llamadas = 0;
  estado.fallarEn = 2;
  return () =>
    escribirDatosJuntos(raiz, [
      {
        relativa: "datos/privado/a/uno.json",
        contenido: "nuevo-uno",
        privado: true,
      },
      {
        relativa: "datos/privado/b/dos.json",
        contenido: "nuevo-dos",
        privado: true,
      },
    ]);
};

describe("un renombrado que falla a mitad devuelve lo ya movido (S9-E-B4)", () => {
  it("el primero vuelve a su contenido anterior, el segundo no existe y no queda un temporal", () => {
    const raiz = raizConDatos();
    expect(intentar(raiz)).toThrow("el disco se llenó");
    expect(
      readFileSync(path.join(raiz, "datos/privado/a/uno.json"), "utf8"),
    ).toBe("viejo-uno");
    expect(existsSync(path.join(raiz, "datos/privado/b/dos.json"))).toBe(false);
    expect(readdirSync(path.join(raiz, "datos/privado/a"))).toEqual([
      "uno.json",
    ]);
    expect(readdirSync(path.join(raiz, "datos/privado/b"))).toEqual([]);
  });
  it("un archivo que no existía antes se borra al devolver, no se queda con el contenido nuevo", () => {
    const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-reversa-"));
    temporales.push(raiz);
    estado.llamadas = 0;
    estado.fallarEn = 2;
    expect(() =>
      escribirDatosJuntos(raiz, [
        { relativa: "datos/privado/a/uno.json", contenido: "1", privado: true },
        { relativa: "datos/privado/b/dos.json", contenido: "2", privado: true },
      ]),
    ).toThrow("el disco se llenó");
    expect(existsSync(path.join(raiz, "datos/privado/a/uno.json"))).toBe(false);
  });
});
