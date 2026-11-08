// La receta de la instantánea DEMO (D1 y D4 del Sprint 10). El catálogo real no ha cambiado desde la instantánea oficial, así que
// para ver «qué cambió» hace falta un segundo catálogo, y este es sintético y se llama así: «demo, no oficial». Parte de los
// archivos de `datos/` y aplica cinco movimientos fijos, cada uno pensado para enseñar una causa distinta en el re-plan del
// clasificador demo (su versión 2 trae el rasgo `modelo_de_terceros`, ver `datos/activos/historial/`). Pasa por `construirInstantanea`
// como cualquier otro catálogo: si no valida, no se emite. Pura: recibe los archivos, devuelve los archivos.
import type { ArchivoDeDatos, CatalogoEnBruto } from "./tipos.ts";

export const FECHA_DE_LA_INSTANTANEA_DEMO = "2026-11-01";
/** Qué trae cada prueba de la receta, para que la pantalla y el test lo digan con las mismas palabras. */
export const MOVIMIENTOS_DE_LA_RECETA = [
  { id: "PR-MD-DEMO-001", tipo: "entra" },
  { id: "PR-MD-DEMO-002", tipo: "entra" },
  { id: "PR-MD-LIM-001", tipo: "sale" },
  { id: "PR-MD-INV-001", tipo: "cambia" },
  { id: "PR-MD-COH-001", tipo: "cambia" },
] as const;

type Json = Record<string, unknown>;

const texto = (valor: Json) => `${JSON.stringify(valor, null, 2)}\n`;

function buscar(entrada: CatalogoEnBruto, id: string): ArchivoDeDatos {
  const a = entrada.pruebas.find((p) => p.ruta.endsWith(`/${id}.json`));
  if (a === undefined)
    throw new Error(`la receta demo necesita la prueba ${id} y no está`);
  return a;
}

const leer = (a: ArchivoDeDatos) => JSON.parse(a.texto) as Json;

/** Una prueba nueva, copiada de una existente de la misma familia: hereda su herramienta, su criterio y sus fuentes. */
function nueva(base: Json, cambios: Json, ruta: string): ArchivoDeDatos {
  return { ruta, texto: texto({ ...base, ...cambios }) };
}

/** Devuelve el catálogo de la instantánea demo a partir del real. No toca el que recibe. */
export function aplicarRecetaDemo(entrada: CatalogoEnBruto): CatalogoEnBruto {
  const lim = buscar(entrada, "PR-MD-LIM-001");
  const base = leer(lim);
  const carpeta = lim.ruta.slice(0, lim.ruta.lastIndexOf("/"));

  const demo1 = nueva(
    base,
    {
      id: "PR-MD-DEMO-001",
      nombre: {
        es: "Los casos etiquetados representan lo que llega",
        en: "The labelled cases represent what arrives",
      },
      que_verifica: {
        es: "El conjunto de casos etiquetados con el que se mide la calidad cubre los tipos de solicitud que el modelo recibe de verdad, y no solo los fáciles.",
        en: "The set of labelled cases used to measure quality covers the kinds of request the model really receives, not only the easy ones.",
      },
      por_que_importa: {
        es: "Una medida de calidad sobre casos que no se parecen a lo real da una confianza que no se ha ganado.",
        en: "A quality measure over cases that do not look like the real ones gives a confidence that has not been earned.",
      },
      controles: ["iso42001-A.7.4"],
      aplicabilidad: {
        modo: "todas",
        condiciones: [{ rasgo: "dispone_de_casos_etiquetados", valor: true }],
        descripcion: {
          es: "Aplica si el activo dispone de casos etiquetados.",
          en: "Applies if the asset has labelled cases.",
        },
      },
      fecha_verificacion: "2026-10-30",
    },
    `${carpeta}/PR-MD-DEMO-001.json`,
  );
  // Esta solo aplica si el activo usa un modelo de terceros Y tiene casos etiquetados: entra por las dos cosas a la vez.
  const demo2 = nueva(
    base,
    {
      id: "PR-MD-DEMO-002",
      nombre: {
        es: "El modelo de un tercero se mide con los casos propios",
        en: "A third party's model is measured with your own cases",
      },
      que_verifica: {
        es: "Cuando el activo consume un modelo de otro proveedor, su calidad se mide con los casos etiquetados del propio activo y no con la cifra que publica el proveedor.",
        en: "When the asset consumes another provider's model, its quality is measured with the asset's own labelled cases and not with the figure the provider publishes.",
      },
      por_que_importa: {
        es: "La cifra del proveedor sale de sus casos; la tuya sale de lo que tu aplicación recibe.",
        en: "The provider's figure comes from its cases; yours comes from what your application receives.",
      },
      controles: ["iso42001-A.10.3"],
      aplicabilidad: {
        modo: "todas",
        condiciones: [
          { rasgo: "modelo_de_terceros", valor: true },
          { rasgo: "dispone_de_casos_etiquetados", valor: true },
        ],
        descripcion: {
          es: "Aplica si el activo usa un modelo de terceros y dispone de casos etiquetados.",
          en: "Applies if the asset uses a third-party model and has labelled cases.",
        },
      },
      fecha_verificacion: "2026-10-30",
    },
    `${carpeta}/PR-MD-DEMO-002.json`,
  );

  // Sale: se retira. Era la única prueba del control A.6.2.2 en el plan del clasificador.
  const retirada: ArchivoDeDatos = {
    ruta: lim.ruta,
    texto: texto({ ...base, estado_aprobacion: "retirada" }),
  };

  // Cambia la regla de aplicabilidad: ahora exige que otro sistema use la salida del activo.
  const inv = buscar(entrada, "PR-MD-INV-001");
  const invBase = leer(inv);
  const invNueva: ArchivoDeDatos = {
    ruta: inv.ruta,
    texto: texto({
      ...invBase,
      aplicabilidad: {
        modo: "todas",
        condiciones: [
          { rasgo: "devuelve_decision_tipada", valor: true },
          { rasgo: "otro_sistema_usa_su_salida", valor: true },
        ],
        descripcion: {
          es: "Aplica si el activo devuelve decisiones tipadas y otro sistema usa su salida.",
          en: "Applies if the asset returns typed decisions and another system uses its output.",
        },
      },
      fecha_verificacion: "2026-10-30",
    }),
  };

  // Cambia un campo que no es la regla: la prioridad base. La prueba se queda en el plan, con otra posición.
  const coh = buscar(entrada, "PR-MD-COH-001");
  const cohBase = leer(coh);
  const cohNueva: ArchivoDeDatos = {
    ruta: coh.ruta,
    texto: texto({
      ...cohBase,
      prioridad_base: Math.max(
        1,
        (cohBase.prioridad_base as number) === 1
          ? 2
          : (cohBase.prioridad_base as number) - 1,
      ),
      fecha_verificacion: "2026-10-30",
    }),
  };

  const cambiadas = new Map<string, ArchivoDeDatos>([
    [retirada.ruta, retirada],
    [invNueva.ruta, invNueva],
    [cohNueva.ruta, cohNueva],
  ]);
  return {
    ...entrada,
    pruebas: [
      ...entrada.pruebas.map((p) => cambiadas.get(p.ruta) ?? p),
      demo1,
      demo2,
    ],
  };
}
