// Arnés de capturas de la maqueta, con PASADA DE INTERACCIÓN (regla 22).
//
//   pnpm capturas:maqueta --salida <dir fuera del repo> [--paginas index,kit] [--anchos 380,1280] [--simular]
//
// Sirve docs/diseno/ bajo /diseno/ en un puerto libre y entra POR EL ÍNDICE, como el usuario (no por
// file://). Por cada página × tema × idioma × ancho × estado de sala: mide desborde horizontal y guarda
// la captura. Una vez por página: activa cada control y exige que el DOM cambie. Con --simular añade
// las vistas de daltonismo (deuteranopía, protanopía, tritanopía, acromatopsia).
//
// Declara el árbol que lee (regla 17-bis b): SOLO docs/diseno/ de este repo — datos sintéticos; el
// servidor no alcanza datos/privado/ ni nada fuera de la maqueta. Las capturas no se versionan: la
// salida es obligatoria y aborta si cae dentro del repo.
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { desbordes, pasadaDeInteraccion } from "./maqueta/arnes/sondas.mjs";
import { MAQUETA, RAIZ } from "./maqueta/rutas.mjs";

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(`--${nombre}`);
  return i === -1 ? undefined : args[i + 1];
};

const salida = opcion("salida") && resolve(opcion("salida"));
if (!salida) {
  console.error("capturas: falta --salida <dir> (fuera del repo; las capturas no se versionan).");
  process.exit(2);
}
if ((salida + sep).startsWith(RAIZ + sep)) {
  console.error(`capturas: la salida cae dentro del repo (${salida}); aborto.`);
  process.exit(2);
}
if (!existsSync(join(MAQUETA, "index.html"))) {
  console.error(`capturas: no hay maqueta en ${MAQUETA}; corre «pnpm maqueta».`);
  process.exit(2);
}

const paginas = (opcion("paginas")?.split(",").map((p) => `${p}.html`) ?? readdirSync(MAQUETA).filter((f) => f.endsWith(".html"))).sort();
const anchos = (opcion("anchos") ?? "380,1280").split(",").map(Number);
const simular = args.includes("--simular");
const TEMAS = ["oscuro", "claro"];
const IDIOMAS = ["es", "en"];
const VISIONES = ["deuteranopia", "protanopia", "tritanopia", "achromatopsia"];
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain" };

console.log(`capturas: árbol = ${MAQUETA} (maqueta con datos sintéticos; nada fuera de esa carpeta)`);
console.log(`capturas: salida = ${salida}`);

const servidor = createServer((peticion, respuesta) => {
  const ruta = decodeURIComponent(new URL(peticion.url, "http://x").pathname);
  if (ruta === "/diseno" || ruta === "/diseno/") {
    respuesta.writeHead(307, { Location: "/diseno/index.html" }).end();
    return;
  }
  const archivo = normalize(join(MAQUETA, ruta.replace(/^\/diseno\//, "")));
  if (!ruta.startsWith("/diseno/") || !(archivo + sep).startsWith(MAQUETA + sep) || !existsSync(archivo) || !statSync(archivo).isFile()) {
    respuesta.writeHead(404).end("no encontrado");
    return;
  }
  respuesta.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] ?? "application/octet-stream" }).end(readFileSync(archivo));
});
await new Promise((listo) => servidor.listen(0, "127.0.0.1", listo));
const base = `http://127.0.0.1:${servidor.address().port}`;

const registro = { arbol: MAQUETA, capturas: 0, interacciones: {}, fallas: [] };
const navegador = await chromium.launch();

async function abrir(contexto, pagina) {
  const hoja = await contexto.newPage();
  hoja.on("console", (m) => m.type() === "error" && registro.fallas.push(`${pagina}: error en consola: ${m.text()}`));
  hoja.on("pageerror", (e) => registro.fallas.push(`${pagina}: excepción: ${e.message}`));
  const respuesta = await hoja.goto(`${base}/diseno`);
  if (respuesta.status() !== 200) registro.fallas.push(`el índice respondió ${respuesta.status()}`);
  if (pagina !== "index.html") {
    const enlace = hoja.locator(`a[href="${pagina}"]`).first();
    if ((await enlace.count()) === 0) {
      registro.fallas.push(`${pagina}: el índice no enlaza a esta página (no se llega caminando)`);
      await hoja.goto(`${base}/diseno/${pagina}`);
    } else {
      await enlace.click();
      await hoja.waitForURL(`**/diseno/${pagina}`);
    }
  }
  return hoja;
}

try {
  mkdirSync(salida, { recursive: true });
  for (const pagina of paginas) {
    const nombre = pagina.replace(/\.html$/, "");

    for (const tema of TEMAS) {
      for (const idioma of IDIOMAS) {
        for (const ancho of anchos) {
          const contexto = await navegador.newContext({ viewport: { width: ancho, height: 900 }, deviceScaleFactor: 2 });
          await contexto.addInitScript(
            ([t, i]) => {
              localStorage.setItem("hg-maqueta-v0:tema", t);
              localStorage.setItem("hg-maqueta-v0:idioma", i);
            },
            [tema, idioma],
          );
          const hoja = await abrir(contexto, pagina);
          const estados = await hoja.locator('[data-controlador="estado"]').evaluateAll((els) => els.map((el) => el.getAttribute("data-valor")));
          for (const estado of estados.length ? estados : [null]) {
            if (estado) await hoja.locator(`[data-controlador="estado"][data-valor="${estado}"]`).click();
            const etiqueta = [nombre, tema, idioma, ancho, estado].filter(Boolean).join("__");
            for (const d of await desbordes(hoja)) registro.fallas.push(`${etiqueta}: desborde → ${d}`);
            await hoja.screenshot({ path: join(salida, `${etiqueta}.png`), fullPage: true, animations: "disabled" });
            registro.capturas += 1;
          }
          await contexto.close();
        }
      }
    }

    const contexto = await navegador.newContext({ viewport: { width: 380, height: 900 } });
    const hoja = await abrir(contexto, pagina);
    const { fallas, activados } = await pasadaDeInteraccion(hoja);
    registro.interacciones[pagina] = activados;
    if (activados === 0) registro.fallas.push(`${pagina}: la pasada de interacción no activó ningún control`);
    for (const f of fallas) registro.fallas.push(`${pagina}: ${f}`);
    await contexto.close();

    if (simular) {
      for (const vision of VISIONES) {
        for (const tema of TEMAS) {
          const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
          await contexto.addInitScript((t) => localStorage.setItem("hg-maqueta-v0:tema", t), tema);
          const hoja = await abrir(contexto, pagina);
          const cdp = await contexto.newCDPSession(hoja);
          await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: vision });
          await hoja.screenshot({ path: join(salida, `${nombre}__${tema}__${vision}.png`), fullPage: true, animations: "disabled" });
          registro.capturas += 1;
          await contexto.close();
        }
      }
    }
  }
} finally {
  await navegador.close();
  await new Promise((cerrado) => servidor.close(cerrado));
}

writeFileSync(join(salida, "registro.json"), JSON.stringify(registro, null, 2) + "\n");
console.log(`capturas: ${registro.capturas} captura(s) · controles activados por página: ${JSON.stringify(registro.interacciones)}`);
if (registro.fallas.length) {
  console.error(`capturas: ${registro.fallas.length} falla(s):\n  - ${registro.fallas.join("\n  - ")}`);
  process.exit(1);
}
console.log("capturas: sin fallas.");
