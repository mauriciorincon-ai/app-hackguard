import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

/** Escribe un derivado solo si cambió (su nombre no lleva la huella, así que se compara el contenido). */
export function escribir(ruta: string, contenido: string, modo: number) {
  if (!existsSync(ruta) || readFileSync(ruta, "utf8") !== contenido)
    writeFileSync(ruta, contenido, { mode: modo });
  // Un archivo que ya existía conserva su modo: se fija el que corresponde (regla 17-bis).
  chmodSync(ruta, modo);
}
