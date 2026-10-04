// Controlador de sala de la maqueta. Cada control dibujado lleva data-controlador="<nombre>" y aquí
// vive su registrar("<nombre>", …): el gate tests/unit/controladores-maqueta lo exige par a par.
// Se carga en <head> sin defer para aplicar tema e idioma guardados antes del primer pintado.
(function () {
  "use strict";

  var CLAVE = "hg-maqueta-v0:";
  var raiz = document.documentElement;
  var controladores = {};

  function registrar(nombre, accion) {
    controladores[nombre] = accion;
  }

  function leer(clave) {
    try {
      return window.localStorage.getItem(CLAVE + clave);
    } catch (e) {
      return null;
    }
  }

  function guardar(clave, valor) {
    try {
      window.localStorage.setItem(CLAVE + clave, valor);
    } catch (e) {
      /* sin almacenamiento la preferencia dura lo que la página */
    }
  }

  function marcarGrupo(control, nombre) {
    var grupo = control.parentElement.querySelectorAll('[data-controlador="' + nombre + '"]');
    for (var i = 0; i < grupo.length; i++) {
      grupo[i].setAttribute("aria-pressed", String(grupo[i] === control));
    }
  }

  function aplicarIdioma(idioma) {
    raiz.setAttribute("data-lang", idioma);
    raiz.setAttribute("lang", idioma);
    var titulo = document.querySelector("title");
    if (titulo && titulo.getAttribute("data-" + idioma)) {
      document.title = titulo.getAttribute("data-" + idioma);
    }
    var opciones = document.querySelectorAll("option[data-" + idioma + "]");
    for (var o = 0; o < opciones.length; o++) opciones[o].textContent = opciones[o].getAttribute("data-" + idioma);
    var conEtiqueta = document.querySelectorAll("[data-aria-label-" + idioma + "]");
    for (var i = 0; i < conEtiqueta.length; i++) {
      conEtiqueta[i].setAttribute("aria-label", conEtiqueta[i].getAttribute("data-aria-label-" + idioma));
    }
  }

  registrar("tema", function () {
    var tema = raiz.getAttribute("data-theme") === "claro" ? "oscuro" : "claro";
    raiz.setAttribute("data-theme", tema);
    guardar("tema", tema);
  });

  registrar("idioma", function () {
    var idioma = raiz.getAttribute("data-lang") === "en" ? "es" : "en";
    aplicarIdioma(idioma);
    guardar("idioma", idioma);
  });

  // Filtros del catálogo: cada control declara data-campo; "" es «todos». Una fila [data-filtrable]
  // se oculta si no cumple algún campo. Los campos con varias entradas (controles) van separados por
  // espacios.
  function valorDe(campo) {
    var pulsado = document.querySelector('button[data-controlador="filtro"][data-campo="' + campo + '"][aria-pressed="true"]');
    if (pulsado) return pulsado.getAttribute("data-valor");
    var lista = document.querySelector('select[data-controlador="filtro"][data-campo="' + campo + '"]');
    return lista ? lista.value : "";
  }

  function aplicarFiltros() {
    var campos = {};
    var controles = document.querySelectorAll('[data-controlador="filtro"]');
    for (var i = 0; i < controles.length; i++) campos[controles[i].getAttribute("data-campo")] = true;
    var activos = 0;
    var criterio = {};
    for (var campo in campos) {
      criterio[campo] = valorDe(campo);
      if (criterio[campo]) activos++;
    }
    var filas = document.querySelectorAll("[data-filtrable]");
    var visibles = 0;
    for (var j = 0; j < filas.length; j++) {
      var cumple = true;
      for (var c in criterio) {
        if (!criterio[c]) continue;
        var valores = (filas[j].getAttribute("data-" + c) || "").split(" ");
        if (valores.indexOf(criterio[c]) === -1) cumple = false;
      }
      filas[j].hidden = !cumple;
      if (cumple) visibles++;
    }
    var cuentas = document.querySelectorAll("[data-cuenta-filtrada]");
    for (var k = 0; k < cuentas.length; k++) cuentas[k].textContent = String(visibles);
    var vacio = document.querySelector("[data-sin-resultados]");
    if (vacio) vacio.hidden = visibles !== 0 || filas.length === 0;
    var limpiar = document.querySelector('[data-controlador="filtro-limpiar"]');
    if (limpiar) limpiar.hidden = activos === 0;
  }

  registrar("filtro", function (control) {
    if (control.tagName === "BUTTON") marcarGrupo(control, "filtro");
    else control.setAttribute("data-valor-activo", control.value);
    aplicarFiltros();
  });

  registrar("filtro-limpiar", function () {
    var listas = document.querySelectorAll('select[data-controlador="filtro"]');
    for (var i = 0; i < listas.length; i++) {
      listas[i].value = "";
      listas[i].setAttribute("data-valor-activo", "");
    }
    var botones = document.querySelectorAll('button[data-controlador="filtro"]');
    for (var j = 0; j < botones.length; j++) {
      botones[j].setAttribute("aria-pressed", String(botones[j].getAttribute("data-valor") === ""));
    }
    aplicarFiltros();
  });

  registrar("alternar", function (control) {
    control.setAttribute("aria-pressed", String(control.getAttribute("aria-pressed") !== "true"));
  });

  registrar("estado", function (control) {
    document.body.setAttribute("data-estado", control.getAttribute("data-valor"));
    marcarGrupo(control, "estado");
  });

  var tema = leer("tema");
  if (tema === "claro" || tema === "oscuro") raiz.setAttribute("data-theme", tema);
  var idioma = leer("idioma");
  if (idioma === "en" || idioma === "es") {
    raiz.setAttribute("data-lang", idioma);
    raiz.setAttribute("lang", idioma);
  }

  document.addEventListener("DOMContentLoaded", function () {
    aplicarIdioma(raiz.getAttribute("data-lang"));
  });

  function despachar(evento) {
    var control = evento.target.closest ? evento.target.closest("[data-controlador]") : null;
    if (!control) return;
    var esLista = control.tagName === "SELECT" || control.tagName === "INPUT";
    if ((evento.type === "change") !== esLista) return;
    var accion = controladores[control.getAttribute("data-controlador")];
    if (accion) accion(control);
  }

  document.addEventListener("click", despachar);
  document.addEventListener("change", despachar);
})();
