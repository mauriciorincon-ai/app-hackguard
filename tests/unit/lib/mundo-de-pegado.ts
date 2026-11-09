// El mundo del texto pegado para los tests: el mismo que arma el build a partir de los datos demo ya cargados, y los archivos de
// herramienta que el repositorio ya versiona (fixtures de los adaptadores) leídos como texto, tal como se pegarían.
import { readFileSync } from "node:fs";
import path from "node:path";
import { construirMundoDePegado } from "../../../src/lib/evidencia/pegado-mundo.ts";
import type { MundoDePegado } from "../../../src/lib/evidencia/pegado.ts";
import {
  activos,
  instantanea,
  mundoDeHallazgos,
  umbralesDeBrecha,
} from "./mundo-de-brecha";

export const mundoDePegado = (
  consulta: string = instantanea.fecha_evaluacion,
): MundoDePegado =>
  construirMundoDePegado(
    instantanea,
    activos,
    mundoDeHallazgos,
    umbralesDeBrecha,
    consulta,
  );

const FIXTURES = path.join(process.cwd(), "tests/fixtures/adaptadores");
export const textoDeFixture = (nombre: string): string =>
  readFileSync(path.join(FIXTURES, nombre), "utf8");

export const GARAK = "garak-0.17.0.report.redactado.jsonl";
export const ZAP = "zap-traditional-json.oficial.json";
