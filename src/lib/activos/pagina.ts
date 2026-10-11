// Lo que comparten las páginas de activo, de plan y la descarga del paquete: la instantánea oficial, los activos con sus
// planes comprobados y la fecha de consulta (HACKGUARD_CONSULTA, o la fecha del commit; jamás el reloj). Solo corre en el
// build (Node).
import { cargarInstantaneaOficial } from "../catalogo/cargar-instantanea.ts";
import { fechaDeConsulta } from "../catalogo/consulta.ts";
import { fechaDelCommit } from "../catalogo/fecha-del-commit.ts";
import { cargarActivosDelBuild } from "./cargar.ts";

export async function cargarParaPagina() {
  const { instantanea, nombre } = await cargarInstantaneaOficial();
  const consulta = fechaDeConsulta(
    instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  const mundo = await cargarActivosDelBuild(instantanea);
  return { instantanea, nombre, consulta, mundo };
}

export async function idsDeActivos(): Promise<string[]> {
  const { mundo } = await cargarParaPagina();
  return mundo.activos.map((a) => a.activo.id);
}
