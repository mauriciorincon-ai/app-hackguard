// kit.html — la hoja de componentes del sistema de diseño (mirada 2): cada token y cada componente
// canon de design-system.md, dibujado con la misma hoja que usan las pantallas.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { celda, dato, estado, firma, huella, sello } from "../nucleo/componentes.mjs";
import { CONFIRMACION, ESTADO_DE_CONTROL, SEVERIDAD, VEREDICTO, VIGENCIA } from "../nucleo/estados.mjs";
import { atributo, neutro, t } from "../nucleo/html.mjs";
import { pagina } from "../nucleo/pagina.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";
import { MAQUETA } from "../rutas.mjs";

const USO = {
  fondo: { es: "Fondo de la página", en: "Page background" },
  superficie: { es: "Campos y menús", en: "Fields and menus" },
  "superficie-2": { es: "Hundido, hover", en: "Inset, hover" },
  linea: { es: "Separador de filas", en: "Row separator" },
  "linea-fuerte": { es: "Borde de controles", en: "Control border" },
  tinta: { es: "Texto principal", en: "Main text" },
  "tinta-2": { es: "Texto secundario", en: "Secondary text" },
  acento: { es: "La mano humana", en: "The human hand" },
  "acento-tinte": { es: "Fondo de lo firmado", en: "Signed background" },
  positivo: { es: "Bien", en: "Good" },
  "positivo-tinte": { es: "Sello positivo", en: "Positive seal" },
  atencion: { es: "Atención", en: "Attention" },
  "atencion-tinte": { es: "Sello de atención", en: "Attention seal" },
  falla: { es: "Falla", en: "Failure" },
  "falla-tinte": { es: "Sello de falla", en: "Failure seal" },
  neutro: { es: "Ausente", en: "Absent" },
  "neutro-tinte": { es: "Sello neutro", en: "Neutral seal" },
};

const seccion = (id, titulo, cuerpo, entrada) =>
  `<section class="hg-seccion" aria-labelledby="${id}"><h2 id="${id}">${t(titulo)}</h2>${entrada ? `<p class="hg-intro">${t(entrada)}</p>` : ""}${cuerpo}</section>`;

const grupo = (titulo, mapa) =>
  `<div><h3>${t(titulo)}</h3><ul>${Object.values(mapa)
    .map((e) => `<li>${estado(e)}</li>`)
    .join("")}</ul></div>`;

export function kit({ existentes }) {
  const tokens = JSON.parse(readFileSync(join(MAQUETA, "assets", "tokens.json"), "utf8"));

  const colores = `<ul class="hg-muestras">${Object.keys(tokens.oscuro)
    .map(
      (nombre) =>
        `<li><span class="hg-muestra-color" style="background: var(--${nombre})"></span><p>${dato(`--${nombre}`)}</p><p class="hg-menor">${t(USO[nombre])}</p><p class="hg-menor"><span data-si-tema="oscuro">${neutro(tokens.oscuro[nombre])}</span><span data-si-tema="claro">${neutro(tokens.claro[nombre])}</span></p></li>`,
    )
    .join("")}</ul>`;

  const tipografia = `<div class="hg-escala">
<div><p class="hg-menor">${t({ es: "Título 1 · Source Serif 4 · 600", en: "Heading 1 · Source Serif 4 · 600" })}</p><p class="hg-cifra">${t({ es: "Un hallazgo es evidencia de que un control falla", en: "A finding is evidence that a control fails" })}</p></div>
<div><p class="hg-menor">${t({ es: "Título 2 · Source Serif 4 · 600", en: "Heading 2 · Source Serif 4 · 600" })}</p><h3 class="hg-titulo-2">${t({ es: "Pruebas que cubren este control", en: "Tests that cover this control" })}</h3></div>
<div><p class="hg-menor">${t({ es: "Texto · Atkinson Hyperlegible Next · 16", en: "Body · Atkinson Hyperlegible Next · 16" })}</p><p>${t({
    es: "El asistente no obedece instrucciones que llegan dentro del contenido que procesa.",
    en: "The assistant does not follow instructions that arrive inside the content it processes.",
  })}</p></div>
<div><p class="hg-menor">${t({ es: "Texto menor · 15, el mínimo de lectura", en: "Small text · 15, the reading minimum" })}</p><p class="hg-menor">${t({ es: "Verificada hace 12 días", en: "Verified 12 days ago" })}</p></div>
<div><p class="hg-menor">${t({ es: "Dato · Atkinson Hyperlegible Mono · 15", en: "Data · Atkinson Hyperlegible Mono · 15" })}</p><p>${dato("PR-IA-PINJ-001 · 2026-09-24 · O0 Il1")}</p></div>
</div>`;

  const estados = `<div class="hg-vocabulario">
${grupo({ es: "Veredicto", en: "Verdict" }, VEREDICTO)}
${grupo({ es: "Estado de un control", en: "Control status" }, ESTADO_DE_CONTROL)}
${grupo({ es: "Severidad", en: "Severity" }, SEVERIDAD)}
${grupo({ es: "Vigencia y confirmación", en: "Freshness and confirmation" }, { ...VIGENCIA, ...CONFIRMACION })}
</div>
<div class="hg-pila hg-espaciado">
${sello(ESTADO_DE_CONTROL.con_evidencia_vigente, `<p>${t({ es: "Sello positivo: tinte, borde sólido, barra lateral y visto en círculo relleno.", en: "Positive seal: tint, solid border, side bar and a check in a filled circle." })}</p>`)}
${sello(ESTADO_DE_CONTROL.evidencia_antigua, `<p>${t({ es: "Sello de atención.", en: "Attention seal." })}</p>`)}
${sello(ESTADO_DE_CONTROL.con_fallas, `<p>${t({ es: "Sello de falla.", en: "Failure seal." })}</p>`)}
${sello(ESTADO_DE_CONTROL.sin_evidencia, `<p>${t({ es: "Sello neutro.", en: "Neutral seal." })}</p>`)}
</div>`;

  const controles = `<div class="hg-pila">
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Botones de muestra", en: "Sample buttons" })}>
<button type="button" class="hg-boton" data-controlador="alternar" aria-pressed="false">${t({ es: "Botón", en: "Button" })}</button>
<button type="button" class="hg-boton" data-controlador="alternar" aria-pressed="true">${t({ es: "Botón activo", en: "Active button" })}</button>
</div>
<div class="hg-campos">
<label class="hg-campo" for="muestra-lista"><span>${t({ es: "Lista", en: "List" })}</span><select id="muestra-lista" data-controlador="filtro" data-campo="muestra"><option value="" data-es="Todos" data-en="All">Todos</option><option value="vigente" data-es="Vigente" data-en="Current">Vigente</option><option value="vencido" data-es="Vencido" data-en="Overdue">Vencido</option></select></label>
</div>
<p><a href="catalogo.html">${t({ es: "Un enlace va en tinta azul y subrayado", en: "A link is blue ink and underlined" })}</a></p>
</div>`;

  const libro = `<ul class="hg-cifras" ${atributo("aria-label", { es: "Cifras de muestra", en: "Sample figures" })}>
<li><span class="hg-cifra" data-neutro>14</span>${estado(VIGENCIA.vigente)}</li>
<li><span class="hg-cifra" data-neutro>5</span>${estado(VIGENCIA.por_revisar)}</li>
<li><span class="hg-cifra" data-neutro>2</span>${estado(VIGENCIA.vencido)}</li>
<li><span class="hg-cifra" data-neutro>7</span>${estado({ rol: "atencion", simbolo: "aviso", nombre: { es: "Sin control asignado", en: "No control assigned" } })}</li>
</ul>
<div class="hg-libro-cab hg-espaciado" aria-hidden="true"><span>${t({ es: "Prueba", en: "Test" })}</span><span>${t({ es: "Qué verifica", en: "What it verifies" })}</span><span>${t({ es: "Resultado", en: "Result" })}</span><span>${t({ es: "Evidencia", en: "Evidence" })}</span><span>${t({ es: "Huella y confirmación", en: "Fingerprint and confirmation" })}</span></div>
<ul class="hg-libro">
<li><dl class="hg-fila">
${celda({ es: "Prueba", en: "Test" }, `<p>${dato("PR-IA-PINJ-001")}</p>`)}
${celda({ es: "Qué verifica", en: "What it verifies" }, `<p>${t({ es: "El asistente no obedece instrucciones que llegan dentro del contenido que procesa.", en: "The assistant does not follow instructions that arrive inside the content it processes." })}</p>`)}
${celda({ es: "Resultado", en: "Result" }, `<p>${estado(VEREDICTO.superada)}</p>`)}
${celda({ es: "Evidencia", en: "Evidence" }, `<p>${dato("SOB-0027")} ${dato("2026-09-24")}</p>`)}
${celda({ es: "Huella y confirmación", en: "Fingerprint and confirmation" }, `<p>${huella("sha256:4b3d7683a1c0e9f2d5bd")}</p><p>${firma("2026-09-24")}</p>`)}
</dl></li>
<li><dl class="hg-fila">
${celda({ es: "Prueba", en: "Test" }, `<p>${dato("PR-MD-PAR-001")}</p>`)}
${celda({ es: "Qué verifica", en: "What it verifies" }, `<p>${t({ es: "El clasificador decide lo mismo ante el mismo caso en español y en inglés.", en: "The classifier makes the same decision for the same case in Spanish and in English." })}</p>`)}
${celda({ es: "Resultado", en: "Result" }, `<p>${estado(VEREDICTO.no_ejecutada)}</p>`)}
${celda({ es: "Evidencia", en: "Evidence" }, `<p class="hg-menor">${t({ es: "Sin sobre de evidencia.", en: "No evidence envelope." })}</p>`)}
${celda({ es: "Huella y confirmación", en: "Fingerprint and confirmation" }, `<p class="hg-menor">${t({ es: "Nada que firmar todavía.", en: "Nothing to sign yet." })}</p>`)}
</dl></li>
</ul>`;

  const ficha = `<dl class="hg-ficha">
<div><dt>${t({ es: "Regla", en: "Rule" })}</dt><dd>${dato("tasa-de-fallo/v1")}</dd></div>
<div><dt>${t({ es: "Repeticiones", en: "Repetitions" })}</dt><dd>${dato("k = 20")}</dd></div>
</dl>
<p class="hg-destacado">${t({ es: "El texto destacado dice lo único que no puede perderse.", en: "Highlighted text says the one thing that must not be missed." })}</p>`;

  const cadena = `<ol class="hg-cadena hg-espaciado">
<li class="hg-eslabon es-falla">${SIMBOLO.falla}<span class="hg-eslabon-titulo">${t({ es: "Hallazgo abierto", en: "Finding opened" })}</span><p>${dato("2026-08-18")}</p></li>
<li class="hg-eslabon es-acento">${SIMBOLO.firma}<span class="hg-eslabon-titulo">${t({ es: "Corrección declarada", en: "Fix declared" })}</span><p>${dato("2026-09-10")}</p></li>
<li class="hg-eslabon es-positivo">${SIMBOLO.ok}<span class="hg-eslabon-titulo">${t({ es: "Re-prueba superada", en: "Retest passed" })}</span><p>${dato("2026-09-24")}</p></li>
<li class="hg-eslabon es-pendiente">${SIMBOLO.vacio}<span class="hg-eslabon-titulo">${t({ es: "Sin cerrar", en: "Not closed" })}</span></li>
</ol>`;

  const avisos = `<div class="hg-aviso">
<h3 class="hg-titulo-2">${t({ es: "Todavía no hay nada aquí", en: "Nothing here yet" })}</h3>
<p>${t({ es: "Un aviso de pantalla dice qué pasa y qué hacer. Vacío, carga y error tienen cada uno el suyo.", en: "A screen notice says what is happening and what to do. Empty, loading and error each have their own." })}</p>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>`;

  const contenido = `<h1>${t({ es: "Kit de componentes", en: "Component kit" })}</h1>
<p class="hg-entrada">${t({
    es: "Cada token y cada componente del sistema de diseño, dibujado con la misma hoja que usan las pantallas.",
    en: "Every token and component of the design system, drawn with the same stylesheet the screens use.",
  })}</p>
${seccion("color", { es: "Color", en: "Color" }, colores, { es: "Papel y tinta, un solo acento y cuatro papeles de estado. Cambia de tema para ver el otro juego.", en: "Paper and ink, a single accent and four status roles. Switch theme to see the other set." })}
${seccion("tipografia", { es: "Tipografía", en: "Typography" }, tipografia)}
${seccion("estados", { es: "Estados", en: "Statuses" }, estados, { es: "Una forma por papel. En línea para las filas; como sello cuando resume un objeto entero.", en: "One shape per role. Inline for rows; as a seal when it sums up a whole object." })}
${seccion("controles", { es: "Botones, listas y enlaces", en: "Buttons, lists and links" }, controles)}
${seccion("libro", { es: "Cifras y libro", en: "Figures and ledger" }, libro, { es: "Regla doble arriba, líneas finas entre filas y el identificador en su columna.", en: "Double rule on top, thin lines between rows and the identifier in its own column." })}
${seccion("ficha", { es: "Ficha y texto destacado", en: "Record sheet and highlighted text" }, ficha)}
${seccion("cadena", { es: "Cadena de cierre", en: "Closure chain" }, cadena)}
${seccion("avisos", { es: "Avisos de pantalla", en: "Screen notices" }, avisos)}`;

  return pagina({
    titulo: { es: "HackGuard · kit", en: "HackGuard · kit" },
    existentes,
    sala: {
      nota: {
        es: "Mirada 2. El kit: referencia de fidelidad para el primer sprint con pantallas. No es una pantalla del producto.",
        en: "Review 2. The kit: the fidelity reference for the first sprint with screens. It is not a product screen.",
      },
    },
    contenido,
    revisar: [
      {
        donde: { es: "1. Color", en: "1. Color" },
        hacer: { es: "Cambia de tema", en: "Switch theme" },
        ver: { es: "Las mismas muestras con su otro valor; ninguna se vuelve ilegible", en: "The same swatches with their other value; none becomes unreadable" },
      },
      {
        donde: { es: "2. Tipografía", en: "2. Typography" },
        hacer: { es: "Mira la línea de dato", en: "Look at the data line" },
        ver: { es: "El cero y la O, y la I, la l y el 1, no se confunden", en: "Zero and O, and I, l and 1, cannot be mistaken" },
      },
      {
        donde: { es: "3. Estados", en: "3. Statuses" },
        hacer: { es: "Compara los cuatro sellos", en: "Compare the four seals" },
        ver: { es: "Cada uno se reconoce por su marca aunque no distingas el color", en: "Each is recognizable by its mark even if you cannot tell the color" },
      },
    ],
  });
}
