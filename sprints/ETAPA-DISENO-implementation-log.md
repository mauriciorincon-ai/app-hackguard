# Etapa de Diseño (F2a) — bitácora de implementación

Orden: `portafolio/hackguard/ordenes/DISENO-orden.md` (planeadora, solo lectura). Rama
`diseno/fundacion`. Plan aprobado y «construye» del usuario: 2026-10-03.

## Fase 0 — Tubería (2026-10-03)

**Criterio de fase completa:** el preview del PR abre la maqueta provisional con estilos, con sesión de
Vercel. Sin diseño todavía: la página `index.html` de esta fase declara que es provisional.

### Qué se construyó

- **Generador** `scripts/maqueta/` (ESM de Node, sin dependencias): `generar.mjs`, `rutas.mjs`,
  `nucleo/` (fechas civiles sin reloj, vigencia, HTML bilingüe, trazos de símbolos, armazón de página),
  `datos/` (fecha de consulta, umbrales, muestra de la fase 0), `paginas/index.mjs`.
- **Entrega:** `scripts/copiar-maqueta.mjs` encadenado en `build`; `vercel.json` y `serve.json`;
  `start` con `--config ../serve.json`. Patrón adoptado entero de big-d, que ya pagó el 404.
- **Arnés** `scripts/capturar-maqueta.mjs` + sondas compartidas con los e2e
  (`scripts/maqueta/arnes/sondas.mjs`): sirve `docs/diseno/` y entra por el índice; página × tema ×
  idioma × ancho × estado; desbordes; pasada de interacción por huella SHA-256 del DOM; vistas de
  daltonismo con `--simular`. Declara su árbol y aborta si la salida cae dentro del repo.
- **Gates** (tabla abajo), `docs/diseno/README.md`, `.prettierignore`, `datos/privado/` y
  `public/diseno/` en `.gitignore`, ignorados de ESLint.

### Demos en rojo (regla 15) — todas en este commit

Cada edición se confirmó con `cmp` contra un respaldo antes de correr el gate; después se restauró y
la suite volvió a verde (30 unitarias, 24 e2e).

| # | Gate | Cambio deliberado | Rojo que dio |
|---|---|---|---|
| D1a | deriva | `data-dias="12"` → `"13"` a mano en `index.html` | «index.html: difiere de lo que genera scripts/maqueta» |
| D1b | deriva | fecha de un dato cambiada sin regenerar | el mismo, sobre `index.html` |
| D2a | controladores | el script registra «estados» en vez de «estado» | «ningún script cargado registra «estado» → `<button … data-valor="datos"`» |
| D2b | controladores | la página deja de cargar `assets/maqueta.js` | «ningún script cargado registra «tema»» |
| D2c | controladores | enlace a `kit.html`, que aún no existe | «enlace a una página que no existe (kit.html)» |
| D3 | autocontención | `@import` de una hoja remota en `maqueta.css` | «assets/maqueta.css: url() remota en CSS» |
| D4a | bilingüe | un título emitido solo en español | «texto sin idioma declarado: ['Vigencia calculada']» |
| D4b | bilingüe | un `aria-label` sin su inglés | «aria-label sin inglés → `<button … data-controlador="tema"`» |
| D5 | envejecimiento | umbral corrido un día (`>=` → `>`) | «index.html @ 2026-10-21 (verificada 2026-09-21): estado a los 30 días: expected 'vigente' to be 'por_revisar'» |
| D6 | servidores | `serve.json` redirige `/diseno` a otro destino | «expected ['/diseno → /diseno/index', …] to deeply equal …» |
| D7 | servida (e2e) | `pnpm start` sin `serve.json` | 6 rojos: URL `/diseno` en vez de `/diseno/index.html` y fondo `rgba(0, 0, 0, 0)` — la maqueta sin estilos, el defecto exacto de las apps hermanas |
| D8a | interacción (e2e) | el controlador «estado» no hace nada | «el control «estado:vacio» no cambió nada al activarlo» (×4). **El gate unitario de controladores siguió verde**: por eso existe la pasada |
| D8b | 380 px (e2e) | `min-width: 480px` en una celda | «documento: scrollWidth 496 > 380» |
| D8c | accesibilidad (e2e) | tinta secundaria clara sobre fondo claro | «color-contrast: 10», solo en el tema claro |
| D9 | reducir movimiento (e2e) | transición fuera de su media query | «Expected: 0 · Received: 30» animaciones |

### Bugs y resoluciones

- **El gate bilingüe nació decorativo.** Su primera demo (D4a) salió **verde con el defecto puesto**:
  `closest("[lang]")` encontraba el `lang` de `<html>`, así que todo texto «tenía idioma». Se excluyó la
  raíz y se repitió la demo hasta verla en rojo. Es la tercera pregunta de la regla 15 —¿puede fallar?—
  respondida por la demo, no por la lectura del código.
- **La demo D6 no editó nada en su primer intento** (un `sed` inválido). `cmp` lo delató («SIN CAMBIO»)
  y el gate se habría dado por demostrado sin estarlo. Se repitió con la edición real.
- **Capturas a media transición.** La primera pasada fotografió un botón de estado con el borde aún
  animándose (parecían dos botones activos). El arnés ahora captura con las animaciones terminadas.

### Vercel, sin desplegar

`vercel build` local (sin sesión ni deploy, con un `.vercel/project.json` desechable e ignorado) confirma
lo que big-d encontró: el constructor de Next publica `diseno/index.html` en la ruta `diseno/index`. Con
`vercel.json`, las dos redirecciones de `/diseno` quedan **antes** de la regla que quita la barra final,
y la reescritura `.html` queda **después** de `filesystem` con `check: true`. Los `assets/` se publican
tal cual. **Falta la prueba real: el usuario abre el preview con sesión.**

### Dependencias (carril aparte)

Los PRs #1 y #2 de dependabot estaban en rojo por haber nacido sobre el commit inicial, antes de la
excepción de auditoría del PR #3. #1 (acciones de CI): regenerado con `@dependabot rebase`, tres checks
en `success`, mergeado. #2 (npm): regeneración pedida después del merge del #1.

## Desviación del plan

- **`--coverage` no entra al script `test` en esta etapa.** El plan lo listaba, pero la constitución lo
  fija para «los primeros tests del S1»: los umbrales cubren `src/lib` y `src/engine`, y en esta etapa no
  se escribe producto ni sus tests. Activarlo ahora pondría la CI en rojo por `src/lib/observability.ts`
  o empujaría a escribir producto antes de G-Diseño. Lo activa el S1.
- **El e2e de «enlace relativo abre otra página con estilos»** llega con la fase 1: hoy la maqueta tiene
  una sola página. El gate unitario ya impide enlaces a páginas inexistentes (D2c).
- **La comprobación de fuente cargada del arnés** llega con las fuentes, en la fase 1.
