// @vitest-environment node
// Listar hallazgos jamás esconde en silencio los que no se pudieron situar (S5-4b): salen aparte, con su motivo.
import { describe, expect, it } from "vitest";
import { situarParaListar } from "../../../src/lib/evidencia/situar.ts";
import { mundo } from "../evidencia/ayuda.ts";

describe("situarParaListar", () => {
  it("separa los hallazgos que se situaron de los que no, con su motivo", async () => {
    const m = await mundo();
    const libro = Object.values(m.sobres);
    const buenos = Object.values(m.hallazgos);
    const roto = {
      ...structuredClone(buenos[0]!),
      id: "HZ-9999",
      sobre_origen: "SOB-9999",
    };
    const { situaciones, omitidos } = situarParaListar(
      [...buenos, roto],
      libro,
      {
        escala: m.escala,
        plazos: m.plazos,
        fecha: "2026-10-12",
      },
    );
    expect(situaciones).toHaveLength(buenos.length);
    expect(omitidos).toEqual([
      {
        id: "HZ-9999",
        motivo: "sobre_origen_inexistente",
        detalle: "SOB-9999",
      },
    ]);
  });
});
