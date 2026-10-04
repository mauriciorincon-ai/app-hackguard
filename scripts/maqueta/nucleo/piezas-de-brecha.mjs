// Piezas que comparten el tablero, la brecha, la vista por control y el informe: cómo se dice lo que dio
// una prueba, cuánto se desvió de lo esperado, el plazo de un hallazgo, la revisión de un riesgo aceptado
// y el estado de un control. Una sola forma de decir cada cosa en las cuatro pantallas.
import { archivoDeHallazgo } from "../datos/mundo.mjs";
import { cotaPorCiento } from "./calculos.mjs";
import { chip, dato, dias, enlace, estado, proporcion } from "./componentes.mjs";
import { ESTADO_DE_CONTROL, SEVERIDAD, VEREDICTO } from "./estados.mjs";
import { t } from "./html.mjs";

export const plural = (n, uno, varios) => (n === 1 ? uno : varios);

/** Lo que dio un sobre confirmado, en palabras. */
export function conteo(sobre) {
  if (sobre.razon) return sobre.razon;
  const { fallidas: f, evaluadas: k } = sobre;
  if (f > 0) return { es: `${f} de ${k} salidas ${plural(f, "falló", "fallaron")}`, en: `${f} of ${k} outputs failed` };
  return { es: `0 de ${k} fallaron · cota: hasta ${cotaPorCiento(k)} %`, en: `0 of ${k} failed · upper bound: ${cotaPorCiento(k)}%` };
}

/** Cuánto se apartó lo obtenido de lo esperado (RF-05.1). «No detectado» nunca se lee como «ninguna». */
export function desviacion(fila) {
  const { ultimo, veredicto, ficha } = fila;
  if (!ultimo) return { es: "Sin medir: no hay resultado confirmado", en: "Not measured: no confirmed result" };
  if (veredicto === "no_ejecutada") {
    return { es: "No medible: no detectado no es verificado", en: "Not measurable: not detected is not verified" };
  }
  if (ultimo.evaluadas !== undefined) {
    const f = ultimo.fallidas;
    return f > 0
      ? { es: `${f} ${plural(f, "falla", "fallas")} donde la regla admite 0`, en: `${f} ${plural(f, "failure", "failures")} where the rule allows 0` }
      : { es: "Ninguna", en: "None" };
  }
  if (ficha.regla === "alertas-zap/v1") {
    return veredicto === "fallida" ? { es: "Alertas donde no debía haber ninguna", en: "Alerts where there should be none" } : { es: "Ninguna", en: "None" };
  }
  return veredicto === "fallida" ? { es: "Fuera del límite fijado", en: "Outside the set limit" } : { es: "Dentro del límite fijado", en: "Within the set limit" };
}

/** Veredicto de una fila: lo que no es noticia (superada) va en línea; lo que pide atención, en chip. */
export const veredictoDe = (v) => (v === "superada" || v === "no_aplicable" ? estado(VEREDICTO[v]) : chip(VEREDICTO[v]));

/**
 * Estado de un control, con su protocolo: data-control y data-control-estado. El gate de coherencia
 * (maqueta-envejecimiento) exige que un control diga el mismo estado en cada pantalla y en cada fecha;
 * `porFilas` marca el sello cuyo estado se deduce de las filas de la misma página.
 */
export function estadoDeControl(id, e, { porFilas = false } = {}) {
  const marca = e === "con_evidencia_vigente" ? estado(ESTADO_DE_CONTROL[e]) : chip(ESTADO_DE_CONTROL[e]);
  return `<span data-control="${id}" data-control-estado="${e}"${porFilas ? " data-por-filas" : ""}>${marca}</span>`;
}

/**
 * Plazo de un hallazgo sin cerrar, con el protocolo de la matriz de envejecimiento. `marca: false` deja
 * solo la frase (cuando la fila ya dice el estado en su propio chip).
 */
export function plazoFechado(h, p, { marca: conMarca = true } = {}) {
  const frase =
    p.estado === "vencido"
      ? { es: `venció hace ${p.atraso} ${plural(p.atraso, "día", "días")}`, en: `${p.atraso} ${plural(p.atraso, "day", "days")} overdue` }
      : { es: `vence el ${p.vence}`, en: `due on ${p.vence}` };
  const marca =
    p.estado === "vencido"
      ? chip({ rol: "falla", simbolo: "falla", nombre: { es: "Plazo vencido", en: "Deadline passed" } })
      : estado({ rol: "neutro", simbolo: "reloj", nombre: { es: "En plazo", en: "On time" } });
  return `<span data-fechado="plazo" data-desde="${h.apertura}" data-plazo="${p.total}" data-severidad="${h.severidad}" data-dias="${p.dias}" data-atraso="${p.atraso}" data-estado-fechado="${p.estado}">${conMarca ? `${marca} ` : ""}<span class="hg-menor">${t({ es: `Plazo de ${p.total} días:`, en: `${p.total}-day deadline:` })} <span data-frase-plazo>${t(frase)}</span></span></span>`;
}

/** Revisión de un riesgo aceptado, con el protocolo de la matriz de envejecimiento. */
export function revisionFechada(h, r) {
  const marca =
    r.estado === "toca_revisar"
      ? chip({ rol: "falla", simbolo: "falla", nombre: { es: "Toca revisarlo", en: "Review is due" } })
      : estado({ rol: "neutro", simbolo: "reloj", nombre: { es: "Revisión programada", en: "Review scheduled" } });
  return `<span data-fechado="revision" data-desde="${h.aceptacion.fecha}" data-plazo="${r.total}" data-dias="${r.dias}" data-estado-fechado="${r.estado}">${marca} <span class="hg-menor">${t({ es: "Aceptado", en: "Accepted" })} <span data-frase-dias>${t(dias(r.dias))}</span>, ${t({ es: "se revisa el", en: "to be reviewed on" })} ${dato(r.fecha)}</span></span>`;
}

/** Fecha de una evidencia, con el protocolo (antigua desde el umbral). `marca: false` deja solo la fecha. */
export function evidenciaFechada(fecha, edad, { marca: conMarca = true } = {}) {
  const marca = conMarca && edad.estado === "antigua" ? `${chip({ rol: "atencion", simbolo: "reloj", nombre: { es: "Antigua", en: "Stale" } })} ` : "";
  return `<span data-fechado="evidencia" data-desde="${fecha}" data-dias="${edad.dias}" data-estado-fechado="${edad.estado}">${marca}${dato(fecha)} <span class="hg-menor"><span data-frase-dias>${t(dias(edad.dias))}</span></span></span>`;
}

/** Ejecutadas sobre planeadas: la barra (en tinta, porque avance no es veredicto) y la proporción en cifras. */
export const ejecutadas = (tot) =>
  `${proporcion(tot.ejecutadas, Math.max(tot.planeadas, 1), "hg-proporcion-avance")}<p class="hg-menor">${t({
    es: `${tot.ejecutadas} de ${tot.planeadas} ${plural(tot.planeadas, "ejecutada", "ejecutadas")}`,
    en: `${tot.ejecutadas} of ${tot.planeadas} run`,
  })}</p>`;

/** Desglose de lo planeado: cada veredicto con su forma y su cifra; los ceros no se dibujan. */
export function desglose(tot) {
  const partes = [
    ["superadas", VEREDICTO.superada, (n) => ({ es: `${n} ${plural(n, "superada", "superadas")}`, en: `${n} passed` })],
    ["fallidas", VEREDICTO.fallida, (n) => ({ es: `${n} ${plural(n, "fallida", "fallidas")}`, en: `${n} failed` })],
    ["no_ejecutadas", VEREDICTO.no_ejecutada, (n) => ({ es: `${n} sin ejecutar`, en: `${n} not run` })],
  ]
    .filter(([clave]) => tot[clave] > 0)
    .map(([clave, v, nombre]) => `<li>${estado({ ...v, nombre: nombre(tot[clave]) })}</li>`)
    .join("");
  return partes ? `<ul class="hg-desglose">${partes}</ul>` : `<p class="hg-menor">${t({ es: "Nada planeado", en: "Nothing planned" })}</p>`;
}

/** Un hallazgo como referencia: identificador enlazado y su severidad. */
export const hallazgoBreve = (h, existentes) => `${enlace(archivoDeHallazgo(h.id), dato(h.id), existentes)} ${chip(SEVERIDAD[h.severidad])}`;

/** Vigencia de la ficha de una prueba, con el protocolo «vigencia» (sin marca: la fila lleva su chip). */
export const vigenciaFechada = (desde, v) =>
  `<span data-fechado="vigencia" data-desde="${desde}" data-dias="${v.dias}" data-estado-fechado="${v.estado}"><span class="hg-menor">${t({ es: "Ficha verificada", en: "Record verified" })} <span data-frase-dias>${t(dias(v.dias))}</span></span></span>`;

const TIPO = {
  plazo: { rol: "falla", simbolo: "falla", nombre: { es: "Plazo vencido", en: "Deadline passed" } },
  revision: { rol: "falla", simbolo: "falla", nombre: { es: "Toca revisar", en: "Review due" } },
  catalogo: { rol: "falla", simbolo: "falla", nombre: { es: "Ficha vencida", en: "Record overdue" } },
  marco: { rol: "atencion", simbolo: "aviso", nombre: { es: "Versión nueva", en: "New version" } },
  antigua: { rol: "atencion", simbolo: "reloj", nombre: { es: "Evidencia antigua", en: "Stale evidence" } },
};

/**
 * Vencidos y alertas (RF-05.3 y RF-05.5), lo más urgente primero: plazos vencidos, riesgos aceptados que
 * toca revisar, fichas del plan vencidas en el catálogo, marcos con versión nueva y evidencia antigua.
 * Cada fila: { clase, id (HTML), que (HTML), tipo (estado) }.
 */
export function alertas(b, { activos, archivoDeFicha, archivoDeHallazgo: deHallazgo, existentes }) {
  const filas = [];
  for (const { h, p } of b.vencidos) {
    filas.push({ clase: "plazo", id: dato(h.id), tipo: TIPO.plazo, que: `<p>${enlace(deHallazgo(h.id), t(h.titulo), existentes)}</p><p>${chip(SEVERIDAD[h.severidad])}</p>${plazoFechado(h, p, { marca: false })}` });
  }
  for (const { h, r } of b.aceptados.filter(({ r }) => r.estado === "toca_revisar")) {
    filas.push({ clase: "revision", id: dato(h.id), tipo: TIPO.revision, que: `<p>${enlace(deHallazgo(h.id), t(h.titulo), existentes)}</p>${revisionFechada(h, r)}` });
  }
  for (const f of b.alertas.catalogo) {
    filas.push({
      clase: "catalogo",
      id: dato(f.ficha.id),
      tipo: TIPO.catalogo,
      que: `<p>${enlace(archivoDeFicha(f.ficha.id), t(f.ficha.nombre), existentes)}</p><p class="hg-menor">${t({ es: `En el plan de: ${activos[f.activo].nombre.es}`, en: `In the plan of: ${activos[f.activo].nombre.en}` })}</p>${vigenciaFechada(f.ficha.verificada, f.catalogo)}`,
    });
  }
  for (const m of b.alertas.marcos) {
    filas.push({
      clase: "marco",
      id: dato(m.corto),
      tipo: TIPO.marco,
      que: `<p>${enlace("marcos.html", t({ es: `La fuente publica la ${m.publicada}`, en: `The source publishes ${m.publicada}` }), existentes)}</p><p class="hg-menor">${t({ es: `El catálogo sigue en la ${m.version} hasta que apruebes el cambio.`, en: `The catalog stays on ${m.version} until you approve the change.` })}</p>`,
    });
  }
  for (const f of b.alertas.antiguas) {
    filas.push({
      clase: "antigua",
      id: dato(f.ficha.id),
      tipo: TIPO.antigua,
      que: `<p>${enlace(archivoDeFicha(f.ficha.id), t(f.ficha.nombre), existentes)}</p><p class="hg-menor">${t({ es: `Último resultado confirmado de ${activos[f.activo].nombre.es}:`, en: `Latest confirmed result from ${activos[f.activo].nombre.en}:` })}</p>${evidenciaFechada(f.ultimo.fecha, f.edad, { marca: false })}`,
    });
  }
  return filas;
}

/** Tabla de alertas: objeto, qué pasa y de qué tipo es (el tipo va en la esquina de la tarjeta). */
export function tablaDeAlertas(filas, titulo, columnas = [{ es: "Objeto", en: "Object" }, { es: "Qué pasa", en: "What is happening" }, { es: "Tipo", en: "Type" }]) {
  return `<table class="hg-tabla">
<caption class="hg-oculto">${t(titulo)}</caption>
<thead><tr>${columnas.map((c) => `<th scope="col">${t(c)}</th>`).join("")}</tr></thead>
<tbody>
${filas.map((f) => `<tr data-alerta="${f.clase}">\n<td data-celda="id">${f.id}</td>\n<td data-celda="principal">${f.que}</td>\n<td data-celda="estado">${chip(f.tipo)}</td>\n</tr>`).join("\n")}
</tbody>
</table>`;
}
