import { Consola } from "@/components/consola/consola";
import { CatalogoPantalla } from "@/components/catalogo/catalogo-pantalla";
import { cargarInstantaneaOficial } from "@/lib/catalogo/cargar-instantanea";
import { fechaDeConsulta } from "@/lib/catalogo/consulta";
import { fechaDelCommit } from "@/lib/catalogo/fecha-del-commit";
import { construirVista } from "@/lib/catalogo/vista";
import { titulo } from "@/lib/titulo";

export const metadata = titulo("Catálogo de pruebas", "Test catalog");

// La lista del catálogo se arma en el build desde la instantánea OFICIAL (la que tiene huella). Si la instantánea no es lo
// que dice ser, el build falla: una pantalla que muestra un catálogo que nadie firmó es peor que ninguna. La fecha de
// consulta es una entrada del build (HACKGUARD_CONSULTA, o la fecha del commit), jamás el reloj.
export default async function Catalogo() {
  const { instantanea, nombre } = await cargarInstantaneaOficial();
  const consulta = fechaDeConsulta(
    instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  const vista = construirVista(instantanea, nombre, consulta);
  return (
    <Consola
      seccion="catalogo"
      pagina="/catalogo"
      migas={[
        { es: "Catálogo", en: "Catalog" },
        { es: "Pruebas", en: "Tests" },
      ]}
      cuenta={vista.total}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <CatalogoPantalla vista={vista} />
    </Consola>
  );
}
