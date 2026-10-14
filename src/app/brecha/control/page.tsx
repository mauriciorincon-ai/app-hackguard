import { Consola } from "@/components/consola/consola";
import { ListaDeControles } from "@/components/control/lista-de-controles";
import { cargarParaPaginaDeBrecha } from "@/lib/brecha/pagina";
import { construirVistaDeControles } from "@/lib/brecha/vista";
import { titulo } from "@/lib/titulo";

export const metadata = titulo("Vista por control", "Control view");

// La vista por control (como en la maqueta): evidencia organizada, separada del nivel de aseguramiento (E-16).
export default async function Controles() {
  const mundo = await cargarParaPaginaDeBrecha();
  const vista = construirVistaDeControles(mundo);
  return (
    <Consola
      seccion="brecha"
      pagina="/brecha/control"
      migas={[
        { es: "Brecha", en: "Gap" },
        { es: "Por control", en: "By control" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <ListaDeControles v={vista} />
    </Consola>
  );
}
