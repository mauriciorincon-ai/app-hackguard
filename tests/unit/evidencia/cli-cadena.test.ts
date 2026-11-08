// @vitest-environment node
// `pnpm hallazgo:cadena`: la cadena de un hallazgo en la terminal, la misma que dibuja la pantalla (una cuenta, un cálculo). Solo lee el
// repo (los hallazgos demo): no escribe nada. Un hallazgo reabierto muestra sus ocho eslabones, con la reapertura en su lugar.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./ayuda.ts";

const cadena = (args: string[]) => {
  const r = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      path.join(RAIZ, "src/cli/evidencia.ts"),
      "hallazgo-cadena",
      ...args,
    ],
    { cwd: RAIZ, encoding: "utf8" },
  );
  return { codigo: r.status, salida: r.stdout, errores: r.stderr };
};

describe("hallazgo-cadena", () => {
  it("HZ-0011 reabierto: ocho eslabones, el quinto es la reapertura y lo que falta sale por hacer", () => {
    const r = cadena(["HZ-0011", "--fecha", "2026-10-08"]);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("8 eslabones · reabierto 1 vez");
    expect(r.salida).toContain(
      "5. Reabierto por una re-prueba que volvió a fallar",
    );
    expect(r.salida).toContain("Deshizo el cierre del 2026-09-25 (SOB-0038).");
    expect(r.salida).toContain("6. [por hacer] Corrección pendiente");
    expect(r.salida).toContain("8. [por hacer] Sin cerrar");
  });

  it("en inglés y en JSON dicen lo mismo, y un hallazgo que nunca se reabrió sigue con cuatro eslabones", () => {
    const en = cadena(["HZ-0011", "--fecha", "2026-10-08", "--idioma", "en"]);
    expect(en.salida).toContain("8 links · reopened 1 time");
    expect(en.salida).toContain("5. Reopened by a re-test that failed again");
    const json = JSON.parse(
      cadena(["HZ-0011", "--fecha", "2026-10-08", "--json"]).salida,
    );
    expect(json).toMatchObject({
      id: "HZ-0011",
      estado: "reabierto",
      reaperturas: 1,
      eslabones: 8,
    });
    const viejo = JSON.parse(
      cadena(["HZ-0003", "--fecha", "2026-10-08", "--json"]).salida,
    );
    expect(viejo).toMatchObject({ reaperturas: 0, eslabones: 4 });
  });

  it("un hallazgo que no existe, o sin fecha, es un error de uso (3) y no imprime una cadena", () => {
    const r = cadena(["HZ-9999", "--fecha", "2026-10-08"]);
    expect(r.codigo).toBe(3);
    expect(r.salida).toBe("");
    expect(r.errores).toContain("HZ-9999");
    expect(cadena(["HZ-0011"]).codigo).toBe(3);
  });

  it("el listado de hallazgos dice la reapertura y no la cuenta como una re-prueba que «no cierra»", () => {
    const r = spawnSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        path.join(RAIZ, "src/cli/evidencia.ts"),
        "hallazgos-listar",
        "--fecha",
        "2026-10-08",
      ],
      { cwd: RAIZ, encoding: "utf8" },
    );
    expect(r.stdout).toContain(
      "HZ-0011 · Reabierto: volvió a fallar · sigue contando como falla del control",
    );
    expect(r.stdout).toContain(
      "reabierto el 2026-10-01 por la re-prueba SOB-0039, que volvió a fallar (deshizo el cierre de SOB-0038)",
    );
    expect(r.stdout).not.toContain("SOB-0039 no cierra");
  });
});
