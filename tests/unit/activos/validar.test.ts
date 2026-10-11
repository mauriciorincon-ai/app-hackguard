// @vitest-environment node
// El validador del activo: los tres demo pasan (el portal con su advertencia y su nota), y cada regla se
// demuestra con un activo que la rompe. Un activo sin alcance ni reglas NO es un error: es «sin plan».
import { describe, expect, it } from "vitest";
import {
  REGLAS_DE_ACTIVO,
  validarActivos,
  type IdReglaDeActivo,
} from "../../../src/engine/activos/validar.ts";
import type { Activo } from "../../../src/engine/activos/esquemas.ts";
import {
  ASISTENTE,
  CLASIFICADOR,
  copia,
  libre,
  mundo,
  PORTAL,
} from "../planificador/ayuda.ts";

async function validar(
  ruta: string,
  cambiar: (a: Activo) => void,
  base = ASISTENTE,
) {
  const m = await mundo();
  const a = copia(m.activos[base]!);
  cambiar(a);
  return validarActivos([{ ruta, texto: JSON.stringify(a) }], {
    familias: m.instantanea.catalogo.familias.map((f) => f.id),
    rasgos: m.instantanea.catalogo.rasgos,
    pruebas: m.instantanea.catalogo.pruebas,
  });
}
const publica = (id: string) => `datos/activos/demo/${id}.json`;
const reglas = (r: { hallazgos: { regla: string }[] }) =>
  r.hallazgos.map((h) => h.regla);

describe("los activos demo", () => {
  it("son tres, válidos, y solo el portal queda sin autorización", async () => {
    const m = await mundo();
    const r = validarActivos(m.archivos, {
      familias: m.instantanea.catalogo.familias.map((f) => f.id),
      rasgos: m.instantanea.catalogo.rasgos,
      pruebas: m.instantanea.catalogo.pruebas,
    });
    expect(r.estado).toBe("con_advertencias");
    expect(r.activos.map((a) => [a.activo.id, a.autorizado])).toEqual([
      [ASISTENTE, true],
      [CLASIFICADOR, true],
      [PORTAL, false],
    ]);
    expect(r.hallazgos.map((h) => [h.regla, h.severidad])).toEqual([
      ["activo/sin-autorizacion", "nota"],
      ["activo/proveedor-sin-politica", "advertencia"],
    ]);
  });
});

const ROTAS: [string, IdReglaDeActivo, (a: Activo) => void][] = [
  [
    "id distinto del nombre del archivo",
    "archivo/nombre-no-coincide",
    (a) => (a.id = "otro-activo"),
  ],
  [
    "un campo desconocido",
    "esquema/campo-invalido",
    (a) => (libre(a).sorpresa = 1),
  ],
  [
    "un activo propio en la carpeta pública",
    "activo/origen-no-demo-en-datos-publicos",
    (a) => (a.origen = "propio"),
  ],
  [
    "dueño igual al proveedor (en español)",
    "activo/dueno-igual-proveedor",
    (a) => (a.proveedor!.nombre.es = ` ${a.dueno.nombre.es.toUpperCase()} `),
  ],
  [
    "dueño igual al proveedor (en inglés)",
    "activo/dueno-igual-proveedor",
    (a) => (a.proveedor!.nombre.en = a.dueno.nombre.en),
  ],
  [
    "una familia que el catálogo no tiene",
    "activo/familia-inexistente",
    (a) => a.familias.push("quimica"),
  ],
  [
    "alcance con una familia que el activo no tiene",
    "activo/alcance-familia-fuera-del-activo",
    (a) => a.alcance!.familias.push("modelo_decision"),
  ],
  [
    "un rasgo que el catálogo no tiene",
    "activo/rasgo-inexistente",
    (a) => (a.rasgos["rasgo_imaginario"] = true),
  ],
  [
    "tipo_de_acceso escrito en los rasgos",
    "activo/rasgo-no-booleano",
    (a) => (a.rasgos["tipo_de_acceso"] = true),
  ],
  [
    "una prueba fuera de alcance que no existe",
    "activo/prueba-inexistente",
    (a) => (a.alcance!.fuera[0]!.prueba = "PR-XX-NADA-001"),
  ],
  [
    "un ajuste a una prueba que no existe",
    "activo/prueba-inexistente",
    (a) => (a.ajustes[0]!.prueba = "PR-XX-NADA-001"),
  ],
  [
    "un ajuste a una prueba de otra familia",
    "activo/ajuste-de-otra-familia",
    (a) => (a.ajustes[0]!.prueba = "PR-MD-CAL-001"),
  ],
  [
    "dos ajustes sobre la misma prueba",
    "activo/ajuste-duplicado",
    (a) => a.ajustes.push({ ...a.ajustes[0]!, accion: "agregada" }),
  ],
  [
    "política sin fecha de lectura",
    "activo/politica-sin-fecha",
    (a) => (a.proveedor!.politica_verificada = null),
  ],
  [
    "una regla que cita una política que no se leyó",
    "activo/regla-cita-politica-sin-leer",
    (a) => {
      a.proveedor!.politica = null;
      a.proveedor!.politica_fuente = null;
      a.proveedor!.politica_verificada = null;
    },
  ],
];

describe("cada regla de error se demuestra con un activo que la rompe", () => {
  it.each(ROTAS)("%s → %s", async (_n, regla, cambiar) => {
    const r = await validar(publica(ASISTENTE), cambiar);
    expect(reglas(r)).toContain(regla);
    expect(r.estado).toBe("invalido");
    expect(r.activos).toEqual([]);
    expect(REGLAS_DE_ACTIVO[regla].severidad).toBe("error");
  });

  it("un JSON que no lo es", () => {
    const r = validarActivos([{ ruta: publica(ASISTENTE), texto: "{" }], {
      familias: [],
      rasgos: [],
      pruebas: [],
    });
    expect(reglas(r)).toEqual(["archivo/json-invalido"]);
  });

  it("dos archivos con el mismo id", async () => {
    const m = await mundo();
    const texto = JSON.stringify(m.activos[ASISTENTE]);
    const r = validarActivos(
      [
        { ruta: publica(ASISTENTE), texto },
        { ruta: "datos/privado/activos/act-demo-asistente.json", texto },
      ],
      {
        familias: m.instantanea.catalogo.familias.map((f) => f.id),
        rasgos: m.instantanea.catalogo.rasgos,
        pruebas: m.instantanea.catalogo.pruebas,
      },
    );
    expect(reglas(r)).toContain("activo/id-duplicado");
  });
});

describe("advertencias y notas: el activo es válido pero algo pide atención", () => {
  it("un ajuste que no cambia nada", async () => {
    const quita = await validar(publica(ASISTENTE), (a) =>
      a.ajustes.push({
        prueba: "PR-SW-LOG-001",
        accion: "quitada",
        fecha: "2026-10-01",
        justificacion: {
          es: "No la pedía el perfil",
          en: "The profile did not ask for it",
        },
      }),
    );
    expect(reglas(quita)).toContain("activo/ajuste-redundante");
    const agrega = await validar(publica(ASISTENTE), (a) =>
      a.ajustes.push({
        prueba: "PR-SW-CSP-001",
        accion: "agregada",
        fecha: "2026-10-01",
        justificacion: {
          es: "Ya la pedía el perfil",
          en: "The profile already asked for it",
        },
      }),
    );
    expect(reglas(agrega)).toContain("activo/ajuste-redundante");
    expect(agrega.estado).toBe("con_advertencias");
    expect(agrega.activos).toHaveLength(1);
  });

  it("alcance sin reglas: autorización incompleta, no «sin autorización»", async () => {
    const r = await validar(publica(ASISTENTE), (a) => (a.reglas = null));
    expect(reglas(r)).toEqual(["activo/autorizacion-incompleta"]);
    expect(r.activos[0]?.autorizado).toBe(false);
  });

  it("un activo propio en la carpeta privada es válido", async () => {
    const r = await validar(
      "datos/privado/activos/act-demo-asistente.json",
      (a) => (a.origen = "propio"),
    );
    expect(r.estado).toBe("ok");
    expect(r.activos).toHaveLength(1);
  });

  it("el hallazgo trae el campo y el detalle cuando el esquema se rompe", async () => {
    const r = await validar(publica(ASISTENTE), (a) => delete libre(a).dueno);
    const h = r.hallazgos.find((x) => x.regla === "esquema/campo-invalido");
    expect(h?.campo).toBe("dueno");
    expect(h?.detalle?.es).toContain("dueno");
  });
});
