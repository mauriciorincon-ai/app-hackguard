// @vitest-environment node
// Las instantáneas versionadas en `datos/instantaneas/` (RF-01.7): cada una es autoconsistente. Su huella
// es la de su contenido, su nombre es su fecha más los 12 primeros caracteres de su huella, y sus bytes son
// los que escribe el CLI (nadie la reformateó ni la editó a mano). No se exige que coincida con el catálogo
// de hoy: una instantánea es un registro de lo que el catálogo era en su fecha.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FORMATO_DE_INSTANTANEA,
  huellaDeInstantanea,
  nombreDeInstantanea,
  type Instantanea,
} from "../../../src/engine/catalogo/instantanea.ts";
import { RAIZ } from "./ayuda.ts";

const CARPETA = path.join(RAIZ, "datos", "instantaneas");
const archivos = readdirSync(CARPETA)
  .filter((n) => n.endsWith(".json"))
  .sort();

describe("las instantáneas versionadas", () => {
  it("existe al menos una (la primera oficial nace en el S1)", () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos)(
    "%s: su huella es la de su contenido y su nombre lleva su fecha y su huella",
    async (nombre) => {
      const texto = readFileSync(path.join(CARPETA, nombre), "utf8");
      const instantanea = JSON.parse(texto) as Instantanea;
      const { huella, ...cuerpo } = instantanea;
      expect(instantanea.formato).toBe(FORMATO_DE_INSTANTANEA);
      expect(await huellaDeInstantanea(cuerpo)).toBe(huella);
      expect(nombre).toBe(
        nombreDeInstantanea(instantanea.fecha_evaluacion, huella),
      );
      expect(texto).toBe(`${JSON.stringify(instantanea, null, 2)}\n`);
    },
  );
});
