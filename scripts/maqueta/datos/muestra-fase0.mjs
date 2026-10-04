// Muestra mínima de la fase 0 (tubería): tres piezas del catálogo con su fecha de verificación, para
// que el semáforo de vigencia y la matriz de envejecimiento tengan algo real que calcular. La fase 2
// la reemplaza por el mundo sintético completo.
export const PIEZAS = [
  {
    nombre: "garak",
    tipo: { es: "Herramienta", en: "Tool" },
    verificada: "2026-09-21",
  },
  {
    nombre: "OWASP ZAP",
    tipo: { es: "Herramienta", en: "Tool" },
    verificada: "2026-08-23",
  },
  {
    nombre: "OWASP Top 10 for LLM Applications",
    tipo: { es: "Marco", en: "Framework" },
    verificada: "2026-07-20",
  },
];
