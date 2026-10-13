// @vitest-environment node
// Matriz de envejecimiento de la brecha (regla 23, patrón `matriz-de-envejecimiento`): la brecha envejece sola, porque nada
// la cierra más que una re-prueba. Se construye el día de cada umbral de cada fecha (la víspera y el día) en que algo cambia
// de estado: la evidencia que pasa a antigua, el plazo de un hallazgo que se vence, la revisión de un riesgo aceptado y la
// ficha del catálogo que pasa a por revisar o vencida. En cada celda: se calcula, ningún día es negativo ni NaN, cada
// estado está donde le toca y los totales cuadran. El estado esperado se calcula aquí comparando FECHAS (`fechaMasDias`), no
// días, para no repetir la cuenta del motor.
import { describe, expect, it } from "vitest";
import {
  armarBrecha,
  type Brecha,
} from "../../../src/engine/brecha/calcular.ts";
import { fechaMasDias } from "../../../src/engine/fecha.ts";
import { entradaDemo } from "../lib/mundo-de-brecha";
import {
  ANTIGUA,
  BASE,
  FECHAS,
  PRIMERA,
  aceptaciones,
  aperturaDe,
  por_revisar,
  vencido,
} from "../lib/fechas-de-la-matriz";

const celdas = FECHAS.map((f) => [f, armarBrecha(entradaDemo(f))] as const);

describe("la matriz de envejecimiento de la brecha", () => {
  it("construye la brecha en cada fecha en que algo cambia de estado, y son muchas", () => {
    expect(FECHAS.length).toBeGreaterThan(20);
    expect(FECHAS[0]).toBe(PRIMERA);
  });

  it.each(celdas)(
    "%s: se calcula, nada es negativo ni NaN y los totales cuadran",
    (_f, b) => {
      expect(b.problemas).toEqual([]);
      const texto = JSON.stringify(b);
      expect(texto).not.toMatch(/NaN|undefined|Infinity/);
      expect(b.resumen.ejecutadas + b.resumen.no_ejecutadas).toBe(
        b.resumen.planeadas,
      );
      expect(b.resumen.superadas + b.resumen.fallidas).toBe(
        b.resumen.ejecutadas,
      );
      for (const f of b.filas) {
        if (f.edad !== null) expect(f.edad.dias).toBeGreaterThanOrEqual(0);
        expect(["vigente", "por_revisar", "vencido"]).toContain(
          f.vigenciaDeFicha.estado,
        );
      }
      for (const h of b.hallazgos) {
        expect(h.plazo.dias).toBeGreaterThanOrEqual(0);
        expect(h.plazo.atraso).toBeGreaterThanOrEqual(0);
      }
    },
  );

  it.each(celdas)("%s: cada estado está donde le toca", (f, b) => {
    // La evidencia es antigua desde la fecha que dice el umbral, comparando fechas.
    for (const fila of b.filas.filter((x) => x.ejecutada)) {
      const antigua = f >= fechaMasDias(fila.fecha!, ANTIGUA);
      expect(fila.edad?.estado, `${fila.prueba} ${f}`).toBe(
        antigua ? "antigua" : "vigente",
      );
    }
    // Un plazo está vencido cuando la fecha pasó el día en que vence; el riesgo aceptado revisa en su fecha.
    for (const h of b.hallazgos) {
      if (h.pideTrabajo && h.plazo.total !== null) {
        const vence = fechaMasDias(aperturaDe(h.id), h.plazo.total);
        expect(h.plazo.estado, `${h.id} ${f}`).toBe(
          f > vence ? "vencido" : "en_plazo",
        );
      }
      if (h.estado === "aceptado_con_riesgo") {
        const a = aceptaciones.find((x) => x.id === h.id)!;
        expect(h.revision?.estado, `${h.id} ${f}`).toBe(
          f >= fechaMasDias(a.fecha, a.dias) ? "toca_revisar" : "programada",
        );
      }
    }
    // La ficha del catálogo: vigente, por revisar o vencida según su fecha de verificación.
    for (const fila of b.filas) {
      const p = BASE.pruebas.find((x) => x.id === fila.prueba)!;
      const esperado =
        f >= fechaMasDias(p.fecha_verificacion, vencido)
          ? "vencido"
          : f >= fechaMasDias(p.fecha_verificacion, por_revisar)
            ? "por_revisar"
            : "vigente";
      expect(fila.vigenciaDeFicha.estado, `${fila.prueba} ${f}`).toBe(esperado);
    }
    // El estado de un control sale de sus fallas y de su evidencia más reciente, no de otra cuenta.
    for (const c of b.controles) {
      const esperado =
        c.fallas.length > 0
          ? "con_fallas"
          : c.ultima === null
            ? "sin_evidencia"
            : f >= fechaMasDias(c.ultima, ANTIGUA)
              ? "evidencia_antigua"
              : "con_evidencia_vigente";
      expect(c.estado, `${c.id} ${f}`).toBe(esperado);
    }
  });

  it("sin evidencia nueva, la brecha solo envejece: lo vencido y lo antiguo no vuelve atrás", () => {
    const orden = { con_evidencia_vigente: 0, evidencia_antigua: 1 } as const;
    const contiene = (a: Brecha["alertas"]["antiguas"], b: typeof a) =>
      a.every((x) =>
        b.some((y) => y.activo === x.activo && y.prueba === x.prueba),
      );
    for (let i = 1; i < celdas.length; i += 1) {
      const [fa, antes] = celdas[i - 1]!;
      const [fb, despues] = celdas[i]!;
      const donde = `${fa} → ${fb}`;
      expect(despues.vencidos, donde).toEqual(
        expect.arrayContaining(antes.vencidos),
      );
      expect(
        contiene(antes.alertas.antiguas, despues.alertas.antiguas),
        donde,
      ).toBe(true);
      expect(
        contiene(antes.alertas.fichasVencidas, despues.alertas.fichasVencidas),
        donde,
      ).toBe(true);
      expect(despues.alertas.revision, donde).toEqual(
        expect.arrayContaining(antes.alertas.revision),
      );
      for (const c of antes.controles) {
        const d = despues.controles.find((x) => x.id === c.id)!;
        if (c.estado in orden && d.estado in orden)
          expect(
            orden[d.estado as keyof typeof orden],
            `${c.id} ${donde}`,
          ).toBeGreaterThanOrEqual(orden[c.estado as keyof typeof orden]);
        // Un control con fallas o sin evidencia no cambia solo por el paso del tiempo.
        if (c.estado === "con_fallas" || c.estado === "sin_evidencia")
          expect(d.estado, `${c.id} ${donde}`).toBe(c.estado);
      }
    }
  });

  it("el día exacto del umbral la evidencia pasa de vigente a antigua, ni un día antes ni uno después", () => {
    const fila = armarBrecha(BASE).filas.find((f) => f.ejecutada)!;
    const dia = fechaMasDias(fila.fecha!, ANTIGUA);
    const lee = (f: string) =>
      armarBrecha(entradaDemo(f)).filas.find(
        (x) => x.activo === fila.activo && x.prueba === fila.prueba,
      )!.edad?.estado;
    expect(lee(fechaMasDias(dia, -1))).toBe("vigente");
    expect(lee(dia)).toBe("antigua");
    expect(lee(fechaMasDias(dia, 1))).toBe("antigua");
  });
});
