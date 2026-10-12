import Link from "next/link";
import type { ItemDeSelectorDeHallazgo } from "@/lib/evidencia/tipos";
import { Dato, T } from "../texto";

// Piezas comunes de la pantalla del hallazgo: el selector de arriba (un hallazgo por página) y las dos páginas de
// «Evidencia». Componentes de SERVIDOR: todo sale ya calculado, con los dos idiomas.

export const rutaDeHallazgo = (id: string) => `/evidencia/hallazgos/${id}`;

/** El selector de hallazgos: lleva a la página de cada uno, en el orden de datos (lo que pide acción, primero). */
export function SelectorDeHallazgos({
  items,
}: {
  items: ItemDeSelectorDeHallazgo[];
}) {
  return (
    <nav aria-labelledby="rotulo-selector-de-hallazgos">
      <p id="rotulo-selector-de-hallazgos" className="hg-oculto">
        <T t={{ es: "Hallazgos", en: "Findings" }} />
      </p>
      <ul className="hg-selector">
        {items.map((h) => (
          <li key={h.id}>
            <Link
              className="hg-opcion"
              href={rutaDeHallazgo(h.id)}
              aria-current={h.actual ? "true" : undefined}
            >
              <span className="hg-opcion-titulo" data-neutro>
                {h.id}
              </span>
              <span>
                <T t={h.estado.nombre} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** «Carga» / «Hallazgos»: las dos páginas de Evidencia; la carga todavía no tiene pantalla y se dice, sin enlace roto. */
export function SubnavDeEvidencia({ primero }: { primero: string }) {
  return (
    <nav className="hg-subnav" aria-labelledby="rotulo-subnav-evidencia">
      <p id="rotulo-subnav-evidencia" className="hg-oculto">
        <T t={{ es: "Evidencia", en: "Evidence" }} />
      </p>
      <ul>
        <li>
          <span aria-disabled="true">
            <T t={{ es: "Carga", en: "Intake" }} />{" "}
            <span className="hg-cuenta">
              <T t={{ es: "pronto", en: "soon" }} />
            </span>
          </span>
        </li>
        <li>
          <Link href={rutaDeHallazgo(primero)} aria-current="page">
            <T t={{ es: "Hallazgos", en: "Findings" }} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/** El identificador de un sobre (dato), con una nota opcional a su lado. */
export function IdDeSobre({
  id,
  nota,
}: {
  id: string;
  nota?: { es: string; en: string };
}) {
  return (
    <p>
      <Dato>{id}</Dato>
      {nota === undefined ? null : (
        <>
          {" "}
          <span className="hg-menor">
            · <T t={nota} />
          </span>
        </>
      )}
    </p>
  );
}
