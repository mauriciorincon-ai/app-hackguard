// Las fuentes de la hoja del sistema se importan como recursos estáticos para precargarlas (la URL con su huella la pone el
// empaquetador y es la misma que usa el `@font-face` de app.css).
declare module "*.woff2" {
  const ruta: string | { src: string };
  export default ruta;
}
