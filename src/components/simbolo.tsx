// Marcas de estado como TRAZOS SVG, nunca como caracteres de una fuente (regla dura 12). El color llega por
// currentColor (el papel del estado) y el texto va siempre al lado. Una forma por papel: círculo relleno con visto =
// bien · triángulo = atención · cuadrado relleno con aspa = falla · círculo punteado = no hay. Referencia:
// scripts/maqueta/nucleo/simbolos.mjs (misma geometría; el vocabulario `datos/estados.json` elige el nombre).
const HUECO = {
  stroke: "var(--fondo)",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;
const TRAZO = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

function Barras({ llenas }: { llenas: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const alto = 4 + i * 3;
        return i < llenas ? (
          <rect
            key={i}
            x={1 + i * 3.75}
            y={15 - alto}
            width={2.75}
            height={alto}
            rx={0.5}
            fill="currentColor"
          />
        ) : (
          <rect
            key={i}
            x={1 + i * 3.75}
            y={15 - alto}
            width={2.75}
            height={alto}
            rx={0.5}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
          />
        );
      })}
    </>
  );
}

const FORMAS: Record<string, () => React.ReactNode> = {
  ok: () => (
    <>
      <circle cx="8" cy="8" r="7.25" fill="currentColor" />
      <path d="M4.6 8.3l2.3 2.3 4.6-5" {...HUECO} />
    </>
  ),
  aviso: () => (
    <>
      <path d="M8 1.8l6.6 12H1.4z" {...TRAZO} />
      <path d="M8 6.4v3.4M8 11.9v.2" {...TRAZO} />
    </>
  ),
  falla: () => (
    <>
      <rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor" />
      <path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" {...HUECO} />
    </>
  ),
  parcial: () => (
    <>
      <circle cx="8" cy="8" r="6.4" {...TRAZO} />
      <path d="M8 1.6a6.4 6.4 0 0 0 0 12.8z" fill="currentColor" />
    </>
  ),
  reloj: () => (
    <>
      <circle cx="8" cy="8" r="6.4" {...TRAZO} />
      <path d="M8 4.4V8l2.6 1.7" {...TRAZO} />
    </>
  ),
  vacio: () => (
    <circle cx="8" cy="8" r="6.4" {...TRAZO} strokeDasharray="2.2 2.6" />
  ),
  no_aplica: () => (
    <>
      <circle cx="8" cy="8" r="6.4" {...TRAZO} />
      <path d="M5 8h6" {...TRAZO} />
    </>
  ),
  firma: () => (
    <>
      <path
        d="M2 13.2c2.2-.2 2.6-3.4 4.3-3.4 1.5 0 .6 2.6 2 2.6 1.6 0 1.7-3.4 5.7-3.2"
        {...TRAZO}
      />
      <path d="M9.2 6.8l3.3-4 1.7 1.4-3.3 4-2.1.7z" fill="currentColor" />
    </>
  ),
  barras4: () => <Barras llenas={4} />,
  barras3: () => <Barras llenas={3} />,
  barras2: () => <Barras llenas={2} />,
  barras1: () => <Barras llenas={1} />,
  barras0: () => <Barras llenas={0} />,
};

export const SIMBOLOS = Object.keys(FORMAS);

export function Simbolo({ nombre }: { nombre: string }) {
  const forma = FORMAS[nombre];
  if (!forma) throw new Error(`símbolo de estado desconocido: «${nombre}»`);
  return (
    <svg
      className="hg-marca-estado"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      {forma()}
    </svg>
  );
}
