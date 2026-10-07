// Las reglas del validador del catálogo, cada una con su severidad y su nombre en los dos idiomas. Un
// hallazgo siempre nombra su regla: es lo que la semilla espera (C18) y lo que la persona lee.
//
// Severidades:
// - error: el catálogo es inválido y no se publica ninguna instantánea (RF-10.6);
// - advertencia: el catálogo es válido pero algo pide atención (sin control, marcada por el filtro);
// - nota: información que debe verse y no cambia el estado (un dato `por_verificar` declarado).
import type { Texto } from "./esquemas.ts";

export type Severidad = "error" | "advertencia" | "nota";

interface Regla {
  severidad: Severidad;
  nombre: Texto;
}

const r = (severidad: Severidad, es: string, en: string): Regla => ({
  severidad,
  nombre: { es, en },
});

export const REGLAS = {
  // Archivos y forma.
  "archivo/falta": r(
    "error",
    "Falta un archivo obligatorio del catálogo",
    "A required catalog file is missing",
  ),
  "archivo/json-invalido": r(
    "error",
    "El archivo no es JSON válido",
    "The file is not valid JSON",
  ),
  "archivo/nombre-no-coincide": r(
    "error",
    "El nombre del archivo no coincide con su id",
    "The file name does not match its id",
  ),
  "esquema/campo-invalido": r(
    "error",
    "Un campo no cumple el esquema",
    "A field does not match the schema",
  ),
  "esquema/campo-desconocido": r(
    "error",
    "Un campo no existe en el esquema",
    "A field does not exist in the schema",
  ),
  "catalogo/id-duplicado": r(
    "error",
    "Dos entradas comparten id",
    "Two entries share an id",
  ),
  "texto/idioma-repetido": r(
    "error",
    "Un texto largo dice lo mismo en español y en inglés: falta redactarlo en uno",
    "A long text says the same in Spanish and English: one language is not written yet",
  ),

  // Referencias a un marco (E-15).
  "referencia/sin-version": r(
    "error",
    "Una referencia a un marco no dice la versión",
    "A framework reference does not state its version",
  ),
  "referencia/marco-inexistente": r(
    "error",
    "La referencia cita un marco que el catálogo no tiene",
    "The reference cites a framework the catalog does not have",
  ),
  "referencia/version-inexistente": r(
    "error",
    "La referencia cita una versión que el marco no tiene",
    "The reference cites a version the framework does not have",
  ),
  "referencia/entrada-inexistente": r(
    "error",
    "La referencia cita una entrada que esa versión del marco no tiene",
    "The reference cites an entry that this framework version does not have",
  ),
  "referencia/version-anterior": r(
    "advertencia",
    "La referencia cita una versión anterior; el mapa la resuelve a la vigente",
    "The reference cites an earlier version; the map resolves it to the current one",
  ),
  "referencia/sin-sucesora": r(
    "advertencia",
    "La entrada citada se retiró sin sucesora en la versión vigente",
    "The cited entry was retired with no successor in the current version",
  ),

  // Pruebas (RF-01.2, E-2, E-7, E-23).
  "prueba/sin-marco": r(
    "error",
    "La prueba no cita un marco",
    "The test does not cite a framework",
  ),
  "prueba/sin-referencia-en-marco": r(
    "error",
    "La prueba no dice qué entrada del marco cita",
    "The test does not say which framework entry it cites",
  ),
  "prueba/sin-resultado-esperado": r(
    "error",
    "La prueba no tiene resultado esperado",
    "The test has no expected result",
  ),
  "prueba/sin-criterio": r(
    "error",
    "La prueba no tiene criterio de veredicto",
    "The test has no verdict criterion",
  ),
  "prueba/sin-aplicabilidad": r(
    "error",
    "La prueba no dice cuándo aplica",
    "The test does not say when it applies",
  ),
  "prueba/estocastica-sin-k": r(
    "error",
    "La familia es estocástica y la prueba no declara cuántas repeticiones (k)",
    "The family is stochastic and the test does not declare how many repetitions (k)",
  ),
  "prueba/regla-inexistente": r(
    "error",
    "La regla de veredicto no existe",
    "The verdict rule does not exist",
  ),
  "prueba/regla-no-admitida": r(
    "error",
    "La regla de veredicto no sirve para esta familia",
    "The verdict rule does not fit this family",
  ),
  "prueba/familia-inexistente": r(
    "error",
    "La familia no existe",
    "The family does not exist",
  ),
  "prueba/categoria-inexistente": r(
    "error",
    "La categoría no existe en la familia",
    "The category does not exist in the family",
  ),
  "prueba/madurez-no-admitida": r(
    "error",
    "Esta familia no admite esa madurez",
    "This family does not admit that maturity",
  ),
  "prueba/marco-no-aplica": r(
    "error",
    "El marco citado no aplica a la familia de la prueba",
    "The cited framework does not apply to the test's family",
  ),
  "prueba/control-inexistente": r(
    "error",
    "El control no está en ninguna capa cargada",
    "The control is not in any loaded layer",
  ),
  "prueba/control-pendiente-incoherente": r(
    "error",
    "control_pendiente no coincide con la lista de controles",
    "control_pendiente does not match the list of controls",
  ),
  "prueba/sin-control": r(
    "advertencia",
    "La prueba no da evidencia a ningún control todavía (control_pendiente)",
    "The test gives evidence to no control yet (control_pendiente)",
  ),
  "prueba/herramienta-inexistente": r(
    "error",
    "La herramienta recomendada no existe en el catálogo",
    "The recommended tool does not exist in the catalog",
  ),
  "prueba/herramienta-no-cubre-la-familia": r(
    "error",
    "La herramienta no cubre la familia de la prueba",
    "The tool does not cover the test's family",
  ),
  "prueba/entorno-no-soportado": r(
    "error",
    "La herramienta no corre en ese entorno",
    "The tool does not run in that environment",
  ),
  "prueba/selector-no-corresponde": r(
    "error",
    "El selector no tiene la forma que pide la herramienta",
    "The selector does not have the shape the tool requires",
  ),
  "prueba/arnes-no-recomendado": r(
    "error",
    "El resultado esperado se mide con una herramienta que la prueba no recomienda",
    "The expected result is measured with a tool the test does not recommend",
  ),
  "prueba/rasgo-inexistente": r(
    "error",
    "La condición de aplicabilidad usa un rasgo que el perfil no tiene",
    "The applicability condition uses a trait the profile does not have",
  ),
  "prueba/condicion-invalida": r(
    "error",
    "El valor de la condición no corresponde al rasgo",
    "The condition value does not fit the trait",
  ),
  "prueba/aprobada-sin-revision": r(
    "error",
    "La prueba está aprobada y marcada para revisión: una persona tiene que revisarla antes",
    "The test is approved and flagged for review: a person has to review it first",
  ),
  "prueba/revision-sin-registro": r(
    "error",
    "La prueba dice revisada y aprobada sin el registro de la revisión",
    "The test says reviewed and approved with no review record",
  ),
  "prueba/revision-desactualizada": r(
    "advertencia",
    "El contenido cambió después de la revisión: vuelve a esperar revisión",
    "The content changed after the review: it is waiting for review again",
  ),

  // Filtro de contenido (RF-01.3, DA-03): marca, nunca rechaza.
  "filtro/marcada": r(
    "advertencia",
    "El filtro de contenido la marcó para revisión",
    "The content filter flagged it for review",
  ),
  "filtro/marcada-y-revisada": r(
    "nota",
    "El filtro la marca y una persona ya la revisó y la aprobó",
    "The filter flags it and a person already reviewed and approved it",
  ),
  "filtro/expresion-invalida": r(
    "error",
    "Un patrón del filtro no es una expresión válida",
    "A filter pattern is not a valid expression",
  ),
  "filtro/carnada-no-marca": r(
    "error",
    "Un patrón del filtro no marca su propia carnada",
    "A filter pattern does not flag its own bait",
  ),
  "filtro/contraejemplo-marca": r(
    "error",
    "El filtro marca un contraejemplo que no debe marcar",
    "The filter flags a counterexample it must not flag",
  ),

  // Marcos (DA-01, DA-10).
  "marco/sin-procedencia": r(
    "error",
    "El marco no tiene fuente oficial con su código HTTP",
    "The framework has no official source with its HTTP code",
  ),
  "marco/sin-licencia": r(
    "error",
    "El marco no declara su licencia",
    "The framework does not declare its licence",
  ),
  "marco/por-verificar": r(
    "nota",
    "Un dato del marco está por verificar",
    "A framework field is pending verification",
  ),
  "marco/nulo-sin-declarar": r(
    "error",
    "Un dato nulo del marco no está declarado como por verificar",
    "A null framework field is not declared as pending verification",
  ),
  "marco/fuente-no-accesible-sin-declarar": r(
    "error",
    "La fuente oficial no respondió 2xx y el marco no lo declara",
    "The official source did not answer 2xx and the framework does not declare it",
  ),
  "marco/familia-inexistente": r(
    "error",
    "El marco aplica a una familia que no existe",
    "The framework applies to a family that does not exist",
  ),
  "marco/equivalencias-inexistentes": r(
    "error",
    "La versión anterior cita un mapa de equivalencias que no existe",
    "The earlier version cites an equivalence map that does not exist",
  ),

  // Mapas de equivalencias (RF-01.6, E-15).
  "equivalencias/marco-inexistente": r(
    "error",
    "El mapa es de un marco que el catálogo no tiene",
    "The map belongs to a framework the catalog does not have",
  ),
  "equivalencias/version-inexistente": r(
    "error",
    "El mapa une versiones que el marco no tiene",
    "The map joins versions the framework does not have",
  ),
  "equivalencias/entrada-inexistente": r(
    "error",
    "El mapa cita una entrada que su versión no tiene",
    "The map cites an entry its version does not have",
  ),
  "equivalencias/entrada-sin-mapa": r(
    "error",
    "Una entrada de la versión anterior no está en el mapa",
    "An entry of the earlier version is missing from the map",
  ),
  "equivalencias/no-citado": r(
    "error",
    "Ninguna versión anterior del marco cita este mapa",
    "No earlier version of the framework cites this map",
  ),

  // Umbrales y vocabulario de estados (RF-01.5, regla dura 12).
  "umbrales/orden-invalido": r(
    "error",
    "El umbral de vencido no es mayor que el de por revisar",
    "The overdue threshold is not greater than the review-due threshold",
  ),
  "estados/sin-etiqueta": r(
    "error",
    "Un estado que calcula el motor no tiene nombre ni símbolo en el vocabulario",
    "A state the engine computes has no name or symbol in the vocabulary",
  ),

  // Controles (§ 6.2, E-16).
  "control/equivalente-parcial-sin-nota": r(
    "error",
    "Una equivalencia parcial no dice qué le falta",
    "A partial equivalence does not say what it lacks",
  ),

  // Herramientas (§ 6.3, E-26).
  "herramienta/familia-inexistente": r(
    "error",
    "La herramienta cubre una familia que no existe",
    "The tool covers a family that does not exist",
  ),
  "herramienta/sin-registro": r(
    "error",
    "La herramienta pública no tiene su registro verificado",
    "The public tool has no verified registry entry",
  ),
  "herramienta/propia-sin-repositorio": r(
    "error",
    "La herramienta propia no cita su repositorio",
    "The in-house tool does not cite its repository",
  ),
} as const satisfies Record<string, Regla>;

export type IdRegla = keyof typeof REGLAS;
