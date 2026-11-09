import { Consola } from "@/components/consola/consola";
import { TendenciaPantalla } from "@/components/tendencia/tendencia-pantalla";
import { calcularTendencia } from "@/engine/brecha/tendencia";
import { entradaDeBrecha } from "@/lib/brecha/entrada";
import { cargarParaPaginaDeBrecha } from "@/lib/brecha/pagina";
import { construirVistaDeTendencia } from "@/lib/brecha/vista";
import { titulo } from "@/lib/titulo";

export const metadata = titulo("Tendencia de la brecha", "Gap trend");

// La tendencia de la brecha (D6, RF-05.7): la misma brecha en cada fecha en que algo cambió en el libro y, control por control de
// ISO/IEC 42001, lo que mejoró o empeoró. Sale de `armarBrecha` en cada corte: una cuenta, un cálculo. Solo corre en el build.
export default async function Tendencia() {
  const mundo = await cargarParaPaginaDeBrecha();
  const tendencia = await calcularTendencia(
    entradaDeBrecha(
      mundo.instantanea,
      mundo.activos,
      mundo.evidencia,
      mundo.umbrales,
      mundo.consulta,
    ),
  );
  const vista = construirVistaDeTendencia(mundo, tendencia);
  return (
    <Consola
      seccion="brecha"
      pagina="/brecha/tendencia"
      migas={[
        { es: "Brecha", en: "Gap" },
        { es: "Tendencia", en: "Trend" },
      ]}
      pie={{ instantanea: vista.instantanea, consulta: vista.consulta }}
    >
      <TendenciaPantalla v={vista} />
    </Consola>
  );
}
