// activo-<id>.html — pantalla 7 (C8). Un activo: quién es su dueño y quién su proveedor, su perfil (de
// ahí sale qué pruebas aplican), el alcance autorizado y las reglas de enfrentamiento. Hay UNA PÁGINA
// POR ACTIVO: sin alcance y reglas no hay plan, y el tercer activo demo muestra justo ese estado.
// Dirección «consola» (mirada 4-ter): selector de los tres activos, cabecera con su estado, paneles al
// centro y, en el carril, el plan (o por qué no lo hay) y sus propiedades.
import { FAMILIAS } from "../datos/catalogo.mjs";
import { ACCESO, ACTIVOS, DATOS, EXPOSICION, PLANTILLA, archivoDeActivo, archivoDePlan } from "../datos/mundo.mjs";
import { CARGA, ERROR, ESQUELETO, VACIO, aviso, chip, dato, enlace, fechado, lista, par, sello, selectorDeObjetos } from "../nucleo/componentes.mjs";
import { ESTADO_DE_ACTIVO } from "../nucleo/estados.mjs";
import { atributo, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const AUTORIZADO = { rol: "positivo", simbolo: "ok", nombre: { es: "Alcance y reglas declarados", en: "Scope and rules declared" } };
const SIN_AUTORIZAR = { rol: "falla", simbolo: "falla", nombre: { es: "Sin autorización no hay plan", en: "No authorization, no plan" } };
const SIN_DECLARAR = { rol: "falla", simbolo: "falla", nombre: { es: "Sin declarar", en: "Not declared" } };

/** Selector de los tres activos: va arriba, porque «Activo» y «Plan» son del activo abierto. */
export function selectorDeActivos(actual, archivoDe, existentes) {
  return selectorDeObjetos(
    { es: "Activos registrados", en: "Registered assets" },
    Object.entries(ACTIVOS).map(([id, a]) => ({ archivo: archivoDe(id), titulo: t(a.nombre), nota: t(ESTADO_DE_ACTIVO[a.estado].nombre), actual: id === actual })),
    existentes,
  );
}

export const seccionDeActivo = (id, archivo) => ({
  id: "activos",
  archivo,
  paginas: [
    { archivo: archivoDeActivo(id), nombre: { es: "Activo", en: "Asset" } },
    { archivo: archivoDePlan(id), nombre: { es: "Plan", en: "Plan" } },
  ],
});

export const activo = (id) => ({ consulta, umbrales, existentes }) => {
  const a = ACTIVOS[id];
  const autorizado = Boolean(a.alcance && a.reglas);

  const bloqueo = autorizado
    ? ""
    : sello(
        SIN_AUTORIZAR,
        `<p>${t({
          es: "Este activo no tiene alcance autorizado ni reglas de enfrentamiento, así que no puede recibir plan. Decláralos con su dueño, o aplica la plantilla para activos propios y ajústala.",
          en: "This asset has no authorized scope and no rules of engagement, so it cannot receive a plan. Declare them with its owner, or apply the template for own assets and adjust it.",
        })}</p>`,
      );

  const proveedor = a.proveedor
    ? `<p class="hg-rotulo">${t({ es: "Proveedor", en: "Provider" })}</p>
<p class="hg-caja-titulo">${t(a.proveedor.nombre)}</p>
<p>${t(a.proveedor.provee)}</p>
${
  a.proveedor.politica
    ? `<p class="hg-rotulo">${t({ es: "Su política", en: "Its policy" })}</p><p>${t(a.proveedor.politica)}</p><p class="hg-menor">${t(a.proveedor.politica_fuente)}</p>${fechado(a.proveedor.politica_verificada, consulta, umbrales, { es: "Leída", en: "Read" })}`
    : `<p>${chip({ rol: "atencion", simbolo: "aviso", nombre: { es: "Política sin leer", en: "Policy not read" } })}</p><p class="hg-menor">${t({
        es: "Las reglas de enfrentamiento tienen que citar lo que el proveedor permite.",
        en: "The rules of engagement must cite what the provider allows.",
      })}</p>`
}`
    : `<p class="hg-rotulo">${t({ es: "Proveedor", en: "Provider" })}</p><p>${t({ es: "Ninguno: todo el activo es del dueño.", en: "None: the whole asset belongs to the owner." })}</p>`;

  const alcance = autorizado
    ? `<div class="hg-panel-cuerpo">
<div class="hg-contraste">
<div><p class="hg-rotulo">${t({ es: "Se puede probar", en: "May be tested" })}</p>${lista(a.alcance.incluye)}</div>
<div><p class="hg-rotulo">${t({ es: "No se puede probar", en: "May not be tested" })}</p>${lista(a.alcance.excluye)}</div>
</div>
<dl class="hg-propiedades hg-propiedades-en-columnas">
${par({ es: "Cuándo", en: "When" }, `<span>${t(a.alcance.ventana)}</span>`)}
${par({ es: "Límites de carga", en: "Load limits" }, `<span>${t(a.alcance.limites)}</span>`)}
</dl>
</div>`
    : `<div class="hg-panel-cuerpo">
<p>${chip(SIN_DECLARAR)}</p>
<div>
<button type="button" class="hg-boton" data-controlador="alternar" aria-pressed="false">${t({ es: "Ver la plantilla para activos propios", en: "See the template for own assets" })}</button>
<div class="hg-revelado">
<div class="hg-contraste">
<div><p class="hg-rotulo">${t({ es: "Alcance de la plantilla", en: "Template scope" })}</p>${lista(PLANTILLA.alcance)}</div>
<div><p class="hg-rotulo">${t({ es: "Reglas de la plantilla", en: "Template rules" })}</p>${lista(PLANTILLA.reglas)}</div>
</div>
<p class="hg-menor">${t({
        es: "Se aplica en un paso y se ajusta después. Solo vale para activos propios: en uno ajeno, el alcance lo declara su dueño.",
        en: "It is applied in one step and adjusted afterwards. It is only valid for own assets: for someone else's, the owner declares the scope.",
      })}</p>
</div>
</div>
</div>`;

  const reglas = autorizado
    ? `<ol class="hg-lista">${a.reglas
        .map((r) => `<li>${t(r)}${r.cita_proveedor ? ` <span class="hg-menor">${t({ es: "· cita la política del proveedor", en: "· cites the provider's policy" })}</span>` : ""}</li>`)
        .join("")}</ol>`
    : `<p>${chip(SIN_DECLARAR)}</p>`;

  // Carril: el plan, o por qué no lo hay. La acción es abrirlo (o declarar lo que falta).
  const plan = a.plan
    ? `<p>${chip(AUTORIZADO)}</p>
<p>${enlace(archivoDePlan(id), dato(a.plan.id), existentes)} <span class="hg-menor">${t({ es: "emitido el", en: "issued on" })} ${dato(a.plan.fecha)}</span></p>
<a class="hg-boton hg-boton-primario" href="${archivoDePlan(id)}">${t({ es: "Abrir el plan", en: "Open the plan" })}</a>`
    : `<p>${chip({ ...SIN_AUTORIZAR, nombre: { es: "Falta alcance y reglas", en: "Scope and rules missing" } })}</p>
<p class="hg-menor">${t({ es: "Cuando el dueño los declare, el plan se calcula solo desde el perfil.", en: "Once the owner declares them, the plan is computed from the profile." })}</p>`;

  const contenido = `<div class="hg-pila" data-si="datos" data-activo="${id}" data-autorizado="${autorizado}">
${selectorDeActivos(id, archivoDeActivo, existentes)}
<div class="hg-cabecera">
<div>
<p class="hg-cabecera-linea">${dato(id)}${chip(ESTADO_DE_ACTIVO[a.estado])}</p>
<h1>${t(a.nombre)}</h1>
<p class="hg-bajada">${t(a.descripcion)}</p>
</div>
</div>
${bloqueo}

<div class="hg-trabajo">
<div class="hg-pila">
<section class="hg-panel" aria-labelledby="quien">
<div class="hg-panel-cab"><h2 id="quien">${t({ es: "Dueño y proveedor", en: "Owner and provider" })}</h2></div>
<div class="hg-panel-cuerpo">
<p class="hg-menor">${t({
    es: "No son lo mismo: el dueño autoriza las pruebas sobre lo suyo; el proveedor pone sus propias condiciones sobre lo que presta. Nada se planea contra la infraestructura de un tercero.",
    en: "They are not the same: the owner authorizes tests on what is theirs; the provider sets its own conditions on what it supplies. Nothing is planned against a third party's infrastructure.",
  })}</p>
<div class="hg-contraste">
<div><p class="hg-rotulo">${t({ es: "Dueño", en: "Owner" })}</p><p class="hg-caja-titulo">${t(a.dueno.nombre)}</p><p>${t(a.dueno.nota)}</p></div>
<div>${proveedor}</div>
</div>
</div>
</section>

<section class="hg-panel" aria-labelledby="perfil">
<div class="hg-panel-cab"><h2 id="perfil">${t({ es: "Perfil", en: "Profile" })}</h2><p class="hg-menor">${t({
    es: "Del perfil sale qué pruebas aplican.",
    en: "The profile determines which tests apply.",
  })}</p></div>
<div class="hg-panel-cuerpo">
<dl class="hg-propiedades hg-propiedades-en-columnas">
${par({ es: "Cómo está hecho", en: "How it is built" }, `<span>${t(a.perfil.pila)}</span>`)}
${par({ es: "Modelos que consume", en: "Models it uses" }, `<span>${t(a.perfil.modelos)}</span>`)}
${par({ es: "Exposición", en: "Exposure" }, `<span>${t(EXPOSICION[a.perfil.exposicion])}</span>`)}
${par({ es: "Datos que maneja", en: "Data it handles" }, `<span>${t(DATOS[a.perfil.datos])}</span>`)}
${par({ es: "Autenticación", en: "Authentication" }, `<span>${t(a.perfil.autenticacion)}</span>`)}
${par({ es: "Tipo de acceso", en: "Access type" }, `<span>${t(ACCESO[a.acceso])}</span>`)}
${par({ es: "Por dónde recibe entrada", en: "Where input comes in" }, lista(a.perfil.canales))}
${par({ es: "Qué puede hacer", en: "What it can do" }, lista(a.perfil.acciones))}
</dl>
</div>
</section>

<section class="hg-panel" aria-labelledby="alcance">
<div class="hg-panel-cab"><h2 id="alcance">${t({ es: "Alcance autorizado", en: "Authorized scope" })}</h2></div>
${alcance}
</section>

<section class="hg-panel" aria-labelledby="reglas">
<div class="hg-panel-cab"><h2 id="reglas">${t({ es: "Reglas de enfrentamiento", en: "Rules of engagement" })}</h2><p class="hg-menor">${t({
    es: "Las declara el dueño. El plan las lleva en su paquete de ejecución.",
    en: "The owner declares them. The plan carries them in its execution package.",
  })}</p></div>
<div class="hg-panel-cuerpo">
${reglas}
</div>
</section>
</div>

<aside class="hg-carril" ${atributo("aria-label", { es: `Plan y propiedades de ${id}`, en: `Plan and properties of ${id}` })}>
<section class="hg-tarjeta hg-tarjeta-accion" aria-labelledby="plan">
<h2 class="hg-tarjeta-titulo" id="plan">${t({ es: "Plan de pruebas", en: "Test plan" })}</h2>
${plan}
</section>
<section class="hg-tarjeta" aria-labelledby="propiedades">
<h2 class="hg-tarjeta-titulo" id="propiedades">${t({ es: "Propiedades", en: "Properties" })}</h2>
<dl class="hg-propiedades">
${par({ es: "Estado", en: "Status" }, `<span>${t(ESTADO_DE_ACTIVO[a.estado].nombre)}</span>`)}
${par({ es: "Familias", en: "Families" }, a.familias.map((f) => `<span>${t(FAMILIAS[f])}</span>`).join(""))}
${par({ es: "Acceso", en: "Access" }, `<span>${t(ACCESO[a.acceso])}</span>`)}
</dl>
</section>
</aside>
</div>
</div>

${aviso(
  "vacio",
  VACIO,
  { es: "No hay activos registrados", en: "No assets registered" },
  `<p>${t({
    es: "Registra el primero con su perfil, su dueño, su alcance autorizado y sus reglas de enfrentamiento. Sin eso no se puede planear nada.",
    en: "Register the first one with its profile, its owner, its authorized scope and its rules of engagement. Without that nothing can be planned.",
  })}</p>`,
)}

${aviso("carga", CARGA, { es: "Abriendo el activo", en: "Opening the asset" }, ESQUELETO)}

${aviso(
  "error",
  ERROR,
  { es: "El activo no se pudo abrir", en: "The asset could not be opened" },
  sello(
    { rol: "falla", simbolo: "falla", nombre: { es: "El perfil no pasa su esquema", en: "The profile does not pass its schema" } },
    `<p>${tHtml(
      {
        es: "Falta el campo {c}. Un activo sin dueño no puede autorizar pruebas: complétalo en su archivo y vuelve a cargar.",
        en: "Field {c} is missing. An asset without an owner cannot authorize tests: complete it in its file and load again.",
      },
      { c: dato("dueno") },
    )}</p>`,
  ),
)}`;

  return pagina({
    titulo: { es: `HackGuard · ${a.nombre.es}`, en: `HackGuard · ${a.nombre.en}` },
    seccion: seccionDeActivo(id, archivoDeActivo(id)),
    migas: [t({ es: "Activos", en: "Assets" }), t(a.nombre)],
    consulta,
    existentes,
    sala: {
      nota: {
        es: "Mirada 4-ter: un activo con la interfaz nueva (aprobado en el segundo tramo). Los tres activos son demos ficticios; el tercero no tiene autorización, para que se vea ese estado.",
        en: "Review 4-ter: an asset with the new interface (approved in the second stretch). All three assets are fictional demos; the third has no authorization, to show that state.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Selector de arriba", en: "The selector at the top" },
        hacer: { es: "Abre los tres activos", en: "Open all three assets" },
        ver: { es: "Cada uno muestra lo suyo; el portal dice arriba que sin autorización no hay plan", en: "Each one shows its own data; the portal says at the top that without authorization there is no plan" },
      },
      {
        donde: { es: "Dueño y proveedor", en: "Owner and provider" },
        hacer: { es: "Compara las dos cajas del asistente", en: "Compare the assistant's two boxes" },
        ver: { es: "Se entiende quién autoriza y qué permite el proveedor, y son cosas distintas", en: "It is clear who authorizes and what the provider allows, and that they are different things" },
      },
      {
        donde: { es: "Alcance y reglas", en: "Scope and rules" },
        hacer: { es: "Lee qué se puede probar y qué no", en: "Read what may and may not be tested" },
        ver: { es: "Lo prohibido se lee tan claro como lo permitido; una regla cita la política del proveedor", en: "What is forbidden reads as clearly as what is allowed; one rule cites the provider's policy" },
      },
      {
        donde: { es: "Carril de la derecha", en: "Right-hand rail" },
        hacer: { es: "Pulsa «Abrir el plan»", en: "Press “Open the plan”" },
        ver: { es: "Se abre el plan de ESTE activo; el portal no tiene botón, dice qué falta", en: "THIS asset's plan opens; the portal has no button, it says what is missing" },
      },
      {
        donde: { es: "Portal demo · Alcance", en: "Demo portal · Scope" },
        hacer: { es: "Pulsa «Ver la plantilla para activos propios»", en: "Press “See the template for own assets”" },
        ver: { es: "Aparece la plantilla y dice que solo vale para activos propios", en: "The template appears and says it is only valid for own assets" },
      },
    ],
  });
};
