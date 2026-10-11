// @vitest-environment node
// El estado de error del catálogo: un catálogo inválido (fixture) se dice con la prueba y la razón en los dos idiomas. El
// build real sigue fallando cerrado —la pantalla lee solo una instantánea válida y con huella—: este estado se prueba aquí
// porque ningún catálogo del repo es inválido.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { validarCatalogo } from "../../src/engine/catalogo/validar.ts";
import { CatalogoConError } from "../../src/components/catalogo/estado-vacio";
import { rechazadasDe } from "../../src/lib/catalogo/rechazadas.ts";
import { catalogoReal, editar, fijar } from "./catalogo/ayuda.ts";

async function catalogoRoto() {
  const c = catalogoReal();
  const archivo = c.pruebas[0]!;
  editar(archivo, (p) => fijar(p, "version_marco", undefined));
  return { resultado: await validarCatalogo(c), ruta: archivo.ruta };
}

describe("el catálogo inválido se muestra con la prueba y la razón", () => {
  it("el catálogo real no tiene errores: no hay nada que rechazar", async () => {
    const r = await validarCatalogo(catalogoReal());
    expect(r.estado).not.toBe("invalido");
    expect(rechazadasDe(r.hallazgos)).toEqual([]);
  });

  it("una prueba que cita su marco sin versión sale en la lista, con su id y su razón en español e inglés", async () => {
    const { resultado, ruta } = await catalogoRoto();
    expect(resultado.estado).toBe("invalido");
    const rechazadas = rechazadasDe(resultado.hallazgos);
    expect(rechazadas.length).toBeGreaterThan(0);
    const id = ruta
      .split("/")
      .at(-1)!
      .replace(/\.json$/, "");
    expect(rechazadas.map((r) => r.id)).toContain(id);
    for (const r of rechazadas) {
      expect(r.razon.es.length).toBeGreaterThan(0);
      expect(r.razon.en.length).toBeGreaterThan(0);
    }
    const html = renderToStaticMarkup(
      <CatalogoConError rechazadas={rechazadas} />,
    );
    expect(html).toContain("El catálogo no se cargó");
    expect(html).toContain("The catalog did not load");
    expect(html).toContain(id);
    expect(html).toContain("es-falla");
    expect(html).toContain("Nada entra a medias");
  });

  it("solo los errores cuentan: una advertencia no impide cargar", async () => {
    const r = await validarCatalogo(catalogoReal());
    expect(r.hallazgos.some((h) => h.severidad === "advertencia")).toBe(true);
    expect(rechazadasDe(r.hallazgos)).toHaveLength(0);
  });
});
