// Gate del MAPA DE FUNCIONES (auditoría de cierre, B3): qué funcionalidades (C1…C20) cubre cada pantalla
// está escrito dos veces —en la portada de la maqueta y en la tabla de cobertura de docs/diseno/README.md—
// y las dos tienen que decir lo mismo. Antes del cierre diferían en cuatro pantallas.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentoDe, leerPagina, RAIZ_MAQUETA } from "./lib/maqueta";

const funciones = (texto: string) =>
  texto
    .split("·")
    .map((c) => c.trim())
    .filter(Boolean)
    .sort()
    .join(" · ");

/** La tabla «Cobertura» del README: primera celda (su primer `nombre`) → segunda celda (funciones). */
function delReadme() {
  const readme = readFileSync(`${RAIZ_MAQUETA}/README.md`, "utf8");
  const tabla = readme.slice(readme.indexOf("## Cobertura"));
  const mapa = new Map<string, string>();
  for (const linea of tabla.split("\n")) {
    const celdas = /^\| `([^`]+)`[^|]* \| ([^|]+) \|/.exec(linea);
    if (celdas) mapa.set(celdas[1], funciones(celdas[2]));
    if (linea.startsWith("## ") && !linea.startsWith("## Cobertura")) break;
  }
  return mapa;
}

/** La portada: cada fila enlaza su pantalla y dice sus funciones en la tercera celda. */
function deLaPortada() {
  const doc = documentoDe(leerPagina(RAIZ_MAQUETA, "index.html"));
  return [...doc.querySelectorAll("main tbody tr")].map((fila) => {
    const archivo = fila.querySelector("a")!.getAttribute("href")!;
    // Las pantallas con una página por objeto se nombran en el README por su patrón: prueba-<id>, etc.
    const nombre = archivo
      .replace(/\.html$/, "")
      .replace(/^(prueba|activo|plan|hallazgo|control)-.+$/, "$1-<id>");
    return {
      nombre,
      funciones: funciones(fila.querySelectorAll("td")[2].textContent ?? ""),
    };
  });
}

describe("maqueta: la portada y el README dicen las mismas funciones por pantalla", () => {
  const readme = delReadme();
  const portada = deLaPortada();

  it("las dos listas tienen pantallas", () => {
    expect(readme.size).toBeGreaterThan(0);
    expect(portada.length).toBeGreaterThan(0);
  });

  it.each(portada)("$nombre", ({ nombre, funciones }) => {
    expect(
      readme.has(nombre),
      `${nombre}: el README no tiene fila de cobertura`,
    ).toBe(true);
    expect(funciones, `${nombre}: la portada y el README no coinciden`).toBe(
      readme.get(nombre),
    );
  });
});
