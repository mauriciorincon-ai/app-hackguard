// @vitest-environment node
// El gate de deriva del kit del S3 y del lote de 200 (regla 23: el generador es la fuente; el kit del repo no se edita a mano) y las
// pruebas de las tres órdenes de la CLI. La CLI corre como la corre una persona: con el TypeScript nativo de Node.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  casosDelLoteDe200,
  metricasDeTandas,
  tandasDe,
} from "../../../src/engine/supuestos/lotes.ts";
import {
  CASOS_S3,
  hojaEnBlanco,
  veredictoDeLaRegla,
} from "../../../src/engine/supuestos/s3.ts";
import {
  archivosDelKit,
  CARPETA_LOTE,
  CARPETA_S3,
} from "../../../src/lib/supuestos/kit.ts";

const RAIZ = process.cwd();
const correr = (...args: string[]) =>
  spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "src/cli/supuestos.ts",
      ...args,
    ],
    { cwd: RAIZ, encoding: "utf8" },
  );
const temporal = () => mkdtempSync(path.join(tmpdir(), "hg-s3-"));

describe("el kit del repo es lo que da el generador", () => {
  it("225 archivos, cada uno byte a byte; ninguno de más en las carpetas de resultados", async () => {
    const archivos = await archivosDelKit(RAIZ);
    expect(archivos.size).toBe(225);
    for (const [ruta, contenido] of archivos)
      expect(readFileSync(path.join(RAIZ, ruta), "utf8"), ruta).toBe(contenido);
    for (const carpeta of [CARPETA_S3, CARPETA_LOTE]) {
      const enDisco = readdirSync(path.join(RAIZ, carpeta, "resultados")).map(
        (f) => `${carpeta}/resultados/${f}`,
      );
      for (const f of enDisco) expect(archivos.has(f), f).toBe(true);
    }
  });
  it("los 20 /extraer son los mismos 20 textos del S3, en orden, y los 200 están en 10 tandas de 20", async () => {
    const archivos = await archivosDelKit(RAIZ);
    const lista = JSON.parse(
      archivos.get(`${CARPETA_S3}/extraer-lote-demo.json`)!,
    ) as { comandos: { id: string; comando: string }[] };
    expect(lista.comandos.map((c) => c.id)).toEqual(CASOS_S3.map((c) => c.id));
    for (const c of lista.comandos)
      expect(c.comando).toBe(
        `/extraer ${CARPETA_S3}/resultados/${c.id}.txt ${CASOS_S3.find((x) => x.id === c.id)!.activo}`,
      );
    const tandas = JSON.parse(archivos.get(`${CARPETA_LOTE}/tandas.json`)!) as {
      huella_del_lote: string;
      tandas: { comandos: string[] }[];
    };
    expect(tandas.tandas).toHaveLength(10);
    expect(tandas.tandas.every((t) => t.comandos.length === 20)).toBe(true);
    expect(tandas.huella_del_lote).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("los comandos del kit existen", () => {
  it.each(["supuestos:generar", "supuestos:s3", "lotes:metricas"])(
    "pnpm %s es un script del paquete y el LEEME del kit lo nombra",
    (nombre) => {
      const scripts = (
        JSON.parse(readFileSync(path.join(RAIZ, "package.json"), "utf8")) as {
          scripts: Record<string, string>;
        }
      ).scripts;
      expect(scripts[nombre]).toContain("src/cli/supuestos.ts");
    },
  );
  it("los LEEME citan los comandos que existen", () => {
    const s3 = readFileSync(path.join(RAIZ, CARPETA_S3, "LEEME.md"), "utf8");
    const lote = readFileSync(
      path.join(RAIZ, CARPETA_LOTE, "LEEME.md"),
      "utf8",
    );
    expect(s3).toContain("pnpm supuestos:s3");
    expect(s3).toContain("pnpm supuestos:generar");
    expect(lote).toContain("pnpm lotes:metricas");
  });
});

describe("pnpm supuestos:generar --comprobar", () => {
  it("con el kit al día dice que está al día y sale con 0", () => {
    const r = correr("generar", "--comprobar");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("al día (225 archivos)");
  });
});

describe("pnpm supuestos:s3", () => {
  const hojaLlena = (distintos: number) => {
    const hoja = hojaEnBlanco(
      CASOS_S3,
      `${CARPETA_S3}/resultados`,
      Object.fromEntries(
        CASOS_S3.map((c) => [c.prueba, { es: "espera", en: "expects" }]),
      ),
    );
    hoja.calificaciones.forEach((f, i) => {
      const regla = veredictoDeLaRegla(CASOS_S3[i]!);
      (f as { tu_veredicto: string }).tu_veredicto =
        i < distintos ? (regla === "fallida" ? "superada" : "fallida") : regla;
    });
    const ruta = path.join(temporal(), "hoja.json");
    writeFileSync(ruta, JSON.stringify(hoja));
    return ruta;
  };
  it("una hoja que coincide: S3 probado, sale con 0", () => {
    const r = correr("s3", hojaLlena(0));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("20 de 20 coinciden (100 %");
    expect(r.stdout).toContain("S3 PROBADO");
  });
  it("tres discrepancias: S3 refutado, las nombra y sale con 1; en inglés también", () => {
    const r = correr("s3", hojaLlena(3));
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("S3 REFUTADO");
    expect(r.stdout).toContain("R01 PR-IA-PINJ-001: dijiste");
    const en = correr("s3", hojaLlena(3), "--idioma", "en");
    expect(en.stdout).toContain("REFUTED");
    expect(en.stdout).toContain("you said");
  });
  it("--json da la comparación", () => {
    const r = correr("s3", hojaLlena(2), "--json");
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({
      coinciden: 18,
      estado: "probado",
    });
  });
  it("la hoja en blanco del kit no se calcula: dice qué falta y sale con 3", () => {
    const r = correr("s3", `${CARPETA_S3}/hoja-de-calificacion.json`);
    expect(r.status).toBe(3);
    expect(r.stderr).toContain("no tiene tu_veredicto");
  });
  it("sin hoja, con un archivo que no existe o con un formato ajeno: uso, 3", () => {
    expect(correr("s3").status).toBe(3);
    expect(correr("s3", "no-existe.json").status).toBe(3);
    const ruta = path.join(temporal(), "x.json");
    writeFileSync(ruta, JSON.stringify({ formato: "otro" }));
    expect(correr("s3", ruta).status).toBe(3);
    expect(correr("otra-cosa").status).toBe(3);
  });
});

describe("pnpm lotes:metricas", () => {
  const registro = (tandas: object[]) => {
    const ruta = path.join(temporal(), "registro.json");
    writeFileSync(
      ruta,
      JSON.stringify({ formato: "hackguard/registro-de-tandas@1", tandas }),
    );
    return ruta;
  };
  it("sin registro enseña el plan de las 10 tandas", () => {
    const r = correr("lotes");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Lote de 200: 10 tandas de 20");
    expect(r.stdout).toContain("L181–L200");
  });
  it("con registro mide la cuota por tanda y proyecta las que faltan", () => {
    const r = correr(
      "lotes",
      "--registro",
      registro([
        {
          tanda: 1,
          cuota_antes_pct: 10,
          cuota_despues_pct: 22,
          minutos: 15,
          propuestas_selladas: 20,
          corregidas_por_persona: 2,
        },
        {
          tanda: 2,
          cuota_antes_pct: 22,
          cuota_despues_pct: 36,
          minutos: 17,
          propuestas_selladas: 20,
          corregidas_por_persona: 4,
        },
      ]),
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("cuota media 13 % por corrida");
    expect(r.stdout).toContain("Faltan 8 tandas: cerca de 104 %");
    expect(r.stdout).toContain("no caben en una ventana");
  });
  it("un registro con un campo ajeno o inválido se nombra: 3", () => {
    const r = correr("lotes", "--registro", registro([{ tanda: 0 }]));
    expect(r.status).toBe(3);
  });
  it("el cálculo: sin corridas no hay proyección absurda, y 10 tandas medidas dejan 0 por correr", () => {
    expect(metricasDeTandas([], 10)).toMatchObject({
      corridas: 0,
      cuotaMedia: 0,
      tandasQueFaltan: 10,
      proyeccionDeLasQueFaltan: 0,
      cabenEnUnaVentana: true,
    });
    const diez = Array.from({ length: 10 }, (_, i) => ({
      tanda: i + 1,
      cuota_antes_pct: 0,
      cuota_despues_pct: 5,
      minutos: 10,
      propuestas_selladas: 20,
      corregidas_por_persona: 1,
    }));
    const m = metricasDeTandas(diez, 10);
    expect(m.tandasQueFaltan).toBe(0);
    expect(m.cuotaPorTanda[0]).toEqual({ tanda: 1, pct: 5, porTexto: 0.25 });
    expect(m.correccionMedia).toBe(0.05);
  });
  it("las tandas parten el lote en 10 de 20 sin repetir ni perder un caso", () => {
    const t = tandasDe(casosDelLoteDe200());
    expect(t.flatMap((x) => x.ids)).toEqual(
      casosDelLoteDe200().map((c) => c.id),
    );
    expect(t.map((x) => x.ids.length)).toEqual(Array(10).fill(20));
  });
});
