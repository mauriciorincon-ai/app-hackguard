// Gate de las CIFRAS ESCRITAS A MANO en la maqueta (auditoría de cierre, A3 y M13): familias, marcos,
// controles, herramientas y adaptadores crecen solo con datos (regla 10), y los activos, pruebas, hallazgos,
// sobres o comprobaciones de la maqueta son datos. Una cifra en letras pegada a uno de esos nombres
// («cuatro familias», «the two envelopes») es un número que nadie calcula: el día que los datos cambian, la
// pantalla miente. Lo que la pantalla cuente sale de su arreglo (`${PANTALLAS.length}`), o se dice sin
// cifra. Lee el texto que ve el usuario, en los dos idiomas, en las páginas generadas.
import { describe, expect, it } from "vitest";
import { leerPagina, paginasDe, RAIZ_MAQUETA } from "./lib/maqueta";

const NUMEROS =
  "dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen";
const ENTIDADES =
  "familias|marcos|controles|herramientas|adaptadores|idiomas|activos|pruebas|hallazgos|sobres|lotes|propuestas|pantallas|comprobaciones|avisos|filas|fichas|reglas|planes|versiones|families|frameworks|controls|tools|adapters|languages|assets|tests|findings|envelopes|batches|proposals|screens|checks|notices|rows|records|rules|plans|versions";
const CIFRA_A_MANO = new RegExp(
  `\\b(?:${NUMEROS})\\s+(?:(?:de|of|the|las|los)\\s+)?(?:${ENTIDADES})\\b`,
  "gi",
);

const textoDe = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

describe("maqueta: ninguna cifra de datos escrita a mano en el texto", () => {
  it.each(paginasDe(RAIZ_MAQUETA))("%s", (pagina) => {
    const halladas = [
      ...textoDe(leerPagina(RAIZ_MAQUETA, pagina)).matchAll(CIFRA_A_MANO),
    ].map((m) => m[0]);
    expect(
      halladas,
      `${pagina}: cifras en letras que deberían salir de los datos`,
    ).toEqual([]);
  });
});
