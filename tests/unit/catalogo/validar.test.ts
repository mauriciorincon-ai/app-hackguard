// @vitest-environment node
// Validador del catálogo: cada regla de `reglas.ts` tiene aquí un caso que la hace saltar (¿puede fallar?
// sí, y se ve), y una prueba final exige que no quede ninguna regla sin caso. Los casos parten del
// catálogo real y de la prueba de referencia de las semillas, con un solo cambio cada uno.
import { describe, expect, it } from "vitest";
import { Prueba } from "../../../src/engine/catalogo/esquemas.ts";
import { REGLAS, type IdRegla } from "../../../src/engine/catalogo/reglas.ts";
import type { CatalogoEnBruto } from "../../../src/engine/catalogo/tipos.ts";
import {
  huellaDeRevision,
  validarCatalogo,
} from "../../../src/engine/catalogo/validar.ts";
import {
  buscar,
  catalogoBase,
  conPrueba,
  CUENTAS_BASE,
  editar,
  fijar,
  leer,
  referencia,
  type Json,
} from "./ayuda.ts";

const CWE = "datos/marcos/cwe.json";
const LLM = "datos/marcos/owasp-llm-top10.json";
const ISO = "datos/marcos/iso-iec-42001.json";
const MAPA = "datos/marcos/equivalencias/owasp-llm-2025-a-2026.json";
const GARAK = "datos/herramientas/garak.json";
const FILTRO = "datos/filtro/patrones.json";
const FAMILIAS = "datos/familias.json";
const CAPA = "datos/controles/capa-de-prueba.json";
const UMBRALES = "datos/umbrales.json";
const ESTADOS = "datos/estados.json";

/** La prueba de referencia con id PR-CASO-001 y un cambio. */
function conReferencia(
  c: CatalogoEnBruto,
  cambio: (p: Json) => void = () => {},
): string {
  const p = referencia();
  p.id = "PR-CASO-001";
  cambio(p);
  return conPrueba(c, p);
}

const consulta = {
  url: "https://example.org/fuente",
  http: 200,
  consultada: "2026-10-04",
};

/** Una capa de controles ficticia, propia, con un control y una equivalencia completa a NIST AI RMF. */
function capaDePrueba(): Json {
  return {
    id: "capa-de-prueba",
    capa: "propia",
    nombre: { es: "Capa de prueba", en: "Test layer" },
    descripcion: {
      es: "Capa ficticia para las pruebas del validador.",
      en: "Fictitious layer for the validator tests.",
    },
    marco_id: "iso-iec-42001",
    version_marco: "2023",
    fuentes_de_los_resumenes: [consulta],
    areas: [
      {
        id: "A.1",
        nombre: { es: "Área de prueba", en: "Test area" },
        controles: [
          {
            id: "prueba-A.1.1",
            nombre: { es: "Control de prueba", en: "Test control" },
            resumen_llano: {
              es: "Un control ficticio para probar el validador.",
              en: "A fictitious control to test the validator.",
            },
            verificado_contra_norma: false,
            controles_equivalentes: [
              {
                marco_id: "nist-ai-rmf",
                version_marco: "1.0",
                referencia_en_marco: "GOVERN 1.1",
                fuente: consulta,
                cobertura: "completa",
              },
            ],
          },
        ],
      },
    ],
  };
}

function conCapa(
  c: CatalogoEnBruto,
  cambio: (capa: Json) => void = () => {},
  ruta = CAPA,
): string {
  const capa = capaDePrueba();
  cambio(capa);
  c.controles.push({ ruta, texto: JSON.stringify(capa) });
  return ruta;
}

const codigo = {
  es: "Ejemplo:\n```bash\necho hola\n```",
  en: "Example:\n```bash\necho hello\n```",
};

async function revisionAlDia(p: Json): Promise<Json> {
  const parseada = Prueba.parse({
    ...p,
    revision_contenido: "revisada_y_aprobada",
  });
  return {
    fecha: "2026-10-04",
    por: "revisora de prueba",
    decision: {
      es: "Revisada: el bloque es inocuo.",
      en: "Reviewed: the block is harmless.",
    },
    huella: await huellaDeRevision(parseada),
  };
}

type Caso = {
  regla: IdRegla;
  que: string;
  preparar: (c: CatalogoEnBruto) => string | Promise<string>;
};

const CASOS: Caso[] = [
  {
    regla: "archivo/falta",
    que: "falta datos/familias.json",
    preparar: (c) => ((c.familias = null), FAMILIAS),
  },
  {
    regla: "archivo/json-invalido",
    que: "un archivo que no es JSON",
    preparar: (c) => (
      c.pruebas.push({ ruta: "datos/pruebas/PR-ROTA-001.json", texto: "{" }),
      "datos/pruebas/PR-ROTA-001.json"
    ),
  },
  {
    regla: "archivo/nombre-no-coincide",
    que: "el archivo no se llama como su id",
    preparar: (c) => {
      const p = referencia();
      p.id = "PR-CASO-001";
      return conPrueba(c, p, "datos/pruebas/OTRO-NOMBRE.json");
    },
  },
  {
    regla: "esquema/campo-invalido",
    que: "prioridad fuera de 1–5",
    preparar: (c) => conReferencia(c, (p) => (p.prioridad_base = 9)),
  },
  {
    regla: "esquema/campo-desconocido",
    que: "un campo que no existe",
    preparar: (c) => conReferencia(c, (p) => (p.campo_que_no_existe = 1)),
  },
  {
    regla: "catalogo/id-duplicado",
    que: "dos archivos con el mismo id",
    preparar: (c) => {
      conReferencia(c);
      const p = referencia();
      p.id = "PR-CASO-001";
      return conPrueba(c, p, "datos/pruebas/zz/PR-CASO-001.json");
    },
  },
  {
    regla: "texto/idioma-repetido",
    que: "un texto largo igual en los dos idiomas",
    preparar: (c) =>
      conReferencia(
        c,
        (p) =>
          (p.que_verifica = {
            es: "El asistente no sigue instrucciones ajenas.",
            en: "El asistente no sigue instrucciones ajenas.",
          }),
      ),
  },
  {
    regla: "referencia/sin-version",
    que: "«LLM07» sin versión",
    preparar: (c) =>
      conReferencia(c, (p) => fijar(p, "version_marco", undefined)),
  },
  {
    regla: "referencia/marco-inexistente",
    que: "un marco que no existe",
    preparar: (c) =>
      conReferencia(c, (p) => (p.marco_id = "marco-inexistente")),
  },
  {
    regla: "referencia/version-inexistente",
    que: "la versión 2019",
    preparar: (c) => conReferencia(c, (p) => (p.version_marco = "2019")),
  },
  {
    regla: "referencia/entrada-inexistente",
    que: "LLM11 en 2026",
    preparar: (c) => conReferencia(c, (p) => (p.referencia_en_marco = "LLM11")),
  },
  {
    regla: "referencia/version-anterior",
    que: "LLM07 de 2025",
    preparar: (c) =>
      conReferencia(c, (p) =>
        Object.assign(p, {
          version_marco: "2025",
          referencia_en_marco: "LLM07",
        }),
      ),
  },
  {
    regla: "referencia/sin-sucesora",
    que: "una entrada que el mapa retira",
    preparar: (c) => {
      editar(buscar(c.equivalencias, MAPA), (m) =>
        fijar(m, "pares.6.hacia", []),
      );
      return conReferencia(c, (p) =>
        Object.assign(p, {
          version_marco: "2025",
          referencia_en_marco: "LLM07",
        }),
      );
    },
  },
  {
    regla: "prueba/sin-marco",
    que: "sin marco",
    preparar: (c) => conReferencia(c, (p) => fijar(p, "marco_id", undefined)),
  },
  {
    regla: "prueba/sin-referencia-en-marco",
    que: "sin entrada del marco",
    preparar: (c) =>
      conReferencia(c, (p) => fijar(p, "referencia_en_marco", "")),
  },
  {
    regla: "prueba/sin-resultado-esperado",
    que: "sin resultado esperado",
    preparar: (c) =>
      conReferencia(c, (p) => fijar(p, "resultado_esperado", undefined)),
  },
  {
    regla: "prueba/sin-criterio",
    que: "sin criterio",
    preparar: (c) =>
      conReferencia(c, (p) => fijar(p, "criterio_de_veredicto", undefined)),
  },
  {
    regla: "prueba/sin-aplicabilidad",
    que: "sin aplicabilidad",
    preparar: (c) =>
      conReferencia(c, (p) => fijar(p, "aplicabilidad", undefined)),
  },
  {
    regla: "prueba/estocastica-sin-k",
    que: "estocástica sin k",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(p, "criterio_de_veredicto.repeticiones_k", undefined),
      ),
  },
  {
    regla: "prueba/regla-inexistente",
    que: "una regla que no existe",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(p, "criterio_de_veredicto.regla", "regla-inexistente"),
      ),
  },
  {
    regla: "prueba/regla-no-admitida",
    que: "una regla determinista en una familia estocástica",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(p, "criterio_de_veredicto.regla", "comprobacion_determinista"),
      ),
  },
  {
    regla: "prueba/familia-inexistente",
    que: "una familia que no existe",
    preparar: (c) =>
      conReferencia(c, (p) => (p.familia = "familia-inexistente")),
  },
  {
    regla: "prueba/categoria-inexistente",
    que: "una categoría que no existe",
    preparar: (c) =>
      conReferencia(c, (p) => (p.categoria = "categoria-inexistente")),
  },
  {
    regla: "prueba/madurez-no-admitida",
    que: "una madurez que la familia no admite",
    preparar: (c) => {
      editar(c.familias!, (f) =>
        fijar(f, "familias.2.madurez_admitida", ["propia"]),
      );
      return conReferencia(c);
    },
  },
  {
    regla: "prueba/marco-no-aplica",
    que: "un marco que no aplica a la familia",
    preparar: (c) => {
      editar(
        buscar(c.marcos, LLM),
        (m) => (m.familias_aplicables = ["agente"]),
      );
      return conReferencia(c);
    },
  },
  {
    regla: "prueba/control-inexistente",
    que: "un control fuera de las capas cargadas",
    preparar: (c) =>
      conReferencia(c, (p) =>
        Object.assign(p, {
          controles: ["iso42001-A.99.1"],
          control_pendiente: false,
        }),
      ),
  },
  {
    regla: "prueba/control-pendiente-incoherente",
    que: "sin controles y control_pendiente false",
    preparar: (c) =>
      conReferencia(c, (p) =>
        Object.assign(p, { controles: [], control_pendiente: false }),
      ),
  },
  {
    regla: "prueba/sin-control",
    que: "sin control",
    preparar: (c) =>
      conReferencia(c, (p) =>
        Object.assign(p, { controles: [], control_pendiente: true }),
      ),
  },
  {
    regla: "prueba/herramienta-inexistente",
    que: "una herramienta que no existe",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(
          p,
          "herramientas_recomendadas.0.herramienta",
          "escaner-inexistente",
        ),
      ),
  },
  {
    regla: "prueba/herramienta-no-cubre-la-familia",
    que: "una herramienta que no cubre la familia",
    preparar: (c) => {
      editar(buscar(c.herramientas, GARAK), (h) => (h.familias = ["agente"]));
      return conReferencia(c);
    },
  },
  {
    regla: "prueba/entorno-no-soportado",
    que: "un entorno que la herramienta no tiene",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(p, "herramientas_recomendadas.0.entorno", "plan_gratuito"),
      ),
  },
  {
    regla: "prueba/selector-no-corresponde",
    que: "un selector de módulo para garak",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(p, "herramientas_recomendadas.0.selector", {
          tipo: "modulo",
          referencia: "x",
        }),
      ),
  },
  {
    regla: "prueba/arnes-no-recomendado",
    que: "medido con otra herramienta",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(p, "resultado_esperado.medido_con", "otra-herramienta"),
      ),
  },
  {
    regla: "prueba/rasgo-inexistente",
    que: "un rasgo que no existe",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(p, "aplicabilidad.condiciones.0.rasgo", "rasgo-inexistente"),
      ),
  },
  {
    regla: "prueba/condicion-invalida",
    que: "un rasgo booleano con un texto",
    preparar: (c) =>
      conReferencia(c, (p) =>
        fijar(p, "aplicabilidad.condiciones.0.valor", "si"),
      ),
  },
  {
    regla: "prueba/aprobada-sin-revision",
    que: "aprobada y marcada",
    preparar: (c) =>
      conReferencia(c, (p) => (p.revision_contenido = "marcada_para_revision")),
  },
  {
    regla: "prueba/revision-sin-registro",
    que: "revisada sin registro",
    preparar: (c) =>
      conReferencia(c, (p) => (p.revision_contenido = "revisada_y_aprobada")),
  },
  {
    regla: "prueba/revision-desactualizada",
    que: "una revisión de otro contenido",
    preparar: (c) =>
      conReferencia(c, (p) =>
        Object.assign(p, {
          revision_contenido: "revisada_y_aprobada",
          revision: {
            fecha: "2026-10-04",
            por: "x",
            decision: { es: "Revisada.", en: "Reviewed." },
            huella: "0".repeat(64),
          },
        }),
      ),
  },
  {
    regla: "filtro/marcada",
    que: "un bloque de código",
    preparar: (c) => conReferencia(c, (p) => (p.notas = codigo)),
  },
  {
    regla: "filtro/marcada-y-revisada",
    que: "un bloque de código ya revisado",
    preparar: async (c) => {
      const p = referencia();
      Object.assign(p, { id: "PR-CASO-001", notas: codigo });
      Object.assign(p, {
        revision_contenido: "revisada_y_aprobada",
        revision: await revisionAlDia(p),
      });
      return conPrueba(c, p);
    },
  },
  {
    regla: "filtro/expresion-invalida",
    que: "una expresión que no compila",
    preparar: (c) => (
      editar(c.filtro!, (f) => fijar(f, "patrones.0.expresion", "(")),
      FILTRO
    ),
  },
  {
    regla: "filtro/carnada-no-marca",
    que: "un patrón roto",
    preparar: (c) => (
      editar(c.filtro!, (f) => fijar(f, "patrones.1.expresion", "^nunca$")),
      FILTRO
    ),
  },
  {
    regla: "filtro/contraejemplo-marca",
    que: "un contraejemplo que marca",
    preparar: (c) => (
      editar(c.filtro!, (f) =>
        (leer(f, "contraejemplos_generales.casos") as string[]).push("$ ls"),
      ),
      FILTRO
    ),
  },
  {
    regla: "marco/sin-procedencia",
    que: "sin código HTTP de la fuente",
    preparar: (c) => (
      editar(buscar(c.marcos, CWE), (m) =>
        fijar(m, "fuente_oficial.http", undefined),
      ),
      CWE
    ),
  },
  {
    regla: "marco/sin-licencia",
    que: "sin licencia",
    preparar: (c) => (
      editar(buscar(c.marcos, CWE), (m) => fijar(m, "licencia", undefined)),
      CWE
    ),
  },
  {
    regla: "marco/por-verificar",
    que: "un dato por verificar",
    preparar: (c) => (
      editar(
        buscar(c.marcos, CWE),
        (m) => (m.por_verificar = ["fecha_version"]),
      ),
      CWE
    ),
  },
  {
    regla: "marco/nulo-sin-declarar",
    que: "fecha nula sin declarar",
    preparar: (c) => (
      editar(buscar(c.marcos, CWE), (m) => {
        m.fecha_version = null;
        m.por_verificar = [];
      }),
      CWE
    ),
  },
  {
    regla: "marco/fuente-no-accesible-sin-declarar",
    que: "un 403 sin declarar",
    preparar: (c) => (
      editar(buscar(c.marcos, ISO), (m) => (m.estado = "verificado")),
      ISO
    ),
  },
  {
    regla: "marco/familia-inexistente",
    que: "una familia que no existe",
    preparar: (c) => (
      editar(buscar(c.marcos, CWE), (m) =>
        (m.familias_aplicables as string[]).push("familia-x"),
      ),
      CWE
    ),
  },
  {
    regla: "marco/equivalencias-inexistentes",
    que: "un mapa que no está",
    preparar: (c) => ((c.equivalencias = []), LLM),
  },
  {
    regla: "equivalencias/marco-inexistente",
    que: "un mapa de un marco ajeno",
    preparar: (c) => (
      editar(buscar(c.equivalencias, MAPA), (m) => (m.marco_id = "otro")),
      MAPA
    ),
  },
  {
    regla: "equivalencias/version-inexistente",
    que: "desde 2019",
    preparar: (c) => (
      editar(buscar(c.equivalencias, MAPA), (m) => (m.desde = "2019")),
      MAPA
    ),
  },
  {
    regla: "equivalencias/entrada-inexistente",
    que: "hacia LLM99",
    preparar: (c) => (
      editar(buscar(c.equivalencias, MAPA), (m) =>
        fijar(m, "pares.0.hacia", ["LLM99"]),
      ),
      MAPA
    ),
  },
  {
    regla: "equivalencias/entrada-sin-mapa",
    que: "un par menos",
    preparar: (c) => (
      editar(buscar(c.equivalencias, MAPA), (m) =>
        (m.pares as unknown[]).pop(),
      ),
      MAPA
    ),
  },
  {
    regla: "equivalencias/no-citado",
    que: "un mapa que ninguna versión cita",
    preparar: (c) => {
      const ruta = "datos/marcos/equivalencias/otro-mapa.json";
      const m = JSON.parse(buscar(c.equivalencias, MAPA).texto) as Json;
      c.equivalencias.push({
        ruta,
        texto: JSON.stringify({ ...m, id: "otro-mapa" }),
      });
      return ruta;
    },
  },
  {
    regla: "control/equivalente-parcial-sin-nota",
    que: "una equivalencia parcial sin nota",
    preparar: (c) =>
      conCapa(c, (capa) =>
        fijar(
          capa,
          "areas.0.controles.0.controles_equivalentes.0.cobertura",
          "parcial",
        ),
      ),
  },
  {
    regla: "herramienta/familia-inexistente",
    que: "una familia que no existe",
    preparar: (c) => (
      editar(buscar(c.herramientas, GARAK), (h) =>
        (h.familias as string[]).push("familia-x"),
      ),
      GARAK
    ),
  },
  {
    regla: "herramienta/sin-registro",
    que: "pública sin registro",
    preparar: (c) => (
      editar(buscar(c.herramientas, GARAK), (h) =>
        fijar(h, "registro", undefined),
      ),
      GARAK
    ),
  },
  {
    regla: "herramienta/propia-sin-repositorio",
    que: "propia sin repositorio",
    preparar: (c) => (
      editar(
        buscar(c.herramientas, GARAK),
        (h) => (h.tipo = "herramienta_propia"),
      ),
      GARAK
    ),
  },
  {
    regla: "umbrales/orden-invalido",
    que: "vencido no es mayor que por revisar",
    preparar: (c) => {
      const archivo = c.umbrales;
      if (archivo === null) throw new Error("faltan los umbrales");
      editar(archivo, (u) => fijar(u, "vigencia.vencido", 30));
      return UMBRALES;
    },
  },
  {
    regla: "estados/sin-etiqueta",
    que: "el vocabulario de vigencia sin «vencido»",
    preparar: (c) => {
      const archivo = c.estados;
      if (archivo === null) throw new Error("falta el vocabulario");
      editar(archivo, (e) => {
        const vigencia = (e.vocabularios as Json[]).find(
          (v) => v.id === "vigencia",
        );
        if (vigencia === undefined) throw new Error("sin vigencia");
        vigencia.estados = (vigencia.estados as Json[]).filter(
          (x) => x.id !== "vencido",
        );
      });
      return ESTADOS;
    },
  },
];

describe("cada regla del validador salta con su caso", () => {
  it.each(CASOS)("$regla: $que", async ({ regla, preparar }) => {
    const c = catalogoBase();
    const ruta = await preparar(c);
    const r = await validarCatalogo(c);
    const encontrado = r.hallazgos.find(
      (h) => h.regla === regla && h.ruta === ruta,
    );
    expect(
      encontrado,
      JSON.stringify(
        r.hallazgos.filter((h) => h.ruta === ruta),
        null,
        1,
      ),
    ).toBeDefined();
    expect(encontrado?.severidad).toBe(REGLAS[regla].severidad);
    expect(encontrado?.nombre).toEqual(REGLAS[regla].nombre);
    if (REGLAS[regla].severidad === "error") expect(r.estado).toBe("invalido");
  });

  it("ninguna regla queda sin un caso que la haga saltar", () => {
    const conCaso = new Set(CASOS.map((c) => c.regla));
    expect(
      Object.keys(REGLAS).filter((r) => !conCaso.has(r as IdRegla)),
    ).toEqual([]);
  });
});

describe("el catálogo base (el real sin sus pruebas)", () => {
  it("es válido: sin errores ni advertencias, con sus datos por verificar a la vista", async () => {
    const r = await validarCatalogo(catalogoBase());
    expect(r.estado).toBe("ok");
    expect(r.hallazgos.filter((h) => h.severidad !== "nota")).toEqual([]);
    // Una nota por cada campo `por_verificar` de cada marco, sacados de los datos.
    const porVerificar = catalogoBase()
      .marcos.flatMap((a) =>
        (
          (JSON.parse(a.texto) as { por_verificar?: string[] })
            .por_verificar ?? []
        ).map((campo) => `${a.ruta} · ${campo}`),
      )
      .sort();
    expect(porVerificar.length).toBe(CUENTAS_BASE.notas);
    expect(r.hallazgos.map((h) => `${h.ruta} · ${h.campo}`).sort()).toEqual(
      porVerificar,
    );
    expect(r.hallazgos.every((h) => h.regla === "marco/por-verificar")).toBe(
      true,
    );
    expect(r.conteos).toMatchObject({
      marcos: CUENTAS_BASE.marcos,
      equivalencias: CUENTAS_BASE.mapas,
      controles: CUENTAS_BASE.controles,
      herramientas: CUENTAS_BASE.herramientas,
      errores: 0,
      advertencias: 0,
      notas: CUENTAS_BASE.notas,
    });
  });

  it("no depende del orden en que llegan los archivos", async () => {
    const c = catalogoBase();
    conReferencia(c, (p) => (p.notas = codigo));
    const otra = structuredClone(c);
    for (const lista of [
      otra.marcos,
      otra.equivalencias,
      otra.herramientas,
      otra.pruebas,
    ])
      lista.reverse();
    expect(await validarCatalogo(otra)).toEqual(await validarCatalogo(c));
  });
});

describe("qué prueba entra a una instantánea", () => {
  async function evaluar(cambio: (p: Json) => unknown) {
    const c = catalogoBase();
    const p = referencia();
    p.id = "PR-CASO-001";
    await cambio(p);
    conPrueba(c, p);
    const r = await validarCatalogo(c);
    const e = r.catalogo.pruebas.find((x) => x.prueba.id === "PR-CASO-001");
    return {
      publicable: e?.publicable,
      pendiente: e?.pendiente,
      estado: r.estado,
    };
  }

  it("aprobada y limpia: entra", async () => {
    expect(await evaluar(() => {})).toEqual({
      publicable: true,
      pendiente: null,
      estado: "ok",
    });
  });

  it("propuesta: espera aprobación", async () => {
    expect(
      await evaluar((p) => (p.estado_aprobacion = "propuesta")),
    ).toMatchObject({ publicable: false, pendiente: "propuesta" });
  });

  it("retirada: no entra ni espera nada", async () => {
    expect(
      await evaluar((p) => (p.estado_aprobacion = "retirada")),
    ).toMatchObject({ publicable: false, pendiente: null });
  });

  it("aprobada y declarada limpia, pero el filtro la marca: espera revisión, sin rechazo", async () => {
    expect(await evaluar((p) => (p.notas = codigo))).toEqual({
      publicable: false,
      pendiente: "marcada_para_revision",
      estado: "con_advertencias",
    });
  });

  it("marcada y revisada al día: entra", async () => {
    const r = await evaluar(async (p) => {
      p.notas = codigo;
      Object.assign(p, {
        revision_contenido: "revisada_y_aprobada",
        revision: await revisionAlDia(p),
      });
    });
    expect(r).toMatchObject({ publicable: true, pendiente: null });
  });

  it("revisada, y cambió después: vuelve a esperar revisión", async () => {
    const r = await evaluar(async (p) => {
      Object.assign(p, {
        revision_contenido: "revisada_y_aprobada",
        revision: await revisionAlDia(p),
      });
      p.prioridad_base = 5;
    });
    expect(r).toMatchObject({
      publicable: false,
      pendiente: "revision_desactualizada",
    });
  });

  it("la fecha de verificación no forma parte de lo revisado", async () => {
    const r = await evaluar(async (p) => {
      Object.assign(p, {
        revision_contenido: "revisada_y_aprobada",
        revision: await revisionAlDia(p),
      });
      p.fecha_verificacion = "2026-12-01";
    });
    expect(r).toMatchObject({ publicable: true, pendiente: null });
  });

  it("con errores: no entra aunque esté aprobada", async () => {
    expect(
      await evaluar((p) => (p.categoria = "categoria-inexistente")),
    ).toMatchObject({ publicable: false, estado: "invalido" });
  });
});

describe("controles y vocabulario", () => {
  it("el filtro recorre también herramientas, marcos y controles, y marca con advertencia", async () => {
    const c = catalogoBase();
    editar(buscar(c.herramientas, GARAK), (h) => (h.notas = codigo));
    const r = await validarCatalogo(c);
    expect(r.estado).toBe("con_advertencias");
    expect(
      r.hallazgos
        .filter((h) => h.ruta === GARAK)
        .map((h) => [h.regla, h.campo]),
    ).toEqual([
      ["filtro/marcada", "notas.en"],
      ["filtro/marcada", "notas.es"],
    ]);
  });

  it("una prueba que cita un control de una capa cargada no pide control", async () => {
    const c = catalogoBase();
    conCapa(c);
    const ruta = conReferencia(c, (p) =>
      Object.assign(p, {
        controles: ["prueba-A.1.1"],
        control_pendiente: false,
      }),
    );
    const r = await validarCatalogo(c);
    expect(
      r.hallazgos.filter((h) => h.ruta === ruta || h.ruta === CAPA),
    ).toEqual([]);
    expect(r.estado).toBe("ok");
    expect(r.conteos.controles).toBe(39);
  });

  it("una capa nombra su marco con versión, y sus equivalencias también", async () => {
    const c = catalogoBase();
    conCapa(
      c,
      (capa) => Object.assign(capa, { id: "a", marco_id: "marco-inexistente" }),
      "datos/controles/a.json",
    );
    conCapa(
      c,
      (capa) => Object.assign(capa, { id: "b", version_marco: "2019" }),
      "datos/controles/b.json",
    );
    conCapa(
      c,
      (capa) => {
        capa.id = "c";
        fijar(capa, "areas.0.controles.0.id", "otra-A.1.1");
        fijar(
          capa,
          "areas.0.controles.0.controles_equivalentes.0.version_marco",
          undefined,
        );
      },
      "datos/controles/c.json",
    );
    const r = await validarCatalogo(c);
    const de = (ruta: string) =>
      r.hallazgos.filter((h) => h.ruta === ruta).map((h) => h.regla);
    expect(de("datos/controles/a.json")).toContain(
      "referencia/marco-inexistente",
    );
    expect(de("datos/controles/b.json")).toContain(
      "referencia/version-inexistente",
    );
    expect(de("datos/controles/b.json")).toContain("catalogo/id-duplicado");
    expect(de("datos/controles/c.json")).toEqual(["referencia/sin-version"]);
  });

  it("un id repetido dentro de un archivo de vocabulario se reporta", async () => {
    const c = catalogoBase();
    editar(c.familias!, (f) => {
      const familias = f.familias as Json[];
      familias.push({ ...familias[0] });
      (familias[1].categorias as Json[]).push({
        ...(familias[1].categorias as Json[])[0],
      });
    });
    const r = await validarCatalogo(c);
    expect(
      r.hallazgos
        .filter((h) => h.regla === "catalogo/id-duplicado")
        .map((h) => h.campo),
    ).toEqual(["familias.1.categorias.8.id", "familias.4.id"]);
  });

  it("una prueba que no pasa el esquema igual pasa por el filtro", async () => {
    const c = catalogoBase();
    const ruta = conReferencia(c, (p) =>
      Object.assign(p, { prioridad_base: 9, notas: codigo }),
    );
    const r = await validarCatalogo(c);
    expect(
      r.hallazgos
        .filter((h) => h.ruta === ruta)
        .map((h) => h.regla)
        .sort(),
    ).toEqual(["esquema/campo-invalido", "filtro/marcada", "filtro/marcada"]);
  });

  it("un rasgo de opción admite solo sus opciones", async () => {
    const c = catalogoBase();
    const bien = conReferencia(
      c,
      (p) =>
        (p.aplicabilidad = {
          ...(p.aplicabilidad as Json),
          condiciones: [{ rasgo: "tipo_de_acceso", valor: "caja_negra" }],
        }),
    );
    const p = referencia();
    Object.assign(p, {
      id: "PR-CASO-002",
      aplicabilidad: {
        ...(p.aplicabilidad as Json),
        condiciones: [{ rasgo: "tipo_de_acceso", valor: "caja_gris" }],
      },
    });
    const mal = conPrueba(c, p);
    const r = await validarCatalogo(c);
    expect(
      r.hallazgos.filter((h) => h.ruta === bien && h.severidad === "error"),
    ).toEqual([]);
    expect(r.hallazgos.find((h) => h.ruta === mal)?.regla).toBe(
      "prueba/condicion-invalida",
    );
  });
});

describe("el detalle de un campo que no cumple el esquema se lee en los dos idiomas", () => {
  it.each([
    ["prioridad_base", "4", "se esperaba un número", "expected a number"],
    ["prioridad_base", 1.5, "se esperaba un entero", "expected an integer"],
    ["prioridad_base", 0, "al menos 1", "at least 1"],
    [
      "madurez",
      "x",
      "valores admitidos: estandar, emergente, propia",
      "allowed values: estandar, emergente, propia",
    ],
    [
      "fecha_verificacion",
      "2026-02-30",
      "se esperaba una fecha AAAA-MM-DD que exista",
      "expected an existing YYYY-MM-DD date",
    ],
    ["nombre.es", "", "al menos 1 caracteres", "at least 1 characters"],
    [
      "nombre.es",
      "x".repeat(2001),
      "como mucho 2000 caracteres",
      "at most 2000 characters",
    ],
    ["nombre.es", "   ", "el texto está en blanco", "the text is blank"],
    ["fuentes", [], "al menos 1 elementos", "at least 1 items"],
    [
      "herramientas_recomendadas.0.selector",
      { tipo: "otro" },
      "no coincide con ninguna de las formas admitidas",
      "matches none of the allowed shapes",
    ],
    [
      "fuentes.0.url",
      "http://example.org",
      "se esperaba una dirección https",
      "expected an https address",
    ],
  ])("%s = %j", async (campo, valor, es, en) => {
    const c = catalogoBase();
    const ruta = conReferencia(c, (p) => fijar(p, campo, valor));
    const r = await validarCatalogo(c);
    const h = r.hallazgos.find(
      (x) => x.ruta === ruta && x.regla === "esquema/campo-invalido",
    );
    expect(h?.campo).toBe(
      campo
        .replace(/\.selector$/, ".selector.tipo")
        .replace(/^fuentes$/, "fuentes"),
    );
    expect(h?.detalle).toEqual({ es, en });
  });

  it("un campo desconocido anidado dice su ruta completa", async () => {
    const c = catalogoBase();
    const ruta = conReferencia(c, (p) =>
      fijar(p, "resultado_esperado.extra", 1),
    );
    const r = await validarCatalogo(c);
    expect(r.hallazgos.find((h) => h.ruta === ruta)).toMatchObject({
      regla: "esquema/campo-desconocido",
      campo: "resultado_esperado.extra",
    });
  });
});

describe("aplicabilidad del marco", () => {
  it("una referencia adicional a un marco que no aplica a la familia también es un error, en su campo", async () => {
    const c = catalogoBase();
    const ruta = conReferencia(c, (p) => {
      p.referencias_adicionales = [
        {
          marco_id: "owasp-asvs",
          version_marco: "5.0.0",
          referencia_en_marco: "V1",
        },
      ];
    });
    const r = await validarCatalogo(c);
    expect(
      r.hallazgos
        .filter((h) => h.regla === "prueba/marco-no-aplica" && h.ruta === ruta)
        .map((h) => h.campo),
    ).toEqual(["referencias_adicionales.0.marco_id"]);
  });
});

describe("aprobar una prueba revisada (§ 6.4)", () => {
  it("el hallazgo da la huella a registrar, y con ella registrada la prueba se publica", async () => {
    const c = catalogoBase();
    const p = referencia();
    p.id = "PR-CASO-001";
    p.revision_contenido = "revisada_y_aprobada";
    const ruta = conPrueba(c, p);
    const esperada = await huellaDeRevision(Prueba.parse(p));

    const antes = await validarCatalogo(c);
    const h = antes.hallazgos.find(
      (x) => x.regla === "prueba/revision-sin-registro" && x.ruta === ruta,
    );
    expect(h?.detalle?.es).toBe(`huella del contenido a revisar: ${esperada}`);
    expect(h?.detalle?.en).toBe(
      `fingerprint of the content to review: ${esperada}`,
    );

    const registrada = catalogoBase();
    conPrueba(registrada, {
      ...p,
      revision: {
        fecha: "2026-10-05",
        por: "revisora",
        decision: { es: "Revisada y aprobada.", en: "Reviewed and approved." },
        huella: esperada,
      },
    });
    const despues = await validarCatalogo(registrada);
    expect(
      despues.hallazgos.filter((x) => x.regla.startsWith("prueba/revision")),
    ).toEqual([]);
    expect(
      despues.catalogo.pruebas.find((x) => x.prueba.id === "PR-CASO-001")
        ?.publicable,
    ).toBe(true);
  });
});
