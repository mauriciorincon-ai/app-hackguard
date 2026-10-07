// @vitest-environment node
// El cargador del CLI: lo que no sabe leer lo dice, nombrando el archivo. Un archivo que no es UTF-8 detiene la
// carga; un BOM tiene su propio detalle; y lo que hay en `datos/` fuera de lo que el catálogo lee se lista para
// que el CLI lo avise.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { cargarCatalogo, noLeidos } from "../../../src/cli/cargar.ts";
import { validarCatalogo } from "../../../src/engine/catalogo/validar.ts";
import { catalogoBase } from "./ayuda.ts";

const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-cargar-"));
afterAll(() => rmSync(raiz, { recursive: true, force: true }));

function escribir(relativa: string, contenido: string | Uint8Array): void {
  const destino = path.join(raiz, relativa);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
}

describe("cargador del catálogo", () => {
  it("lista lo que hay en datos/ y no se lee, salvo lo oculto, lo privado y las instantáneas", () => {
    escribir("datos/familias.json", "{}");
    escribir("datos/herramientas/zap.json", "{}");
    escribir("datos/herramientas/viejas/zap.json", "{}");
    escribir("datos/marco/cwe.json", "{}");
    escribir("datos/pruebas/software/PR-SW-X-001.json", "{}");
    escribir("datos/pruebas/software/PR-SW-X-002.JSON", "{}");
    escribir("datos/pruebas/software/.DS_Store", "");
    escribir("datos/privado/sobre.json", "{}");
    escribir("datos/instantaneas/2026-10-05-abc.json", "{}");
    const entrada = cargarCatalogo(raiz);
    expect(noLeidos(raiz, entrada)).toEqual([
      "datos/herramientas/viejas/zap.json",
      "datos/marco/cwe.json",
      "datos/pruebas/software/PR-SW-X-002.JSON",
    ]);
  });

  it("un archivo que no es UTF-8 detiene la carga nombrando el archivo", () => {
    const otra = mkdtempSync(path.join(tmpdir(), "hackguard-ansi-"));
    try {
      mkdirSync(path.join(otra, "datos/herramientas"), { recursive: true });
      writeFileSync(
        path.join(otra, "datos/herramientas/ansi.json"),
        Uint8Array.from([0x7b, 0xe9, 0x7d]),
      );
      expect(() => cargarCatalogo(otra)).toThrow(
        /^datos\/herramientas\/ansi\.json: no es UTF-8 válido/,
      );
    } finally {
      rmSync(otra, { recursive: true, force: true });
    }
  });

  it("un JSON con BOM es inválido y el hallazgo dice por qué, en los dos idiomas", async () => {
    const c = catalogoBase();
    const cwe = c.marcos.find((a) => a.ruta === "datos/marcos/cwe.json");
    if (cwe === undefined) throw new Error("falta cwe.json");
    cwe.texto = `﻿${cwe.texto}`;
    const r = await validarCatalogo(c);
    const h = r.hallazgos.find(
      (x) => x.regla === "archivo/json-invalido" && x.ruta === cwe.ruta,
    );
    expect(h?.detalle?.es).toContain("BOM");
    expect(h?.detalle?.en).toContain("BOM");
  });
});
