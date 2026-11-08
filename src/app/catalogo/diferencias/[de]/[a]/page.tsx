import {
  nombresDeLosPares,
  paginaDeDiferencias,
} from "@/lib/catalogo/diferencias-pagina";
import { titulo } from "@/lib/titulo";

export const metadata = titulo(
  "Qué cambió entre instantáneas",
  "What changed between snapshots",
);

// Export estático: una página por cada par consecutivo de instantáneas, generada en el build; ninguna otra existe.
export const dynamicParams = false;
export async function generateStaticParams() {
  return nombresDeLosPares();
}

export default async function Comparacion({
  params,
}: {
  params: Promise<{ de: string; a: string }>;
}) {
  return paginaDeDiferencias(await params);
}
