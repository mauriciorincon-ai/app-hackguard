// Regla 20: todo texto visible nace como mapa { es, en } y se emite en los DOS idiomas; la hoja del sistema
// (docs/diseno/assets/app.css) oculta el inactivo con html[data-lang]. La forma del árbol no depende del idioma.
export interface Bilingue {
  es: string;
  en: string;
}

export function T({ t }: { t: Bilingue }) {
  return (
    <>
      <span lang="es">{t.es}</span>
      <span lang="en">{t.en}</span>
    </>
  );
}

/** Identificador, fecha, huella o nombre propio: no cambia con el idioma. */
export function Dato({ children }: { children: React.ReactNode }) {
  return (
    <span className="hg-dato" data-neutro>
      {children}
    </span>
  );
}
