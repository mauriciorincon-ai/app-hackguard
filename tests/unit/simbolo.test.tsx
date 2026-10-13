// @vitest-environment node
// Las marcas del design system: el dibujo de cada símbolo (`FORMAS`, en `simbolo.tsx`) y el vocabulario que el esquema acepta
// (`SIMBOLOS`, en el motor) son DOS listas; una marca que el esquema acepta y nadie dibuja rompe la pantalla en el navegador.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SIMBOLOS as DEL_ESQUEMA } from "../../src/engine/catalogo/esquemas.ts";
import { SIMBOLOS as DIBUJADOS, Simbolo } from "../../src/components/simbolo";

describe("las marcas de estado", () => {
  it("se dibujan exactamente las que el esquema acepta", () => {
    expect([...DIBUJADOS].sort()).toEqual([...DEL_ESQUEMA].sort());
  });

  it.each([...DEL_ESQUEMA])(
    "«%s» se dibuja como un trazo SVG, jamás como un carácter",
    (nombre) => {
      const html = renderToStaticMarkup(<Simbolo nombre={nombre} />);
      expect(html).toMatch(/^<svg[^>]*aria-hidden="true"/);
      expect(html).toMatch(/<(path|circle|rect|g)\b/);
    },
  );

  it("una marca que no existe lanza, nombrándola", () => {
    expect(() => renderToStaticMarkup(<Simbolo nombre="inventada" />)).toThrow(
      /inventada/,
    );
  });
});
