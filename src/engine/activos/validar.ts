// Validador del activo: lee los archivos de activos, comprueba cada uno contra el esquema y contra el catálogo
// (rasgos, familias, pruebas) y dice qué encontró, con la regla que lo encontró. Mismo molde de hallazgos que
// el validador del catálogo; el motor no toca el disco (los textos llegan de `src/lib/activos/cargar-activos.ts`).
//
// Sin alcance ni reglas el activo es VÁLIDO y no está autorizado: no es un error, es el estado «registrado, sin
// plan» (regla dura 5). Lo que sí es error es un activo que contradice al catálogo o a sí mismo.
import type { z } from "zod";
import type { Prueba } from "../catalogo/esquemas.ts";
import { aplicaPorPerfil } from "../planificador/aplicabilidad.ts";
import { comparar } from "../planificador/orden.ts";
import { Activo, estaAutorizado } from "./esquemas.ts";

type Texto = { es: string; en: string };
type Severidad = "error" | "advertencia" | "nota";

const r = (severidad: Severidad, es: string, en: string) => ({
  severidad,
  nombre: { es, en } as Texto,
});

export const REGLAS_DE_ACTIVO = {
  "archivo/json-invalido": r(
    "error",
    "El archivo no es JSON válido",
    "The file is not valid JSON",
  ),
  "archivo/nombre-no-coincide": r(
    "error",
    "El nombre del archivo no coincide con el id del activo",
    "The file name does not match the asset id",
  ),
  "esquema/campo-invalido": r(
    "error",
    "Un campo no cumple el esquema",
    "A field does not match the schema",
  ),
  "activo/id-duplicado": r(
    "error",
    "Dos activos comparten id",
    "Two assets share an id",
  ),
  "activo/fuera-de-otra-familia": r(
    "error",
    "Una prueba fuera del alcance es de una familia que el activo no tiene",
    "A test out of scope belongs to a family the asset does not have",
  ),
  "activo/demo-en-carpeta-privada": r(
    "error",
    "Un activo demo está en datos/privado/: su plan saldría como público. Los demos viven en datos/activos/demo/",
    "A demo asset is in datos/privado/: its plan would come out as public. Demo assets live in datos/activos/demo/",
  ),
  "activo/origen-no-demo-en-datos-publicos": r(
    "error",
    "Un activo que no es demo está en una carpeta versionada: los activos reales viven en datos/privado/activos/",
    "An asset that is not a demo is in a versioned folder: real assets live in datos/privado/activos/",
  ),
  "activo/dueno-igual-proveedor": r(
    "error",
    "El dueño y el proveedor son lo mismo: el dueño autoriza y el proveedor pone sus propias condiciones",
    "The owner and the provider are the same: the owner authorizes and the provider sets its own conditions",
  ),
  "activo/familia-inexistente": r(
    "error",
    "El activo nombra una familia que el catálogo no tiene",
    "The asset names a family the catalog does not have",
  ),
  "activo/alcance-familia-fuera-del-activo": r(
    "error",
    "El alcance autoriza una familia que el activo no tiene",
    "The scope authorizes a family the asset does not have",
  ),
  "activo/rasgo-inexistente": r(
    "error",
    "El perfil declara un rasgo que el catálogo no tiene",
    "The profile declares a trait the catalog does not have",
  ),
  "activo/rasgo-no-booleano": r(
    "error",
    "Un rasgo de opción no se escribe en los rasgos del activo: tipo_de_acceso sale de «acceso»",
    "An option trait is not written in the asset's traits: tipo_de_acceso comes from “acceso”",
  ),
  "activo/prueba-inexistente": r(
    "error",
    "El activo nombra una prueba que el catálogo no tiene",
    "The asset names a test the catalog does not have",
  ),
  "activo/ajuste-de-otra-familia": r(
    "error",
    "Un ajuste nombra una prueba de una familia que el activo no tiene",
    "An adjustment names a test from a family the asset does not have",
  ),
  "activo/ajuste-duplicado": r(
    "error",
    "Hay dos ajustes sobre la misma prueba",
    "There are two adjustments on the same test",
  ),
  "activo/politica-sin-fecha": r(
    "error",
    "La política del proveedor y la fecha en que se leyó van juntas",
    "The provider's policy and the date it was read go together",
  ),
  "activo/regla-cita-politica-sin-leer": r(
    "error",
    "Una regla cita la política del proveedor, y el activo no tiene política leída",
    "A rule cites the provider's policy, and the asset has no policy read",
  ),
  "activo/proveedor-sin-politica": r(
    "advertencia",
    "El proveedor no tiene su política leída: las reglas de enfrentamiento tienen que citar lo que permite",
    "The provider's policy has not been read: the rules of engagement must cite what it allows",
  ),
  "activo/autorizacion-incompleta": r(
    "advertencia",
    "Falta el alcance o las reglas: el activo no está autorizado y no recibe plan",
    "The scope or the rules are missing: the asset is not authorized and gets no plan",
  ),
  "activo/ajuste-redundante": r(
    "advertencia",
    "Un ajuste no cambia nada: el perfil ya pide (o ya no pide) esa prueba",
    "An adjustment changes nothing: the profile already asks for (or already does not ask for) that test",
  ),
  "activo/sin-autorizacion": r(
    "nota",
    "El activo no tiene alcance ni reglas de enfrentamiento: no recibe plan hasta que el dueño los declare",
    "The asset has no scope or rules of engagement: it gets no plan until the owner declares them",
  ),
} as const;
export type IdReglaDeActivo = keyof typeof REGLAS_DE_ACTIVO;

/** Mismo molde que un hallazgo del catálogo, con las reglas de este módulo. */
export interface HallazgoDeActivo {
  regla: IdReglaDeActivo;
  severidad: Severidad;
  ruta: string;
  campo: string;
  nombre: Texto;
  detalle: Texto | null;
}

export interface ArchivoDeActivo {
  /** Ruta relativa a la raíz, con «/». */
  ruta: string;
  texto: string;
}

/** Lo que el validador necesita del catálogo: viene de la instantánea oficial. */
export interface CatalogoParaActivos {
  familias: readonly string[];
  rasgos: readonly { id: string; tipo: "booleano" | "opcion" }[];
  pruebas: readonly Pick<Prueba, "id" | "familia" | "aplicabilidad">[];
}

export interface ActivoValidado {
  activo: Activo;
  ruta: string;
  autorizado: boolean;
}

export type EstadoDeValidacionDeActivos =
  "ok" | "con_advertencias" | "invalido";

export interface ResultadoDeValidacionDeActivos {
  estado: EstadoDeValidacionDeActivos;
  hallazgos: HallazgoDeActivo[];
  activos: ActivoValidado[];
}

const t = (es: string, en: string): Texto => ({ es, en });
const comillas = (s: string) => t(`«${s}»`, `“${s}”`);
const nombreDeArchivo = (ruta: string) => ruta.slice(ruta.lastIndexOf("/") + 1);
const CARPETA_PUBLICA = "datos/activos/";
const CARPETA_PRIVADA = "datos/privado/";

function describir(problema: z.core.$ZodIssue): Texto {
  const donde = problema.path.length > 0 ? problema.path.join(".") : "(raíz)";
  return t(`${donde}: ${problema.message}`, `${donde}: ${problema.message}`);
}

export function validarActivos(
  archivos: readonly ArchivoDeActivo[],
  catalogo: CatalogoParaActivos,
): ResultadoDeValidacionDeActivos {
  const hallazgos: HallazgoDeActivo[] = [];
  const agregar = (
    regla: IdReglaDeActivo,
    ruta: string,
    campo = "",
    detalle: Texto | null = null,
  ) => {
    const { severidad, nombre } = REGLAS_DE_ACTIVO[regla];
    hallazgos.push({ regla, severidad, ruta, campo, nombre, detalle });
  };
  const activos: ActivoValidado[] = [];
  const ids = new Map<string, string>();
  const rasgos = new Map(catalogo.rasgos.map((x) => [x.id, x.tipo]));
  const pruebas = new Map(catalogo.pruebas.map((p) => [p.id, p]));
  const familias = new Set(catalogo.familias);

  for (const archivo of [...archivos].sort((a, b) =>
    comparar(a.ruta, b.ruta),
  )) {
    let bruto: unknown;
    try {
      bruto = JSON.parse(archivo.texto) as unknown;
    } catch {
      agregar("archivo/json-invalido", archivo.ruta);
      continue;
    }
    const lectura = Activo.safeParse(bruto);
    if (!lectura.success) {
      for (const problema of lectura.error.issues)
        agregar(
          "esquema/campo-invalido",
          archivo.ruta,
          problema.path.join("."),
          describir(problema),
        );
      continue;
    }
    const a = lectura.data;
    const errores = hallazgos.filter((h) => h.severidad === "error").length;

    if (nombreDeArchivo(archivo.ruta) !== `${a.id}.json`)
      agregar(
        "archivo/nombre-no-coincide",
        archivo.ruta,
        "id",
        comillas(`${a.id}.json`),
      );
    const previa = ids.get(a.id);
    if (previa !== undefined)
      agregar("activo/id-duplicado", archivo.ruta, "id", comillas(previa));
    else ids.set(a.id, archivo.ruta);

    if (archivo.ruta.startsWith(CARPETA_PUBLICA) && a.origen !== "demo")
      agregar(
        "activo/origen-no-demo-en-datos-publicos",
        archivo.ruta,
        "origen",
      );
    // La carpeta decide dónde vive el plan: un demo en la carpeta privada tendría su plan en un sitio público.
    if (archivo.ruta.startsWith(CARPETA_PRIVADA) && a.origen === "demo")
      agregar("activo/demo-en-carpeta-privada", archivo.ruta, "origen");

    if (
      a.proveedor !== null &&
      (a.proveedor.nombre.es.trim().toLowerCase() ===
        a.dueno.nombre.es.trim().toLowerCase() ||
        a.proveedor.nombre.en.trim().toLowerCase() ===
          a.dueno.nombre.en.trim().toLowerCase())
    )
      agregar("activo/dueno-igual-proveedor", archivo.ruta, "proveedor.nombre");

    for (const f of a.familias)
      if (!familias.has(f))
        agregar(
          "activo/familia-inexistente",
          archivo.ruta,
          "familias",
          comillas(f),
        );

    if (a.alcance !== null)
      for (const f of a.alcance.familias)
        if (!a.familias.includes(f))
          agregar(
            "activo/alcance-familia-fuera-del-activo",
            archivo.ruta,
            "alcance.familias",
            comillas(f),
          );

    for (const id of Object.keys(a.rasgos)) {
      const tipo = rasgos.get(id);
      if (tipo === undefined)
        agregar("activo/rasgo-inexistente", archivo.ruta, `rasgos.${id}`);
      else if (tipo !== "booleano")
        agregar("activo/rasgo-no-booleano", archivo.ruta, `rasgos.${id}`);
    }

    const nombraPrueba = (id: string, campo: string) => {
      const p = pruebas.get(id);
      if (p === undefined) {
        agregar("activo/prueba-inexistente", archivo.ruta, campo, comillas(id));
        return null;
      }
      return p;
    };
    for (const [i, f] of (a.alcance?.fuera ?? []).entries()) {
      const p = nombraPrueba(f.prueba, `alcance.fuera.${i}.prueba`);
      if (p !== null && !a.familias.includes(p.familia))
        agregar(
          "activo/fuera-de-otra-familia",
          archivo.ruta,
          `alcance.fuera.${i}.prueba`,
          comillas(f.prueba),
        );
    }
    const vistas = new Set<string>();
    for (const [i, aj] of a.ajustes.entries()) {
      const campo = `ajustes.${i}.prueba`;
      if (vistas.has(aj.prueba))
        agregar(
          "activo/ajuste-duplicado",
          archivo.ruta,
          campo,
          comillas(aj.prueba),
        );
      vistas.add(aj.prueba);
      const p = nombraPrueba(aj.prueba, campo);
      if (p === null) continue;
      if (!a.familias.includes(p.familia)) {
        agregar(
          "activo/ajuste-de-otra-familia",
          archivo.ruta,
          campo,
          comillas(aj.prueba),
        );
        continue;
      }
      const pide = aplicaPorPerfil(a, p.aplicabilidad);
      if (
        (aj.accion === "agregada" && pide) ||
        (aj.accion === "quitada" && !pide)
      )
        agregar(
          "activo/ajuste-redundante",
          archivo.ruta,
          campo,
          comillas(aj.prueba),
        );
    }

    const politica = a.proveedor?.politica ?? null;
    if (a.proveedor !== null) {
      if ((politica === null) !== (a.proveedor.politica_verificada === null))
        agregar("activo/politica-sin-fecha", archivo.ruta, "proveedor");
      if (politica === null)
        agregar(
          "activo/proveedor-sin-politica",
          archivo.ruta,
          "proveedor.politica",
        );
    }
    for (const [i, regla] of (a.reglas ?? []).entries())
      if (regla.cita_proveedor && politica === null)
        agregar(
          "activo/regla-cita-politica-sin-leer",
          archivo.ruta,
          `reglas.${i}.cita_proveedor`,
        );

    const autorizado = estaAutorizado(a);
    if (!autorizado) {
      agregar(
        a.alcance === null && a.reglas === null
          ? "activo/sin-autorizacion"
          : "activo/autorizacion-incompleta",
        archivo.ruta,
      );
    }
    if (hallazgos.filter((h) => h.severidad === "error").length === errores)
      activos.push({ activo: a, ruta: archivo.ruta, autorizado });
  }

  hallazgos.sort(
    (x, y) =>
      comparar(x.ruta, y.ruta) ||
      comparar(x.campo, y.campo) ||
      comparar(x.regla, y.regla),
  );
  const estado: EstadoDeValidacionDeActivos = hallazgos.some(
    (h) => h.severidad === "error",
  )
    ? "invalido"
    : hallazgos.some((h) => h.severidad === "advertencia")
      ? "con_advertencias"
      : "ok";
  return { estado, hallazgos, activos };
}
