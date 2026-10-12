// @vitest-environment node
// El cargador de disco del libro: lee los demo, verifica los planes contra su huella y escribe lo propio privado.
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ESTADOS_DE_HALLAZGO, MOTIVOS_DE_RECHAZO } from "../../../src/engine/hallazgos/esquemas.ts";
import {
  cargarEscalaIa,
  cargarEtiquetasDeHallazgo,
  cargarHallazgos,
  cargarHallazgosPublicos,
  cargarPlanesEmitidos,
  cargarPlazos,
  cargarSobres,
  cargarSobresPublicos,
  escribirDato,
  origenDelActivo,
  pruebasConocidas,
} from "../../../src/lib/evidencia/cargar-evidencia.ts";
import { ASISTENTE, CLASIFICADOR, mundo, RAIZ } from "../evidencia/ayuda.ts";

const temporales: string[] = [];
const tmp = () => {
  const d = mkdtempSync(path.join(tmpdir(), "hackguard-carga-"));
  temporales.push(d);
  return d;
};
afterAll(() => temporales.forEach((d) => rmSync(d, { recursive: true, force: true })));
const modo = (ruta: string) => statSync(ruta).mode & 0o777;

describe("lo que lee", () => {
  it("los 16 sobres y los 4 hallazgos demo, con su ruta relativa y con «/»", () => {
    const sobres = cargarSobres(RAIZ);
    expect(sobres).toHaveLength(16);
    expect(sobres[0]!.ruta).toBe("datos/evidencia/demo/SOB-0003.json");
    expect(cargarHallazgos(RAIZ).map((h) => h.ruta)).toEqual([
      "datos/hallazgos/demo/HZ-0003.json",
      "datos/hallazgos/demo/HZ-0005.json",
      "datos/hallazgos/demo/HZ-0007.json",
      "datos/hallazgos/demo/HZ-0009.json",
    ]);
  });

  it("lo que las pantallas leen es solo lo versionado (demo)", () => {
    expect(cargarSobresPublicos(RAIZ)).toEqual(cargarSobres(RAIZ));
    expect(cargarHallazgosPublicos(RAIZ)).toEqual(cargarHallazgos(RAIZ));
  });

  it("sin carpetas no hay archivos (una raíz vacía no es un error)", () => {
    expect(cargarSobres(tmp())).toEqual([]);
    expect(cargarHallazgos(tmp())).toEqual([]);
  });

  it("también lee lo propio de datos/privado/, y solo los .json", () => {
    const raiz = tmp();
    mkdirSync(path.join(raiz, "datos/privado/evidencia/sub"), { recursive: true });
    writeFileSync(path.join(raiz, "datos/privado/evidencia/SOB-0001.json"), "{}");
    writeFileSync(path.join(raiz, "datos/privado/evidencia/sub/SOB-0002.json"), "{}");
    writeFileSync(path.join(raiz, "datos/privado/evidencia/notas.txt"), "no");
    expect(cargarSobres(raiz).map((a) => a.ruta)).toEqual(["datos/privado/evidencia/SOB-0001.json", "datos/privado/evidencia/sub/SOB-0002.json"]);
  });

  it("las pruebas del catálogo con su familia y su regla de veredicto", async () => {
    const m = await mundo();
    const pruebas = pruebasConocidas(m.instantanea);
    expect(pruebas).toHaveLength(38);
    expect(pruebas.find((p) => p.id === "PR-IA-PINJ-001")).toEqual({ id: "PR-IA-PINJ-001", familia: "modelo_generativo", regla: "asimetrica_k" });
    expect(pruebas.find((p) => p.id === "PR-SW-CSP-001")).toMatchObject({ familia: "software", regla: "comprobacion_determinista" });
  });
});

describe("los datos que gobiernan a los hallazgos", () => {
  it("los plazos y las etiquetas cumplen su esquema", () => {
    expect(cargarPlazos(RAIZ).dias.alto).toBe(30);
    expect(cargarEtiquetasDeHallazgo(RAIZ).etiquetas.length).toBeGreaterThan(0);
  });

  it("cada motivo por el que una re-prueba no cierra tiene su texto en los dos idiomas, y ninguno sobra", () => {
    const motivos = cargarEtiquetasDeHallazgo(RAIZ).motivos_de_rechazo;
    expect(motivos.map((m) => m.id).sort()).toEqual([...MOTIVOS_DE_RECHAZO].sort());
    for (const m of motivos) {
      expect(m.nombre.es.length, m.id).toBeGreaterThan(10);
      expect(m.nombre.en.length, m.id).toBeGreaterThan(10);
    }
  });

  it("las etiquetas no repiten id y traen rol y símbolo (regla dura 12), con las cuatro del plazo", () => {
    const e = cargarEtiquetasDeHallazgo(RAIZ).etiquetas;
    expect(new Set(e.map((x) => x.id)).size).toBe(e.length);
    expect(e.map((x) => x.id)).toEqual(expect.arrayContaining(["en_plazo", "no_corre", "sin_plazo", "vencido"]));
    for (const x of e) {
      expect(x.rol, x.id).toBeTruthy();
      expect(x.simbolo, x.id).toBeTruthy();
    }
  });
});

describe("el orden del selector de hallazgos", () => {
  it("nombra cada estado del ciclo de vida una vez, de lo que pide acción a lo cerrado", () => {
    const orden = cargarEtiquetasDeHallazgo(RAIZ).orden_del_selector;
    expect([...orden].sort()).toEqual([...ESTADOS_DE_HALLAZGO].sort());
    expect(orden[0]).toBe("abierto");
    expect(orden.indexOf("cerrado")).toBeGreaterThan(orden.indexOf("aceptado_con_riesgo"));
  });
});

describe("la escala de severidad de IA", () => {
  it("la tabla de datos carga validada", () => {
    expect(cargarEscalaIa(RAIZ).version).toBe("1");
  });
  it("una tabla que viola el piso no se carga: dice qué regla y dónde", () => {
    const raiz = tmp();
    mkdirSync(path.join(raiz, "datos/severidad"), { recursive: true });
    const tabla = JSON.parse(readFileSync(path.join(RAIZ, "datos/severidad/escala-ia.json"), "utf8"));
    tabla.tabla.find((f: { impacto: number }) => f.impacto === 4).niveles[0] = "medio";
    writeFileSync(path.join(raiz, "datos/severidad/escala-ia.json"), JSON.stringify(tabla));
    expect(() => cargarEscalaIa(raiz)).toThrow(/escala\/viola-piso \(impacto 4, banda 1: medio < alto\)/);
  });
  it("una tabla con un campo de más no cumple el esquema", () => {
    const raiz = tmp();
    mkdirSync(path.join(raiz, "datos/severidad"), { recursive: true });
    const tabla = JSON.parse(readFileSync(path.join(RAIZ, "datos/severidad/escala-ia.json"), "utf8"));
    writeFileSync(path.join(raiz, "datos/severidad/escala-ia.json"), JSON.stringify({ ...tabla, suma: 1 }));
    expect(() => cargarEscalaIa(raiz)).toThrow();
  });
});

describe("los planes emitidos se verifican contra su huella", () => {
  it("los dos planes demo cargan, con su paquete", async () => {
    const planes = await cargarPlanesEmitidos(RAIZ);
    expect(Object.keys(planes).sort()).toEqual([ASISTENTE, CLASIFICADOR]);
    expect(planes[ASISTENTE]!.plan.paquete.huella).toBe(planes[ASISTENTE]!.paquete.huella);
  });

  function raizConPlanes() {
    const raiz = tmp();
    cpSync(path.join(RAIZ, "datos/planes"), path.join(raiz, "datos/planes"), { recursive: true });
    return raiz;
  }
  const editar = (raiz: string, archivo: string, f: (o: Record<string, unknown>) => void) => {
    const ruta = path.join(raiz, "datos/planes", archivo);
    const o = JSON.parse(readFileSync(ruta, "utf8"));
    f(o);
    writeFileSync(ruta, JSON.stringify(o));
  };

  it("un plan editado a mano rompe la carga", async () => {
    const raiz = raizConPlanes();
    editar(raiz, `${ASISTENTE}.plan.json`, (o) => ((o.resumen as { planeadas: number }).planeadas += 1));
    await expect(cargarPlanesEmitidos(raiz)).rejects.toThrow(/huella del plan/);
  });

  it("un paquete editado a mano rompe la carga", async () => {
    const raiz = raizConPlanes();
    editar(raiz, `${ASISTENTE}.paquete.json`, (o) => ((o.alcance as { ventana: { es: string } }).ventana.es = "otra ventana"));
    await expect(cargarPlanesEmitidos(raiz)).rejects.toThrow(/huella del paquete/);
  });

  it("un plan que cita otro paquete rompe la carga", async () => {
    const raiz = raizConPlanes();
    // Se pone el paquete del clasificador bajo el nombre del asistente: su huella es válida, pero no es la que el plan cita.
    cpSync(path.join(RAIZ, `datos/planes/${CLASIFICADOR}.paquete.json`), path.join(raiz, `datos/planes/${ASISTENTE}.paquete.json`));
    await expect(cargarPlanesEmitidos(raiz)).rejects.toThrow(/cita otro paquete/);
  });

  it("sin planes no hay nada que verificar", async () => {
    expect(await cargarPlanesEmitidos(tmp())).toEqual({});
  });
});

describe("de dónde viene un activo", () => {
  it("los de datos/activos/demo/ son demo; los de datos/privado/activos/ son propios; el resto no existe", () => {
    expect(origenDelActivo(RAIZ, ASISTENTE)).toBe("demo");
    expect(origenDelActivo(RAIZ, "no-existe")).toBeNull();
    const raiz = tmp();
    mkdirSync(path.join(raiz, "datos/privado/activos"), { recursive: true });
    writeFileSync(path.join(raiz, "datos/privado/activos/mio.json"), "{}");
    expect(origenDelActivo(raiz, "mio")).toBe("propio");
  });
});

describe("escribir lo que la CLI produce (regla 17-bis)", () => {
  it("lo propio nace 0600 en una carpeta 0700; lo público, 0644 en 0755", () => {
    const raiz = tmp();
    escribirDato(raiz, "datos/privado/evidencia/SOB-0001.json", "{}\n", true);
    escribirDato(raiz, "datos/evidencia/demo/SOB-0001.json", "{}\n", false);
    expect(modo(path.join(raiz, "datos/privado/evidencia/SOB-0001.json"))).toBe(0o600);
    expect(modo(path.join(raiz, "datos/privado/evidencia"))).toBe(0o700);
    expect(modo(path.join(raiz, "datos/evidencia/demo/SOB-0001.json"))).toBe(0o644);
    expect(modo(path.join(raiz, "datos/evidencia/demo"))).toBe(0o755);
  });

  it("un archivo que ya existía con otro modo se deja en el que corresponde, y el contenido se actualiza", () => {
    const raiz = tmp();
    escribirDato(raiz, "datos/privado/x.json", "uno", true);
    chmodSync(path.join(raiz, "datos/privado/x.json"), 0o644);
    escribirDato(raiz, "datos/privado/x.json", "dos", true);
    expect(modo(path.join(raiz, "datos/privado/x.json"))).toBe(0o600);
    expect(readFileSync(path.join(raiz, "datos/privado/x.json"), "utf8")).toBe("dos");
  });

  it("si el contenido es el mismo no lo reescribe (conserva su fecha)", () => {
    const raiz = tmp();
    const ruta = path.join(raiz, "datos/privado/y.json");
    escribirDato(raiz, "datos/privado/y.json", "igual", true);
    const antes = statSync(ruta).mtimeMs;
    escribirDato(raiz, "datos/privado/y.json", "igual", true);
    expect(statSync(ruta).mtimeMs).toBe(antes);
  });
});
