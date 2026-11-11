// D2 · el perfil de un activo desde la ficha técnica de CV Viva. Una TABLA, no una IA: cada regla de
// `datos/planificador/ficha-a-rasgos.json` liga un rasgo del perfil con términos que deben aparecer, literales, en un campo
// de la ficha. Sin fragmento no hay propuesta (default (i) del S13): un rasgo que ningún texto respalda queda «sin responder».
//
// Puro y sin Node: corre igual en el CLI y en el navegador (la pantalla lee el archivo en el cliente y no lo sube).
// Determinista: la misma ficha y la misma tabla dan la misma salida, en el mismo orden (campos como en la tabla, elementos en orden).
//
// Lo que la ficha dice se trata como DATO inerte (regla dura 4): el fragmento es el texto tal cual y quien lo muestra lo escapa.
import { z } from "zod";

/** Los campos de la ficha que la tabla puede leer (rutas del contrato vendorizado, `datos/contratos/ficha-tecnica/`). */
export const CAMPOS_LEIBLES = [
  "titular",
  "promesa.tagline",
  "promesa.intro",
  "promesa.para_quien",
  "stack[].nombre",
  "stack[].papel",
  "bloques[].nombre",
  "bloques[].linea",
  "limites[]",
  "nunca[]",
] as const;
export type CampoLeible = (typeof CAMPOS_LEIBLES)[number];

const Frase = z.string().min(1);

export const ReglaDeFicha = z.strictObject({
  id: z.string().regex(/^[a-z0-9_]+(?:-[a-z0-9_]+)*$/),
  rasgo: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  valor: z.boolean(),
  campos: z.array(z.enum(CAMPOS_LEIBLES)).min(1),
  terminos: z.array(Frase).min(1),
  razon: z.strictObject({ es: Frase, en: Frase }),
});
export type ReglaDeFicha = z.infer<typeof ReglaDeFicha>;

export const TablaFichaARasgos = z.strictObject({
  version: z.number().int().positive(),
  nota: z.strictObject({ es: Frase, en: Frase }),
  reglas: z.array(ReglaDeFicha).min(1),
});
export type TablaFichaARasgos = z.infer<typeof TablaFichaARasgos>;

const Texto = z.string();
const Elemento = z.object({
  nombre: Texto.optional(),
  papel: Texto.optional(),
});

/** Solo lo que D2 lee de la ficha; el resto del contrato no le importa (la validación completa es la del contrato). */
export const FichaLeida = z.object({
  schema_version: z.string().regex(/^1\.\d+\.\d+$/),
  titular: Texto,
  promesa: z.object({
    tagline: Texto,
    intro: Texto,
    para_quien: Texto,
  }),
  stack: z.array(Elemento).min(1),
  bloques: z.array(z.object({ nombre: Texto, linea: Texto })).min(2),
  limites: z.array(Texto).min(2),
  nunca: z.array(Texto).min(2),
});
export type FichaLeida = z.infer<typeof FichaLeida>;

export interface Fragmento {
  campo: CampoLeible;
  /** Dónde está en esta ficha: `stack[2].papel`, `nunca[0]`, `promesa.intro`. */
  ruta: string;
  /** El texto de ese campo, literal. */
  texto: string;
}

export interface Cita {
  regla: string;
  valor: boolean;
  fragmento: Fragmento;
  termino: string;
}

export type MotivoSinResponder =
  "sin_fragmento" | "conflicto" | "no_es_si_o_no";

export type RasgoDeFicha =
  | {
      rasgo: string;
      estado: "propuesto";
      valor: boolean;
      cita: Cita;
    }
  | {
      rasgo: string;
      estado: "sin_responder";
      motivo: MotivoSinResponder;
      /** Con «conflicto» lleva las dos citas que chocan; en los otros motivos va vacío. */
      citas: Cita[];
    };

/** Sin tildes ni mayúsculas, con espacios sencillos: así se comparan términos y texto. */
export function plegar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** ¿Aparece el término, como palabra o frase completa, en el texto? */
export function contieneTermino(texto: string, termino: string): boolean {
  const patron = new RegExp(
    `(?<![a-z0-9])${escapar(plegar(termino))}(?![a-z0-9])`,
  );
  return patron.test(plegar(texto));
}

/** Los textos de la ficha que un campo nombra, en orden, con su ruta. */
export function fragmentosDe(
  ficha: FichaLeida,
  campo: CampoLeible,
): Fragmento[] {
  const f = (ruta: string, texto: string | undefined): Fragmento[] =>
    texto === undefined || texto.length === 0 ? [] : [{ campo, ruta, texto }];
  switch (campo) {
    case "titular":
      return f("titular", ficha.titular);
    case "promesa.tagline":
      return f(campo, ficha.promesa.tagline);
    case "promesa.intro":
      return f(campo, ficha.promesa.intro);
    case "promesa.para_quien":
      return f(campo, ficha.promesa.para_quien);
    case "stack[].nombre":
      return ficha.stack.flatMap((e, i) => f(`stack[${i}].nombre`, e.nombre));
    case "stack[].papel":
      return ficha.stack.flatMap((e, i) => f(`stack[${i}].papel`, e.papel));
    case "bloques[].nombre":
      return ficha.bloques.flatMap((b, i) =>
        f(`bloques[${i}].nombre`, b.nombre),
      );
    case "bloques[].linea":
      return ficha.bloques.flatMap((b, i) => f(`bloques[${i}].linea`, b.linea));
    case "limites[]":
      return ficha.limites.flatMap((t, i) => f(`limites[${i}]`, t));
    case "nunca[]":
      return ficha.nunca.flatMap((t, i) => f(`nunca[${i}]`, t));
  }
}

/** La primera cita de una regla en la ficha (por orden de campos y de elementos), o null si ningún texto la respalda. */
function citaDe(ficha: FichaLeida, regla: ReglaDeFicha): Cita | null {
  for (const campo of regla.campos) {
    for (const fragmento of fragmentosDe(ficha, campo)) {
      const termino = regla.terminos.find((t) =>
        contieneTermino(fragmento.texto, t),
      );
      if (termino !== undefined)
        return { regla: regla.id, valor: regla.valor, fragmento, termino };
    }
  }
  return null;
}

/**
 * Lo que la ficha respalda, rasgo por rasgo. `rasgos` son los ids del perfil, en el orden que se quiere ver; los que no son
 * de sí o no no se contestan desde una ficha. Dos reglas que dicen lo contrario sobre un mismo rasgo lo dejan «sin responder»
 * con las dos citas: la persona decide, la tabla no elige.
 */
export function proponerDesdeFicha(
  ficha: FichaLeida,
  tabla: TablaFichaARasgos,
  rasgos: readonly { id: string; tipo: "booleano" | "opcion" }[],
): RasgoDeFicha[] {
  return rasgos.map((r): RasgoDeFicha => {
    if (r.tipo !== "booleano")
      return {
        rasgo: r.id,
        estado: "sin_responder",
        motivo: "no_es_si_o_no",
        citas: [],
      };
    const citas = tabla.reglas
      .filter((regla) => regla.rasgo === r.id)
      .flatMap((regla) => {
        const c = citaDe(ficha, regla);
        return c === null ? [] : [c];
      });
    const distintas = new Set(citas.map((c) => c.valor));
    if (citas.length === 0)
      return {
        rasgo: r.id,
        estado: "sin_responder",
        motivo: "sin_fragmento",
        citas: [],
      };
    if (distintas.size > 1)
      return {
        rasgo: r.id,
        estado: "sin_responder",
        motivo: "conflicto",
        citas,
      };
    return {
      rasgo: r.id,
      estado: "propuesto",
      valor: citas[0]!.valor,
      cita: citas[0]!,
    };
  });
}

/** Lo que se guarda: solo los rasgos que una persona confirmó, con su cita. No es un activo: la ficha no responde el resto. */
export const PerfilPropuesto = z.strictObject({
  formato: z.literal("perfil-propuesto/1"),
  id: z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/),
  origen: z.literal("propio"),
  ficha: z.strictObject({
    schema_version: z.string().regex(/^1\.\d+\.\d+$/),
    huella: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  confirmado_por: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rasgos: z.record(z.string(), z.boolean()),
  citas: z.record(
    z.string(),
    z.strictObject({
      regla: z.string(),
      campo: z.string(),
      ruta: z.string(),
      texto: z.string(),
    }),
  ),
  sin_responder: z.array(z.string()),
  nota: z.strictObject({ es: Frase, en: Frase }),
});
export type PerfilPropuesto = z.infer<typeof PerfilPropuesto>;

export const NOTA_DEL_PERFIL = {
  es: "No es un activo: la ficha no responde la familia, el acceso, el dueño, el alcance ni las reglas de enfrentamiento. Sin alcance autorizado y reglas no hay plan (regla dura 5).",
  en: "This is not an asset: the ficha does not answer the family, the access, the owner, the scope or the rules of engagement. Without an authorized scope and rules there is no plan (hard rule 5).",
};

/**
 * Arma el perfil que se guarda. Solo entran los rasgos propuestos que la persona confirmó; lo demás va a `sin_responder`.
 * Quien llama pasa la huella de la ficha (SHA-256 de sus bytes): la ficha misma no se guarda.
 */
export function armarPerfilPropuesto(e: {
  id: string;
  por: string;
  fecha: string;
  fichaVersion: string;
  fichaHuella: string;
  propuestas: readonly RasgoDeFicha[];
  confirmados: ReadonlySet<string>;
}): PerfilPropuesto {
  const rasgos: Record<string, boolean> = {};
  const citas: PerfilPropuesto["citas"] = {};
  const sin: string[] = [];
  for (const p of e.propuestas) {
    if (p.estado === "propuesto" && e.confirmados.has(p.rasgo)) {
      rasgos[p.rasgo] = p.valor;
      citas[p.rasgo] = {
        regla: p.cita.regla,
        campo: p.cita.fragmento.campo,
        ruta: p.cita.fragmento.ruta,
        texto: p.cita.fragmento.texto,
      };
    } else sin.push(p.rasgo);
  }
  return PerfilPropuesto.parse({
    formato: "perfil-propuesto/1",
    id: e.id,
    origen: "propio",
    ficha: { schema_version: e.fichaVersion, huella: e.fichaHuella },
    confirmado_por: e.por,
    fecha: e.fecha,
    rasgos,
    citas,
    sin_responder: sin,
    nota: NOTA_DEL_PERFIL,
  });
}
