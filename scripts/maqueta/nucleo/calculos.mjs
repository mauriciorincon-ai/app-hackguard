// Cifras DERIVADAS de la maqueta: nada de lo que una pantalla muestra como número se escribe a mano.
// No es el motor del producto (el S1 no hereda este código): es la aritmética mínima para que la
// maqueta diga cifras coherentes en cualquier fecha de consulta.
import { createHash } from "node:crypto";
import { diasEntre, sumarDias } from "./fecha.mjs";

/** JSON canónico: claves ordenadas en TODOS los niveles, así lo anidado también cuenta para la huella. */
function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  if (valor && typeof valor === "object") {
    const claves = Object.keys(valor).filter((k) => valor[k] !== undefined).sort();
    return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(valor[k])}`).join(",")}}`;
  }
  return JSON.stringify(valor);
}

/** Huella sha256 de un registro sintético, sobre su JSON canónico: estable entre corridas. */
export function huellaDe(registro) {
  return "sha256:" + createHash("sha256").update(canonico(registro)).digest("hex");
}

/** Un hallazgo solo está cerrado cuando su estado lo dice. Aceptar el riesgo no lo cierra: sigue siendo
 *  falla de su control (y no pide trabajo hasta su fecha de revisión). */
export const estaCerrado = (h) => h.estado === "cerrado";

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

/**
 * Veredicto que la REGLA de la prueba sugiere para lo que un adaptador leyó. En ZAP, sin constancia de
 * que la regla corrió, «no ejecutada»: no detectado no es verificado (E-6).
 */
export function veredictoSugerido(sobre, regla) {
  if (regla === "alertas-zap/v1") {
    if (sobre.alertas > 0) return "fallida";
    return sobre.corrio ? "superada" : "no_ejecutada";
  }
  return sobre.fallidas > 0 ? "fallida" : "superada";
}

/** Vista por control: una fila por prueba con su último sobre, y el estado del control. */
export function vistaPorControl({ pruebas, sobres, hallazgos }, consulta, umbrales) {
  const filas = pruebas.map((prueba) => {
    const suyos = sobres.filter((s) => s.prueba === prueba.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ultimo = suyos.at(-1) ?? null;
    const abierto = hallazgos.find((h) => h.prueba === prueba.id && !estaCerrado(h)) ?? null;
    const edad = ultimo ? antiguedad(ultimo.fecha, consulta, umbrales) : null;
    const veredicto = ultimo ? ultimo.veredicto : "no_ejecutada";
    // «No detectado» no es evidencia (E-6): un sobre «no ejecutada» deja la prueba sin evidencia.
    const estado = !ultimo || veredicto === "no_ejecutada"
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

/**
 * Plan de un activo para la maqueta: cruza lo que el perfil declara (`rasgos`) con lo que cada prueba
 * requiere, respeta el alcance autorizado y los ajustes del operador, y calcula la prioridad final.
 * Aritmética mínima para que la pantalla sea coherente; NO es el planificador del producto.
 */
export function planDe(activo, fichas, prioridad) {
  if (!activo.alcance || !activo.reglas) return null;
  const candidatas = fichas.filter((f) => activo.familias.includes(f.familia));
  const fuera = new Map(activo.alcance.fuera.map((x) => [x.prueba, x.razon]));
  const delOperador = (accion) => new Map(activo.plan.ajustes.filter((a) => a.accion === accion).map((a) => [a.prueba, a]));
  const quitadas = delOperador("quitada");
  // El operador puede agregar una prueba que el perfil no pide (RF-03.7), nunca una fuera del alcance
  // autorizado: la autorización manda sobre el plan.
  const agregadas = delOperador("agregada");
  const ajustes = prioridad.ajustes.filter((a) => a.si(activo.perfil));
  const subida = Math.min(prioridad.tope_de_ajuste, ajustes.reduce((n, a) => n + a.suma, 0));

  const planeadas = [];
  const excluidas = [];
  for (const ficha of candidatas) {
    const agregada = agregadas.get(ficha.id)?.justificacion ?? null;
    if (!activo.rasgos.includes(ficha.requiere) && !agregada) excluidas.push({ ficha, motivo: "perfil" });
    else if (fuera.has(ficha.id)) excluidas.push({ ficha, motivo: "alcance", razon: fuera.get(ficha.id) });
    else if (quitadas.has(ficha.id)) excluidas.push({ ficha, motivo: "operador", razon: quitadas.get(ficha.id).justificacion });
    else planeadas.push({ ficha, prioridad: Math.min(prioridad.techo, ficha.prioridad_base + subida), agregada });
  }
  planeadas.sort((a, b) => b.prioridad - a.prioridad || a.ficha.id.localeCompare(b.ficha.id));

  const cobertura = new Map();
  for (const { ficha } of planeadas) for (const c of ficha.controles) cobertura.set(c, [...(cobertura.get(c) ?? []), ficha.id]);
  // Controles aplicables sin prueba en el plan: los que solo cubrían pruebas que quedaron excluidas.
  const descubiertos = [...new Set(excluidas.flatMap((e) => e.ficha.controles))].filter((c) => !cobertura.has(c)).sort();
  const sinControl = planeadas.filter((p) => p.ficha.controles.length === 0).map((p) => p.ficha.id);

  return { planeadas, excluidas, ajustes, subida, cobertura, descubiertos, sinControl, otras: fichas.length - candidatas.length };
}
