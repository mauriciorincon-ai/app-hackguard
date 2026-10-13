// @vitest-environment node
// Los hooks de las skills /investigar y /extraer, con sus comandos REALES y el JSON que Claude Code manda por stdin: un subagente solo
// escribe su propuesta.json, solo lee lo de su oficio y solo corre sus dos comandos; nadie decide una propuesta desde una sesión; ningún
// agente lleva un identificador de quien corre; y la sesión principal sigue pasando. Más el cableado: ajustes, subagentes y skills.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { RAIZ } from "./ayuda.ts";

const HOOKS = path.join(RAIZ, "scripts/propuestas/hooks");
// El tipo de `process.env` de Next exige `NODE_ENV`; un entorno de prueba mínimo no lo lleva.
const entorno = (e: Record<string, string>) =>
  e as unknown as NodeJS.ProcessEnv;
const IDENTIFICADOR = "zorrillo99";
const OTRO_IDENTIFICADOR = "ana.ejemplo@example.test";

interface Salida {
  codigo: number | null;
  stderr: string;
}
function hook(
  script: string,
  entrada: unknown,
  args: string[] = [],
  env: Record<string, string> = {},
): Salida {
  const r = spawnSync(process.execPath, [path.join(HOOKS, script), ...args], {
    input: typeof entrada === "string" ? entrada : JSON.stringify(entrada),
    encoding: "utf8",
    env: {
      ...process.env,
      HACKGUARD_IDENTIFICADORES: `${IDENTIFICADOR},${OTRO_IDENTIFICADOR}`,
      ...env,
    },
  });
  return { codigo: r.status, stderr: r.stderr };
}
type Agente = "investigador" | "extractor";
const candado = (agente: Agente | null, herramienta: string, entrada: object) =>
  hook("candado.mjs", {
    tool_name: herramienta,
    tool_input: entrada,
    cwd: RAIZ,
    ...(agente === null ? {} : { agent_type: agente }),
  });
const bash = (agente: Agente | null, command: string) =>
  candado(agente, "Bash", { command });
const escribir = (agente: Agente | null, ruta: string) =>
  candado(agente, "Write", {
    file_path: path.resolve(RAIZ, ruta),
    content: "{}",
  });
const leer = (agente: Agente | null, herramienta: string, entrada: object) =>
  candado(agente, herramienta, entrada);
const pasa = (s: Salida) => expect(s.codigo, s.stderr).toBe(0);
const bloquea = (s: Salida, motivo?: string) => {
  expect(s.codigo, s.stderr).toBe(2);
  if (motivo !== undefined) expect(s.stderr).toContain(motivo);
};

describe("nadie aporta un documento a una corrida desde una sesión (RF-07.2b)", () => {
  const aportes = [
    "pnpm propuestas:aportar propuestas/entradas/doc.txt --corrida INV-2026-10-12-01 --url https://iso.org/x --por Ana --fecha 2026-10-12",
    "pnpm run propuestas:aportar propuestas/entradas/doc.txt",
    "node src/cli/propuestas.ts aportar propuestas/entradas/doc.txt --corrida INV-2026-10-12-01",
    'bash -c "pnpm propuestas:aportar propuestas/entradas/doc.txt"',
    "echo $(pnpm propuestas:aportar propuestas/entradas/doc.txt)",
  ];
  it("la sesión principal y los dos agentes lo tienen vedado, como decidir", () => {
    for (const c of aportes) {
      bloquea(bash(null, c), "lo hace solo una persona");
      for (const a of ["investigador", "extractor"] as const)
        bloquea(bash(a, c), "lo hace solo una persona");
    }
  });
  it("mencionarlo no es ejecutarlo", () => {
    pasa(
      bash(
        null,
        'git commit -m "docs: pnpm propuestas:aportar lo corre una persona"',
      ),
    );
    pasa(bash(null, "grep -rn propuestas:aportar src"));
  });
});

describe("nadie decide una propuesta desde una sesión", () => {
  const decisiones = [
    "pnpm propuestas:decidir PROP-0033 --decision rechazar --por Ana --fecha 2026-10-12",
    "pnpm run propuestas:decidir PROP-0033",
    "node src/cli/propuestas.ts decidir PROP-0033 --decision aprobar",
    "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/cli/propuestas.ts decidir PROP-0033",
    "cd /tmp && pnpm propuestas:decidir PROP-0033",
    "FOO=1 pnpm propuestas:decidir PROP-0033",
    'pnpm "propuestas":"decidir" PROP-0033',
    'bash -c "pnpm propuestas:decidir PROP-0033"',
    "echo $(pnpm propuestas:decidir PROP-0033)",
    "echo `node src/cli/propuestas.ts decidir PROP-0033`",
    "cat <<EOF\n$(pnpm propuestas:decidir PROP-0033)\nEOF",
  ];
  it("la sesión principal tampoco: se bloquea cada forma de lanzarlo", () => {
    for (const c of decisiones)
      bloquea(bash(null, c), "lo hace solo una persona");
  });
  it("los dos agentes tampoco", () => {
    for (const a of ["investigador", "extractor"] as const)
      bloquea(bash(a, decisiones[0]!), "lo hace solo una persona");
  });
  it("mencionarlo no es ejecutarlo: un commit, un echo, un grep o un heredoc con markdown pasan", () => {
    const menciones = [
      'git commit -m "docs: pnpm propuestas:decidir lo corre una persona"',
      'echo "pnpm propuestas:decidir PROP-1"',
      "grep -rn propuestas:decidir src",
      "cat package.json | grep decidir",
      "cat > nota.md <<'EOF'\nUsa `pnpm propuestas:decidir PROP-1` en tu terminal.\nEOF",
      "git commit -m \"$(cat <<'EOF'\nfeat: la bandeja (muestra `pnpm propuestas:decidir`)\nEOF\n)\"",
      "pnpm propuestas:validar",
      "pnpm propuestas:listar --json",
    ];
    for (const c of menciones) pasa(bash(null, c));
  });
});

describe("la sesión principal sigue pasando", () => {
  it("escribe, lee y corre lo de siempre", () => {
    pasa(escribir(null, "src/engine/x.ts"));
    pasa(escribir(null, "propuestas/demo/algo.json"));
    pasa(bash(null, "pnpm test"));
    pasa(bash(null, "git status && ls -la"));
    pasa(leer(null, "Read", { file_path: path.join(RAIZ, "package.json") }));
    pasa(leer(null, "Glob", { pattern: "**/*.ts" }));
  });
  it("un hook que se rompe no la deja sin herramientas (sale con 0), pero a un agente sí lo bloquea", () => {
    pasa(hook("candado.mjs", "esto no es json"));
    bloquea(hook("candado.mjs", "esto no es json", ["--investigador"]));
    bloquea(hook("candado.mjs", "{}", ["--extractor"]));
  });
});

describe("cada agente solo escribe el propuesta.json de una corrida suya", () => {
  it("el investigador escribe en INV-…; el extractor, en EXT-…", () => {
    pasa(
      escribir(
        "investigador",
        "propuestas/corridas/INV-2026-10-12-01/propuesta.json",
      ),
    );
    pasa(
      escribir(
        "extractor",
        "propuestas/corridas/EXT-2026-10-12-03/propuesta.json",
      ),
    );
  });
  it("no escribe la corrida de otro agente", () => {
    bloquea(
      escribir(
        "investigador",
        "propuestas/corridas/EXT-2026-10-12-01/propuesta.json",
      ),
      "solo escribe",
    );
    bloquea(
      escribir(
        "extractor",
        "propuestas/corridas/INV-2026-10-12-01/propuesta.json",
      ),
      "solo escribe",
    );
  });
  it("no escribe lo que escribe el código: la consulta, la corrida sellada, las lecturas ni el libro", () => {
    for (const a of ["investigador", "extractor"] as const) {
      const p = a === "investigador" ? "INV" : "EXT";
      for (const ruta of [
        `propuestas/corridas/${p}-2026-10-12-01/consulta.json`,
        `propuestas/corridas/${p}-2026-10-12-01/corrida.json`,
        `propuestas/corridas/${p}-2026-10-12-01/otro.json`,
        "propuestas/.lecturas/abc.txt",
        "propuestas/demo/INV-2026-10-02-01/propuesta.json",
        "propuestas/entradas/texto.txt",
        "datos/propuestas/decisiones.jsonl",
      ])
        bloquea(escribir(a, ruta), "solo escribe");
    }
  });
  it("no escribe fuera de propuestas/: ni el catálogo, ni el código, ni los ajustes, ni los sobres, ni el archivo del sprint", () => {
    for (const ruta of [
      "datos/pruebas/agente/PR-X-001.json",
      "datos/evidencia/demo/SOB-9999.json",
      "datos/instantaneas/2026-10-05-010a8c56f706.json",
      "src/cli/propuestas.ts",
      ".claude/settings.json",
      "scripts/propuestas/hooks/candado.mjs",
      "docs/diseno/index.html",
      "package.json",
      "sprints/SPRINT_008-cierre.md",
    ])
      bloquea(escribir("investigador", ruta), "solo escribe");
  });
  it("no se escapa con rutas: «..», fuera de la raíz, vacía ni relativa al directorio de trabajo", () => {
    for (const ruta of [
      "propuestas/corridas/INV-2026-10-12-01/../../../datos/x.json",
      "/tmp/propuesta.json",
      path.join(
        tmpdir(),
        "propuestas/corridas/INV-2026-10-12-01/propuesta.json",
      ),
      "",
    ])
      bloquea(
        candado("investigador", "Write", { file_path: ruta, content: "{}" }),
        "solo escribe",
      );
    bloquea(
      candado("investigador", "Write", { content: "{}" }),
      "solo escribe",
    );
  });
  it("Edit, MultiEdit y NotebookEdit siguen la misma regla", () => {
    for (const h of ["Edit", "MultiEdit", "NotebookEdit"])
      bloquea(
        candado("investigador", h, { file_path: path.join(RAIZ, "src/x.ts") }),
        "solo escribe",
      );
    pasa(
      candado("investigador", "Edit", {
        file_path: path.join(
          RAIZ,
          "propuestas/corridas/INV-2026-10-12-01/propuesta.json",
        ),
      }),
    );
  });
});

describe("cada agente solo lee lo de su oficio", () => {
  const ruta = (r: string) => path.join(RAIZ, r);
  it("lee el catálogo, las propuestas y sus lecturas, el contrato de su salida y su skill", () => {
    for (const r of [
      "datos/marcos/cwe.json",
      "datos/pruebas/modelo_generativo/PR-IA-PINJ-001.json",
      "propuestas/demo/INV-2026-10-02-01/propuesta.json",
      "propuestas/.lecturas/abc.txt",
      "src/engine/propuestas/esquemas.ts",
    ])
      for (const a of ["investigador", "extractor"] as const)
        pasa(leer(a, "Read", { file_path: ruta(r) }));
    pasa(
      leer("investigador", "Read", {
        file_path: ruta(".claude/skills/investigar/SKILL.md"),
      }),
    );
    pasa(
      leer("extractor", "Read", {
        file_path: ruta(".claude/skills/extraer/SKILL.md"),
      }),
    );
  });
  it("Glob y Grep piden una carpeta permitida: sin «path» buscarían en todo el repositorio", () => {
    pasa(
      leer("investigador", "Grep", {
        pattern: "deprecated",
        path: ruta("propuestas/.lecturas"),
      }),
    );
    pasa(
      leer("investigador", "Glob", {
        pattern: "**/*.json",
        path: ruta("datos/marcos"),
      }),
    );
    bloquea(leer("investigador", "Grep", { pattern: "x" }), "solo lee");
    bloquea(leer("extractor", "Glob", { pattern: "**/*" }), "solo lee");
    bloquea(
      leer("investigador", "Glob", { pattern: "../**/*", path: ruta("datos") }),
      "solo lee",
    );
    bloquea(
      leer("investigador", "Grep", {
        pattern: "x",
        path: ruta("datos"),
        glob: "/etc/*",
      }),
      "solo lee",
    );
  });
  it("ni mayúsculas ni un glob cuentan como un rodeo para leer datos/privado/", () => {
    // Auditoría (Alto): macOS no distingue mayúsculas, y un glob de Grep o de Glob no se miraba contra lo privado.
    bloquea(
      leer("investigador", "Read", {
        file_path: ruta("datos/Privado/README.md"),
      }),
      "solo lee",
    );
    bloquea(
      leer("investigador", "Grep", {
        pattern: "x",
        path: ruta("datos/marcos"),
        glob: "../privado/**",
      }),
      "solo lee",
    );
    bloquea(
      leer("investigador", "Grep", {
        pattern: "x",
        path: ruta("datos"),
        glob: "privado/**",
      }),
      "solo lee",
    );
    bloquea(
      leer("extractor", "Glob", { pattern: "privado/**", path: ruta("datos") }),
      "solo lee",
    );
    bloquea(
      leer("extractor", "Glob", { pattern: "**/*", path: ruta("datos") }),
      "solo lee",
    );
    // Con una subcarpeta real como «path», solo el patrón puede bloquear: la raíz `datos` ya se rechaza sola.
    bloquea(
      leer("investigador", "Grep", {
        pattern: "x",
        path: ruta("datos/marcos"),
        glob: "**/privado/**",
      }),
      "solo lee",
    );
  });
  it("jamás lee datos/privado/, secretos, el historial ni el código del CLI", () => {
    for (const r of [
      "datos/privado/activos/mi-asistente.json",
      "datos/privado",
      ".env",
      ".env.local",
      ".git/config",
      "node_modules/zod/package.json",
      "src/cli/propuestas.ts",
      "src/lib/propuestas/buscar.ts",
      "package.json",
      "sprints/SPRINT_008-cierre.md",
      "../fuera.txt",
      "/etc/passwd",
    ])
      bloquea(
        leer("investigador", "Read", {
          file_path: r.startsWith("/") ? r : ruta(r),
        }),
        "solo lee",
      );
    bloquea(
      leer("extractor", "Grep", { pattern: "x", path: ruta("datos/privado") }),
      "solo lee",
    );
  });
  it("no lee la skill del otro agente", () => {
    bloquea(
      leer("extractor", "Read", {
        file_path: ruta(".claude/skills/investigar/SKILL.md"),
      }),
      "solo lee",
    );
    bloquea(
      leer("investigador", "Read", {
        file_path: ruta(".claude/skills/extraer/SKILL.md"),
      }),
      "solo lee",
    );
  });
});

describe("cada agente solo corre sus dos comandos, tal cual", () => {
  it("el investigador: buscar y verificar una corrida INV-…", () => {
    for (const c of [
      "pnpm propuestas:buscar --todos --fecha 2026-10-12",
      "pnpm propuestas:buscar --marco owasp-llm-top10 --fecha 2026-10-12",
      "pnpm propuestas:buscar --familia modelo_decision --fecha 2026-10-12",
      "pnpm propuestas:verificar propuestas/corridas/INV-2026-10-12-01",
      "pnpm propuestas:verificar propuestas/corridas/INV-2026-10-12-01 --json",
    ])
      pasa(bash("investigador", c));
  });
  it("el extractor: leer un texto de dos carpetas y verificar una corrida EXT-…", () => {
    for (const c of [
      "pnpm propuestas:leer docs/kit-de-prueba/textos-pegados/escaner-demo.txt --activo act-demo-asistente --fecha 2026-10-12",
      "pnpm propuestas:leer propuestas/entradas/mi-texto.txt --activo act-demo-asistente --fecha 2026-10-12 --json",
      "pnpm propuestas:verificar propuestas/corridas/EXT-2026-10-12-01",
    ])
      pasa(bash("extractor", c));
  });
  it("nada fuera de eso: otro comando, encadenar, redirigir, sustituir o anteponer variables", () => {
    const base =
      "pnpm propuestas:verificar propuestas/corridas/INV-2026-10-12-01";
    for (const c of [
      "ls",
      "curl https://example.test",
      'node -e "console.log(1)"',
      "pnpm propuestas:validar",
      "pnpm propuestas:listar",
      `${base} && cat datos/privado/x`,
      `${base}; rm -rf propuestas`,
      `${base} | tee fuera.txt`,
      `${base} > fuera.txt`,
      `${base} $(whoami)`,
      `HACKGUARD_RAIZ=/tmp ${base}`,
      `sudo ${base}`,
      "pnpm propuestas:buscar --todos --fecha 2026-10-12 --extra",
      "pnpm propuestas:buscar --marco OWASP --fecha 2026-10-12",
      "pnpm propuestas:buscar --todos --fecha ayer",
      "pnpm propuestas:verificar propuestas/corridas/INV-2026-10-12-01/../..",
      "pnpm propuestas:verificar propuestas/demo/INV-2026-10-02-01",
      "pnpm propuestas:verificar datos",
    ])
      bloquea(bash("investigador", c), "BLOQUEADO");
  });
  it("cada uno solo verifica SU corrida, y el extractor no busca en la red ni el investigador lee textos", () => {
    bloquea(
      bash(
        "investigador",
        "pnpm propuestas:verificar propuestas/corridas/EXT-2026-10-12-01",
      ),
    );
    bloquea(
      bash(
        "extractor",
        "pnpm propuestas:verificar propuestas/corridas/INV-2026-10-12-01",
      ),
    );
    bloquea(
      bash("extractor", "pnpm propuestas:buscar --todos --fecha 2026-10-12"),
    );
    bloquea(
      bash(
        "investigador",
        "pnpm propuestas:leer docs/kit-de-prueba/textos-pegados/escaner-demo.txt --activo act-demo-asistente --fecha 2026-10-12",
      ),
    );
  });
  it("el extractor no lee de otras carpetas ni sale de ellas con «..»", () => {
    for (const c of [
      "pnpm propuestas:leer datos/privado/evidencia/x.txt --activo act-demo-asistente --fecha 2026-10-12",
      "pnpm propuestas:leer docs/kit-de-prueba/../../datos/privado/x.txt --activo act-demo-asistente --fecha 2026-10-12",
      "pnpm propuestas:leer docs/kit-de-prueba/x.json --activo act-demo-asistente --fecha 2026-10-12",
      "pnpm propuestas:leer /etc/passwd --activo act-demo-asistente --fecha 2026-10-12",
      "pnpm propuestas:leer docs/kit-de-prueba/x.txt --activo ../privado --fecha 2026-10-12",
    ])
      bloquea(bash("extractor", c), "BLOQUEADO");
  });
  it("ninguna herramienta ajena a su oficio: ni red, ni subagentes, ni tareas", () => {
    for (const h of [
      "WebFetch",
      "WebSearch",
      "Agent",
      "Task",
      "TodoWrite",
      "mcp__x__y",
    ])
      bloquea(
        candado("investigador", h, { url: "https://example.test" }),
        "no usa la herramienta",
      );
  });
});

describe("a los agentes los lanza una persona", () => {
  const lanzar = (herramienta: string, tipo: string) =>
    hook("sin-lanzar.mjs", {
      tool_name: herramienta,
      tool_input: { subagent_type: tipo, prompt: "x" },
    });
  it("la herramienta Agent (o Task) no lanza al investigador ni al extractor", () => {
    for (const h of ["Agent", "Task"])
      for (const t of [
        "investigador",
        "extractor",
        " Investigador ",
        "EXTRACTOR",
      ])
        bloquea(lanzar(h, t), "lo lanza una persona");
  });
  it("lanzar otro subagente pasa", () => {
    for (const t of ["Explore", "general-purpose", "Plan", ""])
      pasa(lanzar("Agent", t));
  });
  it("el mensaje dice con qué skill se lanza cada uno", () => {
    expect(lanzar("Agent", "investigador").stderr).toContain("/investigar");
    expect(lanzar("Agent", "extractor").stderr).toContain("/extraer");
  });
});

describe("ninguna petición ni escritura de un agente lleva un identificador de quien corre", () => {
  const sin = (agente: Agente | null, herramienta: string, entrada: object) =>
    hook("sin-identificadores.mjs", {
      tool_name: herramienta,
      tool_input: entrada,
      ...(agente === null ? {} : { agent_type: agente }),
    });
  it("un comando con el usuario del sistema, un correo de git o la carpeta personal se bloquea sin repetir el identificador", () => {
    for (const id of [
      IDENTIFICADOR,
      OTRO_IDENTIFICADOR,
      IDENTIFICADOR.toUpperCase(),
    ]) {
      const r = sin("investigador", "Bash", {
        command: `pnpm propuestas:buscar --marco ${id} --fecha 2026-10-12`,
      });
      bloquea(r, "identificador");
      expect(r.stderr.toLowerCase()).not.toContain(IDENTIFICADOR);
      expect(r.stderr.toLowerCase()).not.toContain(OTRO_IDENTIFICADOR);
    }
  });
  it("lo que escribe un agente (contenido, texto nuevo, ediciones en lote) tampoco puede llevarlo", () => {
    bloquea(
      sin("extractor", "Write", {
        file_path: "x",
        content: `{"nota":"de ${IDENTIFICADOR}"}`,
      }),
      "identificador",
    );
    bloquea(
      sin("extractor", "Edit", {
        file_path: "x",
        old_string: "a",
        new_string: IDENTIFICADOR,
      }),
      "identificador",
    );
    bloquea(
      sin("extractor", "MultiEdit", {
        file_path: "x",
        edits: [{ old_string: "a", new_string: `hola ${IDENTIFICADOR}` }],
      }),
      "identificador",
    );
  });
  it("la ruta absoluta de la escritura no cuenta (lleva la carpeta personal en cualquier máquina), solo su contenido", () => {
    pasa(
      sin("investigador", "Write", {
        file_path: `/Users/${IDENTIFICADOR}/Code/app/propuestas/x.json`,
        content: "{}",
      }),
    );
  });
  it("un comando y un contenido limpios pasan; la sesión principal pasa aunque lo lleve", () => {
    pasa(
      sin("investigador", "Bash", {
        command: "pnpm propuestas:buscar --todos --fecha 2026-10-12",
      }),
    );
    pasa(sin("extractor", "Write", { file_path: "x", content: "{}" }));
    pasa(sin(null, "Bash", { command: `echo ${IDENTIFICADOR}` }));
  });
  it("los identificadores salen de git (correo y nombre), del sistema y de la variable de entorno", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "hackguard-git-"));
    temporales.push(dir);
    const config = path.join(dir, "gitconfig");
    writeFileSync(
      config,
      "[user]\n\temail = ana.ejemplo@example.test\n\tname = Ana Ejemplo\n",
    );
    const r = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { identificadores } from ${JSON.stringify(path.join(RAIZ, "scripts/propuestas/comun.mjs"))}; console.log(JSON.stringify(identificadores()));`,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_CONFIG_GLOBAL: config,
          GIT_CONFIG_SYSTEM: "/dev/null",
          HACKGUARD_IDENTIFICADORES: "zorrillo99",
        },
      },
    );
    const ids = JSON.parse(r.stdout) as string[];
    expect(ids).toContain("ana.ejemplo@example.test");
    expect(ids).toContain("ana.ejemplo");
    expect(ids).toContain("ejemplo");
    expect(ids).toContain("zorrillo99");
    expect(ids.every((x) => x.length >= 4 && x === x.toLowerCase())).toBe(true);
  });
});

describe("el analizador de comandos", () => {
  const correr = (casos: string[]) => {
    const r = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { ejecutaDecidir, palabrasDe, tramosDe } from ${JSON.stringify(path.join(HOOKS, "orden.mjs"))};
         const casos = JSON.parse(process.argv[1]);
         console.log(JSON.stringify(casos.map((c) => ({ decide: ejecutaDecidir(c), tramos: tramosDe(c), palabras: palabrasDe(c) }))));`,
        JSON.stringify(casos),
      ],
      { encoding: "utf8" },
    );
    return JSON.parse(r.stdout) as {
      decide: boolean;
      tramos: string[];
      palabras: string[];
    }[];
  };
  it("parte por operadores solo fuera de comillas y entra a $(…) y a las comillas invertidas", () => {
    const [a, b, c] = correr([
      'echo "a && b" && ls',
      "echo $(ls -la; whoami)",
      "echo `uname -a`",
    ]);
    expect(a!.tramos).toEqual(['echo "a && b"', "ls"]);
    expect(b!.tramos).toContain("ls -la");
    expect(b!.tramos).toContain("whoami");
    expect(c!.tramos).toContain("uname -a");
  });
  it("las palabras son las que vería la terminal, sin comillas ni escapes", () => {
    const [a] = correr(["pnpm \"propuestas\":'decidir' PROP\\-1"]);
    expect(a!.palabras).toEqual(["pnpm", "propuestas:decidir", "PROP-1"]);
  });
  it("un heredoc entre comillas es dato; sin comillas, solo lo que expande cuenta", () => {
    const [citado, expandido, inocuo] = correr([
      "cat > x <<'EOF'\n`pnpm propuestas:decidir P`\nEOF\nls",
      "cat > x <<EOF\n`pnpm propuestas:decidir P`\nEOF\nls",
      "cat > x <<EOF\ntexto (sin cerrar\nEOF\nls",
    ]);
    expect(citado!.decide).toBe(false);
    expect(expandido!.decide).toBe(true);
    expect(inocuo!.decide).toBe(false);
    expect(citado!.tramos).toContain("ls");
  });
  it("un heredoc sin cierre no esconde lo que viene antes", () => {
    const [a] = correr([
      "pnpm propuestas:decidir P && cat <<'EOF'\nnunca se cierra",
    ]);
    expect(a!.decide).toBe(true);
  });
});

const temporales: string[] = [];
afterAll(() =>
  temporales.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

// ── El cableado: ajustes, subagentes y skills ───────────────────────────────────────────────────────

interface Ajustes {
  hooks: { PreToolUse: { matcher: string; hooks: { command: string }[] }[] };
}
const ajustes = JSON.parse(
  readFileSync(path.join(RAIZ, ".claude/settings.json"), "utf8"),
) as Ajustes;
const registrados = (script: string) =>
  ajustes.hooks.PreToolUse.filter((h) =>
    h.hooks.some((x) =>
      x.command.includes(`/scripts/propuestas/hooks/${script}.mjs`),
    ),
  );

/** El encabezado `---` de un archivo de Claude Code: líneas `clave: valor`, con el bloque `hooks:` aparte. */
function encabezado(relativa: string) {
  const texto = readFileSync(path.join(RAIZ, relativa), "utf8");
  const m = /^---\n([\s\S]*?)\n---\n/.exec(texto);
  if (m === null) throw new Error(`${relativa} no trae encabezado`);
  const lineas = m[1]!.split("\n");
  const campos: Record<string, string> = {};
  for (const l of lineas) {
    const k = /^([a-z-]+):\s*(.*)$/.exec(l);
    if (k !== null) campos[k[1]!] = k[2]!;
  }
  return { campos, crudo: m[1]!, cuerpo: texto.slice(m[0].length) };
}

describe("los ajustes del proyecto registran los tres hooks y su comando corre", () => {
  it("cada uno está registrado, con las herramientas que vigila", () => {
    expect(registrados("candado").map((h) => h.matcher)).toEqual([
      "Bash|Write|Edit|MultiEdit|NotebookEdit|Read|Glob|Grep",
    ]);
    expect(registrados("sin-lanzar").map((h) => h.matcher)).toEqual([
      "Agent|Task",
    ]);
    expect(registrados("sin-identificadores").map((h) => h.matcher)).toEqual([
      "Bash|Write|Edit|MultiEdit",
    ]);
  });
  it("el comando registrado, tal como lo corre Claude Code, bloquea y deja pasar", () => {
    const comando = (s: string) => registrados(s)[0]!.hooks[0]!.command;
    const correr = (s: string, entrada: object) =>
      spawnSync("/bin/bash", ["-c", comando(s)], {
        input: JSON.stringify(entrada),
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: RAIZ },
      });
    expect(
      correr("candado", {
        tool_name: "Bash",
        tool_input: { command: "pnpm propuestas:decidir PROP-1" },
      }).status,
    ).toBe(2);
    expect(
      correr("candado", { tool_name: "Bash", tool_input: { command: "ls" } })
        .status,
    ).toBe(0);
    expect(
      correr("sin-lanzar", {
        tool_name: "Agent",
        tool_input: { subagent_type: "investigador" },
      }).status,
    ).toBe(2);
    expect(
      correr("sin-lanzar", {
        tool_name: "Agent",
        tool_input: { subagent_type: "Explore" },
      }).status,
    ).toBe(0);
    expect(
      correr("sin-identificadores", {
        tool_name: "Bash",
        agent_type: "extractor",
        tool_input: { command: "echo ok" },
      }).status,
    ).toBe(0);
  });
  it("todos los scripts que nombran existen", () => {
    for (const s of [
      "candado",
      "sin-lanzar",
      "sin-identificadores",
      "entrada",
      "orden",
    ])
      expect(existsSync(path.join(HOOKS, `${s}.mjs`)), s).toBe(true);
  });
});

describe("los subagentes: Sonnet, sin red, con sus hooks", () => {
  for (const [agente, skill] of [
    ["investigador", "investigar"],
    ["extractor", "extraer"],
  ] as const) {
    const { campos, crudo } = encabezado(`.claude/agents/${agente}.md`);
    it(`${agente}: modelo sonnet y exactamente las herramientas de su oficio (sin WebFetch, WebSearch, Edit ni Agent)`, () => {
      expect(campos.name).toBe(agente);
      expect(campos.model).toBe("sonnet");
      expect(campos.tools!.split(",").map((t) => t.trim())).toEqual([
        "Read",
        "Glob",
        "Grep",
        "Write",
        "Bash",
      ]);
    });
    it(`${agente}: lleva en su encabezado el candado y el filtro de identificadores, marcados con su nombre`, () => {
      expect(crudo).toContain(
        `scripts/propuestas/hooks/candado.mjs --${agente}`,
      );
      expect(crudo).toContain(
        `scripts/propuestas/hooks/sin-identificadores.mjs --${agente}`,
      );
      for (const h of crudo.match(
        /scripts\/propuestas\/hooks\/[a-z-]+\.mjs/g,
      ) ?? [])
        expect(existsSync(path.join(RAIZ, h)), h).toBe(true);
    });
    it(`${agente}: su skill solo la invoca una persona, en su propio contexto y con este agente`, () => {
      const s = encabezado(`.claude/skills/${skill}/SKILL.md`);
      expect(s.campos.name).toBe(skill);
      expect(s.campos["disable-model-invocation"]).toBe("true");
      expect(s.campos.context).toBe("fork");
      expect(s.campos.agent).toBe(agente);
      expect(s.cuerpo).toContain("$ARGUMENTS");
    });
  }
  it("un hook roto del agente BLOQUEA (sale con 2): sin `node` y con un script que no carga", () => {
    const comandos = ["investigador", "extractor"].flatMap((a) =>
      [
        ...readFileSync(
          path.join(RAIZ, ".claude", "agents", `${a}.md`),
          "utf8",
        ).matchAll(/command: '(.*)'$/gm),
      ].map((m) => m[1]!),
    );
    expect(comandos.length).toBe(4);
    for (const comando of comandos) {
      // Sin `node` en el PATH: un hook que no arranca no puede dejar pasar.
      const sinNode = spawnSync("/bin/sh", ["-c", comando], {
        env: entorno({ PATH: "/nonexistent", CLAUDE_PROJECT_DIR: RAIZ }),
        input: "{}",
        encoding: "utf8",
      });
      expect(sinNode.status, comando).toBe(2);
      // Con `node`, pero con el script ausente (node sale con 1): también bloquea.
      const sinScript = spawnSync("/bin/sh", ["-c", comando], {
        env: entorno({
          PATH: process.env.PATH ?? "",
          CLAUDE_PROJECT_DIR: "/nonexistent",
        }),
        input: "{}",
        encoding: "utf8",
      });
      expect(sinScript.status, comando).toBe(2);
    }
  });
  it("y un hook sano sigue dejando pasar lo que le toca: el comando de verdad sale con 0", () => {
    const comando = readFileSync(
      path.join(RAIZ, ".claude", "agents", "investigador.md"),
      "utf8",
    ).match(/command: '(.*candado.*)'$/m)![1]!;
    const r = spawnSync("/bin/sh", ["-c", comando], {
      env: entorno({ PATH: process.env.PATH ?? "", CLAUDE_PROJECT_DIR: RAIZ }),
      input: JSON.stringify({
        tool_name: "Read",
        tool_input: {
          file_path: path.join(
            RAIZ,
            "propuestas",
            "demo",
            "INV-2026-10-02-01",
            "corrida.json",
          ),
        },
        cwd: RAIZ,
      }),
      encoding: "utf8",
    });
    expect(r.status, r.stderr).toBe(0);
  });
  it("un script de hook que LANZA con la marca de un agente sale con 2; sin la marca, no (la sesión principal no queda sin herramientas)", () => {
    const carpeta = mkdtempSync(path.join(tmpdir(), "hook-roto-"));
    const roto = path.join(carpeta, "roto.mjs");
    writeFileSync(
      roto,
      `import ${JSON.stringify(pathToFileURL(path.join(HOOKS, "entrada.mjs")).href)};\nthrow new Error("boom");\n`,
    );
    const conMarca = spawnSync(process.execPath, [roto, "--investigador"], {
      encoding: "utf8",
    });
    expect(conMarca.status).toBe(2);
    expect(conMarca.stderr).toContain("BLOQUEADO");
    const sinMarca = spawnSync(process.execPath, [roto], { encoding: "utf8" });
    expect(sinMarca.status).not.toBe(2);
    rmSync(carpeta, { recursive: true, force: true });
  });
});
