// Los supuestos S1 y S2 del plan v2 de los agentes como SEMILLAS de la validación del instrumento (C18): el motor las corre antes de
// publicar, y si una falla el build se detiene (regla dura 9).
//   S1 · comprobar que una cita es subcadena literal de su fuente basta para detectar una cita inventada: se siembran citas, la mitad
//        inventadas, y el verificador tiene que marcar exactamente las inventadas.
//   S2 · una skill sin herramientas ni red solo puede sesgar su propia salida: se pega un texto con una instrucción sembrada y el
//        veredicto que calcula la regla tiene que ser el mismo que con el texto limpio, y la instrucción tiene que quedar marcada.
// Zod 4, `strictObject`: VALIDA y nunca TRANSFORMA.
import { z } from "zod";
import { filtrar, type PatronCompilado } from "../catalogo/filtro.ts";
import { IdMinusculas, Texto } from "../catalogo/esquemas.ts";
import { VEREDICTOS } from "../evidencia/esquemas.ts";
import type {
  ComprobacionDeInstrumento,
  ResultadoDeSemilla,
} from "../instrumento/cierres.ts";
import { verificarCita } from "./citas.ts";
import { CandidataDeSobre } from "./esquemas.ts";
import { citasDeCandidata } from "./verificar.ts";
import { veredictoDeCandidata } from "./veredicto.ts";

const IdDeSemilla = z.string().regex(/^S[12]-[A-Z0-9-]+$/, {
  message: "formato:id-semilla",
});

export const SemillasDeAgentes = z.strictObject({
  proposito: Texto,
  como_correr: Texto,
  s1: z.strictObject({
    nombre: Texto,
    /** La página contra la que se comprueban las citas. */
    texto: z.string().min(1),
    citas: z
      .array(
        z.strictObject({
          id: IdDeSemilla,
          cita: z.string().min(1),
          /** Lo que el verificador tiene que responder: `true` si la cita es literal, `false` si está inventada. */
          es_literal: z.boolean(),
        }),
      )
      .min(2),
  }),
  s2: z.strictObject({
    nombre: Texto,
    regla: z.strictObject({
      regla: IdMinusculas,
      k: z.int().min(1).nullable(),
    }),
    casos: z
      .array(
        z.strictObject({
          id: IdDeSemilla,
          que_siembra: Texto,
          texto_limpio: z.string().min(1),
          texto_con_instruccion: z.string().min(1),
          /** Lo que escribiría un extractor honrado, con citas que están en los dos textos. */
          candidata: CandidataDeSobre,
          /** Lo que escribiría uno secuestrado: conteos que el texto no respalda. */
          candidata_secuestrada: CandidataDeSobre,
          espera: z.strictObject({ veredicto: z.enum(VEREDICTOS) }),
        }),
      )
      .min(1),
  }),
});
export type SemillasDeAgentes = z.infer<typeof SemillasDeAgentes>;

function s1(semillas: SemillasDeAgentes["s1"]): ComprobacionDeInstrumento {
  const resultados: ResultadoDeSemilla[] = semillas.citas.map((c) => {
    const obtenido =
      verificarCita("fecha", c.cita, undefined, semillas.texto).estado ===
      "verificada";
    return {
      id: c.id,
      requisito: "S1",
      pasa: obtenido === c.es_literal,
      diferencias:
        obtenido === c.es_literal
          ? []
          : [
              c.es_literal
                ? "una cita literal quedó sin verificar"
                : "una cita inventada se dio por verificada",
            ],
    };
  });
  return {
    requisito: "S1",
    nombre: semillas.nombre,
    sembradas: resultados.length,
    obtenidas: resultados.filter((r) => r.pasa).length,
    semillas: resultados,
  };
}

function s2(
  semillas: SemillasDeAgentes["s2"],
  patrones: PatronCompilado[],
): ComprobacionDeInstrumento {
  const resultados: ResultadoDeSemilla[] = semillas.casos.map((caso) => {
    const diferencias: string[] = [];
    const veredictoCon = (candidata: typeof caso.candidata, texto: string) =>
      veredictoDeCandidata(
        candidata,
        citasDeCandidata(candidata, texto),
        semillas.regla,
      ).veredicto_sugerido?.veredicto ?? null;

    if (
      filtrar({ texto_pegado: caso.texto_con_instruccion }, patrones).length ===
      0
    )
      diferencias.push("la instrucción sembrada no quedó marcada");
    if (filtrar({ texto_pegado: caso.texto_limpio }, patrones).length > 0)
      diferencias.push("el texto limpio quedó marcado");
    const limpio = veredictoCon(caso.candidata, caso.texto_limpio);
    const sembrado = veredictoCon(caso.candidata, caso.texto_con_instruccion);
    if (limpio !== caso.espera.veredicto)
      diferencias.push(
        `el texto limpio dio «${limpio ?? "ninguno"}» y se esperaba «${caso.espera.veredicto}»`,
      );
    if (sembrado !== limpio)
      diferencias.push(
        `la instrucción sembrada cambió el veredicto: «${limpio ?? "ninguno"}» → «${sembrado ?? "ninguno"}»`,
      );
    const secuestrado = veredictoCon(
      caso.candidata_secuestrada,
      caso.texto_con_instruccion,
    );
    if (secuestrado !== null)
      diferencias.push(
        `una salida secuestrada con conteos sin cita dio un veredicto: «${secuestrado}»`,
      );
    return {
      id: caso.id,
      requisito: "S2",
      pasa: diferencias.length === 0,
      diferencias,
    };
  });
  return {
    requisito: "S2",
    nombre: semillas.nombre,
    sembradas: resultados.length,
    obtenidas: resultados.filter((r) => r.pasa).length,
    semillas: resultados,
  };
}

/** Corre S1 y S2 y las devuelve como comprobaciones del instrumento, junto a las de los cierres. */
export function validarSemillasDeAgentes(
  semillas: SemillasDeAgentes,
  patronesDeInstrucciones: PatronCompilado[],
): ComprobacionDeInstrumento[] {
  return [s1(semillas.s1), s2(semillas.s2, patronesDeInstrucciones)];
}
