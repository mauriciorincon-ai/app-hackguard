// El libro de evidencia y los hallazgos, leídos del disco y validados: lo que comparten el CLI (`pnpm evidencia:validar`,
// `hallazgos:listar`…) y las pantallas del build. El CLI ve también lo propio (`datos/privado/`); las pantallas, solo lo
// versionado (demo): lo real jamás sale de la máquina de quien lo registró (regla dura 8).
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import {
  validarEvidencia,
  type ContextoDeEvidencia,
} from "../../engine/evidencia/validar.ts";
import { validarHallazgos } from "../../engine/hallazgos/validar.ts";
import { motivoDeVectorInvalido } from "../../engine/severidad/cvss.ts";
import { cargarPatrones } from "../activos/cargar-activos.ts";
import {
  cargarHallazgos,
  cargarHallazgosPublicos,
  cargarPlanesEmitidos,
  cargarSobres,
  cargarSobresPublicos,
  pruebasConocidas,
} from "./cargar-evidencia.ts";

export async function cargarLibroValidado(
  raiz: string,
  instantanea: Instantanea,
  { privados }: { privados: boolean },
) {
  const planes = await cargarPlanesEmitidos(raiz, { privados });
  const contexto: ContextoDeEvidencia = {
    pruebas: pruebasConocidas(instantanea),
    planes,
    patrones: cargarPatrones(raiz),
  };
  const archivosDeSobres = privados
    ? cargarSobres(raiz)
    : cargarSobresPublicos(raiz);
  const archivosDeHallazgos = privados
    ? cargarHallazgos(raiz)
    : cargarHallazgosPublicos(raiz);
  const sobres = await validarEvidencia(archivosDeSobres, contexto);
  const hallazgos = validarHallazgos(archivosDeHallazgos, {
    libro: sobres.sobres,
    pruebas: contexto.pruebas,
    vectorInvalido: motivoDeVectorInvalido,
  });
  return {
    instantanea,
    planes,
    contexto,
    archivosDeSobres,
    archivosDeHallazgos,
    sobres,
    hallazgos,
  };
}
