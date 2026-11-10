// Esquema de `datos/ejecutor/comandos.json`: cómo se lanza cada herramienta. Estricto: un campo que no se conoce no se ignora.
import { z } from "zod";
import { Texto } from "../catalogo/esquemas.ts";

const Comando = z.strictObject({
  ejecutable: z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/, "sin rutas ni espacios: se busca en el PATH"),
  argumentos: z.array(z.string()),
  // El archivo que escribe la herramienta, dentro de {carpeta}; null = el único .json que deje en la carpeta.
  salida: z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/)
    .nullable(),
});
export type Comando = z.infer<typeof Comando>;

export const TablaDeComandos = z.strictObject({
  version: z.string(),
  nota: Texto,
  marcadores: z.record(z.string(), z.string()),
  objetivo_en_el_entorno: z.string().regex(/^[A-Z_]+$/),
  herramientas: z.record(z.string(), Comando.nullable()),
  infraestructura_de_terceros: z.strictObject({
    nota: Texto,
    dominios: z.array(z.string().min(1)).min(1),
  }),
});
export type TablaDeComandos = z.infer<typeof TablaDeComandos>;
