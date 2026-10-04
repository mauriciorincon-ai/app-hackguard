// interfaz-a|b|c.html — mirada 4-bis. La MISMA pantalla (carga de evidencia, lotes por confirmar) en tres
// direcciones de INTERFAZ que difieren en estructura —navegación, disposición, densidad y componentes—,
// no solo en tipografía:
//   A «Consola»     barra lateral · tabla densa · inspector a la derecha
//   B «Expediente»  barra lateral · el lote como un caso con su recorrido · carril «para confirmar»
//   C «Tablero»     navegación superior · resumen gráfico · paneles lado a lado
// Los datos son los de evidencia.html (mismo mundo, mismas reglas); aquí solo cambia cómo se ven.
import { HERRAMIENTAS, INSTANTANEA, PRUEBAS, archivoDeFicha, fichaDe } from "../datos/catalogo.mjs";
import { ACTIVOS, HALLAZGOS, LOTES, archivoDeActivo, archivoDeHallazgo, archivoDePlan } from "../datos/mundo.mjs";
import { huellaDe } from "../nucleo/calculos.mjs";
import { dato, enlace, huella } from "../nucleo/componentes.mjs";
import { ESTADO_DE_HALLAZGO, VEREDICTO } from "../nucleo/estados.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { pagina } from "../nucleo/pagina.mjs";
import { SIMBOLO } from "../nucleo/simbolos.mjs";

export const DIRECCIONES = {
  a: { archivo: "interfaz-a.html", nombre: { es: "A · Consola", en: "A · Console" } },
  b: { archivo: "interfaz-b.html", nombre: { es: "B · Expediente", en: "B · Case file" } },
  c: { archivo: "interfaz-c.html", nombre: { es: "C · Tablero", en: "C · Dashboard" } },
};

// ---------- Iconos de navegación: trazos SVG, nunca caracteres de una fuente ----------
const TRAZO = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const ICONO = {
  tablero: `<rect x="3" y="3" width="6" height="6" rx="1.5" ${TRAZO}/><rect x="11" y="3" width="6" height="6" rx="1.5" ${TRAZO}/><rect x="3" y="11" width="6" height="6" rx="1.5" ${TRAZO}/><rect x="11" y="11" width="6" height="6" rx="1.5" ${TRAZO}/>`,
  catalogo: `<path d="M7.5 5h9M7.5 10h9M7.5 15h9" ${TRAZO}/><path d="M3.5 5h.5M3.5 10h.5M3.5 15h.5" ${TRAZO}/>`,
  activos: `<path d="M10 2.5l6.5 3.5v8L10 17.5 3.5 14V6z" ${TRAZO}/><path d="M3.5 6L10 9.5 16.5 6M10 9.5v8" ${TRAZO}/>`,
  evidencia: `<rect x="2.5" y="4.5" width="15" height="11" rx="2" ${TRAZO}/><path d="M3 6.5l7 5 7-5" ${TRAZO}/>`,
  brecha: `<path d="M4 16.5V10M10 16.5v-13M16 16.5v-4.5" ${TRAZO}/>`,
  archivo: `<path d="M5 2.5h6l4 4v11H5z" ${TRAZO}/><path d="M11 2.5v4h4" ${TRAZO}/>`,
};
const icono = (n) => `<svg class="ix-icono" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${ICONO[n]}</svg>`;

const chip = ({ rol, simbolo, nombre }, extra = "") => `<span class="ix-chip es-${rol}"${extra}>${SIMBOLO[simbolo]}<span>${t(nombre)}</span></span>`;

/** Barra de proporción (fallas sobre repeticiones) como SVG: sin estilos en línea. */
const barra = (parte, total) =>
  `<svg class="ix-proporcion" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="ix-proporcion-fondo" width="100" height="6" rx="1"/><rect class="ix-proporcion-parte" width="${Math.max(parte > 0 ? 3 : 0, Math.round((parte / total) * 100))}" height="6" rx="1"/></svg>`;

const OBLIGATORIA = { rol: "falla", simbolo: "falla", nombre: { es: "Se revisa siempre", en: "Always reviewed" } };
const EN_MUESTRA = { rol: "acento", simbolo: "firma", nombre: { es: "En la muestra", en: "In the sample" } };
// En una celda de tabla la revisión se dice en una palabra (la columna ya se llama «Revisión»).
const OBLIGATORIA_CORTA = { ...OBLIGATORIA, nombre: { es: "Siempre", en: "Always" } };
const EN_MUESTRA_CORTA = { ...EN_MUESTRA, nombre: { es: "Muestra", en: "Sample" } };
const SIN_CONFIRMAR = { rol: "atencion", simbolo: "reloj", nombre: { es: "Sin confirmar", en: "Not confirmed" } };
const CONFIRMADO = { rol: "acento", simbolo: "firma", nombre: { es: "Confirmado por ti", en: "Confirmed by you" } };
const A_REVISION = { rol: "neutro", simbolo: "parcial", nombre: { es: "A revisión individual", en: "To individual review" } };

// ---------- Datos de la pantalla: los mismos lotes que evidencia.html ----------
function veredictoSugerido(sobre) {
  const ficha = fichaDe(sobre.prueba);
  if (ficha.regla === "alertas-zap/v1") return sobre.alertas > 0 ? "fallida" : sobre.corrio ? "superada" : "no_ejecutada";
  return sobre.fallidas > 0 ? "fallida" : "superada";
}

function lotes(existentes) {
  return LOTES.map((l) => {
    const sobres = l.sobres.map((s) => {
      const ficha = fichaDe(s.prueba);
      const veredicto = veredictoSugerido(s);
      const obligatoria = veredicto === "fallida" || veredicto === "parcial";
      const conteo =
        s.razon ??
        (s.fallidas > 0
          ? { es: `${s.fallidas} de ${s.evaluadas} salidas fallaron`, en: `${s.fallidas} of ${s.evaluadas} outputs failed` }
          : { es: `0 de ${s.evaluadas} salidas fallaron`, en: `0 of ${s.evaluadas} outputs failed` });
      const hallazgo = s.hallazgo_abierto ? HALLAZGOS.find((h) => h.id === s.hallazgo_abierto) : s.reprueba_de ? HALLAZGOS.find((h) => h.id === s.reprueba_de) : null;
      const nota = s.hallazgo_abierto
        ? tHtml({ es: "Coincide con el hallazgo abierto {h}: no abre uno nuevo.", en: "It matches the open finding {h}: it does not open a new one." }, { h: enlace(archivoDeHallazgo(s.hallazgo_abierto), dato(s.hallazgo_abierto), existentes) })
        : s.reprueba_de
          ? tHtml({ es: "Es la re-prueba de {h}: al confirmarla, el hallazgo se cierra.", en: "It is the retest of {h}: once confirmed, the finding closes." }, { h: enlace(archivoDeHallazgo(s.reprueba_de), dato(s.reprueba_de), existentes) })
          : veredicto === "fallida"
            ? t({ es: "Al confirmarlo se abre un hallazgo.", en: "Confirming it opens a finding." })
            : veredicto === "no_ejecutada"
              ? t({ es: "No cuenta como superada: falta la constancia de que corrió.", en: "It does not count as passed: proof that it ran is missing." })
              : "";
      return {
        ...s, ficha, veredicto, obligatoria, conteo, nota, hallazgo,
        huellaSobre: huellaDe({ sobre: s.id, prueba: s.prueba, lote: l.id }),
        huellaResultado: huellaDe({ prueba: s.prueba, veredicto, evaluadas: s.evaluadas ?? 0, fallidas: s.fallidas ?? s.alertas ?? 0 }),
      };
    });
    const obligatorias = sobres.filter((s) => s.obligatoria).length;
    const cuenta = (v) => sobres.filter((s) => s.veredicto === v).length;
    return {
      ...l, sobres, obligatorias, resto: sobres.length - obligatorias,
      abre: sobres.filter((s) => s.veredicto === "fallida" && !s.hallazgo_abierto).length,
      reparto: ["fallida", "no_ejecutada", "superada"].map((v) => ({ veredicto: v, n: cuenta(v) })).filter((x) => x.n > 0),
      nombreDeHerramienta: HERRAMIENTAS[l.herramienta].nombre,
      huellaDelArchivo: huellaDe({ archivo: l.archivo, fecha: l.fecha, hora: l.hora }),
      huellaDelLote: huellaDe({ lote: l.id, sobres: l.sobres.map((s) => s.id).join(",") }),
      destacado: sobres.find((s) => s.obligatoria) ?? sobres[0],
    };
  });
}

// ---------- Piezas compartidas ----------
const SECCIONES = (existentes) => [
  { id: "tablero", icono: "tablero", nombre: { es: "Tablero", en: "Dashboard" }, archivo: "tablero.html" },
  { id: "catalogo", icono: "catalogo", nombre: { es: "Catálogo", en: "Catalog" }, archivo: "catalogo.html", cuenta: PRUEBAS.length },
  { id: "activos", icono: "activos", nombre: { es: "Activos", en: "Assets" }, archivo: archivoDeActivo(Object.keys(ACTIVOS)[0]), cuenta: Object.keys(ACTIVOS).length },
  { id: "evidencia", icono: "evidencia", nombre: { es: "Evidencia", en: "Evidence" }, archivo: "evidencia.html", cuenta: LOTES.length, actual: true },
  { id: "brecha", icono: "brecha", nombre: { es: "Brecha", en: "Gap" }, archivo: "brecha.html" },
].map((s) => ({ ...s, existe: existentes.includes(s.archivo) }));

function navegacion(existentes) {
  const items = SECCIONES(existentes)
    .map((s) => {
      const dentro = `${icono(s.icono)}<span class="ix-nav-nombre">${t(s.nombre)}</span>${s.cuenta ? `<span class="ix-cuenta" data-neutro>${s.cuenta}</span>` : ""}`;
      return s.existe ? `<li><a href="${s.archivo}"${s.actual ? ' aria-current="true"' : ""}>${dentro}</a></li>` : `<li><span class="ix-nav-pendiente">${dentro}</span></li>`;
    })
    .join("");
  return `<nav class="ix-nav" ${atributo("aria-label", { es: "Secciones", en: "Sections" })}><ul>${items}</ul></nav>`;
}

const ajustes = () => `<div class="ix-ajustes">
<button type="button" class="ix-boton ix-boton-discreto" data-controlador="tema" ${atributo("aria-label", { es: "Cambiar entre tema oscuro y claro", en: "Switch between dark and light theme" })}><span data-si-tema="oscuro">${t({ es: "Oscuro", en: "Dark" })}</span><span data-si-tema="claro">${t({ es: "Claro", en: "Light" })}</span></button>
<button type="button" class="ix-boton ix-boton-discreto" data-controlador="idioma" ${atributo("aria-label", { es: "Cambiar el idioma a inglés", en: "Switch the language to Spanish" })}><span lang="es" data-neutro>ES</span><span lang="en" data-neutro>EN</span></button>
</div>`;

const marca = () => `<a class="ix-marca" href="index.html"><span class="ix-marca-nombre" data-neutro>HackGuard</span></a>`;

function tira(dir) {
  const enlaces = Object.entries(DIRECCIONES)
    .map(([clave, d]) => `<li><a href="${d.archivo}"${clave === dir ? ' aria-current="page"' : ""}>${t(d.nombre)}</a></li>`)
    .join("");
  return `<aside class="mq-tira" ${atributo("aria-label", { es: "Sala de diseño", en: "Design room" })}>
<p><span class="mq-sala-rotulo">${t({ es: "Sala de diseño.", en: "Design room." })}</span> ${t({ es: "La misma pantalla en tres interfaces. Cambia de una a otra:", en: "The same screen in three interfaces. Switch between them:" })}</p>
<nav ${atributo("aria-label", { es: "Direcciones de interfaz", en: "Interface directions" })}><ul>${enlaces}</ul></nav>
</aside>`;
}

/** Barra de contexto (A y B): dónde estás, sobre qué activo, y los ajustes. En teléfono lleva la marca. */
const barraDeContexto = (activoId, existentes) => {
  const activo = ACTIVOS[activoId];
  return `<header class="ix-barra">
${marca()}
<p class="ix-migas">${t({ es: "Evidencia", en: "Evidence" })} <span aria-hidden="true">/</span> <strong>${t({ es: "Carga", en: "Intake" })}</strong></p>
<p class="ix-contexto"><span>${t(activo.nombre)}</span> ${enlace(archivoDePlan(activoId), dato(activo.plan.id), existentes)} <span class="ix-menor">${t({ es: "catálogo", en: "catalog" })} ${dato(INSTANTANEA.version)}</span></p>
${ajustes()}
</header>`;
};

const TITULO = { es: "Carga de evidencia", en: "Evidence intake" };
const BAJADA = {
  es: "Un resultado no cuenta hasta que una persona lo confirma.",
  en: "A result does not count until a person confirms it.",
};

function cifras(ls) {
  const todos = ls.flatMap((l) => l.sobres);
  const cuenta = (v) => todos.filter((s) => s.veredicto === v).length;
  return [
    { n: ls.length, nombre: { es: "lotes por confirmar", en: "batches to confirm" }, pendientes: true },
    { n: todos.length, nombre: { es: "sobres propuestos", en: "proposed envelopes" } },
    { n: cuenta("fallida"), nombre: { es: "fallidas", en: "failed" }, estado: VEREDICTO.fallida },
    { n: cuenta("no_ejecutada"), nombre: { es: "no ejecutada", en: "not run" }, estado: VEREDICTO.no_ejecutada },
  ];
}

const consecuencias = (l) => `<p class="ix-consecuencia" data-si-decision="aprobar" hidden>${tHtml(
  {
    es: l.abre === 1 ? "Los {n} sobres cuentan desde ahora y ya no se editan. Se abre {h} hallazgo." : "Los {n} sobres cuentan desde ahora y ya no se editan. Se abren {h} hallazgos.",
    en: l.abre === 1 ? "All {n} envelopes count from now on and can no longer be edited. {h} finding is opened." : "All {n} envelopes count from now on and can no longer be edited. {h} findings are opened.",
  },
  { n: neutro(String(l.sobres.length)), h: neutro(String(l.abre)) },
)}</p>
<p class="ix-consecuencia" data-si-decision="separar" hidden>${t({ es: "El lote pasa a revisión individual: cada sobre se confirma por separado.", en: "The batch moves to individual review: each envelope is confirmed separately." })}</p>`;

const botones = (l, { primarioPrimero = false } = {}) => {
  const confirmar = `<button type="button" class="ix-boton ix-boton-primario" data-controlador="decidir" data-valor="aprobar" aria-pressed="false">${t({ es: "Confirmar el lote", en: "Confirm the batch" })}</button>`;
  const separar = `<button type="button" class="ix-boton" data-controlador="decidir" data-valor="separar" aria-pressed="false">${t({ es: "Revisar uno por uno", en: "Review one by one" })}</button>`;
  return `<div class="ix-acciones" role="group" ${atributo("aria-label", { es: `Decisión sobre ${l.id}`, en: `Decision on ${l.id}` })}>${primarioPrimero ? confirmar + separar : separar + confirmar}</div>`;
};

/** Estado del lote: tres chips, de los que el controlador muestra el que corresponde a la decisión. */
const estadoDelLote = () =>
  `<span data-si-decision="">${chip(SIN_CONFIRMAR)}</span><span data-si-decision="aprobar" hidden>${chip(CONFIRMADO)}</span><span data-si-decision="separar" hidden>${chip(A_REVISION)}</span>`;

const selectorDeLotes = (ls, clase = "ix-pestanas") =>
  `<div class="${clase}" role="group" ${atributo("aria-label", { es: "Lotes por confirmar", en: "Batches to confirm" })}>${ls
    .map(
      (l, i) =>
        `<button type="button" class="ix-pestana" data-controlador="pestana" data-valor="${l.id}" aria-pressed="${i === 0}"><span class="ix-pestana-id" data-neutro>${l.id}</span><span class="ix-pestana-nota">${neutro(l.nombreDeHerramienta)} · ${tHtml({ es: "{n} sobres", en: "{n} envelopes" }, { n: neutro(String(l.sobres.length)) })}</span></button>`,
    )
    .join("")}</div>`;

const reparto = (l) =>
  `<ul class="ix-reparto">${l.reparto.map((r) => `<li>${chip({ ...VEREDICTO[r.veredicto], nombre: { es: `${r.n} ${VEREDICTO[r.veredicto].nombre.es.toLowerCase()}`, en: `${r.n} ${VEREDICTO[r.veredicto].nombre.en.toLowerCase()}` } })}</li>`).join("")}</ul>`;

const advertencias = (l) => l.advertencias.map((a) => `<p class="ix-advertencia es-atencion">${SIMBOLO.aviso}<span>${t(a)}</span></p>`).join("");

const resultado = (s) => `${s.evaluadas ? barra(s.fallidas, s.evaluadas) : ""}<span class="ix-menor">${t(s.conteo)}</span>`;

const prueba = (s, existentes) => `${enlace(archivoDeFicha(s.prueba), t(s.ficha.nombre), existentes)}`;

const propiedades = (l) => `<dl class="ix-propiedades">
<div><dt>${t({ es: "Archivo", en: "File" })}</dt><dd>${dato(l.archivo)}<span class="ix-menor">${t({ es: "No se guarda: solo su huella.", en: "Not stored: only its fingerprint." })}</span></dd></div>
<div><dt>${t({ es: "Huella del archivo", en: "File fingerprint" })}</dt><dd>${huella(l.huellaDelArchivo)}</dd></div>
<div><dt>${t({ es: "Huella del lote", en: "Batch fingerprint" })}</dt><dd>${huella(l.huellaDelLote)}</dd></div>
<div><dt>${t({ es: "Adaptador", en: "Adapter" })}</dt><dd>${dato(l.adaptador)}</dd></div>
<div><dt>${t({ es: "Ejecutado por", en: "Run by" })}</dt><dd>${t(l.ejecutado_por)}</dd></div>
<div><dt>${t({ es: "Cuándo", en: "When" })}</dt><dd>${dato(`${l.fecha} ${l.hora}`)}<span class="ix-menor" data-neutro>${l.zona}</span></dd></div>
</dl>`;

function fichaDelSobre(s, existentes) {
  const h = s.hallazgo;
  return `<p class="ix-rotulo">${t({ es: "Sobre", en: "Envelope" })} ${dato(s.id)}</p>
<p class="ix-inspector-titulo">${prueba(s, existentes)}</p>
<p>${chip(VEREDICTO[s.veredicto])} ${chip(s.obligatoria ? OBLIGATORIA : EN_MUESTRA)}</p>
<div class="ix-resultado">${resultado(s)}</div>
<dl class="ix-propiedades">
<div><dt>${t({ es: "Regla", en: "Rule" })}</dt><dd>${dato(s.ficha.regla)}<span class="ix-menor">${t({ es: "El veredicto lo calcula la regla, no la herramienta.", en: "The verdict is computed by the rule, not the tool." })}</span></dd></div>
${s.ficha.selector ? `<div><dt>${t({ es: "Selector", en: "Selector" })}</dt><dd>${dato(s.ficha.selector)}</dd></div>` : ""}
<div><dt>${t({ es: "Huella del sobre", en: "Envelope fingerprint" })}</dt><dd>${huella(s.huellaSobre)}</dd></div>
<div><dt>${t({ es: "Huella del resultado", en: "Result fingerprint" })}</dt><dd>${huella(s.huellaResultado)}</dd></div>
</dl>
${h ? `<div class="ix-vinculo"><p class="ix-rotulo">${t({ es: "Hallazgo", en: "Finding" })}</p><p>${enlace(archivoDeHallazgo(h.id), dato(h.id), existentes)} ${chip(ESTADO_DE_HALLAZGO[h.estado])}</p><p class="ix-menor">${t(h.titulo)}</p></div>` : ""}
${s.nota ? `<p class="ix-nota">${s.nota}</p>` : ""}`;
}

// =====================================================================================================
// A · CONSOLA — barra lateral, tabla densa, inspector
// =====================================================================================================
function consola(ls, existentes) {
  const activo = ACTIVOS[ls[0].activo];
  const stats = cifras(ls)
    .map((c) => `<li><span class="ix-cifra" data-neutro${c.pendientes ? " data-cuenta-pendientes" : ""}>${c.n}</span><span>${c.estado ? chip({ ...c.estado, nombre: c.nombre }) : t(c.nombre)}</span></li>`)
    .join("");

  const tabla = (l) => `<table class="ix-tabla">
<caption class="ix-oculto">${tHtml({ es: "Sobres del lote {l}", en: "Envelopes in batch {l}" }, { l: neutro(l.id) })}</caption>
<thead><tr><th scope="col">${t({ es: "Sobre", en: "Envelope" })}</th><th scope="col">${t({ es: "Prueba", en: "Test" })}</th><th scope="col">${t({ es: "Veredicto sugerido", en: "Suggested verdict" })}</th><th scope="col">${t({ es: "Resultado", en: "Result" })}</th><th scope="col">${t({ es: "Revisión", en: "Review" })}</th></tr></thead>
<tbody>
${l.sobres
  .map(
    (s) => `<tr${s === l.destacado ? ' class="es-seleccionada"' : ""}>
<td data-celda="sobre">${dato(s.id)}</td>
<td data-celda="prueba">${prueba(s, existentes)}<span class="ix-menor">${dato(s.prueba)}</span></td>
<td data-celda="veredicto">${chip(VEREDICTO[s.veredicto])}</td>
<td data-celda="resultado">${resultado(s)}</td>
<td data-celda="revision">${chip(s.obligatoria ? OBLIGATORIA_CORTA : EN_MUESTRA_CORTA)}</td>
</tr>`,
  )
  .join("\n")}
</tbody>
</table>`;

  const panelDeLote = (l) => `<div class="ix-lote" data-si-via="${l.id}" data-propuesta="${l.id}" data-decision="">
<div class="ix-lote-cab">
<div class="ix-lote-linea"><span class="ix-lote-id">${dato(l.id)}</span><span>${neutro(l.nombreDeHerramienta)} ${dato(l.version)}</span><span class="ix-menor">${dato(`${l.fecha} ${l.hora}`)}</span>${estadoDelLote()}</div>
${reparto(l)}
</div>
${advertencias(l)}
${tabla(l)}
<div class="ix-pie">
<p class="ix-menor">${tHtml(
    { es: "Para confirmar: todas las fallidas ({f}) y la muestra de {m} entre los otros {r}.", en: "To confirm: every failed one ({f}) and the sample of {m} among the other {r}." },
    { f: neutro(String(l.obligatorias)), m: neutro(String(l.resto)), r: neutro(String(l.resto)) },
  )}</p>
${botones(l)}
${consecuencias(l)}
</div>
</div>`;

  const inspector = (l) => `<div data-si-via="${l.id}">
${fichaDelSobre(l.destacado, existentes)}
<div class="ix-inspector-lote">
<p class="ix-rotulo">${t({ es: "Lote", en: "Batch" })} ${dato(l.id)}</p>
${propiedades(l)}
</div>
</div>`;

  return `<div class="ix-app">
<aside class="ix-lateral" ${atributo("aria-label", { es: "Navegación", en: "Navigation" })}>
${marca()}
${navegacion(existentes)}
<div class="ix-lateral-pie">
<p class="ix-rotulo">${t({ es: "Activo", en: "Asset" })}</p>
<p class="ix-lateral-activo">${t(activo.nombre)}</p>
</div>
</aside>
<div class="ix-cuerpo">
${barraDeContexto(ls[0].activo, existentes)}
<main id="contenido" class="ix-principal">
<div class="ix-cabecera">
<div><h1>${t(TITULO)}</h1><p class="ix-bajada">${t(BAJADA)}</p></div>
<ul class="ix-resumen" ${atributo("aria-label", { es: "Resumen de lo cargado", en: "Summary of what was loaded" })}>${stats}</ul>
</div>
<div class="ix-trabajo" data-pestanas data-via="${ls[0].id}">
<section class="ix-panel" ${atributo("aria-label", { es: "Lotes por confirmar", en: "Batches to confirm" })}>
${selectorDeLotes(ls)}
${ls.map(panelDeLote).join("\n")}
</section>
<aside class="ix-inspector" ${atributo("aria-label", { es: "Detalle del sobre seleccionado", en: "Selected envelope details" })}>
${ls.map(inspector).join("\n")}
</aside>
</div>
</main>
</div>
</div>`;
}

// =====================================================================================================
// B · EXPEDIENTE — el lote como un caso: recorrido arriba, sobres a la izquierda, carril para confirmar
// =====================================================================================================
function expediente(ls, existentes) {
  const activo = ACTIVOS[ls[0].activo];
  const paso = (n, titulo, detalle, clase, simbolo) =>
    `<li class="ix-paso ${clase}"><span class="ix-paso-marca">${SIMBOLO[simbolo]}</span><span class="ix-paso-n" data-neutro>${n}</span><span class="ix-paso-titulo">${t(titulo)}</span><span class="ix-menor">${detalle}</span></li>`;

  const caso = (l) => `<article class="ix-caso" data-si-via="${l.id}" data-propuesta="${l.id}" data-decision="">
<header class="ix-caso-cab">
<div>
<p class="ix-rotulo">${t({ es: "Lote por confirmar", en: "Batch to confirm" })} · ${dato(l.id)}</p>
<h2>${tHtml({ es: "{h} sobre {a}", en: "{h} on {a}" }, { h: neutro(`${l.nombreDeHerramienta} ${l.version}`), a: t(activo.nombre) })}</h2>
<p class="ix-menor">${t(l.ejecutado_por)} · ${dato(`${l.fecha} ${l.hora}`)} · ${tHtml({ es: "{n} sobres", en: "{n} envelopes" }, { n: neutro(String(l.sobres.length)) })}</p>
</div>
${reparto(l)}
</header>
<ol class="ix-recorrido" ${atributo("aria-label", { es: "Recorrido del lote", en: "Batch progress" })}>
${paso(1, { es: "Archivo leído", en: "File read" }, t({ es: "En tu equipo. No se guarda.", en: "On your machine. Not stored." }), "es-hecho", "ok")}
${paso(2, { es: "Veredictos sugeridos", en: "Verdicts suggested" }, t({ es: "Los calculó la regla de cada prueba.", en: "Computed by each test's rule." }), "es-hecho", "ok")}
<li class="ix-paso es-actual" data-paso-final><span class="ix-paso-marca"><span data-si-decision="">${SIMBOLO.reloj}</span><span data-si-decision="aprobar" hidden>${SIMBOLO.firma}</span><span data-si-decision="separar" hidden>${SIMBOLO.parcial}</span></span><span class="ix-paso-n" data-neutro>3</span><span class="ix-paso-titulo"><span data-si-decision="">${t({ es: "Tu revisión", en: "Your review" })}</span><span data-si-decision="aprobar" hidden>${t({ es: "Confirmado por ti", en: "Confirmed by you" })}</span><span data-si-decision="separar" hidden>${t({ es: "A revisión individual", en: "To individual review" })}</span></span><span class="ix-menor">${t({ es: "Hasta aquí, nada cuenta.", en: "Until here, nothing counts." })}</span></li>
</ol>
<div class="ix-caso-cuerpo">
<div class="ix-caso-principal">
<h3>${t({ es: "Sobres del lote", en: "Envelopes in the batch" })}</h3>
<ul class="ix-sobres">
${l.sobres
  .map(
    (s) => `<li class="ix-sobre es-${VEREDICTO[s.veredicto].rol}${s.obligatoria ? " es-abierto" : ""}">
<div class="ix-sobre-linea">
<span class="ix-sobre-marca">${SIMBOLO[VEREDICTO[s.veredicto].simbolo]}</span>
<div class="ix-sobre-texto"><p class="ix-sobre-titulo">${prueba(s, existentes)}</p><p class="ix-menor">${dato(s.id)} · ${dato(s.prueba)}</p></div>
<div class="ix-sobre-estado"><span class="ix-sobre-veredicto">${t(VEREDICTO[s.veredicto].nombre)}</span><span class="ix-menor">${t(s.conteo)}</span></div>
</div>
${
  s.obligatoria
    ? `<div class="ix-sobre-detalle">
<div class="ix-resultado">${s.evaluadas ? barra(s.fallidas, s.evaluadas) : ""}</div>
<p>${chip(OBLIGATORIA)} <span class="ix-menor">${t({ es: "Regla", en: "Rule" })} ${dato(s.ficha.regla)}</span></p>
${s.nota ? `<p class="ix-nota">${s.nota}</p>` : ""}
<p class="ix-menor">${t({ es: "Huella del resultado", en: "Result fingerprint" })} ${huella(s.huellaResultado)}</p>
</div>`
    : s.nota
      ? `<div class="ix-sobre-detalle"><p class="ix-nota">${s.nota}</p></div>`
      : ""
}
</li>`,
  )
  .join("\n")}
</ul>
<h3>${t({ es: "Ficha del lote", en: "Batch record" })}</h3>
<div class="ix-propiedades-en-columnas">${propiedades(l)}</div>
</div>
<aside class="ix-carril" ${atributo("aria-label", { es: `Para confirmar ${l.id}`, en: `To confirm ${l.id}` })}>
<h3>${t({ es: "Para confirmar", en: "To confirm" })}</h3>
<ul class="ix-pendientes">
<li class="es-falla">${SIMBOLO.falla}<span>${tHtml({ es: "Revisar las fallidas: {n}. Siempre, todas.", en: "Review the failed ones: {n}. Always, all of them." }, { n: neutro(String(l.obligatorias)) })}</span></li>
<li class="es-acento">${SIMBOLO.firma}<span>${tHtml({ es: "Revisar la muestra: {m} de {r}.", en: "Review the sample: {m} of {r}." }, { m: neutro(String(l.resto)), r: neutro(String(l.resto)) })}</span></li>
${l.advertencias.map((a) => `<li class="es-atencion">${SIMBOLO.aviso}<span>${t(a)}</span></li>`).join("")}
</ul>
${botones(l, { primarioPrimero: true })}
${consecuencias(l)}
<p class="ix-consecuencia ix-menor" data-si-decision="">${t({ es: "Un solo error en la muestra manda el lote entero a revisión individual.", en: "A single error in the sample sends the whole batch to individual review." })}</p>
</aside>
</div>
</article>`;

  return `<div class="ix-app">
<aside class="ix-lateral" ${atributo("aria-label", { es: "Navegación", en: "Navigation" })}>
${marca()}
<p class="ix-marca-lema">${t({ es: "libro de evidencia", en: "evidence ledger" })}</p>
${navegacion(existentes)}
<div class="ix-lateral-pie">
<p class="ix-rotulo">${t({ es: "Activo", en: "Asset" })}</p>
<p class="ix-lateral-activo">${t(activo.nombre)}</p>
</div>
</aside>
<div class="ix-cuerpo">
${barraDeContexto(ls[0].activo, existentes)}
<main id="contenido" class="ix-principal" data-pestanas data-via="${ls[0].id}">
<div class="ix-cabecera">
<div><h1>${t(TITULO)}</h1><p class="ix-bajada">${t(BAJADA)}</p></div>
${selectorDeLotes(ls, "ix-pestanas ix-pestanas-caso")}
</div>
${ls.map(caso).join("\n")}
</main>
</div>
</div>`;
}

// =====================================================================================================
// C · TABLERO — navegación superior, resumen gráfico, los dos lotes lado a lado
// =====================================================================================================
function tablero(ls, existentes) {
  const activo = ACTIVOS[ls[0].activo];
  const todos = ls.flatMap((l) => l.sobres);
  const total = todos.length;
  const tarjetas = cifras(ls)
    .map(
      (c) => `<li class="ix-tarjeta${c.estado ? ` es-${c.estado.rol}` : ""}">
<span class="ix-cifra" data-neutro${c.pendientes ? " data-cuenta-pendientes" : ""}>${c.n}</span>
<span class="ix-tarjeta-nombre">${c.estado ? `${SIMBOLO[c.estado.simbolo]}<span>${t(c.nombre)}</span>` : t(c.nombre)}</span>
${c.estado ? barra(c.n, total) : ""}
</li>`,
    )
    .join("");

  const panel = (l) => `<article class="ix-panel ix-panel-lote" data-propuesta="${l.id}" data-decision="">
<header class="ix-panel-cab">
<div class="ix-insignia">${icono("archivo")}</div>
<div>
<p class="ix-rotulo">${dato(l.id)} · ${dato(`${l.fecha} ${l.hora}`)}</p>
<h2>${neutro(`${l.nombreDeHerramienta} ${l.version}`)}</h2>
</div>
${estadoDelLote()}
</header>
${reparto(l)}
<ul class="ix-filas">
${l.sobres
  .map(
    (s) => `<li class="ix-fila es-${VEREDICTO[s.veredicto].rol}">
<span class="ix-fila-marca">${SIMBOLO[VEREDICTO[s.veredicto].simbolo]}</span>
<div class="ix-fila-texto">
<p class="ix-fila-titulo">${prueba(s, existentes)}</p>
<p class="ix-menor"><strong>${t(VEREDICTO[s.veredicto].nombre)}</strong> · ${t(s.conteo)}</p>
${s.evaluadas ? `<div class="ix-resultado">${barra(s.fallidas, s.evaluadas)}</div>` : ""}
${s.nota ? `<p class="ix-nota">${s.nota}</p>` : ""}
</div>
<span class="ix-fila-id">${dato(s.id)}</span>
</li>`,
  )
  .join("\n")}
</ul>
${advertencias(l)}
<footer class="ix-panel-pie">
<p class="ix-menor" data-si-decision="">${tHtml({ es: "Revisa las fallidas ({f}) y la muestra de {m}.", en: "Review the failed ones ({f}) and the sample of {m}." }, { f: neutro(String(l.obligatorias)), m: neutro(String(l.resto)) })}</p>
${consecuencias(l)}
${botones(l)}
</footer>
</article>`;

  return `<div class="ix-app">
<header class="ix-superior">
${marca()}
${navegacion(existentes)}
<div class="ix-superior-fin">
<p class="ix-contexto"><span class="ix-rotulo">${t({ es: "Activo", en: "Asset" })}</span> ${t(activo.nombre)}</p>
${ajustes()}
</div>
</header>
<main id="contenido" class="ix-principal">
<div class="ix-cabecera">
<div><h1>${t(TITULO)}</h1><p class="ix-bajada">${t(BAJADA)}</p></div>
<p class="ix-contexto">${enlace(archivoDePlan(ls[0].activo), dato(activo.plan.id), existentes)} <span class="ix-menor">${t({ es: "catálogo", en: "catalog" })} ${dato(INSTANTANEA.version)}</span></p>
</div>
<ul class="ix-tarjetas" ${atributo("aria-label", { es: "Resumen de lo cargado", en: "Summary of what was loaded" })}>${tarjetas}</ul>
<div class="ix-rejilla">
${ls.map(panel).join("\n")}
</div>
</main>
</div>`;
}

const VISTAS = { a: consola, b: expediente, c: tablero };

const REVISAR = {
  a: [
    { donde: { es: "Toda la pantalla", en: "The whole screen" }, hacer: { es: "Mírala unos segundos sin leer", en: "Look at it for a few seconds without reading" }, ver: { es: "Se siente una herramienta: navegación a la izquierda, tabla al centro, detalle a la derecha", en: "It feels like a tool: navigation on the left, table in the middle, detail on the right" } },
    { donde: { es: "Pestañas de lote", en: "Batch tabs" }, hacer: { es: "Cambia al segundo lote", en: "Switch to the second batch" }, ver: { es: "Cambian la tabla y el detalle; «no ejecutada» se distingue de «superada»", en: "The table and the detail change; “not run” is told apart from “passed”" } },
    { donde: { es: "Pie de la tabla", en: "Table footer" }, hacer: { es: "Pulsa «Confirmar el lote»", en: "Press “Confirm the batch”" }, ver: { es: "El estado pasa a «Confirmado por ti» y dice qué ocurre", en: "The status becomes “Confirmed by you” and says what happens" } },
  ],
  b: [
    { donde: { es: "Toda la pantalla", en: "The whole screen" }, hacer: { es: "Mírala unos segundos sin leer", en: "Look at it for a few seconds without reading" }, ver: { es: "El lote se lee como un caso: en qué paso va, qué trae y qué falta para confirmarlo", en: "The batch reads as a case: which step it is at, what it holds and what is left to confirm it" } },
    { donde: { es: "Carril de la derecha", en: "Right-hand rail" }, hacer: { es: "Pulsa «Confirmar el lote»", en: "Press “Confirm the batch”" }, ver: { es: "El tercer paso del recorrido pasa a «Confirmado por ti»", en: "The third step of the progress becomes “Confirmed by you”" } },
    { donde: { es: "Selector de lote", en: "Batch selector" }, hacer: { es: "Cambia al segundo lote", en: "Switch to the second batch" }, ver: { es: "Cambia todo el caso; la fallida aparece abierta con su detalle", en: "The whole case changes; the failed one shows open with its detail" } },
  ],
  c: [
    { donde: { es: "Toda la pantalla", en: "The whole screen" }, hacer: { es: "Mírala unos segundos sin leer", en: "Look at it for a few seconds without reading" }, ver: { es: "Se ve el conjunto de un golpe: cifras arriba y los dos lotes lado a lado", en: "You see the whole at once: figures on top and both batches side by side" } },
    { donde: { es: "Cada lote", en: "Each batch" }, hacer: { es: "Compara los dos paneles", en: "Compare the two panels" }, ver: { es: "Fallida, superada y «no ejecutada» se distinguen por su marca y su texto", en: "Failed, passed and “not run” are told apart by mark and text" } },
    { donde: { es: "Pie de un lote", en: "A batch's footer" }, hacer: { es: "Pulsa «Confirmar el lote»", en: "Press “Confirm the batch”" }, ver: { es: "El estado del panel cambia y baja la cifra de lotes por confirmar", en: "The panel's status changes and the batches-to-confirm figure goes down" } },
  ],
};

export const interfaz = (dir) => ({ existentes }) =>
  pagina({
    titulo: { es: `HackGuard · interfaz ${dir.toUpperCase()}`, en: `HackGuard · interface ${dir.toUpperCase()}` },
    existentes,
    armazon: false,
    claseDeCuerpo: `ix ix-${dir}`,
    hojas: ["assets/interfaz.css"],
    contenido: `${tira(dir)}\n${VISTAS[dir](lotes(existentes), existentes)}`,
    revisar: REVISAR[dir],
  });
