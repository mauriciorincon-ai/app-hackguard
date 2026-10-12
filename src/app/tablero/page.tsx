import { Consola } from "@/components/consola/consola";
import { TableroPantalla } from "@/components/tablero/tablero-pantalla";
import { cargarParaPaginaDeBrecha } from "@/lib/brecha/pagina";
import { construirVistaDeTablero } from "@/lib/brecha/vista";

// El tablero (como en la maqueta): la portada de la aplicación. La brecha se calcula en el build con la fecha de consulta del
// commit, y la validación del instrumento corre antes de mostrar una sola cifra; lo que no cuadra rompe el build.
export default async function Tablero() {
  const mundo = await cargarParaPaginaDeBrecha();
  const vista = construirVistaDeTablero(mundo);
  return (
    <Consola
      seccion="tablero"
      pagina="/tablero"
      migas={[{ es: "Tablero", en: "Dashboard" }]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <TableroPantalla v={vista} />
    </Consola>
  );
}
