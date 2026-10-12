import { notFound } from "next/navigation";
import { Consola } from "@/components/consola/consola";
import { HallazgoPantalla } from "@/components/hallazgo/hallazgo-pantalla";
import { SubnavDeEvidencia } from "@/components/hallazgo/piezas";
import { PRIMER_HALLAZGO } from "@/lib/evidencia/etiquetas";
import {
  cargarParaPaginaDeHallazgo,
  idsDeHallazgos,
} from "@/lib/evidencia/pagina";
import { construirVistaDeHallazgo } from "@/lib/evidencia/vista";

// Una página por hallazgo (como en la maqueta). Los sobres y los hallazgos demo se leen del disco en el build y se comprueban
// contra su libro y la instantánea oficial; lo que no cuadra rompe el build en vez de mostrarse. Lo propio, ignorado por git,
// no llega aquí (regla dura 8).
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await idsDeHallazgos()).map((id) => ({ id }));
}

export default async function Hallazgo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { instantanea, nombre, consulta, activos, mundo } =
    await cargarParaPaginaDeHallazgo();
  if (!mundo.hallazgos.some((h) => h.id === id)) notFound();
  const vista = construirVistaDeHallazgo(
    id,
    mundo,
    activos,
    instantanea,
    nombre,
    consulta,
  );
  return (
    <Consola
      seccion="evidencia"
      pagina={`/evidencia/hallazgos/${PRIMER_HALLAZGO}`}
      migas={[
        { es: "Evidencia", en: "Evidence" },
        { es: "Hallazgos", en: "Findings" },
        { es: id, en: id },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
      subnav={<SubnavDeEvidencia primero={PRIMER_HALLAZGO} />}
    >
      <HallazgoPantalla v={vista} />
    </Consola>
  );
}
