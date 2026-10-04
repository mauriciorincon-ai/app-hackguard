// Gate de COBERTURA DE FUENTE: todo carácter que la maqueta muestra existe en el subconjunto latino
// de las fuentes cargadas. Un carácter fuera (una flecha, un ≤, un ✓) se pintaría con la fuente de
// respaldo del sistema, distinta en cada dispositivo — por eso las marcas y los conectores son trazos
// SVG. El rango es el `unicode-range` del subconjunto latino de @fontsource (las dos familias
// declaran el mismo).
import { describe, expect, it } from "vitest";
import { documentoDe, leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const RANGOS: [number, number][] = [
  [0x0000, 0x00ff],
  [0x0131, 0x0131],
  [0x0152, 0x0153],
  [0x02bb, 0x02bc],
  [0x02c6, 0x02c6],
  [0x02da, 0x02da],
  [0x02dc, 0x02dc],
  [0x2000, 0x206f],
  [0x20ac, 0x20ac],
  [0x2122, 0x2122],
  [0x2191, 0x2191],
  [0x2193, 0x2193],
  [0x2212, 0x2212],
  [0x2215, 0x2215],
];
const cubierto = (c: string) => RANGOS.some(([a, b]) => c.codePointAt(0)! >= a && c.codePointAt(0)! <= b);

describe("maqueta: todo carácter visible existe en las fuentes cargadas", () => {
  it.each(paginasDe(RAIZ_MAQUETA))("%s", (pagina) => {
    const doc = documentoDe(leerPagina(RAIZ_MAQUETA, pagina));
    const atributos = [...doc.querySelectorAll("*")].flatMap((el) =>
      ["aria-label", "data-aria-label-es", "data-aria-label-en", "title"].map((a) => el.getAttribute(a) ?? ""),
    );
    const texto = [doc.body.textContent ?? "", doc.title, ...atributos].join("");
    const fuera = [...new Set([...texto].filter((c) => !cubierto(c)))];
    const codigos = fuera.map((c) => `${c} U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`);
    expect(codigos, `${pagina}: caracteres fuera de la cobertura de las fuentes`).toEqual([]);
  });
});
