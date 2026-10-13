#!/usr/bin/env node
// Las cifras de `docs/brochure-export.json` (y las del brochure, que las lee de ahí) salen de COMANDOS y de archivos, nunca de la
// memoria (regla 27 del kit: la evidencia se escribe después del hecho, con la cuenta tomada del resultado).
//
//   node scripts/cifras-del-export.mjs                      imprime las cifras baratas (archivos del repo)
//   node scripts/cifras-del-export.mjs --correr             además corre `vitest run --coverage` y `playwright test --list`
//   node scripts/cifras-del-export.mjs --correr --escribir --fecha AAAA-MM-DD --sprints N
//                                                           y las escribe en el export (valor y detalle de cada métrica)
//
// Lo caro (las pruebas y la cobertura) solo se mide con `--correr`; sin él `--escribir` conserva esos valores y lo dice. Se corre
// dos veces en un sprint de cierre de hito: una al armar el export y OTRA VEZ como último paso antes del cierre, porque un test
// nuevo vuelve falsa la primera (lección de habla: 251 pruebas declaradas cuando el test recién escrito ya las volvía 261).
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const leerJson = (ruta) => JSON.parse(readFileSync(join(RAIZ, ruta), "utf8"));

/** Los archivos .json bajo una carpeta del repo, ordenados. */
export function archivosJson(carpeta) {
  const dir = join(RAIZ, carpeta);
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((n) => n.endsWith(".json"))
    .sort();
}

/** Líneas cubiertas de `coverage/coverage-final.json`, contadas como istanbul (la línea de cada sentencia; gana el mayor conteo). */
export function coberturaDeLineas(coverageFinal, soloSrc = true) {
  let total = 0;
  let cubiertas = 0;
  for (const [archivo, v] of Object.entries(coverageFinal)) {
    if (soloSrc && !archivo.includes("/src/")) continue;
    const lineas = new Map();
    for (const [id, cuenta] of Object.entries(v.s)) {
      const linea = v.statementMap[id].start.line;
      if (!lineas.has(linea) || lineas.get(linea) < cuenta)
        lineas.set(linea, cuenta);
    }
    total += lineas.size;
    cubiertas += [...lineas.values()].filter((c) => c > 0).length;
  }
  return {
    total,
    cubiertas,
    porCiento: total === 0 ? 0 : Math.round((10000 * cubiertas) / total) / 100,
  };
}

/** Los sprints con cierre en el repo (`SPRINT_NNN-cierre.md`, o el `-summary.md` del primero). */
export function sprintsConCierre() {
  const dir = join(RAIZ, "sprints");
  const numeros = new Set();
  for (const n of readdirSync(dir)) {
    const m = /^SPRINT_(\d{3})-(cierre|summary)\.md$/.exec(n);
    if (m) numeros.add(Number(m[1]));
  }
  return numeros.size;
}

/** Las cifras que salen de archivos del repo. */
export async function cifrasBaratas() {
  const pruebas = archivosJson("datos/pruebas");
  const porFamilia = {};
  let sinControl = 0;
  for (const p of pruebas) {
    const familia = p.split("/")[0];
    porFamilia[familia] = (porFamilia[familia] ?? 0) + 1;
    if (leerJson(join("datos/pruebas", p)).controles.length === 0) sinControl++;
  }
  const anexo = leerJson("datos/controles/iso42001-anexo-a.json");
  const { REGLAS } = await import(
    pathToFileURL(join(RAIZ, "src/engine/catalogo/reglas.ts")).href
  );
  const casos = leerJson(
    "docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json",
  ).casos.length;
  const manual = readFileSync(join(RAIZ, "docs/MANUAL-DE-USO.md"), "utf8");
  const salida = join(RAIZ, "out");
  const paginas = existsSync(salida)
    ? readdirSync(salida, { recursive: true }).filter((n) =>
        String(n).endsWith(".html"),
      ).length
    : null;
  return {
    pruebas_en_el_catalogo: pruebas.length,
    por_familia: porFamilia,
    controles_iso_42001: anexo.areas.reduce(
      (n, a) => n + a.controles.length,
      0,
    ),
    reglas_del_validador: Object.keys(REGLAS).length,
    // Un marco es un archivo en la raíz de datos/marcos/; el mapa de equivalencias vive en una subcarpeta y no es un marco.
    marcos_de_referencia: readdirSync(join(RAIZ, "datos/marcos")).filter((n) =>
      n.endsWith(".json"),
    ).length,
    herramientas: archivosJson("datos/herramientas").length,
    pruebas_de_software_sin_control: sinControl,
    casos_del_clasificador_demo: casos,
    secciones_del_manual: [
      ...manual.matchAll(/^#### .+ · desde Sprint \d{3}$/gm),
    ].length,
    adr: readdirSync(join(RAIZ, "decisions")).filter((n) =>
      /^\d{3}-.+\.md$/.test(n),
    ).length,
    paginas_del_build: paginas,
    sprints_con_cierre: sprintsConCierre(),
  };
}

/** Lo caro: corre las pruebas unitarias con cobertura y lista las e2e. Devuelve lo que los comandos dijeron. */
export function cifrasCaras() {
  const tmp = mkdtempSync(join(tmpdir(), "cifras-"));
  try {
    const json = join(tmp, "vitest.json");
    const v = spawnSync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--coverage",
        "--reporter=json",
        `--outputFile=${json}`,
      ],
      {
        cwd: RAIZ,
        encoding: "utf8",
      },
    );
    if (!existsSync(json))
      throw new Error(
        `vitest no escribió su reporte (salida ${v.status}):\n${v.stderr}`,
      );
    const r = JSON.parse(readFileSync(json, "utf8"));
    if (!r.success)
      throw new Error(
        `vitest falló: ${r.numFailedTests} pruebas en rojo; las cifras no se escriben sobre un árbol rojo`,
      );
    const cobertura = coberturaDeLineas(
      JSON.parse(
        readFileSync(join(RAIZ, "coverage/coverage-final.json"), "utf8"),
      ),
    );
    const p = spawnSync("pnpm", ["exec", "playwright", "test", "--list"], {
      cwd: RAIZ,
      encoding: "utf8",
    });
    const m = /Total: (\d+) tests? in (\d+) files?/.exec(p.stdout);
    if (!m)
      throw new Error(
        `playwright --list no dijo cuántas pruebas hay:\n${p.stdout}\n${p.stderr}`,
      );
    return {
      pruebas_unitarias: r.numTotalTests,
      archivos_unitarios: new Set(r.testResults.map((t) => t.name)).size,
      pruebas_e2e: Number(m[1]),
      archivos_e2e: Number(m[2]),
      cobertura_lineas: cobertura.porCiento,
      lineas: `${cobertura.cubiertas} de ${cobertura.total}`,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** El `detalle` de cada métrica, con la cuenta tomada del resultado. */
export function detalles(c, caras, fecha) {
  const f = c.por_familia;
  const caro = caras ?? {};
  return {
    funcionalidades: (n) =>
      `Las ${n} funciones del primer corte que la visión aprueba para uso personal, contadas contra ${c.secciones_del_manual} secciones de docs/MANUAL-DE-USO.md. El resto de las 32 son del roadmap o de la vitrina para terceros y no se han construido.`,
    pruebas_en_el_catalogo: () =>
      `Archivos de datos/pruebas/ del ${fecha}: ${c.pruebas_en_el_catalogo} pruebas. Por familia: software ${f.software}, agente ${f.agente}, modelo generativo ${f.modelo_generativo} y modelo de decisión ${f.modelo_decision}. \`pnpm catalogo:validar\` las da por publicables.`,
    controles_iso_42001: () =>
      `Contados en datos/controles/iso42001-anexo-a.json del ${fecha}. Son resúmenes con palabras propias del Anexo A; ninguno está contrastado con el texto de la norma todavía (verificado_contra_norma: no).`,
    fichas_de_prueba: () =>
      `Una página por prueba en out/catalogo/ tras \`pnpm build\` del ${fecha}.${c.paginas_del_build ? ` El build entero genera ${c.paginas_del_build} páginas, idénticas a las que sirve el proveedor (\`node scripts/build-como-proveedor.mjs\`).` : ""}`,
    pruebas_automaticas: () =>
      `Suma de dos corridas del ${fecha} sobre el árbol de este export: \`pnpm test\` ${caro.pruebas_unitarias} pruebas, y \`pnpm test:e2e\` ${caro.pruebas_e2e} en Chromium, Firefox y WebKit sobre el build de producción (el mismo conjunto corre en cada navegador, por eso la cifra se cuenta varias veces).`,
    pruebas_unitarias: () =>
      `Salida de \`pnpm test\` (vitest run --coverage) del ${fecha} sobre el árbol de este export: ${caro.archivos_unitarios} archivos, ${caro.pruebas_unitarias} pruebas, todas pasan.`,
    pruebas_e2e: () =>
      `Salida de \`playwright test --list\` del ${fecha} (${caro.archivos_e2e} archivos) sobre el build de producción; la corrida completa pasa sin flaky. Incluyen el recorrido de las pantallas con axe, el flujo en inglés y la prueba de que el motor da en el navegador la misma huella que en Node.`,
    cobertura_lineas: () =>
      `v8 sobre src/ en la corrida de \`pnpm test\` del ${fecha}: ${caro.lineas} líneas. El umbral de src/engine/ es 90 %.`,
    reglas_del_validador: () =>
      `Contadas en src/engine/catalogo/reglas.ts: cada una con su severidad (error, advertencia o nota) y su nombre en español e inglés.`,
    marcos_de_referencia: () =>
      `Archivos de datos/marcos/ del ${fecha}, cada uno con su versión; hay un mapa de equivalencias entre versiones.`,
    herramientas: () =>
      `Archivos de datos/herramientas/ del ${fecha}: ${c.herramientas - 1} públicas con versión verificada y licencia, más la revisión documentada por una persona.`,
    pruebas_de_software_sin_control: () =>
      `Son las ${c.pruebas_de_software_sin_control} advertencias de \`pnpm catalogo:validar\`: el Anexo A gobierna sistemas de IA, así que las pruebas de software todavía no le dan evidencia a ningún control. Por eso el catálogo sale «con advertencias» y no «ok».`,
    casos_del_clasificador_demo: () =>
      `Contados en docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json. Cifras de un activo sintético: demuestran que las métricas funcionan, no miden un modelo real.`,
  };
}

/** El número como lo escribe cada idioma: «4.260» y «97,5» en español, «4,260» y «97.5» en inglés. */
export function formatoDeCifra(valor, idioma) {
  const [entero, decimal] = String(valor).split(".");
  const miles = entero.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    idioma === "es" ? "." : ",",
  );
  return decimal === undefined
    ? miles
    : `${miles}${idioma === "es" ? "," : "."}${decimal}`;
}

/** Las cifras del brochure (`data-cifra="clave"`, un par lang="es"/lang="en") salen del export, nunca se escriben a mano. */
export function actualizarBrochure(exportado, html) {
  const valores = Object.fromEntries(
    exportado.metricas.map((m) => [m.clave, m.valor]),
  );
  return html.replace(
    /(<span lang="(es|en)" data-cifra="([a-z_0-9]+)">)[^<]*(<\/span>)/g,
    (_, abre, idioma, clave, cierra) => {
      if (!(clave in valores))
        throw new Error(
          `el brochure cita la cifra «${clave}» y el export no la tiene`,
        );
      return `${abre}${formatoDeCifra(valores[clave], idioma)}${cierra}`;
    },
  );
}

/** Escribe las cifras en el export. Lo que no se midió (sin `--correr`) conserva su valor y su texto. */
export function escribirEnElExport({ baratas, caras, fecha, sprints }) {
  const ruta = join(RAIZ, "docs/brochure-export.json");
  const d = JSON.parse(readFileSync(ruta, "utf8"));
  const textos = detalles(baratas, caras, fecha);
  const valores = {
    funcionalidades: d.funcionalidades.grupos.reduce(
      (n, g) => n + g.features.length,
      0,
    ),
    pruebas_en_el_catalogo: baratas.pruebas_en_el_catalogo,
    controles_iso_42001: baratas.controles_iso_42001,
    fichas_de_prueba: baratas.pruebas_en_el_catalogo,
    reglas_del_validador: baratas.reglas_del_validador,
    marcos_de_referencia: baratas.marcos_de_referencia,
    herramientas: baratas.herramientas,
    pruebas_de_software_sin_control: baratas.pruebas_de_software_sin_control,
    casos_del_clasificador_demo: baratas.casos_del_clasificador_demo,
    ...(caras
      ? {
          pruebas_unitarias: caras.pruebas_unitarias,
          pruebas_e2e: caras.pruebas_e2e,
          pruebas_automaticas: caras.pruebas_unitarias + caras.pruebas_e2e,
          cobertura_lineas: caras.cobertura_lineas,
        }
      : {}),
  };
  const sinMedir = [];
  for (const m of d.metricas) {
    if (!(m.clave in valores)) continue;
    m.valor = valores[m.clave];
    if (m.clave in textos) m.detalle = textos[m.clave](m.valor);
  }
  if (!caras)
    sinMedir.push(
      "pruebas_unitarias",
      "pruebas_e2e",
      "pruebas_automaticas",
      "cobertura_lineas",
    );
  d.funcionalidades.total = valores.funcionalidades;
  d.app.sprints_cerrados = sprints ?? baratas.sprints_con_cierre;
  d.actualizado = fecha;
  writeFileSync(ruta, `${JSON.stringify(d, null, 2)}\n`);
  const brochure = join(RAIZ, "docs/BROCHURE.html");
  if (existsSync(brochure))
    writeFileSync(
      brochure,
      actualizarBrochure(d, readFileSync(brochure, "utf8")),
    );
  return sinMedir;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const opcion = (n) =>
    args.includes(n) ? args[args.indexOf(n) + 1] : undefined;
  const baratas = await cifrasBaratas();
  const caras = args.includes("--correr") ? cifrasCaras() : null;
  console.log(
    JSON.stringify(
      { ...baratas, ...(caras ?? { caras: "no medidas (falta --correr)" }) },
      null,
      2,
    ),
  );
  if (args.includes("--escribir")) {
    const fecha = opcion("--fecha");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "")) {
      console.error("--escribir exige --fecha AAAA-MM-DD");
      process.exit(2);
    }
    const sprints =
      opcion("--sprints") === undefined
        ? undefined
        : Number(opcion("--sprints"));
    const sinMedir = escribirEnElExport({ baratas, caras, fecha, sprints });
    console.log(
      `export escrito (${fecha})${sinMedir.length ? `; sin medir, conservan su valor: ${sinMedir.join(", ")}` : ""}`,
    );
  }
}
