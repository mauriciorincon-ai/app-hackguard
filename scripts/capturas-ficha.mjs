#!/usr/bin/env node
// Las capturas de la ficha de HackGuard en CV Viva (devolución 026, punto 5): una por funcionalidad del export, del BUILD DE
// PRODUCCIÓN con la fecha de consulta como entrada (nunca el reloj), tema claro, español, ventana de 1024×640 a escala 1,5. Cada toma es
// la caja exacta de una unidad de la pantalla, hallada por su TEXTO (no por un selector frágil), con la navegación oculta y el puntero
// apartado. Usa solo los activos, lotes, hallazgos y propuestas demo sintéticos del repo.
//
//   node scripts/capturas-ficha.mjs --salida <carpeta>            toma las 21 del build que ya está en out/
//   node scripts/capturas-ficha.mjs --salida <carpeta> --construir  construye antes con HACKGUARD_CONSULTA (2026-10-05 por defecto)
//   node scripts/capturas-ficha.mjs --listar                        imprime la tabla (funcionalidad · ruta · ancla) sin abrir nada
//
// El servidor propio escucha en 127.0.0.1 y se cierra al terminar, aunque falle. La salida va en PNG (lo que escribe Playwright); la
// conversión a WebP de la ficha es del paso de entrega, fuera de este repo. `--salida` no puede estar dentro de `datos/`.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const VENTANA = { width: 1024, height: 640 };
export const ESCALA = 1.5;
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
  if (!existsSync(join(RAIZ, "out", "index.html")))
    throw new Error("no hay out/: corre con --construir");

  const { chromium } = await import("@playwright/test");
  const puerto = await puertoLibre();
  const servidor = spawn(
    "pnpm",
    [
      "exec",
      "serve",
      "out",
      "-l",
      `tcp://127.0.0.1:${puerto}`,
      "--config",
      "../serve.json",
    ],
    { cwd: RAIZ, stdio: "ignore" },
  );
  let navegador;
  try {
    const base = `http://127.0.0.1:${puerto}`;
    await esperar(`${base}/tablero`);
    navegador = await chromium.launch();
    const contexto = await navegador.newContext({
      viewport: VENTANA,
      deviceScaleFactor: ESCALA,
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
    const faltantes = [];
    for (const t of TOMAS) {
      const page = await contexto.newPage();
      await page.goto(base + t.ruta);
      await page.evaluate(() =>
        document.documentElement.setAttribute("data-theme", "claro"),
      );
      // La barra de navegación al pie (bajo 1100 px) no entra en ninguna toma; se oculta sin mover nada.
      await page.addStyleTag({
        content: ".hg-lateral { display: none !important; }",
      });
      // Algunas pantallas muestran una unidad a la vez (los lotes de la carga): se pulsa la pestaña que la trae.
      if (t.pulsar)
        await page
          .getByRole("button", { name: new RegExp(t.pulsar) })
          .first()
          .click();
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
      await unidad.screenshot({ path: join(resolve(salida), `${t.f}.png`) });
      await page.close();
      console.log(`${t.f}  ${t.ruta}`);
    }
    if (faltantes.length)
      throw new Error(`sin unidad para: ${faltantes.join(" · ")}`);
  } finally {
    await navegador?.close();
    servidor.kill();
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
