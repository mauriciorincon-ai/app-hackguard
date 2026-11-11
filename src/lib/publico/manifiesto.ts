// El manifiesto del paquete de la vitrina (C20) y su verificación. El manifiesto lleva el SHA-256 de cada archivo de la pieza y su
// propia huella (JCS + SHA-256, la del resto del producto): `paquete:verificar` recalcula todo y falla con un archivo cambiado, uno que
// falta o uno de más. Corre en Node.
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { huella } from "../../engine/huella.ts";
import { archivosDe } from "./copiar.ts";
import {
  barrerCarpeta,
  type ConocidosPublicos,
  type HallazgoDeFrontera,
} from "./frontera.ts";
import { BASE_DEL_PAQUETE } from "./paquete.ts";

export const FORMATO_DEL_PAQUETE = "hackguard-paquete/v1";
/** Dónde vive la pieza dentro del paquete: es la misma ruta que tendrá dentro de hoja-de-vida. */
export const CARPETA_DE_LA_PIEZA = `public${BASE_DEL_PAQUETE}`;
export const ENTRADA_DEL_PAQUETE = "index.html";

export interface Manifiesto {
  formato: typeof FORMATO_DEL_PAQUETE;
  app: "hackguard";
  version: string;
  base: string;
  commit: string;
  arbol_limpio: boolean;
  entrada: string;
  copiar_a_hoja_de_vida: { desde: string; hasta: string };
  pasos_de_entrega: { es: string; en: string }[];
  n_archivos: number;
  bytes: number;
  archivos: Record<string, string>;
  huella: string;
}

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** El SHA-256 de cada archivo de la pieza, con su ruta relativa a la raíz del paquete. */
export function hashesDeLaPieza(raiz: string): {
  archivos: Record<string, string>;
  bytes: number;
} {
  const archivos: Record<string, string> = {};
  let bytes = 0;
  for (const abs of archivosDe(join(raiz, CARPETA_DE_LA_PIEZA)).sort()) {
    const contenido = readFileSync(abs);
    archivos[relative(raiz, abs).split("\\").join("/")] = sha(contenido);
    bytes += contenido.length;
  }
  return { archivos, bytes };
}

export async function armarManifiesto(e: {
  raiz: string;
  version: string;
  commit: string;
  arbolLimpio: boolean;
}): Promise<Manifiesto> {
  const { archivos, bytes } = hashesDeLaPieza(e.raiz);
  const sinHuella = {
    formato: FORMATO_DEL_PAQUETE as typeof FORMATO_DEL_PAQUETE,
    app: "hackguard" as const,
    version: e.version,
    base: BASE_DEL_PAQUETE,
    commit: e.commit,
    arbol_limpio: e.arbolLimpio,
    entrada: ENTRADA_DEL_PAQUETE,
    copiar_a_hoja_de_vida: {
      desde: `${CARPETA_DE_LA_PIEZA}/`,
      hasta: `${CARPETA_DE_LA_PIEZA}/`,
    },
    pasos_de_entrega: [
      {
        es: "Copia la carpeta public/piezas/hackguard/ de este paquete a la misma ruta de hoja-de-vida.",
        en: "Copy this package's public/piezas/hackguard/ folder to the same path in hoja-de-vida.",
      },
      {
        es: "Declara la pieza en data/simulaciones.yaml con carpeta hackguard y entrada index.html para es y en.",
        en: "Declare the piece in data/simulaciones.yaml with folder hackguard and entry index.html for es and en.",
      },
      {
        es: "Corre pnpm paquete:verificar en HackGuard contra este paquete antes de copiarlo.",
        en: "Run pnpm paquete:verificar in HackGuard against this package before copying it.",
      },
    ],
    n_archivos: Object.keys(archivos).length,
    bytes,
    archivos,
  };
  return { ...sinHuella, huella: await huella(sinHuella) };
}

/** Todo lo que no cuadra en un paquete ya armado en `raiz` (`dist/paquete-hoja-de-vida`). Vacío = verificado. */
export async function verificarPaquete(
  raiz: string,
  conocidos: ConocidosPublicos,
  dominios: readonly string[],
): Promise<HallazgoDeFrontera[]> {
  const fuera: HallazgoDeFrontera[] = [];
  const marcar = (archivo: string, regla: string, detalle: string) =>
    fuera.push({ archivo, regla, detalle });
  const ruta = join(raiz, "manifiesto.json");
  if (!existsSync(ruta)) {
    marcar("manifiesto.json", "manifiesto", "falta el manifiesto");
    return fuera;
  }
  const m = JSON.parse(readFileSync(ruta, "utf8")) as Manifiesto;
  if (m.formato !== FORMATO_DEL_PAQUETE)
    marcar("manifiesto.json", "manifiesto", `formato ${String(m.formato)}`);
  if (m.base !== BASE_DEL_PAQUETE)
    marcar("manifiesto.json", "base", `la base es ${String(m.base)}`);
  const { huella: declarada, ...resto } = m;
  if ((await huella(resto)) !== declarada)
    marcar(
      "manifiesto.json",
      "manifiesto",
      "su huella no es la de su contenido",
    );

  const { archivos } = hashesDeLaPieza(raiz);
  for (const [rel, h] of Object.entries(m.archivos)) {
    if (!(rel in archivos))
      marcar(rel, "archivo-que-falta", "no está en el paquete");
    else if (archivos[rel] !== h)
      marcar(rel, "archivo-cambiado", "su SHA-256 no es el del manifiesto");
  }
  for (const rel of Object.keys(archivos))
    if (!(rel in m.archivos))
      marcar(rel, "archivo-de-mas", "no está en el manifiesto");
  if (!existsSync(join(raiz, CARPETA_DE_LA_PIEZA, ENTRADA_DEL_PAQUETE)))
    marcar(ENTRADA_DEL_PAQUETE, "entrada", "falta el archivo de entrada");

  fuera.push(
    ...barrerCarpeta(join(raiz, CARPETA_DE_LA_PIEZA), conocidos, {
      base: BASE_DEL_PAQUETE,
      dominios,
      paquete: true,
    }),
  );
  return fuera;
}
