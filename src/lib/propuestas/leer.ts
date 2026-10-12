// El texto pegado del extractor entra por un archivo, no por el modelo: el código lo lee, lo normaliza y calcula su huella (un modelo no
// calcula un SHA-256). Solo se lee de dos carpetas: el kit de prueba (textos sintéticos del repositorio) y `propuestas/entradas/` (lo que
// una persona deja ahí, ignorado por git). Nada de `datos/privado/`: un activo real no sale de su carpeta (regla dura 8).
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

export const CARPETAS_DE_TEXTOS = [
  "docs/kit-de-prueba",
  "propuestas/entradas",
] as const;
export const MAXIMO_DE_TEXTO = 200_000;

export type ResultadoDeLeer =
  { ok: true; texto: string; ruta: string } | { ok: false; motivo: string };

const real = (ruta: string): string => {
  try {
    return realpathSync(path.resolve(ruta));
  } catch {
    return path.resolve(ruta);
  }
};

/** ¿`hijo` está dentro de `padre` (o es `padre`)? Con las dos rutas ya resueltas. */
const dentroDe = (hijo: string, padre: string): boolean => {
  const r = path.relative(padre, hijo);
  return r === "" || (!r.startsWith("..") && !path.isAbsolute(r));
};

export function leerTextoPegado(
  raiz: string,
  archivo: string,
): ResultadoDeLeer {
  const absoluta = path.resolve(raiz, archivo);
  if (!existsSync(absoluta))
    return { ok: false, motivo: `no existe «${archivo}»` };
  // `realpath` resuelve los enlaces simbólicos: un enlace dentro de una carpeta permitida no saca a otra.
  const resuelta = real(absoluta);
  const permitida = CARPETAS_DE_TEXTOS.some((c) =>
    dentroDe(resuelta, real(path.join(raiz, c))),
  );
  if (!permitida)
    return {
      ok: false,
      motivo: `solo se lee de ${CARPETAS_DE_TEXTOS.join(" o ")} (pidió «${archivo}»)`,
    };
  if (!statSync(resuelta).isFile())
    return { ok: false, motivo: `«${archivo}» no es un archivo` };
  const bytes = readFileSync(resuelta);
  if (bytes.length > MAXIMO_DE_TEXTO)
    return {
      ok: false,
      motivo: `el texto pesa ${bytes.length} bytes; el máximo es ${MAXIMO_DE_TEXTO}`,
    };
  let texto: string;
  try {
    texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, motivo: `«${archivo}» no es texto UTF-8` };
  }
  if (texto.includes("\u0000") || texto.trim() === "")
    return { ok: false, motivo: `«${archivo}» está vacío o no es texto` };
  return {
    ok: true,
    texto,
    ruta: path.relative(real(raiz), resuelta).split(path.sep).join("/"),
  };
}
