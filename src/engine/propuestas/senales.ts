// Las señales con las que una propuesta queda en pausa por una razón más fina que su motivo. Viven en un módulo mínimo para que el aviso de
// versiones y la bandeja las lean sin importar el módulo de sellado (`verificar.ts`) entero.

/** La señal con la que una `version_de_marco` queda en pausa porque su versión nueva no está en un pasaje verificado (RF-07.5). */
export const SENAL_VERSION_EN_LA_CITA = "version_en_la_cita";
