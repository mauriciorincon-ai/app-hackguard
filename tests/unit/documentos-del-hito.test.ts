// @vitest-environment node
// Los documentos del cierre del hito (Sprint 9): el BLUEPRINT as-built, el índice de ADR, el brochure y su guion, el export y el
// sistema de diseño. Un documento de arquitectura que describe lo planeado y no lo construido es una frase caducada de página entera:
// aquí se exige que no tenga marcadores sin llenar, que cada ruta que cita exista, que cada ADR esté indexado, que el brochure diga
// las mismas cifras que el export y cada funcionalidad, y que la cabecera de /conoce lleve la huella del script que hoy tiene.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  cspDelBrochure,
  huellaDelEstilo,
  huellaDeclarada,
  huellaDelScript,
  scriptEnLinea,
} from "../../scripts/csp-del-brochure.mjs";
import {
  actualizarBrochure,
  formatoDeCifra,
} from "../../scripts/cifras-del-export.mjs";
import { RAIZ } from "./propuestas/ayuda.ts";

const leer = (f: string) => readFileSync(path.join(RAIZ, f), "utf8");
const exportado = JSON.parse(leer("docs/brochure-export.json")) as {
  actualizado: string;
  metricas: { clave: string; valor: number }[];
  funcionalidades: {
    total: number;
    grupos: { features: { id: string; nombre: string }[] }[];
  };
};

/** Todos los archivos del repo que no son dependencias ni salidas de build, para resolver un nombre de archivo sin carpeta. */
const IGNORADAS = new Set([
  "node_modules",
  ".next",
  "out",
  ".git",
  "coverage",
  ".vercel",
]);
function nombresDeArchivo(dir = RAIZ, acumulado = new Set<string>()) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORADAS.has(e.name)) continue;
    if (e.isDirectory()) nombresDeArchivo(path.join(dir, e.name), acumulado);
    else acumulado.add(e.name);
  }
  return acumulado;
}

/** Lo que un `<code>` nombra como ruta del repo (no un comando, un patrón ni un identificador de formato). */
function rutasCitadas(html: string): string[] {
  const EXT = /\.(ts|tsx|mjs|json|md|html|yml|yaml|sh|css|js)$/;
  return [
    ...new Set([...html.matchAll(/<code>([^<]+)<\/code>/g)].map((m) => m[1]!)),
  ]
    .filter((c) => !/\s/.test(c))
    .filter((c) => !/^(pnpm|node|hackguard\/|https?:|--|\$)/.test(c))
    .filter((c) => c.includes("/") || EXT.test(c))
    .filter((c) => !/[*<{(…]|NNN/.test(c));
}

// Carpetas que el blueprint nombra como parte de una regla y no como ruta de la raíz, y el nombre del repositorio en el proveedor.
const NO_SON_RUTAS = new Set([
  "diseno/",
  "privado/",
  "mauriciorincon-ai/app-hackguard",
]);

describe("docs/BLUEPRINT.html (as built)", () => {
  const html = leer("docs/BLUEPRINT.html");
  const sinEstilo = html.replace(/<style>[\s\S]*?<\/style>/, "");

  it("no deja marcadores de la plantilla sin llenar", () => {
    expect(sinEstilo).not.toMatch(/\[[A-Z][A-Z_ ]{2,}\]/);
    expect(sinEstilo).not.toMatch(
      /\[(TODO|TBD|pendiente|por definir)[^\]]*\]/i,
    );
    expect(sinEstilo).not.toContain("YYYY-MM-DD");
    expect(sinEstilo).not.toContain("Instrucciones para el builder");
  });

  it("no publica una dirección: ni de producción, ni de preview, ni de otro sitio (regla 17)", () => {
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(
      /vercel[.]app|workers[.]dev|pages[.]dev|github[.]io/i,
    );
  });

  it("cada ruta que cita existe en el repositorio", () => {
    const nombres = nombresDeArchivo();
    const faltan = rutasCitadas(html)
      .filter((c) => !NO_SON_RUTAS.has(c))
      .filter((c) =>
        c.includes("/")
          ? !existsSync(path.join(RAIZ, c.replace(/\/$/, "")))
          : !nombres.has(c),
      );
    expect(faltan).toEqual([]);
  });

  it("cita bastantes rutas (no es un documento vacío) y nombra las cuatro familias de piezas", () => {
    expect(rutasCitadas(html).length).toBeGreaterThan(150);
    for (const parte of [
      "Motores (src/engine)",
      "Agentes de Claude Code",
      "Integración continua",
      "Decisiones de arquitectura",
      "Reglas duras y dónde se cumplen",
      "Brechas conocidas",
    ])
      expect(html, parte).toContain(parte);
  });

  it("lleva la fecha de este sprint y su historial", () => {
    expect(html).toContain(exportado.actualizado);
    expect(html).toContain("Historial del blueprint");
  });

  it("nombra cada ADR 001 a 011", () => {
    for (const n of readdirSync(path.join(RAIZ, "decisions")).filter((f) =>
      /^\d{3}-.+\.md$/.test(f),
    ))
      expect(html, n).toContain(n);
  });
});

describe("decisions/README.md (el índice de ADR)", () => {
  const indice = leer("decisions/README.md");
  const adrs = readdirSync(path.join(RAIZ, "decisions")).filter((f) =>
    /^\d{3}-.+\.md$/.test(f),
  );
  it("hay once ADR", () => {
    expect(adrs).toHaveLength(11);
  });
  it.each(adrs)("%s está indexado, con su enlace", (archivo) => {
    expect(indice).toContain(`(${archivo})`);
  });
  it("no indexa un ADR que no existe", () => {
    const citados = [...indice.matchAll(/\]\((\d{3}-[^)]+\.md)\)/g)].map(
      (m) => m[1]!,
    );
    for (const c of citados) expect(adrs, c).toContain(c);
  });
});

describe("design-system.md y el bundle de design-sync", () => {
  it("la versión del documento es la del bundle", () => {
    const version = /^version: (\d+\.\d+\.\d+)$/m.exec(
      leer("design-system.md"),
    )![1];
    expect(version).toBe("1.1.0");
    expect(leer("design-sync/README.md")).toContain(
      `desde \`design-system.md\` ${version}`,
    );
  });
  it("el registro de cambios nombra la versión vigente", () => {
    expect(leer("design-system.md")).toMatch(/- \*\*1\.1\.0\*\* —/);
  });
});

describe("docs/CHANGELOG.md", () => {
  it("tiene los Sprints 8 y 9, el más nuevo primero", () => {
    const c = leer("docs/CHANGELOG.md");
    const s9 = c.indexOf("## Sprint 009");
    const s8 = c.indexOf("## Sprint 008");
    const s7 = c.indexOf("## Sprint 007");
    expect(s9).toBeGreaterThan(-1);
    expect(s9).toBeLessThan(s8);
    expect(s8).toBeLessThan(s7);
  });
});

describe("docs/BROCHURE.html y su guion", () => {
  const html = leer("docs/BROCHURE.html");
  const features = exportado.funcionalidades.grupos.flatMap((g) => g.features);

  it("lleva cada una de las funcionalidades del export, una vez (n de n)", () => {
    expect(features).toHaveLength(exportado.funcionalidades.total);
    for (const f of features) {
      expect(
        html.match(new RegExp(`data-feature="${f.id}"`, "g")),
        f.id,
      ).toHaveLength(1);
      expect(html, f.nombre).toContain(f.nombre);
    }
    expect(html.match(/data-feature="/g)).toHaveLength(features.length);
  });

  it("el guion tiene su tabla de cuadre con las mismas funcionalidades", () => {
    const guion = leer("docs/BROCHURE-guion.md");
    for (const f of features) expect(guion, f.id).toContain(`| ${f.id} |`);
  });

  it("sus cifras son las del export, en los dos idiomas", () => {
    const valores = new Map(exportado.metricas.map((m) => [m.clave, m.valor]));
    const vistas = [
      ...html.matchAll(
        /<span lang="(es|en)" data-cifra="([a-z_0-9]+)">([^<]*)<\/span>/g,
      ),
    ];
    expect(vistas.length).toBeGreaterThanOrEqual(16);
    for (const [, idioma, clave, texto] of vistas) {
      expect(valores.has(clave!), clave).toBe(true);
      expect(texto, `${clave} (${idioma})`).toBe(
        formatoDeCifra(valores.get(clave!)!, idioma as "es" | "en"),
      );
    }
    // y el script que las escribe es idempotente sobre este archivo
    expect(
      actualizarBrochure({ metricas: exportado.metricas } as never, html),
    ).toBe(html);
  });

  it("es autocontenido y bilingüe: sin direcciones, sin cargas externas, cada frase con su par", () => {
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<(link|img|iframe)[^>]+(src|href)=/i);
    expect(html).not.toMatch(/\bfetch\(|XMLHttpRequest|import\(/);
    const cuerpo = html.slice(
      html.indexOf("<body>"),
      html.lastIndexOf("<script>"),
    );
    const cuenta = (l: string) =>
      (cuerpo.match(new RegExp(` lang="${l}"`, "g")) ?? []).length;
    expect(cuenta("es")).toBeGreaterThan(100);
    expect(cuenta("en")).toBe(cuenta("es"));
  });

  it("honra el movimiento reducido con una experiencia completa y no usa más que un script", () => {
    expect(html).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(html).toMatch(/@media \(prefers-reduced-motion: no-preference\)/);
    // El que se hashea es el elemento de verdad, no un comentario que nombre la etiqueta.
    expect(scriptEnLinea(html).trimStart().startsWith("(function")).toBe(true);
    expect(scriptEnLinea(html)).not.toContain("<style>");
  });

  it("el botón que abre una tarjeta cuelga de un encabezado, no al revés (A11y estructural)", () => {
    expect(html).toMatch(/<h3 class="tarjeta-cabeza">\s*<button/);
    expect(html).not.toMatch(/<button[^>]*>\s*<h3/);
  });
});

describe("la cabecera de /conoce lleva la huella del script que hoy tiene el brochure", () => {
  const html = leer("docs/BROCHURE.html");
  const huella = huellaDelScript(html);
  const estilo = huellaDelEstilo(html);
  const serve = JSON.parse(leer("serve.json")) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const vercel = JSON.parse(leer("vercel.json")) as typeof serve;
  const politica = (cfg: typeof serve, source: string) =>
    cfg.headers
      .find((h) => h.source === source)
      ?.headers.find((x) => x.key === "Content-Security-Policy")?.value;

  it("serve.json", () => {
    const p = politica(serve, "conoce{,/**}");
    expect(huellaDeclarada(p)).toBe(huella);
    expect(p).toBe(cspDelBrochure(huella, estilo));
  });
  it("vercel.json", () => {
    const p = politica(vercel, "/conoce(/.*)?");
    expect(huellaDeclarada(p)).toBe(huella);
    expect(p).toBe(cspDelBrochure(huella, estilo));
  });
  it("la política no abre nada de más: ni 'unsafe-inline' para scripts ni 'unsafe-eval'", () => {
    const p = cspDelBrochure(huella, estilo);
    expect(p).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(p).toMatch(/script-src '(sha256-[^']+)';/);
  });
  it("un byte distinto en el script cambia la huella (la cabecera quedaría vieja)", () => {
    const otro = html.replace("var CLAVE", "var  CLAVE");
    expect(otro).not.toBe(html);
    expect(huellaDelScript(otro)).not.toBe(huella);
  });
});

describe("el build sirve el brochure en /conoce", () => {
  it("copiar-maqueta lo copia de docs/ a public/conoce/ y public/conoce/ no se versiona", () => {
    expect(leer("scripts/copiar-maqueta.mjs")).toContain("conoce");
    expect(leer(".gitignore")).toContain("public/conoce/");
  });
  it("el export declara la ruta y el archivo", () => {
    const e = JSON.parse(leer("docs/brochure-export.json")) as {
      enlaces: { brochure_archivo: string; brochure_ruta_local: string };
    };
    expect(e.enlaces.brochure_archivo).toBe("docs/BROCHURE.html");
    expect(e.enlaces.brochure_ruta_local).toBe("/conoce");
    expect(existsSync(path.join(RAIZ, e.enlaces.brochure_archivo))).toBe(true);
  });
});

describe("formatoDeCifra", () => {
  it("separa los miles y el decimal como cada idioma", () => {
    expect(formatoDeCifra(4260, "es")).toBe("4.260");
    expect(formatoDeCifra(4260, "en")).toBe("4,260");
    expect(formatoDeCifra(97.5, "es")).toBe("97,5");
    expect(formatoDeCifra(97.5, "en")).toBe("97.5");
    expect(formatoDeCifra(38, "es")).toBe("38");
    expect(formatoDeCifra(0, "en")).toBe("0");
  });
  it("una cifra que el export no tiene rompe en vez de quedar vieja", () => {
    expect(() =>
      actualizarBrochure(
        { metricas: [] } as never,
        '<span lang="es" data-cifra="no_existe">1</span>',
      ),
    ).toThrow(/no_existe/);
  });
});
