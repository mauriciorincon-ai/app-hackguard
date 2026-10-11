import { T } from "@/components/texto";

// La raíz no tiene pantalla propia: vercel.json y serve.json la redirigen al catálogo (servidor-config.test.ts exige que
// digan lo mismo). Un export estático no tiene servidor que redirija y el `redirect()` de Next necesita JavaScript, así
// que esta página es el respaldo: un enlace para quien llegue a ella sin la redirección.
export default function Raiz() {
  return (
    <main id="contenido" className="hg-principal hg-pila">
      <h1>HackGuard</h1>
      <p>
        <a href="/catalogo">
          <T
            t={{
              es: "Ir al catálogo de pruebas",
              en: "Go to the test catalog",
            }}
          />
        </a>
      </p>
    </main>
  );
}
