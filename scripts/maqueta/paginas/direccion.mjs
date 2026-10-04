// direccion.html — mirada 1. La identidad de HackGuard sobre un corte REAL de la vista por control
// (pantalla 12, C17): estados de control, veredictos, antigüedad de la evidencia, severidad, huella,
// firma y la cadena hallazgo → corrección → re-prueba → cierre. El usuario eligió la dirección «acta»
// (títulos con serifa, regla doble, secciones numeradas); la alternativa «libro» se retiró.
// Toda cifra sale de nucleo/calculos.mjs con la fecha de consulta.
import { ACTIVOS, CONTROL, HALLAZGOS as TODOS_LOS_HALLAZGOS, PRUEBAS, SOBRES } from "../datos/mundo.mjs";

// Este corte es el de UN control: solo cuentan los hallazgos de las pruebas que lo cubren.
const HALLAZGOS = TODOS_LOS_HALLAZGOS.filter((h) => PRUEBAS.some((p) => p.id === h.prueba));
import { cotaPorCiento, huellaDe, plazo, vistaPorControl } from "../nucleo/calculos.mjs";
import { celda, dato, dias, estado, firma, huella, sello } from "../nucleo/componentes.mjs";
import { CONFIRMACION, ESTADO_DE_CONTROL, SEVERIDAD, VEREDICTO, VIGENCIA } from "../nucleo/estados.mjs";
import { neutro, t } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";

const plural = (n, uno, varios) => (n === 1 ? uno : varios);
const sobreDe = (id) => SOBRES.find((s) => s.id === id);

function conteo(sobre) {
  if (sobre.razon) return sobre.razon;
  const { fallidas: f, evaluadas: k } = sobre;
  if (f > 0) {
    return {
      es: `${f} de ${k} salidas ${plural(f, "falló", "fallaron")}`,
      en: `${f} of ${k} outputs failed`,
    };
  }
  return {
    es: `0 de ${k} fallaron · cota: hasta ${cotaPorCiento(k)}\u00a0%`,
    en: `0 of ${k} failed · upper bound: ${cotaPorCiento(k)}%`,
  };
}

function fraseDeControl(vista, plazos) {
  const total = vista.filas.length;
  const fallas = vista.cuenta("con_fallas");
  if (vista.estado === "con_fallas") {
    const atraso = Math.max(0, ...plazos.map((p) => p.atraso));
    return {
      es:
        `${fallas} de ${total} pruebas ${plural(fallas, "falló", "fallaron")}. ` +
        (atraso > 0
          ? `El hallazgo más atrasado lleva ${atraso} ${plural(atraso, "día", "días")} vencido.`
          : "Sus hallazgos siguen dentro del plazo."),
      en:
        `${fallas} of ${total} tests failed. ` +
        (atraso > 0
          ? `The most overdue finding is ${atraso} ${plural(atraso, "day", "days")} past its deadline.`
          : "Its findings are still within their deadlines."),
    };
  }
  if (vista.estado === "sin_evidencia") {
    return { es: `Ninguna de las ${total} pruebas tiene resultado confirmado.`, en: `None of the ${total} tests has a confirmed result.` };
  }
  if (vista.estado === "evidencia_antigua") {
    return { es: "Toda la evidencia tiene más de 180 días.", en: "All evidence is more than 180 days old." };
  }
  return { es: "Hay evidencia reciente y ninguna prueba falló.", en: "There is recent evidence and no test failed." };
}

function plazoHtml(p) {
  const frase =
    p.estado === "vencido"
      ? { es: `venció hace ${p.atraso} ${plural(p.atraso, "día", "días")}`, en: `${p.atraso} ${plural(p.atraso, "day", "days")} overdue` }
      : { es: `vence el ${p.vence}`, en: `due on ${p.vence}` };
  return `<span data-fechado="plazo" data-desde="${p.desde}" data-plazo="${p.total}" data-severidad="${p.severidad}" data-dias="${p.dias}" data-atraso="${p.atraso}" data-estado-fechado="${p.estado}"><span class="hg-menor">${t({ es: `Plazo de ${p.total} días:`, en: `${p.total}-day deadline:` })}</span> <span data-frase-plazo>${t(frase)}</span></span>`;
}

function filaDePrueba(f, plazosPorHallazgo) {
  const { prueba, ultimo, abierto, edad, veredicto } = f;
  const folio = `<p>${dato(prueba.id)}</p>`;
  const principal = `<p>${t(prueba.que_verifica)}</p>
<p class="hg-menor">${t(ACTIVOS[prueba.activo].nombre)} · ${t({ es: "herramienta:", en: "tool:" })} ${neutro(prueba.herramienta)}</p>`;

  let resultado = `<p>${estado(VEREDICTO[veredicto])}</p>`;
  if (ultimo) {
    resultado += `<p class="hg-menor">${t(conteo(ultimo))}</p>`;
    if (ultimo.reprueba_de) {
      resultado += `<p class="hg-menor">${t({ es: "Re-prueba de", en: "Retest of" })} ${dato(ultimo.reprueba_de)}</p>`;
    }
  } else {
    resultado += `<p class="hg-menor">${t({ es: "Planeada, sin resultado todavía.", en: "Planned, no result yet." })}</p>`;
  }
  if (abierto) {
    resultado += `<p>${dato(abierto.id)} ${estado(SEVERIDAD[abierto.severidad])}</p><p>${plazoHtml(plazosPorHallazgo[abierto.id])}</p>`;
  }

  let evidencia;
  if (ultimo) {
    const antigua = edad.estado === "antigua";
    evidencia = `<div data-fechado="evidencia" data-desde="${ultimo.fecha}" data-dias="${edad.dias}" data-estado-fechado="${edad.estado}">
<p>${dato(ultimo.id)} ${dato(ultimo.fecha)}</p>
<p${antigua ? "" : ' class="hg-menor"'}>${antigua ? estado({ rol: "atencion", simbolo: "reloj", nombre: { es: "Antigua", en: "Stale" } }) + " · " : ""}<span data-frase-dias>${t(dias(edad.dias))}</span></p>
</div>`;
  } else {
    evidencia = `<p class="hg-menor">${t({ es: "Sin sobre de evidencia.", en: "No evidence envelope." })}</p>`;
  }

  const confirmacion = ultimo
    ? `<p>${huella(huellaDe(ultimo))}</p><p>${firma(ultimo.confirmado)}</p>`
    : `<p class="hg-menor">${t({ es: "Nada que firmar todavía.", en: "Nothing to sign yet." })}</p>`;

  return `<li><dl class="hg-fila" data-fila-control="${f.estado}" data-veredicto="${veredicto}">
${celda({ es: "Prueba", en: "Test" }, folio)}
${celda({ es: "Qué verifica", en: "What it verifies" }, principal)}
${celda({ es: "Último resultado", en: "Latest result" }, resultado)}
${celda({ es: "Evidencia", en: "Evidence" }, evidencia)}
${celda({ es: "Huella y confirmación", en: "Fingerprint and confirmation" }, confirmacion)}
</dl></li>`;
}

function eslabon({ rol, simbolo, pendiente }, titulo, cuerpo = "") {
  return `<li class="hg-eslabon es-${pendiente ? "pendiente" : rol}">${SIMBOLO[pendiente ? "vacio" : simbolo]}<span class="hg-eslabon-titulo">${t(titulo)}</span>${cuerpo}</li>`;
}

function cadena(h, p) {
  const origen = sobreDe(h.sobre_origen);
  const reprueba = h.sobre_reprueba ? sobreDe(h.sobre_reprueba) : null;

  const abierto = eslabon(
    { rol: "falla", simbolo: "falla" },
    { es: "Hallazgo abierto", en: "Finding opened" },
    `<p>${dato(h.apertura)}</p><p class="hg-menor">${t(conteo(origen))}</p><p>${dato(origen.id)} ${huella(huellaDe(origen))}</p>${p ? `<p>${plazoHtml(p)}</p>` : ""}`,
  );
  const correccion = h.correccion
    ? eslabon(
        { rol: "acento", simbolo: "firma" },
        { es: "Corrección declarada", en: "Fix declared" },
        `<p>${dato(h.correccion.fecha)}</p><p class="hg-menor">${t(h.correccion.nota)}</p>`,
      )
    : eslabon({ pendiente: true }, { es: "Corrección pendiente", en: "Fix pending" });
  const repetida = reprueba
    ? eslabon(
        { rol: "positivo", simbolo: "ok" },
        { es: "Re-prueba superada", en: "Retest passed" },
        `<p>${dato(reprueba.fecha)}</p><p class="hg-menor">${t(conteo(reprueba))}</p><p class="hg-menor">${t({
          es: `Misma configuración, k\u00a0=\u00a0${reprueba.evaluadas} (el original usó ${origen.evaluadas}).`,
          en: `Same configuration, k\u00a0=\u00a0${reprueba.evaluadas} (the original used ${origen.evaluadas}).`,
        })}</p><p>${dato(reprueba.id)} ${huella(huellaDe(reprueba))}</p><p>${firma(reprueba.confirmado)}</p>`,
      )
    : eslabon({ pendiente: true }, { es: "Re-prueba pendiente", en: "Retest pending" });
  const cierre = h.cierre
    ? eslabon({ rol: "positivo", simbolo: "ok" }, { es: "Cerrado por re-prueba", en: "Closed by retest" }, `<p>${dato(h.cierre)}</p>`)
    : eslabon({ pendiente: true }, { es: "Sin cerrar", en: "Not closed" });

  return `<article class="hg-cadena-caso">
<header><span>${dato(h.id)}</span><h3>${t(h.titulo)}</h3>${estado(SEVERIDAD[h.severidad])}</header>
<ol class="hg-cadena">
${abierto}
${correccion}
${repetida}
${cierre}
</ol>
</article>`;
}

function vocabulario() {
  const grupo = (titulo, mapa) =>
    `<div><h3>${t(titulo)}</h3><ul>${Object.values(mapa)
      .map((e) => `<li>${estado(e)}</li>`)
      .join("")}</ul></div>`;
  return `<div class="hg-vocabulario">
${grupo({ es: "Veredicto de una prueba", en: "Test verdict" }, VEREDICTO)}
${grupo({ es: "Estado de un control", en: "Control status" }, ESTADO_DE_CONTROL)}
${grupo({ es: "Severidad de un hallazgo", en: "Finding severity" }, SEVERIDAD)}
${grupo({ es: "Vigencia y confirmación", en: "Freshness and confirmation" }, { ...VIGENCIA, ...CONFIRMACION })}
</div>`;
}

export function direccion({ consulta, umbrales, existentes }) {
  const vista = vistaPorControl({ pruebas: PRUEBAS, sobres: SOBRES, hallazgos: HALLAZGOS }, consulta, umbrales);
  const plazosPorHallazgo = Object.fromEntries(
    HALLAZGOS.filter((h) => !h.cierre).map((h) => [h.id, { ...plazo(h, consulta, umbrales), desde: h.apertura, severidad: h.severidad }]),
  );
  const plazos = Object.values(plazosPorHallazgo);

  const cifras = ["con_evidencia_vigente", "evidencia_antigua", "con_fallas", "sin_evidencia"]
    .map((e) => `<li><span class="hg-cifra" data-neutro>${vista.cuenta(e)}</span>${estado(ESTADO_DE_CONTROL[e])}</li>`)
    .join("");

  const cabeceraDeLibro = [
    { es: "Prueba", en: "Test" },
    { es: "Qué verifica", en: "What it verifies" },
    { es: "Último resultado", en: "Latest result" },
    { es: "Evidencia", en: "Evidence" },
    { es: "Huella y confirmación", en: "Fingerprint and confirmation" },
  ]
    .map((c) => `<span>${t(c)}</span>`)
    .join("");

  const cerradosPrimero = [...HALLAZGOS].sort((a, b) => Number(Boolean(b.cierre)) - Number(Boolean(a.cierre)));

  const contenido = `<div class="hg-encabezado">
<div>
<p>${dato(CONTROL.id)} <span class="hg-menor">· ${neutro(CONTROL.marco)} · ${t(CONTROL.capa)}</span></p>
<h1>${t(CONTROL.resumen)}</h1>
</div>
<div data-si="datos">
${sello(ESTADO_DE_CONTROL[vista.estado], `<p>${t(fraseDeControl(vista, plazos))}</p>`, `data-control-estado="${vista.estado}"`)}
<p class="hg-aclaracion">${t({
    es: "Esto es evidencia organizada para quien deba evaluarla. No mide el nivel de aseguramiento ni certifica cumplimiento.",
    en: "This is evidence organized for whoever must assess it. It does not measure assurance or certify compliance.",
  })}</p>
</div>
</div>

<div data-si="datos">
<ul class="hg-cifras" ${'aria-label="Pruebas por estado" data-aria-label-es="Pruebas por estado" data-aria-label-en="Tests by status"'}>${cifras}</ul>

<section class="hg-seccion" aria-labelledby="pruebas">
<h2 id="pruebas">${t({ es: "Pruebas que cubren este control", en: "Tests that cover this control" })}</h2>
<p class="hg-intro">${t({
    es: "Una fila por prueba, con su último sobre de evidencia confirmado.",
    en: "One row per test, with its latest confirmed evidence envelope.",
  })}</p>
<div class="hg-libro-cab" aria-hidden="true">${cabeceraDeLibro}</div>
<ul class="hg-libro">
${vista.filas.map((f) => filaDePrueba(f, plazosPorHallazgo)).join("\n")}
</ul>
</section>

<section class="hg-seccion" aria-labelledby="cadena">
<h2 id="cadena">${t({ es: "Cadena de cierre", en: "Closure chain" })}</h2>
<p class="hg-intro">${t({
    es: "Un hallazgo solo se cierra cuando la misma prueba, repetida con la misma configuración, sale bien. Que deje de aparecer en un escaneo no lo cierra.",
    en: "A finding only closes when the same test, repeated with the same configuration, passes. No longer showing up in a scan does not close it.",
  })}</p>
${cerradosPrimero.map((h) => cadena(h, plazosPorHallazgo[h.id])).join("\n")}
</section>

<section class="hg-seccion" aria-labelledby="vocabulario">
<h2 id="vocabulario">${t({ es: "Vocabulario de estados", en: "Status vocabulary" })}</h2>
<p class="hg-intro">${t({
    es: "Cada estado se reconoce por su forma y por su texto. El color acompaña, nunca trabaja solo.",
    en: "Each status is recognized by its shape and its label. Color supports it and never works alone.",
  })}</p>
${vocabulario()}
</section>
</div>

<div class="hg-aviso" data-si="vacio">
<h2>${t({ es: "Ninguna prueba cubre este control todavía", en: "No test covers this control yet" })}</h2>
<p>${t({
    es: "Un control sin pruebas no es un control cumplido: es una deuda a la vista. Asígnale una prueba del catálogo para empezar a reunir evidencia.",
    en: "A control with no tests is not a control that is met: it is a visible debt. Assign it a test from the catalog to start gathering evidence.",
  })}</p>
</div>

<div class="hg-aviso" data-si="carga">
<h2>${t({ es: "Leyendo el libro de evidencia", en: "Reading the evidence ledger" })}</h2>
<p class="hg-menor">${t({ es: "Se comprueba la huella de cada sobre antes de mostrarlo.", en: "Each envelope's fingerprint is checked before it is shown." })}</p>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<div class="hg-aviso" data-si="error">
<h2>${t({ es: "No se pudo leer el libro de evidencia", en: "The evidence ledger could not be read" })}</h2>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "Una huella no coincide", en: "A fingerprint does not match" } },
  `<p>${t({
    es: "Un sobre cambió después de confirmarse. No se muestra nada hasta que coincida: restaura la última copia del libro y vuelve a cargarlo.",
    en: "An envelope changed after it was confirmed. Nothing is shown until it matches: restore the latest copy of the ledger and load it again.",
  })}</p>`,
)}
</div>`;

  return pagina({
    titulo: { es: "HackGuard · dirección", en: "HackGuard · direction" },
    seccion: { id: "brecha", archivo: "control.html" },
    existentes,
    sala: {
      nota: {
        es: "Dirección aprobada en la mirada 1: «acta». Un corte real de la vista por control. Todos los datos son sintéticos.",
        en: "Direction approved in review 1: “record”. A real slice of the control view. All data is synthetic.",
      },
      grupos: [
        barraDeEstados(),
      ],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Botón de tema, arriba", en: "Theme button, top" },
        hacer: { es: "Pasa de oscuro a claro", en: "Go from dark to light" },
        ver: { es: "Papel cálido y tinta en claro; grafito cálido en oscuro. Los dos igual de cuidados", en: "Warm paper and ink in light; warm graphite in dark. Both equally finished" },
      },
      {
        donde: { es: "Sello del control, arriba a la derecha", en: "Control seal, top right" },
        hacer: { es: "Léelo sin fijarte en el color", en: "Read it without relying on color" },
        ver: { es: "«Con fallas» se reconoce por el cuadrado con aspa y por el texto", en: "“Has failures” is recognizable by the crossed square and by the label" },
      },
      {
        donde: { es: "Cadena de cierre", en: "Closure chain" },
        hacer: { es: "Sigue los cuatro pasos de cada hallazgo", en: "Follow the four steps of each finding" },
        ver: { es: "Uno cerrado por re-prueba y otro abierto con sus pasos pendientes en línea punteada", en: "One closed by retest and one open with its pending steps on a dashed line" },
      },
      {
        donde: { es: "Vocabulario de estados", en: "Status vocabulary" },
        hacer: { es: "Recorre las cuatro columnas", en: "Go through the four columns" },
        ver: { es: "Ningún par de estados se te confunde", en: "No two statuses look alike to you" },
      },
      {
        donde: { es: "Sala de diseño, «Estado de la pantalla»", en: "Design room, “Screen state”" },
        hacer: { es: "Pulsa Vacío, Cargando y Error", en: "Press Empty, Loading and Error" },
        ver: { es: "Cada uno tiene su propio mensaje y dice qué hacer", en: "Each has its own message and says what to do" },
      },
    ],
  });
}
