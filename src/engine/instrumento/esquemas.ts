// Esquema de las semillas de cierre (C18, RF-10.3 y E-6): la validación del instrumento para el libro y la brecha. Cada
// semilla toma el mundo demo, cambia UNO o dos sobres y dice qué tiene que responder el motor: un cierre que debe negarse
// se niega nombrando su motivo, y «no detectado» no cuenta como verificado. Zod 4, `strictObject`, VALIDA y nunca TRANSFORMA.
import { z } from "zod";
import {
  IdControl,
  IdMinusculas,
  IdPrueba,
  Texto,
} from "../catalogo/esquemas.ts";
import { IdHallazgo, IdSobre } from "../evidencia/esquemas.ts";
import {
  ESTADOS_DE_HALLAZGO,
  MOTIVOS_DE_RECHAZO,
} from "../hallazgos/esquemas.ts";
import { ESTADOS_DE_CONTROL } from "../brecha/esquemas.ts";

/** Un sobre sembrado: uno que ya existe con campos cambiados, o uno nuevo copiado de otro. */
const SobreSembrado = z.strictObject({
  id: IdSobre,
  /** Si está, el sobre es NUEVO: una copia de ese. Si no, es el sobre demo de ese identificador. */
  copia_de: IdSobre.optional(),
  /** Campos cambiados, por ruta con puntos (`resultado.ejecutada`). */
  cambios: z.record(z.string().min(1), z.unknown()),
});
export type SobreSembrado = z.infer<typeof SobreSembrado>;

export const Espera = z.strictObject({
  hallazgos: z
    .array(
      z.strictObject({
        id: IdHallazgo,
        estado: z.enum(ESTADOS_DE_HALLAZGO),
      }),
    )
    .optional(),
  /** Por qué una re-prueba confirmada no cierra: sus motivos de rechazo, exactos. */
  candidatas: z
    .array(
      z.strictObject({
        hallazgo: IdHallazgo,
        sobre: IdSobre,
        motivos: z.array(z.enum(MOTIVOS_DE_RECHAZO)),
      }),
    )
    .optional(),
  /** Las re-pruebas que citan al hallazgo y siguen sin confirmar: una propuesta no cuenta. */
  por_confirmar: z
    .array(z.strictObject({ hallazgo: IdHallazgo, sobres: z.array(IdSobre) }))
    .optional(),
  controles: z
    .array(
      z.strictObject({ id: IdControl, estado: z.enum(ESTADOS_DE_CONTROL) }),
    )
    .optional(),
  filas: z
    .array(
      z.strictObject({
        activo: IdMinusculas,
        prueba: IdPrueba,
        sobre: IdSobre.nullable(),
        ejecutada: z.boolean(),
      }),
    )
    .optional(),
});
export type Espera = z.infer<typeof Espera>;

export const SemillaDeCierre = z.strictObject({
  id: z.string().regex(/^[A-Z0-9-]+$/, { message: "formato:id-semilla" }),
  requisito: z.enum(["RF-10.3", "E-6"]),
  que_siembra: Texto,
  sobres: z.array(SobreSembrado),
  espera: Espera,
});
export type SemillaDeCierre = z.infer<typeof SemillaDeCierre>;

export const SemillasDeCierre = z.strictObject({
  proposito: Texto,
  como_correr: Texto,
  semillas: z.array(SemillaDeCierre).min(1),
});
export type SemillasDeCierre = z.infer<typeof SemillasDeCierre>;
