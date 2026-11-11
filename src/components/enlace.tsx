// El enlace de la aplicación: `next/link` salvo en el modo público (C19), donde un destino que no está en la lista blanca se
// ve como texto inerte y no como un enlace. Todo componente importa ESTE, no `next/link`.
import Link from "next/link";
import type { ComponentProps } from "react";
import { enlaceVisible } from "@/lib/publico/lista-blanca";

export default function Enlace(props: ComponentProps<typeof Link>) {
  const { href, children, className } = props;
  const destino = typeof href === "string" ? href : (href.pathname ?? "");
  if (!enlaceVisible(destino))
    return <span className={className}>{children}</span>;
  return <Link {...props} />;
}
