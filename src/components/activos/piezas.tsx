import Link from "next/link";
import type { ItemDeSelector } from "@/lib/activos/tipos";
import { Chip } from "../estado";
import { Dato, T, type Bilingue } from "../texto";
import type { CabeceraDeActivo } from "@/lib/activos/tipos";

// Piezas comunes de las dos pantallas de activo: el selector de arriba (decisión de diseño 11), el par rótulo/valor
// de las listas de propiedades y la cabecera. Componentes de SERVIDOR: todo sale ya calculado, con los dos idiomas.

/** Una fila de una lista de propiedades: rótulo y valor. */
export function Par({
  rotulo,
  children,
}: {
  rotulo: Bilingue;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt>
        <T t={rotulo} />
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Una lista de frases bilingües. */
export function Lista({ frases }: { frases: Bilingue[] }) {
  return (
    <ul className="hg-lista">
      {frases.map((f) => (
        <li key={f.es}>
          <T t={f} />
        </li>
      ))}
    </ul>
  );
}

/** El selector de activos: va arriba, porque «Activo» y «Plan» son del activo abierto. Lleva a la misma pestaña. */
export function SelectorDeActivos({
  items,
  hacia,
}: {
  items: ItemDeSelector[];
  hacia: "activo" | "plan";
}) {
  return (
    <nav aria-labelledby="rotulo-selector">
      <p id="rotulo-selector" className="hg-oculto">
        <T t={{ es: "Activos registrados", en: "Registered assets" }} />
      </p>
      <ul className="hg-selector">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              className="hg-opcion"
              href={
                hacia === "plan" ? `/activos/${a.id}/plan` : `/activos/${a.id}`
              }
              aria-current={a.actual ? "page" : undefined}
            >
              <span className="hg-opcion-nombre">
                <T t={a.nombre} />
              </span>
              <span>
                <T t={a.estado.nombre} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** «Activo» / «Plan»: las dos páginas del activo abierto (va antes del contenido, como en la maqueta). */
export function SubnavDelActivo({
  id,
  abierta,
}: {
  id: string;
  abierta: "activo" | "plan";
}) {
  return (
    <nav className="hg-subnav" aria-labelledby="rotulo-subnav">
      <p id="rotulo-subnav" className="hg-oculto">
        <T t={{ es: "Activos", en: "Assets" }} />
      </p>
      <ul>
        <li>
          <Link
            href={`/activos/${id}`}
            aria-current={abierta === "activo" ? "page" : undefined}
          >
            <T t={{ es: "Activo", en: "Asset" }} />
          </Link>
        </li>
        <li>
          <Link
            href={`/activos/${id}/plan`}
            aria-current={abierta === "plan" ? "page" : undefined}
          >
            <T t={{ es: "Plan", en: "Plan" }} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/** Identificador y estado del activo sobre el título. */
export function LineaDeCabecera({
  v,
  chip,
}: {
  v: CabeceraDeActivo;
  chip: React.ComponentProps<typeof Chip>["etiqueta"];
}) {
  return (
    <p className="hg-cabecera-linea">
      <Dato>{v.id}</Dato>
      <Chip etiqueta={chip} />
    </p>
  );
}
