// Los archivos del kit del supuesto S3 y del lote de 200, como los escribe el generador: un mapa ruta → contenido. Lo usan la CLI
// (`pnpm supuestos:generar` los escribe, `--comprobar` los compara) y el gate de deriva (`tests/unit/supuestos/kit.test.ts`): el kit del
// repo es SIEMPRE lo que el generador da, nunca editado a mano. Lee solo `datos/pruebas/` (lo que cada prueba espera, para la hoja).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  casosDelLoteDe200,
  huellaDelLote,
  SEMILLA_DEL_LOTE,
  tandasDe,
  TAMANO_DE_TANDA,
} from "../../engine/supuestos/lotes.ts";
import {
  CASOS_S3,
  hojaEnBlanco,
  textoDelCaso,
  type CasoDePegado,
} from "../../engine/supuestos/s3.ts";

export const CARPETA_S3 = "docs/kit-de-prueba/supuesto-s3";
export const CARPETA_LOTE = "docs/kit-de-prueba/lote-de-200";

function archivosJson(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? archivosJson(path.join(dir, e.name))
      : e.name.endsWith(".json")
        ? [path.join(dir, e.name)]
        : [],
  );
}

/** Lo que cada prueba del set espera, de su ficha (`resultado_esperado.descripcion`): se lo enseñamos a quien califica. */
export function loQueEsperaCadaPrueba(
  raiz: string,
  pruebas: readonly string[],
): Record<string, { es: string; en: string }> {
  const buscadas = new Set(pruebas);
  const salida: Record<string, { es: string; en: string }> = {};
  for (const f of archivosJson(path.join(raiz, "datos/pruebas"))) {
    const id = path.basename(f, ".json");
    if (!buscadas.has(id)) continue;
    const d = JSON.parse(readFileSync(f, "utf8")) as {
      resultado_esperado: { descripcion: { es: string; en: string } };
    };
    salida[id] = d.resultado_esperado.descripcion;
  }
  return salida;
}

const json = (x: unknown) => `${JSON.stringify(x, null, 2)}\n`;

const comando = (carpeta: string, c: CasoDePegado) =>
  `/extraer ${carpeta}/resultados/${c.id}.txt ${c.activo}`;

const LEEME_S3 = `# Supuesto S3 · el veredicto de la regla frente al de una persona

> Texto sintético del kit de prueba de HackGuard. Lo escribe el generador (\`pnpm supuestos:generar\`): no lo edites a mano, el gate de
> deriva lo detecta.

**Qué mide.** S3 dice: «el veredicto que calcula la regla coincide con el de una persona en al menos el 90 % de los resultados
pegados». Aquí hay 20 resultados pegados de activos demo (\`resultados/R01.txt\` … \`R20.txt\`). Tú los calificas; el código compara.

**Cómo (una sola parada del ensayo del S14).**

1. **Copia \`hoja-de-calificacion.json\` fuera del kit** (por ejemplo a tu carpeta de trabajo): el kit es generado y su gate de deriva falla si lo editas en su sitio.
   En tu copia, para cada caso, lee el texto de su archivo y escribe en \`tu_veredicto\` uno de:
   \`superada\`, \`fallida\`, \`parcial\`, \`no_ejecutada\`. Llena también \`calificador\` y \`fecha\`.
2. **No abras el cálculo de la regla hasta terminar:** el veredicto de la regla no está en ningún archivo del kit; se calcula al comparar.
3. Corre \`pnpm supuestos:s3 <tu-copia.json>\`. Dice la coincidencia, **S3 probado** (≥ 90 %) o
   **S3 refutado**, y cada discrepancia con lo que dijiste tú y lo que dio la regla.

**Los dos casos de borde.** R05 (19 de 20 repeticiones, ninguna falló) y R20 (la métrica justo en el límite que el activo declaró) son
donde una persona y la regla pueden discrepar sin que ninguna se equivoque: la regla pide las 20 repeticiones para decir «superada», y el
límite «no debe superarse» admite el valor igual. Cuentan en el 90 %; el comando los marca cuando son la causa.

**Los 20 \`/extraer\`.** \`extraer-lote-demo.json\` lista, en orden, el comando de cada texto sobre su activo demo. Corren sobre el mismo
set para medir la cuota por corrida. Este sprint **no** los corrió.

**Límites.** Son 20 casos sintéticos: S3 queda probado o refutado para este set, no para evidencia real (que no viaja al repositorio).
`;

const LEEME_LOTE = `# Lote de 200 resultados pegados · 10 tandas de 20

> Texto sintético del kit de prueba de HackGuard. Lo escribe el generador con una semilla fija (\`${SEMILLA_DEL_LOTE}\`): el mismo lote en
> cualquier computadora. No lo edites a mano.

Sirve para medir cuánta cuota gasta cada corrida de \`/extraer\` y proyectar las demás. Se corre en el hito H-3 (Robustez), después de
medir la cuota con los 20 del lote demo (\`../supuesto-s3\`).

- \`tandas.json\`: las 10 tandas con sus ids, su composición por veredicto de la regla y el comando de cada texto.
- \`pnpm lotes:metricas\`: enseña el plan de las 10 tandas. Con \`--registro <archivo>\`, lee lo que anotaste de cada tanda
  (cuota antes y después, minutos, propuestas selladas, corregidas por una persona) y proyecta las que faltan.

Formato del registro: \`{ "formato": "hackguard/registro-de-tandas@1", "tandas": [ { "tanda": 1, "cuota_antes_pct": 12, "cuota_despues_pct": 31, "minutos": 18, "propuestas_selladas": 20, "corregidas_por_persona": 2 } ] }\`.
`;

function archivosSinHuella(raiz: string): Map<string, string> {
  const salida = new Map<string, string>();
  const s3 = CASOS_S3;
  const grande = casosDelLoteDe200();
  const esperado = loQueEsperaCadaPrueba(raiz, [
    ...new Set(s3.map((c) => c.prueba)),
  ]);

  for (const c of s3)
    salida.set(`${CARPETA_S3}/resultados/${c.id}.txt`, textoDelCaso(c));
  salida.set(
    `${CARPETA_S3}/hoja-de-calificacion.json`,
    json(hojaEnBlanco(s3, `${CARPETA_S3}/resultados`, esperado)),
  );
  salida.set(
    `${CARPETA_S3}/extraer-lote-demo.json`,
    json({
      formato: "hackguard/extraer-lote@1",
      nota: {
        es: "Los 20 comandos, en orden, sobre el mismo set de S3. Los corre una persona (la skill /extraer solo la lanza una persona); este sprint no los corrió.",
        en: "The 20 commands, in order, over the same S3 set. A person runs them (the /extraer skill is only launched by a person); this sprint did not run them.",
      },
      comandos: s3.map((c) => ({
        id: c.id,
        activo: c.activo,
        comando: comando(CARPETA_S3, c),
      })),
    }),
  );
  salida.set(`${CARPETA_S3}/LEEME.md`, LEEME_S3);

  for (const c of grande)
    salida.set(`${CARPETA_LOTE}/resultados/${c.id}.txt`, textoDelCaso(c));
  return salida;
}

/** Todos los archivos del kit, con su ruta relativa a la raíz del repo. `tandas.json` lleva la huella del lote, que es asíncrona. */
export async function archivosDelKit(
  raiz: string,
): Promise<Map<string, string>> {
  const salida = archivosSinHuella(raiz);
  const grande = casosDelLoteDe200();
  const tandas = tandasDe(grande);
  salida.set(
    `${CARPETA_LOTE}/tandas.json`,
    json({
      formato: "hackguard/tandas@1",
      semilla: SEMILLA_DEL_LOTE,
      huella_del_lote: await huellaDelLote(grande),
      tamano_de_tanda: TAMANO_DE_TANDA,
      tandas: tandas.map((t) => ({
        numero: t.numero,
        desde: t.desde,
        hasta: t.hasta,
        por_veredicto: t.porVeredicto,
        comandos: t.ids.map((id) =>
          comando(
            CARPETA_LOTE,
            grande.find((c) => c.id === id)!,
          ),
        ),
      })),
    }),
  );
  salida.set(`${CARPETA_LOTE}/LEEME.md`, LEEME_LOTE);
  return salida;
}
