// @vitest-environment node
// La carga de la instantánea oficial y la fecha de consulta: lo que la pantalla lee tiene que ser lo que tiene huella.
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  archivoOficial,
  cargarInstantaneaOficial,
} from "../../../src/lib/catalogo/cargar-instantanea.ts";
import { fechaDeConsulta } from "../../../src/lib/catalogo/consulta.ts";
import { fechaDelCommit } from "../../../src/lib/catalogo/fecha-del-commit.ts";

const RAIZ = join(__dirname, "..", "..", "..");
const OFICIAL = readdirSync(join(RAIZ, "datos", "instantaneas"))
  .filter((n) => n.endsWith(".json"))
  .sort()
  .at(-1)!;

/** Una raíz de mentira con una sola instantánea, copiada de la oficial, para romperla a propósito. */
function raizCon(editar?: (texto: string) => string, nombre = OFICIAL): string {
  const raiz = mkdtempSync(join(tmpdir(), "hg-instantanea-"));
  const carpeta = join(raiz, "datos", "instantaneas");
  cpSync(join(RAIZ, "datos", "instantaneas"), carpeta, { recursive: true });
  for (const n of readdirSync(carpeta))
    if (n !== OFICIAL) throw new Error("hay más de una instantánea oficial");
  const texto = readFileSync(join(carpeta, OFICIAL), "utf8");
  if (nombre !== OFICIAL) {
    writeFileSync(join(carpeta, nombre), editar ? editar(texto) : texto);
    writeFileSync(join(carpeta, OFICIAL), "{}"); // la original deja de ser la más reciente por nombre si el nuevo ordena después
  } else if (editar) writeFileSync(join(carpeta, OFICIAL), editar(texto));
  return raiz;
}

describe("la instantánea oficial", () => {
  it("se carga con su huella y su nombre verificados", async () => {
    const { instantanea, nombre } = await cargarInstantaneaOficial(RAIZ);
    expect(nombre).toBe(OFICIAL.replace(/\.json$/, ""));
    expect(instantanea.catalogo.pruebas).toHaveLength(38);
    expect(instantanea.huella).toMatch(/^[0-9a-f]{64}$/);
  });

  it("toma la de fecha más reciente cuando hay varias", () => {
    const carpeta = mkdtempSync(join(tmpdir(), "hg-varias-"));
    for (const n of [
      "2026-10-05-aaaaaaaaaaaa.json",
      "2026-11-09-bbbbbbbbbbbb.json",
      "notas.json",
    ])
      writeFileSync(join(carpeta, n), "{}");
    expect(archivoOficial(carpeta)).toBe("2026-11-09-bbbbbbbbbbbb.json");
  });

  it("falla con un mensaje en los dos idiomas si no hay ninguna", () => {
    const sinNinguna = mkdtempSync(join(tmpdir(), "hg-sin-"));
    expect(() => archivoOficial(sinNinguna)).toThrow(
      /no hay ninguna instantánea.*there is no catalog snapshot/,
    );
  });

  it("rechaza un formato desconocido", async () => {
    const raiz = raizCon((t) =>
      t.replace('"hackguard/instantanea@1"', '"hackguard/instantanea@9"'),
    );
    await expect(cargarInstantaneaOficial(raiz)).rejects.toThrow(
      /formato.*desconocido/,
    );
  });

  it("rechaza una instantánea cuyo contenido ya no es el de su huella", async () => {
    const raiz = raizCon((t) =>
      t
        .replace('"nombre": "Software"', '"nombre": "Soft-ware"')
        .replace('"es": "Software"', '"es": "Soft-ware"'),
    );
    await expect(cargarInstantaneaOficial(raiz)).rejects.toThrow(
      /huella declarada no es la de su contenido/,
    );
  });

  it("rechaza una instantánea cuyo nombre no corresponde a su fecha y su huella", async () => {
    const raiz = raizCon(undefined, "2026-10-06-000000000000.json");
    await expect(cargarInstantaneaOficial(raiz)).rejects.toThrow(
      /nombre no corresponde/,
    );
  });
});

describe("la fecha de consulta", () => {
  it("sin perilla ni commit es la fecha de la instantánea", () => {
    expect(fechaDeConsulta("2026-10-05")).toBe("2026-10-05");
    expect(fechaDeConsulta("2026-10-05", "")).toBe("2026-10-05");
  });
  it("la perilla del build manda sobre todo lo demás", () => {
    expect(fechaDeConsulta("2026-10-05", " 2026-11-04 ")).toBe("2026-11-04");
    expect(fechaDeConsulta("2026-10-05", "2026-11-04", "2026-12-20")).toBe(
      "2026-11-04",
    );
  });
  it("sin perilla, la fecha del commit que se construye, si es posterior a la de la instantánea", () => {
    expect(fechaDeConsulta("2026-10-05", undefined, "2026-12-20")).toBe(
      "2026-12-20",
    );
    expect(fechaDeConsulta("2026-10-05", undefined, "2026-10-05")).toBe(
      "2026-10-05",
    );
  });
  it("un commit anterior a la instantánea, o una fecha de commit rota, no adelantan ni atrasan la consulta", () => {
    expect(fechaDeConsulta("2026-10-05", undefined, "2026-09-01")).toBe(
      "2026-10-05",
    );
    expect(fechaDeConsulta("2026-10-05", undefined, "ayer")).toBe("2026-10-05");
  });
  it("rechaza una perilla que no es una fecha civil, en los dos idiomas", () => {
    expect(() => fechaDeConsulta("2026-10-05", "mañana")).toThrow(
      /no es una fecha.*is not a/,
    );
    expect(() => fechaDeConsulta("2026-10-05", "2026-02-30")).toThrow(
      RangeError,
    );
  });
});

describe("la fecha del commit", () => {
  it("es la del commit actual, en UTC, y la misma cada vez que se pregunta", () => {
    const f = fechaDelCommit(RAIZ);
    expect(f).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fechaDelCommit(RAIZ)).toBe(f);
  });
  it("sin repositorio no hay fecha, y no es un error", () => {
    expect(
      fechaDelCommit(mkdtempSync(join(tmpdir(), "hg-sin-git-"))),
    ).toBeUndefined();
  });
});
