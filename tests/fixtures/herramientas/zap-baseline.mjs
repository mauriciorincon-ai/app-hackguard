// ZAP SIMULADO (ver _simulada.mjs): `zap-baseline.py -t <objetivo> -J <salida>`. Lo lanza el envoltorio `zap-baseline.py`.
import { despues, simular } from "./_simulada.mjs";

const a = process.argv.slice(2);
await simular({
  nombre: "zap",
  objetivo: despues(a, "-t"),
  config: undefined,
  salida: despues(a, "-J"),
});
