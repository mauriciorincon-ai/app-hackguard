// Los nombres de las métricas de CVSS 4.0 que la pantalla del hallazgo muestra («Vector de ataque: Red»). Son dato
// (regla dura 10): identificadores del estándar de first.org con un nombre por idioma. El puntaje no sale de aquí:
// lo calcula la referencia fijada. Las métricas base se nombran una por una; las opcionales (amenaza, entorno y
// suplementarias) se nombran por grupo, porque un vector las puede traer pero ninguna cambia lo que la pantalla explica.
import { z } from "zod";
import { IdMinusculas, Nombre, Texto } from "../catalogo/esquemas.ts";
import { regla, t } from "../evidencia/molde.ts";
import type {
  EstadoDeValidacion,
  HallazgoDeValidacion,
} from "../evidencia/molde.ts";
import { estadoDe } from "../evidencia/molde.ts";
import { METRICAS_BASE, METRICAS_OPCIONALES } from "./validar-vector.ts";

const Clave = z.string().regex(/^[A-Z]{1,3}$/);

export const EtiquetasDeCvss = z.strictObject({
  version: Nombre,
  nota: Texto,
  metricas: z.array(
    z.strictObject({
      clave: Clave,
      nombre: Texto,
      valores: z.array(z.strictObject({ valor: Nombre, nombre: Texto })),
    }),
  ),
  grupos: z.array(
    z.strictObject({
      id: IdMinusculas,
      claves: z.array(Clave),
      nombre: Texto,
    }),
  ),
});
export type EtiquetasDeCvss = z.infer<typeof EtiquetasDeCvss>;

export const REGLAS_DE_ETIQUETAS_DE_CVSS = {
  "etiquetas-cvss/metrica-base-sin-nombre": regla(
    "error",
    "Una métrica base de CVSS 4.0 no tiene nombre o le falta el nombre de un valor",
    "A CVSS 4.0 base metric has no name or lacks the name of a value",
  ),
  "etiquetas-cvss/metrica-desconocida": regla(
    "error",
    "Se nombra una métrica o un valor que CVSS 4.0 no tiene",
    "A metric or value that CVSS 4.0 does not have is named",
  ),
  "etiquetas-cvss/opcional-sin-grupo": regla(
    "error",
    "Una métrica opcional no está en ningún grupo, o está en dos",
    "An optional metric is in no group, or in two",
  ),
} as const;
export type IdReglaDeEtiquetasDeCvss =
  keyof typeof REGLAS_DE_ETIQUETAS_DE_CVSS;

/** Cada métrica base y cada uno de sus valores con nombre; cada opcional en un grupo; nada que el estándar no tenga. */
export function validarEtiquetasDeCvss(
  e: EtiquetasDeCvss,
  ruta = "datos/severidad/cvss-etiquetas.json",
): {
  estado: EstadoDeValidacion;
  hallazgos: HallazgoDeValidacion<IdReglaDeEtiquetasDeCvss>[];
} {
  const hallazgos: HallazgoDeValidacion<IdReglaDeEtiquetasDeCvss>[] = [];
  const agregar = (
    id: IdReglaDeEtiquetasDeCvss,
    campo: string,
    detalle: string,
  ) => {
    const r = REGLAS_DE_ETIQUETAS_DE_CVSS[id];
    hallazgos.push({
      regla: id,
      nombre: r.nombre,
      severidad: r.severidad,
      ruta,
      campo,
      detalle: t(detalle, detalle),
    });
  };
  for (const [clave, valores] of METRICAS_BASE) {
    const m = e.metricas.find((x) => x.clave === clave);
    if (m === undefined) {
      agregar("etiquetas-cvss/metrica-base-sin-nombre", "metricas", clave);
      continue;
    }
    for (const v of valores)
      if (!m.valores.some((x) => x.valor === v))
        agregar(
          "etiquetas-cvss/metrica-base-sin-nombre",
          `metricas.${clave}`,
          `${clave}:${v}`,
        );
  }
  for (const m of e.metricas) {
    const base = METRICAS_BASE.find(([k]) => k === m.clave);
    if (base === undefined)
      agregar("etiquetas-cvss/metrica-desconocida", "metricas", m.clave);
    else
      for (const v of m.valores)
        if (!base[1].some((x) => x === v.valor))
          agregar(
            "etiquetas-cvss/metrica-desconocida",
            `metricas.${m.clave}`,
            `${m.clave}:${v.valor}`,
          );
  }
  for (const [clave] of METRICAS_OPCIONALES) {
    const enGrupos = e.grupos.filter((g) => g.claves.includes(clave)).length;
    if (enGrupos !== 1)
      agregar("etiquetas-cvss/opcional-sin-grupo", "grupos", clave);
  }
  for (const g of e.grupos)
    for (const clave of g.claves)
      if (!METRICAS_OPCIONALES.some(([k]) => k === clave))
        agregar("etiquetas-cvss/metrica-desconocida", `grupos.${g.id}`, clave);
  return { estado: estadoDe(hallazgos), hallazgos };
}

/** El nombre de una métrica y de su valor; las opcionales se nombran por grupo y sin valor. */
export function nombreDeMetrica(
  e: EtiquetasDeCvss,
  clave: string,
  valor: string,
): { metrica: { es: string; en: string }; valor: { es: string; en: string } | null } {
  const m = e.metricas.find((x) => x.clave === clave);
  if (m !== undefined)
    return {
      metrica: m.nombre,
      valor: m.valores.find((v) => v.valor === valor)?.nombre ?? null,
    };
  const g = e.grupos.find((x) => x.claves.includes(clave));
  return {
    metrica: g?.nombre ?? { es: clave, en: clave },
    valor: null,
  };
}
