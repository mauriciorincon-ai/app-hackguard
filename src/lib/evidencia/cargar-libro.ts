// El libro de evidencia y los hallazgos, leídos del disco y validados: lo que comparten el CLI (`pnpm evidencia:validar`,
// `hallazgos:listar`…) y las pantallas del build. El CLI ve también lo propio (`datos/privado/`); las pantallas, solo lo
// versionado (demo): lo real jamás sale de la máquina de quien lo registró (regla dura 8).
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import {
  validarEvidencia,
  type ContextoDeEvidencia,
} from "../../engine/evidencia/validar.ts";
import { estadoDe } from "../../engine/evidencia/molde.ts";
import { validarHallazgos } from "../../engine/hallazgos/validar.ts";
import { libroEfectivo } from "../../engine/lotes/efectivo.ts";
import { fallasSinHallazgo, validarLotes } from "../../engine/lotes/validar.ts";
import { motivoDeVectorInvalido } from "../../engine/severidad/cvss.ts";
import { cargarPatrones } from "../activos/cargar-activos.ts";
import {
  cargarHallazgos,
  cargarHallazgosPublicos,
  cargarLotes,
  cargarLotesPublicos,
  cargarMuestreo,
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
  const muestreo = cargarMuestreo(raiz);
  const archivosDeLotes = privados
    ? cargarLotes(raiz)
    : cargarLotesPublicos(raiz);
  const lotes = await validarLotes(archivosDeLotes, {
    sobres: sobres.sobres,
    planes,
    muestreo,
  });
  // Lo que cuenta: cada sobre con la confirmación de su archivo o la de su lote confirmado (ADR-009).
  const efectivo = libroEfectivo(
    sobres.sobres.map((s) => s.sobre),
    lotes.lotes.map((l) => l.lote),
  );
  const libro = sobres.sobres.map((s, i) => ({
    ruta: s.ruta,
    sobre: efectivo[i]!,
  }));
  // La nota «sin confirmar» es la del archivo del sobre: un sobre que su lote confirmó ya no la merece.
  const porLote = new Set(
    libro
      .filter((x) => x.sobre.confirmacion?.modo === "lote")
      .map((x) => x.ruta),
  );
  sobres.hallazgos = sobres.hallazgos.filter(
    (h) => !(h.regla === "sobre/sin-confirmar" && porLote.has(h.ruta)),
  );
  sobres.estado = estadoDe(sobres.hallazgos);
  const hallazgos = validarHallazgos(archivosDeHallazgos, {
    libro,
    pruebas: contexto.pruebas,
    vectorInvalido: motivoDeVectorInvalido,
  });
  // Una falla que el lote confirmó y que abriría un hallazgo sin severidad: solo se ve con los hallazgos ya validados.
  const sinHallazgo = fallasSinHallazgo(
    lotes.lotes,
    sobres.sobres.map((s) => s.sobre),
    hallazgos.validos,
  );
  if (sinHallazgo.length > 0) {
    lotes.hallazgos.push(...sinHallazgo);
    lotes.estado = "invalido";
  }
  return {
    instantanea,
    planes,
    contexto,
    muestreo,
    archivosDeSobres,
    archivosDeLotes,
    archivosDeHallazgos,
    sobres,
    lotes,
    /** Los sobres válidos con la confirmación que cuenta (la de su archivo o la de su lote). */
    libro,
    hallazgos,
  };
}
