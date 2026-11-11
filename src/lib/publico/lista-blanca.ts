// C19 · el modo público es una LISTA BLANCA, no una lista negra (default (ii) del S13): lo que no está aquí no viaja. Declara
// qué rutas puede tener la exportación pública y qué datos pueden aparecer en ellas. Puro y sin Node: lo leen las pantallas (en
// el build, para dejar inertes los enlaces que salen de la lista), el barrido de la frontera y el verificador del paquete.
//
// Fijada en la F3 tras la consulta al advisor: las rutas, los archivos de la raíz y TRES reglas de datos (activos demo, controles
// propios demo y las carpetas de donde salen los ids de evidencia demo). Lo que garantiza que ningún dato real llegue al export
// no es solo este barrido: es que las pantallas cargan con `privados: false` (tests/unit/publico-cargadores.test.ts).

/** Las rutas de la exportación pública: catálogo, ficha de prueba, marcos, controles, cobertura, brecha y control de brecha. */
export const RUTAS_PUBLICAS: readonly { nombre: string; patron: RegExp }[] = [
  { nombre: "entrada", patron: /^\/$/ },
  { nombre: "catálogo", patron: /^\/catalogo$/ },
  // La ficha de una prueba: su id va en mayúsculas (PR-SW-XSS-001). `/catalogo/propuestas` y `/catalogo/diferencias` no entran.
  {
    nombre: "ficha de prueba",
    patron: /^\/catalogo\/[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
  },
  { nombre: "marcos", patron: /^\/catalogo\/marcos$/ },
  { nombre: "controles y cobertura", patron: /^\/catalogo\/controles$/ },
  { nombre: "brecha", patron: /^\/brecha$/ },
  { nombre: "brecha por control", patron: /^\/brecha\/control$/ },
  {
    nombre: "control de la brecha",
    patron: /^\/brecha\/control\/[a-z0-9]+(?:[-_.][a-z0-9]+)*$/,
  },
];

/** Los archivos sueltos de la raíz que acompañan a las rutas (el icono y la página de error). Nada más. */
export const ARCHIVOS_DE_LA_RAIZ: readonly string[] = [
  "favicon.ico",
  "404.html",
];

/** Solo los activos demo sintéticos (`act-demo-*`) pueden aparecer en lo exportado. */
export const PATRON_DE_ACTIVO_PUBLICO = /^act-demo-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** ¿Este id de activo puede aparecer en lo exportado? Solo un demo sintético. La frontera y el paquete usan esta misma lista. */
export const esActivoPublico = (id: string): boolean =>
  PATRON_DE_ACTIVO_PUBLICO.test(id);

/** La capa propia de controles que puede viajar: la demo sintética (`org-demo`, `org-demo-O.1.1`…). Una capa real vive en `datos/privado/`. */
export const PATRON_DE_CONTROL_PROPIO_PUBLICO =
  /^org-demo(?:-[A-Za-z0-9.]+)*$/i;

/** ¿Este id de control de la capa propia puede aparecer en lo exportado? Solo el de la capa demo. */
export const esControlPropioPublico = (id: string): boolean =>
  PATRON_DE_CONTROL_PROPIO_PUBLICO.test(id);

/**
 * De dónde salen los ids de evidencia que pueden aparecer (hallazgos, sobres y lotes): solo carpetas `demo/` versionadas. Un id
 * real que coincida en número con uno demo pasaría el barrido; lo que lo detiene es que ninguna pantalla pública carga `datos/privado/`.
 */
export const CARPETAS_DE_EVIDENCIA_DEMO = {
  hallazgos: "datos/hallazgos/demo",
  sobres: "datos/evidencia/demo",
  lotes: "datos/lotes/demo",
} as const;

/** `HACKGUARD_PUBLICO=1` en el build. Next lo inlinea en el JS del cliente (next.config.ts), así que vale en los dos lados. */
export const modoPublico = (): boolean => process.env.HACKGUARD_PUBLICO === "1";

/** La parte de la ruta que cuenta: sin el ancla, sin la consulta y sin la barra final. */
export function normalizarRuta(href: string): string {
  const sinAncla = href.split("#")[0]!.split("?")[0]!;
  return sinAncla.length > 1 ? sinAncla.replace(/\/+$/, "") : sinAncla || "/";
}

/** ¿La ruta (interna, absoluta) está en la lista blanca? Un enlace externo, relativo o con esquema NO lo está. */
export function esRutaPublica(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const ruta = normalizarRuta(href);
  return RUTAS_PUBLICAS.some((r) => r.patron.test(ruta));
}

/** ¿Un destino debe verse como enlace? Fuera del modo público, siempre; dentro, solo un ancla de la misma página o una ruta de la lista. */
export function enlaceVisible(href: string): boolean {
  if (!modoPublico()) return true;
  return href.startsWith("#") || esRutaPublica(href);
}

/**
 * La ruta que un archivo del export representa, o `null` si es un archivo de soporte (`_next/`, la raíz permitida).
 * `catalogo/PR-1.html` y `catalogo/PR-1/__next.*.txt` son la ruta `/catalogo/PR-1`; `index.html` y `__next.*.txt` de la raíz, `/`.
 */
export function rutaDeArchivo(relativo: string): string | null {
  const r = relativo.split("\\").join("/");
  if (r.startsWith("_next/") || ARCHIVOS_DE_LA_RAIZ.includes(r)) return null;
  if (r === "_not-found.html" || r.startsWith("_not-found/")) return null;
  const partes = r.split("/");
  const nombre = partes.pop()!;
  let dir = partes.join("/");
  if (!nombre.startsWith("__next.")) {
    const base = nombre.replace(/\.(html|txt|json|md)$/, "");
    if (base !== "index") dir = dir === "" ? base : `${dir}/${base}`;
  }
  return normalizarRuta(`/${dir}`);
}

/** ¿Este archivo del export pertenece a la lista blanca? Los archivos de soporte sí. */
export function archivoPermitido(relativo: string): boolean {
  const ruta = rutaDeArchivo(relativo);
  return ruta === null || esRutaPublica(ruta);
}
