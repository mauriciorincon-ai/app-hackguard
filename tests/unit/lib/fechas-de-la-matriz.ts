// Las fechas de la matriz de envejecimiento de la brecha (regla 23): el día de cada umbral —y su víspera— en que algo cambia de
// estado. Las usan la matriz y el gate que compara las cifras de las cinco pantallas en cada una de ellas.
import { armarBrecha } from "../../../src/engine/brecha/calcular.ts";
import { fechaMasDias } from "../../../src/engine/fecha.ts";
import { evaluarHallazgo } from "../../../src/engine/hallazgos/ciclo.ts";
import { entradaDemo, instantanea, umbralesDeBrecha } from "./mundo-de-brecha";

export const BASE = entradaDemo();
export const ANTIGUA = umbralesDeBrecha.evidencia_antigua;
export const { por_revisar, vencido } = instantanea.catalogo.umbrales.vigencia;

export const confirmados = BASE.libro.filter((s) => s.confirmacion !== null);
export const aceptaciones = BASE.hallazgos.flatMap((h) =>
  h.eventos.flatMap((e) =>
    e.tipo === "aceptacion"
      ? [{ id: h.id, fecha: e.fecha, dias: e.revision_en_dias }]
      : [],
  ),
);
/** El día en que se abrió un hallazgo: lo da el ciclo de vida del hallazgo (ADR-008), no la brecha, que no lo necesita. */
export const aperturaDe = (id: string): string => {
  const h = BASE.hallazgos.find((x) => x.id === id);
  if (h === undefined) throw new Error(`no hay hallazgo ${id}`);
  const r = evaluarHallazgo(h, BASE.libro);
  if (!r.ok) throw new Error(`${id}: ${r.motivo}`);
  return r.evaluacion.apertura;
};
export const aperturas = armarBrecha(BASE).hallazgos.map((h) => ({
  ...h,
  apertura: aperturaDe(h.id),
}));
export const verificaciones = BASE.pruebas.map((p) => p.fecha_verificacion);

/** La primera fecha en la que la brecha se puede calcular: ninguna cuenta mira hacia atrás de la última cosa que pasó. */
export const PRIMERA = [
  ...confirmados.map((s) => s.fecha),
  ...aperturas.map((h) => h.apertura),
  ...aceptaciones.map((a) => a.fecha),
  ...verificaciones,
]
  .sort()
  .at(-1)!;

export const FECHAS = [
  ...new Set(
    [
      BASE.consulta,
      PRIMERA,
      ...confirmados.flatMap((s) => [
        fechaMasDias(s.fecha, ANTIGUA - 1),
        fechaMasDias(s.fecha, ANTIGUA),
      ]),
      ...aperturas.flatMap((h) =>
        h.plazo.total === null
          ? []
          : [
              fechaMasDias(h.apertura, h.plazo.total),
              fechaMasDias(h.apertura, h.plazo.total + 1),
            ],
      ),
      ...aceptaciones.flatMap((a) => [
        fechaMasDias(a.fecha, a.dias - 1),
        fechaMasDias(a.fecha, a.dias),
      ]),
      ...verificaciones.flatMap((v) => [
        fechaMasDias(v, por_revisar - 1),
        fechaMasDias(v, por_revisar),
        fechaMasDias(v, vencido - 1),
        fechaMasDias(v, vencido),
      ]),
    ].filter((f) => f >= PRIMERA),
  ),
].sort();
