// prueba-<id>.html — pantalla 3 (C1, C6). La ficha de una prueba: qué verifica, por qué importa,
// resultado esperado, regla de veredicto con k y su cota, configuración de la corrida, marco con versión,
// controles, cuándo aplica y fuentes. Hay UNA PÁGINA POR PRUEBA del catálogo: cada fila abre la suya, con
// su vigencia, su regla y sus avisos (por revisar, vencida, marcada para revisión, sin control).
import { CONTROLES, FAMILIAS, HERRAMIENTAS, MADUREZ, MARCOS, REGLAS, fichaDe } from "../datos/catalogo.mjs";
import { cotaPorCiento, vigencia } from "../nucleo/calculos.mjs";
import { dato, dias, estado, firma, sello } from "../nucleo/componentes.mjs";
import { VIGENCIA } from "../nucleo/estados.mjs";
import { neutro, t } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const SIN_CONTROL = { rol: "atencion", simbolo: "aviso", nombre: { es: "Sin control asignado", en: "No control assigned" } };
const SIN_EJECUCION = {
  es: "Sin evidencia de ejecución el veredicto es «no ejecutada», nunca «superada».",
  en: "Without evidence that it ran, the verdict is “not run”, never “passed”.",
};
const VERIFICADA = { es: "verificada", en: "verified" };
const VERIFICADO = { es: "verificado", en: "verified" };

const par = (rotulo, valor) => `<div><dt>${t(rotulo)}</dt><dd>${valor}</dd></div>`;
const nombreDe = (h) => (typeof h.nombre === "string" ? neutro(h.nombre) : t(h.nombre));

function fechado(clase, desde, consulta, umbrales, rotulo) {
  const v = vigencia(desde, consulta, umbrales);
  return `<span data-fechado="${clase}" data-desde="${desde}" data-dias="${v.dias}" data-estado-fechado="${v.estado}">${estado(VIGENCIA[v.estado])} <span class="hg-menor">· ${t(rotulo)} <span data-frase-dias>${t(dias(v.dias))}</span></span></span>`;
}

// Los avisos de la ficha dicen el UMBRAL, no los días transcurridos: la cifra que envejece vive en un
// solo lugar (la fila «Vigencia» del encabezado), que es la que vigila la matriz de envejecimiento.
function avisos(p, estadoDeVigencia, umbrales) {
  const { por_revisar, vencido } = umbrales.vigencia;
  const lista = [];
  if (estadoDeVigencia === "vencido") {
    lista.push(
      sello(
        { rol: "falla", simbolo: "falla", nombre: { es: "Verificación vencida", en: "Verification overdue" } },
        `<p>${t({
          es: `Pasaron más de ${vencido} días sin que nadie la verifique de nuevo. Su marco o su herramienta pueden haber cambiado: pide al investigador que la revise contra sus fuentes y aprueba lo que proponga.`,
          en: `More than ${vencido} days have passed without anyone verifying it again. Its framework or its tool may have changed: ask the researcher to check it against its sources and approve what it proposes.`,
        })}</p>`,
        'data-aviso-de-vigencia="vencido"',
      ),
    );
  }
  if (estadoDeVigencia === "por_revisar") {
    lista.push(
      sello(
        { rol: "atencion", simbolo: "aviso", nombre: { es: "Toca revisarla", en: "Review is due" } },
        `<p>${t({
          es: `Pasaron más de ${por_revisar} días desde su última verificación. Sigue siendo válida; a los ${vencido} días queda vencida.`,
          en: `More than ${por_revisar} days have passed since it was last verified. It is still valid; at ${vencido} days it becomes overdue.`,
        })}</p>`,
        'data-aviso-de-vigencia="por_revisar"',
      ),
    );
  }
  if (p.revision === "marcada_para_revision") {
    lista.push(
      sello(
        { rol: "atencion", simbolo: "aviso", nombre: { es: "Marcada para revisión de contenido", en: "Flagged for content review" } },
        `<p>${t({
          es: "El filtro de contenido encontró en esta ficha un patrón que pide revisión. El filtro marca, no rechaza: una persona decide si la ficha se queda, se corrige o se retira.",
          en: "The content filter found a pattern in this record that calls for review. The filter flags, it does not reject: a person decides whether the record stays, is corrected or is retired.",
        })}</p>`,
        "data-aviso-de-contenido",
      ),
    );
  }
  return lista.length ? `<div class="hg-avisos">${lista.join("\n")}</div>` : "";
}

/** Devuelve el generador de la ficha de UNA prueba. */
export const prueba = (id) => ({ consulta, umbrales, existentes }) => {
  const p = fichaDe(id);
  const marco = MARCOS[p.marco];
  const herramienta = HERRAMIENTAS[p.herramienta];
  const regla = REGLAS[p.regla];
  const v = vigencia(p.verificada, consulta, umbrales);

  const resumen = `<dl class="hg-ficha">
${par({ es: "Vigencia", en: "Freshness" }, fechado("vigencia", p.verificada, consulta, umbrales, VERIFICADA))}
${par({ es: "Familia", en: "Family" }, t(FAMILIAS[p.familia]))}
${par({ es: "Madurez", en: "Maturity" }, t(MADUREZ[p.madurez]))}
${par({ es: "Prioridad base", en: "Base priority" }, `${neutro(String(p.prioridad_base))} <span class="hg-menor">${t({ es: "de 5", en: "of 5" })}</span>`)}
${par({ es: "Aprobación", en: "Approval" }, firma(p.verificada))}
</dl>`;

  const repeticiones = !p.k
    ? `${t({ es: "Determinista", en: "Deterministic" })}<p class="hg-menor">${t({
        es: "La misma entrada da el mismo resultado: una corrida basta.",
        en: "The same input gives the same result: one run is enough.",
      })}</p>`
    : `${dato(`k = ${p.k}`)}<p class="hg-menor">${t(
        regla.cota
          ? {
              es: `Con 0 fallas en ${p.k}, la tasa real de fallo queda por debajo del ${cotaPorCiento(p.k)} %.`,
              en: `With 0 failures in ${p.k}, the real failure rate stays below ${cotaPorCiento(p.k)}%.`,
            }
          : {
              es: "Repeticiones idénticas, con la misma configuración, para medir cuánto cambia el modelo por sí solo.",
              en: "Identical repetitions, with the same configuration, to measure how much the model changes on its own.",
            },
      )}</p>`;

  const veredicto = `<dl class="hg-ficha">
${par({ es: "Regla", en: "Rule" }, dato(p.regla))}
${par({ es: "Repeticiones", en: "Repetitions" }, repeticiones)}
${par({ es: "Cómo decide", en: "How it decides" }, `<p>${t(regla.decide)}</p>`)}
${par({ es: "Si no corrió", en: "If it did not run" }, `<p>${t(regla.sin_ejecucion ?? SIN_EJECUCION)}</p>`)}
</dl>`;

  const via = herramienta.adaptador
    ? { es: "Adaptador: el resultado se lee del archivo que produce la herramienta.", en: "Adapter: the result is read from the file the tool produces." }
    : { es: "Texto pegado o carga manual: esta herramienta no tiene adaptador.", en: "Pasted text or manual entry: this tool has no adapter." };
  const arnes = `<dl class="hg-ficha">
${par({ es: "Herramienta", en: "Tool" }, `${nombreDe(herramienta)}${herramienta.licencia === "—" ? "" : ` <span class="hg-menor">· ${neutro(herramienta.licencia)}</span>`}<p>${fechado("vigencia", herramienta.verificada, consulta, umbrales, VERIFICADA)}</p>`)}
${par({ es: "Vía de carga", en: "Intake route" }, `<p>${t(via)}</p>`)}
${herramienta.version_minima ? par({ es: "Versión mínima", en: "Minimum version" }, dato(herramienta.version_minima)) : ""}
${par(
  { es: "Selector", en: "Selector" },
  p.selector
    ? dato(p.selector)
    : `<p class="hg-menor">${t({ es: "Lo fija el paquete de ejecución de cada plan.", en: "Set by each plan's execution package." })}</p>`,
)}
${p.detectores ? par({ es: "Detectores", en: "Detectors" }, `${dato(p.detectores)}<p class="hg-menor">${t(p.agregacion)}</p>`) : ""}
</dl>`;

  const controles = p.controles.length
    ? p.controles.map((c) => par({ es: "Control", en: "Control" }, `${dato(c)}<p>${t(CONTROLES[c])}</p>`)).join("\n")
    : par(
        { es: "Control", en: "Control" },
        `${estado(SIN_CONTROL)}<p class="hg-menor">${t({
          es: "Todavía no da evidencia a ningún control. Queda a la vista como deuda hasta que una persona se lo asigne.",
          en: "It does not yet give evidence to any control. It stays visible as a debt until a person assigns one.",
        })}</p>`,
      );
  const marcoHtml = `<dl class="hg-ficha">
${par({ es: "Marco", en: "Framework" }, `${neutro(`${marco.nombre} · ${marco.version}`)}<p>${fechado("vigencia", marco.verificada, consulta, umbrales, VERIFICADO)}</p>`)}
${par({ es: "Referencia", en: "Reference" }, dato(p.ref))}
${controles}
</dl>`;

  // Las fuentes salen del marco y de la herramienta de la prueba: cada una con su propio reloj.
  const fuentesDe = [
    { nombre: neutro(`${marco.nombre} ${marco.version} · ${p.ref}`), donde: neutro(marco.editor), verificada: marco.verificada },
    ...(p.herramienta === "propia"
      ? []
      : [{ nombre: nombreDe(herramienta), donde: t({ es: "documentación oficial", en: "official documentation" }), verificada: herramienta.verificada }]),
  ];
  const fuentes = `<dl class="hg-ficha">
${fuentesDe
  .map((f) => par({ es: "Fuente", en: "Source" }, `${f.nombre} <span class="hg-menor">· ${f.donde}</span><p>${fechado("vigencia", f.verificada, consulta, umbrales, VERIFICADA)}</p>`))
  .join("\n")}
</dl>`;

  const contenido = `<div data-si="datos" data-ficha-de="${p.id}" data-ficha-vigencia="${v.estado}">
<div class="hg-encabezado">
<div>
<p>${dato(p.id)}</p>
<h1>${t(p.nombre)}</h1>
<p class="hg-entrada">${t(p.que_verifica)}</p>
</div>
${resumen}
</div>
${avisos(p, v.estado, umbrales)}

<section class="hg-seccion" aria-labelledby="importa">
<h2 id="importa">${t({ es: "Por qué importa", en: "Why it matters" })}</h2>
<p>${t(p.por_que_importa)}</p>
</section>

<section class="hg-seccion" aria-labelledby="esperado">
<h2 id="esperado">${t({ es: "Resultado esperado y veredicto", en: "Expected result and verdict" })}</h2>
<p class="hg-destacado">${t(p.resultado_esperado)}</p>
${veredicto}
</section>

<section class="hg-seccion" aria-labelledby="arnes">
<h2 id="arnes">${t({ es: "Configuración de la corrida", en: "Run configuration" })}</h2>
<p class="hg-intro">${t(
    p.k
      ? {
          es: "La configuración es parte del resultado esperado: la re-prueba de un hallazgo usa esta misma y al menos el mismo k.",
          en: "The configuration is part of the expected result: retesting a finding uses this same one and at least the same k.",
        }
      : {
          es: "La configuración es parte del resultado esperado: la re-prueba de un hallazgo usa esta misma.",
          en: "The configuration is part of the expected result: retesting a finding uses this same one.",
        },
  )}</p>
${arnes}
</section>

<section class="hg-seccion" aria-labelledby="marco">
<h2 id="marco">${t({ es: "Marco y controles", en: "Framework and controls" })}</h2>
${marcoHtml}
</section>

<section class="hg-seccion" aria-labelledby="aplica">
<h2 id="aplica">${t({ es: "Cuándo aplica", en: "When it applies" })}</h2>
<ul class="hg-lista">${p.aplicabilidad.map((a) => `<li>${t(a)}</li>`).join("")}</ul>
</section>

<section class="hg-seccion" aria-labelledby="fuentes">
<h2 id="fuentes">${t({ es: "Fuentes", en: "Sources" })}</h2>
<p class="hg-intro">${t({
    es: "El código comprobó que cada fuente existe y que dice lo que aquí se cita.",
    en: "Code checked that each source exists and says what is cited here.",
  })}</p>
${fuentes}
</section>
</div>

<div class="hg-aviso" data-si="vacio">
<h2>${t({ es: "Esta prueba ya no está en el catálogo", en: "This test is no longer in the catalog" })}</h2>
<p>${t({
    es: "Se retiró en una instantánea posterior. Los hallazgos que la citan siguen apuntando a la versión en que existía.",
    en: "It was retired in a later snapshot. Findings that cite it still point to the version in which it existed.",
  })}</p>
<p><a href="catalogo.html">${t({ es: "Volver al catálogo", en: "Back to the catalog" })}</a></p>
</div>

<div class="hg-aviso" data-si="carga">
<h2>${t({ es: "Abriendo la ficha", en: "Opening the record" })}</h2>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<div class="hg-aviso" data-si="error">
<h2>${t({ es: "No se pudo abrir la ficha", en: "The record could not be opened" })}</h2>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "La prueba no pasa su esquema", en: "The test does not pass its schema" } },
  `<p>${t({
    es: "Le falta el resultado esperado. Una prueba incompleta no se muestra ni se planea: complétala en su archivo y vuelve a cargar el catálogo.",
    en: "It has no expected result. An incomplete test is neither shown nor planned: complete it in its file and load the catalog again.",
  })}</p>`,
)}
</div>`;

  return pagina({
    titulo: { es: `HackGuard · ${p.id}`, en: `HackGuard · ${p.id}` },
    seccion: { id: "catalogo", archivo: "catalogo.html" },
    existentes,
    sala: {
      nota: {
        es: "Mirada 2. La ficha de esta prueba: cada fila del catálogo abre la suya, con su propio estado.",
        en: "Review 2. This test's record: each catalog row opens its own, with its own status.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Encabezado", en: "Header" },
        hacer: { es: "Lee el título y la frase de abajo", en: "Read the title and the sentence below it" },
        ver: { es: "En tres segundos sabes qué verifica esta prueba", en: "In three seconds you know what this test verifies" },
      },
      {
        donde: { es: "2. Resultado esperado y veredicto", en: "2. Expected result and verdict" },
        hacer: { es: "Lee la frase destacada y la tabla", en: "Read the highlighted sentence and the table" },
        ver: { es: "El resultado esperado destaca; cómo se decide el veredicto y qué pasa si no corrió se entienden sin fórmulas", en: "The expected result stands out; how the verdict is decided and what happens if it did not run are clear without formulas" },
      },
      {
        donde: { es: "Bajo el encabezado", en: "Below the header" },
        hacer: { es: "Abre desde el catálogo una prueba vencida y una vigente", en: "From the catalog, open an overdue test and a current one" },
        ver: { es: "La vencida y la que toca revisar lo dicen en un sello; la vigente no lleva sello", en: "The overdue one and the one due for review say so in a seal; the current one has no seal" },
      },
      {
        donde: { es: "3 y 4. Herramienta y marco", en: "3 and 4. Tool and framework" },
        hacer: { es: "Compara sus vigencias con la de la prueba", en: "Compare their freshness with the test's" },
        ver: { es: "La prueba, su herramienta y su marco llevan cada uno su propio reloj", en: "The test, its tool and its framework each keep their own clock" },
      },
      {
        donde: { es: "Toda la ficha", en: "The whole record" },
        hacer: { es: "Busca cualquier instrucción de cómo atacar", en: "Look for any instruction on how to attack" },
        ver: { es: "No hay ninguna: solo qué se verifica, con qué y qué se espera", en: "There is none: only what is verified, with what and what is expected" },
      },
    ],
  });
};
