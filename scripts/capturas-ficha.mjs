#!/usr/bin/env node
// Las capturas de la ficha de HackGuard en CV Viva (devolución 026, punto 5): una por funcionalidad del export, del BUILD DE
// PRODUCCIÓN con la fecha de consulta como entrada (nunca el reloj), tema claro, español, ventana de 1024×640 a escala 1,5. Cada toma es
// la caja exacta de una unidad de la pantalla, hallada por su TEXTO (no por un selector frágil), con la navegación oculta y el puntero
// apartado. Usa solo los activos, lotes, hallazgos y propuestas demo sintéticos del repo.
//
//   node scripts/capturas-ficha.mjs --salida <carpeta>            toma las del build que ya está en out/ (y las del modo público y el paquete, si están armados)
//   node scripts/capturas-ficha.mjs --salida <carpeta> --construir  construye antes con HACKGUARD_CONSULTA (2026-10-05 por defecto)
//   node scripts/capturas-ficha.mjs --listar                        imprime la tabla (funcionalidad · ruta · ancla) sin abrir nada
//
// Cada pieza se captura a DPR 3 y se compone centrada en un lienzo de 1024×640 CSS (1536×960 a escala 1,5) con el fondo del `body` de
// la app, con s = min(944/w, 560/h, 2). Los servidores propios escuchan en 127.0.0.1 y se cierran al terminar, aunque falle. La salida va
// en PNG; la conversión a WebP (calidad 80, ≤ 80 KB) es del paso de entrega. `--salida` no puede estar dentro de `datos/`.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const VENTANA = { width: 1024, height: 640 };
export const ESCALA = 1.5;
/** La pieza se captura a más resolución de la que se entrega, para que la ampliación del lienzo no la desenfoque. */
export const CAPTURA_DPR = 3;
/** Escala mínima legible: una pieza más alta que 560 / 0,75 px se recorta por abajo (se ve su parte de arriba, como en las primeras tomas). */
export const ESCALA_MINIMA = 0.75;
export const CONSULTA_POR_DEFECTO = "2026-10-05";

/** Una toma por funcionalidad: la ruta, el texto que ancla la unidad y el contenedor que la encierra. */
export const TOMAS = [
  {
    f: "F01",
    ruta: "/catalogo/PR-AG-HERR-001",
    ancla: "Cómo se decide el veredicto",
    dentro: "section",
  },
  {
    f: "F02",
    ruta: "/catalogo/propuestas",
    ancla: "PROP-0034",
    dentro: "[data-propuesta]",
  },
  {
    f: "F03",
    ruta: "/catalogo",
    ancla: "Vigencia por familia",
    dentro: "section",
  },
  {
    f: "F04",
    ruta: "/catalogo/marcos",
    ancla: "Mapa de equivalencias",
    dentro: "section",
  },
  {
    f: "F05",
    ruta: "/catalogo/controles",
    ancla: "Áreas del Anexo A",
    dentro: "section",
  },
  { f: "F06", ruta: "/catalogo", ancla: "Pruebas", dentro: "main" },
  {
    f: "F07",
    ruta: "/catalogo/propuestas",
    ancla: "PROP-0031",
    dentro: "[data-propuesta]",
  },
  {
    f: "F08",
    ruta: "/activos/act-demo-portal",
    ancla: "Reglas de enfrentamiento",
    dentro: "main",
  },
  {
    f: "F09",
    ruta: "/activos/act-demo-asistente/plan",
    ancla: "Pruebas planeadas",
    dentro: "section",
  },
  {
    f: "F10",
    ruta: "/activos/act-demo-asistente/plan",
    ancla: "Paquete de ejecución",
    dentro: "section",
  },
  { f: "F11", ruta: "/evidencia/carga", ancla: "LOTE-0007", dentro: "section" },
  {
    f: "F12",
    ruta: "/evidencia/hallazgos/HZ-0003",
    ancla: "Cerrado por re-prueba",
    dentro: "main",
  },
  {
    f: "F13",
    ruta: "/evidencia/hallazgos/HZ-0009",
    ancla: "Severidad",
    dentro: "section",
  },
  {
    f: "F14",
    ruta: "/evidencia/carga",
    ancla: "LOTE-0008",
    dentro: "section",
    pulsar: "LOTE-0008",
    primero: true,
  },
  {
    f: "F15",
    ruta: "/catalogo/propuestas",
    ancla: "PROP-0036",
    dentro: "[data-propuesta]",
  },
  { f: "F16", ruta: "/brecha", ancla: "Cobertura", dentro: "section" },
  {
    f: "F17",
    ruta: "/brecha/control/iso42001-a-6-2-6",
    ancla: "Con fallas",
    dentro: "main",
  },
  {
    f: "F18",
    ruta: "/tablero",
    ancla: "El instrumento pasó su validación",
    dentro: ".hg-sello",
  },
  {
    f: "F19",
    ruta: "/catalogo/diferencias",
    ancla: "Lo que entra, lo que sale y lo que cambia",
    dentro: "main",
  },
  {
    f: "F20",
    ruta: "/activos/act-demo-clasificador/historial",
    ancla: "El plan se emitió con esta versión",
    dentro: "main",
  },
  {
    f: "F21",
    ruta: "/activos/act-demo-clasificador/re-planear",
    ancla: "Re-planear: qué cambiaría en el plan",
    dentro: "main",
  },
  {
    f: "F22",
    ruta: "/evidencia/hallazgos/HZ-0011",
    ancla: "Reabierto por una re-prueba que volvió a fallar",
    dentro: "main",
  },
  {
    f: "F23",
    ruta: "/evidencia/carga",
    ancla: "Texto de la herramienta",
    dentro: "main",
    pulsar: "Texto pegado",
  },
  {
    f: "F24",
    ruta: "/brecha/tendencia",
    ancla: "Control por control",
    dentro: "main",
  },
  // S12: promptfoo, PyRIT e Inspect entran por la misma pantalla del texto pegado (la herramienta se elige en ella).
  // Cada una elige SU herramienta y pega su archivo sintético del kit: lo que se ve es lo que el adaptador propone, no el formulario vacío.
  {
    f: "F25",
    ruta: "/evidencia/carga",
    ancla: "El sobre propuesto",
    dentro: "[data-pegado-resultado]",
    pulsar: "Texto pegado",
    herramienta: "promptfoo",
    texto: "tests/fixtures/adaptadores/promptfoo-0.123.1.sintetico.json",
  },
  {
    f: "F26",
    ruta: "/evidencia/carga",
    ancla: "El sobre propuesto",
    dentro: "[data-pegado-resultado]",
    pulsar: "Texto pegado",
    herramienta: "inspect",
    texto: "tests/fixtures/adaptadores/inspect-0.3.288.sintetico.json",
  },
  {
    f: "F27",
    ruta: "/evidencia/hallazgos/HZ-0003",
    ancla: "Descargar para DefectDojo",
    dentro: "[data-exportar]",
  },
  // El ejecutor no tiene pantalla (la web no ejecuta nada): su toma es la negativa de la página de presentación.
  {
    f: "F28",
    ruta: "/conoce",
    ancla: "No ataca por su cuenta",
    dentro: "li",
  },
  // S13. D2: se suelta la ficha demo y se ve la propuesta con su cita (las filas sin responder se ocultan en la toma: la cabecera
  // las cuenta). D12: la capa propia aparte de la norma. C19 y C20 se toman de lo que ellas arman: la exportación pública y el paquete.
  {
    f: "F29",
    ruta: "/activos/desde-ficha",
    ficha: "datos/fichas/demo/ficha-demo-asistente.json",
    ancla: "rasgos propuestos",
    dentro: "main",
    ocultar: 'tr[data-estado="sin_responder"]',
  },
  {
    f: "F30",
    ruta: "/catalogo/controles",
    ancla: "Capa propia",
    dentro: "[data-capa=propia]",
  },
  {
    f: "F31",
    origen: "publico",
    ruta: "/brecha",
    ancla: "Cobertura",
    dentro: "section",
  },
  {
    f: "F32",
    origen: "paquete",
    ruta: "/piezas/hackguard/catalogo.html",
    ancla: "Vigencia por familia",
    dentro: "section",
  },
];

/** `--salida` no puede caer en `datos/` (regla 17-bis: un derivado jamás nace menos privado que su fuente). */
export function salidaPermitida(salida) {
  const rel = relative(join(RAIZ, "datos"), resolve(salida));
  return rel.startsWith("..") || isAbsolute(rel);
}

function puertoLibre() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.once("error", rej);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

async function esperar(url, intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`el servidor no respondió en ${url}`);
}

async function main() {
  const args = process.argv.slice(2);
  const opcion = (n) =>
    args.includes(n) ? args[args.indexOf(n) + 1] : undefined;
  if (args.includes("--listar")) {
    for (const t of TOMAS)
      console.log(`${t.f}\t${t.ruta}\t«${t.ancla}»\t${t.dentro}`);
    return;
  }
  const salida = opcion("--salida");
  if (!salida) throw new Error("falta --salida <carpeta>");
  if (!salidaPermitida(salida))
    throw new Error("--salida no puede estar dentro de datos/");
  mkdirSync(resolve(salida), { recursive: true });

  if (args.includes("--construir")) {
    const consulta = opcion("--consulta") ?? CONSULTA_POR_DEFECTO;
    const r = spawnSync("pnpm", ["build"], {
      cwd: RAIZ,
      stdio: "inherit",
      env: { ...process.env, HACKGUARD_CONSULTA: consulta },
    });
    if (r.status !== 0) throw new Error("el build de producción falló");
  }
  const origenes = new Set(TOMAS.map((t) => t.origen ?? "app"));
  const carpetas = {
    app: join(RAIZ, "out", "index.html"),
    publico: join(RAIZ, "dist", "publico", "index.html"),
    paquete: join(RAIZ, "dist", "paquete-hoja-de-vida", "manifiesto.json"),
  };
  if (args.includes("--construir")) {
    const consulta = opcion("--consulta") ?? CONSULTA_POR_DEFECTO;
    for (const orden of ["build:publico", "paquete:vitrina"]) {
      const r = spawnSync("pnpm", [orden], {
        cwd: RAIZ,
        stdio: "inherit",
        env: { ...process.env, HACKGUARD_CONSULTA: consulta },
      });
      if (r.status !== 0) throw new Error(`${orden} falló`);
    }
  }
  for (const o of origenes)
    if (!existsSync(carpetas[o]))
      throw new Error(`no hay ${carpetas[o]}: corre con --construir`);

  const { chromium } = await import("@playwright/test");
  const servidores = [];
  const servir = async (argumentos, sonda) => {
    const puerto = await puertoLibre();
    servidores.push(
      spawn(
        "pnpm",
        ["exec", "serve", ...argumentos, "-l", `tcp://127.0.0.1:${puerto}`],
        { cwd: RAIZ, stdio: "ignore" },
      ),
    );
    const base = `http://127.0.0.1:${puerto}`;
    await esperar(`${base}${sonda}`);
    return base;
  };
  let navegador;
  try {
    const bases = {};
    if (origenes.has("app"))
      bases.app = await servir(
        ["out", "--config", "../serve.json"],
        "/tablero",
      );
    if (origenes.has("publico"))
      bases.publico = await servir(["dist/publico"], "/catalogo");
    if (origenes.has("paquete"))
      bases.paquete = await servir(
        ["-c", "tests/e2e-paquete/serve.json"],
        "/piezas/hackguard/index.html",
      );
    navegador = await chromium.launch();
    const contexto = await navegador.newContext({
      viewport: VENTANA,
      deviceScaleFactor: CAPTURA_DPR,
      // `/conoce` lleva su propia política de estilos: la toma oculta la navegación con un estilo propio y no cambia nada visible.
      bypassCSP: true,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await contexto.addInitScript(() => {
      try {
        localStorage.setItem("hackguard:tema", "claro");
        localStorage.setItem("hackguard:idioma", "es");
      } catch {
        /* sin almacenamiento */
      }
    });
    const lienzo = await navegador.newContext({
      viewport: VENTANA,
      deviceScaleFactor: ESCALA,
    });
    const faltantes = [];
    const solo = opcion("--solo")?.split(",");
    for (const t of TOMAS) {
      if (solo && !solo.includes(t.f)) continue;
      const page = await contexto.newPage();
      await page.goto(bases[t.origen ?? "app"] + t.ruta);
      await page.evaluate(() =>
        document.documentElement.setAttribute("data-theme", "claro"),
      );
      // La barra de navegación al pie (bajo 1100 px) no entra en ninguna toma; se oculta sin mover nada.
      await page.addStyleTag({
        content: ".hg-lateral { display: none !important; }",
      });
      // D2: la ficha se elige en la página, como lo haría la persona; no sube nada.
      if (t.ficha) {
        await page
          .locator("[data-ficha-entrada]")
          .setInputFiles(join(RAIZ, t.ficha));
        await page.locator("[data-ficha-leida]").waitFor();
      }
      if (t.ocultar)
        await page.addStyleTag({
          content: `${t.ocultar} { display: none !important; }`,
        });
      // Algunas pantallas muestran una unidad a la vez (los lotes de la carga): se pulsa la pestaña que la trae.
      if (t.pulsar)
        await page
          .getByRole("button", { name: new RegExp(t.pulsar) })
          .first()
          .click();
      // La herramienta se elige en la lista y su archivo del kit se pega, como lo haría la persona; solo se lee en la página.
      if (t.herramienta) {
        await page.locator("#pegado-herramienta").selectOption(t.herramienta);
        await page
          .locator("#pegado-texto")
          .fill(
            readFileSync(join(RAIZ, t.texto), "utf8").replaceAll(
              "2026-10-12",
              "2026-10-02",
            ),
          );
        await page.locator("[data-proponer]").click();
        await page.locator("[data-pegado-resultado]").waitFor();
      }
      const unidad = page
        .locator(`${t.dentro}:visible`)
        .filter({ has: page.getByText(t.ancla, { exact: false }) })
        [t.primero ? "first" : "last"]();
      if ((await unidad.count()) === 0) {
        faltantes.push(`${t.f} (${t.ruta} · «${t.ancla}»)`);
        await page.close();
        continue;
      }
      await page.mouse.move(0, 0);
      const fondo = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );
      const caja = await unidad.boundingBox();
      const pieza = await unidad.screenshot();
      await page.close();
      const alto = Math.min(caja.height, 560 / ESCALA_MINIMA);
      const s = Math.min(944 / caja.width, 560 / alto, 2);
      const recortada = alto < caja.height;
      const hoja = await lienzo.newPage();
      await hoja.setContent(
        `<body style="margin:0;width:${VENTANA.width}px;height:${VENTANA.height}px;background:${fondo};display:grid;place-items:center;overflow:hidden">` +
          `<div style="width:${caja.width * s}px;height:${alto * s}px;overflow:hidden;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.18)">` +
          `<img alt="" style="display:block;width:${caja.width * s}px;height:${caja.height * s}px" src="data:image/png;base64,${pieza.toString("base64")}"></div></body>`,
      );
      await hoja.screenshot({ path: join(resolve(salida), `${t.f}.png`) });
      await hoja.close();
      console.log(
        `${t.f}  ${t.ruta}  s=${s.toFixed(2)}${recortada ? "  (recortada abajo)" : ""}${s < 0.6 ? "  ⚠ bajo 0,6" : ""}`,
      );
    }
    if (faltantes.length)
      throw new Error(`sin unidad para: ${faltantes.join(" · ")}`);
  } finally {
    await navegador?.close();
    for (const sv of servidores) sv.kill();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
