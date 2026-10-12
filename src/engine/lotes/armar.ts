// Armar un lote: de lo que un adaptador leyó en el archivo de una herramienta a los sobres por confirmar. Cada prueba
// del paquete que corre esa herramienta recibe UN sobre, armado por `armarSobre` de siempre: el adaptador entrega lo que
// midió, la regla de la prueba calcula el veredicto, y las huellas las pone el núcleo. Nada nace confirmado.
//
// El archivo de la herramienta ya se leyó y se resumió (huella): aquí no llega. Tampoco llega ningún texto suyo.
import type { PruebaConocida, PlanDeActivo } from "../evidencia/validar.ts";
import type { Sobre } from "../evidencia/esquemas.ts";
import { siguienteId } from "../evidencia/libro.ts";
import { armarSobre, type MotivoDeNoRegistrar } from "../evidencia/registro.ts";
import { comparar } from "../planificador/orden.ts";
import type { Adaptador, Corrida } from "../adaptadores/interfaz.ts";
import { FORMATO_DE_LOTE, type Lote } from "./esquemas.ts";
import { sellarLote } from "./huellas.ts";

export interface EntradaDeLote {
  adaptador: Adaptador;
  corrida: Corrida;
  archivo: { nombre: string; huella: string };
  activo: string;
  origen: Lote["origen"];
  emitido: PlanDeActivo;
  pruebas: readonly PruebaConocida[];
  idDeLote: string;
  /** Los sobres que ya existen: para dar identificadores libres. */
  existentes: readonly { id: string }[];
  ejecutadoPor: string;
  /** Solo si el reporte no trae la fecha (garak la trae sin zona; ZAP antes de 0.41.0 no la trae). */
  fecha: string | null;
  zonaHoraria: string | null;
}

export type MotivoDeNoArmarLote =
  | "falta_fecha"
  | "falta_zona"
  | "sin_pruebas_de_la_herramienta"
  | "prueba_desconocida"
  | MotivoDeNoRegistrar;

export type ResultadoDeArmarLote =
  | { ok: true; lote: Lote; sobres: Sobre[] }
  | { ok: false; motivo: MotivoDeNoArmarLote; prueba?: string };

export async function armarLote(
  e: EntradaDeLote,
): Promise<ResultadoDeArmarLote> {
  const fecha = e.corrida.fecha ?? e.fecha;
  if (fecha === null) return { ok: false, motivo: "falta_fecha" };
  const zona = e.corrida.zonaHoraria ?? e.zonaHoraria;
  if (zona === null) return { ok: false, motivo: "falta_zona" };

  const delPaquete = e.emitido.paquete.herramientas
    .filter((h) => h.herramienta === e.adaptador.herramienta)
    .flatMap((h) => h.pruebas)
    .sort((a, b) => comparar(a.prueba, b.prueba));
  if (delPaquete.length === 0)
    return { ok: false, motivo: "sin_pruebas_de_la_herramienta" };

  const reglas = new Map(e.pruebas.map((p) => [p.id, p.regla]));
  const ocupados: { id: string }[] = [...e.existentes];
  const sobres: Sobre[] = [];
  for (const p of delPaquete) {
    const medida = e.corrida.medir(p.selector);
    if (medida.tipo === "no_aplica") continue;
    const regla = reglas.get(p.prueba);
    if (regla === undefined)
      return { ok: false, motivo: "prueba_desconocida", prueba: p.prueba };
    const id = siguienteId(ocupados);
    ocupados.push({ id });
    const r = await armarSobre(
      {
        activo: e.activo,
        prueba: p.prueba,
        herramienta: e.corrida.herramienta,
        fecha,
        zona_horaria: zona,
        ejecutado_por: e.ejecutadoPor,
        resultado: medida.resultado,
        extracto_redactado: medida.extracto,
        advertencias: medida.advertencias,
      },
      {
        id,
        origen: e.origen,
        emitido: e.emitido,
        regla,
        crudo: e.archivo.huella,
      },
    );
    if (!r.ok) return { ok: false, motivo: r.motivo, prueba: p.prueba };
    sobres.push(r.sobre);
  }
  if (sobres.length === 0)
    return { ok: false, motivo: "sin_pruebas_de_la_herramienta" };

  const lote = await sellarLote(
    {
      formato: FORMATO_DE_LOTE,
      id: e.idDeLote,
      origen: e.origen,
      activo: e.activo,
      plan: { huella: e.emitido.plan.huella },
      paquete: { huella: e.emitido.plan.paquete.huella },
      herramienta: e.corrida.herramienta,
      adaptador: { id: e.adaptador.id, version: e.adaptador.version },
      archivo: { nombre: e.archivo.nombre },
      fecha,
      hora: e.corrida.hora,
      zona_horaria: zona,
      ejecutado_por: e.ejecutadoPor,
      advertencias: e.corrida.advertencias,
      sobres: sobres.map((s) => ({ id: s.id, huella: s.huellas.sobre })),
      confirmacion: null,
    },
    e.archivo.huella,
  );
  return { ok: true, lote, sobres };
}

/** El siguiente identificador de lote libre: LOTE-0009 si el mayor es LOTE-0008. */
export function siguienteIdDeLote(lotes: readonly { id: string }[]): string {
  const mayor = lotes.reduce((m, l) => Math.max(m, Number(l.id.slice(5))), 0);
  return `LOTE-${String(mayor + 1).padStart(4, "0")}`;
}
