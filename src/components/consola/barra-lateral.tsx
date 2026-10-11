import { T, Dato, type Bilingue } from "../texto";

const TRAZO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// Iconos de navegación: trazos SVG, nunca caracteres de una fuente (geometría de scripts/maqueta/nucleo/pagina.mjs).
const ICONOS: Record<string, React.ReactNode> = {
  tablero: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.5" {...TRAZO} />
      <rect x="11" y="3" width="6" height="6" rx="1.5" {...TRAZO} />
      <rect x="3" y="11" width="6" height="6" rx="1.5" {...TRAZO} />
      <rect x="11" y="11" width="6" height="6" rx="1.5" {...TRAZO} />
    </>
  ),
  catalogo: (
    <>
      <path d="M7.5 5h9M7.5 10h9M7.5 15h9" {...TRAZO} />
      <path d="M3.5 5h.5M3.5 10h.5M3.5 15h.5" {...TRAZO} />
    </>
  ),
  activos: (
    <>
      <path d="M10 2.5l6.5 3.5v8L10 17.5 3.5 14V6z" {...TRAZO} />
      <path d="M3.5 6L10 9.5 16.5 6M10 9.5v8" {...TRAZO} />
    </>
  ),
  evidencia: (
    <>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" {...TRAZO} />
      <path d="M3 6.5l7 5 7-5" {...TRAZO} />
    </>
  ),
  brecha: <path d="M4 16.5V10M10 16.5v-13M16 16.5v-4.5" {...TRAZO} />,
};

function Icono({ nombre }: { nombre: string }) {
  return (
    <svg
      className="hg-icono"
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      {ICONOS[nombre]}
    </svg>
  );
}

export function Marca() {
  return (
    <a className="hg-marca" href="/catalogo">
      <svg
        className="hg-marca-signo"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 2.6l8 3v6.1c0 4.6-3.2 8.4-8 9.7-4.8-1.3-8-5.1-8-9.7V5.6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M8.3 12.1l2.6 2.6 4.8-5.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span data-neutro>HackGuard</span>
    </a>
  );
}

interface Seccion {
  id: string;
  nombre: Bilingue;
  /** Ruta de la sección, o `null` si todavía no tiene pantalla (no se dibuja un enlace roto). */
  ruta: string | null;
}

// Las cinco secciones de la maqueta (decisión 9 de diseño). Solo Catálogo tiene pantalla en este sprint.
const SECCIONES: Seccion[] = [
  { id: "tablero", nombre: { es: "Tablero", en: "Dashboard" }, ruta: null },
  {
    id: "catalogo",
    nombre: { es: "Catálogo", en: "Catalog" },
    ruta: "/catalogo",
  },
  { id: "activos", nombre: { es: "Activos", en: "Assets" }, ruta: null },
  { id: "evidencia", nombre: { es: "Evidencia", en: "Evidence" }, ruta: null },
  { id: "brecha", nombre: { es: "Brecha", en: "Gap" }, ruta: null },
];

export interface PieDelLateral {
  /** Nombre de la instantánea oficial que la pantalla lee. */
  instantanea: string;
  /** Fecha de consulta (AAAA-MM-DD). */
  consulta: string;
}

export function BarraLateral({
  abierta,
  cuenta,
  pie,
}: {
  abierta: string;
  /** Cuántas pruebas hay en el catálogo (junto al nombre de la sección). */
  cuenta?: number;
  pie?: PieDelLateral;
}) {
  return (
    <aside className="hg-lateral" aria-labelledby="rotulo-navegacion">
      <span id="rotulo-navegacion" className="hg-oculto">
        <T t={{ es: "Navegación", en: "Navigation" }} />
      </span>
      <Marca />
      <nav className="hg-nav" aria-labelledby="rotulo-secciones">
        <span id="rotulo-secciones" className="hg-oculto">
          <T t={{ es: "Secciones", en: "Sections" }} />
        </span>
        <ul>
          {SECCIONES.map((s) => {
            const dentro = (
              <>
                <Icono nombre={s.id} />
                <span>
                  <T t={s.nombre} />
                </span>
                {s.id === "catalogo" && cuenta ? (
                  <span className="hg-cuenta" data-neutro>
                    {cuenta}
                  </span>
                ) : null}
              </>
            );
            if (!s.ruta) {
              return (
                <li key={s.id}>
                  <span className="hg-nav-proximamente">
                    {dentro}
                    <span className="hg-menor">
                      <T t={{ es: "próximamente", en: "coming soon" }} />
                    </span>
                  </span>
                </li>
              );
            }
            const esAbierta = s.id === abierta;
            return (
              <li key={s.id}>
                <a href={s.ruta} aria-current={esAbierta ? "page" : undefined}>
                  {dentro}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      {pie ? (
        <div className="hg-lateral-pie">
          <p className="hg-rotulo">
            <T t={{ es: "Instantánea del catálogo", en: "Catalog snapshot" }} />
          </p>
          <p>
            <Dato>{pie.instantanea}</Dato>
          </p>
          <p className="hg-rotulo">
            <T t={{ es: "Fecha de consulta", en: "Query date" }} />
          </p>
          <p>
            <Dato>{pie.consulta}</Dato>
          </p>
        </div>
      ) : null}
    </aside>
  );
}
