// Verificar una fuente (U2 = al menos 2; D1 del plan v2): solo dominios de una lista blanca, y la página que se leyó tiene que contener,
// literal, el fragmento que la propuesta cita. La página misma no se guarda: la propuesta guarda el fragmento, la huella de lo que se
// leyó y la fecha. Una propuesta con menos fuentes verificadas que el mínimo llega MARCADA; no se descarta sola.
import { citaEsLiteral, huellaDeTexto } from "./citas.ts";
import type { EstadoDeFuente, FuenteCitada } from "./esquemas.ts";

/**
 * ¿La dirección está en la lista blanca? Una entrada sin barra (`owasp.org`) admite ese dominio y sus subdominios; una con barra
 * (`github.com/genai-security-project`) admite ese dominio y las rutas que cuelgan de ese prefijo. Solo https.
 */
export function enListaBlanca(url: string, lista: readonly string[]): boolean {
  let direccion: URL;
  try {
    direccion = new URL(url);
  } catch {
    return false;
  }
  if (direccion.protocol !== "https:") return false;
  const dominio = direccion.hostname.toLowerCase();
  return lista.some((entrada) => {
    const [anfitrion, ...resto] = entrada.toLowerCase().split("/");
    if (anfitrion === undefined || anfitrion === "") return false;
    if (resto.length === 0)
      return dominio === anfitrion || dominio.endsWith(`.${anfitrion}`);
    const prefijo = `/${resto.join("/")}`;
    const ruta = direccion.pathname.toLowerCase();
    return (
      dominio === anfitrion &&
      (ruta === prefijo || ruta.startsWith(`${prefijo}/`))
    );
  });
}

/** El texto de una página leída, por la huella con que la propuesta la nombra. Lo da quien carga (el CLI o el test). */
export type Lecturas = (huella: string) => string | undefined;

/** La clave de una lectura: la dirección y la huella de la página, como las guarda la consulta del investigador. */
export const claveDeLectura = (url: string, huella: string): string =>
  `${url}\n${huella}`;

/**
 * Las lecturas que la consulta registró como leídas. Una fuente que no está aquí no se leyó en esta corrida: no vale aunque su
 * fragmento exista en algún texto guardado (un fragmento real de otra página, o una dirección inventada, no verifica nada).
 */
export function lecturasConsultadas(
  fuentes: readonly {
    url: string;
    huella_de_la_pagina: string | null;
    estado: string;
  }[],
  /** Los documentos que una persona aportó (RF-07.2b): cuentan como leídos con la misma clave. */
  aportes: readonly { url: string; huella_de_la_pagina: string }[] = [],
): ReadonlySet<string> {
  return new Set([
    ...fuentes
      .filter((f) => f.estado === "leida" && f.huella_de_la_pagina !== null)
      .map((f) => claveDeLectura(f.url, f.huella_de_la_pagina!)),
    ...aportes.map((a) => claveDeLectura(a.url, a.huella_de_la_pagina)),
  ]);
}

export async function verificarFuente(
  fuente: FuenteCitada,
  lista: readonly string[],
  lecturas: Lecturas,
  consultadas: ReadonlySet<string>,
): Promise<EstadoDeFuente> {
  if (!enListaBlanca(fuente.url, lista)) return "fuera_de_lista_blanca";
  if (!consultadas.has(claveDeLectura(fuente.url, fuente.huella_de_la_pagina)))
    return "url_no_consultada";
  const pagina = lecturas(fuente.huella_de_la_pagina);
  if (pagina === undefined) return "sin_lectura";
  // La lectura se busca por la huella, pero la huella se comprueba: un archivo cambiado a mano no verifica nada.
  if ((await huellaDeTexto(pagina)) !== fuente.huella_de_la_pagina)
    return "pagina_distinta";
  return citaEsLiteral(fuente.fragmento, pagina)
    ? "verificada"
    : "sin_fragmento";
}
