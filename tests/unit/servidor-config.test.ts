// La maqueta se sirve por DOS servidores: Vercel (vercel.json, el preview que mira el usuario) y
// `serve` (serve.json: `pnpm start`, Playwright y Lighthouse). Si divergen, lo que la CI prueba deja de
// ser lo que el usuario abre. Este gate exige las mismas redirecciones de /diseno y las mismas cabeceras.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Cabecera = { key: string; value: string };
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const serve = JSON.parse(readFileSync("serve.json", "utf8"));

const redirecciones = (lista: { source: string; destination: string }[]) =>
  lista.map((r) => `${r.source} → ${r.destination}`).sort();
const cabeceras = (lista: { source: string; headers: Cabecera[] }[], fuente: string) =>
  lista.find((h) => h.source === fuente)?.headers ?? [];

describe("servidor: vercel.json y serve.json dicen lo mismo", () => {
  it("vercel.json no lleva claves que su esquema rechaza", () => {
    const admitidas = ["$schema", "redirects", "rewrites", "headers"];
    expect(Object.keys(vercel).filter((k) => !admitidas.includes(k))).toEqual([]);
  });

  it("mismas redirecciones de /diseno, y ambas entradas llegan al índice", () => {
    expect(redirecciones(serve.redirects)).toEqual(redirecciones(vercel.redirects));
    expect(redirecciones(vercel.redirects)).toEqual(["/diseno → /diseno/index.html", "/diseno/ → /diseno/index.html"]);
  });

  it("Vercel reescribe las páginas .html de la maqueta y serve no limpia sus URLs", () => {
    expect(vercel.rewrites).toEqual([{ source: "/diseno/:pagina.html", destination: "/diseno/:pagina" }]);
    expect(serve.cleanUrls).toEqual(["/!(diseno)", "/!(diseno)/**"]);
  });

  it("mismas cabeceras generales y la misma política de contenido para la maqueta", () => {
    expect(cabeceras(serve.headers, "**")).toEqual(cabeceras(vercel.headers, "/(.*)"));
    const politica = cabeceras(vercel.headers, "/diseno/(.*)");
    expect(cabeceras(serve.headers, "diseno/**")).toEqual(politica);
    expect(politica[0].value).toContain("script-src 'self'");
    expect(politica[0].value).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
