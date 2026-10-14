// @vitest-environment node
// S9-E-M2 (regla dura 11): `datos/propuestas/licencias.json` dice qué deja citar la licencia de cada marco. Vive fuera de la huella de la
// instantánea, así que esta prueba lo ata al catálogo: cada marco está clasificado, y «solo_identificadores» coincide con lo que la licencia
// del propio marco exige. Un marco nuevo sin clasificar falla aquí antes de que nadie aporte o cite su texto.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cargarLicenciasDeMarcos } from "../../../src/lib/propuestas/cargar.ts";
import { instantanea, RAIZ } from "./ayuda.ts";

const licencias = cargarLicenciasDeMarcos(RAIZ).marcos;
const delCatalogo = instantanea.catalogo.marcos;
const deLosDatos = readdirSync(path.join(RAIZ, "datos/marcos"))
  .filter((a) => a.endsWith(".json"))
  .map(
    (a) =>
      JSON.parse(readFileSync(path.join(RAIZ, "datos/marcos", a), "utf8")) as {
        id: string;
      },
  );

describe("lo que la licencia de cada marco deja citar", () => {
  it("cada marco de la instantánea oficial y de datos/marcos está clasificado, y nada más", () => {
    const clasificados = Object.keys(licencias).sort();
    expect(
      clasificados,
      "clasifica la licencia del marco nuevo en datos/propuestas/licencias.json",
    ).toEqual(delCatalogo.map((m) => m.id).sort());
    expect(clasificados).toEqual(deLosDatos.map((m) => m.id).sort());
  });

  it.each(delCatalogo.map((m) => [m.id, m] as const))(
    "«%s»: «solo_identificadores» si y solo si su licencia exige solo identificadores",
    (id, marco) => {
      const exigeSoloIdentificadores =
        /solo identificadores/iu.test(marco.licencia.exige.es) &&
        /identifiers only/iu.test(marco.licencia.exige.en);
      expect(licencias[id] === "solo_identificadores", id).toBe(
        exigeSoloIdentificadores,
      );
    },
  );

  it("ISO/IEC 42001 es «solo_identificadores»", () => {
    expect(licencias["iso-iec-42001"]).toBe("solo_identificadores");
  });
});
