import { Consola } from "@/components/consola/consola";
import { PropuestasPantalla } from "@/components/propuestas/propuestas-pantalla";
import { cargarMundoDePropuestas } from "@/lib/propuestas/pagina";
import { construirVistaDePropuestas } from "@/lib/propuestas/vista";
import { titulo } from "@/lib/titulo";

export const metadata = titulo("Bandeja de propuestas", "Proposal inbox");

// La bandeja de propuestas (como en la maqueta): lo que proponen el investigador y el extractor, con lo que el código verificó de
// cada una. Las corridas selladas y el libro de decisiones se leen en el build; una propuesta que no se puede leer no se muestra para
// aprobar, y un libro que no cuadra con ellas rompe el build. Decidir no se hace aquí: la pantalla muestra el comando que lo registra.
export default async function Propuestas() {
  const vista = construirVistaDePropuestas(await cargarMundoDePropuestas());
  return (
    <Consola
      seccion="catalogo"
      pagina="/catalogo/propuestas"
      migas={[
        { es: "Catálogo", en: "Catalog" },
        { es: "Propuestas", en: "Proposals" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <PropuestasPantalla v={vista} />
    </Consola>
  );
}
