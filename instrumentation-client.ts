// Sentry client-only, metadata-only (kit-app v1.2.1 — patrón validado en nutri-kids S1 y ds S1).
// INERTE SIN DSN: si NEXT_PUBLIC_SENTRY_DSN no está definida (CI, local sin configurar),
// no se inicializa nada y no hay ruido. Configura la DSN en .env.local y en Vercel.
// Server-side Sentry (instrumentation.ts) se añade cuando la app tenga backend, por ADR.
//
// El SDK se importa DENTRO de la rama con DSN (`import()` dinámico): sin DSN la rama desaparece del build y el SDK
// no viaja al navegador (con el import estático pesaba la mitad del JS que todas las páginas descargan y ejecutan:
// 465 KB → 230 KB, y era lo que empujaba el LCP simulado de /catalogo sobre su presupuesto). Con DSN carga aparte,
// fuera de la ruta crítica. ADR-006 (superseded) tiene la medida.

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "local",
      // Sin tracing ni replay: error tracking puro (presupuesto y privacidad).
      tracesSampleRate: 0,
      // Privacidad (metadata-only): nunca enviar requests ni breadcrumbs que puedan
      // arrastrar contenido del usuario. Reportar errores vía src/lib/observability.ts.
      beforeSend(event) {
        delete event.request;
        event.breadcrumbs = undefined;
        if (event.exception?.values?.[0]?.type === "AbortError") return null;
        // Metadata-only de verdad (kit v1.33.0, Big-D S1 B-10): el MENSAJE de una excepción puede arrastrar
        // contenido del usuario (una ruta, un nombre, un texto pegado). Queda solo el tipo.
        for (const v of event.exception?.values ?? []) v.value = v.type;
        return event;
      },
    });
  });
}

// Hook opcional de Next para transiciones de router (no-op sin DSN).
export const onRouterTransitionStart = dsn
  ? (href: string, navigationType: "push" | "replace" | "traverse") => {
      void import("@sentry/nextjs").then((Sentry) =>
        Sentry.captureRouterTransitionStart(href, navigationType),
      );
    }
  : () => {};
