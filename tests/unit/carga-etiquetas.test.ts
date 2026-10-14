// @vitest-environment node
// Las etiquetas de estado de la carga son dato (regla dura 12: símbolo + texto + color, y el color es un rol que sale de
// `datos/evidencia/etiquetas-de-carga.json`): el esquema exige cada etiqueta una vez y su versión. Que ningún componente escriba un
// rol de color a mano lo vigila `etiquetas-en-componentes.test.ts`, para todas las pantallas.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROLES, SIMBOLOS } from "../../src/engine/catalogo/esquemas.ts";
import {
  EtiquetasDeCarga,
  IDS_DE_ETIQUETAS_DE_CARGA,
} from "../../src/engine/lotes/esquemas.ts";
import { cargarEtiquetasDeCarga } from "../../src/lib/evidencia/cargar-evidencia.ts";
import { RAIZ } from "./evidencia/ayuda.ts";

const datos = cargarEtiquetasDeCarga(RAIZ);
const crudo = () =>
  JSON.parse(
    readFileSync(
      path.join(RAIZ, "datos/evidencia/etiquetas-de-carga.json"),
      "utf8",
    ),
  ) as { etiquetas: Record<string, unknown>[] };

describe("el vocabulario de la carga", () => {
  it("tiene cada etiqueta una vez, con su rol, su marca y su nombre en los dos idiomas", () => {
    expect(datos.etiquetas.map((e) => e.id).sort()).toEqual(
      [...IDS_DE_ETIQUETAS_DE_CARGA].sort(),
    );
    for (const e of datos.etiquetas) {
      expect(ROLES, e.id).toContain(e.rol);
      expect(SIMBOLOS, e.id).toContain(e.simbolo);
      expect(e.nombre.es.length, e.id).toBeGreaterThan(0);
      expect(e.nombre.en.length, e.id).toBeGreaterThan(0);
    }
  });

  it("el esquema rechaza una etiqueta que falta, una repetida, una que no existe y un campo de más", () => {
    const base = crudo();
    const falta = { ...base, etiquetas: base.etiquetas.slice(1) };
    expect(EtiquetasDeCarga.safeParse(falta).success).toBe(false);
    const repetida = {
      ...base,
      etiquetas: [...base.etiquetas, base.etiquetas[0]],
    };
    expect(EtiquetasDeCarga.safeParse(repetida).success).toBe(false);
    const ajena = {
      ...base,
      etiquetas: [...base.etiquetas, { ...base.etiquetas[0], id: "inventada" }],
    };
    expect(EtiquetasDeCarga.safeParse(ajena).success).toBe(false);
    const demas = {
      ...base,
      etiquetas: base.etiquetas.map((e, i) =>
        i === 0 ? { ...e, color: "#f00" } : e,
      ),
    };
    expect(EtiquetasDeCarga.safeParse(demas).success).toBe(false);
    expect(EtiquetasDeCarga.safeParse(base).success).toBe(true);
  });
});

describe("el archivo de etiquetas de la carga", () => {
  it("el esquema fija la versión del formato: otra versión se rechaza", () => {
    const base = crudo();
    expect(datos.version).toBe("1");
    expect(EtiquetasDeCarga.safeParse({ ...base, version: "2" }).success).toBe(
      false,
    );
  });

  it("cada archivo de etiquetas declara su versión y su nota en los dos idiomas (la nota es su documentación, no un campo de pantalla)", () => {
    // Se recorren los archivos que hay, no una lista: un archivo de etiquetas nuevo entra solo a esta comprobación (S9-E-B7).
    const archivos = readdirSync(path.join(RAIZ, "datos"), { recursive: true })
      .map((n) => `datos/${String(n)}`)
      .filter(
        (n) =>
          /(^|\/)etiquetas[^/]*\.json$/.test(n) &&
          !n.startsWith("datos/privado/"),
      )
      .sort();
    expect(archivos.length).toBeGreaterThan(0);
    for (const f of archivos) {
      const d = JSON.parse(readFileSync(path.join(RAIZ, f), "utf8")) as {
        version: string;
        nota: { es: string; en: string };
      };
      expect(d.version, f).toBe("1");
      expect(d.nota.es.length, f).toBeGreaterThan(20);
      expect(d.nota.en.length, f).toBeGreaterThan(20);
      // Redactada en cada idioma, no copiada de uno al otro.
      expect(d.nota.en, f).not.toBe(d.nota.es);
    }
  });
});
