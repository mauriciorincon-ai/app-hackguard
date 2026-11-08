import { paginaDeDiferencias } from "@/lib/catalogo/diferencias-pagina";
import { titulo } from "@/lib/titulo";

export const metadata = titulo(
  "Qué cambió entre instantáneas",
  "What changed between snapshots",
);

// El último par consecutivo (del catálogo oficial a la instantánea DEMO, sintética y rotulada así: el catálogo real no ha cambiado desde la
// oficial). Los demás pares viven en `/catalogo/diferencias/<de>/<a>` y se enlazan desde el selector de la pantalla.
export default async function Diferencias() {
  return paginaDeDiferencias();
}
