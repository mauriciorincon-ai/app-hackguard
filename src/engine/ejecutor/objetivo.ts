// El objetivo del ejecutor, normalizado y comparado contra lo que el dueño autorizó (S12, D11). Es el punto donde más fácil se
// abre un hueco, así que la comparación es EXACTA y no por parecido: esquema, host y puerto iguales; la ruta, por segmento.
// Sin sufijos de dominio, sin `startsWith` sobre el host (`127.0.0.1.evil.test` no es `127.0.0.1`), sin credenciales en la URL,
// sin consulta ni fragmento. `new URL` canonicaliza lo que una persona puede escribir de otra forma (`127.1`, `0x7f.1`, mayúsculas).
export interface ObjetivoNormal {
  esquema: "http:" | "https:";
  host: string;
  puerto: string;
  /** Siempre empieza por «/» y sin la barra final (salvo la raíz, que es «/»). */
  ruta: string;
}

const PUERTO_POR_DEFECTO = { "http:": "80", "https:": "443" } as const;

export type MotivoDeObjetivoInvalido =
  "no_es_url" | "esquema" | "credenciales" | "consulta_o_fragmento";

/** Normaliza un objetivo o dice por qué no es uno. */
export function normalizarObjetivo(
  texto: string,
): ObjetivoNormal | { invalido: MotivoDeObjetivoInvalido } {
  let u: URL;
  try {
    u = new URL(texto.trim());
  } catch {
    return { invalido: "no_es_url" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    return { invalido: "esquema" };
  if (u.username !== "" || u.password !== "")
    return { invalido: "credenciales" };
  if (
    u.search !== "" ||
    u.hash !== "" ||
    texto.includes("?") ||
    texto.includes("#")
  )
    return { invalido: "consulta_o_fragmento" };
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "") return { invalido: "no_es_url" };
  const ruta = u.pathname.replace(/\/+$/, "");
  return {
    esquema: u.protocol,
    host,
    puerto: u.port === "" ? PUERTO_POR_DEFECTO[u.protocol] : u.port,
    ruta: ruta === "" ? "/" : ruta,
  };
}

const esNormal = (
  o: ObjetivoNormal | { invalido: MotivoDeObjetivoInvalido },
): o is ObjetivoNormal => !("invalido" in o);

/** La forma canónica que se le pasa a la herramienta: la que se comparó, no la que se escribió. */
export const textoDeObjetivo = (o: ObjetivoNormal): string =>
  `${o.esquema}//${o.host.includes(":") && !o.host.startsWith("[") ? `[${o.host}]` : o.host}:${o.puerto}${o.ruta === "/" ? "" : o.ruta}`;

/** ¿La ruta del objetivo está dentro de la ruta autorizada? Por segmento: `/api` cubre `/api` y `/api/x`, no `/apix`. */
function rutaDentro(objetivo: string, autorizada: string): boolean {
  if (autorizada === "/") return true;
  return objetivo === autorizada || objetivo.startsWith(`${autorizada}/`);
}

/** El objetivo está en alcance si ALGUNO de los autorizados lo cubre. Un autorizado que no se pueda leer no cubre nada. */
export function objetivoEnAlcance(
  objetivo: ObjetivoNormal,
  autorizados: readonly string[],
): boolean {
  return autorizados.some((texto) => {
    const a = normalizarObjetivo(texto);
    return (
      esNormal(a) &&
      a.esquema === objetivo.esquema &&
      a.host === objetivo.host &&
      a.puerto === objetivo.puerto &&
      rutaDentro(objetivo.ruta, a.ruta)
    );
  });
}

/** ¿El host es uno de los dominios dados, o un subdominio suyo? (Para la lista de infraestructura de terceros.) */
export function hostEsDe(host: string, dominios: readonly string[]): boolean {
  return dominios.some((d) => {
    const dominio = d.toLowerCase().replace(/\.$/, "");
    return host === dominio || host.endsWith(`.${dominio}`);
  });
}

export { esNormal as esObjetivoNormal };
