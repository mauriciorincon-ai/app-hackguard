// ¿Aplica una prueba a un activo? Las condiciones de `aplicabilidad` se evalúan sobre los rasgos del perfil.
// Sin modelo: es una función de los datos. Un rasgo que el activo no declara es falso; `tipo_de_acceso` sale
// del campo `acceso` del activo.
import type { Prueba } from "../catalogo/esquemas.ts";
import type { Activo } from "../activos/esquemas.ts";

type Aplicabilidad = Pick<Prueba, "aplicabilidad">["aplicabilidad"];

function valorDelRasgo(
  activo: Pick<Activo, "rasgos" | "acceso">,
  rasgo: string,
): boolean | string {
  if (rasgo === "tipo_de_acceso") return activo.acceso;
  return activo.rasgos[rasgo] ?? false;
}

export function aplicaPorPerfil(
  activo: Pick<Activo, "rasgos" | "acceso">,
  aplicabilidad: Aplicabilidad,
): boolean {
  const cumple = aplicabilidad.condiciones.map(
    (c) => valorDelRasgo(activo, c.rasgo) === c.valor,
  );
  return aplicabilidad.modo === "todas"
    ? cumple.every(Boolean)
    : cumple.some(Boolean);
}
