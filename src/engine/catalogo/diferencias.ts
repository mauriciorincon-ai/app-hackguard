// Qué cambió entre dos instantáneas del catálogo (D1 del Sprint 10): lo que entra, lo que sale y lo que cambia, campo por campo,
// con la regla del validador que cuida cada campo y la huella de cada lado. PURO y determinista (regla dura 1): sin reloj, sin
// azar, sin modelo. Dos entradas son iguales si tienen la misma huella JCS: un JSON con las claves en otro orden NO es un cambio
// (el orden de las claves no es dato; el de los arreglos sí). La licencia manda sobre lo que se muestra (regla dura 11): de un
// marco que solo permite citar identificadores, el cambio se dice con el nombre del campo y las dos huellas, nunca con su texto.
import { huella } from "../huella.ts";
import type { Instantanea } from "./instantanea.ts";
import { REGLAS, type IdRegla } from "./reglas.ts";

export const SECCIONES = [
  "pruebas",
  "controles",
  "marcos",
  "equivalencias",
  "herramientas",
] as const;
export type Seccion = (typeof SECCIONES)[number];

export const TIPOS_DE_MOVIMIENTO = ["entra", "sale", "cambia"] as const;
export type TipoDeMovimiento = (typeof TIPOS_DE_MOVIMIENTO)[number];

export type ModoDeLicencia = "cita_con_atribucion" | "solo_identificadores";
/** Lo que la licencia de cada marco deja mostrar (`datos/propuestas/licencias.json`); un marco ausente es «solo_identificadores». */
export type Licencias = Readonly<Record<string, ModoDeLicencia>>;

export interface CambioDeCampo {
  campo: string;
  /** La regla del validador que cuida este campo: la que lo rechazaría si quedara mal. */
  regla: IdRegla;
  /** `null` si el campo no existía de ese lado (o valía `null`), o si es `oculto`. */
  antes: unknown;
  despues: unknown;
  /** El marco solo permite citar identificadores: el valor no se muestra, solo que cambió. */
  oculto: boolean;
}

export interface Movimiento {
  seccion: Seccion;
  id: string;
  tipo: TipoDeMovimiento;
  /** Huella JCS de la entrada en cada lado; `null` del lado donde no está. */
  huella_antes: string | null;
  huella_despues: string | null;
  /** Solo en «cambia»: los campos que difieren, en orden alfabético. */
  campos: CambioDeCampo[];
}

export interface DiferenciasEntreInstantaneas {
  de: { fecha: string; huella: string };
  a: { fecha: string; huella: string };
  movimientos: Movimiento[];
  resumen: Record<TipoDeMovimiento, number>;
  /** SHA-256 del JCS de todo lo anterior. */
  huella: string;
}

/** La regla del validador que cuida cada campo de una prueba; lo demás cae en la del esquema. */
export const REGLA_POR_CAMPO_DE_PRUEBA: Readonly<Record<string, IdRegla>> = {
  nombre: "texto/idioma-repetido",
  que_verifica: "texto/idioma-repetido",
  por_que_importa: "texto/idioma-repetido",
  familia: "prueba/familia-inexistente",
  categoria: "prueba/categoria-inexistente",
  marco_id: "prueba/sin-marco",
  version_marco: "referencia/sin-version",
  referencia_en_marco: "prueba/sin-referencia-en-marco",
  referencias_adicionales: "prueba/sin-referencia-en-marco",
  controles: "prueba/control-inexistente",
  control_pendiente: "prueba/control-pendiente-incoherente",
  herramientas_recomendadas: "prueba/herramienta-inexistente",
  resultado_esperado: "prueba/sin-resultado-esperado",
  criterio_de_veredicto: "prueba/sin-criterio",
  aplicabilidad: "prueba/sin-aplicabilidad",
  madurez: "prueba/madurez-no-admitida",
  estado_aprobacion: "prueba/aprobada-sin-revision",
  revision_contenido: "prueba/aprobada-sin-revision",
  revision: "prueba/revision-desactualizada",
};
const REGLA_POR_OMISION: IdRegla = "esquema/campo-invalido";

const REGLA_POR_CAMPO_DE_MARCO: Readonly<Record<string, IdRegla>> = {
  licencia: "marco/sin-licencia",
  fuente_oficial: "marco/sin-procedencia",
  vias_de_acceso: "marco/sin-procedencia",
  familias_aplicables: "marco/familia-inexistente",
  version_vigente: "referencia/version-inexistente",
  versiones_anteriores: "referencia/version-anterior",
};

const REGLA_POR_CAMPO_DE_ENTRADA: Readonly<Record<string, IdRegla>> = {
  pares: "equivalencias/entrada-sin-mapa",
  desde: "equivalencias/version-inexistente",
  hacia: "equivalencias/version-inexistente",
  marco_id: "equivalencias/marco-inexistente",
};

function reglaDe(seccion: Seccion, campo: string): IdRegla {
  const tabla =
    seccion === "pruebas"
      ? REGLA_POR_CAMPO_DE_PRUEBA
      : seccion === "marcos"
        ? REGLA_POR_CAMPO_DE_MARCO
        : seccion === "equivalencias"
          ? REGLA_POR_CAMPO_DE_ENTRADA
          : seccion === "controles"
            ? { resumen_llano: "control/equivalente-parcial-sin-nota" as const }
            : { licencia: "herramienta/sin-registro" as const };
  return (tabla as Record<string, IdRegla>)[campo] ?? REGLA_POR_OMISION;
}

/** Las reglas que esta tabla nombra existen: lo comprueba su test, para que un renombre de regla no la deje colgada. */
export const REGLAS_NOMBRADAS: readonly IdRegla[] = [
  ...Object.values(REGLA_POR_CAMPO_DE_PRUEBA),
  ...Object.values(REGLA_POR_CAMPO_DE_MARCO),
  ...Object.values(REGLA_POR_CAMPO_DE_ENTRADA),
  REGLA_POR_OMISION,
  "control/equivalente-parcial-sin-nota",
  "herramienta/sin-registro",
];
/**
 * El nombre con que se muestra la regla de un campo que cambió. La regla por omisión es la del esquema, cuyo nombre («Un campo no cumple el
 * esquema») suena a fallo; aquí el campo solo CAMBIÓ, así que se dice qué lo cuida, sin sonar a error.
 */
export const nombreDeRegla = (id: IdRegla) =>
  id === REGLA_POR_OMISION
    ? {
        es: "Forma del campo, según el esquema",
        en: "Shape of the field, per the schema",
      }
    : REGLAS[id].nombre;

interface Entrada {
  id: string;
  /** El marco al que pertenece, para la licencia; `null` si no es de ninguno. */
  marco: string | null;
  valor: Record<string, unknown>;
}

type Registro = Record<string, unknown> & { id: string };

function entradasDe(i: Instantanea, seccion: Seccion): Entrada[] {
  const c = i.catalogo;
  switch (seccion) {
    case "pruebas":
      return c.pruebas.map((p) => ({
        id: p.id,
        marco: p.marco_id,
        valor: p as unknown as Record<string, unknown>,
      }));
    case "marcos":
      return c.marcos.map((m) => ({
        id: m.id,
        marco: m.id,
        valor: m as unknown as Record<string, unknown>,
      }));
    case "equivalencias":
      return c.equivalencias.map((e) => ({
        id: e.id,
        marco: e.marco_id,
        valor: e as unknown as Record<string, unknown>,
      }));
    case "herramientas":
      return c.herramientas.map((h) => ({
        id: h.id,
        marco: null,
        valor: h as unknown as Record<string, unknown>,
      }));
    case "controles":
      // Un control es lo que se compara, no el marco de controles que lo agrupa: se aplanan sus áreas.
      return c.controles.flatMap((marcoDeControles) =>
        marcoDeControles.areas.flatMap((area) =>
          area.controles.map((control) => ({
            id: (control as Registro).id,
            marco: marcoDeControles.marco_id,
            valor: control as unknown as Record<string, unknown>,
          })),
        ),
      );
  }
}

async function indexar(
  entradas: Entrada[],
): Promise<Map<string, Entrada & { huella: string }>> {
  const m = new Map<string, Entrada & { huella: string }>();
  for (const e of entradas)
    m.set(e.id, { ...e, huella: await huella(e.valor) });
  return m;
}

const comparar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Compara dos instantáneas. `a` es la más nueva por convención, pero la función es simétrica en su contrato: lo que `de` tiene y
 * `a` no, sale; lo que `a` tiene y `de` no, entra.
 */
export async function diferenciasEntreInstantaneas(
  de: Instantanea,
  a: Instantanea,
  licencias: Licencias = {},
): Promise<DiferenciasEntreInstantaneas> {
  const movimientos: Movimiento[] = [];
  for (const seccion of SECCIONES) {
    const antes = await indexar(entradasDe(de, seccion));
    const despues = await indexar(entradasDe(a, seccion));
    const ids = [...new Set([...antes.keys(), ...despues.keys()])].sort(
      comparar,
    );
    for (const id of ids) {
      const x = antes.get(id);
      const y = despues.get(id);
      if (x === undefined && y !== undefined) {
        movimientos.push({
          seccion,
          id,
          tipo: "entra",
          huella_antes: null,
          huella_despues: y.huella,
          campos: [],
        });
      } else if (x !== undefined && y === undefined) {
        movimientos.push({
          seccion,
          id,
          tipo: "sale",
          huella_antes: x.huella,
          huella_despues: null,
          campos: [],
        });
      } else if (x !== undefined && y !== undefined && x.huella !== y.huella) {
        // La licencia manda si CUALQUIERA de los dos lados es de un marco que solo permite citar identificadores: el valor viejo de un marco
        // restringido sigue siendo su texto aunque la entrada pase a uno que cita (regla dura 11).
        const restringido = (marco: string | null) =>
          marco !== null &&
          (licencias[marco] ?? "solo_identificadores") ===
            "solo_identificadores";
        const oculto = restringido(x.marco) || restringido(y.marco);
        const claves = [
          ...new Set([...Object.keys(x.valor), ...Object.keys(y.valor)]),
        ].sort(comparar);
        const campos: CambioDeCampo[] = [];
        for (const campo of claves) {
          const antesC = x.valor[campo];
          const despuesC = y.valor[campo];
          // Ausente y `null` no son lo mismo para JCS: si la entrada cambió de huella solo por eso, el campo se nombra igual (un «cambia» nunca
          // sale con la lista de campos vacía).
          const mismaPresencia =
            Object.hasOwn(x.valor, campo) === Object.hasOwn(y.valor, campo);
          if (
            mismaPresencia &&
            (await huella(antesC ?? null)) === (await huella(despuesC ?? null))
          )
            continue;
          campos.push({
            campo,
            regla: reglaDe(seccion, campo),
            antes: oculto ? null : (antesC ?? null),
            despues: oculto ? null : (despuesC ?? null),
            oculto,
          });
        }
        movimientos.push({
          seccion,
          id,
          tipo: "cambia",
          huella_antes: x.huella,
          huella_despues: y.huella,
          campos,
        });
      }
    }
  }
  const resumen: Record<TipoDeMovimiento, number> = {
    entra: 0,
    sale: 0,
    cambia: 0,
  };
  for (const m of movimientos) resumen[m.tipo]++;
  const cuerpo = {
    de: { fecha: de.fecha_evaluacion, huella: de.huella },
    a: { fecha: a.fecha_evaluacion, huella: a.huella },
    movimientos,
    resumen,
  };
  return { ...cuerpo, huella: await huella(cuerpo) };
}
