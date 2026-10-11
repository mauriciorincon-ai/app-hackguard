import { Consola } from "@/components/consola/consola";
import { T } from "@/components/texto";

// Esqueleto de la F1: el armazón de la consola con su ruta. La F2 lo sustituye por la lista, sus filtros y el panel de vigencia.
export default function Catalogo() {
  return (
    <Consola
      seccion="catalogo"
      migas={[
        { es: "Catálogo", en: "Catalog" },
        { es: "Pruebas", en: "Tests" },
      ]}
    >
      <h1>
        <T t={{ es: "Catálogo de pruebas", en: "Test catalog" }} />
      </h1>
    </Consola>
  );
}
