import { T, type Bilingue } from "../texto";
import { BarraLateral, Marca, type PieDelLateral } from "./barra-lateral";
import { Conmutadores } from "./conmutadores";

/**
 * El armazón de toda pantalla del producto, dirección «consola» (design-system.md): barra lateral con las cinco
 * secciones, barra de contexto con la ruta y los ajustes, y el contenido. En teléfono la navegación baja a una barra
 * fija (lo hace la hoja del sistema). `migas` es la ruta; la última pieza es la página actual.
 */
export function Consola({
  seccion,
  pagina,
  migas,
  cuenta,
  pie,
  subnav,
  children,
}: {
  seccion: string;
  /** La ruta de la página abierta dentro de la sección. */
  pagina?: string;
  migas: Bilingue[];
  cuenta?: number;
  pie?: PieDelLateral;
  /** Las páginas del objeto abierto (Activo · Plan), antes del contenido y fuera de `main`, como en la maqueta. */
  subnav?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="hg-salto" href="#contenido">
        <T t={{ es: "Saltar al contenido", en: "Skip to content" }} />
      </a>
      <div className="hg-app">
        <BarraLateral
          abierta={seccion}
          paginaAbierta={pagina}
          cuenta={cuenta}
          pie={pie}
        />
        <div className="hg-cuerpo">
          <header className="hg-barra">
            <Marca />
            <p className="hg-migas">
              {migas.flatMap((m, i) => [
                i > 0 ? (
                  <span key={`s${i}`} aria-hidden="true">
                    /
                  </span>
                ) : null,
                i === migas.length - 1 ? (
                  <strong key={`m${i}`}>
                    <T t={m} />
                  </strong>
                ) : (
                  <span key={`m${i}`}>
                    <T t={m} />
                  </span>
                ),
              ])}
            </p>
            <Conmutadores />
          </header>
          {subnav}
          <main id="contenido" className="hg-principal hg-pila">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
