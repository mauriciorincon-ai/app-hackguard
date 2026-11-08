// La cadena de un hallazgo puesta en texto para la terminal: los mismos eslabones que dibuja la pantalla (`construirCadena`), uno por
// línea de título y su cuerpo debajo. Función pura: una cuenta, un cálculo (design-system § 9). Lo pendiente lleva «(por hacer)»
// aparte del color: el símbolo y el texto dicen el estado (regla dura 12).
import type { Idioma } from "../../engine/catalogo/informe.ts";
import type { EslabonDeCadena, LineaDeEslabon } from "./tipos.ts";

const lineaEnTexto = (l: LineaDeEslabon, idioma: Idioma): string => {
  switch (l.tipo) {
    case "fecha":
      return l.valor;
    case "texto":
      return l.texto[idioma];
    case "sobre":
      return `${l.id}${l.nota === undefined ? "" : ` · ${l.nota[idioma]}`}`;
    case "huella":
      return `${idioma === "es" ? "huella" : "fingerprint"} ${l.hex}`;
    case "firma":
      return `${l.etiqueta.nombre[idioma]} · ${l.fecha}`;
    case "motivos":
      return l.motivos.map((m) => m[idioma]).join("; ");
  }
};

export function informeDeCadena(
  id: string,
  estado: string,
  cadena: readonly EslabonDeCadena[],
  /** Cuántas veces se reabrió: lo cuenta el motor, no se adivina por el color de un eslabón. */
  reaperturas: number,
  idioma: Idioma,
): string {
  const es = idioma === "es";
  const lineas = [
    es
      ? `Cadena de ${id} · ${estado} · ${cadena.length} eslabones${reaperturas > 0 ? ` · reabierto ${reaperturas} ${reaperturas === 1 ? "vez" : "veces"}` : ""}`
      : `Chain of ${id} · ${estado} · ${cadena.length} links${reaperturas > 0 ? ` · reopened ${reaperturas} ${reaperturas === 1 ? "time" : "times"}` : ""}`,
  ];
  cadena.forEach((e, i) => {
    lineas.push(
      "",
      `${i + 1}. ${e.pendiente ? (es ? "[por hacer] " : "[to do] ") : ""}${e.etiqueta.nombre[idioma]}`,
      ...e.lineas.map((l) => `   ${lineaEnTexto(l, idioma)}`),
    );
  });
  return `${lineas.join("\n")}\n`;
}
