// Gate del BUNDLE del design system (regla 16): design-sync/ deriva de design-system.md y de la maqueta, y lo
// versionado tiene que ser exactamente lo que genera scripts/design-sync/generar.mjs: ni una tarjeta editada a
// mano ni una que sobre. Cada tarjeta abre con su línea @dsCard (sin ella Claude Design no la indexa), no pide
// nada a la red ni a otro archivo y no repite un id entre sus dos copias; project.json lleva el destino y el
// registro, nunca una credencial. Regenerar: `pnpm design-sync:bundle`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { archivosDelBundle } from "../../scripts/design-sync/generar.mjs";

const BUNDLE = "design-sync";
const archivos: Record<string, string> = archivosDelBundle();
const tarjetas = Object.entries(archivos).filter(([ruta]) =>
  ruta.startsWith("components/"),
);

const enDisco = (dir: string): string[] =>
  readdirSync(join(BUNDLE, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? enDisco(join(dir, e.name)) : [join(dir, e.name)],
  );

describe("design-sync/: el bundle del design system", () => {
  it.each(Object.keys(archivos))("%s está al día con el generador", (ruta) => {
    const disco = join(BUNDLE, ruta);
    expect(
      existsSync(disco),
      `${disco} no existe (corre «pnpm design-sync:bundle»)`,
    ).toBe(true);
    expect(
      readFileSync(disco, "utf8") === archivos[ruta],
      `${disco} difiere de lo que genera scripts/design-sync (corre «pnpm design-sync:bundle»)`,
    ).toBe(true);
  });

  it("no sobra ninguna tarjeta que el generador ya no produce", () => {
    expect(enDisco("components").sort()).toEqual(
      tarjetas.map(([ruta]) => ruta).sort(),
    );
  });

  it.each(tarjetas.map(([ruta]) => ruta))(
    "%s: abre con @dsCard, no pide nada de fuera y trae los dos temas",
    (ruta) => {
      const html = archivos[ruta];
      expect(html.split("\n")[0]).toMatch(
        /^<!-- @dsCard group="[^"]+" name="[^"]+" -->$/,
      );
      expect(html).not.toMatch(/<(script|link|img|iframe|object)\b/);
      expect(html).not.toMatch(/\burl\(/);
      expect(html).not.toMatch(/\b(src|href)="(?!#)/);
      expect(html).toContain('data-theme="oscuro" data-idioma="es"');
      expect(html).toContain('data-theme="claro" data-idioma="en"');
      const ids = [...html.matchAll(/(?<![\w-])id="([^"]+)"/g)].map(
        (m) => m[1],
      );
      expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    },
  );

  it("project.json lleva el destino y el registro, nunca una credencial", () => {
    const proyecto = JSON.parse(
      readFileSync(join(BUNDLE, "project.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(Object.keys(proyecto)).toEqual(
      expect.arrayContaining([
        "projectId",
        "name",
        "publishedFiles",
        "lastPublished",
      ]),
    );
    for (const clave of Object.keys(proyecto))
      expect(clave).not.toMatch(/token|key|secret|clave|password/i);
  });
});
