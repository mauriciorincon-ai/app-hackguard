// Carga los umbrales de la brecha. Se ejecuta en el build (Node), jamás en el navegador.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EtiquetasDeBrecha,
  UmbralesDeBrecha,
} from "../../engine/brecha/esquemas.ts";
import { SemillasDeCierre } from "../../engine/instrumento/esquemas.ts";

export const cargarUmbralesDeBrecha = (
  raiz: string = process.cwd(),
): UmbralesDeBrecha =>
  UmbralesDeBrecha.parse(
    JSON.parse(readFileSync(join(raiz, "datos/brecha/umbrales.json"), "utf8")),
  );

export const cargarEtiquetasDeBrecha = (
  raiz: string = process.cwd(),
): EtiquetasDeBrecha =>
  EtiquetasDeBrecha.parse(
    JSON.parse(readFileSync(join(raiz, "datos/brecha/etiquetas.json"), "utf8")),
  );

/** Las semillas de la validación del instrumento (C18): el kit de prueba del repo, comprobado contra su esquema. */
export const cargarSemillasDeCierre = (
  raiz: string = process.cwd(),
): SemillasDeCierre =>
  SemillasDeCierre.parse(
    JSON.parse(
      readFileSync(
        join(raiz, "docs/kit-de-prueba/semillas-de-cierre/semillas.json"),
        "utf8",
      ),
    ),
  );
