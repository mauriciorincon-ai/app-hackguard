// Aplica el tema y el idioma guardados ANTES del primer pintado (se carga en <head>, sin defer), para que la
// página no parpadee ni se hidrate con otro idioma del que el usuario eligió. Mismo patrón que el controlador de
// la maqueta (docs/diseno/assets/maqueta.js), con su propio prefijo.
(function () {
  "use strict";
  var raiz = document.documentElement;
  try {
    var tema = window.localStorage.getItem("hackguard:tema");
    if (tema === "claro" || tema === "oscuro")
      raiz.setAttribute("data-theme", tema);
    var idioma = window.localStorage.getItem("hackguard:idioma");
    if (idioma === "es" || idioma === "en") {
      raiz.setAttribute("data-lang", idioma);
      raiz.setAttribute("lang", idioma);
    }
  } catch {
    /* sin almacenamiento la preferencia dura lo que la página */
  }
})();
