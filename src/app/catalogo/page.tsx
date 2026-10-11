import { Consola } from "@/components/consola/consola";
import { CatalogoPantalla } from "@/components/catalogo/catalogo-pantalla";
import { cargarInstantaneaOficial } from "@/lib/catalogo/cargar-instantanea";
import { fechaDeConsulta } from "@/lib/catalogo/consulta";
import { construirVista } from "@/lib/catalogo/vista";

// La lista del catálogo se arma en el build desde la instantánea OFICIAL (la que tiene huella). Si la instantánea no es lo
// que dice ser, el build falla: una pantalla que muestra un catálogo que nadie firmó es peor que ninguna. La fecha de
// consulta es una entrada del build (HACKGUARD_CONSULTA), jamás el reloj.
export default async function Catalogo() {
  const { instantanea, nombre } = await cargarInstantaneaOficial();
  const consulta = fechaDeConsulta(
    instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
  );
  const vista = construirVista(instantanea, nombre, consulta);
  return (
    <Consola
      seccion="catalogo"
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
