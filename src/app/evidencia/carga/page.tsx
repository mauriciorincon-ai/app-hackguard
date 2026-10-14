import { CargaPantalla } from "@/components/carga/carga-pantalla";
import { Consola } from "@/components/consola/consola";
import { SubnavDeEvidencia } from "@/components/hallazgo/piezas";
import { PRIMER_HALLAZGO } from "@/lib/evidencia/etiquetas";
import { cargarParaPaginaDeHallazgo } from "@/lib/evidencia/pagina";
import { construirVistaDeCarga } from "@/lib/evidencia/vista-de-carga";
import { titulo } from "@/lib/titulo";

export const metadata = titulo("Carga de evidencia", "Evidence intake");

// La carga de evidencia (como en la maqueta): los lotes demo y sus sobres se leen del disco en el build y se comprueban contra
// su libro, sus planes y la instantánea oficial; lo que no cuadra rompe el build en vez de mostrarse. Lo propio, ignorado por
// git, no llega aquí (regla dura 8). La pantalla es de solo lectura: lo que se decide se decide con el CLI.
export default async function Carga() {
  const { instantanea, nombre, consulta, activos, mundo } =
    await cargarParaPaginaDeHallazgo();
  const vista = construirVistaDeCarga(
    mundo,
    activos,
    instantanea,
    nombre,
    consulta,
  );
  return (
    <Consola
      seccion="evidencia"
      pagina="/evidencia/carga"
      migas={[
        { es: "Evidencia", en: "Evidence" },
        { es: "Carga", en: "Intake" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
      subnav={<SubnavDeEvidencia primero={PRIMER_HALLAZGO} actual="carga" />}
    >
      <CargaPantalla v={vista} />
    </Consola>
  );
}
