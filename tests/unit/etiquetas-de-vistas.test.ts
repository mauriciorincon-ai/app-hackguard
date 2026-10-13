// @vitest-environment node
// El vocabulario de las pantallas del catálogo, los controles y los marcos es dato (`datos/vistas/etiquetas.json`, reglas duras 10 y
// 12): el esquema exige cada etiqueta una vez, cada rol y cada marca existen, y los nombres cubren todo lo que el catálogo usa. Y vive
// fuera de la huella de la instantánea: cambiar un rótulo no cambia el catálogo.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EtiquetasDeVistas,
  IDS_DE_ETIQUETAS_DE_VISTAS,
} from "../../src/engine/catalogo/etiquetas-de-vistas.ts";
import {
  MADUREZ,
  REVISIONES_DE_CONTENIDO,
} from "../../src/engine/catalogo/esquemas.ts";
import {
  AGREGACION,
  ETIQUETAS_DE_VISTAS,
  MADUREZ as NOMBRES_DE_MADUREZ,
  REVISION,
} from "../../src/lib/catalogo/etiquetas.ts";
import { RAIZ } from "./propuestas/ayuda.ts";

const crudo = () =>
  JSON.parse(
    readFileSync(path.join(RAIZ, "datos/vistas/etiquetas.json"), "utf8"),
  ) as {
    nombres: Record<string, Record<string, unknown>>;
    etiquetas: Record<string, unknown>[];
  } & Record<string, unknown>;

describe("el vocabulario de las vistas", () => {
  it("el archivo cumple su esquema y trae cada etiqueta una vez", () => {
    const r = EtiquetasDeVistas.safeParse(crudo());
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    expect(Object.keys(ETIQUETAS_DE_VISTAS).sort()).toEqual(
      [...IDS_DE_ETIQUETAS_DE_VISTAS].sort(),
    );
  });

  it("el esquema rechaza una etiqueta que falta, una repetida, un rol inventado, un campo de más y otra versión", () => {
    const base = crudo();
    const con = (cambios: Record<string, unknown>) => ({ ...base, ...cambios });
    const falta = con({ etiquetas: base.etiquetas.slice(1) });
    const repetida = con({ etiquetas: [...base.etiquetas, base.etiquetas[0]] });
    const rol = con({
      etiquetas: base.etiquetas.map((e, i) =>
        i === 0 ? { ...e, rol: "rojo" } : e,
      ),
    });
    const demas = con({
      etiquetas: base.etiquetas.map((e, i) =>
        i === 0 ? { ...e, color: "#f00" } : e,
      ),
    });
    for (const [que, malo] of Object.entries({
      falta,
      repetida,
      rol,
      demas,
      version: con({ version: "2" }),
    }))
      expect(EtiquetasDeVistas.safeParse(malo).success, que).toBe(false);
  });

  it("los nombres cubren cada madurez, cada revisión de contenido y cada agregación que usa el catálogo", () => {
    for (const m of MADUREZ) expect(NOMBRES_DE_MADUREZ[m], m).toBeDefined();
    for (const r of REVISIONES_DE_CONTENIDO)
      expect(REVISION[r], r).toBeDefined();
    const usadas = new Set<string>();
    const recorrer = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const ruta = path.join(d, e.name);
        if (e.isDirectory()) recorrer(ruta);
        else
          for (const m of readFileSync(ruta, "utf8").matchAll(
            /"agregacion":\s*"([a-z_]+)"/g,
          ))
            usadas.add(m[1]!);
      }
    };
    recorrer(path.join(RAIZ, "datos/pruebas"));
    expect(usadas.size).toBeGreaterThan(0);
    for (const a of usadas) expect(AGREGACION[a], a).toBeDefined();
  });

  it("vive fuera de la huella de la instantánea: ni el catálogo ni sus carpetas lo leen", () => {
    const cargar = readFileSync(path.join(RAIZ, "src/cli/cargar.ts"), "utf8");
    expect(cargar).toContain('"datos/vistas"');
    const instantanea = readFileSync(
      path.join(RAIZ, "src/engine/catalogo/instantanea.ts"),
      "utf8",
    );
    expect(instantanea).not.toContain("vistas");
  });
});
