// @vitest-environment node
// D12 · la capa propia de controles. Tres promesas: (1) la capa de la norma no cambia (su huella JCS está fijada: cambiarla es
// una decisión, no un efecto de agregar una capa propia); (2) una capa propia es una vista APARTE: no altera los controles
// ISO ni sus estados, y su estado sale del menos favorable de los controles ISO a los que apunta; (3) una capa propia
// privada (`datos/privado/`) jamás entra a la instantánea pública.
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { cargarCatalogo } from "../../../src/cli/cargar.ts";
import {
  brechaDeCapasPropias,
  peorEstado,
  referenciaDeControl,
} from "../../../src/engine/brecha/propios.ts";
import type { EstadoDeControl } from "../../../src/engine/brecha/esquemas.ts";
import { huella } from "../../../src/engine/huella.ts";
import { CapaDeControles } from "../../../src/engine/catalogo/esquemas.ts";

const RAIZ = process.cwd();
const leer = (r: string) => JSON.parse(readFileSync(join(RAIZ, r), "utf8"));

/** La huella JCS + SHA-256 de `datos/controles/iso42001-anexo-a.json` (fijada en el S13, sin cambio desde el S1). */
const HUELLA_ISO =
  "149fe14a6f0d8e20df04cfac3a3045d5f319743d20d80c5e4a65e5a73789be0f";

const iso = CapaDeControles.parse(
  leer("datos/controles/iso42001-anexo-a.json"),
);
const propia = CapaDeControles.parse(
  leer("datos/controles/propios/org-demo.json"),
);

describe("la capa de la norma no cambia", () => {
  it("su huella es la fijada", async () => {
    expect(await huella(leer("datos/controles/iso42001-anexo-a.json"))).toBe(
      HUELLA_ISO,
    );
  });

  it("agregar la capa propia deja intacta la capa por defecto que carga el catálogo", () => {
    const capas = cargarCatalogo(RAIZ).controles.map(
      (a) => JSON.parse(a.texto) as { id: string; capa: string },
    );
    expect(capas.map((c) => c.capa).sort()).toEqual(["por_defecto", "propia"]);
    expect(capas.find((c) => c.capa === "por_defecto")).toEqual(
      leer("datos/controles/iso42001-anexo-a.json"),
    );
  });
});

describe("el estado de un control propio sale de los controles ISO a los que apunta", () => {
  const estadoDe = (
    ...pares: [string, EstadoDeControl][]
  ): ReadonlyMap<string, EstadoDeControl> => new Map(pares);
  const iso4 = referenciaDeControl("iso42001-A.6.2.4");

  it("la referencia es la del marco", () => {
    expect(iso4).toBe("A.6.2.4");
    expect(referenciaDeControl("iso42001-A.10.3")).toBe("A.10.3");
  });

  it("el peor estado gana: de menos a más favorable", () => {
    expect(peorEstado(["con_evidencia_vigente", "con_fallas"])).toBe(
      "con_fallas",
    );
    expect(peorEstado(["con_evidencia_vigente", "evidencia_antigua"])).toBe(
      "evidencia_antigua",
    );
    expect(peorEstado([])).toBe("sin_evidencia");
  });

  it("toma el menos favorable de los controles ISO aplicables", () => {
    const apuntados = propia.areas
      .flatMap((a) => a.controles)
      .flatMap((c) => c.controles_equivalentes)
      .map((e) => e.referencia_en_marco);
    const idsIso = apuntados.map(
      (r) =>
        iso.areas
          .flatMap((a) => a.controles)
          .find((c) => referenciaDeControl(c.id) === r)!.id,
    );
    const mapa = estadoDe(
      ...idsIso.map((id, n): [string, EstadoDeControl] => [
        id,
        n === 0 ? "con_fallas" : "con_evidencia_vigente",
      ]),
    );
    const [salida] = brechaDeCapasPropias([propia], iso, mapa);
    expect(salida!.capa).toBe("org-demo");
    const primero = salida!.controles.find((c) =>
      c.apunta.some((a) => a.id === idsIso[0]),
    )!;
    expect(primero.estado).toBe("con_fallas");
    expect(primero.sinAplicables).toBe(false);
  });

  it("sin ningún control ISO aplicable el estado es sin_evidencia y lo dice", () => {
    const [salida] = brechaDeCapasPropias([propia], iso, estadoDe());
    for (const c of salida!.controles) {
      expect(c.estado).toBe("sin_evidencia");
      expect(c.sinAplicables).toBe(true);
      expect(c.apunta.every((a) => a.estado === null)).toBe(true);
    }
  });

  it("no toca los controles ISO ni su mapa de estados", () => {
    const antes = JSON.stringify(iso);
    const mapa = estadoDe(["iso42001-A.6.2.4", "con_fallas"]);
    const mapaAntes = JSON.stringify([...mapa]);
    brechaDeCapasPropias([propia], iso, mapa);
    expect(JSON.stringify(iso)).toBe(antes);
    expect(JSON.stringify([...mapa])).toBe(mapaAntes);
  });

  it("solo procesa capas propias: la capa por defecto no sale como capa propia", () => {
    expect(brechaDeCapasPropias([iso], iso, estadoDe())).toEqual([]);
  });
});

describe("una capa propia privada no entra a la instantánea pública", () => {
  const temporal = mkdtempSync(join(tmpdir(), "hg-propios-"));
  afterAll(() => rmSync(temporal, { recursive: true, force: true }));

  it("el catálogo no lee datos/privado/", () => {
    cpSync(join(RAIZ, "datos"), join(temporal, "datos"), {
      recursive: true,
      filter: (origen) => !origen.includes("/datos/instantaneas"),
    });
    const privada = { ...propia, id: "org-privada" };
    mkdirSync(join(temporal, "datos/privado/controles/propios"), {
      recursive: true,
    });
    writeFileSync(
      join(temporal, "datos/privado/controles/propios/org-privada.json"),
      JSON.stringify(privada),
    );
    const ids = cargarCatalogo(temporal).controles.map(
      (a) => (JSON.parse(a.texto) as { id: string }).id,
    );
    expect(ids).not.toContain("org-privada");
    expect(ids).toContain("org-demo");
  });
});
