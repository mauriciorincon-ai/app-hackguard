// Utilidades de los gates de FIDELIDAD de una pantalla contra su página de la maqueta (docs/diseno/<pagina>.html): el mismo
// molde que tests/unit/fidelidad-catalogo.test.tsx, para que cada pantalla nueva lo use sin copiarlo. «español|inglés» de
// un elemento que lleva sus dos idiomas en spans con `lang`.
import { documentoDe } from "./maqueta";

export const par = (el: Element): string =>
  `${el.querySelector('[lang="es"]')?.textContent?.trim() ?? ""}|${el.querySelector('[lang="en"]')?.textContent?.trim() ?? ""}`;

/** El conjunto (sin repetidos, ordenado) de los pares de los elementos que cumplen el selector, menos los exceptuados. */
export const conjunto = (
  doc: Document,
  selector: string,
  ignorar: ReadonlySet<string> = new Set(),
): string[] =>
  [...new Set([...doc.querySelectorAll(selector)].map(par))]
    .filter((p) => !ignorar.has(p))
    .sort();

export const dentroDe = (selector: string): string =>
  `.hg-principal ${selector}`;

/** El HTML de un componente de servidor, envuelto como la maqueta envuelve su contenido, listo para consultar. */
export const documentoDelProducto = (html: string): Document =>
  documentoDe(`<body><main class='hg-principal'>${html}</main></body>`);
