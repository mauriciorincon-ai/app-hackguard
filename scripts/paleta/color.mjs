// Color para la paleta de HackGuard: OKLCH → sRGB, contraste WCAG, diferencia OKLab y simulación de
// daltonismo (Machado, Oliveira y Fernandes 2009, severidad 1,0, sobre RGB lineal). Código puro.

const aLineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const aGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** OKLCH (L 0–1, C, H en grados) → RGB lineal. Lanza si el color cae fuera de sRGB. */
export function oklchALineal([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  if (rgb.some((c) => c < -0.002 || c > 1.002)) {
    throw new Error(`color fuera de sRGB: oklch(${L} ${C} ${H}) → ${rgb.map((c) => c.toFixed(3))}`);
  }
  return rgb.map((c) => Math.min(1, Math.max(0, c)));
}

export function linealAHex(rgb) {
  return "#" + rgb.map((c) => Math.round(aGamma(c) * 255).toString(16).padStart(2, "0")).join("");
}

export function hexALineal(hex) {
  return [1, 3, 5].map((i) => aLineal(parseInt(hex.slice(i, i + 2), 16) / 255));
}

export const luminancia = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Razón de contraste WCAG 2 entre dos colores hex. */
export function contraste(hexA, hexB) {
  const [a, b] = [luminancia(hexALineal(hexA)), luminancia(hexALineal(hexB))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function linealAOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const VISION = {
  normal: null,
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};
export const VISIONES = Object.keys(VISION);

function simular(rgb, vision) {
  const m = VISION[vision];
  if (!m) return rgb;
  return m.map((fila) => Math.min(1, Math.max(0, fila[0] * rgb[0] + fila[1] * rgb[1] + fila[2] * rgb[2])));
}

/** Diferencia de color (distancia euclídea en OKLab) entre dos hex, vista con `vision`. */
export function diferencia(hexA, hexB, vision = "normal") {
  const [a, b] = [hexA, hexB].map((h) => linealAOklab(simular(hexALineal(h), vision)));
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
