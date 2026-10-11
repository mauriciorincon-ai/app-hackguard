import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import fuenteDeTexto from "../../docs/diseno/assets/fuentes/atkinson-hyperlegible-next-latin-wght-normal.woff2";

const urlDeLaFuente =
  typeof fuenteDeTexto === "string" ? fuenteDeTexto : fuenteDeTexto.src;

export const metadata: Metadata = {
  title: "HackGuard",
  description:
    "Planeador, gestor y validador de pruebas de seguridad para software y sistemas de IA / Planner, manager and validator of security tests for software and AI systems",
};

// El tema y el idioma viven en atributos de <html> que public/preferencias.js aplica antes del primer pintado;
// por eso <html> declara suppressHydrationWarning. Tema por defecto: oscuro (decisión 7 de diseño).
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-lang="es" data-theme="oscuro" suppressHydrationWarning>
      <head>
        {/* La fuente de la interfaz se precarga: sin esto el texto se pinta con la de reserva y se repinta al llegar la fuente, y el LCP mide ese segundo pintado. */}
        <link
          rel="preload"
          href={urlDeLaFuente}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <Script src="/preferencias.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
