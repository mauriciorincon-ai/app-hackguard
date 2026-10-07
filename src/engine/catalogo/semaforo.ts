// Semáforo de vigencia (RF-01.5, E-26): cuántos días lleva cada prueba, marco y herramienta desde su última
// verificación, y en qué estado la deja eso. La familia está como su prueba más atrasada (decisión 27 de
// diseño). Los umbrales y el vocabulario son dato (`datos/umbrales.json`, `datos/estados.json`), y la fecha
// de evaluación es una entrada: el mismo catálogo en la misma fecha da el mismo semáforo en cualquier motor.
import { diasEntre } from "../fecha.ts";
import type { Estados, Umbrales } from "./esquemas.ts";

export const ESTADOS_DE_VIGENCIA = [
  "vigente",
  "por_revisar",
  "vencido",
] as const;
export type EstadoDeVigencia = (typeof ESTADOS_DE_VIGENCIA)[number];

/**
 * Los estados que el motor calcula, por vocabulario. El validador exige que `datos/estados.json` nombre cada
 * uno con su símbolo: un estado sin etiqueta solo se distinguiría por el color (regla dura 12).
 */
export const ESTADOS_QUE_CALCULA_EL_MOTOR: Readonly<
  Record<string, readonly string[]>
> = {
  vigencia: ESTADOS_DE_VIGENCIA,
};

export type UmbralesDeVigencia = Pick<
  Umbrales["vigencia"],
  "por_revisar" | "vencido"
>;

export interface Vigencia {
  id: string;
  fecha_verificacion: string;
  dias: number;
  estado: EstadoDeVigencia;
}

export type Desglose = Record<EstadoDeVigencia, number>;

export interface VigenciaDeFamilia {
  id: string;
  /** El estado y los días de su prueba más atrasada; `null` si la familia no tiene pruebas publicadas. */
  estado: EstadoDeVigencia | null;
  dias: number | null;
  desglose: Desglose;
}

export interface Semaforo {
  pruebas: Vigencia[];
  marcos: Vigencia[];
  herramientas: Vigencia[];
  familias: VigenciaDeFamilia[];
}

interface Fechado {
  id: string;
  fecha_verificacion: string;
}

export interface EntradaDelSemaforo {
  familias: readonly { id: string }[];
  pruebas: readonly (Fechado & { familia: string })[];
  marcos: readonly Fechado[];
  herramientas: readonly Fechado[];
}

/** Vigente antes de `por_revisar` días; por revisar desde ahí; vencido desde `vencido`. */
export function estadoDeVigencia(
  dias: number,
  umbrales: UmbralesDeVigencia,
): EstadoDeVigencia {
  if (dias >= umbrales.vencido) return "vencido";
  if (dias >= umbrales.por_revisar) return "por_revisar";
  return "vigente";
}

export function desglose(
  items: readonly { estado: EstadoDeVigencia | null }[],
): Desglose {
  const cuenta: Desglose = { vigente: 0, por_revisar: 0, vencido: 0 };
  for (const { estado } of items) if (estado !== null) cuenta[estado] += 1;
  return cuenta;
}

/**
 * El semáforo del catálogo en una fecha. Lanza `RangeError` si la fecha es anterior a alguna verificación:
 * una instantánea no puede decir que algo estaba vigente antes de que alguien lo verificara.
 */
export function semaforo(
  entrada: EntradaDelSemaforo,
  fecha: string,
  umbrales: UmbralesDeVigencia,
): Semaforo {
  const fechados = [
    ...entrada.pruebas,
    ...entrada.marcos,
    ...entrada.herramientas,
  ];
  const ultima = fechados.reduce(
    (max, f) => (f.fecha_verificacion > max ? f.fecha_verificacion : max),
    "",
  );
  if (fecha < ultima) {
    throw new RangeError(
      `la fecha de evaluación ${fecha} es anterior a la última verificación del catálogo (${ultima}) / ` +
        `the evaluation date ${fecha} is earlier than the catalog's latest verification (${ultima})`,
    );
  }
  const vigencia = ({ id, fecha_verificacion }: Fechado): Vigencia => {
    const dias = diasEntre(fecha_verificacion, fecha);
    return {
      id,
      fecha_verificacion,
      dias,
      estado: estadoDeVigencia(dias, umbrales),
    };
  };
  const pruebas = entrada.pruebas.map(vigencia);
  return {
    pruebas,
    marcos: entrada.marcos.map(vigencia),
    herramientas: entrada.herramientas.map(vigencia),
    familias: entrada.familias.map(({ id }) => {
      const suyas = pruebas.filter((_, i) => entrada.pruebas[i].familia === id);
      const peor = suyas.reduce<Vigencia | null>(
        (a, b) => (a === null || b.dias > a.dias ? b : a),
        null,
      );
      return {
        id,
        estado: peor?.estado ?? null,
        dias: peor?.dias ?? null,
        desglose: desglose(suyas),
      };
    }),
  };
}

export type Etiqueta = Estados["vocabularios"][number]["estados"][number];

/** El símbolo, el papel de color y el nombre de un estado, leídos del vocabulario. */
export function etiquetaDe(
  vocabularios: Estados["vocabularios"],
  vocabulario: string,
  estado: string,
): Etiqueta | undefined {
  return vocabularios
    .find((v) => v.id === vocabulario)
    ?.estados.find((e) => e.id === estado);
}
