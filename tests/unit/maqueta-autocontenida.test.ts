// Gate de AUTOCONTENCIÓN: la maqueta no pide nada a la red. Ni CDNs, ni fuentes remotas, ni llamadas
// desde su JS. «Autocontenida» = HTML + assets/ relativos del propio repo.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { RAIZ_MAQUETA } from "./lib/maqueta";

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

const RED = [
  {
    que: "recurso remoto en src/href",
    patron: /\b(?:src|href|action|poster)\s*=\s*["'](?:https?:)?\/\//i,
  },
  { que: "url() remota en CSS", patron: /url\(\s*["']?(?:https?:)?\/\//i },
  {
    que: "@import remoto",
    patron: /@import\s+(?:url\()?["']?(?:https?:)?\/\//i,
  },
  {
    que: "llamada de red desde JS",
    patron:
      /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b/,
  },
  {
    que: "imagen remota en srcset",
    patron: /\bsrcset\s*=\s*["'][^"']*(?:https?:)?\/\//i,
  },
  {
    que: "redirección con meta refresh",
    patron: /<meta[^>]+http-equiv\s*=\s*["']?refresh/i,
  },
  { que: "import() remoto", patron: /\bimport\s*\(\s*["'](?:https?:)?\/\//i },
];

const servidos = archivos(RAIZ_MAQUETA).filter((ruta) =>
  /\.(html|css|js|svg)$/.test(ruta),
);

describe("maqueta: cero red", () => {
  it("hay archivos que verificar", () =>
    expect(servidos.length).toBeGreaterThan(0));

  it.each(servidos.map((ruta) => relative(RAIZ_MAQUETA, ruta)))(
    "%s no pide nada a la red",
    (nombre) => {
      const texto = readFileSync(join(RAIZ_MAQUETA, nombre), "utf8");
      for (const { que, patron } of RED) {
        expect(patron.test(texto), `${nombre}: ${que}`).toBe(false);
      }
    },
  );
});
