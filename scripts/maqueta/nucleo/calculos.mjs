// Cifras DERIVADAS de la maqueta: nada de lo que una pantalla muestra como número se escribe a mano.
// No es el motor del producto (el S1 no hereda este código): es la aritmética mínima para que la
// maqueta diga cifras coherentes en cualquier fecha de consulta.
import { createHash } from "node:crypto";
import { diasEntre, sumarDias } from "./fecha.mjs";

/** Huella sha256 de un registro sintético (claves ordenadas): estable entre corridas. */
export function huellaDe(registro) {
  const canonico = JSON.stringify(registro, Object.keys(registro).sort());
  return "sha256:" + createHash("sha256").update(canonico).digest("hex");
}

/** Semáforo de vigencia (RF-01.5): días desde la última verificación y su estado. */
export function vigencia(verificada, consulta, umbrales) {
  const dias = diasEntre(verificada, consulta);
  if (dias < 0) throw new Error(`verificación (${verificada}) posterior a la fecha de consulta (${consulta})`);
  const { por_revisar, vencido } = umbrales.vigencia;
  return { dias, estado: dias >= vencido ? "vencido" : dias >= por_revisar ? "por_revisar" : "vigente" };
}

/** Antigüedad de una evidencia: vigente hasta el umbral, antigua desde él (DA-04: 180 días). */
export function antiguedad(fecha, consulta, umbrales) {
  const dias = diasEntre(fecha, consulta);
  if (dias < 0) throw new Error(`evidencia (${fecha}) posterior a la fecha de consulta (${consulta})`);
  return { dias, estado: dias >= umbrales.evidencia_antigua ? "antigua" : "vigente" };
}

/** Plazo de un hallazgo abierto según su severidad: vence, y cuántos días lleva de atraso. */
export function plazo(hallazgo, consulta, umbrales) {
  const total = umbrales.plazo_por_severidad[hallazgo.severidad];
  const dias = diasEntre(hallazgo.apertura, consulta);
  if (dias < 0) throw new Error(`hallazgo ${hallazgo.id} abierto después de la fecha de consulta`);
  const atraso = Math.max(0, dias - total);
  return { total, dias, vence: sumarDias(hallazgo.apertura, total), atraso, estado: atraso > 0 ? "vencido" : "en_plazo" };
}

/** Cota superior aproximada de la tasa de fallo con 0 fallas en k repeticiones: 3/k (E-2). */
export const cotaPorCiento = (k) => Math.round((3 / k) * 100);

/** Vista por control: una fila por prueba con su último sobre, y el estado del control. */
export function vistaPorControl({ pruebas, sobres, hallazgos }, consulta, umbrales) {
  const filas = pruebas.map((prueba) => {
    const suyos = sobres.filter((s) => s.prueba === prueba.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ultimo = suyos.at(-1) ?? null;
    const abierto = hallazgos.find((h) => h.prueba === prueba.id && !h.cierre) ?? null;
    const edad = ultimo ? antiguedad(ultimo.fecha, consulta, umbrales) : null;
    const veredicto = ultimo ? ultimo.veredicto : "no_ejecutada";
    const estado = !ultimo
      ? "sin_evidencia"
      : veredicto === "fallida" || veredicto === "parcial"
        ? "con_fallas"
        : edad.estado === "antigua"
          ? "evidencia_antigua"
          : "con_evidencia_vigente";
    return { prueba, ultimo, abierto, edad, veredicto, estado };
  });
  const cuenta = (estado) => filas.filter((f) => f.estado === estado).length;
  const estado = cuenta("con_fallas")
    ? "con_fallas"
    : cuenta("sin_evidencia") === filas.length
      ? "sin_evidencia"
      : cuenta("con_evidencia_vigente")
        ? "con_evidencia_vigente"
        : "evidencia_antigua";
  return { filas, estado, cuenta };
}
