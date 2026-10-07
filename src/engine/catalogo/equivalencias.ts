// Referencias a un marco con versión (E-15, RF-01.6). «LLM07» a secas es ambiguo: en OWASP LLM 2025 es
// System Prompt Leakage y en 2026 es Misinformation. Toda referencia dice marco, versión y entrada; si cita
// una versión anterior, el mapa de equivalencias la resuelve a la entrada vigente, salto a salto.
import type { Equivalencias, Marco } from "./esquemas.ts";

export interface Referencia {
  marco_id: string;
  version_marco: string;
  referencia_en_marco: string;
}

export type Resolucion =
  | { tipo: "vigente" }
  | {
      tipo: "anterior";
      /** Entradas de la versión vigente a las que resuelve; `null` si falta un mapa en el camino. */
      vigentes: string[] | null;
      version_vigente: string;
    }
  | {
      tipo: "invalida";
      regla:
        | "referencia/marco-inexistente"
        | "referencia/version-inexistente"
        | "referencia/entrada-inexistente";
    };

const tieneEntrada = (
  entradas: { id: string }[] | undefined,
  id: string,
): boolean => entradas === undefined || entradas.some((e) => e.id === id);

export function resolverReferencia(
  ref: Referencia,
  marcos: ReadonlyMap<string, Marco>,
  mapas: ReadonlyMap<string, Equivalencias>,
): Resolucion {
  const marco = marcos.get(ref.marco_id);
  if (marco === undefined)
    return { tipo: "invalida", regla: "referencia/marco-inexistente" };

  if (ref.version_marco === marco.version_vigente) {
    return tieneEntrada(marco.entradas, ref.referencia_en_marco)
      ? { tipo: "vigente" }
      : { tipo: "invalida", regla: "referencia/entrada-inexistente" };
  }

  const anterior = marco.versiones_anteriores.find(
    (v) => v.version === ref.version_marco,
  );
  if (anterior === undefined)
    return { tipo: "invalida", regla: "referencia/version-inexistente" };
  if (!tieneEntrada(anterior.entradas, ref.referencia_en_marco)) {
    return { tipo: "invalida", regla: "referencia/entrada-inexistente" };
  }

  // Sigue los mapas hasta la versión vigente. Cada versión se visita una vez: un mapa circular no cuelga.
  let entradas = [ref.referencia_en_marco];
  let version = anterior;
  const visitadas = new Set<string>();
  while (!visitadas.has(version.version)) {
    visitadas.add(version.version);
    const mapa =
      version.equivalencias === undefined
        ? undefined
        : mapas.get(version.equivalencias);
    if (mapa === undefined || mapa.desde !== version.version) break;
    entradas = entradas.flatMap(
      (e) => mapa.pares.find((p) => p.desde === e)?.hacia ?? [],
    );
    if (mapa.hacia === marco.version_vigente) {
      return {
        tipo: "anterior",
        vigentes: [...entradas].sort(),
        version_vigente: marco.version_vigente,
      };
    }
    const siguiente = marco.versiones_anteriores.find(
      (v) => v.version === mapa.hacia,
    );
    if (siguiente === undefined) break;
    version = siguiente;
  }
  return {
    tipo: "anterior",
    vigentes: null,
    version_vigente: marco.version_vigente,
  };
}
