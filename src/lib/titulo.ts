// El título de cada página (WCAG 2.4.2): «Brecha / Gap · HackGuard», o «HZ-0007 · Hallazgo / Finding · HackGuard» en una página de un
// solo elemento. Un export estático lleva UN título por página y no puede cambiar con el idioma que elija la persona, así que dice
// los dos. El sufijo « · HackGuard» lo pone la plantilla de `src/app/layout.tsx`.
import type { Metadata } from "next";

export const titulo = (es: string, en: string, id?: string): Metadata => ({
  title: id === undefined ? `${es} / ${en}` : `${id} · ${es} / ${en}`,
});
