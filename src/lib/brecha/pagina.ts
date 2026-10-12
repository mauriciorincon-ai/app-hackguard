// Lo que comparten las cinco páginas de la brecha: el mundo ya cargado y comprobado, con la brecha calculada una sola vez.
// La fecha de consulta es HACKGUARD_CONSULTA, o la fecha del commit; jamás el reloj. Solo corre en el build.
import { cargarParaPaginaDeHallazgo } from "../evidencia/pagina.ts";
import {
  cargarEtiquetasDeBrecha,
  cargarSemillasDeCierre,
  cargarUmbralesDeBrecha,
} from "./cargar.ts";
import { armarMundoDeBrecha, type MundoDeBrecha } from "./mundo.ts";

export async function cargarParaPaginaDeBrecha(): Promise<MundoDeBrecha> {
  const { instantanea, nombre, consulta, activos, mundo } =
    await cargarParaPaginaDeHallazgo();
  return armarMundoDeBrecha({
    instantanea,
    nombre,
    consulta,
    activos,
    evidencia: mundo,
    umbrales: cargarUmbralesDeBrecha(),
    etiquetas: cargarEtiquetasDeBrecha(),
    semillas: cargarSemillasDeCierre(),
  });
}
