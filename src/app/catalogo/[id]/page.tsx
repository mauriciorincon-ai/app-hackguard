import { notFound } from "next/navigation";
import { Ficha } from "@/components/catalogo/ficha";
import { Consola } from "@/components/consola/consola";
import { cargarInstantaneaOficial } from "@/lib/catalogo/cargar-instantanea";
import { fechaDeConsulta } from "@/lib/catalogo/consulta";
import { fechaDelCommit } from "@/lib/catalogo/fecha-del-commit";
import { construirFicha, idsDePruebas } from "@/lib/catalogo/vista";
import { titulo } from "@/lib/titulo";

// Una página por prueba de la instantánea oficial (export estático: sin rutas dinámicas sin `generateStaticParams`).
// Un identificador que no es de ninguna prueba no tiene página (404), no una ficha vacía.
export const dynamicParams = false;

export async function generateStaticParams() {
  const { instantanea } = await cargarInstantaneaOficial();
  return idsDePruebas(instantanea).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return titulo("Ficha de prueba", "Test sheet", id);
}

export default async function FichaDePrueba({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { instantanea, nombre } = await cargarInstantaneaOficial();
  if (!idsDePruebas(instantanea).includes(id)) notFound();
  const consulta = fechaDeConsulta(
    instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  const ficha = construirFicha(instantanea, id, consulta);
  return (
    <Consola
      seccion="catalogo"
      pagina="/catalogo"
      migas={[
        { es: "Catálogo", en: "Catalog" },
        { es: "Pruebas", en: "Tests" },
        { es: id, en: id },
      ]}
      cuenta={instantanea.catalogo.pruebas.length}
      pie={{ instantanea: nombre, consulta }}
    >
      <Ficha f={ficha} />
    </Consola>
  );
}
