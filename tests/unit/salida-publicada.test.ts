// @vitest-environment node
// kit v1.39.0 — lo que el proveedor publica no es lo que el build escribe (Big-D S2, S2-AUD-32). El gate compara la
// carpeta publicada con `out/` página por página y falla con una carpeta vacía, una página de más o de menos y una
// página distinta en un byte. Demo en rojo: cada `it` de abajo con una diferencia ES el rojo; la primera es el verde.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { esExportEstatico } from "../../scripts/build-como-proveedor.mjs";
import { fallasDeSalida } from "../../scripts/verificar-salida-publicada.mjs";

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
