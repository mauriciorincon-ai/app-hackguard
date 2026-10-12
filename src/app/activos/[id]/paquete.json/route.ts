import { textoDelPaquete } from "@/lib/activos/cargar";
import { cargarParaPagina, idsDeActivos } from "@/lib/activos/pagina";

// La descarga del paquete de ejecución: los MISMOS bytes que escribe `pnpm plan:emitir` en `datos/planes/`. El export estático
// lo deja como `out/activos/<id>/paquete.json`. Solo los activos autorizados tienen paquete; el resto no se genera.
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const { mundo } = await cargarParaPagina();
  return mundo.activos
    .filter((a) => a.paquete !== null)
    .map((a) => ({ id: a.activo.id }));
}

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await idsDeActivos()).includes(id))
    return new Response("no existe / not found", { status: 404 });
  return new Response(textoDelPaquete(id), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
