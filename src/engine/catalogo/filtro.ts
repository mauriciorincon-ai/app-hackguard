// Filtro de contenido (RF-01.3, DA-03): aplica los patrones de FORMA de `datos/filtro/patrones.json` a todo
// texto de una entrada, en los dos idiomas. Solo MARCA para revisión; jamás rechaza: decide una persona.
// Un hallazgo dice qué patrón marcó y en qué campo, nunca el fragmento: el informe no repite lo que el
// filtro sospecha que es operativo.
import type { PatronesDelFiltro } from "./esquemas.ts";

export interface PatronCompilado {
  id: string;
  expresion: RegExp;
}

export interface Marca {
  /** Ruta del texto dentro de la entrada, p. ej. `que_verifica.es`. */
  campo: string;
  patron: string;
}

export interface ProblemaDelFiltro {
  regla:
    | "filtro/expresion-invalida"
    | "filtro/carnada-no-marca"
    | "filtro/contraejemplo-marca";
  patron: string;
  /** Dónde está el caso que falló dentro de `patrones.json`, p. ej. `patrones.0.carnadas.1`. */
  campo: string;
}

/** Compila los patrones y comprueba que cada uno marca sus carnadas y ningún contraejemplo. */
export function compilarPatrones(datos: PatronesDelFiltro): {
  patrones: PatronCompilado[];
  problemas: ProblemaDelFiltro[];
} {
  const patrones: PatronCompilado[] = [];
  const problemas: ProblemaDelFiltro[] = [];
  datos.patrones.forEach((p, n) => {
    let expresion: RegExp;
    try {
      expresion = new RegExp(p.expresion, p.banderas);
    } catch {
      problemas.push({
        regla: "filtro/expresion-invalida",
        patron: p.id,
        campo: `patrones.${n}.expresion`,
      });
      return;
    }
    patrones.push({ id: p.id, expresion });
    p.carnadas.forEach((carnada, i) => {
      if (!expresion.test(carnada)) {
        problemas.push({
          regla: "filtro/carnada-no-marca",
          patron: p.id,
          campo: `patrones.${n}.carnadas.${i}`,
        });
      }
    });
  });
  // Un contraejemplo, propio o general, no lo marca NINGÚN patrón: nombrar una técnica o un módulo nunca marca.
  const contraejemplos = [
    ...datos.patrones.flatMap((p, n) =>
      p.contraejemplos.map((texto, i) => ({
        texto,
        campo: `patrones.${n}.contraejemplos.${i}`,
      })),
    ),
    ...datos.contraejemplos_generales.casos.map((texto, i) => ({
      texto,
      campo: `contraejemplos_generales.casos.${i}`,
    })),
  ];
  for (const c of contraejemplos) {
    for (const p of patrones) {
      if (p.expresion.test(c.texto)) {
        problemas.push({
          regla: "filtro/contraejemplo-marca",
          patron: p.id,
          campo: c.campo,
        });
      }
    }
  }
  return { patrones, problemas };
}

/** Todos los textos de un valor JSON, con su ruta (`a.b.0.es`). */
export function textosDe(
  valor: unknown,
  ruta = "",
): { campo: string; texto: string }[] {
  if (typeof valor === "string") return [{ campo: ruta, texto: valor }];
  if (Array.isArray(valor)) {
    return valor.flatMap((v, i) =>
      textosDe(v, ruta === "" ? String(i) : `${ruta}.${i}`),
    );
  }
  if (valor !== null && typeof valor === "object") {
    return Object.keys(valor)
      .sort()
      .flatMap((clave) =>
        textosDe(
          (valor as Record<string, unknown>)[clave],
          ruta === "" ? clave : `${ruta}.${clave}`,
        ),
      );
  }
  return [];
}

/** Qué patrones marcan qué textos de una entrada. Lista vacía = el filtro no ve nada. */
export function filtrar(valor: unknown, patrones: PatronCompilado[]): Marca[] {
  const marcas: Marca[] = [];
  for (const { campo, texto } of textosDe(valor)) {
    for (const p of patrones) {
      if (p.expresion.test(texto)) marcas.push({ campo, patron: p.id });
    }
  }
  return marcas;
}
