// Semáforo de vigencia: estado y días desde la última verificación, calculados contra la fecha de
// consulta. Los umbrales viven en datos/umbrales.json (RF-01.5: por revisar desde 30, vencido desde 60).
import { diasEntre } from "./fecha.mjs";

export const ESTADOS_DE_VIGENCIA = ["vigente", "por_revisar", "vencido"];

export function vigencia(fechaVerificacion, consulta, umbrales) {
  const dias = diasEntre(fechaVerificacion, consulta);
  if (dias < 0) {
    throw new Error(`verificación (${fechaVerificacion}) posterior a la fecha de consulta (${consulta})`);
  }
  const { por_revisar, vencido } = umbrales.vigencia;
  const estado = dias >= vencido ? "vencido" : dias >= por_revisar ? "por_revisar" : "vigente";
  return { estado, dias };
}
