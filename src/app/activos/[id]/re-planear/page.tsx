import { notFound } from "next/navigation";
import { SubnavDelActivo } from "@/components/activos/piezas";
import { Consola } from "@/components/consola/consola";
import { ReplanPantalla } from "@/components/replan/replan-pantalla";
import { cargarParaPagina } from "@/lib/activos/pagina";
import { construirVistaDeReplan } from "@/lib/activos/replan-vista";
import { cargarInstantaneaDemo } from "@/lib/catalogo/cargar-instantanea";
import { titulo } from "@/lib/titulo";

// Qué cambiaría al re-emitir el plan desactualizado de un activo: una vista previa, calculada en el build con el motor. Solo los
// activos con un plan desactualizado y su historial tienen esta página; los demás no la generan.
export const dynamicParams = false;

async function vistaDe(id: string) {
  const { instantanea, nombre, consulta, mundo } = await cargarParaPagina();
  return construirVistaDeReplan(
    id,
    mundo,
    instantanea,
    nombre,
    consulta,
    await cargarInstantaneaDemo(),
  );
}

export async function generateStaticParams() {
  const { mundo } = await cargarParaPagina();
  const ids = mundo.activos
    .filter(
      (a) =>
        a.versiones !== null && a.veredicto?.estado === "plan_desactualizado",
    )
    .map((a) => a.activo.id);
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return titulo("Re-planear el activo", "Re-plan the asset", id);
}

export default async function Replanear({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vista = await vistaDe(id);
  if (vista === null) notFound();
  return (
    <Consola
      seccion="activos"
      pagina={`/activos/${id}/re-planear`}
      migas={[
        { es: "Activos", en: "Assets" },
        vista.nombre,
        { es: "Re-planear", en: "Re-plan" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
      subnav={
        <SubnavDelActivo
          id={id}
          abierta="replanear"
          historial={vista.tieneHistorial}
          replanear
        />
      }
    >
      <ReplanPantalla v={vista} />
    </Consola>
  );
}
