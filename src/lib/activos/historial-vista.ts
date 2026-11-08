// La vista de «Historial» de un activo: sus versiones con su huella y, de cada una, qué cambió frente a la anterior. Todo sale de
// `engine/activos/historial.ts` (una cuenta, un cálculo): aquí solo se nombran los campos y se ponen en palabras los valores.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { diferenciasDeActivo } from "../../engine/activos/historial.ts";
import { etiqueta } from "../catalogo/vista.ts";
import type { MundoDeActivos } from "./cargar.ts";
import { ACCESO, DATOS, EXPOSICION } from "./etiquetas.ts";
import type {
  Bilingue,
  CambioDeVersionVista,
  VersionVista,
  VistaDeHistorial,
} from "./tipos.ts";
import { construirVistaDePlan } from "./vista.ts";

/** Los campos del activo con su nombre llano. Un campo que no esté aquí se muestra con su ruta, tal cual. */
const CAMPOS: Record<string, Bilingue> = {
  nombre: { es: "Nombre", en: "Name" },
  descripcion: { es: "Descripción", en: "Description" },
  familias: { es: "Familias", en: "Families" },
  acceso: { es: "Acceso", en: "Access" },
  entornos: { es: "Entornos", en: "Environments" },
  "perfil.pila": { es: "Pila", en: "Stack" },
  "perfil.exposicion": { es: "Exposición", en: "Exposure" },
  "perfil.autenticacion": { es: "Autenticación", en: "Authentication" },
  "perfil.datos": { es: "Datos que maneja", en: "Data it handles" },
  "perfil.actua": { es: "Actúa por su cuenta", en: "Acts on its own" },
  "perfil.modelos": { es: "Modelos que consume", en: "Models it uses" },
  "perfil.canales": { es: "Canales de entrada", en: "Input channels" },
  "perfil.acciones": {
    es: "Acciones que puede hacer",
    en: "Actions it can take",
  },
  "alcance.incluye": { es: "Alcance: incluye", en: "Scope: includes" },
  "alcance.excluye": { es: "Alcance: excluye", en: "Scope: excludes" },
  "alcance.familias": { es: "Alcance: familias", en: "Scope: families" },
  "alcance.ventana": { es: "Alcance: ventana", en: "Scope: window" },
  "alcance.limites": { es: "Alcance: límites", en: "Scope: limits" },
  "alcance.fuera": {
    es: "Alcance: pruebas fuera",
    en: "Scope: tests left out",
  },
  reglas: { es: "Reglas de enfrentamiento", en: "Rules of engagement" },
  ajustes: { es: "Ajustes del operador", en: "Operator adjustments" },
};

const SI: Bilingue = { es: "sí", en: "yes" };
const NO: Bilingue = { es: "no", en: "no" };
const SIN_DECLARAR: Bilingue = { es: "no declarado", en: "not declared" };

const esTexto = (v: unknown): v is Bilingue =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  "es" in v &&
  "en" in v;

/** Un valor del activo puesto en palabras, en los dos idiomas. */
function enPalabras(ruta: string, v: unknown): Bilingue {
  if (v === null || v === undefined) return SIN_DECLARAR;
  if (typeof v === "boolean") return v ? SI : NO;
  if (esTexto(v)) return v;
  if (typeof v === "string") {
    const tabla =
      ruta === "perfil.exposicion"
        ? EXPOSICION
        : ruta === "perfil.datos"
          ? DATOS
          : ruta === "acceso"
            ? ACCESO
            : undefined;
    return tabla?.[v] ?? { es: v, en: v };
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return { es: "ninguno", en: "none" };
    const partes = v.map((x) =>
      typeof x === "string"
        ? { es: x, en: x }
        : esTexto(x)
          ? x
          : { es: "…", en: "…" },
    );
    return {
      es: partes.map((p) => p.es).join(" · "),
      en: partes.map((p) => p.en).join(" · "),
    };
  }
  return { es: JSON.stringify(v), en: JSON.stringify(v) };
}

export async function construirVistaDeHistorial(
  id: string,
  mundo: MundoDeActivos,
  i: Instantanea,
  nombre: string,
  consulta: string,
): Promise<VistaDeHistorial> {
  const cargado = mundo.activos.find((a) => a.activo.id === id);
  if (cargado === undefined || cargado.versiones === null)
    throw new Error(
      `el activo «${id}» no tiene historial / the asset “${id}” has no history`,
    );
  // La cabecera es la misma de las otras dos pantallas del activo: se toma de la vista del plan, sin recalcularla.
  const vistaDelPlan = construirVistaDePlan(id, mundo, i, nombre, consulta);
  const cabecera = Object.fromEntries(
    Object.entries(vistaDelPlan).filter(
      ([k]) => k !== "plan" && k !== "etiquetas",
    ),
  ) as Omit<typeof vistaDelPlan, "plan" | "etiquetas">;
  const rasgos = new Map(i.catalogo.rasgos.map((r) => [r.id, r.nombre]));
  const campoLlano = (ruta: string): Bilingue =>
    CAMPOS[ruta] ??
    (ruta.startsWith("rasgos.")
      ? (rasgos.get(ruta.slice("rasgos.".length)) ?? { es: ruta, en: ruta })
      : { es: ruta, en: ruta });

  // Las versiones vienen de la más nueva a la más vieja: cada una se compara con la que le sigue en el arreglo.
  const versiones: VersionVista[] = [];
  for (const [k, v] of cargado.versiones.entries()) {
    const anterior = cargado.versiones[k + 1];
    const cambios: CambioDeVersionVista[] =
      anterior === undefined
        ? []
        : (await diferenciasDeActivo(anterior.activo, v.activo)).map((c) => ({
            campo: campoLlano(c.campo),
            ruta: c.campo,
            antes: enPalabras(c.campo, c.antes),
            despues: enPalabras(c.campo, c.despues),
          }));
    versiones.push({
      n: v.n,
      fecha: v.fecha,
      huella: v.huella,
      cambio: v.cambio,
      vigente: v.vigente,
      planEmitidoConEsta: cargado.versionDelPlan === v.n,
      cambios,
    });
  }
  return {
    ...cabecera,
    versiones,
    nota: {
      es: "Cada versión del activo tiene su huella: la que un plan cita cuando se emite con ella. Si el activo cambia, el plan que se emitió antes sigue siendo el que fue y queda marcado «desactualizado» con su causa; jamás se re-emite solo.",
      en: "Each version of the asset has its fingerprint: the one a plan cites when it is issued with it. If the asset changes, the plan issued before is still what it was and is marked “out of date” with its cause; it is never issued again on its own.",
    },
    plan:
      cargado.plan === null
        ? null
        : { huella: cargado.plan.huella, fecha: cargado.plan.fecha_emision },
    etiquetas: { vigente: etiqueta(i.catalogo, "vigencia", "vigente") },
  };
}
