import Link from "next/link";
import { frasePorDias } from "@/lib/catalogo/etiquetas";
import { RUTAS, rutaDeControl } from "@/lib/brecha/etiquetas";
import { plural } from "@/lib/brecha/textos";
import type {
  Bilingue,
  Cifra,
  EstadoDeMarcos,
  EnlaceAHallazgo,
  Etiqueta,
  EvidenciaVista,
  FilaDeAlerta,
  FilaDeEsperadoObtenido,
  MarcasDeVeredicto,
  Totales,
} from "@/lib/brecha/tipos";
import { Chip, Estado, Fechado } from "../estado";
import { Plazo, Revision } from "../hallazgo/hallazgo-pantalla";
import { rutaDeHallazgo } from "../hallazgo/piezas";
import { Dato, T } from "../texto";

// Piezas que comparten el tablero, la brecha, la vista por control y el informe: una sola forma de decir cada cosa en las
// cuatro pantallas. Componentes de SERVIDOR sin estado: todo sale ya calculado, con los dos idiomas, y el color de cada estado
// llega con su etiqueta (regla dura 12).

export const rotulo = (r: Bilingue): string => `${r.es} · ${r.en}`;

export const rutaDeActivo = (id: string) => `/activos/${id}`;
export const rutaDePlan = (id: string) => `/activos/${id}/plan`;
export const rutaDePrueba = (id: string) => `/catalogo/${id}`;

/** Las cifras de arriba: el valor y lo que dice; si son un estado, con su forma. */
export function Cifras({
  cifras,
  nombre,
}: {
  cifras: Cifra[];
  nombre: Bilingue;
}) {
  return (
    <ul className="hg-resumen" aria-label={rotulo(nombre)}>
      {cifras.map((c) => (
        <li key={c.clave} data-cifra={c.clave}>
          <span className="hg-cifra" data-neutro>
            {c.valor}
          </span>
          {c.marca === null ? (
            <span>
              <T t={c.texto} />
            </span>
          ) : (
            <Estado etiqueta={{ ...c.marca, nombre: c.texto }} />
          )}
        </li>
      ))}
    </ul>
  );
}

/** La barra de avance: ejecutadas sobre planeadas (en tinta, porque avance no es veredicto). */
export function Avance({ parte, total }: { parte: number; total: number }) {
  const ancho = Math.max(parte > 0 ? 3 : 0, Math.round((parte / total) * 100));
  return (
    <svg
      className="hg-proporcion hg-proporcion-avance"
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="hg-proporcion-fondo" width="100" height="6" rx="1" />
      <rect className="hg-proporcion-parte" width={ancho} height="6" rx="1" />
    </svg>
  );
}

/** Ejecutadas sobre planeadas: la barra y la proporción en cifras. */
export function Ejecutadas({ totales: t }: { totales: Totales }) {
  return (
    <>
      <Avance parte={t.ejecutadas} total={Math.max(t.planeadas, 1)} />
      <p className="hg-menor">
        <T
          t={{
            es: `${t.ejecutadas} de ${t.planeadas} ${plural(t.planeadas, "ejecutada", "ejecutadas")}`,
            en: `${t.ejecutadas} of ${t.planeadas} run`,
          }}
        />
      </p>
    </>
  );
}

/** Desglose de lo planeado: cada veredicto con su forma y su cifra; los ceros no se dibujan. */
export function Desglose({
  totales: t,
  marcas,
}: {
  totales: Totales;
  marcas: MarcasDeVeredicto;
}) {
  const partes: [string, Etiqueta, Bilingue][] = [
    [
      "superadas",
      marcas.superada,
      {
        es: `${t.superadas} ${plural(t.superadas, "superada", "superadas")}`,
        en: `${t.superadas} passed`,
      },
    ],
    [
      "fallidas",
      marcas.fallida,
      {
        es: `${t.fallidas} ${plural(t.fallidas, "fallida", "fallidas")}`,
        en: `${t.fallidas} failed`,
      },
    ],
    [
      "no_ejecutadas",
      marcas.no_ejecutada,
      {
        es: `${t.no_ejecutadas} sin ejecutar`,
        en: `${t.no_ejecutadas} not run`,
      },
    ],
  ];
  const visibles = partes.filter(([clave]) => t[clave as keyof Totales] > 0);
  if (visibles.length === 0)
    return (
      <p className="hg-menor">
        <T t={{ es: "Nada planeado", en: "Nothing planned" }} />
      </p>
    );
  return (
    <ul className="hg-desglose">
      {visibles.map(([clave, marca, nombre]) => (
        <li key={clave}>
          <Estado etiqueta={{ ...marca, nombre }} />
        </li>
      ))}
    </ul>
  );
}

/** El veredicto de una fila: lo que no es noticia (superada) va en línea; lo que pide atención, en chip. */
export function Veredicto({
  id,
  etiqueta,
}: {
  id: string;
  etiqueta: Etiqueta;
}) {
  return id === "superada" || id === "no_aplicable" ? (
    <Estado etiqueta={etiqueta} />
  ) : (
    <Chip etiqueta={etiqueta} />
  );
}

/**
 * El estado de un control, con el protocolo de la matriz de envejecimiento: data-control y data-control-estado. Un control dice
 * el mismo estado en cada pantalla y en cada fecha; `porFilas` marca el sello cuyo estado se deduce de las filas de la página.
 */
export function EstadoDeControlMarca({
  id,
  estadoId,
  etiqueta,
}: {
  id: string;
  estadoId: string;
  etiqueta: Etiqueta;
}) {
  return (
    <span data-control={id} data-control-estado={estadoId}>
      {estadoId === "con_evidencia_vigente" ? (
        <Estado etiqueta={etiqueta} />
      ) : (
        <Chip etiqueta={etiqueta} />
      )}
    </span>
  );
}

/** Fecha de una evidencia, con el protocolo (antigua desde el umbral). `marca: false` deja solo la fecha. */
export function EvidenciaFechada({
  e,
  marca = true,
}: {
  e: EvidenciaVista;
  marca?: boolean;
}) {
  return (
    <span
      data-fechado="evidencia"
      data-desde={e.fecha}
      data-dias={e.dias}
      data-estado-fechado={e.estado}
    >
      {marca && e.marca !== null ? (
        <>
          <Chip etiqueta={e.marca} />{" "}
        </>
      ) : null}
      <Dato>{e.fecha}</Dato>{" "}
      <span className="hg-menor">
        <span data-frase-dias>
          <T t={frasePorDias(e.dias)} />
        </span>
      </span>
    </span>
  );
}

/** Un hallazgo como referencia: su identificador enlazado y su severidad. */
export function HallazgoBreve({ h }: { h: EnlaceAHallazgo }) {
  return (
    <>
      <Link href={rutaDeHallazgo(h.id)}>
        <Dato>{h.id}</Dato>
      </Link>{" "}
      <Chip etiqueta={h.severidad} />
    </>
  );
}

/** Un control como enlace a su página. */
export function EnlaceAControl({ id }: { id: string }) {
  return (
    <Link href={rutaDeControl(id)}>
      <Dato>{id}</Dato>
    </Link>
  );
}

/** Una fila de alerta: el objeto, qué pasa y de qué tipo es (el tipo va en la esquina de la tarjeta). */
function FilaDeAlertaVista({ f }: { f: FilaDeAlerta }) {
  let que: React.ReactNode = null;
  switch (f.clase) {
    case "plazo":
      que = (
        <>
          <p>
            <Link href={rutaDeHallazgo(f.hallazgo.id)}>
              <T t={f.hallazgo.titulo} />
            </Link>
          </p>
          <p>
            <Chip etiqueta={f.hallazgo.severidad} />
          </p>
          <Plazo p={f.plazo} />
        </>
      );
      break;
    case "lote":
      que = (
        <>
          <p>
            <Link href={RUTAS.carga}>
              <T
                t={{
                  es: `${f.sobres} sobres de ${f.herramienta} esperan tu confirmación`,
                  en: `${f.sobres} ${f.herramienta} envelopes await your confirmation`,
                }}
              />
            </Link>
          </p>
          <p className="hg-menor">
            <T
              t={{
                es: `${f.fallidas} ${plural(f.fallidas, "sugiere", "sugieren")} «fallida». Nada cuenta hasta que confirmes.`,
                en: `${f.fallidas} ${plural(f.fallidas, "suggests", "suggest")} “failed”. Nothing counts until you confirm.`,
              }}
            />
          </p>
        </>
      );
      break;
    case "revision":
      que = (
        <>
          <p>
            <Link href={rutaDeHallazgo(f.hallazgo.id)}>
              <T t={f.hallazgo.titulo} />
            </Link>
          </p>
          <Revision r={f.revision} />
        </>
      );
      break;
    case "catalogo":
      que = (
        <>
          <p>
            <Link href={rutaDePrueba(f.prueba.id)}>
              <T t={f.prueba.nombre} />
            </Link>
          </p>
          <p className="hg-menor">
            <T
              t={{
                es: `En el plan de: ${f.activo.es}`,
                en: `In the plan of: ${f.activo.en}`,
              }}
            />
          </p>
          <Fechado
            vigencia={{
              estado: "vencido",
              dias: f.ficha.dias,
              desde: f.ficha.desde,
              etiqueta: f.ficha.etiqueta,
            }}
            rotulo={{ es: "Ficha verificada", en: "Record verified" }}
          />
        </>
      );
      break;
    case "antigua":
      que = (
        <>
          <p>
            <Link href={rutaDePrueba(f.prueba.id)}>
              <T t={f.prueba.nombre} />
            </Link>
          </p>
          <p className="hg-menor">
            <T
              t={{
                es: `Último resultado confirmado de ${f.activo.es}:`,
                en: `Latest confirmed result from ${f.activo.en}:`,
              }}
            />
          </p>
          <EvidenciaFechada e={f.evidencia} marca={false} />
        </>
      );
      break;
  }
  return (
    <tr data-alerta={f.clase}>
      <td data-celda="id">
        <Dato>{f.id}</Dato>
      </td>
      <td data-celda="principal">{que}</td>
      <td data-celda="estado">
        <Chip etiqueta={f.tipo} />
      </td>
    </tr>
  );
}

/** Tabla de alertas: objeto, qué pasa y de qué tipo es. */
export function TablaDeAlertas({
  filas,
  titulo,
}: {
  filas: FilaDeAlerta[];
  titulo: Bilingue;
}) {
  return (
    <table className="hg-tabla">
      <caption className="hg-oculto">
        <T t={titulo} />
      </caption>
      <thead>
        <tr>
          <th scope="col">
            <T t={{ es: "Objeto", en: "Object" }} />
          </th>
          <th scope="col">
            <T t={{ es: "Qué pasa", en: "What is happening" }} />
          </th>
          <th scope="col">
            <T t={{ es: "Tipo", en: "Type" }} />
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <FilaDeAlertaVista key={`${f.clase}-${f.id}`} f={f} />
        ))}
      </tbody>
    </table>
  );
}

/** El selector de controles de la página de un control: una página por control aplicable. */
export function SelectorDeControles({
  items,
}: {
  items: { id: string; estado: Etiqueta; actual: boolean }[];
}) {
  return (
    <nav
      aria-label={rotulo({
        es: "Controles aplicables",
        en: "Applicable controls",
      })}
    >
      <ul className="hg-selector">
        {items.map((x) => (
          <li key={x.id}>
            <Link
              className="hg-opcion"
              href={rutaDeControl(x.id)}
              aria-current={x.actual ? "true" : undefined}
            >
              <span className="hg-opcion-titulo" data-neutro>
                {x.id}
              </span>
              <span>
                <T t={x.estado.nombre} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Una fila de «esperado contra obtenido»: la brecha la filtra; el informe la lleva tal cual. */
export function FilaDeBrecha({
  f,
  oculta = false,
  filtrable = true,
}: {
  f: FilaDeEsperadoObtenido;
  oculta?: boolean;
  filtrable?: boolean;
}) {
  const o = f.obtenido;
  return (
    <tr
      data-fila-brecha=""
      data-filtrable={filtrable ? "" : undefined}
      data-prueba={f.prueba.id}
      data-activo={f.activo.id}
      data-familia={f.familia.id}
      data-veredicto={f.veredictoId}
      data-propuesto={o.propuesto?.lote ?? (o.propuesto ? "-" : undefined)}
      hidden={oculta}
    >
      <td data-celda="id">
        <Dato>{f.prueba.id}</Dato>
      </td>
      <td data-celda="principal">
        <p>
          <Link className="hg-enlace-fila" href={rutaDePrueba(f.prueba.id)}>
            <T t={f.prueba.nombre} />
          </Link>
        </p>
        <p className="hg-menor">
          <T t={f.activo.nombre} /> · <T t={f.familia.nombre} />
        </p>
        <p className="hg-menor">
          <strong>
            <T t={{ es: "Se espera:", en: "Expected:" }} />
          </strong>{" "}
          <T t={f.esperado} />
        </p>
      </td>
      <td>
        {o.sobre === null || o.evidencia === null || o.conteo === null ? (
          <p className="hg-menor">
            <T
              t={{
                es: "Sin sobre confirmado.",
                en: "No confirmed envelope.",
              }}
            />
          </p>
        ) : (
          <>
            <p>
              <Dato>{o.sobre}</Dato>
            </p>
            <p>
              <EvidenciaFechada e={o.evidencia} />
            </p>
            <p className="hg-menor">
              <T t={o.conteo} />
            </p>
          </>
        )}
        {o.propuesto === null ? null : (
          <p className="hg-menor">
            <T
              t={{
                es: `Espera confirmación${o.propuesto.lote === null ? "" : " en"} `,
                en: `Awaiting confirmation${o.propuesto.lote === null ? "" : " in"} `,
              }}
            />
            {o.propuesto.lote === null ? null : (
              <Link href={RUTAS.carga}>
                <Dato>{o.propuesto.lote}</Dato>
              </Link>
            )}{" "}
            <T
              t={{
                es: `(sugiere «${o.propuesto.sugiere.es}»): no cuenta todavía.`,
                en: `(it suggests “${o.propuesto.sugiere.en}”): it does not count yet.`,
              }}
            />
          </p>
        )}
      </td>
      <td>
        <p>
          <T t={f.desviacion} />
        </p>
        {f.hallazgo === null ? null : (
          <p>
            <HallazgoBreve h={f.hallazgo} />
          </p>
        )}
      </td>
      <td data-celda="estado">
        <Veredicto id={f.veredictoId} etiqueta={f.veredicto} />
      </td>
    </tr>
  );
}

/**
 * «Marcos con versión nueva» (RF-05.5), con lo que dicen las propuestas del investigador: los avisos, si los hay; «ninguno» solo si el
 * investigador corrió (y cuándo); y, sin ninguna corrida, que no hay registro de lo que publica cada fuente. Nada cambia por su cuenta.
 */
export function MarcosConVersionNueva({
  marcos,
  clase,
}: {
  marcos: EstadoDeMarcos;
  clase: string;
}) {
  if (marcos.tipo === "avisos")
    return (
      <div className={clase} data-marcos="avisos">
        <p>
          <Chip etiqueta={marcos.etiqueta} />{" "}
          <span>
            <T
              t={{
                es: `Marcos con versión nueva: ${marcos.avisos.length}. La fuente oficial publica una versión distinta de la que tiene el catálogo; nada cambia hasta que una persona lo decida.`,
                en: `Frameworks with a new version: ${marcos.avisos.length}. The official source publishes a version different from the catalog's; nothing changes until a person decides.`,
              }}
            />
          </span>
        </p>
        <ul className="hg-lista">
          {marcos.avisos.map((a) => (
            <li key={a.propuesta} data-aviso-de-version={a.marco}>
              <span data-neutro>{a.nombre}</span>:{" "}
              <span lang="es">
                el catálogo tiene la <Dato>{a.vigente}</Dato>, la fuente publica
                la <Dato>{a.publicada}</Dato> ({a.fecha}) · {a.verificadas} de{" "}
                {a.fuentes} fuentes verificadas por código ·{" "}
              </span>
              <span lang="en">
                the catalog has <Dato>{a.vigente}</Dato>, the source publishes{" "}
                <Dato>{a.publicada}</Dato> ({a.fecha}) · {a.verificadas} of{" "}
                {a.fuentes} sources verified by code ·{" "}
              </span>
              <Link href={a.ruta}>
                <Dato>{a.propuesta}</Dato>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  if (marcos.tipo === "ninguno")
    return (
      <p className={clase} data-marcos="ninguno">
        <Estado etiqueta={marcos.etiqueta} />{" "}
        <span lang="es">
          Marcos con versión nueva: ninguno, según la corrida del investigador{" "}
          <Dato>{marcos.corrida}</Dato> del <Dato>{marcos.fecha}</Dato>, que
          leyó <Dato>{marcos.leidas}</Dato> páginas
          {marcos.noLeidas > 0 ? (
            <>
              {" "}
              y no pudo leer <Dato>{marcos.noLeidas}</Dato> (esas no cuentan)
            </>
          ) : null}
          . No es una vigilancia continua: dice lo que esa corrida leyó ese día.
        </span>
        <span lang="en">
          Frameworks with a new version: none, according to the
          researcher&apos;s run <Dato>{marcos.corrida}</Dato> of{" "}
          <Dato>{marcos.fecha}</Dato>, which read <Dato>{marcos.leidas}</Dato>{" "}
          pages
          {marcos.noLeidas > 0 ? (
            <>
              {" "}
              and could not read <Dato>{marcos.noLeidas}</Dato> (those do not
              count)
            </>
          ) : null}
          . It is not continuous monitoring: it says what that run read that
          day.
        </span>
      </p>
    );
  return (
    <p className={clase} data-marcos="sin-registro">
      <Estado etiqueta={marcos.etiqueta} />{" "}
      <T
        t={{
          es: "Marcos con versión nueva: ninguna corrida del investigador dice qué versión publica cada fuente, así que no se puede decir si alguno cambió. Se le pide con /investigar.",
          en: "Frameworks with a new version: no researcher run says which version each source publishes, so there is no telling whether any changed. It is requested with /investigar.",
        }}
      />
    </p>
  );
}
