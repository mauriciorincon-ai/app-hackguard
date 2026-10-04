# HackGuard · bundle del design system

> GENERADO por `pnpm design-sync:bundle` (`scripts/design-sync/generar.mjs`) desde `design-system.md` 1.0.0 y la
> maqueta de `docs/diseno/`. No se edita a mano: `tests/unit/design-sync.test.ts` exige los mismos bytes.

Espejo publicable del design system de HackGuard para Claude Design (regla 16 de la constitución). La jerarquía es
fija: `design-system.md` (fuente de verdad) → `design-sync/` (este bundle, deriva) → el proyecto en Claude Design
(vitrina, jamás se edita allá). El destino y el registro de publicación viven en `project.json`.

**Estado:** sin publicar. Se publica después del gate ⭐⭐ del ciclo H1, cuando el usuario invoque `/design-sync`.

## Qué trae

- `styles.css`: las hojas de la maqueta tal cual: `tokens.css` (los dos temas, generados y medidos) y `app.css` (la
  dirección «consola»), sin las caras de letra.
- Una tarjeta por panel del kit (`docs/diseno/kit.html`), con el mismo HTML. Su primera línea es la marca `@dsCard`
  con la que Claude Design la indexa; lleva el CSS en línea y no pide nada a la red ni a otro archivo. Arriba, el
  tema oscuro en español; abajo, el claro en inglés.

| Grupo | Tarjeta | Archivo |
| --- | --- | --- |
| Fundamentos | Color | `components/fundamentos/color.html` |
| Fundamentos | Tipografía | `components/fundamentos/tipografia.html` |
| Fundamentos | Estados | `components/fundamentos/estados.html` |
| Componentes | Botones, filtros y campos | `components/componentes/botones-filtros-y-campos.html` |
| Componentes | Tira de cifras | `components/componentes/tira-de-cifras.html` |
| Componentes | Tabla | `components/componentes/tabla.html` |
| Componentes | Recorrido | `components/componentes/recorrido.html` |
| Componentes | Propiedades, contraste y carril de acción | `components/componentes/propiedades-contraste-y-carril-de-accion.html` |
| Componentes | Pestañas y selector de objeto | `components/componentes/pestanas-y-selector-de-objeto.html` |
| Componentes | Matriz de prioridad | `components/componentes/matriz-de-prioridad.html` |
| Componentes | Brecha, tablero e informe | `components/componentes/brecha-tablero-e-informe.html` |
| Componentes | Estado de pantalla | `components/componentes/estado-de-pantalla.html` |

## Lo que no está aquí

- **El armazón y las pantallas** (barra lateral, barra de contexto, carril de acción, cada pantalla con sus estados):
  viven en la maqueta, que es la referencia de fidelidad del producto.
- **Las fuentes:** las tarjetas declaran la pila sin descargar Atkinson Hyperlegible Next ni Mono; donde no están
  instaladas se ve la letra del sistema.
- **La interacción:** sin `maqueta.js`, botones, pestañas y campos quedan en su estado inicial; en la maqueta cambian
  al pulsarlos.
