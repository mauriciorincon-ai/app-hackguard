import { Consola } from "@/components/consola/consola";
import { ControlesPantalla } from "@/components/controles/controles-pantalla";
import { cargarInstantaneaOficial } from "@/lib/catalogo/cargar-instantanea";
import { fechaDeConsulta } from "@/lib/catalogo/consulta";
import { fechaDelCommit } from "@/lib/catalogo/fecha-del-commit";
import { construirVistaDeControles } from "@/lib/catalogo/controles";

// «Controles» se arma en el build desde la instantánea OFICIAL: la capa por defecto del Anexo A y las pruebas que le dan
// evidencia a cada control. Misma fecha de consulta que el resto de las pantallas.
export default async function Controles() {
  const { instantanea, nombre } = await cargarInstantaneaOficial();
  const consulta = fechaDeConsulta(
    instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  const vista = construirVistaDeControles(instantanea, nombre, consulta);
  return (
    <Consola
      seccion="catalogo"
      pagina="/catalogo/controles"
      migas={[
        { es: "Catálogo", en: "Catalog" },
        { es: "Controles", en: "Controls" },
      ]}
      cuenta={instantanea.catalogo.pruebas.length}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <ControlesPantalla vista={vista} />
    </Consola>
  );
}
