// Lo que aprobar una propuesta escribe de verdad (ADR-011, decisión 4): un sobre POR CONFIRMAR o una prueba `aprobada`. Cada escritura se
// valida con el libro o el catálogo entero ANTES de tocar el disco, como `evidencia registrar`. Aprobar no confirma: el sobre nace sin
// confirmación y no cuenta para ninguna brecha hasta que una persona lo confirme, individualmente (ADR-008).
import { writeFileSync } from "node:fs";
import path from "node:path";
import { cargarCatalogo } from "../../cli/cargar.ts";
import type { Prueba } from "../../engine/catalogo/esquemas.ts";
import { validarCatalogo } from "../../engine/catalogo/validar.ts";
import { huellaDelCrudoSintetico } from "../../engine/evidencia/huellas.ts";
import { siguienteId } from "../../engine/evidencia/libro.ts";
import { nombreDeArchivo } from "../../engine/evidencia/molde.ts";
import {
  armarSobre,
  type EntradaDeRegistro,
} from "../../engine/evidencia/registro.ts";
import { validarEvidencia } from "../../engine/evidencia/validar.ts";
import { cargarInstantaneaOficial } from "../catalogo/cargar-instantanea.ts";
import { cargarLibroValidado } from "../evidencia/cargar-libro.ts";
import {
  CARPETA_DE_SOBRES_DEMO,
  CARPETA_DE_SOBRES_PRIVADA,
  escribirDato,
  origenDelActivo,
} from "../evidencia/cargar-evidencia.ts";

const json = (valor: unknown) => `${JSON.stringify(valor, null, 2)}\n`;

export type ResultadoDeAplicar =
  | { ok: true; ruta: string; id: string; detalle: string }
  | { ok: false; motivo: string };

/**
 * Crea el sobre por confirmar de una propuesta del extractor. `huellaDelTexto` es la del texto pegado: el texto mismo no entra. Un sobre
 * de un activo DEMO no viene de ninguna herramienta real (regla dura 8): su huella de crudo es la del crudo sintético de su id, como
 * exige el libro; la huella del texto pegado sigue dicha en las advertencias del sobre.
 */
export async function crearSobrePorConfirmar(
  raiz: string,
  entrada: EntradaDeRegistro,
  huellaDelTexto: string,
): Promise<ResultadoDeAplicar> {
  const { instantanea } = await cargarInstantaneaOficial(raiz);
  const L = await cargarLibroValidado(raiz, instantanea, { privados: true });
  const origen = origenDelActivo(raiz, entrada.activo);
  if (origen === null)
    return { ok: false, motivo: `no hay un activo «${entrada.activo}»` };
  const emitido = L.planes[entrada.activo];
  if (emitido === undefined)
    return {
      ok: false,
      motivo: `el activo «${entrada.activo}» no tiene plan emitido`,
    };
  const regla = L.contexto.pruebas.find((p) => p.id === entrada.prueba)?.regla;
  if (regla === undefined)
    return {
      ok: false,
      motivo: `la prueba «${entrada.prueba}» no está en el catálogo`,
    };
  const id = siguienteId(
    L.archivosDeSobres.map((a) => ({
      id: nombreDeArchivo(a.ruta).replace(/\.json$/, ""),
    })),
  );
  const armado = await armarSobre(entrada, {
    id,
    origen,
    emitido,
    regla,
    crudo:
      origen === "demo" ? await huellaDelCrudoSintetico(id) : huellaDelTexto,
  });
  if (!armado.ok) return { ok: false, motivo: armado.motivo };
  const carpeta =
    origen === "propio" ? CARPETA_DE_SOBRES_PRIVADA : CARPETA_DE_SOBRES_DEMO;
  const ruta = `${carpeta}/${id}.json`;
  const texto = json(armado.sobre);
  const revision = await validarEvidencia(
    [...L.archivosDeSobres, { ruta, texto }],
    L.contexto,
  );
  const errores = revision.hallazgos.filter(
    (h) => h.ruta === ruta && h.severidad === "error",
  );
  if (errores.length > 0)
    return {
      ok: false,
      motivo: `el sobre no cumple el libro: ${errores.map((h) => h.regla).join(", ")}`,
    };
  escribirDato(raiz, ruta, texto, origen === "propio");
  return {
    ok: true,
    ruta,
    id,
    detalle: `veredicto «${armado.sobre.veredicto}», SIN confirmar (no cuenta)`,
  };
}

/** Escribe la prueba aprobada en `datos/pruebas/<familia>/` si el catálogo entero sigue válido con ella; si no, no escribe nada. */
export async function escribirPruebaAprobada(
  raiz: string,
  prueba: Prueba,
): Promise<ResultadoDeAplicar> {
  const ruta = `datos/pruebas/${prueba.familia}/${prueba.id}.json`;
  const texto = json(prueba);
  const entrada = cargarCatalogo(raiz);
  const resultado = await validarCatalogo({
    ...entrada,
    pruebas: [
      ...entrada.pruebas.filter((a) => a.ruta !== ruta),
      { ruta, texto },
    ],
  });
  const errores = resultado.hallazgos.filter((h) => h.severidad === "error");
  if (errores.length > 0)
    return {
      ok: false,
      motivo: `el catálogo no queda válido con esta prueba: ${errores.map((h) => `${h.ruta} ${h.regla}`).join("; ")}`,
    };
  writeFileSync(path.join(raiz, ruta), texto, "utf8");
  return {
    ok: true,
    ruta,
    id: prueba.id,
    detalle: "aprobada; entra al catálogo en la próxima instantánea",
  };
}
