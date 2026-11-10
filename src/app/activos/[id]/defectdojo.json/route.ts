import { cargarParaPaginaDeHallazgo } from "@/lib/evidencia/pagina";
import {
  activosConHallazgos,
  exportacionDeActivo,
  textoDeExportacion,
} from "@/lib/exportar/defectdojo";

// La descarga del export a DefectDojo: los MISMOS bytes que escribe `pnpm exportar:defectdojo <activo> --fecha …` con la fecha de
// consulta del build. El export estático lo deja como `out/activos/<id>/defectdojo.json`. Solo los activos con hallazgos tienen archivo;
// la web no habla con DefectDojo: solo entrega el archivo que tú importas allí.
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const { mundo, activos, consulta } = await cargarParaPaginaDeHallazgo();
  return activosConHallazgos(mundo, activos, consulta).map((id) => ({ id }));
}

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { mundo, activos, consulta, instantanea } =
    await cargarParaPaginaDeHallazgo();
  if (!activosConHallazgos(mundo, activos, consulta).includes(id))
    return new Response("no existe / not found", { status: 404 });
  return new Response(
    textoDeExportacion(
      exportacionDeActivo(id, mundo, activos, instantanea, consulta),
    ),
    { headers: { "content-type": "application/json; charset=utf-8" } },
  );
}
