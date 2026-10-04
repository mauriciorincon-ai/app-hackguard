// plan-<id>.html — pantalla 8 (C9, C10). El plan de un activo: qué pruebas se planean y por qué, cuáles
// quedan fuera y por qué, qué controles quedarán cubiertos y el paquete de ejecución para correrlas
// afuera (declarativo: sin cargas). Lo calcula nucleo/calculos.mjs desde el perfil del activo y el
// catálogo; nada se escribe a mano. Un activo sin autorización no tiene plan: su página lo dice.
// Dirección «consola» (mirada 4-ter): selector de activos, cabecera con cifras y, a todo el ancho (es una
// lista: sus tablas no caben junto a un carril), planeadas, excluidas, cobertura y el paquete de
// ejecución con el alcance y los límites con los que se corre.
import { CONTROLES, ENTORNOS, HERRAMIENTAS, INSTANTANEA, PRUEBAS, REGLAS, archivoDeFicha, fichaDe } from "../datos/catalogo.mjs";
import { ACTIVOS, PRIORIDAD, archivoDeActivo, archivoDePlan } from "../datos/mundo.mjs";
import { huellaDe, planDe } from "../nucleo/calculos.mjs";
import { CARGA, ERROR, ESQUELETO, avisoPrincipal, chip, columnas, dato, destino, enlace, estado, fechado, huella, lista, nombreDe, par, sello } from "../nucleo/componentes.mjs";
import { atributo, neutro, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";
import { seccionDeActivo, selectorDeActivos } from "./activo.mjs";

const MOTIVOS = {
  perfil: { rol: "neutro", simbolo: "no_aplica", nombre: { es: "No aplica", en: "Not applicable" } },
  alcance: { rol: "atencion", simbolo: "aviso", nombre: { es: "Fuera de alcance", en: "Out of scope" } },
  operador: { rol: "acento", simbolo: "firma", nombre: { es: "Quitada por ti", en: "Removed by you" } },
};
const AGREGADA = { rol: "acento", simbolo: "firma", nombre: { es: "Agregada por ti", en: "Added by you" } };
const SIN_PRUEBA = { rol: "atencion", simbolo: "aviso", nombre: { es: "Sin prueba en este plan", en: "No test in this plan" } };
const SIN_PRUEBA_CORTO = { ...SIN_PRUEBA, nombre: { es: "Sin prueba", en: "No test" } };
const AUTORIZADO = { rol: "positivo", simbolo: "ok", nombre: { es: "Alcance y reglas declarados", en: "Scope and rules declared" } };

export const plan = (id) => ({ consulta, umbrales, existentes }) => {
  const a = ACTIVOS[id];
  const fichas = PRUEBAS.map((p) => fichaDe(p.id));
  const calculado = planDe(a, fichas, PRIORIDAD);
  const ficha = (f) => enlace(archivoDeFicha(f.id), t(f.nombre), existentes);
  const base = {
    titulo: { es: `HackGuard · plan · ${a.nombre.es}`, en: `HackGuard · plan · ${a.nombre.en}` },
    seccion: seccionDeActivo(id, archivoDePlan(id)),
    migas: [t({ es: "Activos", en: "Assets" }), t(a.nombre), t({ es: "Plan", en: "Plan" })],
    consulta,
    existentes,
  };

  // ---- Activo sin autorización: no hay plan que mostrar, y la página dice por qué y qué hacer.
  if (!calculado) {
    const contenido = `<div class="hg-pila" data-plan-de="${id}">
${selectorDeActivos(id, archivoDePlan, existentes)}
<div class="hg-cabecera">
<div>
<p class="hg-cabecera-linea">${dato(id)}${chip({ rol: "falla", simbolo: "falla", nombre: { es: "Sin plan", en: "No plan" } })}</p>
<h1>${t({ es: "Plan de pruebas", en: "Test plan" })}</h1>
<p class="hg-bajada">${tHtml({ es: "{a} todavía no puede recibir plan.", en: "{a} cannot receive a plan yet." }, { a: t(a.nombre) })}</p>
</div>
</div>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "Sin autorización no hay plan", en: "No authorization, no plan" } },
  `<p>${tHtml(
    {
      es: "Falta el alcance autorizado y las reglas de enfrentamiento. Decláralos en {a} y vuelve: el plan se calcula solo.",
      en: "The authorized scope and the rules of engagement are missing. Declare them in {a} and come back: the plan is computed automatically.",
    },
    { a: enlace(archivoDeActivo(id), t({ es: "la página del activo", en: "the asset's page" }), existentes) },
  )}</p>`,
)}
</div>`;
    return pagina({
      ...base,
      sala: {
        nota: {
          es: "Mirada 4-ter: el plan de un activo sin autorización (aprobado en el segundo tramo). No existe, y la página lo explica.",
          en: "Review 4-ter: the plan of an asset with no authorization (approved in the second stretch). It does not exist, and the page explains why.",
        },
      },
      contenido,
      revisar: [
        {
          donde: { es: "Aviso rojo", en: "Red notice" },
          hacer: { es: "Léelo y pulsa el enlace", en: "Read it and press the link" },
          ver: { es: "Dice qué falta y lleva a la página del activo, donde se declara", en: "It says what is missing and leads to the asset's page, where it is declared" },
        },
      ],
    });
  }

  const { planeadas, excluidas, ajustes, subida, cobertura, descubiertos, sinControl, otras } = calculado;
  const huellaDelPlan = huellaDe({ plan: a.plan.id, activo: id, instantanea: INSTANTANEA.version, pruebas: planeadas.map((p) => p.ficha.id).join(",") });
  // «+1 por exposición pública y capacidad de acción»: cuánto sube (con su tope) y qué lo sube.
  const enLista = (partes, y) => (partes.length > 1 ? `${partes.slice(0, -1).join(", ")} ${y} ${partes.at(-1)}` : partes[0]);
  const ajuste = ajustes.length ? `+${subida} por ${enLista(ajustes.map((x) => x.razon.es), "y")}` : "";
  const ajusteEn = ajustes.length ? `+${subida} for ${enLista(ajustes.map((x) => x.razon.en), "and")}` : "";

  const filasPlaneadas = planeadas
    .map(({ ficha: f, prioridad, agregada }) => {
      const h = HERRAMIENTAS[f.herramienta];
      const porQue = agregada
        ? `<p>${chip(AGREGADA)}</p><p class="hg-menor">${t({ es: "El perfil no la pide; la agregaste porque:", en: "The profile does not call for it; you added it because:" })} <span data-justificacion>${t(agregada)}</span></p>`
        : `<p class="hg-menor">${t({ es: "Aplica porque:", en: "Applies because:" })} ${t(f.aplicabilidad[0])}</p>`;
      return `<tr data-planeada="${f.id}"${agregada ? " data-agregada" : ""}>
<td data-celda="id">${dato(f.id)}</td>
<td data-celda="principal"><p><strong>${ficha(f)}</strong></p><p>${t(f.resultado_esperado)}</p>${porQue}</td>
<td data-celda="estado"><p><span class="hg-cifra-menor" data-neutro>${prioridad}</span> <span class="hg-menor">${t({ es: "de 5", en: "of 5" })}</span></p><p class="hg-menor">${t(
        ajustes.length ? { es: `Base ${f.prioridad_base}, ${ajuste}`, en: `Base ${f.prioridad_base}, ${ajusteEn}` } : { es: `Base ${f.prioridad_base}, sin ajustes`, en: `Base ${f.prioridad_base}, no adjustments` },
      )}</p></td>
<td><p>${nombreDe(h)}</p><p class="hg-menor">${t(ENTORNOS[h.entorno])}${f.k ? ` · ${neutro(`k = ${f.k}`)}` : ""}</p>${fechado(f.verificada, consulta, umbrales)}</td>
<td>${f.controles.length ? f.controles.map((c) => `<p>${dato(c)}</p>`).join("") : `<p class="hg-menor">${t({ es: "Sin control asignado", en: "No control assigned" })}</p>`}</td>
</tr>`;
    })
    .join("\n");

  const filasExcluidas = excluidas
    .map(
      ({ ficha: f, motivo, razon }) => `<tr data-excluida="${f.id}" data-motivo="${motivo}">
<td data-celda="id">${dato(f.id)}</td>
<td><p>${ficha(f)}</p></td>
<td data-celda="estado">${chip(MOTIVOS[motivo])}</td>
<td><p class="hg-menor">${
        motivo === "perfil" ? `${t({ es: "El perfil no declara esta condición:", en: "The profile does not declare this condition:" })} ${t(f.aplicabilidad[0])}` : t(razon)
      }</p></td>
</tr>`,
    )
    .join("\n");

  const controles = [...new Set([...cobertura.keys(), ...descubiertos])].sort();
  const filasCobertura = controles
    .map((c) => {
      const pruebas = cobertura.get(c) ?? [];
      return `<tr>
<td data-celda="id">${dato(c)}</td>
<td><p>${t(CONTROLES[c])}</p></td>
<td data-celda="estado">${
        pruebas.length
          ? estado({ rol: "positivo", simbolo: "ok", nombre: { es: pruebas.length === 1 ? "1 prueba" : `${pruebas.length} pruebas`, en: pruebas.length === 1 ? "1 test" : `${pruebas.length} tests` } })
          : chip(SIN_PRUEBA_CORTO)
      }</td>
<td>${
        pruebas.length
          ? `<p>${pruebas.map((p) => enlace(archivoDeFicha(p), dato(p), existentes)).join(" · ")}</p>`
          : `<p class="hg-menor">${t({ es: "Las pruebas que lo cubrían quedaron fuera de este plan.", en: "The tests that covered it were left out of this plan." })}</p>`
      }</td>
</tr>`;
    })
    .join("\n");

  // Paquete de ejecución: una caja por herramienta, con lo que cada una necesita para correr afuera.
  const porHerramienta = new Map();
  for (const { ficha: f } of planeadas) porHerramienta.set(f.herramienta, [...(porHerramienta.get(f.herramienta) ?? []), f]);
  const paquete = [...porHerramienta.entries()]
    .map(([clave, suyas]) => {
      const h = HERRAMIENTAS[clave];
      const lineas = suyas
        .map((f) => {
          const regla = REGLAS[f.regla];
          const partes = [dato(f.id)];
          if (f.selector) partes.push(dato(f.selector));
          if (f.k) partes.push(dato(`k = ${f.k}`));
          if (regla.cota) partes.push(`<span class="hg-menor">${t({ es: "umbral de fallida: 100 por mil", en: "failure threshold: 100 per thousand" })}</span>`);
          return `<li>${partes.join(" · ")}</li>`;
        })
        .join("");
      return `<li class="hg-caja">
<p class="hg-caja-titulo">${nombreDe(h)}</p>
<dl class="hg-propiedades">
${h.version_minima ? par({ es: "Versión mínima", en: "Minimum version" }, dato(h.version_minima)) : ""}
${par({ es: "Dónde corre", en: "Where it runs" }, `<span>${t(ENTORNOS[h.entorno])}</span>`)}
${par({ es: "Cómo vuelve el resultado", en: "How the result comes back" }, `<span>${t(h.adaptador ? { es: "Por su adaptador", en: "Through its adapter" } : { es: "Texto pegado o carga manual", en: "Pasted text or manual entry" })}</span>`)}
${par({ es: "Pruebas", en: "Tests" }, `<ul class="hg-lista hg-lista-datos">${lineas}</ul>`)}
</dl>
</li>`;
    })
    .join("\n");

  const contenido = `<div class="hg-pila" data-si="datos" data-plan-de="${id}">
${selectorDeActivos(id, archivoDePlan, existentes)}
<div class="hg-cabecera">
<div>
<p class="hg-cabecera-linea">${dato(a.plan.id)}${chip(AUTORIZADO)}</p>
<h1>${t({ es: "Plan de pruebas", en: "Test plan" })}</h1>
<p class="hg-bajada">${tHtml(
    {
      es: "{a}: las pruebas que le aplican según su perfil, dentro de lo que su dueño autorizó.",
      en: "{a}: the tests that apply given its profile, within what its owner authorized.",
    },
    { a: t(a.nombre) },
  )}</p>
<p class="hg-cabecera-meta"><span>${t({ es: "Activo", en: "Asset" })} ${enlace(archivoDeActivo(id), dato(id), existentes)}</span><span>${t({ es: "Instantánea", en: "Snapshot" })} ${dato(INSTANTANEA.version)}</span><span>${t({ es: "Emitido", en: "Issued" })} ${dato(a.plan.fecha)}</span><span>${huella(huellaDelPlan)}</span></p>
</div>
<ul class="hg-resumen" ${atributo("aria-label", { es: "Resumen del plan", en: "Plan summary" })}>
<li><span class="hg-cifra" data-neutro>${planeadas.length}</span><span>${t({ es: "planeadas", en: "planned" })}</span></li>
<li><span class="hg-cifra" data-neutro>${excluidas.length}</span><span>${t({ es: "excluidas", en: "excluded" })}</span></li>
<li><span class="hg-cifra" data-neutro>${cobertura.size}</span>${estado({ rol: "positivo", simbolo: "ok", nombre: { es: "controles con prueba", en: "controls with a test" } })}</li>
<li><span class="hg-cifra" data-neutro>${descubiertos.length}</span>${estado({ ...SIN_PRUEBA, nombre: { es: "sin prueba", en: "with no test" } })}</li>
</ul>
</div>

<section class="hg-panel" aria-labelledby="planeadas">
<div class="hg-panel-cab"><h2 id="planeadas">${t({ es: "Pruebas planeadas", en: "Planned tests" })}</h2><p class="hg-menor">${t({
    es: "De mayor a menor prioridad: la base de la prueba más lo que el perfil del activo le suma.",
    en: "From highest to lowest priority: the test's base plus what the asset's profile adds.",
  })}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Pruebas planeadas", en: "Planned tests" })}</caption>
${columnas([
  { es: "Prueba", en: "Test" },
  { es: "Qué se espera y por qué aplica", en: "What is expected and why it applies" },
  { es: "Prioridad", en: "Priority" },
  { es: "Herramienta", en: "Tool" },
  { es: "Controles", en: "Controls" },
])}
<tbody>
${filasPlaneadas}
</tbody>
</table>
</section>

<section class="hg-panel" aria-labelledby="excluidas">
<div class="hg-panel-cab"><h2 id="excluidas">${t({ es: "Excluidas, con su razón", en: "Excluded, with a reason" })}</h2><p class="hg-menor">${tHtml(
    {
      es: "Ninguna prueba de las familias del activo desaparece sin explicación. Las {n} de otras familias no se consideran.",
      en: "No test from the asset's families disappears without an explanation. The {n} from other families are not considered.",
    },
    { n: neutro(String(otras)) },
  )}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Pruebas excluidas", en: "Excluded tests" })}</caption>
${columnas([
  { es: "Prueba", en: "Test" },
  { es: "Nombre", en: "Name" },
  { es: "Motivo", en: "Reason" },
  { es: "Por qué queda fuera", en: "Why it is left out" },
])}
<tbody>
${filasExcluidas}
</tbody>
</table>
</section>

<section class="hg-panel" aria-labelledby="cobertura">
<div class="hg-panel-cab"><h2 id="cobertura">${t({ es: "Cobertura esperada por control", en: "Expected coverage by control" })}</h2><p class="hg-menor">${tHtml(
    {
      es: "Qué controles tendrán evidencia cuando el plan se ejecute. {n} pruebas del plan no dan evidencia a ningún control.",
      en: "Which controls will have evidence once the plan runs. {n} tests in the plan give evidence to no control.",
    },
    { n: neutro(String(sinControl.length)) },
  )}</p></div>
<table class="hg-tabla">
<caption class="hg-oculto">${t({ es: "Cobertura por control", en: "Coverage by control" })}</caption>
${columnas([
  { es: "Control", en: "Control" },
  { es: "Qué exige, con palabras propias", en: "What it requires, in our own words" },
  { es: "Cobertura", en: "Coverage" },
  { es: "Pruebas del plan", en: "Tests in the plan" },
])}
<tbody>
${filasCobertura}
</tbody>
</table>
</section>

<section class="hg-panel" aria-labelledby="paquete">
<div class="hg-panel-cab"><h2 id="paquete">${t({ es: "Paquete de ejecución", en: "Execution package" })}</h2><p class="hg-menor">${t({
    es: "Declarativo: dice qué correr y con qué límites, y no trae ninguna carga.",
    en: "Declarative: it says what to run and within which limits, and carries no payload.",
  })}</p></div>
<div class="hg-panel-cuerpo">
<ul class="hg-rejilla">
${paquete}
</ul>
</div>
<div class="hg-panel-cuerpo">
<div class="hg-contraste">
<div>
<p class="hg-rotulo">${t({ es: "Alcance y límites", en: "Scope and limits" })}</p>
<dl class="hg-propiedades">
${par({ es: "Cuándo", en: "When" }, `<span>${t(a.alcance.ventana)}</span>`)}
${par({ es: "Límites de carga", en: "Load limits" }, `<span>${t(a.alcance.limites)}</span>`)}
</dl>
</div>
<div>
<p class="hg-rotulo">${t({ es: "Reglas de enfrentamiento", en: "Rules of engagement" })}</p>
${lista(a.reglas)}
</div>
</div>
</div>
<div class="hg-decision">
<p class="hg-menor">${t({
    es: "Corre las pruebas con tus herramientas, dentro de estos límites. Los resultados vuelven por la carga de evidencia.",
    en: "Run the tests with your tools, within these limits. Results come back through evidence intake.",
  })}</p>
<a class="hg-boton hg-boton-primario" href="${destino("evidencia.html", existentes)}">${t({ es: "Ir a la carga de evidencia", en: "Go to evidence intake" })}</a>
</div>
</section>
</div>

<div class="hg-aviso es-neutro" data-si="vacio">
<h1>${t({ es: "Este activo todavía no tiene plan", en: "This asset has no plan yet" })}</h1>
<p>${t({
    es: "Ya tiene alcance y reglas, así que se puede planear. El plan cruza su perfil con el catálogo vigente; el mismo perfil y la misma instantánea dan siempre el mismo plan.",
    en: "It already has a scope and rules, so it can be planned. The plan matches its profile against the current catalog; the same profile and the same snapshot always give the same plan.",
  })}</p>
<button type="button" class="hg-boton hg-boton-primario" data-controlador="estado" data-valor="datos">${t({ es: "Emitir el plan", en: "Issue the plan" })}</button>
</div>

${avisoPrincipal(
  "carga",
  CARGA,
  { es: "Planeando", en: "Planning" },
  `<p>${t({ es: "Se cruza el perfil del activo con cada prueba del catálogo.", en: "The asset's profile is matched against each catalog test." })}</p>${ESQUELETO}`,
)}

${avisoPrincipal(
  "error",
  ERROR,
  { es: "El plan no se pudo emitir", en: "The plan could not be issued" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "La instantánea del catálogo no coincide con su huella", en: "The catalog snapshot does not match its fingerprint" } },
    `<p>${t({
      es: "Algún archivo del catálogo cambió sin guardar una instantánea nueva. Un plan sobre un catálogo que no se puede identificar no sería reproducible: guarda la instantánea y vuelve a planear.",
      en: "Some catalog file changed without a new snapshot being saved. A plan on a catalog that cannot be identified would not be reproducible: save the snapshot and plan again.",
    })}</p>`,
  ),
)}`;

  return pagina({
    ...base,
    sala: {
      nota: {
        es: "Mirada 4-ter: el plan de un activo con la interfaz nueva (aprobado en el segundo tramo). La fórmula de prioridad es ilustrativa; la definitiva se fija en el sprint del planificador.",
        en: "Review 4-ter: an asset's plan with the new interface (approved in the second stretch). The priority formula is illustrative; the final one is set in the planner's sprint.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Pruebas planeadas", en: "Planned tests" },
        hacer: { es: "Lee una fila completa", en: "Read one full row" },
        ver: { es: "Dice qué se espera, por qué aplica, con qué prioridad y con qué herramienta", en: "It says what is expected, why it applies, at what priority and with which tool" },
      },
      {
        donde: { es: "Fila de PR-SW-CLK-001 (plan del asistente)", en: "PR-SW-CLK-001 row (assistant's plan)" },
        hacer: { es: "Léela", en: "Read it" },
        ver: { es: "Lleva «Agregada por ti» y dice por qué: el perfil no la pedía", en: "It carries “Added by you” and says why: the profile did not call for it" },
      },
      {
        donde: { es: "Excluidas", en: "Excluded" },
        hacer: { es: "Compara los motivos", en: "Compare the reasons" },
        ver: { es: "Se distinguen tres motivos por su marca y su texto: no aplica, fuera de alcance y quitada por ti", en: "Three reasons are told apart by mark and text: not applicable, out of scope and removed by you" },
      },
      {
        donde: { es: "Cobertura por control", en: "Coverage by control" },
        hacer: { es: "Busca un control sin prueba", en: "Find a control with no test" },
        ver: { es: "Resalta, con la explicación al lado", en: "It stands out, with the explanation next to it" },
      },
      {
        donde: { es: "Paquete de ejecución", en: "Execution package" },
        hacer: { es: "Léelo buscando instrucciones de ataque", en: "Read it looking for attack instructions" },
        ver: { es: "No hay: solo herramienta, versión, selector, repeticiones y límites", en: "There are none: only tool, version, selector, repetitions and limits" },
      },
      {
        donde: { es: "Botón «Vacío» de la sala", en: "The room's “Empty” button" },
        hacer: { es: "Púlsalo y luego «Emitir el plan»", en: "Press it and then “Issue the plan”" },
        ver: { es: "El estado vacío dice qué hacer y el botón lleva al plan", en: "The empty state says what to do and the button leads to the plan" },
      },
    ],
  });
};
