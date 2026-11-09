// La vista de «Qué cambió entre dos instantáneas»: lo que el motor calculó (`engine/catalogo/diferencias.ts`), con el nombre llano de
// cada entrada, la regla del validador puesta en palabras y los valores legibles. Función pura: una cuenta, un cálculo (design-system § 9).
import {
  SECCIONES,
  nombreDeRegla,
  type CambioDeCampo,
  type DiferenciasEntreInstantaneas,
  type Movimiento,
  type Seccion,
  type TipoDeMovimiento,
} from "../../engine/catalogo/diferencias.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { paresConsecutivos } from "../../engine/catalogo/pares.ts";
import { ETIQUETAS_DE_VISTAS } from "./etiquetas.ts";
import type { Bilingue, Etiqueta } from "./tipos.ts";

export interface CampoDeCambioVista {
  campo: string;
  regla: string;
  reglaNombre: Bilingue;
  antes: Bilingue | null;
  despues: Bilingue | null;
  /** La licencia del marco solo deja citar identificadores: el valor no se muestra. */
  oculto: boolean;
}

export interface MovimientoVista {
  seccion: Seccion;
  id: string;
  nombre: Bilingue | null;
  tipo: TipoDeMovimiento;
  etiqueta: Etiqueta;
  huellaAntes: string | null;
  huellaDespues: string | null;
  campos: CampoDeCambioVista[];
}

export interface LadoVista {
  nombre: string;
  fecha: string;
  huella: string;
  pruebas: number;
}

/** Una comparación disponible: dos instantáneas consecutivas, con su ruta ya hecha. */
export interface ParVista {
  de: string;
  a: string;
  deFecha: string;
  aFecha: string;
  demo: boolean;
  /** Es la que se está viendo. */
  activo: boolean;
}

export interface VistaDeDiferencias {
  /** Todas las comparaciones consecutivas, de la más vieja a la más nueva. */
  pares: ParVista[];
  de: LadoVista;
  a: LadoVista & { demo: boolean };
  resumen: Record<TipoDeMovimiento, number>;
  /** Solo las secciones donde algo cambió, en el orden del motor. */
  secciones: {
    seccion: Seccion;
    rotulo: Bilingue;
    movimientos: MovimientoVista[];
  }[];
  huella: string;
  etiquetas: {
    entra: Etiqueta;
    sale: Etiqueta;
    cambia: Etiqueta;
    demo: Etiqueta;
    sinCambios: Etiqueta;
  };
}

export const ROTULOS_DE_SECCION: Record<Seccion, Bilingue> = {
  pruebas: { es: "Pruebas", en: "Tests" },
  controles: { es: "Controles de ISO/IEC 42001", en: "ISO/IEC 42001 controls" },
  marcos: { es: "Marcos", en: "Frameworks" },
  equivalencias: { es: "Mapas de equivalencias", en: "Equivalence maps" },
  herramientas: { es: "Herramientas", en: "Tools" },
};

const esTexto = (v: unknown): v is Bilingue =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  "es" in v &&
  "en" in v &&
  typeof (v as Bilingue).es === "string";

/** Un valor del catálogo puesto en una frase legible; lo que es un objeto grande se resume con su descripción o su tamaño. */
export function legible(v: unknown): Bilingue {
  if (v === null || v === undefined) return { es: "—", en: "—" };
  if (esTexto(v)) return v;
  if (typeof v === "boolean")
    return v ? { es: "sí", en: "yes" } : { es: "no", en: "no" };
  if (typeof v === "string" || typeof v === "number")
    return { es: String(v), en: String(v) };
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === "string" || typeof x === "number")) {
      const t = v.join(", ");
      return { es: t === "" ? "ninguno" : t, en: t === "" ? "none" : t };
    }
    return {
      es: `${v.length} ${v.length === 1 ? "elemento" : "elementos"}`,
      en: `${v.length} ${v.length === 1 ? "item" : "items"}`,
    };
  }
  const o = v as Record<string, unknown>;
  if (esTexto(o.descripcion)) return o.descripcion;
  const claves = Object.keys(o).length;
  return {
    es: `${claves} campos`,
    en: `${claves} fields`,
  };
}

function nombresDe(i: Instantanea): Map<string, Bilingue> {
  const m = new Map<string, Bilingue>();
  const c = i.catalogo;
  for (const p of c.pruebas) m.set(`pruebas/${p.id}`, p.nombre);
  for (const x of c.marcos)
    m.set(`marcos/${x.id}`, { es: x.nombre, en: x.nombre });
  for (const h of c.herramientas)
    m.set(`herramientas/${h.id}`, { es: h.nombre, en: h.nombre });
  for (const e of c.equivalencias) {
    const t = `${e.marco_id}: ${e.desde} → ${e.hacia}`;
    m.set(`equivalencias/${e.id}`, { es: t, en: t });
  }
  for (const capa of c.controles)
    for (const area of capa.areas)
      for (const control of area.controles)
        m.set(`controles/${control.id}`, control.nombre);
  return m;
}

function campoVista(c: CambioDeCampo): CampoDeCambioVista {
  return {
    campo: c.campo,
    regla: c.regla,
    reglaNombre: nombreDeRegla(c.regla),
    antes: c.oculto ? null : legible(c.antes),
    despues: c.oculto ? null : legible(c.despues),
    oculto: c.oculto,
  };
}

export const rutaDeComparacion = (de: string, a: string) =>
  `/catalogo/diferencias/${de}/${a}`;

export function construirVistaDeDiferencias(
  d: DiferenciasEntreInstantaneas,
  de: { instantanea: Instantanea; nombre: string },
  a: { instantanea: Instantanea; nombre: string; demo: boolean },
  /** La secuencia completa, del pasado al presente: de ella salen los pares del selector. Sin ella, solo el par que se ve. */
  secuencia: {
    instantanea: Instantanea;
    nombre: string;
    demo: boolean;
  }[] = de.nombre === a.nombre ? [a] : [{ ...de, demo: false }, a],
): VistaDeDiferencias {
  const nombresDe_ = nombresDe(de.instantanea);
  const nombresA = nombresDe(a.instantanea);
  const E = ETIQUETAS_DE_VISTAS;
  const etiquetaDe: Record<TipoDeMovimiento, Etiqueta> = {
    entra: E.movimiento_entra,
    sale: E.movimiento_sale,
    cambia: E.movimiento_cambia,
  };
  const vista = (m: Movimiento): MovimientoVista => ({
    seccion: m.seccion,
    id: m.id,
    nombre:
      (m.tipo === "sale" ? nombresDe_ : nombresA).get(`${m.seccion}/${m.id}`) ??
      null,
    tipo: m.tipo,
    etiqueta: etiquetaDe[m.tipo],
    huellaAntes: m.huella_antes,
    huellaDespues: m.huella_despues,
    campos: m.campos.map(campoVista),
  });
  return {
    pares: paresConsecutivos(secuencia).map((p) => ({
      de: p.de.nombre,
      a: p.a.nombre,
      deFecha: p.de.instantanea.fecha_evaluacion,
      aFecha: p.a.instantanea.fecha_evaluacion,
      demo: p.a.demo,
      activo: p.de.nombre === de.nombre && p.a.nombre === a.nombre,
    })),
    de: {
      nombre: de.nombre,
      fecha: d.de.fecha,
      huella: d.de.huella,
      pruebas: de.instantanea.catalogo.pruebas.length,
    },
    a: {
      nombre: a.nombre,
      fecha: d.a.fecha,
      huella: d.a.huella,
      pruebas: a.instantanea.catalogo.pruebas.length,
      demo: a.demo,
    },
    resumen: d.resumen,
    secciones: SECCIONES.map((seccion) => ({
      seccion,
      rotulo: ROTULOS_DE_SECCION[seccion],
      movimientos: d.movimientos
        .filter((m) => m.seccion === seccion)
        .map(vista),
    })).filter((s) => s.movimientos.length > 0),
    huella: d.huella,
    etiquetas: {
      entra: E.movimiento_entra,
      sale: E.movimiento_sale,
      cambia: E.movimiento_cambia,
      demo: E.instantanea_demo,
      sinCambios: E.diferencias_sin_cambios,
    },
  };
}
