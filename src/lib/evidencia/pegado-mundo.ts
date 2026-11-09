// El mundo del texto pegado, armado en el build (Node): lo mínimo que el navegador necesita para leer un reporte contra el plan de un activo
// demo y calcular la brecha de antes y de después. Solo lee lo versionado (demo): lo propio, ignorado por git, no llega aquí (regla dura 8).
// Nada se recalcula: la entrada de la brecha es la MISMA que arma el informe (`entradaDeBrecha`).
import type { UmbralesDeBrecha } from "../../engine/brecha/esquemas.ts";
import { ESTADOS_DE_CONTROL } from "../../engine/brecha/esquemas.ts";
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import { ADAPTADORES } from "../../engine/adaptadores/index.ts";
import { VEREDICTOS } from "../../engine/evidencia/esquemas.ts";
import type { MundoDeActivos } from "../activos/cargar.ts";
import { entradaDeBrecha } from "../brecha/entrada.ts";
import { etiqueta } from "../catalogo/vista.ts";
import type { Etiqueta } from "../catalogo/tipos.ts";
import type { MundoDeHallazgos } from "./cargar.ts";
import { pruebasConocidas } from "./cargar-evidencia.ts";
import type { ActivoParaPegar, MundoDePegado } from "./pegado.ts";

export function construirMundoDePegado(
  instantanea: Instantanea,
  activos: MundoDeActivos,
  evidencia: MundoDeHallazgos,
  umbrales: UmbralesDeBrecha,
  consulta: string,
): MundoDePegado {
  const c = instantanea.catalogo;
  const entrada = entradaDeBrecha(
    instantanea,
    activos,
    evidencia,
    umbrales,
    consulta,
  );
  const conAdaptador = new Set(ADAPTADORES.map((a) => a.herramienta));
  const delBuild: ActivoParaPegar[] = [];
  for (const a of activos.activos) {
    if (a.plan === null || a.paquete === null) continue;
    const herramientas = a.paquete.herramientas
      .filter((h) => conAdaptador.has(h.herramienta))
      .map((h) => {
        const nombre = c.herramientas.find(
          (x) => x.id === h.herramienta,
        )?.nombre;
        return {
          id: h.herramienta,
          nombre:
            typeof nombre === "object"
              ? nombre
              : { es: nombre ?? h.herramienta, en: nombre ?? h.herramienta },
        };
      });
    if (herramientas.length === 0) continue;
    delBuild.push({
      id: a.activo.id,
      nombre: a.activo.nombre,
      emitido: { plan: a.plan, paquete: a.paquete },
      herramientas,
    });
  }
  const citadas = new Set(
    delBuild.flatMap((a) =>
      a.emitido.paquete.herramientas.flatMap((h) =>
        h.pruebas.map((p) => p.prueba),
      ),
    ),
  );
  const pruebas = pruebasConocidas(instantanea).filter((p) =>
    citadas.has(p.id),
  );
  const capa = c.controles.find((x) => x.capa === "por_defecto");
  const veredictos: Record<string, Etiqueta> = {};
  for (const v of VEREDICTOS) veredictos[v] = etiqueta(c, "veredicto", v);
  const controlesEtiqueta = {} as MundoDePegado["etiquetas"]["controles"];
  for (const e of ESTADOS_DE_CONTROL)
    controlesEtiqueta[e] = etiqueta(c, "estado_de_control", e);
  return {
    consulta,
    entrada,
    activos: delBuild,
    pruebas,
    lotes: evidencia.lotes.map((l) => ({
      id: l.id,
      activo: l.activo,
      archivo: l.huellas.archivo,
    })),
    etiquetas: { veredictos, controles: controlesEtiqueta },
    nombresDePruebas: Object.fromEntries(
      c.pruebas.filter((p) => citadas.has(p.id)).map((p) => [p.id, p.nombre]),
    ),
    nombresDeControles: Object.fromEntries(
      (capa?.areas ?? []).flatMap((area) =>
        area.controles.map((x) => [x.id, x.nombre] as const),
      ),
    ),
  };
}
