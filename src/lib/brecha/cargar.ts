// Carga los umbrales de la brecha. Se ejecuta en el build (Node), jamás en el navegador.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UmbralesDeBrecha } from "../../engine/brecha/esquemas.ts";

export const cargarUmbralesDeBrecha = (
  raiz: string = process.cwd(),
): UmbralesDeBrecha =>
  UmbralesDeBrecha.parse(
    JSON.parse(readFileSync(join(raiz, "datos/brecha/umbrales.json"), "utf8")),
  );
