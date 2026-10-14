// @vitest-environment node
// Gate de `docs/brochure-export.json` (contrato 1.0.0 de la vitrina de hoja-de-vida): el export valida contra el esquema
// del lado que lo lee, las cifras que se pueden re-derivar del repo coinciden con el repo, y no promete lo que no existe.
// Las cifras de pruebas automáticas salen de una corrida y no se re-derivan aquí: las cita su `detalle`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REGLAS } from "../../src/engine/catalogo/reglas.ts";
import {
  brochureExportSchema,
  versionCompatible,
} from "./lib/brochure-export-schema.ts";

const RAIZ = process.cwd();
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");
const exportado = JSON.parse(leer("docs/brochure-export.json"));
// Contrato de la ficha técnica de CV Viva (app-hoja-de-vida): copia literal, como el esquema del export (ver el último test).
const contratoFicha = JSON.parse(
  leer("tests/unit/lib/ficha-tecnica.schema.json"),
);
const datos = brochureExportSchema.parse(exportado);
const metrica = (clave: string) =>
  datos.metricas.find((m) => m.clave === clave)!;
const archivos = (carpeta: string) =>
  readdirSync(join(RAIZ, carpeta), { recursive: true })
    .map(String)
    .filter((n) => n.endsWith(".json"));

describe("docs/brochure-export.json", () => {
  it("valida contra el esquema de la vitrina y su formato es de un mayor que la vitrina renderiza", () => {
    expect(brochureExportSchema.safeParse(exportado).success).toBe(true);
    expect(versionCompatible(datos.schema_version)).toBe(true);
  });

  it("lleva las cinco métricas obligatorias, con clave única y una fuente cada una", () => {
    const claves = datos.metricas.map((m) => m.clave);
    for (const obligatoria of [
      "funcionalidades",
      "pruebas_en_el_catalogo",
      "controles_iso_42001",
      "pruebas_automaticas",
      "costo_operacion_mensual",
    ]) {
      expect(claves, obligatoria).toContain(obligatoria);
    }
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("la versión del repo es la de package.json y el brochure aún no está sellado", () => {
    expect(datos.app.version_repo).toBe(
      JSON.parse(leer("package.json")).version,
    );
    expect(datos.app.estado).toBe("inicial");
    expect(datos.app.sellado_en).toBeNull();
    expect(datos.app.slug).toBe("hackguard");
  });

  it("cada funcionalidad cita una sección que existe en el manual, y los ids no se repiten", () => {
    const manual = leer("docs/MANUAL-DE-USO.md");
    const ids: string[] = [];
    for (const grupo of datos.funcionalidades.grupos) {
      for (const f of grupo.features) {
        ids.push(f.id);
        expect(manual, f.id).toContain(`#### ${f.seccion_manual}\n`);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(metrica("funcionalidades").valor).toBe(datos.funcionalidades.total);
  });

  it("el total de funcionalidades es el de sus grupos, y entre todas cubren cada sección del manual", () => {
    const features = datos.funcionalidades.grupos.flatMap((g) => g.features);
    expect(datos.funcionalidades.total).toBe(features.length);
    const secciones = new Set(features.map((f) => f.seccion_manual));
    const delManual = [
      ...leer("docs/MANUAL-DE-USO.md").matchAll(
        /^#### (.+ · desde Sprint \d{3})$/gm,
      ),
    ].map((m) => m[1]);
    // El manual en inglés repite las secciones con otro título: las del español son las que el export cita.
    const delEspanol = delManual.filter((t) => !t.includes("since"));
    for (const s of delEspanol) expect(secciones.has(s!), s).toBe(true);
  });

  it("las cifras destacadas del complemento de la vitrina son claves del export (cuando la planeadora está en esta máquina)", () => {
    const complemento = join(
      process.env.HOME ?? "",
      "Code/hr01-develop-ai-apps/vitrina/apps/hackguard.complemento.yaml",
    );
    if (!existsSync(complemento)) return;
    const m = /^cifras_destacadas: \[(.+)\]$/m.exec(
      readFileSync(complemento, "utf8"),
    );
    expect(m, "el complemento no declara cifras_destacadas").not.toBeNull();
    const claves = m![1]!.split(",").map((c) => c.trim());
    for (const c of claves)
      expect(
        datos.metricas.map((x) => x.clave),
        c,
      ).toContain(c);
  });

  it("las cifras que el repo permite re-derivar coinciden con el repo", () => {
    const pruebas = archivos("datos/pruebas");
    expect(metrica("pruebas_en_el_catalogo").valor).toBe(pruebas.length);
    expect(metrica("fichas_de_prueba").valor).toBe(pruebas.length);
    expect(metrica("marcos_de_referencia").valor).toBe(
      readdirSync(join(RAIZ, "datos", "marcos")).filter((n) =>
        n.endsWith(".json"),
      ).length,
    );
    expect(metrica("herramientas").valor).toBe(
      archivos("datos/herramientas").length,
    );
    expect(metrica("reglas_del_validador").valor).toBe(
      Object.keys(REGLAS).length,
    );
    const anexo = JSON.parse(leer("datos/controles/iso42001-anexo-a.json"));
    expect(metrica("controles_iso_42001").valor).toBe(
      anexo.areas.reduce(
        (n: number, a: { controles: unknown[] }) => n + a.controles.length,
        0,
      ),
    );
    const conjunto = JSON.parse(
      leer("docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json"),
    );
    expect(metrica("casos_del_clasificador_demo").valor).toBe(
      conjunto.casos.length,
    );
  });

  it("cabe en la ficha técnica de CV Viva: tagline ≤ 80, intro y para_quien ≤ 400, cada detalle ≤ 400", () => {
    // Topes del contrato publicado por app-hoja-de-vida (docs/contrato-ficha-tecnica/ficha-tecnica.schema.json): la
    // ficha no se arma, y el build de CV Viva falla, si un texto lo pasa. CV Viva no edita este archivo: se acorta aquí.
    // `diferencial` no viaja a la ficha y no tiene tope.
    const largos: [string, string, number][] = [
      ["tagline", datos.promesa.tagline, 80],
      ["intro", datos.promesa.intro, 400],
      ["para_quien", datos.promesa.para_quien, 400],
      ...datos.metricas.map((m): [string, string, number] => [
        `detalle de ${m.clave}`,
        m.detalle,
        400,
      ]),
    ];
    const pasados = largos
      .filter(([, texto, tope]) => texto.length > tope)
      .map(([campo, texto, tope]) => `${campo} (${texto.length} > ${tope})`);
    expect(pasados).toEqual([]);
  });

  it("el stack cabe en la ficha técnica de CV Viva: piezas y textos dentro de los topes del contrato copiado", () => {
    // Los topes salen de la copia del contrato, no se fijan aquí. La ficha admite de 1 a 8 piezas: un export con 10 no se arma,
    // aunque cada texto quepa (S9, arreglo del H-1).
    const { minItems, maxItems, items } = contratoFicha.properties.stack;
    const { nombre, papel } = items.properties;
    expect(
      datos.stack.length,
      `stack: ${datos.stack.length} piezas; la ficha admite de ${minItems} a ${maxItems}`,
    ).toBeGreaterThanOrEqual(minItems);
    expect(
      datos.stack.length,
      `stack: ${datos.stack.length} piezas; la ficha admite de ${minItems} a ${maxItems}`,
    ).toBeLessThanOrEqual(maxItems);
    const largos = datos.stack.flatMap((p) => [
      ...(p.nombre.length > nombre.maxLength
        ? [`nombre «${p.nombre}» (${p.nombre.length} > ${nombre.maxLength})`]
        : []),
      ...(p.papel.length > papel.maxLength
        ? [`papel de «${p.nombre}» (${p.papel.length} > ${papel.maxLength})`]
        : []),
    ]);
    expect(largos).toEqual([]);
  });

  it("las pruebas automáticas son la suma de sus dos partes", () => {
    expect(metrica("pruebas_automaticas").valor).toBe(
      metrica("pruebas_unitarias").valor + metrica("pruebas_e2e").valor,
    );
  });

  it("ningún texto del export publica una dirección de producción, de preview o de otro sitio", () => {
    const texto = JSON.stringify({ ...exportado, _schema: undefined });
    expect(texto).not.toMatch(/https?:\/\//i);
    expect(texto).not.toMatch(/vercel[.]app|workers[.]dev|pages[.]dev/i);
    expect(datos.enlaces.produccion).toBeNull();
    expect(datos.enlaces.repositorio).toBeNull();
  });

  it("el esquema copiado es el de la vitrina (cuando la vitrina está en esta máquina)", () => {
    const original = join(
      process.env.HOME ?? "",
      "Code/app-hoja-de-vida/src/lib/vitrina/schemas.ts",
    );
    if (!existsSync(original)) return;
    const cuerpo = (s: string) =>
      s.replace(/^\/\/.*\n/gm, "").replace(/[\s,;()]/g, "");
    expect(cuerpo(leer("tests/unit/lib/brochure-export-schema.ts"))).toBe(
      cuerpo(readFileSync(original, "utf8")),
    );
  });

  it("la copia del contrato de la ficha es la de app-hoja-de-vida, byte a byte (cuando está en esta máquina)", () => {
    const original = join(
      process.env.HOME ?? "",
      "Code/app-hoja-de-vida/docs/contrato-ficha-tecnica/ficha-tecnica.schema.json",
    );
    if (!existsSync(original)) return;
    expect(leer("tests/unit/lib/ficha-tecnica.schema.json")).toBe(
      readFileSync(original, "utf8"),
    );
  });
});
