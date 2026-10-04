// hallazgo-<id>.html — pantalla 10 (C12, C13). Un hallazgo: su ciclo de vida como cadena (hallazgo →
// corrección → re-prueba → cierre), su severidad (vector CVSS 4.0 en software; tabla de prioridad de
// acción, con el impacto primero, en IA), su plazo, su evidencia y lo que se puede hacer con él. Hay UNA
// PÁGINA POR HALLAZGO. La ausencia de un hallazgo en un escaneo posterior nunca lo cierra.
// Dirección «consola» (mirada 4-ter): cabecera con chips, el recorrido de cierre a todo el ancho, paneles
// de severidad y control a la izquierda, y a la derecha el carril: qué puedes hacer y las propiedades.
import { CONTROLES, FAMILIAS, PRUEBAS, archivoDeFicha, fichaDe } from "../datos/catalogo.mjs";
import { ACTIVOS, CVSS, ESCALA_IA, HALLAZGOS, LOTES, ORDEN_DE_HALLAZGOS, SOBRES, archivoDeActivo, archivoDeHallazgo } from "../datos/mundo.mjs";
import { diasEntre, sumarDias } from "../nucleo/fecha.mjs";
import { huellaDe, plazo } from "../nucleo/calculos.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, dias, enlace, estado, firma, huella, par, sello } from "../nucleo/componentes.mjs";
import { ESTADO_DE_HALLAZGO, SEVERIDAD, VEREDICTO } from "../nucleo/estados.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";

const sobreDe = (id) => SOBRES.find((s) => s.id === id);
const plural = (n, uno, varios) => (n === 1 ? uno : varios);

const conteoDe = (sobre) =>
  sobre.razon ??
  (sobre.fallidas > 0
    ? { es: `${sobre.fallidas} de ${sobre.evaluadas} salidas fallaron`, en: `${sobre.fallidas} of ${sobre.evaluadas} outputs failed` }
    : { es: `0 de ${sobre.evaluadas} salidas fallaron`, en: `0 of ${sobre.evaluadas} outputs failed` });

function selector(actual, existentes) {
  const items = ORDEN_DE_HALLAZGOS.map((id) => {
    const h = HALLAZGOS.find((x) => x.id === id);
    const archivo = archivoDeHallazgo(id);
    const texto = `<span class="hg-opcion-titulo" data-neutro>${id}</span><span>${t(ESTADO_DE_HALLAZGO[h.estado].nombre)}</span>`;
    if (!existentes.includes(archivo)) return `<li><span class="hg-opcion">${texto}</span></li>`;
    return `<li><a class="hg-opcion" href="${archivo}"${id === actual ? ' aria-current="true"' : ""}>${texto}</a></li>`;
  }).join("");
  return `<nav ${atributo("aria-label", { es: "Hallazgos", en: "Findings" })}><ul class="hg-selector">${items}</ul></nav>`;
}

function eslabon({ rol, simbolo, pendiente }, titulo, cuerpo = "") {
  return `<li class="hg-eslabon es-${pendiente ? "pendiente" : rol}">${SIMBOLO[pendiente ? "vacio" : simbolo]}<span class="hg-eslabon-titulo">${t(titulo)}</span>${cuerpo}</li>`;
}

// Facilidad de un hallazgo de IA: NO se opina, sale de la frecuencia observada en su sobre de origen.
function facilidadDe(sobre) {
  const porCiento = Math.round((sobre.fallidas / sobre.evaluadas) * 100);
  const banda = [...ESCALA_IA.facilidad].reverse().find((b) => porCiento >= b.desde);
  return { porCiento, nivel: banda.nivel, nombre: banda.nombre };
}

function severidadIA(h, origen) {
  const f = facilidadDe(origen);
  const nivel = ESCALA_IA.tabla[h.escala.impacto][f.nivel - 1];
  if (nivel !== h.severidad) throw new Error(`${h.id}: la tabla da «${nivel}» y el hallazgo declara «${h.severidad}»`);

  const cabecera = ESCALA_IA.facilidad.map((b) => `<th scope="col">${t(b.nombre)}</th>`).join("");
  const filas = [4, 3, 2, 1]
    .map((impacto) => {
      const celdas = ESCALA_IA.tabla[impacto]
        .map((n, i) => {
          const esta = impacto === h.escala.impacto && i === f.nivel - 1;
          return `<td${esta ? ' class="es-esta" data-esta-celda' : ""}>${estado(SEVERIDAD[n])}${esta ? `<span class="hg-menor">${t({ es: "este hallazgo", en: "this finding" })}</span>` : ""}</td>`;
        })
        .join("");
      const limite = impacto === 4 ? { es: "Piso: nunca menos de alto", en: "Floor: never below high" } : impacto === 1 ? { es: "Techo: nunca más de medio", en: "Ceiling: never above medium" } : null;
      return `<tr><th scope="row"><span class="hg-cifra-menor" data-neutro>${impacto}</span> <span class="hg-menor hg-matriz-ancla">${t(ESCALA_IA.impacto[impacto])}</span>${limite ? `<span class="hg-menor hg-limite hg-matriz-ancla">${t(limite)}</span>` : ""}</th>${celdas}</tr>`;
    })
    .join("\n");
  // En teléfono las anclas del impacto no caben en la tabla: van debajo, como leyenda.
  const leyenda = [4, 3, 2, 1]
    .map((impacto) => {
      const limite = impacto === 4 ? { es: " Piso: nunca menos de alto.", en: " Floor: never below high." } : impacto === 1 ? { es: " Techo: nunca más de medio.", en: " Ceiling: never above medium." } : null;
      return `<li><strong data-neutro>${impacto}</strong> ${t(ESCALA_IA.impacto[impacto])}.${limite ? `<strong>${t(limite)}</strong>` : ""}</li>`;
    })
    .join("");

  return `<div class="hg-panel-cuerpo">
<p class="hg-menor">${t({
    es: "Escala propia y provisional para hallazgos de IA. No es una suma: el impacto manda, y la tabla dice el nivel. Vive en datos.",
    en: "In-house, provisional scale for AI findings. It is not a sum: impact leads, and the table gives the level. It lives in data.",
  })}</p>
<div class="hg-matriz" data-nivel-de-tabla="${nivel}">
<table>
<caption>${t({ es: "Prioridad de acción: impacto (filas) por frecuencia observada (columnas)", en: "Action priority: impact (rows) by observed frequency (columns)" })}</caption>
<thead><tr><th scope="col">${t({ es: "Impacto", en: "Impact" })}</th>${cabecera}</tr></thead>
<tbody>
${filas}
</tbody>
</table>
<ul class="hg-matriz-leyenda hg-menor">${leyenda}</ul>
</div>
</div>
<div class="hg-panel-cuerpo">
<dl class="hg-propiedades hg-propiedades-en-columnas">
${par({ es: "Impacto", en: "Impact" }, `<p><strong data-neutro>${h.escala.impacto}</strong> <span class="hg-menor">${t({ es: "de 4", en: "of 4" })}</span></p><p class="hg-menor">${t(ESCALA_IA.impacto[h.escala.impacto])}</p>`)}
${par(
  { es: "Frecuencia observada", en: "Observed frequency" },
  `<p><strong data-neutro>${f.porCiento} %</strong></p><p class="hg-menor">${tHtml(
    { es: "{f} de {k} en el sobre {s}. No es una opinión: sale de la evidencia.", en: "{f} of {k} in envelope {s}. It is not an opinion: it comes from the evidence." },
    { f: neutro(String(origen.fallidas)), k: neutro(String(origen.evaluadas)), s: dato(origen.id) },
  )}</p>`,
)}
${par({ es: "Alcance", en: "Reach" }, `<p>${t(ESCALA_IA.alcance[h.escala.alcance])}</p>`)}
${par(
  { es: "Detectabilidad", en: "Detectability" },
  `<p>${t(ESCALA_IA.detectabilidad[h.escala.detectabilidad])}</p><p class="hg-menor">${t({
    es: "Alcance y detectabilidad no cambian el nivel: ordenan los hallazgos de un mismo nivel.",
    en: "Reach and detectability do not change the level: they order findings within the same level.",
  })}</p>`,
)}
</dl>
</div>`;
}

function severidadCVSS(h) {
  const partes = h.cvss.vector.split("/").slice(1).map((p) => p.split(":"));
  const metricas = partes
    .map(([clave, valor]) => {
      const m = CVSS.metricas[clave];
      const nombre = (m.valores ?? CVSS.impacto)[valor];
      return `<li>${dato(`${clave}:${valor}`)}<span>${t(m.nombre)}: ${t(nombre)}</span></li>`;
    })
    .join("");
  return `<div class="hg-panel-cuerpo">
<p class="hg-menor">${t({
    es: "Para software se usa CVSS 4.0, con el vector completo guardado y el puntaje calculado por la referencia oficial.",
    en: "Software uses CVSS 4.0, with the full vector stored and the score computed by the official reference.",
  })}</p>
<div class="hg-puntaje"><span class="hg-cifra" data-neutro>${h.cvss.puntaje}</span><span>${estado({ rol: "positivo", simbolo: "ok", nombre: { es: "Vector válido y completo", en: "Valid, complete vector" } })}</span></div>
<dl class="hg-propiedades">
${par({ es: "Vector", en: "Vector" }, `<span class="hg-dato hg-vector" data-neutro>${h.cvss.vector.replaceAll("/", "/<wbr>")}</span>`)}
${par({ es: "Métricas base", en: "Base metrics" }, `<ul class="hg-metricas">${metricas}</ul>`)}
${par(
  { es: "Cómo se calculó", en: "How it was computed" },
  `<p class="hg-menor">${t({ es: "Referencia fijada:", en: "Pinned reference:" })} <span class="hg-dato hg-vector" data-neutro>${CVSS.referencia.replace("/", "/<wbr>").replace("@", "<wbr>@")}</span></p><p class="hg-menor">${t({
    es: "Un vector incompleto se rechaza, no se completa solo.",
    en: "An incomplete vector is rejected, not completed automatically.",
  })}</p>`,
)}
</dl>
</div>`;
}

export const hallazgo = (id) => ({ consulta, umbrales, existentes }) => {
  const h = HALLAZGOS.find((x) => x.id === id);
  const prueba = PRUEBAS.find((p) => p.id === h.prueba);
  const ficha = fichaDe(h.prueba);
  const origen = sobreDe(h.sobre_origen);
  const reprueba = h.sobre_reprueba ? sobreDe(h.sobre_reprueba) : null;
  const porConfirmar = h.reprueba_por_confirmar ? LOTES.flatMap((l) => l.sobres.map((s) => ({ ...s, lote: l.id }))).find((s) => s.id === h.reprueba_por_confirmar) : null;
  const corre = !["cerrado", "cerrado_por_eliminacion", "no_reproducible", "aceptado_con_riesgo"].includes(h.estado);
  const p = corre && umbrales.plazo_por_severidad[h.severidad] ? plazo(h, consulta, umbrales) : null;

  // ---- Plazo y revisión: lo que el calendario cambia, con el protocolo de la matriz de envejecimiento.
  let plazoHtml = `<span class="hg-menor">${t({ es: "Ya no corre: el hallazgo está cerrado.", en: "No longer running: the finding is closed." })}</span>`;
  if (p) {
    const frase =
      p.estado === "vencido"
        ? { es: `venció hace ${p.atraso} ${plural(p.atraso, "día", "días")}`, en: `${p.atraso} ${plural(p.atraso, "day", "days")} overdue` }
        : { es: `vence el ${p.vence}`, en: `due on ${p.vence}` };
    plazoHtml = `<span data-fechado="plazo" data-desde="${h.apertura}" data-plazo="${p.total}" data-severidad="${h.severidad}" data-dias="${p.dias}" data-atraso="${p.atraso}" data-estado-fechado="${p.estado}">${estado(
      p.estado === "vencido" ? { rol: "falla", simbolo: "falla", nombre: { es: "Vencido", en: "Overdue" } } : { rol: "neutro", simbolo: "reloj", nombre: { es: "En plazo", en: "On time" } },
    )} <span class="hg-menor">${t({ es: `Plazo de ${p.total} días:`, en: `${p.total}-day deadline:` })} <span data-frase-plazo>${t(frase)}</span></span></span>`;
  }
  let revision = "";
  let tocaRevisar = false;
  if (h.aceptacion) {
    const d = diasEntre(h.aceptacion.fecha, consulta);
    tocaRevisar = d >= h.aceptacion.revision_en_dias;
    plazoHtml = `<span class="hg-menor">${t({ es: "Suspendido mientras el riesgo esté aceptado.", en: "Suspended while the risk is accepted." })}</span>`;
    revision = par(
      { es: "Revisión del riesgo", en: "Risk review" },
      `<span data-fechado="revision" data-desde="${h.aceptacion.fecha}" data-plazo="${h.aceptacion.revision_en_dias}" data-dias="${d}" data-estado-fechado="${tocaRevisar ? "toca_revisar" : "vigente"}">${estado(
        tocaRevisar ? { rol: "falla", simbolo: "falla", nombre: { es: "Toca revisarlo", en: "Review is due" } } : { rol: "neutro", simbolo: "reloj", nombre: { es: "Revisión programada", en: "Review scheduled" } },
      )} <span class="hg-menor">${t({ es: "Aceptado", en: "Accepted" })} <span data-frase-dias>${t(dias(d))}</span>, ${t({ es: "se revisa el", en: "to be reviewed on" })} ${dato(sumarDias(h.aceptacion.fecha, h.aceptacion.revision_en_dias))}</span></span>`,
    );
  }

  const escala = h.cvss ? neutro(`CVSS 4.0 · ${h.cvss.puntaje}`) : t({ es: "escala de IA", en: "AI scale" });
  const propiedades = `<dl class="hg-propiedades">
${par({ es: "Plazo", en: "Deadline" }, plazoHtml)}
${revision}
${par({ es: "Abierto", en: "Opened" }, dato(h.apertura))}
${par({ es: "Activo", en: "Asset" }, enlace(archivoDeActivo(h.activo), t(ACTIVOS[h.activo].nombre), existentes))}
${par({ es: "Prueba", en: "Test" }, `<span>${enlace(archivoDeFicha(h.prueba), t(prueba.nombre), existentes)}</span><span>${dato(h.prueba)} <span class="hg-menor">· ${t(FAMILIAS[prueba.familia])}</span></span>`)}
${par({ es: "Severidad", en: "Severity" }, `<span>${estado(SEVERIDAD[h.severidad])} <span class="hg-menor">· ${escala}</span></span>`)}
</dl>`;

  // ---- Avisos bajo el encabezado: dicen el umbral y qué hacer; la cifra que envejece está en la ficha.
  const avisos = [];
  if (p?.estado === "vencido") {
    avisos.push(
      sello(
        { rol: "falla", simbolo: "falla", nombre: { es: "Plazo vencido", en: "Deadline passed" } },
        `<p>${t({
          es: `Un hallazgo de severidad «${SEVERIDAD[h.severidad].nombre.es.toLowerCase()}» tiene ${p.total} días. Registra la corrección y re-prueba, o decide un cierre alternativo con su justificación.`,
          en: `A finding of “${SEVERIDAD[h.severidad].nombre.en.toLowerCase()}” severity has ${p.total} days. Record the fix and retest, or decide an alternative closure with its justification.`,
        })}</p>`,
        `data-aviso-de-plazo="vencido"`,
      ),
    );
  }
  if (tocaRevisar) {
    avisos.push(
      sello(
        { rol: "falla", simbolo: "falla", nombre: { es: "Toca revisar el riesgo aceptado", en: "The accepted risk is due for review" } },
        `<p>${t({
          es: `Se aceptó con revisión a los ${h.aceptacion.revision_en_dias} días y ya pasaron. Vuelve a aceptarlo con una justificación nueva o reábrelo.`,
          en: `It was accepted with a review at ${h.aceptacion.revision_en_dias} days and they have passed. Accept it again with a new justification or reopen it.`,
        })}</p>`,
        `data-aviso-de-revision`,
      ),
    );
  }

  // ---- La cadena de cierre.
  const kOriginal = origen.evaluadas;
  const abierto = eslabon(
    { rol: "falla", simbolo: "falla" },
    { es: "Hallazgo abierto", en: "Finding opened" },
    `<p>${dato(h.apertura)}</p><p class="hg-menor">${t(conteoDe(origen))}</p><p>${dato(origen.id)}</p><p>${huella(huellaDe(origen))}</p><p>${firma(origen.confirmado)}</p>`,
  );
  let segundo;
  let tercero;
  let cuarto;
  if (h.aceptacion) {
    segundo = eslabon(
      { rol: "acento", simbolo: "firma" },
      { es: "Riesgo aceptado", en: "Risk accepted" },
      `<p>${dato(h.aceptacion.fecha)}</p><p class="hg-menor">${t(h.aceptacion.justificacion)}</p>`,
    );
    tercero = eslabon({ pendiente: true }, { es: "Sin corrección ni re-prueba", en: "No fix and no retest" });
    cuarto = eslabon({ pendiente: true }, { es: "Sin cerrar: sigue contando como falla del control", en: "Not closed: it still counts as a control failure" });
  } else {
    segundo = h.correccion
      ? eslabon({ rol: "acento", simbolo: "firma" }, { es: "Corrección declarada", en: "Fix declared" }, `<p>${dato(h.correccion.fecha)}</p><p class="hg-menor">${t(h.correccion.nota)}</p>`)
      : eslabon({ pendiente: true }, { es: "Corrección pendiente", en: "Fix pending" });
    tercero = reprueba
      ? eslabon(
          { rol: "positivo", simbolo: "ok" },
          { es: "Re-prueba superada", en: "Retest passed" },
          `<p>${dato(reprueba.fecha)}</p><p class="hg-menor">${t(conteoDe(reprueba))}</p><p class="hg-menor">${t({
            es: `Misma configuración, k = ${reprueba.evaluadas} (el original usó ${kOriginal}).`,
            en: `Same configuration, k = ${reprueba.evaluadas} (the original used ${kOriginal}).`,
          })}</p><p>${dato(reprueba.id)}</p><p>${huella(huellaDe(reprueba))}</p><p>${firma(reprueba.confirmado)}</p>`,
        )
      : porConfirmar
        ? eslabon(
            { rol: "atencion", simbolo: "reloj" },
            { es: "Re-prueba por confirmar", en: "Retest to confirm" },
            `<p>${dato(porConfirmar.id)} <span class="hg-menor">· ${t(porConfirmar.razon)}</span></p><p class="hg-menor">${tHtml(
              { es: "Está en el lote {l}, sin confirmar: todavía no cuenta.", en: "It is in batch {l}, unconfirmed: it does not count yet." },
              { l: enlace("evidencia.html", dato(porConfirmar.lote), existentes) },
            )}</p>`,
          )
        : eslabon(
            { pendiente: true },
            { es: "Re-prueba pendiente", en: "Retest pending" },
            `<p class="hg-menor">${t(
              kOriginal
                ? { es: `Misma configuración y al menos k = ${kOriginal}.`, en: `Same configuration and at least k = ${kOriginal}.` }
                : { es: "Misma configuración que la prueba original.", en: "Same configuration as the original test." },
            )}</p>`,
          );
    cuarto = h.cierre
      ? eslabon({ rol: "positivo", simbolo: "ok" }, { es: "Cerrado por re-prueba", en: "Closed by retest" }, `<p>${dato(h.cierre)}</p>`)
      : eslabon({ pendiente: true }, { es: "Sin cerrar", en: "Not closed" });
  }

  // ---- Qué se puede hacer, según el estado. Cada salida dice lo que exige.
  const cerrado = h.estado === "cerrado";
  const acciones = cerrado
    ? `<p class="hg-menor">${t({
        es: "Nada: la evidencia confirmada es inmutable. Si una re-prueba posterior vuelve a fallar, el hallazgo se reabre y queda marcado como reabierto.",
        en: "Nothing: confirmed evidence is immutable. If a later retest fails again, the finding is reopened and flagged as reopened.",
      })}</p>`
    : `<div class="hg-pila" data-propuesta="${h.id}" data-decision="">
<div class="hg-acciones" role="group" ${atributo("aria-label", { es: `Qué hacer con ${h.id}`, en: `What to do with ${h.id}` })}>
${[
  h.correccion || h.aceptacion ? null : ["corregir", { es: "Registrar la corrección", en: "Record the fix" }],
  h.aceptacion ? ["reabrir", { es: "Reabrir", en: "Reopen" }] : ["aceptar", { es: "Aceptar el riesgo", en: "Accept the risk" }],
  ["eliminar", { es: "Cerrar por eliminación", en: "Close by removal" }],
  ["no_reproducible", { es: "No se reproduce", en: "Cannot reproduce" }],
]
  .filter(Boolean)
  .map(([valor, nombre]) => `<button type="button" class="hg-boton${valor === "corregir" ? " hg-boton-primario" : ""}" data-controlador="decidir" data-valor="${valor}" aria-pressed="false">${t(nombre)}</button>`)
  .join("\n")}
</div>
<p class="hg-menor" data-si-decision="">${t({ es: "Elige una salida para ver qué exige.", en: "Pick an outcome to see what it requires." })}</p>
<p class="hg-consecuencia" data-si-decision="corregir" hidden>${t({
        es: "Pide qué se hizo y cuándo. El hallazgo pasa a «corregido», pero no se cierra: falta la re-prueba, con la misma configuración.",
        en: "It asks what was done and when. The finding moves to “fixed”, but it does not close: the retest is still needed, with the same configuration.",
      })}</p>
<p class="hg-consecuencia" data-si-decision="aceptar" hidden>${t({
        es: "Exige una justificación y una fecha de revisión. No lo cierra: sigue contando como falla del control hasta que se corrija.",
        en: "It requires a justification and a review date. It does not close it: it keeps counting as a control failure until it is fixed.",
      })}</p>
<p class="hg-consecuencia" data-si-decision="reabrir" hidden>${t({
        es: "Vuelve a «abierto» y su plazo corre otra vez desde la fecha de apertura original.",
        en: "It goes back to “open” and its deadline runs again from the original opening date.",
      })}</p>
<p class="hg-consecuencia" data-si-decision="eliminar" hidden>${t({
        es: "Solo si el componente o el activo ya no existe. Exige justificación, y en la brecha se muestra aparte de los cierres por re-prueba.",
        en: "Only if the component or the asset no longer exists. It requires a justification, and the gap view shows it apart from closures by retest.",
      })}</p>
<p class="hg-consecuencia" data-si-decision="no_reproducible" hidden>${t(
        kOriginal
          ? {
              es: "Exige justificación y los intentos registrados que la frecuencia original pide; dos intentos no bastan en una prueba que varía entre corridas.",
              en: "It requires a justification and the recorded attempts that the original frequency calls for; two attempts are not enough for a test that varies between runs.",
            }
          : { es: "Exige justificación y dos intentos registrados con la misma configuración.", en: "It requires a justification and two recorded attempts with the same configuration." },
      )}</p>
</div>`;

  const control = ficha.controles.length
    ? ficha.controles.map((c) => `<div class="hg-junto"><p>${dato(c)}</p><p><strong>${t(CONTROLES[c])}</strong></p></div>`).join("")
    : `<div class="hg-junto"><p>${chip({ rol: "atencion", simbolo: "aviso", nombre: { es: "Sin control asignado", en: "No control assigned" } })}</p><p class="hg-menor">${t({
        es: "La prueba todavía no da evidencia a ningún control: el hallazgo cuenta para el activo, pero no para la vista por control.",
        en: "The test does not yet give evidence to any control: the finding counts for the asset, but not for the control view.",
      })}</p></div>`;

  const contenido = `<div class="hg-pila" data-si="datos" data-hallazgo="${id}" data-estado-hallazgo="${h.estado}">
${selector(id, existentes)}
<div class="hg-cabecera">
<div>
<p class="hg-cabecera-linea">${dato(h.id)}${chip(ESTADO_DE_HALLAZGO[h.estado])}<span data-severidad-declarada>${chip(SEVERIDAD[h.severidad])}</span><span class="hg-menor">${escala}</span></p>
<h1>${t(h.titulo)}</h1>
<p class="hg-bajada">${t(h.descripcion)}</p>
</div>
</div>
${avisos.join("\n")}

<section class="hg-panel" aria-labelledby="cadena">
<div class="hg-panel-cab"><h2 id="cadena">${t({ es: "Cadena de cierre", en: "Closure chain" })}</h2><p class="hg-menor">${t({
    es: "Solo se cierra con una re-prueba superada y confirmada. Que no aparezca en un escaneo posterior no lo cierra.",
    en: "It only closes with a passed, confirmed retest. Not showing up in a later scan does not close it.",
  })}</p></div>
<ol class="hg-cadena hg-cadena-horizontal">
${abierto}
${segundo}
${tercero}
${cuarto}
</ol>
</section>

<div class="hg-trabajo">
<div class="hg-pila">
<section class="hg-panel" aria-labelledby="severidad">
<div class="hg-panel-cab"><h2 id="severidad">${t({ es: "Severidad", en: "Severity" })}</h2>${chip(SEVERIDAD[h.severidad])}</div>
${h.cvss ? severidadCVSS(h) : severidadIA(h, origen)}
</section>

<section class="hg-panel" aria-labelledby="control">
<div class="hg-panel-cab"><h2 id="control">${t({ es: "Qué control falla", en: "Which control fails" })}</h2><p class="hg-menor">${t({
    es: "Un hallazgo es evidencia de que un control no está funcionando.",
    en: "A finding is evidence that a control is not working.",
  })}</p></div>
<div class="hg-panel-cuerpo">
${control}
<div class="hg-contraste">
<div><p class="hg-rotulo">${t({ es: "Lo que se esperaba", en: "What was expected" })}</p><p>${t(ficha.resultado_esperado)}</p></div>
<div><p class="hg-rotulo">${t({ es: "Lo que se obtuvo", en: "What was obtained" })}</p><p>${chip(VEREDICTO[origen.veredicto])}</p><p>${t(conteoDe(origen))}</p></div>
</div>
</div>
</section>
</div>

<aside class="hg-carril" ${atributo("aria-label", { es: `Acciones y propiedades de ${h.id}`, en: `Actions and properties of ${h.id}` })}>
<section class="hg-tarjeta hg-tarjeta-accion" aria-labelledby="acciones">
<h2 class="hg-tarjeta-titulo" id="acciones">${t({ es: "Qué puedes hacer", en: "What you can do" })}</h2>
${acciones}
</section>
<section class="hg-tarjeta" aria-labelledby="propiedades">
<h2 class="hg-tarjeta-titulo" id="propiedades">${t({ es: "Propiedades", en: "Properties" })}</h2>
${propiedades}
</section>
</aside>
</div>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "No hay hallazgos", en: "No findings" },
  `<p>${t({
    es: "Ningún sobre confirmado tiene veredicto «fallida» o «parcial». Eso no dice que todo esté bien: dice que nada falló entre lo que se probó. Mira la brecha para ver lo que falta por probar.",
    en: "No confirmed envelope has a “failed” or “partial” verdict. That does not say everything is fine: it says nothing failed among what was tested. Check the gap view for what is still untested.",
  })}</p>`,
)}

${aviso("carga", CARGA, { es: "Abriendo el hallazgo", en: "Opening the finding" }, ESQUELETO)}

${aviso(
  "error",
  ERROR,
  { es: "El hallazgo no se pudo abrir", en: "The finding could not be opened" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "El vector de severidad está incompleto", en: "The severity vector is incomplete" } },
    `<p>${tHtml(
      {
        es: "Al vector le falta la métrica {m}. Un vector incompleto no se completa solo ni se puntúa: corrígelo en el archivo del hallazgo.",
        en: "The vector is missing metric {m}. An incomplete vector is neither completed automatically nor scored: fix it in the finding's file.",
      },
      { m: dato("SA") },
    )}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: `HackGuard · ${h.id}`, en: `HackGuard · ${h.id}` },
    seccion: { id: "evidencia", archivo: archivoDeHallazgo(ORDEN_DE_HALLAZGOS[0]) },
    migas: [t({ es: "Evidencia", en: "Evidence" }), t({ es: "Hallazgos", en: "Findings" }), dato(h.id)],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter: un hallazgo con la interfaz nueva (aprobado en el primer tramo). Hay cuatro, uno por cada momento del ciclo; la escala de IA es ilustrativa y provisional.",
        en: "Review 4-ter: a finding with the new interface (approved in the first stretch). There are four, one for each moment of the life cycle; the AI scale is illustrative and provisional.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Toda la pantalla", en: "The whole screen" },
        hacer: { es: "Mírala unos segundos sin leer", en: "Look at it for a few seconds without reading" },
        ver: { es: "Se lee de arriba abajo: qué es, en qué paso va, y a la derecha qué puedes hacer", en: "It reads top to bottom: what it is, which step it is at, and on the right what you can do" },
      },
      {
        donde: { es: "Selector de arriba", en: "The selector at the top" },
        hacer: { es: "Abre los cuatro hallazgos", en: "Open all four findings" },
        ver: { es: "Abierto y vencido, corregido, aceptado con riesgo y cerrado: cada uno se reconoce por su estado y su recorrido", en: "Open and overdue, fixed, accepted with risk and closed: each is recognized by its status and its progress" },
      },
      {
        donde: { es: "Cadena de cierre", en: "Closure chain" },
        hacer: { es: "Compárala entre el abierto y el cerrado", en: "Compare it between the open one and the closed one" },
        ver: { es: "Lo que falta se ve punteado; lo hecho lleva fecha, sobre y firma", en: "What is missing shows dotted; what is done carries a date, an envelope and a signature" },
      },
      {
        donde: { es: "Severidad", en: "Severity" },
        hacer: { es: "Mira la tabla en un hallazgo de IA y el vector en el de software", en: "Look at the table on an AI finding and the vector on the software one" },
        ver: { es: "En la tabla se ve en qué casilla cae y por qué; el vector se lee métrica por métrica", en: "The table shows which cell it lands in and why; the vector reads metric by metric" },
      },
      {
        donde: { es: "Carril de la derecha", en: "Right-hand rail" },
        hacer: { es: "Pulsa cada salida", en: "Press each outcome" },
        ver: { es: "Cada una dice qué exige; ninguna cierra el hallazgo sin justificación o sin re-prueba", en: "Each one says what it requires; none closes the finding without a justification or a retest" },
      },
    ],
  });
};
