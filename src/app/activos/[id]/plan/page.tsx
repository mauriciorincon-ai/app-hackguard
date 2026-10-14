import { notFound } from "next/navigation";
import { SubnavDelActivo } from "@/components/activos/piezas";
import { Consola } from "@/components/consola/consola";
import { PlanPantalla } from "@/components/plan/plan-pantalla";
import { cargarParaPagina, idsDeActivos } from "@/lib/activos/pagina";
import { construirVistaDePlan } from "@/lib/activos/vista";
import { titulo } from "@/lib/titulo";

// El plan de cada activo, leído de `datos/planes/` (lo emitió `pnpm plan:emitir`) y comprobado contra la instantánea
// oficial. Un activo sin autorización tiene su página, y dice por qué no hay plan.
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
  return titulo("Plan de pruebas", "Test plan", id);
}

export default async function Plan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { instantanea, nombre, consulta, mundo } = await cargarParaPagina();
  if (!mundo.activos.some((a) => a.activo.id === id)) notFound();
  const vista = construirVistaDePlan(id, mundo, instantanea, nombre, consulta);
  return (
    <Consola
      seccion="activos"
      pagina={`/activos/${id}/plan`}
      migas={[
        { es: "Activos", en: "Assets" },
        vista.nombre,
        { es: "Plan", en: "Plan" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
      subnav={<SubnavDelActivo id={id} abierta="plan" />}
    >
      <PlanPantalla v={vista} />
    </Consola>
  );
}
