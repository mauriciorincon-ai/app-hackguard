// @vitest-environment node
// kit v1.39.0 — lo que el proveedor publica no es lo que el build escribe (Big-D S2, S2-AUD-32). El gate compara la
// carpeta publicada con `out/` página por página y falla con una carpeta vacía, una página de más o de menos y una
// página distinta en un byte. Demo en rojo: cada `it` de abajo con una diferencia ES el rojo; la primera es el verde.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { esExportEstatico } from "../../scripts/build-como-proveedor.mjs";
import { fallasDePaquetePublico, fallasDeSalida } from "../../scripts/verificar-salida-publicada.mjs";

const raices: string[] = [];
function arbol(paginas: Record<string, string>): string {
  const raiz = mkdtempSync(join(tmpdir(), "salida-"));
  raices.push(raiz);
  for (const [ruta, html] of Object.entries(paginas)) {
    mkdirSync(join(raiz, ruta, ".."), { recursive: true });
    writeFileSync(join(raiz, ruta), html);
  }
  return raiz;
}
afterEach(() => {
  for (const r of raices.splice(0)) rmSync(r, { recursive: true, force: true });
});

const SITIO = { "index.html": "<html>a</html>", "es/atlas/index.html": "<html>b</html>" };

describe("salida publicada = out, página por página", () => {
  it("pasa cuando cada página publicada es idéntica a la de out", () => {
    expect(fallasDeSalida(arbol(SITIO), arbol(SITIO))).toEqual({ paginas: 2, fallas: [] });
  });
  it("rojo: una página publicada difiere en un byte (la CSP que el inyector no escribió)", () => {
    const pub = arbol({ ...SITIO, "es/atlas/index.html": "<html>B</html>" });
    const r = fallasDeSalida(pub, arbol(SITIO));
    expect(r.fallas).toEqual(["es/atlas/index.html: distinta de la de " + raices[1] + " (14 vs 14 bytes)"]);
  });
  it("rojo: una página de out no se publica, o se publica una que out no tiene", () => {
    expect(fallasDeSalida(arbol({ "index.html": "<html>a</html>" }), arbol(SITIO)).fallas).toEqual([
      "es/atlas/index.html: está en " + raices[1] + " y no se publica",
    ]);
    expect(fallasDeSalida(arbol({ ...SITIO, "extra.html": "x" }), arbol(SITIO)).fallas).toEqual([
      "extra.html: se publica y no está en " + raices[3],
    ]);
  });
  it("rojo: una carpeta publicada vacía o inexistente no demuestra nada", () => {
    expect(fallasDeSalida(arbol({}), arbol(SITIO)).fallas[0]).toMatch(/no tiene páginas/);
    expect(fallasDeSalida(join(tmpdir(), "no-existe-salida"), arbol(SITIO)).fallas[0]).toMatch(/no existe/);
  });
  it("solo aplica al perfil estático: lee output: \"export\" en next.config", () => {
    expect(esExportEstatico((f) => (f === "next.config.ts" ? 'const c = { output: "export" };' : null))).toBe(true);
    expect(esExportEstatico((f) => (f === "next.config.ts" ? "const c = { reactStrictMode: true };" : null))).toBe(false);
    expect(esExportEstatico(() => null)).toBe(false);
  });
});

describe("el paquete público no lleva la maqueta ni lo privado (ED-7)", () => {
  it("pasa con un sitio sin diseno/ ni privado/", () => {
    expect(fallasDePaquetePublico(arbol(SITIO))).toEqual({ archivos: 2, fallas: [] });
  });
  it("rojo: la maqueta (diseno/) viaja en el paquete", () => {
    const r = fallasDePaquetePublico(arbol({ ...SITIO, "diseno/index.html": "<html>m</html>", "diseno/assets/app.css": "x" }));
    expect(r.fallas).toEqual([
      "diseno/assets/app.css: el paquete público no lleva «diseno/»",
      "diseno/index.html: el paquete público no lleva «diseno/»",
    ]);
  });
  it("rojo: lo privado viaja, a cualquier profundidad", () => {
    const r = fallasDePaquetePublico(arbol({ ...SITIO, "datos/privado/activos/a.json": "{}" }));
    expect(r.fallas).toEqual(["datos/privado/activos/a.json: el paquete público no lleva «privado/»"]);
  });
  it("rojo: un paquete vacío o inexistente no demuestra nada", () => {
    expect(fallasDePaquetePublico(arbol({})).fallas[0]).toMatch(/no tiene archivos/);
    expect(fallasDePaquetePublico(join(tmpdir(), "no-existe-paquete")).fallas[0]).toMatch(/no existe/);
  });
  it("el comando falla (1) con la maqueta y pasa (0) sin ella", () => {
    const comando = (carpeta: string) =>
      spawnSync(process.execPath, ["scripts/verificar-salida-publicada.mjs", "--publico", carpeta], { encoding: "utf8" });
    expect(comando(arbol(SITIO)).status).toBe(0);
    const malo = comando(arbol({ ...SITIO, "diseno/index.html": "x" }));
    expect(malo.status).toBe(1);
    expect(malo.stderr).toContain("el paquete público no lleva «diseno/»");
    expect(comando("").status).toBe(2);
  });
});
