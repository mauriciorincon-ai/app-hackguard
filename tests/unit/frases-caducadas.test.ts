// @vitest-environment node
// Una frase que se volvió falsa no vuelve (kit v1.15: «¿qué frases caducaron?»). Cada fila de esta tabla es una frase que un sprint
// dejó falsa y que se corrigió; si alguien la reintroduce, la prueba falla y dice de qué fila viene. La tabla crece con cada auditoría:
// una frase corregida entra aquí en el mismo commit que la corrige. Los patrones son lo que ya no se puede escribir, no lo que sí.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RAIZ } from "./propuestas/ayuda.ts";

/** [fila del lote, archivo, lo que ya no puede decirse]. */
const CADUCADAS: readonly (readonly [string, string, RegExp])[] = [
  // El manual
  ["S5-3a", "docs/MANUAL-DE-USO.md", /hallazgos:listar`(?! --fecha)/],
  [
    "S5-3b / S7-C3",
    "docs/MANUAL-DE-USO.md",
    /El plan no muestra todavía qué pruebas/,
  ],
  [
    "S5-3b / S7-C3",
    "docs/MANUAL-DE-USO.md",
    /The plan does not yet show which tests/,
  ],
  ["S5-13", "docs/MANUAL-DE-USO.md", /Si falló, abre su hallazgo\./],
  ["S5-13", "docs/MANUAL-DE-USO.md", /If it failed, it opens its finding\./],
  [
    "S7-C4",
    "docs/MANUAL-DE-USO.md",
    /Con los datos de demo de hoy ningún control/,
  ],
  ["S7-C4", "docs/MANUAL-DE-USO.md", /With today's demo data no control/],
  // El registro de decisiones de diseño
  ["S5-12", "docs/diseno/README.md", /«falló su única medición»/],
  [
    "S6-B13",
    "docs/diseno/README.md",
    /Los lotes llegan con la carga de evidencia/,
  ],
  ["S8-F3", "docs/diseno/README.md", /El extractor no existe todavía/],
  ["ED-7", "docs/diseno/README.md", /es un gate a construir en el S4/],
  // La guía de prueba (S9: las cuatro filas abiertas del lote)
  ["S3-M5", "docs/GUIA-DE-PRUEBA.html", /Solo cambian los datos/],
  ["S3-B10", "docs/GUIA-DE-PRUEBA.html", /No corre en este\s+sprint/],
  ["S5-11a", "docs/GUIA-DE-PRUEBA.html", /Lo que cambió en S7/],
  [
    "S5-11b",
    "docs/GUIA-DE-PRUEBA.html",
    /la tabla de la matriz \(en HZ-0007\)/,
  ],
  // Revisión de la auditoría de alcance (S9): promesas del manual y de la guía que el sprint pagó
  [
    "S9-M1",
    "docs/MANUAL-DE-USO.md",
    /llega al cierre del hito|arrives at the close of the milestone/,
  ],
  ["S9-M4", "docs/GUIA-DE-PRUEBA.html", /Propuestas sigue con la marca/],
  ["S9-M5", "docs/GUIA-DE-PRUEBA.html", /«9 passed»/],
  // S10: el plan viejo ya no «deja de construirse»; queda desactualizado y se re-planea
  [
    "S10-M1",
    "docs/MANUAL-DE-USO.md",
    /el plan viejo deja de construirse hasta volver a emitirlo/,
  ],
  [
    "S10-M1",
    "docs/MANUAL-DE-USO.md",
    /the old plan stops being built until it is issued again/,
  ],
  // S10: la guía ya no tiene el tope del «gate corto ⭐⭐»
  ["S10-G1", "docs/GUIA-DE-PRUEBA.html", /⭐⭐ Parada \d+ de/],
  // S11: un cerrado SÍ se reabre (D5); la frase vieja decía que toda falla posterior abría un hallazgo nuevo
  [
    "S11-reabre",
    "docs/MANUAL-DE-USO.md",
    /Si una prueba posterior vuelve a fallar, esa falla abre un/,
  ],
  [
    "S11-reabre",
    "docs/MANUAL-DE-USO.md",
    /If a later test fails again, that failure opens a new finding/,
  ],
  [
    "S11-reabre",
    "src/lib/evidencia/vista.ts",
    /Si una prueba posterior vuelve a fallar, esa falla abre/,
  ],
  [
    "S11-reabre",
    "src/cli/evidencia.ts",
    /Si una prueba posterior vuelve a fallar, abre un hallazgo nuevo/,
  ],
  // S11: la carga ya tiene la vía del texto pegado; el README de diseño no dice que «no existe»
  ["S11-pegado", "docs/diseno/README.md", /esa vía no existe en esta versión/],
  [
    "S11-pegado",
    "docs/diseno/README.md",
    /La skill existe; la pantalla sigue de solo lectura/,
  ],
  // El código y sus comentarios
  [
    "S3-X",
    "src/components/controles/controles-pantalla.tsx",
    /todavía no existe como pantalla|does not exist as a screen yet/,
  ],
  [
    "S3-B1",
    "src/lib/catalogo/paginacion.ts",
    /sin pasar el presupuesto de rendimiento/,
  ],
  // S11: el texto pegado ya se lee en el navegador (propone, no confirma)
  [
    "S11-pegado",
    "docs/MANUAL-DE-USO.md",
    /«Texto pegado» todavía no carga nada|“Pasted text” does not load anything yet/,
  ],
  [
    "S11-pegado",
    "docs/MANUAL-DE-USO.md",
    /no pega texto todavía|does not paste text yet/,
  ],
  [
    "S11-pegado",
    "src/components/carga/pegado-pantalla.tsx",
    /aquí no hay campo ni botón|esa vía no existe en esta versión|there is no field or button here/,
  ],
];

/** Lo que el texto corregido SÍ tiene que decir: una frase que se borra sin reemplazo también es un hallazgo. */
const VIGENTES: readonly (readonly [string, string, RegExp])[] = [
  [
    "S5-3a",
    "docs/MANUAL-DE-USO.md",
    /pnpm hallazgos:listar --fecha AAAA-MM-DD/,
  ],
  [
    "S5-3a",
    "docs/MANUAL-DE-USO.md",
    /pnpm hallazgos:listar --fecha YYYY-MM-DD/,
  ],
  [
    "S5-13",
    "docs/MANUAL-DE-USO.md",
    /una re-prueba se suma al hallazgo que cita/,
  ],
  ["S6-B4", "docs/MANUAL-DE-USO.md", /no admite activos demo/],
  ["S6-B4", "docs/MANUAL-DE-USO.md", /does not accept demo assets/],
  ["S7-C4", "docs/MANUAL-DE-USO.md", /fecha de consulta del build/],
  [
    "ED-7",
    "docs/diseno/README.md",
    /verificar-salida-publicada\.mjs --publico/,
  ],
  [
    "S11-pegado",
    "docs/diseno/README.md",
    /«Texto pegado» \(S11\) deja de ser un aviso/,
  ],
];

const leer = (f: string) => readFileSync(path.join(RAIZ, f), "utf8");

describe("las frases que dejaron de ser ciertas no vuelven", () => {
  it.each(CADUCADAS)("%s · %s ya no dice %s", (fila, archivo, patron) => {
    expect(leer(archivo), `${fila}: ${archivo}`).not.toMatch(patron);
  });
});

describe("y lo que las reemplazó sigue escrito", () => {
  it.each(VIGENTES)("%s · %s dice %s", (fila, archivo, patron) => {
    expect(leer(archivo), `${fila}: ${archivo}`).toMatch(patron);
  });
});
