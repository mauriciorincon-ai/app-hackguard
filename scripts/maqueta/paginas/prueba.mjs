// prueba.html — pantalla 3 (C1, C6). La ficha de una prueba: qué verifica, por qué importa, resultado
// esperado, regla de veredicto con k y su cota, configuración del arnés, marco con versión, controles,
// cuándo aplica y fuentes. La maqueta abre siempre PR-IA-PINJ-001.
import { CONTROLES, FAMILIAS, FICHA, HERRAMIENTAS, MADUREZ, MARCOS, PRUEBAS } from "../datos/catalogo.mjs";
import { cotaPorCiento, vigencia } from "../nucleo/calculos.mjs";
import { dato, dias, estado, firma, sello } from "../nucleo/componentes.mjs";
import { VIGENCIA } from "../nucleo/estados.mjs";
import { neutro, t } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const par = (rotulo, valor) => `<div><dt>${t(rotulo)}</dt><dd>${valor}</dd></div>`;

function fechado(clase, desde, consulta, umbrales, rotulo) {
  const v = vigencia(desde, consulta, umbrales);
  return `<span data-fechado="${clase}" data-desde="${desde}" data-dias="${v.dias}" data-estado-fechado="${v.estado}">${estado(VIGENCIA[v.estado])} <span class="hg-menor">· ${t(rotulo)} <span data-frase-dias>${t(dias(v.dias))}</span></span></span>`;
}

export function prueba({ consulta, umbrales, existentes }) {
  const p = PRUEBAS.find((x) => x.id === FICHA.id);
  const marco = MARCOS[p.marco];
  const herramienta = HERRAMIENTAS[p.herramienta];
  const verificada = { es: "verificada", en: "verified" };

  const resumen = `<dl class="hg-ficha">
${par({ es: "Vigencia", en: "Freshness" }, fechado("vigencia", p.verificada, consulta, umbrales, verificada))}
${par({ es: "Familia", en: "Family" }, t(FAMILIAS[p.familia]))}
${par({ es: "Madurez", en: "Maturity" }, t(MADUREZ[p.madurez]))}
${par({ es: "Prioridad base", en: "Base priority" }, `${neutro(String(FICHA.prioridad_base))} <span class="hg-menor">${t({ es: "de 5", en: "of 5" })}</span>`)}
${par({ es: "Aprobación", en: "Approval" }, firma(p.verificada))}
</dl>`;

  const veredicto = `<dl class="hg-ficha">
${par({ es: "Regla", en: "Rule" }, dato(FICHA.criterio.id))}
${par({ es: "Repeticiones", en: "Repetitions" }, `${dato(`k = ${p.k}`)}<p class="hg-menor">${t({
    es: `Con 0 fallas en ${p.k}, la tasa real de fallo queda por debajo del ${cotaPorCiento(p.k)} %.`,
    en: `With 0 failures in ${p.k}, the real failure rate stays below ${cotaPorCiento(p.k)}%.`,
  })}</p>`)}
${par({ es: "Asimetría", en: "Asymmetry" }, `<p>${t(FICHA.criterio.asimetria)}</p>`)}
${par({ es: "Si no corrió", en: "If it did not run" }, `<p>${t({
    es: "Sin evidencia de ejecución el veredicto es «no ejecutada», nunca «superada».",
    en: "Without evidence that it ran, the verdict is “not run”, never “passed”.",
  })}</p>`)}
</dl>`;

  const arnes = `<dl class="hg-ficha">
${par({ es: "Herramienta", en: "Tool" }, `${neutro(herramienta.nombre)} <span class="hg-menor">· ${neutro(herramienta.licencia)}</span><p>${fechado("vigencia", herramienta.verificada, consulta, umbrales, verificada)}</p>`)}
${par({ es: "Versión mínima", en: "Minimum version" }, dato(FICHA.arnes.version_minima))}
${par({ es: "Selector", en: "Selector" }, dato(FICHA.arnes.selector))}
${par({ es: "Detectores", en: "Detectors" }, `${dato(FICHA.arnes.detectores)}<p class="hg-menor">${t(FICHA.arnes.agregacion)}</p>`)}
</dl>`;

  const marcoHtml = `<dl class="hg-ficha">
${par({ es: "Marco", en: "Framework" }, `${neutro(`${marco.nombre} · ${marco.version}`)}<p>${fechado("vigencia", marco.verificada, consulta, umbrales, { es: "verificado", en: "verified" })}</p>`)}
${par({ es: "Referencia", en: "Reference" }, dato(p.ref))}
${p.controles.map((c) => par({ es: "Control", en: "Control" }, `${dato(c)}<p>${t(CONTROLES[c])}</p>`)).join("\n")}
</dl>`;

  const fuentes = `<dl class="hg-ficha">
${FICHA.fuentes
  .map((f) => par({ es: "Fuente", en: "Source" }, `${neutro(f.nombre)} <span class="hg-menor">· ${neutro(f.donde)}</span><p>${fechado("vigencia", f.verificada, consulta, umbrales, verificada)}</p>`))
  .join("\n")}
</dl>`;

  const contenido = `<div data-si="datos">
<div class="hg-encabezado">
<div>
<p>${dato(p.id)}</p>
<h1>${t(p.nombre)}</h1>
<p class="hg-entrada">${t(p.que_verifica)}</p>
</div>
${resumen}
</div>

<section class="hg-seccion" aria-labelledby="importa">
<h2 id="importa">${t({ es: "Por qué importa", en: "Why it matters" })}</h2>
<p>${t(FICHA.por_que_importa)}</p>
</section>

<section class="hg-seccion" aria-labelledby="esperado">
<h2 id="esperado">${t({ es: "Resultado esperado y veredicto", en: "Expected result and verdict" })}</h2>
<p class="hg-destacado">${t(FICHA.resultado_esperado)}</p>
${veredicto}
</section>

<section class="hg-seccion" aria-labelledby="arnes">
<h2 id="arnes">${t({ es: "Configuración de la corrida", en: "Run configuration" })}</h2>
<p class="hg-intro">${t({
    es: "La configuración es parte del resultado esperado: la re-prueba de un hallazgo usa esta misma y al menos el mismo k.",
    en: "The configuration is part of the expected result: retesting a finding uses this same one and at least the same k.",
  })}</p>
${arnes}
</section>

<section class="hg-seccion" aria-labelledby="marco">
<h2 id="marco">${t({ es: "Marco y controles", en: "Framework and controls" })}</h2>
${marcoHtml}
</section>

<section class="hg-seccion" aria-labelledby="aplica">
<h2 id="aplica">${t({ es: "Cuándo aplica", en: "When it applies" })}</h2>
<ul class="hg-lista">${FICHA.aplicabilidad.map((a) => `<li>${t(a)}</li>`).join("")}</ul>
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
        es: "Mirada 2. La ficha de una prueba. La maqueta abre siempre esta, sea cual sea la fila del catálogo.",
        en: "Review 2. A test record. The mockup always opens this one, whichever catalog row you press.",
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
        ver: { es: "El resultado esperado destaca; k, su cota y la asimetría se entienden sin fórmulas", en: "The expected result stands out; k, its bound and the asymmetry are clear without formulas" },
      },
      {
        donde: { es: "4. Marco y controles", en: "4. Framework and controls" },
        hacer: { es: "Mira la vigencia del marco", en: "Look at the framework's freshness" },
        ver: { es: "El marco está «por revisar» aunque la prueba esté vigente: son dos relojes distintos", en: "The framework is “review due” while the test is current: two separate clocks" },
      },
      {
        donde: { es: "Toda la ficha", en: "The whole record" },
        hacer: { es: "Busca cualquier instrucción de cómo atacar", en: "Look for any instruction on how to attack" },
        ver: { es: "No hay ninguna: solo qué se verifica, con qué y qué se espera", en: "There is none: only what is verified, with what and what is expected" },
      },
    ],
  });
}
