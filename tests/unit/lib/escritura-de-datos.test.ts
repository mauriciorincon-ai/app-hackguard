// @vitest-environment node
// Cómo escribe la app lo que guarda (regla 17-bis, auditorías del S5 y del S6): lo privado nunca queda en una carpeta más abierta que su
// archivo, aunque la carpeta ya existiera con otro modo, y varios archivos que van juntos se escriben todos o ninguno.
import {
  chmodSync,
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
  escribirDato,
  escribirDatosJuntos,
} from "../../../src/lib/evidencia/cargar-evidencia.ts";

const temporales: string[] = [];
const carpeta = () => {
  const d = mkdtempSync(path.join(tmpdir(), "hackguard-escritura-"));
  temporales.push(d);
  return d;
};
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);
const modo = (ruta: string) => statSync(ruta).mode & 0o777;

describe("lo privado nace y queda en carpetas 0700 (S5-5)", () => {
  it("corrige una carpeta privada que ya existía abierta, y también la de arriba", () => {
    const raiz = carpeta();
    const dir = path.join(raiz, "datos/privado/evidencia");
    mkdirSync(dir, { recursive: true });
    chmodSync(path.join(raiz, "datos/privado"), 0o755);
    chmodSync(dir, 0o755);
    escribirDato(raiz, "datos/privado/evidencia/SOB-1.json", "{}", true);
    expect(modo(dir)).toBe(0o700);
    expect(modo(path.join(raiz, "datos/privado"))).toBe(0o700);
    expect(modo(path.join(dir, "SOB-1.json"))).toBe(0o600);
  });
  it("lo público no se cierra: su carpeta conserva su modo", () => {
    const raiz = carpeta();
    const dir = path.join(raiz, "datos/evidencia/demo");
    mkdirSync(dir, { recursive: true });
    chmodSync(dir, 0o755);
    escribirDato(raiz, "datos/evidencia/demo/SOB-1.json", "{}", false);
    expect(modo(dir)).toBe(0o755);
    expect(modo(path.join(dir, "SOB-1.json"))).toBe(0o644);
  });
});

describe("varios archivos que van juntos se escriben todos o ninguno (S5-4a, S6-B14c)", () => {
  it("escribe todos cuando todos se pueden", () => {
    const raiz = carpeta();
    escribirDatosJuntos(raiz, [
      { relativa: "datos/privado/a/uno.json", contenido: "1", privado: true },
      { relativa: "datos/privado/b/dos.json", contenido: "2", privado: true },
    ]);
    expect(
      readFileSync(path.join(raiz, "datos/privado/a/uno.json"), "utf8"),
    ).toBe("1");
    expect(
      readFileSync(path.join(raiz, "datos/privado/b/dos.json"), "utf8"),
    ).toBe("2");
    expect(modo(path.join(raiz, "datos/privado/b/dos.json"))).toBe(0o600);
  });
  it("si uno falla, no cambia ninguno y no deja un archivo temporal", () => {
    const raiz = carpeta();
    mkdirSync(path.join(raiz, "datos/privado"), { recursive: true });
    // Un archivo donde el segundo necesita una carpeta: no se puede crear.
    writeFileSync(path.join(raiz, "datos/privado/bloqueo"), "archivo");
    expect(() =>
      escribirDatosJuntos(raiz, [
        { relativa: "datos/privado/a/uno.json", contenido: "1", privado: true },
        {
          relativa: "datos/privado/bloqueo/dos.json",
          contenido: "2",
          privado: true,
        },
      ]),
    ).toThrow();
    expect(existsSync(path.join(raiz, "datos/privado/a/uno.json"))).toBe(false);
    expect(readdirSync(path.join(raiz, "datos/privado/a"))).toEqual([]);
  });
});
