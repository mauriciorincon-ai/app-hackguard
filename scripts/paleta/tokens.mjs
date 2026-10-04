// Paleta de HackGuard en OKLCH [L, C, H]. FUENTE de los tokens de color: de aquí salen
// docs/diseno/assets/tokens.css y tokens.json (`pnpm tokens`). Papel y tinta: neutros cálidos, un solo
// acento —la tinta azul, reservada a lo que una persona firma o acciona— y cuatro papeles de estado
// que jamás trabajan solos (símbolo + texto + color). El texto va siempre en tinta; el color de un
// estado vive en su marca, su borde y su tinte.
export const TEMAS = {
  oscuro: {
    fondo: [0.175, 0.006, 80],
    superficie: [0.215, 0.007, 80],
    "superficie-2": [0.255, 0.008, 80],
    linea: [0.34, 0.008, 80],
    "linea-fuerte": [0.56, 0.01, 80],
    tinta: [0.935, 0.008, 85],
    "tinta-2": [0.78, 0.012, 85],
    acento: [0.76, 0.115, 262],
    "acento-tinte": [0.285, 0.05, 262],
    positivo: [0.78, 0.105, 188],
    "positivo-tinte": [0.275, 0.04, 188],
    atencion: [0.84, 0.135, 88],
    "atencion-tinte": [0.29, 0.045, 88],
    falla: [0.71, 0.165, 33],
    "falla-tinte": [0.285, 0.06, 33],
    neutro: [0.7, 0.012, 80],
    "neutro-tinte": [0.255, 0.008, 80],
  },
  claro: {
    fondo: [0.965, 0.011, 88],
    superficie: [0.992, 0.005, 88],
    "superficie-2": [0.935, 0.013, 88],
    linea: [0.86, 0.013, 88],
    "linea-fuerte": [0.58, 0.014, 85],
    tinta: [0.23, 0.01, 80],
    "tinta-2": [0.43, 0.013, 80],
    acento: [0.41, 0.16, 264],
    "acento-tinte": [0.925, 0.035, 262],
    positivo: [0.5, 0.085, 196],
    "positivo-tinte": [0.925, 0.04, 188],
    atencion: [0.61, 0.122, 82],
    "atencion-tinte": [0.95, 0.045, 92],
    falla: [0.47, 0.18, 30],
    "falla-tinte": [0.93, 0.035, 31],
    neutro: [0.6, 0.012, 80],
    "neutro-tinte": [0.935, 0.013, 88],
  },
};

/** Papeles de estado: los que llevan marca de color. */
export const PAPELES = ["positivo", "atencion", "falla", "neutro", "acento"];
