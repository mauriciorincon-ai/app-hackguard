// Esquema de `datos/ejecutor/comandos.json`: cómo se lanza cada herramienta. Estricto: un campo que no se conoce no se ignora.
import { z } from "zod";
import { Texto } from "../catalogo/esquemas.ts";

const NombreDeVariable = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);

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
  // Códigos de salida con los que la herramienta DEJÓ resultados (ZAP sale con 1 o 2 cuando hay hallazgos; promptfoo con 100 si
  // un caso falla). Otro código, o una señal, es un fallo y no se importa nada. El código no es un veredicto: lo calcula la regla.
  codigos_ok: z.array(z.number().int().min(0).max(255)).min(1),
  // Variables de TU entorno que esta herramienta recibe además de `entorno_base` (sus claves de proveedor). Nada más se hereda.
  entorno: z.array(NombreDeVariable),
});
export type Comando = z.infer<typeof Comando>;

export const TablaDeComandos = z.strictObject({
  version: z.string(),
  nota: Texto,
  marcadores: z.record(z.string(), z.string()),
  objetivo_en_el_entorno: z.string().regex(/^[A-Z_]+$/),
  // Las únicas variables del entorno del ejecutor que llegan a toda herramienta (el resto, tokens y claves de nube incluidos, no).
  entorno_base: z.array(NombreDeVariable),
  herramientas: z.record(z.string(), Comando.nullable()),
  infraestructura_de_terceros: z.strictObject({
    nota: Texto,
    dominios: z.array(z.string().min(1)).min(1),
  }),
});
export type TablaDeComandos = z.infer<typeof TablaDeComandos>;
