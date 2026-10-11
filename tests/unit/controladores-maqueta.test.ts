// Gate de CONTROLADORES (kit v1.32.0, regla 22), ENDURECIDO para HackGuard: todo control dibujado en
// la maqueta declara data-controlador="<nombre>", y la página carga un script local que contiene su
// registrar("<nombre>", …). Origen: en la Etapa de Diseño de Big-D la ficha del nivel 2 no cargó su
// script desde la mirada 2 y cuatro miradas no lo vieron — una captura de un panel cerrado «mide bien».
// La plantilla del kit solo pedía «algún script»; aquí el par control ↔ controlador es exacto.
// Además: todo enlace relativo apunta a una página o a un ancla que existe.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { documentoDe, leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const INTERACTIVO =
  'button, select, input, textarea, summary, [role="button"], [role="switch"], [role="tab"], [role="slider"]';
const paginas = paginasDe(RAIZ_MAQUETA);

describe("maqueta: cada control tiene su controlador cargado", () => {
  it("hay maqueta que verificar", () => expect(paginas.length).toBeGreaterThan(0));

  for (const pagina of paginas) {
    const doc = documentoDe(leerPagina(RAIZ_MAQUETA, pagina));

    it(`${pagina}: scripts locales, existentes y sin código en línea`, () => {
      for (const script of doc.querySelectorAll("script")) {
        const src = script.getAttribute("src");
        expect(src, `${pagina}: script en línea prohibido (la política de /diseno/ solo admite 'self')`).toBeTruthy();
        expect(/^(https?:)?\/\//.test(src!), `${pagina}: script externo prohibido (${src})`).toBe(false);
        expect(existsSync(join(RAIZ_MAQUETA, src!)), `${pagina}: falta el script ${src}`).toBe(true);
      }
    });

    it(`${pagina}: todo control interactivo declara data-controlador y su script lo registra`, () => {
      const cargado = [...doc.querySelectorAll("script[src]")]
        .map((s) => readFileSync(join(RAIZ_MAQUETA, s.getAttribute("src")!), "utf8"))
        .join("\n");
      const registrados = new Set([...cargado.matchAll(/registrar\("([a-z-]+)"/g)].map((m) => m[1]));
      for (const control of doc.querySelectorAll(INTERACTIVO)) {
        const nombre = control.getAttribute("data-controlador");
        const quien = control.outerHTML.slice(0, 100);
        expect(nombre, `${pagina}: control sin data-controlador → ${quien}`).toBeTruthy();
        expect(registrados.has(nombre!), `${pagina}: ningún script cargado registra «${nombre}» → ${quien}`).toBe(true);
      }
    });

    it(`${pagina}: todo enlace relativo llega a algo que existe`, () => {
      for (const enlace of doc.querySelectorAll("a[href]")) {
        const href = enlace.getAttribute("href")!;
        const [archivo, ancla] = href.split("#");
        if (archivo) {
          expect(/^[a-z0-9-]+\.html$/.test(archivo), `${pagina}: enlace no relativo a la maqueta (${href})`).toBe(true);
          expect(paginas.includes(archivo), `${pagina}: enlace a una página que no existe (${href})`).toBe(true);
        }
        if (ancla) {
          const destino = archivo ? documentoDe(leerPagina(RAIZ_MAQUETA, archivo)) : doc;
          expect(destino.getElementById(ancla), `${pagina}: ancla inexistente (${href})`).not.toBeNull();
        }
      }
    });
  }
});
