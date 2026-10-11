// El script que aplica el tema y el idioma guardados ANTES del primer pintado. Va EN LÍNEA en <head> (src/app/layout.tsx):
// un archivo aparte llegaría después del primer pintado (Next lo inyecta de forma asíncrona) y la página parpadearía o se
// hidrataría con otro idioma del que la persona eligió. Mismo patrón que el controlador de la maqueta
// (docs/diseno/assets/maqueta.js), con su propio prefijo `hackguard:`.
export const PREFIJO_DE_PREFERENCIAS = "hackguard:";

export const SCRIPT_DE_PREFERENCIAS = `(function(){var r=document.documentElement;try{var t=window.localStorage.getItem("${PREFIJO_DE_PREFERENCIAS}tema");if(t==="claro"||t==="oscuro")r.setAttribute("data-theme",t);var i=window.localStorage.getItem("${PREFIJO_DE_PREFERENCIAS}idioma");if(i==="es"||i==="en"){r.setAttribute("data-lang",i);r.setAttribute("lang",i);}}catch(e){}})();`;
