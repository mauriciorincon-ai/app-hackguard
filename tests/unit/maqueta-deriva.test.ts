// Gate de DERIVA de la maqueta (regla 22): las páginas de docs/diseno/ son SALIDA del generador
// versionado (scripts/maqueta/). Si alguien edita un HTML a mano, o cambia el generador o sus datos
// sin regenerar, este test lo nombra. Corre el generador hacia un temporal y compara byte a byte.
import { rmSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { generarEnTemporal, leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const salida = generarEnTemporal();
afterAll(() => rmSync(salida, { recursive: true, force: true }));

describe("maqueta: docs/diseno/ = salida del generador", () => {
  it("el generador produce exactamente las páginas versionadas", () => {
    expect(paginasDe(salida)).toEqual(paginasDe(RAIZ_MAQUETA));
    expect(paginasDe(RAIZ_MAQUETA).length).toBeGreaterThan(0);
  });

  it.each(paginasDe(RAIZ_MAQUETA))("%s no se editó a mano", (pagina) => {
    const igual = leerPagina(RAIZ_MAQUETA, pagina) === leerPagina(salida, pagina);
    expect(igual, `${pagina}: difiere de lo que genera scripts/maqueta (corre «pnpm maqueta»)`).toBe(true);
  });
});
