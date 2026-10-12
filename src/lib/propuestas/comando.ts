// El comando que registra una decisión sobre una propuesta. Aparte de la vista: lo usa el componente del navegador y no debe arrastrar
// consigo el armado de la vista.
import type { DecisionDeBandeja, FilaDePropuesta } from "./tipos.ts";

/**
 * El comando que registra una decisión, en partes que no se rompen (la pantalla las muestra una por una para que un comando largo se
 * parta entre palabras en un teléfono). La pantalla NO guarda nada: lo muestra para que la persona lo corra en su terminal. El nombre y
 * la fecha los pone ella (la pantalla no los conoce ni los adivina). Una propuesta de demostración lleva `--aplicar-a-demo`.
 */
export function partesDelComando(
  f: Pick<FilaDePropuesta, "id" | "pideBanderaDeDemo">,
  decision: DecisionDeBandeja,
  opciones: { prueba?: string } = {},
): string[] {
  const partes = [
    "pnpm",
    "propuestas:decidir",
    f.id,
    "--decision",
    decision.replaceAll("_", "-"),
    "--por",
    '"<tu nombre>"',
    "--fecha",
    "AAAA-MM-DD",
  ];
  if (decision === "rechazar") partes.push("--motivo", '"<por qué>"');
  if (opciones.prueba !== undefined && decision !== "rechazar")
    partes.push("--prueba", opciones.prueba);
  if (
    f.pideBanderaDeDemo &&
    (decision === "aprobar" || decision === "aprobar_tras_revisar")
  )
    partes.push("--aplicar-a-demo");
  return partes;
}

export const comandoDeDecision = (
  ...args: Parameters<typeof partesDelComando>
): string => partesDelComando(...args).join(" ");
