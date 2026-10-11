import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackGuard",
  description:
    "Planeador, gestor y validador de pruebas de seguridad para software y sistemas de IA / Planner, manager and validator of security tests for software and AI systems",
  robots: { index: false, follow: false },
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
        <Script src="/preferencias.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
