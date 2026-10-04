// activo-<id>.html — pantalla 7 (C8). Un activo: quién es su dueño y quién su proveedor, su perfil (de
// ahí sale qué pruebas aplican), el alcance autorizado y las reglas de enfrentamiento. Hay UNA PÁGINA
// POR ACTIVO: sin alcance y reglas no hay plan, y el tercer activo demo muestra justo ese estado.
import { FAMILIAS } from "../datos/catalogo.mjs";
import { ACCESO, ACTIVOS, DATOS, EXPOSICION, PLANTILLA, archivoDeActivo, archivoDePlan } from "../datos/mundo.mjs";
import { dato, enlace, estado, fechado, lista, par, sello } from "../nucleo/componentes.mjs";
import { ESTADO_DE_ACTIVO } from "../nucleo/estados.mjs";
import { atributo, t, tHtml } from "../nucleo/html.mjs";
import { barraDeEstados, pagina } from "../nucleo/pagina.mjs";

const AUTORIZADO = { rol: "positivo", simbolo: "ok", nombre: { es: "Alcance y reglas declarados", en: "Scope and rules declared" } };
const SIN_AUTORIZAR = { rol: "falla", simbolo: "falla", nombre: { es: "Sin autorización no hay plan", en: "No authorization, no plan" } };

/** Conmutador entre los activos: va antes de la subnavegación, porque «Activo» y «Plan» son del activo abierto. */
export function conmutadorDeActivos(actual, archivoDe, existentes) {
  const items = Object.entries(ACTIVOS)
    .map(([id, a]) => {
      const archivo = archivoDe(id);
      if (!existentes.includes(archivo)) return `<li><span>${t(a.nombre)}</span></li>`;
      return `<li><a href="${archivo}"${id === actual ? ' aria-current="true"' : ""}>${t(a.nombre)}</a></li>`;
    })
    .join("");
  return `<nav class="hg-conmutador" ${atributo("aria-label", { es: "Activos registrados", en: "Registered assets" })}><span class="hg-menor">${t({ es: "Activo", en: "Asset" })}</span><ul>${items}</ul></nav>\n`;
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

  const resumen = `<dl class="hg-ficha">
${par({ es: "Estado", en: "Status" }, estado(ESTADO_DE_ACTIVO[a.estado]))}
${par({ es: "Familias", en: "Families" }, a.familias.map((f) => t(FAMILIAS[f])).join(" · "))}
${par({ es: "Tipo de acceso", en: "Access type" }, t(ACCESO[a.acceso]))}
${par({ es: "Autorización", en: "Authorization" }, estado(autorizado ? AUTORIZADO : { ...SIN_AUTORIZAR, nombre: { es: "Falta alcance y reglas", en: "Scope and rules missing" } }))}
${par(
  { es: "Plan", en: "Plan" },
  a.plan
    ? `${enlace(archivoDePlan(id), dato(a.plan.id), existentes)} <span class="hg-menor">· ${t({ es: "emitido el", en: "issued on" })} ${dato(a.plan.fecha)}</span>`
    : `<span class="hg-menor">${t({ es: "Ninguno", en: "None" })}</span>`,
)}
</dl>`;

  const bloqueo = autorizado
    ? ""
    : `<div class="hg-avisos">${sello(
        SIN_AUTORIZAR,
        `<p>${t({
          es: "Este activo no tiene alcance autorizado ni reglas de enfrentamiento, así que no puede recibir plan. Decláralos con su dueño, o aplica la plantilla para activos propios y ajústala.",
          en: "This asset has no authorized scope and no rules of engagement, so it cannot receive a plan. Declare them with its owner, or apply the template for own assets and adjust it.",
        })}</p>`,
      )}</div>`;

  const proveedor = a.proveedor
    ? `<dl class="hg-ficha">
${par({ es: "Proveedor", en: "Provider" }, `<strong>${t(a.proveedor.nombre)}</strong><p>${t(a.proveedor.provee)}</p>`)}
${par(
  { es: "Su política", en: "Its policy" },
  a.proveedor.politica
    ? `<p>${t(a.proveedor.politica)}</p><p class="hg-menor">${t(a.proveedor.politica_fuente)}</p><p>${fechado(a.proveedor.politica_verificada, consulta, umbrales, { es: "leída", en: "read" })}</p>`
    : `<p>${estado({ rol: "atencion", simbolo: "aviso", nombre: { es: "Sin leer todavía", en: "Not read yet" } })}</p><p class="hg-menor">${t({
        es: "Las reglas de enfrentamiento tienen que citar lo que el proveedor permite.",
        en: "The rules of engagement must cite what the provider allows.",
      })}</p>`,
)}
</dl>`
    : `<dl class="hg-ficha">
${par({ es: "Proveedor", en: "Provider" }, `<p>${t({ es: "Ninguno: todo el activo es del dueño.", en: "None: the whole asset belongs to the owner." })}</p>`)}
</dl>`;

  const perfil = `<dl class="hg-ficha">
${par({ es: "Cómo está hecho", en: "How it is built" }, `<p>${t(a.perfil.pila)}</p>`)}
${par({ es: "Exposición", en: "Exposure" }, t(EXPOSICION[a.perfil.exposicion]))}
${par({ es: "Autenticación", en: "Authentication" }, `<p>${t(a.perfil.autenticacion)}</p>`)}
${par({ es: "Datos que maneja", en: "Data it handles" }, t(DATOS[a.perfil.datos]))}
${par({ es: "Modelos que consume", en: "Models it uses" }, `<p>${t(a.perfil.modelos)}</p>`)}
${par({ es: "Por dónde recibe entrada", en: "Where input comes in" }, lista(a.perfil.canales))}
${par({ es: "Qué puede hacer", en: "What it can do" }, lista(a.perfil.acciones))}
</dl>`;

  const alcance = autorizado
    ? `<dl class="hg-ficha">
${par({ es: "Se puede probar", en: "May be tested" }, lista(a.alcance.incluye))}
${par({ es: "No se puede probar", en: "May not be tested" }, lista(a.alcance.excluye))}
${par({ es: "Cuándo", en: "When" }, `<p>${t(a.alcance.ventana)}</p>`)}
${par({ es: "Límites de carga", en: "Load limits" }, `<p>${t(a.alcance.limites)}</p>`)}
</dl>`
    : `<p>${estado({ rol: "falla", simbolo: "falla", nombre: { es: "Sin declarar", en: "Not declared" } })}</p>
<button type="button" class="hg-boton" data-controlador="alternar" aria-pressed="false">${t({ es: "Ver la plantilla para activos propios", en: "See the template for own assets" })}</button>
<div class="hg-revelado">
<dl class="hg-ficha">
${par({ es: "Alcance de la plantilla", en: "Template scope" }, lista(PLANTILLA.alcance))}
${par({ es: "Reglas de la plantilla", en: "Template rules" }, lista(PLANTILLA.reglas))}
</dl>
<p class="hg-menor">${t({
        es: "Se aplica en un paso y se ajusta después. Solo vale para activos propios: en uno ajeno, el alcance lo declara su dueño.",
        en: "It is applied in one step and adjusted afterwards. It is only valid for own assets: for someone else's, the owner declares the scope.",
      })}</p>
</div>`;

  const reglas = autorizado
    ? `<ol class="hg-lista">${a.reglas
        .map((r) => `<li>${t(r)}${r.cita_proveedor ? ` <span class="hg-menor">${t({ es: "· cita la política del proveedor", en: "· cites the provider's policy" })}</span>` : ""}</li>`)
        .join("")}</ol>`
    : `<p>${estado({ rol: "falla", simbolo: "falla", nombre: { es: "Sin declarar", en: "Not declared" } })}</p>`;

  const contenido = `<div data-si="datos" data-activo="${id}" data-autorizado="${autorizado}">
<div class="hg-encabezado">
<div>
<p>${dato(id)}</p>
<h1>${t(a.nombre)}</h1>
<p class="hg-entrada">${t(a.descripcion)}</p>
</div>
${resumen}
</div>
${bloqueo}

<section class="hg-seccion" aria-labelledby="quien">
<h2 id="quien">${t({ es: "Dueño y proveedor", en: "Owner and provider" })}</h2>
<p class="hg-intro">${t({
    es: "No son lo mismo: el dueño autoriza las pruebas sobre lo suyo; el proveedor pone sus propias condiciones sobre lo que presta. Nada se planea contra la infraestructura de un tercero.",
    en: "They are not the same: the owner authorizes tests on what is theirs; the provider sets its own conditions on what it supplies. Nothing is planned against a third party's infrastructure.",
  })}</p>
<div class="hg-dos">
<dl class="hg-ficha">
${par({ es: "Dueño", en: "Owner" }, `<strong>${t(a.dueno.nombre)}</strong><p>${t(a.dueno.nota)}</p>`)}
</dl>
${proveedor}
</div>
</section>

<section class="hg-seccion" aria-labelledby="perfil">
<h2 id="perfil">${t({ es: "Perfil", en: "Profile" })}</h2>
<p class="hg-intro">${t({
    es: "Del perfil sale qué pruebas aplican: cada prueba del catálogo declara qué condición del activo la activa.",
    en: "The profile determines which tests apply: each catalog test declares which condition of the asset activates it.",
  })}</p>
${perfil}
</section>

<section class="hg-seccion" aria-labelledby="alcance">
<h2 id="alcance">${t({ es: "Alcance autorizado", en: "Authorized scope" })}</h2>
${alcance}
</section>

<section class="hg-seccion" aria-labelledby="reglas">
<h2 id="reglas">${t({ es: "Reglas de enfrentamiento", en: "Rules of engagement" })}</h2>
<p class="hg-intro">${t({
    es: "Condiciones y prohibiciones que declara el dueño. El plan las lleva en su paquete de ejecución.",
    en: "Conditions and prohibitions the owner declares. The plan carries them in its execution package.",
  })}</p>
${reglas}
</section>
</div>

<div class="hg-aviso" data-si="vacio">
<h2>${t({ es: "No hay activos registrados", en: "No assets registered" })}</h2>
<p>${t({
    es: "Registra el primero con su perfil, su dueño, su alcance autorizado y sus reglas de enfrentamiento. Sin eso no se puede planear nada.",
    en: "Register the first one with its profile, its owner, its authorized scope and its rules of engagement. Without that nothing can be planned.",
  })}</p>
</div>

<div class="hg-aviso" data-si="carga">
<h2>${t({ es: "Abriendo el activo", en: "Opening the asset" })}</h2>
<div class="hg-esqueleto" aria-hidden="true"><span></span><span></span><span></span></div>
</div>

<div class="hg-aviso" data-si="error">
<h2>${t({ es: "El activo no se pudo abrir", en: "The asset could not be opened" })}</h2>
${sello(
  { rol: "falla", simbolo: "falla", nombre: { es: "El perfil no pasa su esquema", en: "The profile does not pass its schema" } },
  `<p>${tHtml(
    {
      es: "Falta el campo {c}. Un activo sin dueño no puede autorizar pruebas: complétalo en su archivo y vuelve a cargar.",
      en: "Field {c} is missing. An asset without an owner cannot authorize tests: complete it in its file and load again.",
    },
    { c: dato("dueno") },
  )}</p>`,
)}
</div>`;

  return pagina({
    titulo: { es: `HackGuard · ${a.nombre.es}`, en: `HackGuard · ${a.nombre.en}` },
    seccion: seccionDeActivo(id, archivoDeActivo(id)),
    existentes,
    antes: conmutadorDeActivos(id, archivoDeActivo, existentes),
    sala: {
      nota: {
        es: "Mirada 3. Un activo. Los tres activos son demos ficticios; el tercero no tiene autorización, para que se vea ese estado.",
        en: "Review 3. An asset. All three assets are fictional demos; the third has no authorization, to show that state.",
      },
      grupos: [barraDeEstados()],
    },
    contenido,
    revisar: [
      {
        donde: { es: "Fila «Activo» de arriba", en: "The “Asset” row at the top" },
        hacer: { es: "Abre los tres activos", en: "Open all three assets" },
        ver: { es: "Cada uno muestra lo suyo; el portal dice arriba que sin autorización no hay plan", en: "Each one shows its own data; the portal says at the top that without authorization there is no plan" },
      },
      {
        donde: { es: "1. Dueño y proveedor", en: "1. Owner and provider" },
        hacer: { es: "Lee los dos bloques del asistente", en: "Read the assistant's two blocks" },
        ver: { es: "Se entiende quién autoriza y qué permite el proveedor, y son cosas distintas", en: "It is clear who authorizes and what the provider allows, and that they are different things" },
      },
      {
        donde: { es: "3 y 4. Alcance y reglas", en: "3 and 4. Scope and rules" },
        hacer: { es: "Lee qué se puede probar y qué no", en: "Read what may and may not be tested" },
        ver: { es: "Lo prohibido se lee tan claro como lo permitido; una regla cita la política del proveedor", en: "What is forbidden reads as clearly as what is allowed; one rule cites the provider's policy" },
      },
      {
        donde: { es: "Portal demo · 3. Alcance", en: "Demo portal · 3. Scope" },
        hacer: { es: "Pulsa «Ver la plantilla para activos propios»", en: "Press “See the template for own assets”" },
        ver: { es: "Aparece la plantilla y dice que solo vale para activos propios", en: "The template appears and says it is only valid for own assets" },
      },
    ],
  });
};
