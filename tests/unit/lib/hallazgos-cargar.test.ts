// @vitest-environment node
// La carga del build de los hallazgos: lee solo lo versionado, lo comprueba contra el libro y la instantánea oficial, y rompe en
// vez de mostrar lo que no cuadra. Lo propio (datos/privado/) no entra al build (regla dura 8).
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { cargarHallazgosDelBuild } from "../../../src/lib/evidencia/cargar.ts";
import { cargarLibroValidado } from "../../../src/lib/evidencia/cargar-libro.ts";
import { cargarEtiquetasDeCvss, cargarPlanesEmitidos } from "../../../src/lib/evidencia/cargar-evidencia.ts";
import { cargarParaPaginaDeHallazgo, idsDeHallazgos } from "../../../src/lib/evidencia/pagina.ts";
import { mundo, RAIZ } from "../evidencia/ayuda.ts";

const temporales: string[] = [];
afterAll(() => temporales.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Una copia de `datos/` SIN lo privado: lo que se puede mutar sin tocar el repo ni mirar datos reales. */
function copiaDeDatos() {
  const raiz = mkdtempSync(path.join(tmpdir(), "hackguard-hallazgos-"));
  temporales.push(raiz);
  cpSync(path.join(RAIZ, "datos"), path.join(raiz, "datos"), {
    recursive: true,
    filter: (origen) => !origen.includes(`${path.sep}datos${path.sep}privado`),
  });
  return raiz;
}
const editar = (raiz: string, relativa: string, cambio: (texto: string) => string) => {
  const ruta = path.join(raiz, relativa);
  writeFileSync(ruta, cambio(readFileSync(ruta, "utf8")));
};

describe("el mundo de los hallazgos del build", () => {
  it("carga los 11 sobres y los 4 hallazgos demo, en orden, con sus datos", async () => {
    const m = await mundo();
    const c = await cargarHallazgosDelBuild(m.instantanea, RAIZ);
    expect(c.libro).toHaveLength(11);
    expect(c.hallazgos.map((h) => h.id)).toEqual(["HZ-0003", "HZ-0005", "HZ-0007", "HZ-0009"]);
    expect(c.escala.version).toBe("1");
    expect(c.plazos.dias.alto).toBe(30);
    expect(c.etiquetas.orden_del_selector[0]).toBe("abierto");
    expect(c.cvss.metricas).toHaveLength(11);
  });

  it("un sobre editado después de confirmarlo rompe el build, y dice cuál", async () => {
    const m = await mundo();
    const raiz = copiaDeDatos();
    editar(raiz, "datos/evidencia/demo/SOB-0019.json", (t) => t.replace('"fallidas": 42', '"fallidas": 41'));
    await expect(cargarHallazgosDelBuild(m.instantanea, raiz)).rejects.toThrow(/los sobres no pasan su validación[\s\S]*SOB-0019/);
  });

  it("un hallazgo con un vector CVSS truncado rompe el build", async () => {
    const m = await mundo();
    const raiz = copiaDeDatos();
    editar(raiz, "datos/hallazgos/demo/HZ-0009.json", (t) => t.replace(/CVSS:4\.0\/[^"]+/, "CVSS:4.0/AV:N"));
    await expect(cargarHallazgosDelBuild(m.instantanea, raiz)).rejects.toThrow(/los hallazgos no pasan su validación/);
  });

  it("lo propio no entra al build, aunque esté mal; el CLI sí lo ve", async () => {
    const m = await mundo();
    const raiz = copiaDeDatos();
    mkdirSync(path.join(raiz, "datos/privado/evidencia"), { recursive: true });
    writeFileSync(path.join(raiz, "datos/privado/evidencia/SOB-9999.json"), "{ no es un sobre");
    const build = await cargarHallazgosDelBuild(m.instantanea, raiz);
    expect(build.libro).toHaveLength(11);
    const cli = await cargarLibroValidado(raiz, m.instantanea, { privados: true });
    expect(cli.sobres.estado).toBe("invalido");
    const publico = await cargarLibroValidado(raiz, m.instantanea, { privados: false });
    expect(publico.sobres.estado).not.toBe("invalido");
  });

  it("un plan propio que no cuadra con su huella rompe al CLI pero no al build", async () => {
    const raiz = copiaDeDatos();
    mkdirSync(path.join(raiz, "datos/privado/planes"), { recursive: true });
    const plan = JSON.parse(readFileSync(path.join(raiz, "datos/planes/act-demo-asistente.plan.json"), "utf8"));
    plan.resumen.planeadas += 1;
    writeFileSync(path.join(raiz, "datos/privado/planes/mi.plan.json"), JSON.stringify(plan));
    cpSync(path.join(raiz, "datos/planes/act-demo-asistente.paquete.json"), path.join(raiz, "datos/privado/planes/mi.paquete.json"));
    await expect(cargarPlanesEmitidos(raiz)).rejects.toThrow(/huella del plan/);
    await expect(cargarPlanesEmitidos(raiz, { privados: false })).resolves.toHaveProperty("act-demo-asistente");
  });
});

describe("los nombres de las métricas de CVSS", () => {
  it("cargan validados; unos que no cubren la tabla del validador no se cargan", () => {
    expect(cargarEtiquetasDeCvss(RAIZ).grupos).toHaveLength(3);
    const raiz = copiaDeDatos();
    editar(raiz, "datos/severidad/cvss-etiquetas.json", (t) => {
      const e = JSON.parse(t);
      e.metricas = e.metricas.filter((m: { clave: string }) => m.clave !== "AV");
      return JSON.stringify(e);
    });
    expect(() => cargarEtiquetasDeCvss(raiz)).toThrow(/etiquetas-cvss\/metrica-base-sin-nombre \(AV\)/);
  });
});

describe("lo que comparten las páginas de hallazgo", () => {
  it("la instantánea oficial, los activos, el libro y una fecha de consulta que no es el reloj", async () => {
    const p = await cargarParaPaginaDeHallazgo();
    expect(p.consulta >= p.instantanea.fecha_evaluacion).toBe(true);
    expect(p.activos.activos.length).toBeGreaterThan(0);
    expect(p.mundo.hallazgos).toHaveLength(4);
    expect(await idsDeHallazgos()).toEqual(["HZ-0003", "HZ-0005", "HZ-0007", "HZ-0009"]);
  });
});
