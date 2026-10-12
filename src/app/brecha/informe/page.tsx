import { Consola } from "@/components/consola/consola";
import { InformePantalla } from "@/components/informe/informe-pantalla";
import { cargarParaPaginaDeBrecha } from "@/lib/brecha/pagina";
import { construirVistaDeInforme } from "@/lib/brecha/vista";

// El informe de brecha (como en la maqueta, RF-05.6): las ocho secciones del § 12, con su huella. Se imprime en papel claro.
export default async function Informe() {
  const mundo = await cargarParaPaginaDeBrecha();
  const vista = construirVistaDeInforme(mundo);
  return (
    <Consola
      seccion="brecha"
      pagina="/brecha/informe"
      migas={[
        { es: "Brecha", en: "Gap" },
        { es: "Informe", en: "Report" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <InformePantalla v={vista} />
    </Consola>
  );
}
