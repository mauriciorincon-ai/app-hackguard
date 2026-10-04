// Gate BILINGÜE de la maqueta (regla 20): todo texto visible existe en español y en inglés. Un texto
// suelto (sin lang) es un texto que solo se redactó en un idioma. Lo que no cambia con el idioma
// —identificadores, fechas, huellas, nombres propios— se marca data-neutro, a la vista en el HTML.
import { describe, expect, it } from "vitest";
import { documentoDe, leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const ATRIBUTOS_DE_TEXTO = ["aria-label", "title", "placeholder", "alt"];
const TIENE_PALABRA = /\p{L}{2,}/u;

describe("maqueta: todo texto en los dos idiomas", () => {
  for (const pagina of paginasDe(RAIZ_MAQUETA)) {
    const doc = documentoDe(leerPagina(RAIZ_MAQUETA, pagina));

    it(`${pagina}: ningún texto visible fuera de un par es/en`, () => {
      const sueltos: string[] = [];
      const caminante = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
      for (let nodo = caminante.nextNode(); nodo; nodo = caminante.nextNode()) {
        const texto = nodo.textContent ?? "";
        if (!TIENE_PALABRA.test(texto)) continue;
        const padre = nodo.parentElement!;
        // OJO: <html lang> no cuenta — con él, todo texto de la página «tendría idioma» y el gate no
        // podría fallar (así nació: su primera demo en rojo salió verde).
        if (padre.closest("body [lang], body[lang], [data-neutro], option[data-es][data-en], script, style")) continue;
        sueltos.push(texto.trim().slice(0, 60));
      }
      expect(sueltos, `${pagina}: texto sin idioma declarado`).toEqual([]);
    });

    it(`${pagina}: cada texto en español tiene su texto en inglés al lado`, () => {
      for (const es of doc.body.querySelectorAll('[lang="es"]')) {
        const en = es.nextElementSibling;
        const quien = es.outerHTML.slice(0, 80);
        expect(en?.getAttribute("lang"), `${pagina}: falta el inglés junto a ${quien}`).toBe("en");
        expect((en?.textContent ?? "").trim().length, `${pagina}: inglés vacío junto a ${quien}`).toBeGreaterThan(0);
      }
      const ingles = doc.body.querySelectorAll('[lang="en"]').length;
      expect(ingles).toBe(doc.body.querySelectorAll('[lang="es"]').length);
    });

    it(`${pagina}: cada opción de una lista lleva sus dos idiomas, y arranca en español`, () => {
      for (const opcion of doc.querySelectorAll("option:not([data-neutro])")) {
        const quien = opcion.outerHTML.slice(0, 80);
        expect(opcion.getAttribute("data-es"), `${pagina}: opción sin español → ${quien}`).toBeTruthy();
        expect(opcion.getAttribute("data-en"), `${pagina}: opción sin inglés → ${quien}`).toBeTruthy();
        expect(opcion.textContent, `${pagina}: la opción no arranca en español → ${quien}`).toBe(opcion.getAttribute("data-es"));
      }
    });

    it(`${pagina}: título y atributos de texto con sus dos idiomas`, () => {
      const titulo = doc.querySelector("title")!;
      expect(titulo.getAttribute("data-es"), `${pagina}: <title> sin data-es`).toBeTruthy();
      expect(titulo.getAttribute("data-en"), `${pagina}: <title> sin data-en`).toBeTruthy();
      for (const atributo of ATRIBUTOS_DE_TEXTO) {
        for (const el of doc.querySelectorAll(`[${atributo}]`)) {
          const quien = el.outerHTML.slice(0, 80);
          expect(el.getAttribute(`data-${atributo}-es`), `${pagina}: ${atributo} sin español → ${quien}`).toBeTruthy();
          expect(el.getAttribute(`data-${atributo}-en`), `${pagina}: ${atributo} sin inglés → ${quien}`).toBeTruthy();
        }
      }
    });
  }
});
