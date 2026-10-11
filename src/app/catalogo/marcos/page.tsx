import { Consola } from "@/components/consola/consola";
import { MarcosPantalla } from "@/components/marcos/marcos-pantalla";
import {
  cargarInstantaneaOficial,
  listarInstantaneas,
} from "@/lib/catalogo/cargar-instantanea";
import { fechaDeConsulta } from "@/lib/catalogo/consulta";
import { fechaDelCommit } from "@/lib/catalogo/fecha-del-commit";
import { construirVistaDeMarcos } from "@/lib/catalogo/marcos";

// «Marcos y versiones» se arma en el build desde la instantánea OFICIAL, igual que la lista de pruebas: misma fecha de
// consulta (HACKGUARD_CONSULTA, o la fecha del commit) y jamás el reloj.
export default async function Marcos() {
  const { instantanea, nombre } = await cargarInstantaneaOficial();
  const consulta = fechaDeConsulta(
    instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  const vista = construirVistaDeMarcos(
    instantanea,
    nombre,
    consulta,
    listarInstantaneas(),
  );
  return (
    <Consola
      seccion="catalogo"
      pagina="/catalogo/marcos"
      migas={[
        { es: "Catálogo", en: "Catalog" },
        { es: "Marcos", en: "Frameworks" },
      ]}
      cuenta={instantanea.catalogo.pruebas.length}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <MarcosPantalla vista={vista} />
    </Consola>
  );
}
