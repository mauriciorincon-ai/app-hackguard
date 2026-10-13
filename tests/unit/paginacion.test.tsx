// La paginación de la lista (S3-M4, WCAG 2.4.3): al llegar a un extremo el botón pulsado se desactiva, y el foco pasa al otro en vez
// de caer al <body>.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Paginacion } from "../../src/components/catalogo/paginacion";

afterEach(cleanup);

function Lista({ total, inicial = 1 }: { total: number; inicial?: number }) {
  const [actual, setActual] = useState(inicial);
  return (
    <Paginacion
      actual={actual}
      total={total}
      desde={(actual - 1) * 20 + 1}
      hasta={actual * 20}
      cuenta={total * 20}
      irA={setActual}
    />
  );
}
const anterior = () => screen.getByRole("button", { name: /Anterior/ });
const siguiente = () => screen.getByRole("button", { name: /Siguiente/ });

describe("Paginacion", () => {
  it("al llegar a la última página el foco pasa a «Anterior»", () => {
    render(<Lista total={2} />);
    siguiente().focus();
    fireEvent.click(siguiente());
    expect((siguiente() as HTMLButtonElement).disabled).toBe(true);
    expect(document.activeElement).toBe(anterior());
  });

  it("al volver a la primera página el foco pasa a «Siguiente»", () => {
    render(<Lista total={2} inicial={2} />);
    anterior().focus();
    fireEvent.click(anterior());
    expect((anterior() as HTMLButtonElement).disabled).toBe(true);
    expect(document.activeElement).toBe(siguiente());
  });

  it("en una página del medio el foco se queda en el botón que se pulsó", () => {
    render(<Lista total={3} />);
    siguiente().focus();
    fireEvent.click(siguiente());
    expect(document.activeElement).toBe(siguiente());
  });

  it("con una sola página la navegación está oculta", () => {
    const { container } = render(<Lista total={1} />);
    expect(container.querySelector("nav")!.hidden).toBe(true);
  });
});
