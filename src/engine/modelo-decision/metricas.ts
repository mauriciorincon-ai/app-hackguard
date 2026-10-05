// Métricas de la familia `modelo_decision` (E-17 a E-22), funciones puras sobre PROBABILIDADES, nunca sobre el
// campo `confidence` (en Jev es un estadístico de dispersión, no una probabilidad de acertar). Sirven igual
// para el clasificador demo que para las respuestas de un modelo real.
//
// Convenciones declaradas:
// - Una salida inválida (`probabilidades: null`) cuenta como error (E-17): no acierta y aporta a Brier el
//   máximo, 2. El ECE no la puede ubicar en un bin: la deja fuera y la cuenta aparte.
// - ECE de la etiqueta elegida, con bins de IGUAL MASA: las predicciones válidas se ordenan por su
//   probabilidad máxima (empates por id) y se reparten en B bins; los primeros `n mod B` llevan una más.
// - La elección es la opción de más probabilidad, con empates rotos por id.
// - Toda suma recorre las predicciones ordenadas por id: el resultado no depende del orden de entrada.

export interface Prediccion {
  id: string;
  probabilidades: Readonly<Record<string, number>> | null;
  etiqueta: string;
}

export interface Tasa {
  n: number;
  /** Cuántas cumplen lo que mide la tasa (aciertos, cambios, errores…). */
  cuenta: number;
  /** `cuenta / n`, o `null` si no hay ninguna. */
  tasa: number | null;
}

const comparar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const porId = (ps: readonly Prediccion[]) =>
  [...ps].sort((a, b) => comparar(a.id, b.id));
const tasa = (cuenta: number, n: number): Tasa => ({
  n,
  cuenta,
  tasa: n === 0 ? null : cuenta / n,
});

/** La opción con más probabilidad; un empate se rompe por id. */
export function eleccion(p: Readonly<Record<string, number>>): string {
  const ids = Object.keys(p).sort(comparar);
  if (ids.length === 0) throw new RangeError("sin opciones");
  return ids.reduce((mejor, id) => (p[id] > p[mejor] ? id : mejor));
}

const acierta = (p: Prediccion) =>
  p.probabilidades !== null && eleccion(p.probabilidades) === p.etiqueta;

export function exactitud(ps: readonly Prediccion[]): Tasa {
  return tasa(ps.filter(acierta).length, ps.length);
}

/** Brier multiclase: la media de Σₖ (pₖ − yₖ)², entre 0 (perfecto) y 2. Una salida inválida aporta 2. */
export function brier(
  ps: readonly Prediccion[],
  opciones: readonly string[],
): number | null {
  if (ps.length === 0) return null;
  let suma = 0;
  for (const p of porId(ps)) {
    if (p.probabilidades === null) {
      suma += 2;
      continue;
    }
    for (const o of [...opciones].sort(comparar)) {
      const y = o === p.etiqueta ? 1 : 0;
      const d = (p.probabilidades[o] ?? 0) - y;
      suma += d * d;
    }
  }
  return suma / ps.length;
}

export interface Bin {
  n: number;
  confianza_media: number;
  exactitud: number;
}

export interface Ece {
  valor: number | null;
  bins: Bin[];
  validas: number;
  invalidas: number;
}

/** ECE de la etiqueta elegida, con `numeroDeBins` bins de igual masa (ver la cabecera). */
export function ece(ps: readonly Prediccion[], numeroDeBins: number): Ece {
  if (!Number.isInteger(numeroDeBins) || numeroDeBins < 1)
    throw new RangeError(`bins: ${numeroDeBins}`);
  const validas = porId(ps)
    .flatMap((p) => {
      if (p.probabilidades === null) return [];
      const elegida = eleccion(p.probabilidades);
      return [
        {
          id: p.id,
          confianza: p.probabilidades[elegida],
          acierto: elegida === p.etiqueta,
        },
      ];
    })
    .sort((a, b) => a.confianza - b.confianza || comparar(a.id, b.id));
  const n = validas.length;
  const invalidas = ps.length - n;
  if (n === 0) return { valor: null, bins: [], validas: 0, invalidas };
  const b = Math.min(numeroDeBins, n);
  const base = Math.floor(n / b);
  const bins: Bin[] = [];
  let desde = 0;
  let valor = 0;
  for (let i = 0; i < b; i++) {
    const tamano = base + (i < n % b ? 1 : 0);
    const grupo = validas.slice(desde, desde + tamano);
    desde += tamano;
    const confianza = grupo.reduce((s, x) => s + x.confianza, 0) / tamano;
    const exacto = grupo.filter((x) => x.acierto).length / tamano;
    bins.push({ n: tamano, confianza_media: confianza, exactitud: exacto });
    valor += (tamano / n) * Math.abs(exacto - confianza);
  }
  return { valor, bins, validas: n, invalidas };
}

export interface Banda {
  /** La opción que la aplicación decide con un umbral (p. ej. aprobar sin pasar por una persona). */
  opcion: string;
  umbral: number;
  desde: number;
  hasta: number;
}

/**
 * Error en la banda del umbral (E-17): entre las predicciones con `p(opcion)` en `[desde, hasta]`, cuántas
 * deciden mal. Decidir es `p(opcion) ≥ umbral`; acertar es que eso coincida con «la etiqueta es `opcion`».
 */
export function errorEnBanda(ps: readonly Prediccion[], banda: Banda): Tasa {
  const enBanda = porId(ps).filter(
    (p) =>
      p.probabilidades !== null &&
      (p.probabilidades[banda.opcion] ?? 0) >= banda.desde &&
      (p.probabilidades[banda.opcion] ?? 0) <= banda.hasta,
  );
  const errores = enBanda.filter(
    (p) =>
      (p.probabilidades?.[banda.opcion] ?? 0) >= banda.umbral !==
      (p.etiqueta === banda.opcion),
  ).length;
  return tasa(errores, enBanda.length);
}

export interface Reejecucion extends Tasa {
  /** Cuántas veces se corrió el mismo conjunto. */
  k: number;
  /** Ítems cuya distribución salió idéntica en las k corridas. */
  vectores_identicos: number;
}

const firma = (p: Prediccion) =>
  p.probabilidades === null
    ? "∅"
    : Object.keys(p.probabilidades)
        .sort(comparar)
        .map((o) => `${o}=${p.probabilidades?.[o]}`)
        .join(",");

/**
 * Tasa de cambio por re-ejecución idéntica (E-18, E-19): de los ítems, cuántos cambian de elección en al menos
 * una de las k corridas. Es el piso de ruido contra el que se compara todo efecto inducido.
 */
export function tasaPorReejecucion(
  corridas: readonly (readonly Prediccion[])[],
): Reejecucion {
  if (corridas.length < 2)
    throw new RangeError("hacen falta al menos 2 corridas");
  const ordenadas = corridas.map(porId);
  const ids = ordenadas[0].map((p) => p.id).join("\n");
  if (ordenadas.some((c) => c.map((p) => p.id).join("\n") !== ids))
    throw new RangeError("las corridas no tienen los mismos ítems");
  let cambios = 0;
  let identicos = 0;
  ordenadas[0].forEach((_, i) => {
    const deEsteItem = ordenadas.map((c) => c[i]);
    const elecciones = new Set(
      deEsteItem.map((p) =>
        p.probabilidades === null ? "∅" : eleccion(p.probabilidades),
      ),
    );
    if (elecciones.size > 1) cambios += 1;
    if (new Set(deEsteItem.map(firma)).size === 1) identicos += 1;
  });
  return {
    ...tasa(cambios, ordenadas[0].length),
    k: corridas.length,
    vectores_identicos: identicos,
  };
}

export interface Paridad {
  es: { exactitud: Tasa; brier: number | null };
  en: { exactitud: Tasa; brier: number | null };
  /** Exactitud en inglés menos exactitud en español, en puntos porcentuales. */
  diferencia_pp: number | null;
  /** Ítems en que los dos idiomas eligen lo mismo. */
  concordancia: Tasa;
}

/** Paridad ES/EN (E-22): el mismo conjunto redactado en los dos idiomas, ítem por ítem. */
export function paridad(
  es: readonly Prediccion[],
  en: readonly Prediccion[],
  opciones: readonly string[],
): Paridad {
  const a = porId(es);
  const b = porId(en);
  if (a.map((p) => p.id).join("\n") !== b.map((p) => p.id).join("\n"))
    throw new RangeError("los dos idiomas no tienen los mismos ítems");
  const exEs = exactitud(a);
  const exEn = exactitud(b);
  const iguales = a.filter((p, i) => {
    const otra = b[i].probabilidades;
    return (
      p.probabilidades !== null &&
      otra !== null &&
      eleccion(p.probabilidades) === eleccion(otra)
    );
  }).length;
  return {
    es: { exactitud: exEs, brier: brier(a, opciones) },
    en: { exactitud: exEn, brier: brier(b, opciones) },
    diferencia_pp:
      exEs.tasa === null || exEn.tasa === null
        ? null
        : (exEn.tasa - exEs.tasa) * 100,
    concordancia: tasa(iguales, a.length),
  };
}
