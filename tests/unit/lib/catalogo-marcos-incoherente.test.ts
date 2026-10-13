// @vitest-environment node
// La vista de marcos se apoya en el semáforo del mismo catálogo; si no coinciden (un marco sin su fila de vigencia), el error dice QUÉ
// marco falta en vez de reventar con «undefined» (S3-B4: antes era un `find(...)!`).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import { propuestasSinAvisos } from "./mundo-de-brecha";

vi.mock("../../../src/lib/catalogo/vista.ts", async (original) => {
  const real =
    await original<typeof import("../../../src/lib/catalogo/vista.ts")>();
  return {
    ...real,
    semaforoDe: (...args: Parameters<typeof real.semaforoDe>) => {
      const s = real.semaforoDe(...args);
      return { ...s, marcos: s.marcos.slice(1) };
    },
  };
});
const { construirVistaDeMarcos } =
  await import("../../../src/lib/catalogo/marcos.ts");

const RAIZ = join(__dirname, "..", "..", "..");
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
const snap = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;

describe("una vista de marcos con un semáforo que no cubre a todos", () => {
  it("nombra el marco que falta, en los dos idiomas", () => {
    const faltante = snap.catalogo.marcos[0]!.id;
    expect(() =>
      construirVistaDeMarcos(
        snap,
        archivo.replace(/\.json$/, ""),
        snap.fecha_evaluacion,
        [],
        propuestasSinAvisos,
      ),
    ).toThrow(
      new RegExp(
        `«${faltante}» no está en la instantánea / is not in the snapshot`,
      ),
    );
  });
});
