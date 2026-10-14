// El aviso de versiones (RF-07.5): un marco cuya fuente oficial publica una versión distinta de la que tiene el catálogo. Sale de las
// propuestas `version_de_marco`, no de una comparación a ciegas: la propuesta guarda el pasaje literal de la fuente que dice la versión
// nueva, y el código ya comprobó que ese pasaje está en la página Y que la versión nueva está dentro del pasaje (si no, no avisa). Un aviso no cambia nada por su cuenta (regla 2).
import type { PropuestaSellada } from "./esquemas.ts";
import { SENAL_VERSION_EN_LA_CITA } from "./senales.ts";
import type { DatosDeMarco } from "./verificar.ts";

export interface AvisoDeVersion {
  marco: string;
  /** La versión que tiene el catálogo y la que la fuente publica. */
  vigente: string;
  publicada: string;
  fecha_version: string;
  propuesta: string;
  fuentes: number;
  /** Fuentes cuyo pasaje el código verificó. Con menos de las que pide el plan, el aviso llega «sin verificar». */
  fuentes_verificadas: number;
}

/**
 * Los avisos de versión vigentes. Una propuesta rechazada ya no avisa; una cuya versión nueva ya es la del catálogo tampoco (el aviso
 * se apaga solo cuando alguien actualiza el marco). Ordenados por marco y por propuesta.
 */
export function avisosDeVersion(
  propuestas: readonly PropuestaSellada[],
  marcos: ReadonlyMap<string, DatosDeMarco>,
  rechazadas: ReadonlySet<string> = new Set(),
): AvisoDeVersion[] {
  const avisos: AvisoDeVersion[] = [];
  for (const p of propuestas) {
    if (p.tipo !== "version_de_marco" || rechazadas.has(p.id)) continue;
    // RF-07.5: sin la versión dentro de un pasaje verificado no hay aviso; la propuesta sigue en la bandeja, en pausa.
    if (
      p.pausa?.motivos.some((m) => m.senal === SENAL_VERSION_EN_LA_CITA) ??
      false
    )
      continue;
    const vigente = marcos.get(p.marco_id)?.version_vigente;
    if (vigente === undefined || vigente === p.version_nueva) continue;
    avisos.push({
      marco: p.marco_id,
      vigente,
      publicada: p.version_nueva,
      fecha_version: p.fecha_version,
      propuesta: p.id,
      fuentes: p.verificacion.fuentes.length,
      fuentes_verificadas: p.verificacion.fuentes.filter(
        (f) => f.estado === "verificada",
      ).length,
    });
  }
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return avisos.sort(
    (a, b) => cmp(a.marco, b.marco) || cmp(a.propuesta, b.propuesta),
  );
}
