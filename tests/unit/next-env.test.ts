// @vitest-environment node
// Deuda del S10 (#11): `next build` reescribe `next-env.d.ts` y cada subida de next lo movía en silencio, dejando el árbol sucio tras un build.
// El archivo versionado debe ser EXACTAMENTE lo que el escritor de la versión instalada de next produce con la configuración de esta app:
// si una subida cambia el archivo, este test falla con el contenido nuevo y se confirma en el mismo commit que la subida.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "../..");
const requerir = createRequire(path.join(RAIZ, "package.json"));
const { writeAppTypeDeclarations } = requerir(
  "next/dist/lib/typescript/writeAppTypeDeclarations.js",
) as {
  writeAppTypeDeclarations: (o: {
    baseDir: string;
    distDir: string;
    imageImportsEnabled: boolean;
    hasPagesDir: boolean;
    hasAppDir: boolean;
    strictRouteTypes: boolean;
    typedRoutes: boolean;
  }) => Promise<void>;
};

describe("next-env.d.ts", () => {
  it("es lo que next escribe para esta app (App Router, imágenes sin optimizar, sin rutas tipadas)", async () => {
    const carpeta = mkdtempSync(path.join(tmpdir(), "hackguard-next-env-"));
    try {
      await writeAppTypeDeclarations({
        baseDir: carpeta,
        distDir: ".next",
        imageImportsEnabled: true,
        hasPagesDir: false,
        hasAppDir: true,
        strictRouteTypes: false,
        typedRoutes: false,
      });
      expect(readFileSync(path.join(RAIZ, "next-env.d.ts"), "utf8")).toBe(
        readFileSync(path.join(carpeta, "next-env.d.ts"), "utf8"),
      );
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });
});
