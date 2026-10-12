// @vitest-environment node
// Las etiquetas de estado de la bandeja son dato (regla dura 12: símbolo + texto + color, y el color es un rol que sale de
// `datos/propuestas/etiquetas.json` o del vocabulario de estados): el esquema exige cada etiqueta una vez, el vocabulario cubre todo lo
// que el motor puede decir (motivos de pausa, estados de fuente y de cita, estados de la bandeja), y ningún componente de la bandeja
// escribe un rol de color, un símbolo de estado o una etiqueta de estado a mano.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROLES, SIMBOLOS } from "../../../src/engine/catalogo/esquemas.ts";
import {
  ESTADOS_DE_CITA,
  ESTADOS_DE_FUENTE,
  MOTIVOS_DE_PAUSA,
} from "../../../src/engine/propuestas/esquemas.ts";
import {
  EtiquetasDePropuestas,
  IDS_DE_ETIQUETAS_DE_PROPUESTAS,
} from "../../../src/engine/propuestas/etiquetas.ts";
import { cargarEtiquetasDePropuestas } from "../../../src/lib/propuestas/cargar.ts";
import { etiquetaDePropuesta } from "../../../src/lib/propuestas/etiquetas.ts";
import { RAIZ } from "./ayuda.ts";

const datos = cargarEtiquetasDePropuestas(RAIZ);
const crudo = () =>
  JSON.parse(
    readFileSync(path.join(RAIZ, "datos/propuestas/etiquetas.json"), "utf8"),
  ) as { etiquetas: Record<string, unknown>[] };

describe("el vocabulario de la bandeja", () => {
  it("tiene cada etiqueta una vez, con su rol, su marca y su nombre en los dos idiomas", () => {
    expect(datos.etiquetas.map((e) => e.id).sort()).toEqual(
      [...IDS_DE_ETIQUETAS_DE_PROPUESTAS].sort(),
    );
    for (const e of datos.etiquetas) {
      expect(ROLES, e.id).toContain(e.rol);
      expect(SIMBOLOS, e.id).toContain(e.simbolo);
      expect(e.nombre.es.length, e.id).toBeGreaterThan(0);
      expect(e.nombre.en.length, e.id).toBeGreaterThan(0);
    }
  });
  it("nombra todo lo que el motor puede decir: motivos de la pausa, estados de fuente y de cita, y estados de la bandeja", () => {
    const ids = new Set<string>(IDS_DE_ETIQUETAS_DE_PROPUESTAS);
    for (const m of MOTIVOS_DE_PAUSA)
      expect(ids.has(`motivo_${m}`), m).toBe(true);
    for (const e of ESTADOS_DE_FUENTE)
      expect(ids.has(`fuente_${e}`), e).toBe(true);
    for (const e of ESTADOS_DE_CITA) expect(ids.has(`cita_${e}`), e).toBe(true);
    for (const e of ["por_decidir", "aprobada", "rechazada", "separada"])
      expect(ids.has(e), e).toBe(true);
  });
  it("lo que pide atención se marca con aviso; lo verificado, con «ok»; el símbolo nunca es el único canal", () => {
    const de = (id: Parameters<typeof etiquetaDePropuesta>[1]) =>
      etiquetaDePropuesta(datos, id);
    expect(de("fuente_verificada")).toMatchObject({
      rol: "positivo",
      simbolo: "ok",
    });
    expect(de("cita_verificada")).toMatchObject({
      rol: "positivo",
      simbolo: "ok",
    });
    for (const id of [
      "fuente_sin_fragmento",
      "cita_no_literal",
      "marcada_por_el_filtro",
      "motivo_marco_antiguo",
    ] as const)
      expect(de(id), id).toMatchObject({ rol: "atencion", simbolo: "aviso" });
    expect(de("propuesta_ilegible")).toMatchObject({
      rol: "falla",
      simbolo: "falla",
    });
  });
  it("pedir una etiqueta que no existe lanza, en los dos idiomas", () => {
    const sin = { ...datos, etiquetas: datos.etiquetas.slice(1) };
    expect(() => etiquetaDePropuesta(sin, datos.etiquetas[0]!.id)).toThrowError(
      /does not have/,
    );
  });
  it("el esquema rechaza una etiqueta que falta, una repetida, una que no existe y un campo de más", () => {
    const base = crudo();
    expect(
      EtiquetasDePropuestas.safeParse({
        ...base,
        etiquetas: base.etiquetas.slice(1),
      }).success,
    ).toBe(false);
    expect(
      EtiquetasDePropuestas.safeParse({
        ...base,
        etiquetas: [...base.etiquetas, base.etiquetas[0]],
      }).success,
    ).toBe(false);
    expect(
      EtiquetasDePropuestas.safeParse({
        ...base,
        etiquetas: [
          ...base.etiquetas,
          { ...base.etiquetas[0], id: "inventada" },
        ],
      }).success,
    ).toBe(false);
    expect(
      EtiquetasDePropuestas.safeParse({
        ...base,
        etiquetas: base.etiquetas.map((e, i) =>
          i === 0 ? { ...e, color: "#f00" } : e,
        ),
      }).success,
    ).toBe(false);
    expect(EtiquetasDePropuestas.safeParse(base).success).toBe(true);
  });
});

describe("ningún componente de la bandeja escribe un rol, un símbolo o una etiqueta de estado a mano (regla dura 12)", () => {
  const carpeta = path.join(RAIZ, "src/components/propuestas");
  const archivos = readdirSync(carpeta)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => path.join(carpeta, f));
  it("hay componentes que mirar", () => {
    expect(archivos.length).toBeGreaterThanOrEqual(1);
  });
  for (const f of archivos)
    it(`${path.relative(RAIZ, f)} solo usa roles y marcas que llegan de los datos`, () => {
      const texto = readFileSync(f, "utf8");
      const roles = [...texto.matchAll(/["'`\s]es-(?!\$\{)[a-z]+/g)].map((m) =>
        m[0].trim(),
      );
      expect(roles).toEqual([]);
      const marcas = [
        ...texto.matchAll(/\b(?:rol|simbolo)\s*[:=]\s*\{?\s*["'][a-z_]+["']/g),
      ].map((m) => m[0]);
      // La única excepción declarada: el aviso de «bandeja vacía» (estado de pantalla sin objeto), neutro y con la marca de vacío.
      expect(
        marcas.filter((m) => !/rol: "neutro"|simbolo: "vacio"/.test(m)),
      ).toEqual([]);
    });
});
