import { notFound } from "next/navigation";
import { ActivoPantalla } from "@/components/activos/activo-pantalla";
import { SubnavDelActivo } from "@/components/activos/piezas";
import { Consola } from "@/components/consola/consola";
import { cargarParaPagina, idsDeActivos } from "@/lib/activos/pagina";
import { construirVistaDeActivo } from "@/lib/activos/vista";
import { titulo } from "@/lib/titulo";

// Una página por activo (decisión de diseño 11). Los activos y sus planes se leen del disco en el build y se comprueban
// contra la instantánea oficial; un plan que no cuadra rompe el build en vez de mostrarse.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await idsDeActivos()).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return titulo("Activo", "Asset", id);
}

export default async function Activo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { instantanea, nombre, consulta, mundo } = await cargarParaPagina();
  if (!mundo.activos.some((a) => a.activo.id === id)) notFound();
  const vista = construirVistaDeActivo(
    id,
    mundo,
    instantanea,
    nombre,
    consulta,
  );
  return (
    <Consola
      seccion="activos"
      pagina={`/activos/${id}`}
      migas={[{ es: "Activos", en: "Assets" }, vista.nombre]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
      subnav={<SubnavDelActivo id={id} abierta="activo" />}
    >
      <ActivoPantalla v={vista} />
    </Consola>
  );
}
