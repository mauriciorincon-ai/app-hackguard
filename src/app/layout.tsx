import type { Metadata } from "next";
import "./globals.css";
import { SCRIPT_DE_PREFERENCIAS } from "@/lib/preferencias";
import fuenteDeTexto from "../../docs/diseno/assets/fuentes/atkinson-hyperlegible-next-latin-wght-normal.woff2";
import fuenteDeDatos from "../../docs/diseno/assets/fuentes/atkinson-hyperlegible-mono-latin-wght-normal.woff2";

const urlDe = (f: string | { src: string }) =>
  typeof f === "string" ? f : f.src;

export const metadata: Metadata = {
  title: "HackGuard",
  description:
    "Planeador, gestor y validador de pruebas de seguridad para software y sistemas de IA / Planner, manager and validator of security tests for software and AI systems",
};

// El tema y el idioma viven en atributos de <html> que src/lib/preferencias.ts aplica antes del primer pintado;
// por eso <html> declara suppressHydrationWarning. Tema por defecto: oscuro (decisión 7 de diseño).
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-lang="es" data-theme="oscuro" suppressHydrationWarning>
      <head>
        {/* Las dos fuentes de la interfaz se precargan: sin esto el texto se pinta con la de reserva y se repinta al llegar la fuente, y el LCP mide ese segundo pintado. */}
        {[fuenteDeTexto, fuenteDeDatos].map((f) => (
          <link
            key={urlDe(f)}
            rel="preload"
            href={urlDe(f)}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DE_PREFERENCIAS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
