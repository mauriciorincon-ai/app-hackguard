import { readFileSync } from "node:fs";
import path from "node:path";
import { DesdeFichaPantalla } from "@/components/activos/desde-ficha-pantalla";
import { Consola } from "@/components/consola/consola";
import { cargarParaPagina } from "@/lib/activos/pagina";
import {
  TablaFichaARasgos,
  type TablaFichaARasgos as Tabla,
} from "@/engine/activos/desde-ficha";
import { titulo } from "@/lib/titulo";

export const metadata = titulo(
  "Perfil desde la ficha",
  "Profile from the ficha",
);

const leer = (relativa: string): unknown =>
  JSON.parse(readFileSync(path.join(process.cwd(), relativa), "utf8"));

// D2: la tabla y los rasgos se leen en el build y viajan a la página; la ficha de la persona NO: se lee en su navegador y no sale
// de ahí (regla dura 4: el texto de la ficha es dato inerte). Nada se guarda aquí; guardar es el CLI, o una descarga.
export default async function DesdeFicha() {
  const { nombre, consulta } = await cargarParaPagina();
  const tabla: Tabla = TablaFichaARasgos.parse(
    leer("datos/planificador/ficha-a-rasgos.json"),
  );
  const rasgos = (
    leer("datos/rasgos-de-perfil.json") as {
      rasgos: {
        id: string;
        tipo: "booleano" | "opcion";
        nombre: { es: string; en: string };
      }[];
    }
  ).rasgos.map(({ id, tipo, nombre }) => ({ id, tipo, nombre }));
  return (
    <Consola
      seccion="activos"
      pagina="/activos/desde-ficha"
      migas={[
        { es: "Activos", en: "Assets" },
        { es: "Perfil desde la ficha", en: "Profile from the ficha" },
      ]}
      pie={{ instantanea: nombre, consulta }}
    >
      <DesdeFichaPantalla tabla={tabla} rasgos={rasgos} />
    </Consola>
  );
}
