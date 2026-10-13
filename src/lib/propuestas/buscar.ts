// La búsqueda del investigador (RF-07.1 a RF-07.2b): lee las vías de acceso de los marcos del catálogo y guarda lo que leyó. Es la ÚNICA
// pieza de las propuestas que habla con la red, y la usa un script: el modelo no tiene red. Reglas que no se negocian:
//   · solo https y solo direcciones de la lista blanca del marco, también al seguir una redirección;
//   · la petición no lleva cookie, credencial, referencia ni identificador de quien corre: una cabecera fija y nada más;
//   · un 401, 403 o 429, o una página que pide sesión, se registra `no_accesible` y NUNCA se reintenta con otras cabeceras (RF-07.2b);
//   · la página no se guarda en el repositorio: solo su texto, en `propuestas/.lecturas/` (ignorada por git), y su huella.
import type { Instantanea } from "../../engine/catalogo/instantanea.ts";
import {
  FORMATO_DE_CONSULTA,
  type Consulta,
} from "../../engine/propuestas/esquemas.ts";
import { enListaBlanca } from "../../engine/propuestas/fuentes.ts";
import { textoDeLaPagina } from "../../engine/propuestas/pagina.ts";
import { guardarLectura } from "./lecturas.ts";

/** La única cabecera que se manda: dice qué es, no quién lo corre. */
export const CABECERAS_DE_BUSQUEDA = {
  "User-Agent": "hackguard-investigador",
  Accept: "text/html,text/plain,text/markdown,application/json;q=0.8",
} as const;

const MAXIMO_DE_REDIRECCIONES = 3;
const MAXIMO_DE_CARACTERES = 400_000;
/** Una página que declara más bytes que esto no se lee: el tope va antes de bajarla, no después de cortarla. */
const MAXIMO_DE_BYTES = 5_000_000;
/** Cuánto espera una petición (y la lectura de su cuerpo) antes de darla por perdida: una fuente colgada no cuelga la búsqueda. */
export const TIEMPO_MAXIMO_DE_PETICION_MS = 20_000;
const TIPOS_DE_TEXTO = /^(?:text\/|application\/(?:json|xml|xhtml\+xml))/i;

export type Peticion = (
  url: string,
  init: {
    headers: Record<string, string>;
    redirect: "manual";
    signal: AbortSignal;
  },
) => Promise<{
  status: number;
  headers: { get(nombre: string): string | null };
  text(): Promise<string>;
}>;

export interface OpcionesDeBusqueda {
  /** Un marco, o todos los que aplican a una familia, o todos. */
  marco?: string;
  familia?: string;
  fecha: string;
  corrida: string;
  alcance: Consulta["alcance"];
  /** Tope de tiempo por petición; por omisión, `TIEMPO_MAXIMO_DE_PETICION_MS`. */
  tiempoMaximoMs?: number;
}

type FilaDeConsulta = Consulta["fuentes"][number];

/** ¿Pide sesión? Una página de inicio de sesión no es la fuente: se registra como tal y no se lee. */
const pideSesion = (url: string): boolean =>
  /\/(?:login|signin|sign-in|sso|auth)(?:\/|$|\?)/i.test(new URL(url).pathname);

async function leerUna(
  marco: string,
  nombre: string,
  inicial: string,
  lista: readonly string[],
  peticion: Peticion,
  raiz: string,
  tiempoMaximoMs: number,
): Promise<FilaDeConsulta> {
  const fila = (
    parcial: Partial<FilaDeConsulta> & Pick<FilaDeConsulta, "estado">,
  ): FilaDeConsulta => ({
    marco,
    nombre,
    url: inicial,
    http: null,
    huella_de_la_pagina: null,
    caracteres: 0,
    motivo: null,
    ...parcial,
  });
  let url = inicial;
  for (let salto = 0; salto <= MAXIMO_DE_REDIRECCIONES; salto++) {
    if (!enListaBlanca(url, lista))
      return fila({ estado: "fuera_de_lista_blanca" });
    if (pideSesion(url))
      return fila({ estado: "no_accesible", motivo: "requiere_sesion" });
    let r;
    try {
      r = await peticion(url, {
        headers: { ...CABECERAS_DE_BUSQUEDA },
        redirect: "manual",
        signal: AbortSignal.timeout(tiempoMaximoMs),
      });
    } catch {
      return fila({ estado: "no_accesible", motivo: "sin_red" });
    }
    if (r.status === 401 || r.status === 403 || r.status === 429)
      return fila({
        estado: "no_accesible",
        http: r.status,
        motivo: `http_${r.status}` as FilaDeConsulta["motivo"],
      });
    if (r.status >= 300 && r.status < 400) {
      const destino = r.headers.get("location");
      if (destino === null)
        return fila({
          estado: "no_accesible",
          http: r.status,
          motivo: "http_otro",
        });
      url = new URL(destino, url).toString();
      continue;
    }
    if (r.status !== 200)
      return fila({
        estado: "no_accesible",
        http: r.status,
        motivo: "http_otro",
      });
    if (!TIPOS_DE_TEXTO.test(r.headers.get("content-type") ?? ""))
      return fila({
        estado: "no_accesible",
        http: r.status,
        motivo: "http_otro",
      });
    if (Number(r.headers.get("content-length") ?? 0) > MAXIMO_DE_BYTES)
      return fila({
        estado: "no_accesible",
        http: r.status,
        motivo: "http_otro",
      });
    let cuerpo: string;
    try {
      cuerpo = await r.text();
    } catch {
      return fila({
        estado: "no_accesible",
        http: r.status,
        motivo: "sin_red",
      });
    }
    const texto = textoDeLaPagina(cuerpo).slice(0, MAXIMO_DE_CARACTERES);
    const huellaDeLaPagina = await guardarLectura(raiz, texto);
    return fila({
      estado: "leida",
      url,
      http: r.status,
      huella_de_la_pagina: huellaDeLaPagina,
      caracteres: texto.length,
    });
  }
  return fila({ estado: "no_accesible", motivo: "http_otro" });
}

/**
 * Lee las vías de acceso de los marcos pedidos. `peticion` es `fetch` en el CLI y un doble en los tests. Devuelve la consulta ya armada:
 * lo que se leyó (con su huella), lo que no se pudo leer y por qué, y lo que quedó fuera de la lista blanca.
 */
export async function buscar(
  instantanea: Instantanea,
  opciones: OpcionesDeBusqueda,
  peticion: Peticion,
  raiz: string,
): Promise<Consulta> {
  const marcos = instantanea.catalogo.marcos.filter(
    (m) =>
      (opciones.marco === undefined || m.id === opciones.marco) &&
      (opciones.familia === undefined ||
        m.familias_aplicables.includes(opciones.familia)),
  );
  const fuentes: FilaDeConsulta[] = [];
  for (const m of marcos)
    for (const via of m.vias_de_acceso)
      fuentes.push(
        await leerUna(
          m.id,
          m.nombre,
          via.url,
          m.lista_blanca_de_fuentes,
          peticion,
          raiz,
          opciones.tiempoMaximoMs ?? TIEMPO_MAXIMO_DE_PETICION_MS,
        ),
      );
  return {
    formato: FORMATO_DE_CONSULTA,
    corrida: opciones.corrida,
    fecha: opciones.fecha,
    alcance: opciones.alcance,
    fuentes,
  };
}
