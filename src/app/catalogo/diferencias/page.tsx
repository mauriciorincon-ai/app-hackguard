import { Consola } from "@/components/consola/consola";
import { DiferenciasPantalla } from "@/components/diferencias/diferencias-pantalla";
import { diferenciasEntreInstantaneas } from "@/engine/catalogo/diferencias";
import {
  cargarInstantaneaDemo,
  cargarInstantaneaOficial,
} from "@/lib/catalogo/cargar-instantanea";
import { fechaDeConsulta } from "@/lib/catalogo/consulta";
import { construirVistaDeDiferencias } from "@/lib/catalogo/diferencias-vista";
import { fechaDelCommit } from "@/lib/catalogo/fecha-del-commit";
import { cargarLicenciasDeMarcos } from "@/lib/propuestas/cargar";
import { titulo } from "@/lib/titulo";

export const metadata = titulo(
  "Qué cambió entre instantáneas",
  "What changed between snapshots",
);

// Del catálogo OFICIAL a la instantánea DEMO (sintética, rotulada así): el catálogo real no ha cambiado desde la oficial, así que para
// ver un cambio hace falta uno inventado. Si no hay demo, la oficial se compara consigo misma y la pantalla dice «sin cambios».
export default async function Diferencias() {
  const oficial = await cargarInstantaneaOficial();
  const demo = await cargarInstantaneaDemo();
  const consulta = fechaDeConsulta(
    oficial.instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  const nueva = demo ?? oficial;
  const d = await diferenciasEntreInstantaneas(
    oficial.instantanea,
    nueva.instantanea,
    cargarLicenciasDeMarcos().marcos,
  );
  const vista = construirVistaDeDiferencias(d, oficial, {
    ...nueva,
    demo: demo !== null,
  });
  return (
    <Consola
      seccion="catalogo"
      pagina="/catalogo/marcos"
      migas={[
        { es: "Catálogo", en: "Catalog" },
        { es: "Marcos", en: "Frameworks" },
        { es: "Qué cambió", en: "What changed" },
      ]}
      cuenta={oficial.instantanea.catalogo.pruebas.length}
      pie={{ instantanea: oficial.nombre, consulta }}
    >
      <DiferenciasPantalla v={vista} />
    </Consola>
  );
}
