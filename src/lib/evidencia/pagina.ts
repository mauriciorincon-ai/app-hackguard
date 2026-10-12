// Lo que comparten las páginas de hallazgo: la instantánea oficial, los activos (para nombrarlos), el libro con sus
// hallazgos y la fecha de consulta (HACKGUARD_CONSULTA, o la fecha del commit; jamás el reloj). Solo corre en el build.
import { cargarActivosDelBuild } from "../activos/cargar.ts";
import { cargarInstantaneaOficial } from "../catalogo/cargar-instantanea.ts";
import { fechaDeConsulta } from "../catalogo/consulta.ts";
import { fechaDelCommit } from "../catalogo/fecha-del-commit.ts";
import { cargarHallazgosDelBuild } from "./cargar.ts";

export async function cargarParaPaginaDeHallazgo() {
  const { instantanea, nombre } = await cargarInstantaneaOficial();
  const consulta = fechaDeConsulta(
    instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  const activos = await cargarActivosDelBuild(instantanea);
  const mundo = await cargarHallazgosDelBuild(instantanea);
  return { instantanea, nombre, consulta, activos, mundo };
}

export async function idsDeHallazgos(): Promise<string[]> {
  const { mundo } = await cargarParaPaginaDeHallazgo();
  return mundo.hallazgos.map((h) => h.id);
}
