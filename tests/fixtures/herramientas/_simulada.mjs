// Núcleo de las herramientas SIMULADAS de las pruebas del ejecutor (S12, D11): no son promptfoo, garak ni ZAP, no atacan nada y no
// traen ninguna carga. Hacen tres cosas, para que la prueba pueda comprobar lo que de verdad pasó: (1) dejan en el servidor local
// de la prueba UNA petición GET al objetivo que recibieron (`HACKGUARD_OBJETIVO` o `-t`), con su nombre en la cabecera; (2) copian
// a donde se les pidió el reporte sintético de `tests/fixtures/adaptadores/` (HG_FIXTURE); (3) con HG_FALLA terminan con error y
// con HG_SIN_SALIDA terminan bien sin dejar el archivo. Reciben la configuración del usuario y la leen, para probar que se usó.
// Más, para probar al ejecutor: HG_CODIGO_SALIDA (terminan con ese código DESPUÉS de dejar el archivo, como ZAP con 2 o promptfoo
// con 100), HG_STDERR (escriben ese texto en stderr), HG_VOLCADO (escriben ahí los NOMBRES de las variables de entorno que
// recibieron, nunca los valores), HG_NIETO (lanzan un hijo dormido y escriben ahí su pid) y HG_DORMIR (no terminan).
import { spawn } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";

export async function simular({ nombre, objetivo, config, salida }) {
  if (process.env.HG_STDERR) process.stderr.write(`${process.env.HG_STDERR}\n`);
  if (process.env.HG_FALLA === "1") {
    process.stderr.write(`${nombre}: fallo simulado\n`);
    process.exit(3);
  }
  if (process.env.HG_VOLCADO)
    writeFileSync(
      process.env.HG_VOLCADO,
      JSON.stringify(Object.keys(process.env)),
    );
  if (config !== undefined) readFileSync(config, "utf8");
  await new Promise((resolver) => {
    const pedido = http.get(
      objetivo,
      { headers: { "x-herramienta": nombre } },
      (r) => {
        r.resume();
        r.on("end", resolver);
      },
    );
    pedido.on("error", resolver);
  });
  if (process.env.HG_NIETO) {
    const nieto = spawn(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      {
        stdio: "ignore",
      },
    );
    writeFileSync(process.env.HG_NIETO, String(nieto.pid));
  }
  if (process.env.HG_DORMIR === "1")
    await new Promise(() => setInterval(() => {}, 1000));
  if (process.env.HG_SIN_SALIDA !== "1" && salida !== undefined)
    copyFileSync(process.env.HG_FIXTURE, salida);
  if (process.env.HG_CODIGO_SALIDA)
    process.exit(Number(process.env.HG_CODIGO_SALIDA));
}

export const despues = (argumentos, bandera) => {
  const i = argumentos.indexOf(bandera);
  return i === -1 ? undefined : argumentos[i + 1];
};
