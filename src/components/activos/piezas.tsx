import Link from "next/link";
import type { ItemDeSelector } from "@/lib/activos/tipos";
import { Chip, Sello } from "../estado";
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
  historial = false,
  replanear = false,
}: {
  id: string;
  abierta: "activo" | "plan" | "historial" | "replanear";
  /** El activo tiene historial de versiones: se agrega su entrada. */
  historial?: boolean;
  /** Su plan está desactualizado y tiene historial: se agrega «Re-planear». */
  replanear?: boolean;
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
        {historial ? (
          <li>
            <Link
              href={`/activos/${id}/historial`}
              aria-current={abierta === "historial" ? "page" : undefined}
            >
              <T t={{ es: "Historial", en: "History" }} />
            </Link>
          </li>
        ) : null}
        {replanear ? (
          <li>
            <Link
              href={`/activos/${id}/re-planear`}
              aria-current={abierta === "replanear" ? "page" : undefined}
            >
              <T t={{ es: "Re-planear", en: "Re-plan" }} />
            </Link>
          </li>
        ) : null}
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
      {v.planDesactualizado === null ? null : (
        <Chip etiqueta={v.planDesactualizado.etiqueta} />
      )}
    </p>
  );
}

/** Lo que dice el aviso de un plan desactualizado: la versión con la que se emitió, la de hoy y la causa. Una sola redacción para el activo y el plan. */
export function AvisoDePlanDesactualizado({ v }: { v: CabeceraDeActivo }) {
  const d = v.planDesactualizado;
  if (d === null) return null;
  const porPerfil = d.por.includes("perfil");
  const porCatalogo = d.por.includes("catalogo");
  return (
    <Sello
      etiqueta={d.etiqueta}
      atributos={{ "data-plan-desactualizado": true }}
    >
      <p>
        {porPerfil ? (
          <T
            t={{
              es: `El perfil del activo cambió desde que se emitió el plan${d.versionDelPlan !== null && d.versionVigente !== null ? `: se emitió con la versión ${d.versionDelPlan} y hoy es la ${d.versionVigente}` : ""}.`,
              en: `The asset's profile changed since the plan was issued${d.versionDelPlan !== null && d.versionVigente !== null ? `: it was issued with version ${d.versionDelPlan} and today it is version ${d.versionVigente}` : ""}.`,
            }}
          />
        ) : null}
        {porPerfil && porCatalogo ? " " : null}
        {porCatalogo ? (
          <T
            t={{
              es: "El catálogo oficial ya no es el que usó el plan.",
              en: "The official catalog is no longer the one the plan used.",
            }}
          />
        ) : null}{" "}
        <T
          t={{
            es: "El plan de abajo sigue siendo el que se emitió, con su huella: no se corrige solo. Lo que dice ya no refleja lo de hoy; hay que re-emitirlo.",
            en: "The plan below is still the one that was issued, with its fingerprint: it does not fix itself. What it says no longer reflects today; it has to be issued again.",
          }}
        />
      </p>
      {v.tieneHistorial ? (
        <p>
          <Link href={`/activos/${v.id}/historial`}>
            <T
              t={{
                es: "Ver qué cambió en el activo",
                en: "See what changed in the asset",
              }}
            />
          </Link>
          {" · "}
          <Link href={`/activos/${v.id}/re-planear`}>
            <T
              t={{
                es: "Ver qué cambiaría al re-planear",
                en: "See what re-planning would change",
              }}
            />
          </Link>
        </p>
      ) : null}
    </Sello>
  );
}
