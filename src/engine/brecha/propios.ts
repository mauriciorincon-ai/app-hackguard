// D12 · la capa propia de controles en la brecha. Un control de la organización no tiene pruebas propias: dice con cuáles
// controles de ISO/IEC 42001 se corresponde (`controles_equivalentes` al marco de la capa por defecto), y su estado es el MENOS
// favorable de los controles ISO aplicables a los que apunta. Es una vista derivada y APARTE: no entra a los controles ISO, no
// cambia sus cifras ni sus estados (un test lo fija), y la capa por defecto no sabe que existe.
//
// Puro y determinista: no lee archivos ni el reloj.
import type { CapaDeControles } from "../catalogo/esquemas.ts";
import { ESTADOS_DE_CONTROL, type EstadoDeControl } from "./esquemas.ts";

export interface ControlPropioDeBrecha {
  id: string;
  area: string;
  /** Los controles ISO a los que se corresponde, con el estado de cada uno cuando es aplicable en esta brecha. */
  apunta: { id: string; estado: EstadoDeControl | null }[];
  /** El menos favorable de los estados aplicables; `sin_evidencia` si ningún control ISO al que apunta es aplicable. */
  estado: EstadoDeControl;
  /** `true` si ninguno de los controles ISO a los que apunta es aplicable (el estado es un piso, no una medición). */
  sinAplicables: boolean;
  /** `true` si alguna de las equivalencias con un control ISO aplicable es `parcial`: el estado es un TOPE (lo que la norma muestra), no que el control propio quede cubierto entero. */
  cubreParte: boolean;
}

export interface CapaPropiaDeBrecha {
  capa: string;
  controles: ControlPropioDeBrecha[];
}

/** La referencia de un control ISO dentro de su marco: `iso42001-A.6.2.4` → `A.6.2.4`. */
export const referenciaDeControl = (id: string): string =>
  id.replace(/^.*?-(?=[A-Z](?:\.\d+)+$)/, "");

/** El peor de varios estados (el primero de `ESTADOS_DE_CONTROL` que aparezca: del menos al más favorable). */
export function peorEstado(
  estados: readonly EstadoDeControl[],
): EstadoDeControl {
  return ESTADOS_DE_CONTROL.find((e) => estados.includes(e)) ?? "sin_evidencia";
}

export function brechaDeCapasPropias(
  capas: readonly CapaDeControles[],
  porDefecto: CapaDeControles,
  estadoDeIso: ReadonlyMap<string, EstadoDeControl>,
): CapaPropiaDeBrecha[] {
  const isoPorReferencia = new Map<string, string>(
    porDefecto.areas.flatMap((a) =>
      a.controles.map((c): [string, string] => [
        referenciaDeControl(c.id),
        c.id,
      ]),
    ),
  );
  return capas
    .filter((c) => c.capa === "propia")
    .map((capa) => ({
      capa: capa.id,
      controles: capa.areas.flatMap((area) =>
        area.controles.map((c): ControlPropioDeBrecha => {
          const apunta = c.controles_equivalentes
            .filter((e) => e.marco_id === porDefecto.marco_id)
            .flatMap((e) => {
              const iso = isoPorReferencia.get(e.referencia_en_marco);
              return iso === undefined
                ? []
                : [
                    {
                      id: iso,
                      estado: estadoDeIso.get(iso) ?? null,
                      parcial: e.cobertura === "parcial",
                    },
                  ];
            });
          const aplicables = apunta.flatMap((a) =>
            a.estado === null ? [] : [a.estado],
          );
          return {
            id: c.id,
            area: area.id,
            apunta: apunta.map(({ id, estado }) => ({ id, estado })),
            estado: peorEstado(aplicables),
            sinAplicables: aplicables.length === 0,
            cubreParte: apunta.some((a) => a.estado !== null && a.parcial),
          };
        }),
      ),
    }));
}
