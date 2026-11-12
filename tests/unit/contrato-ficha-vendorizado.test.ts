// @vitest-environment node
// El contrato de la ficha técnica de CV Viva vive vendorizado en `datos/contratos/ficha-tecnica/` con su versión y su huella:
// un cambio de bytes sin cambio de versión falla aquí (default (i) del S13). Se lee en solo lectura; nada se escribe fuera.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { huella } from "../../src/engine/huella.ts";

const RAIZ = process.cwd();
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");
const contrato = JSON.parse(leer("datos/contratos/ficha-tecnica/contrato.json"));
const bytes = leer(`datos/contratos/ficha-tecnica/${contrato.archivo}`);

describe("contrato de la ficha técnica vendorizado", () => {
  it("el nombre del archivo lleva la versión declarada", () => {
    expect(contrato.archivo).toBe(`${contrato.version}.schema.json`);
    expect(contrato.version).toMatch(/^1\.\d+\.\d+$/);
  });

  it("los bytes coinciden con la huella de bytes declarada: si cambian, cambia la versión", () => {
    const sha = createHash("sha256").update(bytes).digest("hex");
    expect(sha).toBe(contrato.sha256_bytes);
  });

  it("la huella JCS del esquema coincide con la declarada", async () => {
    expect(await huella(JSON.parse(bytes))).toBe(contrato.huella_jcs);
  });

  it("no cita enlaces ni hosts externos", () => {
    expect(leer("datos/contratos/ficha-tecnica/contrato.json")).not.toMatch(
      /https?:\/\//i,
    );
  });
});
