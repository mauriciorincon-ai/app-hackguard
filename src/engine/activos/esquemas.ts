// Esquemas del activo (RF-02): qué es, de quién es, quién lo provee, cómo es y qué se autorizó probar. Zod 4,
// con la misma regla que los del catálogo: VALIDAN y nunca TRANSFORMAN. Un activo es un archivo; su huella se
// calcula sobre lo que está escrito (normalizado en `normalizar.ts`), no sobre una versión retocada.
//
// Sin `alcance` y sin `reglas` el activo es válido pero NO está autorizado, y no recibe plan (regla dura 5).
import { z } from "zod";
import {
  ENTORNOS,
  Fecha,
  IdMinusculas,
  IdPrueba,
  Texto,
} from "../catalogo/esquemas.ts";

/** `demo` vive en `datos/activos/` (público); `propio` solo en `datos/privado/activos/` (regla dura 8). */
export const ORIGENES = ["demo", "propio"] as const;
export const ACCESOS = ["caja_negra", "caja_blanca"] as const;
export const EXPOSICIONES = ["publica", "interna"] as const;
export const SENSIBILIDADES = ["publicos", "personales", "sensibles"] as const;
export const ACCIONES_DE_AJUSTE = ["agregada", "quitada"] as const;

const Proveedor = z.strictObject({
  nombre: Texto,
  provee: Texto,
  // Lo que el proveedor permite y prohíbe, con palabras propias, con su fuente y la fecha en que se leyó. Sin
  // política leída las reglas de enfrentamiento no pueden citarla.
  politica: Texto.nullable(),
  politica_fuente: Texto.nullable(),
  politica_verificada: Fecha.nullable(),
});

const Perfil = z.strictObject({
  pila: Texto,
  exposicion: z.enum(EXPOSICIONES),
  autenticacion: Texto,
  datos: z.enum(SENSIBILIDADES),
  actua: z.boolean(),
  modelos: Texto,
  canales: z.array(Texto),
  acciones: z.array(Texto),
});

const Alcance = z.strictObject({
  incluye: z.array(Texto).min(1),
  excluye: z.array(Texto),
  // Las familias del activo que se autorizó probar: una familia fuera de aquí se excluye con su motivo.
  familias: z.array(IdMinusculas).min(1),
  ventana: Texto,
  limites: Texto,
  // Pruebas concretas fuera del alcance, con su razón. «Canal» no existe en el catálogo: se dice por prueba.
  fuera: z.array(z.strictObject({ prueba: IdPrueba, razon: Texto })),
});

const Regla = z.strictObject({ texto: Texto, cita_proveedor: z.boolean() });

const Ajuste = z.strictObject({
  prueba: IdPrueba,
  accion: z.enum(ACCIONES_DE_AJUSTE),
  fecha: Fecha,
  // Obligatoria: un ajuste del operador sin su porqué no es auditable (RF-03.7).
  justificacion: Texto,
});

export const Activo = z.strictObject({
  id: IdMinusculas,
  origen: z.enum(ORIGENES),
  nombre: Texto,
  descripcion: Texto,
  familias: z.array(IdMinusculas).min(1),
  acceso: z.enum(ACCESOS),
  dueno: z.strictObject({ nombre: Texto, nota: Texto }),
  proveedor: Proveedor.nullable(),
  perfil: Perfil,
  // Solo los rasgos booleanos presentes y verdaderos o falsos; el que falta es falso. `tipo_de_acceso` no se
  // escribe aquí: sale de `acceso`.
  rasgos: z.record(IdMinusculas, z.boolean()),
  alcance: Alcance.nullable(),
  reglas: z.array(Regla).min(1).nullable(),
  entornos: z.array(z.enum(ENTORNOS)).min(1),
  ajustes: z.array(Ajuste),
});
export type Activo = z.infer<typeof Activo>;
export type Ajuste = z.infer<typeof Ajuste>;
export type Regla = z.infer<typeof Regla>;
export type Alcance = z.infer<typeof Alcance>;

/** El activo está autorizado si declaró alcance Y reglas de enfrentamiento (regla dura 5). */
export const estaAutorizado = (a: Activo): boolean =>
  a.alcance !== null && a.reglas !== null;
