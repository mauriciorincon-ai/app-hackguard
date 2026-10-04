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

  function aplicarIdioma(idioma) {
    raiz.setAttribute("data-lang", idioma);
    raiz.setAttribute("lang", idioma);
    var titulo = document.querySelector("title");
    if (titulo && titulo.getAttribute("data-" + idioma)) {
      document.title = titulo.getAttribute("data-" + idioma);
    }
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

  registrar("estado", function (control) {
    document.body.setAttribute("data-estado", control.getAttribute("data-valor"));
    var grupo = control.parentElement.querySelectorAll('[data-controlador="estado"]');
    for (var i = 0; i < grupo.length; i++) {
      grupo[i].setAttribute("aria-pressed", String(grupo[i] === control));
    }
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

  document.addEventListener("click", function (evento) {
    var control = evento.target.closest ? evento.target.closest("[data-controlador]") : null;
    if (!control) return;
    var accion = controladores[control.getAttribute("data-controlador")];
    if (accion) accion(control);
  });
})();
