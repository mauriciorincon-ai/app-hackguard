// CLI de exportación: `pnpm exportar:defectdojo <activo> --fecha AAAA-MM-DD [--salida <carpeta>]` (S12, D9). Escribe el JSON del «Generic
// Findings Import» de DefectDojo con los hallazgos de ese activo: su cadena, su control ISO/IEC 42001, su severidad calculada y las huellas
// de sus sobres; jamás el crudo. Sin `--salida` lo imprime (los mismos bytes que descarga la web). La fecha es una entrada, nunca el reloj.
// Un derivado jamás nace menos privado que su fuente (regla 17-bis): lo de un activo propio solo se escribe dentro de `datos/privado/`
// (carpetas 0700, archivos 0600), jamás en `datos/` fuera de ella, `docs/` ni `out/`.
// Códigos de salida: 0 ok · 2 bloqueado (lo que se exporta contradice una regla del libro; no escribe nada) · 3 error de uso o de lectura.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { esFechaCivil } from "../engine/fecha.ts";
import { cargarActivos } from "../lib/activos/cargar-activos.ts";
import { cargarActivosDelBuild, esPropio } from "../lib/activos/cargar.ts";
import { cargarInstantaneaOficial } from "../lib/catalogo/cargar-instantanea.ts";
import {
  cargarEscalaIa,
  cargarPlazos,
} from "../lib/evidencia/cargar-evidencia.ts";
import { cargarLibroValidado } from "../lib/evidencia/cargar-libro.ts";
import {
  exportacionDeActivo,
  textoDeExportacion,
} from "../lib/exportar/defectdojo.ts";
import { escribir } from "./escribir.ts";

class ErrorDeUso extends Error {}

export const CODIGOS_DE_EXPORTAR = { ok: 0, bloqueado: 2, uso: 3 } as const;
const CARPETA_PRIVADA = "datos/privado";

const USO =
  "uso: exportar defectdojo <activo> --fecha AAAA-MM-DD [--salida <carpeta>] / usage: exportar defectdojo <asset> --fecha YYYY-MM-DD [--output <folder>]";

function opciones(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { fecha: { type: "string" }, salida: { type: "string" } },
  });
  return {
    ...values,
    comando: positionals[0],
    id: positionals[1]?.toLowerCase(),
    sobrantes: positionals.slice(2),
  };
}

async function principal(argv: string[]): Promise<number> {
  const o = opciones(argv);
  if (
    o.comando !== "defectdojo" ||
    o.id === undefined ||
    o.sobrantes.length > 0
  )
    throw new ErrorDeUso(USO);
  if (o.fecha === undefined || !esFechaCivil(o.fecha))
    throw new ErrorDeUso("--fecha AAAA-MM-DD / --fecha YYYY-MM-DD");
  const raiz = process.cwd();
  const { instantanea } = await cargarInstantaneaOficial(raiz);
  const archivo = cargarActivos(raiz).find((a) =>
    a.ruta.endsWith(`/${o.id}.json`),
  );
  if (archivo === undefined)
    throw new ErrorDeUso(
      `no hay un activo «${o.id}» / there is no asset “${o.id}”`,
    );

  const L = await cargarLibroValidado(raiz, instantanea, { privados: true });
  for (const v of [L.sobres, L.hallazgos, L.lotes])
    if (v.estado === "invalido") {
      process.stderr.write(
        "el libro no pasa su validación: corre pnpm evidencia:validar / the ledger does not pass validation: run pnpm evidencia:validar\n",
      );
      return CODIGOS_DE_EXPORTAR.bloqueado;
    }
  const activos = await cargarActivosDelBuild(instantanea, raiz, {
    privados: true,
  });
  const cargado = activos.activos.find((a) => a.activo.id === o.id);
  if (cargado === undefined)
    throw new ErrorDeUso(
      `el activo «${o.id}» no pasa su validación / does not pass validation`,
    );
  const propio = esPropio(cargado.activo, archivo.ruta);

  const exportacion = exportacionDeActivo(
    o.id,
    {
      hallazgos: L.hallazgos.validos,
      libro: L.libro.map((s) => s.sobre),
      escala: cargarEscalaIa(raiz),
      plazos: cargarPlazos(raiz),
    },
    activos,
    instantanea,
    o.fecha,
  );
  const texto = textoDeExportacion(exportacion);
  if (o.salida === undefined) {
    process.stdout.write(texto);
    return CODIGOS_DE_EXPORTAR.ok;
  }
  const salida = path.resolve(raiz, o.salida);
  const raizAbs = path.resolve(raiz);
  const privada = path.resolve(raiz, CARPETA_PRIVADA);
  const dentroDeRaiz =
    salida === raizAbs || salida.startsWith(`${raizAbs}${path.sep}`);
  const enPrivada =
    salida === privada || salida.startsWith(`${privada}${path.sep}`);
  if (propio && dentroDeRaiz && !enPrivada)
    throw new ErrorDeUso(
      "la exportación de un activo propio solo se escribe en datos/privado/ o fuera del repositorio / the export of an own asset is only written in datos/privado/ or outside the repository",
    );
  mkdirSync(salida, { recursive: true, mode: propio ? 0o700 : 0o755 });
  const destino = path.join(salida, `${o.id}.defectdojo.json`);
  escribir(destino, texto, propio ? 0o600 : 0o644);
  process.stdout.write(
    `${exportacion.findings.length} hallazgos → ${path.relative(raiz, destino) || destino} / ${exportacion.findings.length} findings\n`,
  );
  return CODIGOS_DE_EXPORTAR.ok;
}

principal(process.argv.slice(2)).then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (e: unknown) => {
    const detalle = e instanceof Error ? e.message : String(e);
    if (e instanceof ErrorDeUso) process.stderr.write(`${detalle}\n`);
    else process.stderr.write(`error / error: ${detalle}\n`);
    process.exitCode =
      e instanceof ErrorDeUso
        ? CODIGOS_DE_EXPORTAR.uso
        : CODIGOS_DE_EXPORTAR.bloqueado;
  },
);
