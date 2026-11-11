// El enlace de la aplicación: `next/link` salvo en el modo público (C19), donde un destino que no está en la lista blanca se
// ve como texto inerte y no como un enlace, y en el paquete (C20), donde es un `<a>` con la base de CV Viva y sin precarga: la pieza
// no lleva archivos RSC, así que la navegación es la del navegador. Todo componente importa ESTE, no `next/link`.
import Link from "next/link";
import type { ComponentProps } from "react";
import { enlaceVisible } from "@/lib/publico/lista-blanca";
import { hrefDelPaquete, modoPaquete } from "@/lib/publico/paquete";

// Lo que `next/link` entiende y un `<a>` no: no se pasa al DOM.
const PROPIAS_DE_NEXT = new Set([
  "href",
  "prefetch",
  "replace",
  "scroll",
  "shallow",
  "passHref",
  "legacyBehavior",
  "locale",
  "onNavigate",
  "as",
]);

export default function Enlace(props: ComponentProps<typeof Link>) {
  const { href, children, className } = props;
  const destino = typeof href === "string" ? href : (href.pathname ?? "");
  if (!enlaceVisible(destino))
    return <span className={className}>{children}</span>;
  if (modoPaquete()) {
    const resto = Object.fromEntries(
      Object.entries(props).filter(([k]) => !PROPIAS_DE_NEXT.has(k)),
    );
    return <a {...resto} href={hrefDelPaquete(destino)} />;
  }
  return <Link {...props} />;
}
