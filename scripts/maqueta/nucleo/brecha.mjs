// Brecha de la maqueta (C16, C17): esperado contra obtenido en cada prueba planeada, cobertura por
// activo, familia y control, hallazgos sin cerrar, vencidos y alertas. Cruza los planes (planDe) con los
// sobres CONFIRMADOS: lo que espera confirmación se muestra, pero no mueve ninguna cifra (criterio de
// M5). Lo usan el tablero, la brecha, la vista por control y el informe: una sola cuenta para todos.
// Aritmética de maqueta, no el verificador del producto (el S3 no hereda este código).
import { FAMILIAS, MARCOS, PRUEBAS, fichaDe } from "../datos/catalogo.mjs";
import { PROPUESTAS } from "../datos/gobierno.mjs";
import { ACTIVOS, HALLAZGOS, LOTES, PRIORIDAD, SOBRES } from "../datos/mundo.mjs";
import { antiguedad, estaCerrado, planDe, plazo, veredictoSugerido, vigencia, vistaPorControl } from "./calculos.mjs";
import { diasEntre, sumarDias } from "./fecha.mjs";

export const FICHAS = PRUEBAS.map((p) => fichaDe(p.id));
const EJECUTADA = new Set(["superada", "fallida", "parcial"]);
const SIN_CERRAR = new Set(["abierto", "corregido", "re_probado"]);

/** Lo que pide trabajo: abierto, corregido o re-probado. El riesgo aceptado no está cerrado (sigue siendo
 *  falla de su control, ver estaCerrado), pero no pide trabajo: se revisa en su fecha. */
const pideTrabajo = (h) => SIN_CERRAR.has(h.estado);

/** Las cuentas de cobertura de RF-05.2 sobre un grupo de filas. «Fallidas» incluye las parciales. */
export function totales(filas) {
  const cuenta = (v) => filas.filter((f) => f.veredicto === v).length;
  const ejecutadas = filas.filter((f) => f.ejecutada).length;
  return {
    planeadas: filas.length,
    ejecutadas,
    superadas: cuenta("superada"),
    fallidas: cuenta("fallida") + cuenta("parcial"),
    no_ejecutadas: filas.length - ejecutadas,
  };
}

/** Revisión de un riesgo aceptado: cuándo toca y si ya tocó. */
export function revision(h, consulta) {
  const dias = diasEntre(h.aceptacion.fecha, consulta);
  return {
    dias,
    total: h.aceptacion.revision_en_dias,
    fecha: sumarDias(h.aceptacion.fecha, h.aceptacion.revision_en_dias),
    estado: dias >= h.aceptacion.revision_en_dias ? "toca_revisar" : "vigente",
  };
}

const PROPUESTOS = LOTES.flatMap((l) => l.sobres.map((s) => ({ ...s, lote: l.id })));
const porId = (a, b) => a.localeCompare(b, "es", { numeric: true });

export function brecha(consulta, umbrales) {
  const planes = Object.entries(ACTIVOS).map(([id, a]) => ({ id, a, plan: planDe(a, FICHAS, PRIORIDAD) }));

  // Una fila por prueba planeada, con su último sobre CONFIRMADO. La maqueta asocia sobres y pruebas
  // solo por la prueba: si una prueba entrara al plan de dos activos, esto lo dice en vez de mezclarlos.
  const filas = [];
  const activoDe = new Map();
  for (const { id, plan } of planes) {
    for (const { ficha } of plan?.planeadas ?? []) {
      if (activoDe.has(ficha.id)) throw new Error(`la prueba ${ficha.id} está en el plan de dos activos`);
      activoDe.set(ficha.id, id);
      const ultimo = SOBRES.filter((s) => s.prueba === ficha.id).sort((x, y) => x.fecha.localeCompare(y.fecha)).at(-1) ?? null;
      const veredicto = ultimo ? ultimo.veredicto : "no_ejecutada";
      const propuesto = PROPUESTOS.find((s) => s.prueba === ficha.id) ?? null;
      filas.push({
        activo: id,
        ficha,
        ultimo,
        veredicto,
        ejecutada: EJECUTADA.has(veredicto),
        edad: ultimo ? antiguedad(ultimo.fecha, consulta, umbrales) : null,
        catalogo: vigencia(ficha.verificada, consulta, umbrales),
        propuesto: propuesto ? { ...propuesto, sugerido: veredictoSugerido(propuesto, ficha.regla) } : null,
        hallazgo: HALLAZGOS.find((h) => h.prueba === ficha.id && !estaCerrado(h)) ?? null,
      });
    }
  }

  const porActivo = planes.map(({ id, a, plan }) => ({ id, a, plan, totales: plan ? totales(filas.filter((f) => f.activo === id)) : null }));
  const familias = [...new Set(filas.map((f) => f.ficha.familia))];
  const porFamilia = Object.keys(FAMILIAS).filter((f) => familias.includes(f)).map((familia) => ({ familia, totales: totales(filas.filter((f) => f.ficha.familia === familia)) }));

  // Controles aplicables: los que cubre alguna prueba planeada y los que se quedaron sin prueba porque
  // las que los cubrían quedaron fuera de su plan.
  const descubiertos = planes.flatMap(({ plan }) => plan?.descubiertos ?? []);
  const ids = [...new Set([...filas.flatMap((f) => f.ficha.controles), ...descubiertos])].sort(porId);
  const controles = ids.map((id) => {
    const suyas = filas.filter((f) => f.ficha.controles.includes(id));
    const pruebas = suyas.map((f) => ({ id: f.ficha.id, activo: f.activo, nombre: f.ficha.nombre, herramienta: f.ficha.herramienta }));
    const vista = vistaPorControl({ pruebas, sobres: SOBRES, hallazgos: HALLAZGOS }, consulta, umbrales);
    const fechas = suyas.filter((f) => f.ultimo).map((f) => f.ultimo.fecha).sort();
    const ultima = fechas.at(-1) ?? null;
    return {
      id,
      filas: suyas,
      vista,
      totales: totales(suyas),
      ultima,
      edad: ultima ? antiguedad(ultima, consulta, umbrales) : null,
      hallazgos: HALLAZGOS.filter((h) => suyas.some((f) => f.ficha.id === h.prueba)),
      fallas: HALLAZGOS.filter((h) => !estaCerrado(h) && suyas.some((f) => f.ficha.id === h.prueba)),
    };
  });

  const abiertos = HALLAZGOS.filter(pideTrabajo).map((h) => ({ h, p: umbrales.plazo_por_severidad[h.severidad] ? plazo(h, consulta, umbrales) : null }));
  const aceptados = HALLAZGOS.filter((h) => h.estado === "aceptado_con_riesgo").map((h) => ({ h, r: revision(h, consulta) }));

  return {
    filas,
    resumen: totales(filas),
    porActivo,
    porFamilia,
    controles,
    sinControl: filas.filter((f) => f.ficha.controles.length === 0),
    abiertos,
    vencidos: abiertos.filter(({ p }) => p?.estado === "vencido").sort((x, y) => y.p.atraso - x.p.atraso),
    aceptados,
    alertas: {
      // RF-05.5: pruebas del plan cuya entrada del catálogo está vencida, marcos con versión nueva y
      // evidencia más vieja que el umbral.
      catalogo: filas.filter((f) => f.catalogo.estado === "vencido"),
      marcos: Object.entries(MARCOS).filter(([, m]) => m.publicada).map(([id, m]) => ({ id, ...m })),
      antiguas: filas.filter((f) => f.edad?.estado === "antigua"),
    },
    porConfirmar: { lotes: LOTES.length, sobres: PROPUESTOS.length, extractor: PROPUESTAS.filter((p) => p.tipo === "sobre").length },
  };
}
