import { Aviso, Sello } from "../estado";
import { Dato, T } from "../texto";

// Los estados de pantalla del catálogo que no son «con datos» (design-system § 6): vacío y error. «Sin resultados» vive en
// la pantalla porque depende de los filtros del navegador. Los textos son los de la maqueta aprobada.

export function CatalogoVacio() {
  return (
    <Aviso
      etiqueta={{ rol: "neutro", simbolo: "vacio" }}
      titulo={{ es: "El catálogo está vacío", en: "The catalog is empty" }}
    >
      <p>
        <T
          t={{
            es: "Todavía no se ha cargado ninguna prueba. Carga las semillas del repositorio o aprueba una propuesta del investigador para empezar.",
            en: "No test has been loaded yet. Load the repository seeds or approve a proposal from the researcher to get started.",
          }}
        />
      </p>
    </Aviso>
  );
}

/** El catálogo no pasó su validación al cargar: nada entra a medias. Cada problema nombra la prueba y la razón. */
export function CatalogoConError({
  rechazadas,
}: {
  rechazadas: { id: string; razon: { es: string; en: string } }[];
}) {
  return (
    <Aviso
      etiqueta={{ rol: "falla", simbolo: "falla" }}
      titulo={{ es: "El catálogo no se cargó", en: "The catalog did not load" }}
    >
      <Sello
        etiqueta={{
          rol: "falla",
          simbolo: "falla",
          nombre: {
            es: `${rechazadas.length} ${rechazadas.length === 1 ? "prueba rechazada" : "pruebas rechazadas"} al cargar`,
            en: `${rechazadas.length} ${rechazadas.length === 1 ? "test" : "tests"} rejected on load`,
          },
        }}
      >
        <ul className="hg-lista">
          {rechazadas.map((r) => (
            <li key={r.id}>
              <Dato>{r.id}</Dato> <T t={r.razon} />
            </li>
          ))}
        </ul>
        <p>
          <T
            t={{
              es: "Nada entra a medias: corrige esas pruebas y vuelve a cargar. El resto del catálogo no se muestra hasta entonces.",
              en: "Nothing gets in half-done: fix those tests and load again. The rest of the catalog is not shown until then.",
            }}
          />
        </p>
      </Sello>
    </Aviso>
  );
}
