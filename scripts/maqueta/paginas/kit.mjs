// kit.html — la hoja de componentes del sistema de diseño, dirección «consola» (mirada 4-ter): cada
// token y cada componente canon de design-system.md § 6, dibujado con la misma hoja que usan las
// pantallas. Es la referencia de fidelidad del primer sprint con UI; no es una pantalla del producto.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ESCALA_IA, IMPACTOS_DE_IA } from "../datos/mundo.mjs";
import { chip, dato, estado, firma, huella, lista, par, proporcion, sello } from "../nucleo/componentes.mjs";
import { CONFIRMACION, ESTADO_DE_CONTROL, ESTADO_DE_HALLAZGO, SEVERIDAD, VEREDICTO, VIGENCIA } from "../nucleo/estados.mjs";
import { atributo, neutro, t } from "../nucleo/html.mjs";
import { pagina } from "../nucleo/pagina.mjs";
import { desglose, ejecutadas } from "../nucleo/piezas-de-brecha.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";
import { MAQUETA } from "../rutas.mjs";

const USO = {
  fondo: { es: "Fondo de la aplicación", en: "Application background" },
  superficie: { es: "Paneles y barra lateral", en: "Panels and sidebar" },
  "superficie-2": { es: "Cabecera de tabla, hover", en: "Table header, hover" },
  linea: { es: "Separador de filas", en: "Row separator" },
  "linea-fuerte": { es: "Borde de controles", en: "Control border" },
  tinta: { es: "Texto principal", en: "Main text" },
  "tinta-2": { es: "Texto secundario", en: "Secondary text" },
  acento: { es: "La mano humana", en: "The human hand" },
  "acento-tinte": { es: "Fondo de lo elegido", en: "Chosen background" },
  positivo: { es: "Bien", en: "Good" },
  "positivo-tinte": { es: "Chip positivo", en: "Positive chip" },
  atencion: { es: "Atención", en: "Attention" },
  "atencion-tinte": { es: "Chip de atención", en: "Attention chip" },
  falla: { es: "Falla", en: "Failure" },
  "falla-tinte": { es: "Chip de falla", en: "Failure chip" },
  neutro: { es: "Ausente", en: "Absent" },
  "neutro-tinte": { es: "Chip neutro", en: "Neutral chip" },
};

const panel = (id, titulo, cuerpo, nota) =>
  `<section class="hg-panel" aria-labelledby="${id}"><div class="hg-panel-cab"><h2 id="${id}">${t(titulo)}</h2>${nota ? `<p class="hg-menor">${t(nota)}</p>` : ""}</div>${cuerpo}</section>`;

const grupo = (titulo, mapa) =>
  `<div><p class="hg-rotulo">${t(titulo)}</p><ul>${Object.values(mapa)
    .map((e) => `<li>${estado(e)}</li>`)
    .join("")}</ul></div>`;

/** Los paneles del kit, en su orden. kit.html los dibuja y el bundle de design-sync/ hace una tarjeta de cada uno. */
export function panelesDelKit() {
  const tokens = JSON.parse(readFileSync(join(MAQUETA, "assets", "tokens.json"), "utf8"));

  const colores = `<div class="hg-panel-cuerpo"><ul class="hg-muestras">${Object.keys(tokens.oscuro)
    .map(
      (nombre) =>
        `<li><span class="hg-muestra-color" style="background: var(--${nombre})"></span>${dato(`--${nombre}`)}<span class="hg-menor">${t(USO[nombre])}</span><span class="hg-menor"><span data-si-tema="oscuro">${neutro(tokens.oscuro[nombre])}</span><span data-si-tema="claro">${neutro(tokens.claro[nombre])}</span></span></li>`,
    )
    .join("")}</ul></div>`;

  const tipografia = `<div class="hg-panel-cuerpo"><div class="hg-escala">
<div><p class="hg-rotulo">${t({ es: "Título de página y cifras · 22 · 700", en: "Page title and figures · 22 · 700" })}</p><p class="hg-cifra">${t({ es: "Un hallazgo es evidencia de que un control falla", en: "A finding is evidence that a control fails" })}</p></div>
<div><p class="hg-rotulo">${t({ es: "Título destacado · 16 · 700", en: "Highlighted title · 16 · 700" })}</p><p class="hg-tarjeta-nombre">${t({ es: "Restricciones ante otra codificación", en: "Restrictions under another encoding" })}</p></div>
<div><p class="hg-rotulo">${t({ es: "Texto de interfaz · 14 · Atkinson Hyperlegible Next", en: "Interface text · 14 · Atkinson Hyperlegible Next" })}</p><p>${t({
    es: "El asistente no obedece instrucciones que llegan dentro del contenido que procesa.",
    en: "The assistant does not follow instructions that arrive inside the content it processes.",
  })}</p></div>
<div><p class="hg-rotulo">${t({ es: "Texto secundario · 13", en: "Secondary text · 13" })}</p><p class="hg-menor">${t({ es: "Verificada hace 12 días", en: "Verified 12 days ago" })}</p></div>
<div><p class="hg-rotulo">${t({ es: "Rótulo · 12 · versalitas", en: "Label · 12 · small caps" })}</p><p class="hg-rotulo">${t({ es: "Para confirmar", en: "To confirm" })}</p></div>
<div><p class="hg-rotulo">${t({ es: "Dato · 13 · Atkinson Hyperlegible Mono", en: "Data · 13 · Atkinson Hyperlegible Mono" })}</p><p>${dato("PR-IA-PINJ-001 · 2026-09-24 · O0 Il1")}</p></div>
</div></div>`;

  const estados = `<div class="hg-panel-cuerpo">
<p class="hg-menor">${t({
    es: "Tres pesos. En línea, lo que no es noticia. En chip, lo que decide algo en una fila o una cabecera. En sello, lo que hay que saber antes de seguir.",
    en: "Three weights. Inline, what is not news. As a chip, what decides something in a row or a header. As a seal, what must be known before going on.",
  })}</p>
<p class="hg-chips">${chip(VEREDICTO.fallida)}${chip(VEREDICTO.no_ejecutada)}${chip(VIGENCIA.por_revisar)}${chip(ESTADO_DE_HALLAZGO.corregido)}${chip(SEVERIDAD.alto)}${chip(CONFIRMACION.confirmada)}</p>
${sello(ESTADO_DE_CONTROL.con_fallas, `<p>${t({ es: "Sello: título, qué pasa y qué hacer. Uno por pantalla, como mucho dos.", en: "Seal: title, what is happening and what to do. One per screen, two at most." })}</p>`)}
</div>
<div class="hg-panel-cuerpo">
<div class="hg-vocabulario">
${grupo({ es: "Veredicto", en: "Verdict" }, VEREDICTO)}
${grupo({ es: "Estado de un control", en: "Control status" }, ESTADO_DE_CONTROL)}
${grupo({ es: "Severidad", en: "Severity" }, SEVERIDAD)}
${grupo({ es: "Vigencia y confirmación", en: "Freshness and confirmation" }, { ...VIGENCIA, ...CONFIRMACION })}
</div>
</div>`;

  const controles = `<div class="hg-panel-cuerpo">
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Botones de muestra", en: "Sample buttons" })}>
<button type="button" class="hg-boton hg-boton-primario" data-controlador="alternar" aria-pressed="false">${t({ es: "Primario", en: "Primary" })}</button>
<button type="button" class="hg-boton" data-controlador="alternar" aria-pressed="false">${t({ es: "Botón", en: "Button" })}</button>
<button type="button" class="hg-boton" data-controlador="alternar" aria-pressed="true">${t({ es: "Elegido", en: "Chosen" })}</button>
<button type="button" class="hg-boton hg-boton-discreto" data-controlador="alternar" aria-pressed="false">${t({ es: "Discreto", en: "Quiet" })}</button>
</div>
<div class="hg-grupo" role="group" ${atributo("aria-label", { es: "Filtros de muestra", en: "Sample filters" })}>
<button type="button" class="hg-boton hg-filtro" data-controlador="alternar" aria-pressed="true">${t({ es: "Todas", en: "All" })}</button>
<button type="button" class="hg-boton hg-filtro" data-controlador="alternar" aria-pressed="false">${t({ es: "Software", en: "Software" })}</button>
<button type="button" class="hg-boton hg-filtro" data-controlador="alternar" aria-pressed="false">${t({ es: "Agente", en: "Agent" })}</button>
</div>
<div class="hg-formulario hg-formulario-doble" data-formulario>
<div class="hg-campo"><label for="muestra-lista">${t({ es: "Lista", en: "List" })}</label><select id="muestra-lista" data-controlador="filtro" data-campo="muestra"><option value="" data-es="Todos" data-en="All">Todos</option><option value="vigente" data-es="Vigente" data-en="Current">Vigente</option><option value="vencido" data-es="Vencido" data-en="Overdue">Vencido</option></select></div>
<div class="hg-campo" data-obligatorio data-lleno="false"><label for="muestra-campo">${t({ es: "Campo (escribe algo: se marca en azul)", en: "Field (type something: it turns blue)" })}</label><input id="muestra-campo" type="text" autocomplete="off" data-controlador="campo"></div>
</div>
<p><a href="catalogo.html">${t({ es: "Un enlace va en tinta azul y subrayado", en: "A link is blue ink and underlined" })}</a></p>
</div>`;

  const tabla = `<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Tabla de muestra", en: "Sample table" })}</caption>
<thead><tr><th scope="col">${t({ es: "Prueba", en: "Test" })}</th><th scope="col">${t({ es: "Qué verifica", en: "What it verifies" })}</th><th scope="col">${t({ es: "Resultado", en: "Result" })}</th><th scope="col">${t({ es: "Veredicto", en: "Verdict" })}</th><th scope="col">${t({ es: "Confirmación", en: "Confirmation" })}</th></tr></thead>
<tbody>
<tr><td data-celda="id">${dato("PR-IA-ENC-002")}</td><td><p><a class="hg-enlace-fila" href="catalogo.html">${t({ es: "Restricciones ante otra codificación", en: "Restrictions under another encoding" })}</a></p><p class="hg-menor">${t({ es: "El nombre de la fila abre su objeto.", en: "The row's name opens its object." })}</p></td><td>${proporcion(42, 116)}<p class="hg-menor">${t({ es: "42 de 116 salidas fallaron", en: "42 of 116 outputs failed" })}</p></td><td data-celda="estado">${chip(VEREDICTO.fallida)}</td><td>${huella("sha256:fb24bd33c0ffee0123456789abcdef0123456789abcdef0123456789abc913")}<p>${firma("2026-08-17")}</p></td></tr>
<tr><td data-celda="id">${dato("PR-MD-PAR-001")}</td><td><p><a class="hg-enlace-fila" href="catalogo.html">${t({ es: "Paridad entre español e inglés", en: "Spanish and English parity" })}</a></p><p class="hg-menor">${t({ es: "Lo que no es noticia va sin recuadro.", en: "What is not news carries no box." })}</p></td><td><p class="hg-menor">${t({ es: "Planeada, sin resultado todavía.", en: "Planned, no result yet." })}</p></td><td data-celda="estado">${estado(VEREDICTO.no_ejecutada)}</td><td><p class="hg-menor">${t({ es: "Nada que firmar todavía.", en: "Nothing to sign yet." })}</p></td></tr>
</tbody>
</table>
<p class="hg-panel-pie">${t({ es: "Bajo 860 px cada fila pasa a tarjeta: identificador y estado arriba, el resto debajo.", en: "Below 860 px each row becomes a card: identifier and status on top, the rest below." })}</p>`;

  const resumen = `<div class="hg-panel-cuerpo"><ul class="hg-resumen" ${atributo("aria-label", { es: "Cifras de muestra", en: "Sample figures" })}>
<li><span class="hg-cifra" data-neutro>13</span>${estado(VIGENCIA.vigente)}</li>
<li><span class="hg-cifra" data-neutro>6</span>${estado(VIGENCIA.por_revisar)}</li>
<li><span class="hg-cifra" data-neutro>2</span>${estado(VIGENCIA.vencido)}</li>
<li><span class="hg-cifra" data-neutro>7</span>${estado({ rol: "atencion", simbolo: "aviso", nombre: { es: "Sin control", en: "No control" } })}</li>
</ul></div>`;

  const paso = ({ rol, simbolo, pendiente }, titulo, cuerpo) =>
    `<li class="hg-eslabon es-${pendiente ? "pendiente" : rol}">${SIMBOLO[pendiente ? "vacio" : simbolo]}<span class="hg-eslabon-titulo">${t(titulo)}</span>${cuerpo ? `<span class="hg-menor">${t(cuerpo)}</span>` : ""}</li>`;
  const recorrido = `<ol class="hg-cadena hg-cadena-horizontal">
${paso({ rol: "falla", simbolo: "falla" }, { es: "Hallazgo abierto", en: "Finding opened" }, { es: "Hecho: línea sólida del color del paso.", en: "Done: solid line in the step's color." })}
${paso({ rol: "acento", simbolo: "firma" }, { es: "Corrección declarada", en: "Fix declared" }, { es: "Lo hizo una persona: tinta azul.", en: "Done by a person: blue ink." })}
${paso({ pendiente: true }, { es: "Re-prueba pendiente", en: "Retest pending" }, { es: "Lo que falta: línea punteada.", en: "What is missing: dotted line." })}
${paso({ pendiente: true }, { es: "Sin cerrar", en: "Not closed" })}
</ol>`;

  const carril = `<div class="hg-panel-cuerpo"><div class="hg-trabajo">
<div class="hg-pila">
<dl class="hg-propiedades hg-propiedades-en-columnas">
${par({ es: "Propiedad", en: "Property" }, `<span>${t({ es: "Rótulo arriba, valor abajo", en: "Label on top, value below" })}</span>`)}
${par({ es: "Dato", en: "Data" }, dato("tasa-de-fallo/v1"))}
${par({ es: "Fechado", en: "Dated" }, `${estado(VIGENCIA.vigente)}<span class="hg-menor">${t({ es: "Verificada hace 12 días", en: "Verified 12 days ago" })}</span>`)}
${par({ es: "Lista", en: "List" }, lista([{ es: "Texto libre", en: "Free text" }, { es: "Archivos adjuntos", en: "Attached files" }]))}
</dl>
<div class="hg-contraste">
<div><p class="hg-rotulo">${t({ es: "Lo que se esperaba", en: "What was expected" })}</p><p>${t({ es: "Contraste: dos cajas enfrentadas.", en: "Contrast: two facing boxes." })}</p></div>
<div><p class="hg-rotulo">${t({ es: "Lo que se obtuvo", en: "What was obtained" })}</p><p>${chip(VEREDICTO.fallida)}</p></div>
</div>
<p class="hg-destacado">${t({ es: "El texto destacado dice lo único que no puede perderse.", en: "Highlighted text says the one thing that must not be missed." })}</p>
</div>
<div class="hg-carril">
<section class="hg-tarjeta hg-tarjeta-accion" data-propuesta="KIT-1" data-decision="" aria-labelledby="kit-accion">
<h3 class="hg-tarjeta-titulo" id="kit-accion">${t({ es: "Tarjeta de acción", en: "Action card" })}</h3>
<ul class="hg-pendientes">
<li class="es-falla">${SIMBOLO.falla}<span>${t({ es: "Qué falta, con su marca.", en: "What is missing, with its mark." })}</span></li>
<li class="es-acento">${SIMBOLO.firma}<span>${t({ es: "Lo que decide una persona.", en: "What a person decides." })}</span></li>
</ul>
<div class="hg-acciones" role="group" ${atributo("aria-label", { es: "Decisión de muestra", en: "Sample decision" })}>
<button type="button" class="hg-boton hg-boton-primario" data-controlador="decidir" data-valor="aprobar" aria-pressed="false">${t({ es: "Confirmar", en: "Confirm" })}</button>
<button type="button" class="hg-boton" data-controlador="decidir" data-valor="separar" aria-pressed="false">${t({ es: "Revisar uno por uno", en: "Review one by one" })}</button>
</div>
<p class="hg-menor" data-si-decision="">${t({ es: "Antes de decidir: qué falta.", en: "Before deciding: what is missing." })}</p>
<p class="hg-consecuencia" data-si-decision="aprobar" hidden>${t({ es: "Al decidir: qué ocurre.", en: "On deciding: what happens." })}</p>
<p class="hg-consecuencia" data-si-decision="separar" hidden>${t({ es: "Cada decisión dice su consecuencia.", en: "Each decision states its consequence." })}</p>
</section>
</div>
</div></div>`;

  const pestanas = `<div class="hg-panel-cuerpo">
<div class="hg-pila" data-pestanas data-via="uno">
<div class="hg-pestanas" role="group" ${atributo("aria-label", { es: "Pestañas de muestra", en: "Sample tabs" })}>
<button type="button" class="hg-pestana" data-controlador="pestana" data-valor="uno" aria-pressed="true">${t({ es: "Primera vía", en: "First route" })}</button>
<button type="button" class="hg-pestana" data-controlador="pestana" data-valor="dos" aria-pressed="false">${t({ es: "Segunda vía", en: "Second route" })}</button>
</div>
<p data-si-via="uno">${t({ es: "Las pestañas eligen un panel de la misma pantalla.", en: "Tabs choose a panel of the same screen." })}</p>
<p data-si-via="dos" hidden>${t({ es: "Este es el segundo panel.", en: "This is the second panel." })}</p>
</div>
<div class="hg-pila" data-pestanas data-via="a">
<div class="hg-selector" role="group" ${atributo("aria-label", { es: "Selector de muestra", en: "Sample selector" })}>
<button type="button" class="hg-opcion" data-controlador="pestana" data-valor="a" aria-pressed="true"><span class="hg-opcion-titulo" data-neutro>LOTE-0007</span><span>${t({ es: "Selector de objeto", en: "Object selector" })}</span></button>
<button type="button" class="hg-opcion" data-controlador="pestana" data-valor="b" aria-pressed="false"><span class="hg-opcion-titulo" data-neutro>LOTE-0008</span><span>${t({ es: "Otro objeto de la serie", en: "Another object in the series" })}</span></button>
</div>
<p data-si-via="a">${t({ es: "El selector dice cuál objeto de una serie está abierto.", en: "The selector says which object of a series is open." })}</p>
<p data-si-via="b" hidden>${t({ es: "Cambia el objeto; la pantalla es la misma.", en: "The object changes; the screen is the same." })}</p>
</div>
</div>`;

  const matriz = `<div class="hg-panel-cuerpo"><div class="hg-matriz">
<table>
<caption>${t({ es: "Prioridad de acción: impacto (filas) por frecuencia observada (columnas)", en: "Action priority: impact (rows) by observed frequency (columns)" })}</caption>
<thead><tr><th scope="col">${t({ es: "Impacto", en: "Impact" })}</th>${ESCALA_IA.facilidad.map((b) => `<th scope="col">${t(b.nombre)}</th>`).join("")}</tr></thead>
<tbody>
${IMPACTOS_DE_IA
  .map(
    (impacto) =>
      `<tr><th scope="row"><span class="hg-cifra-menor" data-neutro>${impacto}</span></th>${ESCALA_IA.tabla[impacto]
        .map((n, i) => {
          const esta = impacto === 3 && i === 2;
          return `<td${esta ? ' class="es-esta"' : ""}>${estado(SEVERIDAD[n])}${esta ? `<span class="hg-menor">${t({ es: "este objeto", en: "this object" })}</span>` : ""}</td>`;
        })
        .join("")}</tr>`,
  )
  .join("\n")}
</tbody>
</table>
</div></div>`;

  // Mirada 5: las piezas de la brecha, el tablero y el informe.
  const tot = { planeadas: 10, ejecutadas: 6, superadas: 3, fallidas: 3, no_ejecutadas: 4 };
  const brecha = `<div class="hg-panel-cuerpo">
<div class="hg-rejilla">
<div class="hg-caja"><p class="hg-caja-titulo">${t({ es: "Avance", en: "Progress" })}</p>${ejecutadas(tot)}<p class="hg-menor">${t({ es: "En tinta: cuánto se ejecutó no es un veredicto.", en: "In ink: how much was run is not a verdict." })}</p></div>
<div class="hg-caja"><p class="hg-caja-titulo">${t({ es: "Desglose", en: "Breakdown" })}</p>${desglose(tot)}<p class="hg-menor">${t({ es: "Cada veredicto con su forma; los ceros no se dibujan.", en: "Each verdict with its shape; zeros are not drawn." })}</p></div>
<div class="hg-caja"><p class="hg-caja-titulo">${t({ es: "Cuentas", en: "Counts" })}</p><ul class="hg-cuentas">${["alto", "medio", "bajo"]
    .map((s, i) => `<li>${estado(SEVERIDAD[s])}<span class="hg-cifra-menor" data-neutro>${[1, 1, 0][i]}</span></li>`)
    .join("")}</ul></div>
</div>
${sello(
  { rol: "positivo", simbolo: "ok", nombre: { es: "Banda de validación", en: "Validation band" } },
  `<p>${t({ es: "Un sello que resume si el instrumento pasó su validación; si falla, pasa a rojo y nada se publica.", en: "A seal that sums up whether the instrument passed its validation; if it fails, it turns red and nothing is published." })}</p>`,
)}
<div class="hg-informe-seccion"><h2><span class="hg-informe-num" data-neutro>1</span>${t({ es: "Sección del informe", en: "Report section" })}</h2><p class="hg-menor">${t({ es: "Numerada, separada por una línea; al imprimir, en papel claro y con las tablas como tablas.", en: "Numbered, separated by a line; when printed, on light paper with tables as tables." })}</p></div>
</div>`;

  const avisos = `<div class="hg-panel-cuerpo">
<div class="hg-aviso es-neutro">${SIMBOLO.vacio}<h3>${t({ es: "Todavía no hay nada aquí", en: "Nothing here yet" })}</h3><p>${t({
    es: "Un estado de pantalla dice qué pasa y qué hacer. Vacío, carga y error tienen cada uno el suyo.",
    en: "A screen state says what is happening and what to do. Empty, loading and error each have their own.",
  })}</p><div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div></div>
</div>`;

  // grupo: dónde va su tarjeta en design-sync/ (Fundamentos o Componentes, como design-system.md §§ 2–6).
  return [
    { id: "color", grupo: "Fundamentos", titulo: { es: "Color", en: "Color" }, cuerpo: colores, nota: { es: "Cambia de tema para ver el otro juego.", en: "Switch theme to see the other set." } },
    { id: "tipografia", grupo: "Fundamentos", titulo: { es: "Tipografía", en: "Typography" }, cuerpo: tipografia, nota: { es: "Una letra para el texto y su variante mono para los datos; sin serifa.", en: "One typeface for text and its mono variant for data; no serif." } },
    { id: "estados", grupo: "Fundamentos", titulo: { es: "Estados", en: "Statuses" }, cuerpo: estados, nota: { es: "Una forma por papel: se reconocen sin color.", en: "One shape per role: recognizable without color." } },
    { id: "controles", grupo: "Componentes", titulo: { es: "Botones, filtros y campos", en: "Buttons, filters and fields" }, cuerpo: controles, nota: { es: "Un solo primario por tarjeta de acción.", en: "A single primary per action card." } },
    { id: "cifras", grupo: "Componentes", titulo: { es: "Tira de cifras", en: "Figures strip" }, cuerpo: resumen },
    { id: "tabla", grupo: "Componentes", titulo: { es: "Tabla", en: "Table" }, cuerpo: tabla },
    { id: "recorrido", grupo: "Componentes", titulo: { es: "Recorrido", en: "Progress" }, cuerpo: recorrido, nota: { es: "Para lo que tiene ciclo de vida.", en: "For what has a life cycle." } },
    { id: "carril", grupo: "Componentes", titulo: { es: "Propiedades, contraste y carril de acción", en: "Properties, contrast and action rail" }, cuerpo: carril },
    { id: "pestanas", grupo: "Componentes", titulo: { es: "Pestañas y selector de objeto", en: "Tabs and object selector" }, cuerpo: pestanas },
    { id: "matriz", grupo: "Componentes", titulo: { es: "Matriz de prioridad", en: "Priority matrix" }, cuerpo: matriz, nota: { es: "La casilla del objeto, en un marco de tinta.", en: "The object's cell, in an ink frame." } },
    { id: "brecha", grupo: "Componentes", titulo: { es: "Brecha, tablero e informe", en: "Gap, dashboard and report" }, cuerpo: brecha, nota: { es: "Las piezas de la mirada 5.", en: "The pieces from review 5." } },
    { id: "avisos", grupo: "Componentes", titulo: { es: "Estado de pantalla", en: "Screen state" }, cuerpo: avisos },
  ];
}

/** El HTML de un panel del kit, tal como lo dibuja kit.html. */
export const panelDelKit = (p) => panel(p.id, p.titulo, p.cuerpo, p.nota);

export function kit({ consulta, existentes }) {
  const contenido = `<div class="hg-cabecera">
<div>
<h1>${t({ es: "Kit de componentes", en: "Component kit" })}</h1>
<p class="hg-bajada">${t({
    es: "Cada token y cada componente del sistema de diseño, dibujado con la misma hoja que usan las pantallas.",
    en: "Every token and component of the design system, drawn with the same stylesheet the screens use.",
  })}</p>
</div>
</div>
${panelesDelKit().map(panelDelKit).join("\n")}`;

  return pagina({
    titulo: { es: "HackGuard · kit", en: "HackGuard · kit" },
    migas: [t({ es: "Sala de diseño", en: "Design room" }), t({ es: "Kit de componentes", en: "Component kit" })],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter: el kit con la interfaz nueva (aprobado en el segundo tramo). Es la referencia de fidelidad para el primer sprint con pantallas, no una pantalla del producto.",
        en: "Review 4-ter: the kit with the new interface (approved in the second stretch). It is the fidelity reference for the first sprint with screens, not a product screen.",
      },
    },
    contenido,
    revisar: [
      {
        donde: { es: "Color", en: "Color" },
        hacer: { es: "Cambia de tema", en: "Switch theme" },
        ver: { es: "Las mismas muestras con su otro valor; ninguna se vuelve ilegible", en: "The same swatches with their other value; none becomes unreadable" },
      },
      {
        donde: { es: "Estados", en: "Statuses" },
        hacer: { es: "Compara en línea, chip y sello", en: "Compare inline, chip and seal" },
        ver: { es: "Tres pesos distintos; cada estado se reconoce por su marca aunque no distingas el color", en: "Three different weights; each status is recognizable by its mark even if you cannot tell the color" },
      },
      {
        donde: { es: "Tarjeta de acción", en: "Action card" },
        hacer: { es: "Pulsa «Confirmar»", en: "Press “Confirm”" },
        ver: { es: "El botón queda marcado y la frase de abajo cambia", en: "The button stays marked and the sentence below changes" },
      },
      {
        donde: { es: "Pestañas y selector", en: "Tabs and selector" },
        hacer: { es: "Cambia de pestaña y de objeto", en: "Switch tab and object" },
        ver: { es: "Cambia el panel de abajo; lo elegido lleva base azul", en: "The panel below changes; the chosen one has a blue base" },
      },
    ],
  });
}
