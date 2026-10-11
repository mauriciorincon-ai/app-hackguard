// El mundo de los activos para los gates de fidelidad y de envejecimiento: la instantánea oficial, los activos con sus planes
// ya comprobados y las vistas de las dos pantallas en una fecha de consulta.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Instantanea } from "../../../src/engine/catalogo/instantanea.ts";
import { cargarActivosDelBuild } from "../../../src/lib/activos/cargar.ts";
import {
  construirVistaDeActivo,
  construirVistaDePlan,
} from "../../../src/lib/activos/vista.ts";

const RAIZ = process.cwd();
const archivo = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;
export const instantanea = JSON.parse(
  readFileSync(join(RAIZ, "datos", "instantaneas", archivo), "utf8"),
) as Instantanea;
export const nombreDeLaInstantanea = archivo.replace(/\.json$/, "");
export const mundo = await cargarActivosDelBuild(instantanea, RAIZ);
export const IDS = mundo.activos.map((a) => a.activo.id);

export const vistaDeActivo = (
  id: string,
  consulta = instantanea.fecha_evaluacion,
) =>
  construirVistaDeActivo(
    id,
    mundo,
    instantanea,
    nombreDeLaInstantanea,
    consulta,
  );
export const vistaDePlan = (
  id: string,
  consulta = instantanea.fecha_evaluacion,
) =>
  construirVistaDePlan(id, mundo, instantanea, nombreDeLaInstantanea, consulta);
