// @vitest-environment node
// El objetivo del ejecutor (S12, D11): se normaliza y se compara EXACTO con lo autorizado. Aquí viven los intentos de colarse:
// sufijos de dominio, direcciones escritas de otra forma, credenciales, rutas con «..», puertos implícitos.
import { describe, expect, it } from "vitest";
import {
  esObjetivoNormal,
  hostEsDe,
  normalizarObjetivo,
  objetivoEnAlcance,
  textoDeObjetivo,
} from "../../../src/engine/ejecutor/objetivo.ts";

const normal = (t: string) => {
  const o = normalizarObjetivo(t);
  if (!esObjetivoNormal(o)) throw new Error(`no es un objetivo: ${t}`);
  return o;
};
const enAlcance = (objetivo: string, ...autorizados: string[]) =>
  objetivoEnAlcance(normal(objetivo), autorizados);

describe("normalizarObjetivo", () => {
  it("pone el puerto por defecto, baja el host a minúsculas y le quita el punto final", () => {
    expect(normal("HTTPS://Ejemplo.TEST./")).toEqual({
      esquema: "https:",
      host: "ejemplo.test",
      puerto: "443",
      ruta: "/",
    });
    expect(normal("http://ejemplo.test").puerto).toBe("80");
  });

  it("canonicaliza las formas distintas de escribir la misma dirección", () => {
    expect(normal("http://127.1:8080").host).toBe("127.0.0.1");
    expect(normal("http://0x7f.0.0.1:8080").host).toBe("127.0.0.1");
    expect(normal("http://2130706433:8080").host).toBe("127.0.0.1");
  });

  it.each([
    ["ftp://ejemplo.test", "esquema"],
    ["file:///etc/passwd", "esquema"],
    ["ejemplo.test", "no_es_url"],
    ["", "no_es_url"],
    ["http://usuario:clave@ejemplo.test", "credenciales"],
    ["http://usuario@ejemplo.test", "credenciales"],
    ["http://ejemplo.test/?q=1", "consulta_o_fragmento"],
    ["http://ejemplo.test/#x", "consulta_o_fragmento"],
    ["http://ejemplo.test?", "consulta_o_fragmento"],
  ])("rechaza %j (%s)", (texto, motivo) => {
    expect(normalizarObjetivo(texto)).toEqual({ invalido: motivo });
  });

  it("resuelve los puntos de la ruta antes de comparar", () => {
    expect(normal("http://ejemplo.test/a/../b").ruta).toBe("/b");
    expect(normal("http://ejemplo.test/a/%2e%2e/b").ruta).toBe("/b");
    expect(normal("http://ejemplo.test/api/").ruta).toBe("/api");
  });

  it("escribe la forma canónica que se le pasa a la herramienta (IPv6 entre corchetes)", () => {
    expect(textoDeObjetivo(normal("HTTP://Ejemplo.test/api/"))).toBe(
      "http://ejemplo.test:80/api",
    );
    expect(textoDeObjetivo(normal("http://[::1]:9000"))).toBe(
      "http://[::1]:9000",
    );
  });
});

describe("objetivoEnAlcance: exacto, jamás por parecido", () => {
  it("acepta lo escrito igual y lo escrito distinto que significa lo mismo", () => {
    expect(enAlcance("http://127.0.0.1:8080", "http://127.0.0.1:8080")).toBe(
      true,
    );
    expect(enAlcance("http://127.1:8080/", "http://127.0.0.1:8080")).toBe(true);
    expect(enAlcance("https://Ejemplo.test", "https://ejemplo.test:443")).toBe(
      true,
    );
  });

  it("no acepta un host que solo se parece (sufijo, prefijo, subdominio)", () => {
    expect(
      enAlcance("http://127.0.0.1.evil.test:8080", "http://127.0.0.1:8080"),
    ).toBe(false);
    expect(enAlcance("http://evil-ejemplo.test", "http://ejemplo.test")).toBe(
      false,
    );
    expect(
      enAlcance("http://ejemplo.test.evil.test", "http://ejemplo.test"),
    ).toBe(false);
    expect(enAlcance("http://sub.ejemplo.test", "http://ejemplo.test")).toBe(
      false,
    );
  });

  it("distingue esquema y puerto, también los implícitos", () => {
    expect(enAlcance("https://ejemplo.test", "http://ejemplo.test")).toBe(
      false,
    );
    expect(enAlcance("http://ejemplo.test:8080", "http://ejemplo.test")).toBe(
      false,
    );
    expect(enAlcance("http://ejemplo.test:80", "http://ejemplo.test")).toBe(
      true,
    );
    expect(enAlcance("http://127.0.0.1:8081", "http://127.0.0.1:8080")).toBe(
      false,
    );
  });

  it("la ruta autorizada cubre por segmento: /api cubre /api/x, no /apix ni /api/../otro", () => {
    expect(
      enAlcance("http://ejemplo.test/api", "http://ejemplo.test/api"),
    ).toBe(true);
    expect(
      enAlcance("http://ejemplo.test/api/v1", "http://ejemplo.test/api"),
    ).toBe(true);
    expect(
      enAlcance("http://ejemplo.test/apix", "http://ejemplo.test/api"),
    ).toBe(false);
    expect(
      enAlcance("http://ejemplo.test/api/../admin", "http://ejemplo.test/api"),
    ).toBe(false);
    expect(
      enAlcance("http://ejemplo.test/otra", "http://ejemplo.test/api"),
    ).toBe(false);
    expect(
      enAlcance("http://ejemplo.test/cualquiera", "http://ejemplo.test"),
    ).toBe(true);
  });

  it("un autorizado ilegible no cubre nada, y sin autorizados no hay alcance", () => {
    expect(
      enAlcance("http://ejemplo.test", "ejemplo.test", "*", "http://"),
    ).toBe(false);
    expect(objetivoEnAlcance(normal("http://ejemplo.test"), [])).toBe(false);
  });
});

describe("hostEsDe", () => {
  it("el dominio y sus subdominios sí; un host que solo termina igual, no", () => {
    expect(hostEsDe("api.openai.com", ["openai.com"])).toBe(true);
    expect(hostEsDe("openai.com", ["openai.com"])).toBe(true);
    expect(hostEsDe("notopenai.com", ["openai.com"])).toBe(false);
    expect(hostEsDe("openai.com.mio.test", ["openai.com"])).toBe(false);
  });
});
