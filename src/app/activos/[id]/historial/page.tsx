import { notFound } from "next/navigation";
import { SubnavDelActivo } from "@/components/activos/piezas";
import { Consola } from "@/components/consola/consola";
import { HistorialPantalla } from "@/components/historial/historial-pantalla";
import { cargarParaPagina } from "@/lib/activos/pagina";
import { construirVistaDeHistorial } from "@/lib/activos/historial-vista";
import { titulo } from "@/lib/titulo";

// El historial de versiones de un activo, leído de `datos/historial/activos/` y comprobado contra el archivo del activo. Solo
// los activos con historial tienen esta página; los demás no la generan.
export const dynamicParams = false;

async function idsConHistorial(): Promise<string[]> {
  const { mundo } = await cargarParaPagina();
  return mundo.activos
    .filter((a) => a.versiones !== null)
    .map((a) => a.activo.id);
}

export async function generateStaticParams() {
  return (await idsConHistorial()).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return titulo("Historial del activo", "Asset history", id);
}

export default async function Historial({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { instantanea, nombre, consulta, mundo } = await cargarParaPagina();
  if (!mundo.activos.some((a) => a.activo.id === id && a.versiones !== null))
    notFound();
  const vista = await construirVistaDeHistorial(
    id,
    mundo,
    instantanea,
    nombre,
    consulta,
  );
  return (
    <Consola
      seccion="activos"
      pagina={`/activos/${id}/historial`}
      migas={[
        { es: "Activos", en: "Assets" },
        vista.nombre,
        { es: "Historial", en: "History" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
      subnav={
        <SubnavDelActivo
          id={id}
          abierta="historial"
          historial
          replanear={vista.planDesactualizado !== null}
        />
      }
    >
      <HistorialPantalla v={vista} />
    </Consola>
  );
}
