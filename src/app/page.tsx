import { T } from "@/components/texto";
import Link from "@/components/enlace";
import { modoPublico } from "@/lib/publico/lista-blanca";

// La raíz no tiene pantalla propia: vercel.json y serve.json la redirigen al tablero, la portada de la aplicación
// (servidor-config.test.ts exige que digan lo mismo). Un export estático no tiene servidor que redirija y el `redirect()` de
// Next necesita JavaScript, así que esta página es el respaldo: un enlace para quien llegue a ella sin la redirección.
export default function Raiz() {
  // En el modo público no hay tablero (no está en la lista blanca): la entrada es el catálogo.
  const publico = modoPublico();
  return (
    <main id="contenido" className="hg-principal hg-pila">
      <h1>HackGuard</h1>
      <p>
        <Link href={publico ? "/catalogo" : "/tablero"}>
          <T
            t={
              publico
                ? { es: "Ir al catálogo", en: "Go to the catalog" }
                : { es: "Ir al tablero", en: "Go to the dashboard" }
            }
          />
        </Link>
      </p>
    </main>
  );
}
