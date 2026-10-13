import { Consola } from "@/components/consola/consola";
import { MarcosPantalla } from "@/components/marcos/marcos-pantalla";
import {
  cargarInstantaneaOficial,
  listarInstantaneas,
} from "@/lib/catalogo/cargar-instantanea";
import { fechaDeConsulta } from "@/lib/catalogo/consulta";
import { fechaDelCommit } from "@/lib/catalogo/fecha-del-commit";
import { construirVistaDeMarcos } from "@/lib/catalogo/marcos";
import { etiquetaDePropuesta } from "@/lib/propuestas/etiquetas";
import { cargarMundoDePropuestas } from "@/lib/propuestas/pagina";
import { resumenDePropuestas } from "@/lib/propuestas/resumen";
import { titulo } from "@/lib/titulo";

export const metadata = titulo("Marcos y versiones", "Frameworks and versions");

// «Marcos y versiones» se arma en el build desde la instantánea OFICIAL, igual que la lista de pruebas: misma fecha de
// consulta (HACKGUARD_CONSULTA, o la fecha del commit) y jamás el reloj.
export default async function Marcos() {
  const { instantanea, nombre } = await cargarInstantaneaOficial();
  const consulta = fechaDeConsulta(
    instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  // Los avisos de versión salen de las propuestas del investigador: la misma cuenta de la bandeja, el tablero y la brecha.
  const propuestas = await cargarMundoDePropuestas();
  const vista = construirVistaDeMarcos(
    instantanea,
    nombre,
    consulta,
    listarInstantaneas(),
    {
      resumen: resumenDePropuestas(propuestas),
      etiquetaDeAviso: etiquetaDePropuesta(
        propuestas.etiquetas,
        "aviso_de_version",
      ),
    },
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
