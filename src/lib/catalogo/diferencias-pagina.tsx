// La página de «Qué cambió» para un par de instantáneas, compartida por la ruta de entrada (el último par) y la de cada par consecutivo
// (`/catalogo/diferencias/<de>/<a>`). Corre en el build (Node). Una cuenta, un cálculo: el par se calcula con el motor, sin atajos.
import { Consola } from "@/components/consola/consola";
import { DiferenciasPantalla } from "@/components/diferencias/diferencias-pantalla";
import { diferenciasEntreInstantaneas } from "@/engine/catalogo/diferencias";
import { paresConsecutivos } from "@/engine/catalogo/pares";
import {
  cargarInstantaneaOficial,
  cargarSecuenciaDeInstantaneas,
} from "@/lib/catalogo/cargar-instantanea";
import { fechaDeConsulta } from "@/lib/catalogo/consulta";
import { construirVistaDeDiferencias } from "@/lib/catalogo/diferencias-vista";
import { fechaDelCommit } from "@/lib/catalogo/fecha-del-commit";
import { cargarLicenciasDeMarcos } from "@/lib/propuestas/cargar";

/** Los pares consecutivos que se generan en el build: `[de, a]` por nombre, del pasado al presente. */
export async function nombresDeLosPares(): Promise<
  { de: string; a: string }[]
> {
  return paresConsecutivos(await cargarSecuenciaDeInstantaneas()).map((p) => ({
    de: p.de.nombre,
    a: p.a.nombre,
  }));
}

/**
 * La página del par `de..a`; sin par, la del último (lo más reciente que cambió). Si el catálogo trae una sola instantánea, se compara consigo
 * misma y la pantalla dice «sin cambios».
 */
export async function paginaDeDiferencias(par?: { de: string; a: string }) {
  const oficial = await cargarInstantaneaOficial();
  const consulta = fechaDeConsulta(
    oficial.instantanea.fecha_evaluacion,
    process.env.HACKGUARD_CONSULTA,
    fechaDelCommit(),
  );
  const secuencia = await cargarSecuenciaDeInstantaneas();
  const pares = paresConsecutivos(secuencia);
  const elegido =
    par === undefined
      ? pares.at(-1)
      : pares.find((p) => p.de.nombre === par.de && p.a.nombre === par.a);
  if (par !== undefined && elegido === undefined)
    throw new Error(
      `no hay una comparación ${par.de}..${par.a} / there is no comparison ${par.de}..${par.a}`,
    );
  const de = elegido?.de ?? { ...oficial, demo: false };
  const a = elegido?.a ?? { ...oficial, demo: false };
  const d = await diferenciasEntreInstantaneas(
    de.instantanea,
    a.instantanea,
    cargarLicenciasDeMarcos().marcos,
  );
  const vista = construirVistaDeDiferencias(d, de, a, secuencia);
  return (
    <Consola
      seccion="catalogo"
      pagina="/catalogo/marcos"
      migas={[
        { es: "Catálogo", en: "Catalog" },
        { es: "Marcos", en: "Frameworks" },
        { es: "Qué cambió", en: "What changed" },
      ]}
      cuenta={oficial.instantanea.catalogo.pruebas.length}
      pie={{ instantanea: oficial.nombre, consulta }}
    >
      <DiferenciasPantalla v={vista} />
    </Consola>
  );
}
