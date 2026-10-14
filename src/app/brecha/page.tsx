import { BrechaPantalla } from "@/components/brecha/brecha-pantalla";
import { Consola } from "@/components/consola/consola";
import { cargarParaPaginaDeBrecha } from "@/lib/brecha/pagina";
import { construirVistaDeBrecha } from "@/lib/brecha/vista";
import { titulo } from "@/lib/titulo";

export const metadata = titulo("Brecha", "Gap");

// La brecha (como en la maqueta): esperado contra obtenido en cada prueba planeada, de todos los activos. Solo cuenta lo que
// confirmó una persona; lo que espera confirmación se ve, pero no mueve ninguna cifra.
export default async function Brecha() {
  const mundo = await cargarParaPaginaDeBrecha();
  const vista = construirVistaDeBrecha(mundo);
  return (
    <Consola
      seccion="brecha"
      pagina="/brecha"
      migas={[
        { es: "Brecha", en: "Gap" },
        { es: "Esperado contra obtenido", en: "Expected against obtained" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <BrechaPantalla v={vista} />
    </Consola>
  );
}
