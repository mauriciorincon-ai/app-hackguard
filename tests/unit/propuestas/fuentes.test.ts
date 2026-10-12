// @vitest-environment node
// U2 y D1 del plan v2: solo dominios de la lista blanca, y la página leída tiene que contener, literal, el fragmento citado.
import { describe, expect, it } from "vitest";
import { huellaDeTexto } from "../../../src/engine/propuestas/citas.ts";
import type { FuenteCitada } from "../../../src/engine/propuestas/esquemas.ts";
import {
  claveDeLectura,
  enListaBlanca,
  verificarFuente,
} from "../../../src/engine/propuestas/fuentes.ts";

const LISTA = [
  "genai.owasp.org",
  "github.com/genai-security-project",
  "owasp.org",
];
const PAGINA =
  "LLM01 Prompt Injection. Restrictions can be eroded across a long conversation.";

describe("la lista blanca", () => {
  it("admite el dominio, sus subdominios y las rutas bajo un prefijo", () => {
    expect(enListaBlanca("https://genai.owasp.org/resource/x", LISTA)).toBe(
      true,
    );
    expect(enListaBlanca("https://top10.owasp.org/", LISTA)).toBe(true);
    expect(
      enListaBlanca("https://github.com/genai-security-project/repo", LISTA),
    ).toBe(true);
  });
  it("no admite otro repositorio del mismo sitio, ni un dominio parecido, ni http", () => {
    expect(enListaBlanca("https://github.com/otra-org/repo", LISTA)).toBe(
      false,
    );
    expect(
      enListaBlanca("https://github.com/genai-security-project-x/r", LISTA),
    ).toBe(false);
    expect(enListaBlanca("https://evilowasp.org/", LISTA)).toBe(false);
    expect(enListaBlanca("https://owasp.org.evil.example/", LISTA)).toBe(false);
    expect(enListaBlanca("http://owasp.org/", LISTA)).toBe(false);
    expect(enListaBlanca("no es una dirección", LISTA)).toBe(false);
  });
});

async function fuente(
  parcial: Partial<FuenteCitada> = {},
): Promise<FuenteCitada> {
  return {
    url: "https://genai.owasp.org/resource/x",
    nombre: "OWASP",
    fragmento: "Restrictions can be eroded across a long conversation.",
    huella_de_la_pagina: await huellaDeTexto(PAGINA),
    leida: "2026-10-02",
    ...parcial,
  };
}

describe("verificar una fuente", () => {
  const lecturas = async () => {
    const h = await huellaDeTexto(PAGINA);
    return (huella: string) => (huella === h ? PAGINA : undefined);
  };
  // Lo que el investigador leyó de verdad en esta corrida: la dirección por defecto y la huella de su página.
  const leidas = async () =>
    new Set([
      claveDeLectura(
        "https://genai.owasp.org/resource/x",
        await huellaDeTexto(PAGINA),
      ),
    ]);

  it("verificada: en la lista, leída y con el fragmento literal", async () => {
    expect(
      await verificarFuente(
        await fuente(),
        LISTA,
        await lecturas(),
        await leidas(),
      ),
    ).toBe("verificada");
  });
  it("fuera de la lista blanca", async () => {
    expect(
      await verificarFuente(
        await fuente({ url: "https://blog.example/x" }),
        LISTA,
        await lecturas(),
        await leidas(),
      ),
    ).toBe("fuera_de_lista_blanca");
  });
  it("sin lectura: la página no se leyó", async () => {
    expect(
      await verificarFuente(
        await fuente(),
        LISTA,
        () => undefined,
        await leidas(),
      ),
    ).toBe("sin_lectura");
  });
  it("la página existe pero no dice lo citado", async () => {
    expect(
      await verificarFuente(
        await fuente({ fragmento: "A permission must not outlive its task." }),
        LISTA,
        await lecturas(),
        await leidas(),
      ),
    ).toBe("sin_fragmento");
  });
  it("una lectura editada a mano no verifica nada: su huella ya no es la nombrada", async () => {
    const h = await huellaDeTexto(PAGINA);
    expect(
      await verificarFuente(
        await fuente(),
        LISTA,
        (x) => (x === h ? `${PAGINA} editada` : undefined),
        await leidas(),
      ),
    ).toBe("pagina_distinta");
  });
  it("una dirección que el investigador nunca leyó no verifica, aunque su fragmento exista en otra lectura", async () => {
    // Auditoría (Alto): sin el par dirección+huella de la consulta, la página guardada no prueba nada.
    expect(
      await verificarFuente(
        await fuente(),
        LISTA,
        await lecturas(),
        new Set<string>(),
      ),
    ).toBe("url_no_consultada");
  });
  it("la misma dirección leída con otra huella no cuenta como leída", async () => {
    expect(
      await verificarFuente(
        await fuente({ huella_de_la_pagina: "e".repeat(64) }),
        LISTA,
        await lecturas(),
        await leidas(),
      ),
    ).toBe("url_no_consultada");
  });
});
