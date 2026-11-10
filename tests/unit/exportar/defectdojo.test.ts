// @vitest-environment node
// D9 — la exportación a DefectDojo. Lo que se demuestra: cada uno de los 8 estados del ciclo sale con las banderas de la tabla;
// `is_mitigated` solo sale verdadero con una re-prueba confirmada (dos llaves: la tabla y la comprobación del sobre de cierre); un
// reabierto sale activo; la cadena, el control ISO/IEC 42001, la severidad calculada y las huellas viajan; el crudo, el extracto y la
// nota libre de una corrección jamás; y el archivo valida contra el esquema estricto del formato fijado.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ExportacionDeDefectDojo,
  exportarADefectDojo,
  exportarHallazgo,
  HallazgoDeDefectDojo,
  reprobacionConfirmada,
  TablaDeExportacion,
  type EntradaDeExportacion,
} from "../../../src/engine/exportar/defectdojo.ts";
import type { Sobre } from "../../../src/engine/evidencia/esquemas.ts";
import {
  ESTADOS_DE_HALLAZGO,
  type Evento,
  type Hallazgo,
} from "../../../src/engine/hallazgos/esquemas.ts";
import { situacionDeHallazgo } from "../../../src/engine/hallazgos/situacion.ts";
import {
  cargarTablaDeExportacion,
  entradasDeExportacion,
  textoDeExportacion,
} from "../../../src/lib/exportar/defectdojo.ts";
import { con, copia, nuevo, ASISTENTE } from "../evidencia/ayuda.ts";
import { activos, instantanea, mundoDeHallazgos } from "../lib/mundo-de-brecha";

const FECHA = "2026-11-09";
const tabla = cargarTablaDeExportacion();
const entradas = entradasDeExportacion(
  ASISTENTE,
  mundoDeHallazgos,
  activos,
  instantanea,
  FECHA,
);
const porId = (id: string) => entradas.find((e) => e.hallazgo.id === id)!;
const exportado = (id: string) => exportarHallazgo(porId(id), tabla);

/** Una entrada con otro hallazgo y/o libro, calculada por el motor del ciclo (no a mano). */
function entradaCon(
  base: EntradaDeExportacion,
  h: Hallazgo,
  libro: Sobre[],
): EntradaDeExportacion {
  const libroEfectivo = libro.map((s) => ({
    ...s,
    confirmacion:
      s.confirmacion === null
        ? null
        : { ...s.confirmacion, modo: "individual" as const },
  }));
  const r = situacionDeHallazgo(h, libroEfectivo, {
    escala: mundoDeHallazgos.escala,
    plazos: mundoDeHallazgos.plazos,
    fecha: FECHA,
  });
  if (!r.ok) throw new Error(`${r.motivo}: ${r.detalle}`);
  return { ...base, hallazgo: h, situacion: r.situacion, libro: libroEfectivo };
}
const libroDemo = () =>
  mundoDeHallazgos.libro.map((s) => copia(s)) as unknown as Sobre[];
const POR = "Operador demo";

describe("la tabla de estados", () => {
  it("cubre los 8 estados del ciclo y solo «cerrado» sale mitigado", () => {
    expect(Object.keys(tabla.estados).sort()).toEqual(
      [...ESTADOS_DE_HALLAZGO].sort(),
    );
    const mitigados = ESTADOS_DE_HALLAZGO.filter(
      (e) => tabla.estados[e].is_mitigated,
    );
    expect(mitigados).toEqual(["cerrado"]);
    expect(tabla.estados.reabierto.active).toBe(true);
    expect(tabla.estados.aceptado_con_riesgo.risk_accepted).toBe(true);
    expect(TablaDeExportacion.safeParse(tabla).success).toBe(true);
  });
  it("cada severidad del producto tiene la suya en el vocabulario de DefectDojo", () => {
    expect(tabla.severidades).toEqual({
      critico: "Critical",
      alto: "High",
      medio: "Medium",
      bajo: "Low",
      informativo: "Info",
    });
  });
});

describe("los estados de los hallazgos demo", () => {
  it.each([
    [
      "HZ-0003",
      "cerrado",
      {
        active: false,
        verified: true,
        is_mitigated: true,
        risk_accepted: false,
      },
    ],
    [
      "HZ-0005",
      "aceptado_con_riesgo",
      {
        active: false,
        verified: true,
        is_mitigated: false,
        risk_accepted: true,
      },
    ],
    [
      "HZ-0007",
      "abierto",
      {
        active: true,
        verified: true,
        is_mitigated: false,
        risk_accepted: false,
      },
    ],
    [
      "HZ-0009",
      "corregido",
      {
        active: true,
        verified: true,
        is_mitigated: false,
        risk_accepted: false,
      },
    ],
    [
      "HZ-0011",
      "reabierto",
      {
        active: true,
        verified: true,
        is_mitigated: false,
        risk_accepted: false,
      },
    ],
  ])("%s (%s) sale con las banderas de la tabla", (id, estado, banderas) => {
    expect(porId(id).situacion.evaluacion.estado).toBe(estado);
    const f = exportado(id);
    expect({
      active: f.active,
      verified: f.verified,
      is_mitigated: f.is_mitigated,
      risk_accepted: f.risk_accepted,
    }).toEqual(banderas);
    expect(f.tags).toContain(`hackguard:estado:${estado}`);
  });

  it("un reabierto sale ACTIVO y sin fecha de mitigación", () => {
    const f = exportado("HZ-0011");
    expect(f.active).toBe(true);
    expect(f.is_mitigated).toBe(false);
    expect(f.mitigated).toBeUndefined();
    expect(f.description).toContain("Reapertura por una re-prueba que falló");
  });

  it("solo el cerrado por re-prueba lleva `mitigated`, con la fecha en que una persona confirmó el cierre", () => {
    const e = porId("HZ-0003").situacion.evaluacion;
    expect(exportado("HZ-0003").mitigated).toBe(e.cierre?.fecha);
    for (const id of ["HZ-0005", "HZ-0007", "HZ-0009", "HZ-0011"])
      expect(exportado(id).mitigated).toBeUndefined();
  });
});

describe("los estados que la demo no trae, calculados por el ciclo", () => {
  const base = () => porId("HZ-0007");
  const declarar = (e: Evento) => {
    const h = copia(base().hallazgo);
    h.eventos.push(e);
    return exportarHallazgo(entradaCon(base(), h, libroDemo()), tabla);
  };
  it("cerrado por eliminación: inactivo y NO mitigado (nadie lo re-probó)", () => {
    const f = declarar({
      tipo: "eliminacion",
      fecha: "2026-10-20",
      por: POR,
      justificacion: { es: "j", en: "j" },
    });
    expect(f.tags).toContain("hackguard:estado:cerrado_por_eliminacion");
    expect([f.active, f.is_mitigated, f.risk_accepted]).toEqual([
      false,
      false,
      false,
    ]);
    expect(f.description).toContain(
      "Cierre por eliminación (sin re-prueba, no mitigado)",
    );
  });
  it("no reproducible: inactivo y NO mitigado", () => {
    const f = declarar({
      tipo: "no_reproducible",
      fecha: "2026-10-20",
      por: POR,
      justificacion: { es: "j", en: "j" },
    });
    expect(f.tags).toContain("hackguard:estado:no_reproducible");
    expect([f.active, f.is_mitigated]).toEqual([false, false]);
  });
  it("re-probado: una re-prueba confirmada que no cierra lo deja ACTIVO y no mitigado", async () => {
    const e9 = porId("HZ-0009");
    const origen = e9.situacion.evaluacion.sobreOrigen;
    // El sobre efectivo solo difiere del sobre del archivo en el modo de su confirmación; `nuevo` lo vuelve a sellar.
    const rp = await nuevo(origen as unknown as Sobre, "SOB-0090", {
      fecha: "2026-11-02",
      reprueba_de: "HZ-0009",
      veredicto: "fallida",
      resultado: {
        ejecutada: true,
        evaluadas: origen.k ?? 20,
        fallidas: 3,
        alertas: null,
        metrica: null,
      },
      confirmacion: { por: POR, fecha: "2026-11-02", modo: "individual" },
    });
    const f = exportarHallazgo(
      entradaCon(e9, e9.hallazgo, [...libroDemo(), rp]),
      tabla,
    );
    expect(f.tags).toContain("hackguard:estado:re_probado");
    expect([f.active, f.is_mitigated]).toEqual([true, false]);
  });
});

describe("mitigado solo con una re-prueba confirmada (dos llaves)", () => {
  it("la comprobación independiente acepta el cierre real y rechaza cada variante rota", async () => {
    const e = porId("HZ-0003");
    const ev = e.situacion.evaluacion;
    const sobreDeCierre = e.libro.find((s) => s.id === ev.cierre?.sobre)!;
    const ok = (s: { id: string }) =>
      reprobacionConfirmada(e.hallazgo, ev.activo, ev.prueba, s.id, e.libro);
    expect(ok(sobreDeCierre)?.id).toBe(sobreDeCierre.id);
    expect(
      reprobacionConfirmada(e.hallazgo, ev.activo, ev.prueba, null, e.libro),
    ).toBeNull();
    expect(
      reprobacionConfirmada(
        e.hallazgo,
        ev.activo,
        ev.prueba,
        "SOB-9999",
        e.libro,
      ),
    ).toBeNull();
    const roto = async (cambios: Partial<Omit<Sobre, "huellas">>) => {
      const s = await con(sobreDeCierre as unknown as Sobre, cambios);
      return reprobacionConfirmada(e.hallazgo, ev.activo, ev.prueba, s.id, [
        ...e.libro.filter((x) => x.id !== s.id),
        s as unknown as (typeof e.libro)[number],
      ]);
    };
    expect(await roto({ confirmacion: null })).toBeNull();
    expect(await roto({ veredicto: "fallida" })).toBeNull();
    expect(await roto({ reprueba_de: "HZ-0005" })).toBeNull();
    expect(await roto({ activo: "act-demo-clasificador" })).toBeNull();
    expect(
      await roto({
        resultado: { ...sobreDeCierre.resultado, ejecutada: false },
      }),
    ).toBeNull();
  });

  it("si el libro ya no respalda el cierre, el export LANZA en vez de marcar mitigado", async () => {
    const e = porId("HZ-0003");
    const cierre = e.libro.find(
      (s) => s.id === e.situacion.evaluacion.cierre?.sobre,
    )!;
    const sinConfirmar = await con(cierre as unknown as Sobre, {
      confirmacion: null,
    });
    const libro = [
      ...e.libro.filter((s) => s.id !== cierre.id),
      sinConfirmar as unknown as (typeof e.libro)[number],
    ];
    expect(() => exportarHallazgo({ ...e, libro }, tabla)).toThrow(
      /sin una re-prueba confirmada/,
    );
  });

  it("una tabla que dijera «mitigado» para otro estado también lanza", () => {
    for (const estado of [
      "reabierto",
      "abierto",
      "aceptado_con_riesgo",
    ] as const) {
      const t = copia(tabla);
      t.estados[estado].is_mitigated = true;
      const id = {
        reabierto: "HZ-0011",
        abierto: "HZ-0007",
        aceptado_con_riesgo: "HZ-0005",
      }[estado];
      expect(() => exportarHallazgo(porId(id), t)).toThrow(
        /mitigated|mitigado/,
      );
    }
  });
});

describe("lo que cada hallazgo lleva", () => {
  it("su cadena (apertura → corrección → re-prueba → cierre), su control ISO/IEC 42001 y las huellas de sus sobres, en ES y EN", () => {
    const e = porId("HZ-0003");
    const ev = e.situacion.evaluacion;
    const f = exportado("HZ-0003");
    const cierre = e.libro.find((s) => s.id === ev.cierre?.sobre)!;
    for (const texto of [
      "Apertura (sobre confirmado)",
      "Opening (confirmed envelope)",
      `Corrección declarada: ${ev.correccion?.fecha}`,
      "Re-prueba confirmada",
      "Cierre por re-prueba",
      "Closed by re-test",
      ev.sobreOrigen.id,
      ev.sobreOrigen.huellas.sobre,
      ev.sobreOrigen.huellas.resultado,
      ev.sobreOrigen.huellas.crudo,
      cierre.id,
      cierre.huellas.sobre,
    ])
      expect(f.description).toContain(texto);
    expect(f.tags).toContain("control:iso42001-A.6.2.4");
    expect(f.description).toContain(
      "iso42001-A.6.2.4 (Se verifica y se valida antes de usarse)",
    );
    expect(f.description).toContain(
      "iso42001-A.6.2.4 (Verified and validated before use)",
    );
    expect(f.references.split("\n")).toEqual(
      expect.arrayContaining([
        "iso42001-A.6.2.4",
        ev.prueba,
        ev.sobreOrigen.id,
        cierre.id,
      ]),
    );
    expect(f.title).toContain(" / ");
    expect(f.unique_id_from_tool).toBe("HZ-0003");
    expect(f.date).toBe(ev.apertura);
  });

  it("la severidad sale calculada: el vector CVSS 4.0 con su puntaje, o la tabla de IA con la versión", () => {
    const h = copia(porId("HZ-0007").hallazgo);
    h.severidad = {
      tipo: "cvss",
      vector: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N",
    };
    const f = exportarHallazgo(
      entradaCon(porId("HZ-0007"), h, libroDemo()),
      tabla,
    );
    expect(f.cvssv4).toBe(h.severidad.vector);
    expect(f.cvssv4_score).toBe(9.3);
    expect(f.severity).toBe("Critical");
    const ia = exportado("HZ-0007");
    expect(ia.cvssv4).toBeUndefined();
    expect(ia.severity_justification).toContain("escala-ia@");
  });

  it("jamás el crudo, el extracto redactado ni la nota libre de una corrección", () => {
    const texto = textoDeExportacion(exportarADefectDojo(entradas, tabla));
    for (const s of mundoDeHallazgos.libro)
      if (s.extracto_redactado !== null)
        expect(texto).not.toContain(s.extracto_redactado);
    for (const h of mundoDeHallazgos.hallazgos)
      for (const ev of h.eventos)
        if (ev.tipo === "correccion") {
          expect(texto).not.toContain(ev.nota.es);
          expect(texto).not.toContain(ev.nota.en);
        }
    // La huella del crudo sí viaja: es una huella, no el crudo.
    expect(texto).toContain(
      porId("HZ-0003").situacion.evaluacion.sobreOrigen.huellas.crudo,
    );
  });
});

describe("el archivo", () => {
  const exportacion = exportarADefectDojo(entradas, tabla);
  it("valida contra el esquema estricto del formato fijado (django-DefectDojo 3.5.100)", () => {
    expect(
      ExportacionDeDefectDojo.safeParse(
        JSON.parse(textoDeExportacion(exportacion)),
      ).success,
    ).toBe(true);
    expect(exportacion.findings.map((f) => f.unique_id_from_tool)).toEqual([
      "HZ-0003",
      "HZ-0005",
      "HZ-0007",
      "HZ-0009",
      "HZ-0011",
    ]);
    expect(tabla.fuente).toContain(
      "DefectDojo/django-DefectDojo/blob/3.5.100/",
    );
  });
  it("rechaza un campo que el formato no tiene, una severidad ajena y `false_p` verdadero", () => {
    const f = exportacion.findings[0]!;
    expect(HallazgoDeDefectDojo.safeParse({ ...f, crudo: "x" }).success).toBe(
      false,
    );
    expect(
      HallazgoDeDefectDojo.safeParse({ ...f, severity: "Alta" }).success,
    ).toBe(false);
    expect(
      HallazgoDeDefectDojo.safeParse({ ...f, false_p: true }).success,
    ).toBe(false);
    expect(
      HallazgoDeDefectDojo.safeParse({ ...f, tags: ["con espacio"] }).success,
    ).toBe(false);
  });
  it("la misma entrada da los mismos bytes, en orden de identificador", () => {
    const a = textoDeExportacion(exportarADefectDojo(entradas, tabla));
    const b = textoDeExportacion(
      exportarADefectDojo([...entradas].reverse(), tabla),
    );
    expect(b).toBe(a);
    expect(a.endsWith("\n")).toBe(true);
  });
  it("la tabla versionada es la que carga el build", () => {
    const crudo = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "datos/exportacion/defectdojo.json"),
        "utf8",
      ),
    );
    expect(TablaDeExportacion.parse(crudo)).toEqual(tabla);
  });
});
