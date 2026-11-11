// Copia de un export de Next a su destino público: solo lo que la lista blanca nombra y, de `_next/`, lo que esas páginas nombran.
// El directorio de construcción de Next comparte carpeta con el export, y el build junta el código de todas las rutas: lo que no
// está en la lista no viaja. Lo usan `build:publico` (C19) y `paquete:vitrina` (C20). Corre en Node.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { cierreDeEstaticos } from "./estaticos.ts";
import { archivoPermitido, rutaDeArchivo } from "./lista-blanca.ts";

export const archivosDe = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivosDe(join(dir, e.name)) : [join(dir, e.name)],
  );

export function copiarExportacion(
  exportado: string,
  destino: string,
  { sinRsc = false }: { sinRsc?: boolean } = {},
): { copiados: number; omitidos: number } {
  const todos = archivosDe(exportado).map((a) =>
    relative(exportado, a).split("\\").join("/"),
  );
  // Sin RSC (`.txt`): el paquete navega con el navegador, no con el router de Next.
  const viaja = (rel: string) => !(sinRsc && rel.endsWith(".txt"));
  const paginas = todos.filter(
    (rel) => rutaDeArchivo(rel) !== null && archivoPermitido(rel) && viaja(rel),
  );
  const sueltos = todos.filter(
    (rel) =>
      rutaDeArchivo(rel) === null &&
      !rel.startsWith("_next/") &&
      archivoPermitido(rel) &&
      viaja(rel),
  );
  const semillas = [...paginas, ...sueltos].filter((rel) =>
    /\.(?:html|txt)$/.test(rel),
  );
  const estaticos = cierreDeEstaticos(exportado, semillas);
  for (const rel of [...paginas, ...sueltos, ...estaticos]) {
    mkdirSync(dirname(join(destino, rel)), { recursive: true });
    copyFileSync(join(exportado, rel), join(destino, rel));
  }
  const copiados = paginas.length + sueltos.length + estaticos.length;
  return { copiados, omitidos: todos.length - copiados };
}
