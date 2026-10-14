import { notFound } from "next/navigation";
import { Consola } from "@/components/consola/consola";
import { ControlPantalla } from "@/components/control/control-pantalla";
import { controlDeSlug, slugDeControl } from "@/lib/brecha/etiquetas";
import { cargarParaPaginaDeBrecha } from "@/lib/brecha/pagina";
import { construirVistaDeControl, idsDeControles } from "@/lib/brecha/vista";
import { titulo } from "@/lib/titulo";

// Una página por control aplicable (como en la maqueta). El segmento de la ruta no lleva puntos: `iso42001-a-6-2-4`.
export const dynamicParams = false;

export async function generateStaticParams() {
  return idsDeControles(await cargarParaPaginaDeBrecha()).map((id) => ({
    id: slugDeControl(id),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return titulo("Vista por control", "Control view", id);
}

export default async function Control({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = await params;
  const mundo = await cargarParaPaginaDeBrecha();
  const id = controlDeSlug(idsDeControles(mundo), slug);
  if (id === null) notFound();
  const vista = construirVistaDeControl(id, mundo);
  return (
    <Consola
      seccion="brecha"
      pagina="/brecha/control"
      migas={[
        { es: "Brecha", en: "Gap" },
        { es: "Por control", en: "By control" },
        { es: id, en: id },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <ControlPantalla v={vista} />
    </Consola>
  );
}
