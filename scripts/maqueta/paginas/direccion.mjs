// direccion.html — mirada 1, rehecha en la mirada 4-ter con la dirección «consola». Un corte REAL de la
// vista por control (pantalla 12, C17), adelanto de la página `control` de la mirada 5: el estado del
// control, una fila por prueba con su último sobre, la antigüedad de la evidencia, severidad, huella,
// firma y el recorrido hallazgo → corrección → re-prueba → cierre. Toda cifra sale de
// nucleo/calculos.mjs con la fecha de consulta.
import { ACTIVOS, CONTROL, HALLAZGOS as TODOS_LOS_HALLAZGOS, PRUEBAS, SOBRES, archivoDeHallazgo } from "../datos/mundo.mjs";
import { archivoDeFicha } from "../datos/catalogo.mjs";
import { cotaPorCiento, huellaDe, plazo, vistaPorControl } from "../nucleo/calculos.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, dias, enlace, estado, firma, huella, sello } from "../nucleo/componentes.mjs";
import { CONFIRMACION, ESTADO_DE_CONTROL, SEVERIDAD, VEREDICTO, VIGENCIA } from "../nucleo/estados.mjs";
import { atributo, neutro, t } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";

// Este corte es el de UN control: solo cuentan los hallazgos de las pruebas que lo cubren.
const HALLAZGOS = TODOS_LOS_HALLAZGOS.filter((h) => PRUEBAS.some((p) => p.id === h.prueba));

const plural = (n, uno, varios) => (n === 1 ? uno : varios);
const sobreDe = (id) => SOBRES.find((s) => s.id === id);
const columnas = (lista) => `<thead><tr>${lista.map((c) => `<th scope="col">${t(c)}</th>`).join("")}</tr></thead>`;

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
    es: `0 de ${k} fallaron · cota: hasta ${cotaPorCiento(k)} %`,
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

// Plazo de un hallazgo, con el protocolo de la matriz de envejecimiento. La frase va entera en una línea.
function plazoHtml(p) {
  const frase =
    p.estado === "vencido"
      ? { es: `venció hace ${p.atraso} ${plural(p.atraso, "día", "días")}`, en: `${p.atraso} ${plural(p.atraso, "day", "days")} overdue` }
      : { es: `vence el ${p.vence}`, en: `due on ${p.vence}` };
  const marca = p.estado === "vencido" ? chip({ rol: "falla", simbolo: "falla", nombre: { es: "Plazo vencido", en: "Deadline passed" } }) : estado({ rol: "neutro", simbolo: "reloj", nombre: { es: "En plazo", en: "On time" } });
  return `<span data-fechado="plazo" data-desde="${p.desde}" data-plazo="${p.total}" data-severidad="${p.severidad}" data-dias="${p.dias}" data-atraso="${p.atraso}" data-estado-fechado="${p.estado}">${marca} <span class="hg-menor">${t({ es: `Plazo de ${p.total} días:`, en: `${p.total}-day deadline:` })} <span data-frase-plazo>${t(frase)}</span></span></span>`;
}

function filaDePrueba(f, plazosPorHallazgo, existentes) {
  const { prueba, ultimo, abierto, edad, veredicto } = f;

  let resultado = `<p>${ultimo && (veredicto === "superada" || veredicto === "no_aplicable") ? estado(VEREDICTO[veredicto]) : chip(VEREDICTO[veredicto])}</p>`;
  if (ultimo) {
    resultado += `<p class="hg-menor">${t(conteo(ultimo))}</p>`;
    if (ultimo.reprueba_de) resultado += `<p class="hg-menor">${t({ es: "Re-prueba de", en: "Retest of" })} ${dato(ultimo.reprueba_de)}</p>`;
  } else {
    resultado += `<p class="hg-menor">${t({ es: "Planeada, sin resultado todavía.", en: "Planned, no result yet." })}</p>`;
  }

  const hallazgo = abierto
    ? `<p>${enlace(archivoDeHallazgo(abierto.id), dato(abierto.id), existentes)} ${chip(SEVERIDAD[abierto.severidad])}</p>${plazoHtml(plazosPorHallazgo[abierto.id])}`
    : `<p class="hg-menor">${t({ es: "Ninguno abierto", en: "None open" })}</p>`;

  let evidencia;
  if (ultimo) {
    const antigua = edad.estado === "antigua";
    evidencia = `<div data-fechado="evidencia" data-desde="${ultimo.fecha}" data-dias="${edad.dias}" data-estado-fechado="${edad.estado}">
<p>${dato(ultimo.id)} ${dato(ultimo.fecha)}</p>
${antigua ? `<p>${chip({ rol: "atencion", simbolo: "reloj", nombre: { es: "Antigua", en: "Stale" } })}</p>` : ""}<p class="hg-menor"><span data-frase-dias>${t(dias(edad.dias))}</span></p>
${huella(huellaDe(ultimo))}
<p>${firma(ultimo.confirmado)}</p>
</div>`;
  } else {
    evidencia = `<p class="hg-menor">${t({ es: "Sin sobre de evidencia.", en: "No evidence envelope." })}</p>`;
  }

  return `<tr data-fila-control="${f.estado}" data-veredicto="${veredicto}">
<td data-celda="id">${dato(prueba.id)}</td>
<td data-celda="principal"><p><a class="hg-enlace-fila" href="${archivoDeFicha(prueba.id)}">${t(prueba.nombre)}</a></p><p class="hg-menor">${t(ACTIVOS[prueba.activo].nombre)} · ${neutro(prueba.herramienta)}</p></td>
<td>${resultado}</td>
<td>${hallazgo}</td>
<td>${evidencia}</td>
</tr>`;
}

function eslabon({ rol, simbolo, pendiente }, titulo, cuerpo = "") {
  return `<li class="hg-eslabon es-${pendiente ? "pendiente" : rol}">${SIMBOLO[pendiente ? "vacio" : simbolo]}<span class="hg-eslabon-titulo">${t(titulo)}</span>${cuerpo}</li>`;
}

function cadena(h, p, existentes) {
  const origen = sobreDe(h.sobre_origen);
  const reprueba = h.sobre_reprueba ? sobreDe(h.sobre_reprueba) : null;

  const abierto = eslabon(
    { rol: "falla", simbolo: "falla" },
    { es: "Hallazgo abierto", en: "Finding opened" },
    `${dato(h.apertura)}<span class="hg-menor">${t(conteo(origen))}</span>${dato(origen.id)}`,
  );
  const correccion = h.correccion
    ? eslabon({ rol: "acento", simbolo: "firma" }, { es: "Corrección declarada", en: "Fix declared" }, `${dato(h.correccion.fecha)}<span class="hg-menor">${t(h.correccion.nota)}</span>`)
    : eslabon({ pendiente: true }, { es: "Corrección pendiente", en: "Fix pending" });
  const repetida = reprueba
    ? eslabon(
        { rol: "positivo", simbolo: "ok" },
        { es: "Re-prueba superada", en: "Retest passed" },
        `${dato(reprueba.fecha)}<span class="hg-menor">${t({
          es: `Misma configuración, k = ${reprueba.evaluadas} (el original usó ${origen.evaluadas}).`,
          en: `Same configuration, k = ${reprueba.evaluadas} (the original used ${origen.evaluadas}).`,
        })}</span>${firma(reprueba.confirmado)}`,
      )
    : eslabon({ pendiente: true }, { es: "Re-prueba pendiente", en: "Retest pending" });
  const cierre = h.cierre
    ? eslabon({ rol: "positivo", simbolo: "ok" }, { es: "Cerrado por re-prueba", en: "Closed by retest" }, dato(h.cierre))
    : eslabon({ pendiente: true }, { es: "Sin cerrar", en: "Not closed" });

  return `<section class="hg-panel" aria-labelledby="cadena-${h.id}">
<div class="hg-panel-cab"><div class="hg-panel-linea">${enlace(archivoDeHallazgo(h.id), dato(h.id), existentes)}<h3 id="cadena-${h.id}">${t(h.titulo)}</h3></div><div class="hg-panel-linea">${chip(SEVERIDAD[h.severidad])}${p ? plazoHtml(p) : ""}</div></div>
<ol class="hg-cadena hg-cadena-horizontal">
${abierto}
${correccion}
${repetida}
${cierre}
</ol>
</section>`;
}

const grupo = (titulo, mapa) =>
  `<div><p class="hg-rotulo">${t(titulo)}</p><ul>${Object.values(mapa)
    .map((e) => `<li>${estado(e)}</li>`)
    .join("")}</ul></div>`;

export function direccion({ consulta, umbrales, existentes }) {
  const vista = vistaPorControl({ pruebas: PRUEBAS, sobres: SOBRES, hallazgos: HALLAZGOS }, consulta, umbrales);
  const plazosPorHallazgo = Object.fromEntries(
    HALLAZGOS.filter((h) => !h.cierre).map((h) => [h.id, { ...plazo(h, consulta, umbrales), desde: h.apertura, severidad: h.severidad }]),
  );
  const plazos = Object.values(plazosPorHallazgo);

  const cifras = ["con_evidencia_vigente", "evidencia_antigua", "con_fallas", "sin_evidencia"]
    .map((e) => `<li><span class="hg-cifra" data-neutro>${vista.cuenta(e)}</span>${estado(ESTADO_DE_CONTROL[e])}</li>`)
    .join("");

  const cerradosPrimero = [...HALLAZGOS].sort((a, b) => Number(Boolean(b.cierre)) - Number(Boolean(a.cierre)));

  const contenido = `<div class="hg-cabecera">
<div>
<p class="hg-cabecera-linea">${dato(CONTROL.id)}<span class="hg-menor">${neutro(CONTROL.marco)} · ${t(CONTROL.capa)}</span></p>
<h1>${t(CONTROL.resumen)}</h1>
<p class="hg-bajada">${t({
    es: "Esto es evidencia organizada para quien deba evaluarla. No mide el nivel de aseguramiento ni certifica cumplimiento.",
    en: "This is evidence organized for whoever must assess it. It does not measure assurance or certify compliance.",
  })}</p>
</div>
<ul class="hg-resumen" data-si="datos" ${atributo("aria-label", { es: "Pruebas por estado", en: "Tests by status" })}>${cifras}</ul>
</div>

<div class="hg-pila" data-si="datos">
${sello(ESTADO_DE_CONTROL[vista.estado], `<p>${t(fraseDeControl(vista, plazos))}</p>`, `data-control-estado="${vista.estado}"`)}

<section class="hg-panel" aria-labelledby="pruebas">
<div class="hg-panel-cab"><h2 id="pruebas">${t({ es: "Pruebas que cubren este control", en: "Tests that cover this control" })}</h2><p class="hg-menor">${t({
    es: "Una fila por prueba, con su último sobre de evidencia confirmado.",
    en: "One row per test, with its latest confirmed evidence envelope.",
  })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Pruebas que cubren este control", en: "Tests that cover this control" })}</caption>
${columnas([
  { es: "Prueba", en: "Test" },
  { es: "Qué verifica", en: "What it verifies" },
  { es: "Último resultado", en: "Latest result" },
  { es: "Hallazgo abierto", en: "Open finding" },
  { es: "Evidencia y confirmación", en: "Evidence and confirmation" },
])}
<tbody>
${vista.filas.map((f) => filaDePrueba(f, plazosPorHallazgo, existentes)).join("\n")}
</tbody>
</table>
</section>

<section class="hg-pila" aria-labelledby="cadenas">
<h2 id="cadenas">${t({ es: "Cadena de cierre de sus hallazgos", en: "Closure chain of its findings" })}</h2>
${cerradosPrimero.map((h) => cadena(h, plazosPorHallazgo[h.id], existentes)).join("\n")}
</section>

<section class="hg-panel" aria-labelledby="vocabulario">
<div class="hg-panel-cab"><h2 id="vocabulario">${t({ es: "Vocabulario de estados", en: "Status vocabulary" })}</h2><p class="hg-menor">${t({
    es: "Cada estado se reconoce por su forma y por su texto. El color acompaña, nunca trabaja solo.",
    en: "Each status is recognized by its shape and its label. Color supports it and never works alone.",
  })}</p></div>
<div class="hg-panel-cuerpo"><div class="hg-vocabulario">
${grupo({ es: "Veredicto de una prueba", en: "Test verdict" }, VEREDICTO)}
${grupo({ es: "Estado de un control", en: "Control status" }, ESTADO_DE_CONTROL)}
${grupo({ es: "Severidad de un hallazgo", en: "Finding severity" }, SEVERIDAD)}
${grupo({ es: "Vigencia y confirmación", en: "Freshness and confirmation" }, { ...VIGENCIA, ...CONFIRMACION })}
</div></div>
</section>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "Ninguna prueba cubre este control todavía", en: "No test covers this control yet" },
  `<p>${t({
    es: "Un control sin pruebas no es un control cumplido: es una deuda a la vista. Asígnale una prueba del catálogo para empezar a reunir evidencia.",
    en: "A control with no tests is not a control that is met: it is a visible debt. Assign it a test from the catalog to start gathering evidence.",
  })}</p>`,
)}

${aviso(
  "carga",
  CARGA,
  { es: "Leyendo el libro de evidencia", en: "Reading the evidence ledger" },
  `<p>${t({ es: "Se comprueba la huella de cada sobre antes de mostrarlo.", en: "Each envelope's fingerprint is checked before it is shown." })}</p>${ESQUELETO}`,
)}

${aviso(
  "error",
  ERROR,
  { es: "No se pudo leer el libro de evidencia", en: "The evidence ledger could not be read" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "Una huella no coincide", en: "A fingerprint does not match" } },
    `<p>${t({
      es: "Un sobre cambió después de confirmarse. No se muestra nada hasta que coincida: restaura la última copia del libro y vuelve a cargarlo.",
      en: "An envelope changed after it was confirmed. Nothing is shown until it matches: restore the latest copy of the ledger and load it again.",
    })}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: "HackGuard · dirección", en: "HackGuard · direction" },
    seccion: { id: "brecha", archivo: "control.html" },
    migas: [t({ es: "Brecha", en: "Gap" }), t({ es: "Por control", en: "By control" }), dato(CONTROL.id)],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter, segundo tramo: la página de la mirada 1 rehecha con la interfaz nueva. Es un adelanto de la vista por control, que se termina en la mirada 5. Datos sintéticos.",
        en: "Review 4-ter, second stretch: the review 1 page rebuilt with the new interface. It previews the control view, finished in review 5. Synthetic data.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Aviso del control", en: "Control notice" },
        hacer: { es: "Léelo sin fijarte en el color", en: "Read it without relying on color" },
        ver: { es: "«Con fallas» se reconoce por el cuadrado con aspa y por el texto, y dice cuánto lleva vencido", en: "“Has failures” is recognizable by the crossed square and by the label, and says how long it has been overdue" },
      },
      {
        donde: { es: "Tabla de pruebas", en: "Test table" },
        hacer: { es: "Recorre una fila de izquierda a derecha", en: "Follow one row from left to right" },
        ver: { es: "Qué verifica, qué dio, qué hallazgo dejó abierto y con qué evidencia firmada", en: "What it verifies, what it gave, which finding it left open and with what signed evidence" },
      },
      {
        donde: { es: "Cadena de cierre", en: "Closure chain" },
        hacer: { es: "Compara los dos hallazgos", en: "Compare the two findings" },
        ver: { es: "Uno cerrado por re-prueba y otro abierto con sus pasos pendientes en línea punteada", en: "One closed by retest and one open with its pending steps on a dashed line" },
      },
      {
        donde: { es: "Botón de tema, arriba", en: "Theme button, top" },
        hacer: { es: "Pasa de oscuro a claro", en: "Go from dark to light" },
        ver: { es: "Los dos temas igual de cuidados", en: "Both themes equally finished" },
      },
    ],
  });
}
