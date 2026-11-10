// Núcleo de las herramientas SIMULADAS de las pruebas del ejecutor (S12, D11): no son promptfoo, garak ni ZAP, no atacan nada y no
// traen ninguna carga. Hacen tres cosas, para que la prueba pueda comprobar lo que de verdad pasó: (1) dejan en el servidor local
// de la prueba UNA petición GET al objetivo que recibieron (`HACKGUARD_OBJETIVO` o `-t`), con su nombre en la cabecera; (2) copian
// a donde se les pidió el reporte sintético de `tests/fixtures/adaptadores/` (HG_FIXTURE); (3) con HG_FALLA terminan con error y
// con HG_SIN_SALIDA terminan bien sin dejar el archivo. Reciben la configuración del usuario y la leen, para probar que se usó.
import { copyFileSync, readFileSync } from "node:fs";
import http from "node:http";

export async function simular({ nombre, objetivo, config, salida }) {
  if (process.env.HG_FALLA === "1") {
    process.stderr.write(`${nombre}: fallo simulado\n`);
    process.exit(3);
  }
  if (config !== undefined) readFileSync(config, "utf8");
  await new Promise((resolver) => {
    const pedido = http.get(objetivo, { headers: { "x-herramienta": nombre } }, (r) => {
      r.resume();
      r.on("end", resolver);
    });
    pedido.on("error", resolver);
  });
  if (process.env.HG_SIN_SALIDA === "1") return;
  if (salida !== undefined) copyFileSync(process.env.HG_FIXTURE, salida);
}

export const despues = (argumentos, bandera) => {
  const i = argumentos.indexOf(bandera);
  return i === -1 ? undefined : argumentos[i + 1];
};
