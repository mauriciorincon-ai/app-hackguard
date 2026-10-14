import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Cabeceras } from "../../src/components/cabeceras";

describe("Cabeceras", () => {
  it("pinta una cabecera de columna por rótulo, en los dos idiomas", () => {
    const { container } = render(
      <table>
        <Cabeceras
          columnas={[
            { es: "Marco", en: "Framework" },
            { es: "Versión", en: "Version" },
          ]}
        />
      </table>,
    );
    const ths = [...container.querySelectorAll("thead tr th")];
    expect(ths).toHaveLength(2);
    expect(ths.every((t) => t.getAttribute("scope") === "col")).toBe(true);
    expect(ths[0]!.textContent).toContain("Marco");
    expect(ths[0]!.textContent).toContain("Framework");
  });
});
