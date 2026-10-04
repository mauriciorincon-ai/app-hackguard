// Gate de CONTROLADORES (kit v1.32.0, regla 22): todo control dibujado en la maqueta tiene su script
// cargado. Origen: en la Etapa de Diseño de Big-D la ficha del nivel 2 no cargó su script desde la
// mirada 2 y cuatro miradas no lo vieron — una captura de un panel cerrado «mide bien».
// Plantilla del kit: recorre docs/diseno/*.html; en un repo recién estampado (sin maqueta) pasa vacío
// y lo dice. Cada app puede endurecerlo (p. ej., exigir un `data-controlador` por control).
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const DIR = resolve(process.cwd(), "docs/diseno");
const paginas = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".html")) : [];

const CONTROL = /<(button|select|input|details)\b[^>]*>|\brole="(button|switch|tab|slider)"|\bdata-(accion|controlador|paso|lang-set)=/g;
const SCRIPT = /<script\b[^>]*\bsrc="([^"]+)"[^>]*>|<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

describe("maqueta: controladores con script cargado", () => {
  if (paginas.length === 0) {
    it("sin maqueta todavía (docs/diseno vacío): nada que verificar", () => expect(paginas).toHaveLength(0));
    return;
  }
  for (const pagina of paginas) {
    it(`${pagina}: si dibuja controles, carga al menos un script y todo src existe`, () => {
      const html = readFileSync(join(DIR, pagina), "utf8");
      const controles = html.match(CONTROL) ?? [];
      const scripts = [...html.matchAll(SCRIPT)];
      const srcs = scripts.map((m) => m[1]).filter(Boolean);
      for (const src of srcs) {
        if (/^https?:/.test(src)) throw new Error(`${pagina}: script externo prohibido (${src}) — la maqueta es autocontenida`);
        expect(existsSync(join(dirname(join(DIR, pagina)), src)), `${pagina}: falta el script ${src}`).toBe(true);
      }
      // <details> se abre solo; los demás controles exigen un script (externo existente o inline no vacío).
      const interactivos = controles.filter((c) => !c.startsWith("<details"));
      if (interactivos.length > 0) {
        const inline = scripts.some((m) => (m[2] ?? "").trim().length > 0);
        expect(srcs.length > 0 || inline, `${pagina}: ${interactivos.length} control(es) dibujado(s) y ningún script cargado`).toBe(true);
      }
    });
  }
});
