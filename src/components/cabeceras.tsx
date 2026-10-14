import { T, type Bilingue } from "./texto";

/** La fila de cabeceras de una tabla: una columna por rótulo, en los dos idiomas (S3-B2: antes estaba copiada en tres pantallas). */
export function Cabeceras({ columnas }: { columnas: Bilingue[] }) {
  return (
    <thead>
      <tr>
        {columnas.map((c) => (
          <th key={c.es} scope="col">
            <T t={c} />
          </th>
        ))}
      </tr>
    </thead>
  );
}
