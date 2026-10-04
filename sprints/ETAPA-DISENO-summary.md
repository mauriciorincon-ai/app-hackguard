---
sprint: ETAPA-DISENO (F2a)
app: hackguard
status: closed
opened: 2026-10-03
closed: 2026-10-04
branch: diseno/fundacion
pr: "#4 (mauriciorincon-ai/app-hackguard)"
orden: portafolio/hackguard/ordenes/DISENO-orden.md (planeadora)
---

# Etapa de Diseño Summary — HackGuard

## Outcome

**Sí.** **G-Diseño se aprobó el 2026-10-04** sobre el preview del PR #4, recorrido completo en teléfono y
escritorio, en los dos temas y los dos idiomas: «Todas estab muy bien y en orden muy buen trabajo, las abri
y las apruebo». Todos los entregables de la orden están construidos y desplegados en Vercel protegido. Hubo
once miradas registradas, cada una antes de construir encima. La mirada 4 rechazó el diseño («es como si
fuera un documento») y reabrió la interfaz; de ahí salió la dirección «consola». La auditoría independiente
pidió ajustes (0 críticos, 3 altos, 16 medios, 17 bajos) y los 36 quedaron pagados. **Cero código de
producto:** nada bajo `src/`.

Es la Etapa de Diseño, no un cierre de ciclo: no hay acto de construcción ni de pruebas, ni ⭐⭐. El
bundle `design-sync/` queda en el repo, sin publicar.

## Qué se construyó

- **`design-system.md` 1.0.0**, sellado en G-Diseño. Trae:
  - la personalidad («una consola de evidencia: se trabaja en ella, no se lee como un informe»);
  - los tokens de los dos temas, generados y medidos, y la tipografía (Atkinson Hyperlegible Next y Mono,
    OFL, en el repo);
  - el espacio y los tres anchos;
  - los estados con símbolo + texto + color y su vocabulario como dato;
  - 31 componentes canon;
  - el movimiento y su variante reducida;
  - la idea «una cuenta, un cálculo»;
  - el contrato con el código y los anti-patrones.
- **Maqueta navegable del H1** en `docs/diseno/`: **47 páginas**, servidas en `/diseno` del preview.
  - **Páginas:** la portada del recorrido, el kit y las 13 pantallas de la orden. Las pantallas de
    detalle tienen una página por objeto: 21 fichas de prueba, 3 activos con su plan, 4 hallazgos (uno por
    momento del ciclo) y 5 controles.
  - **Estados:** cada pantalla trae vacío, carga, error y con datos, más sin resultados donde hay filtros.
  - **Formato:** funciona a 380 px y en escritorio, en oscuro y claro, en español e inglés redactados.
- **Generador** `scripts/maqueta/` (ESM, sin dependencias), en el repo desde la fase 0:
  - deriva byte a byte, con la fecha de consulta como entrada y sin reloj;
  - un mundo sintético al nivel de la regla dura 3;
  - un solo cálculo de la brecha para tablero, brecha, vista por control e informe;
  - un generador que falla ante un enlace a una página que no genera.
- **Herramientas:**
  - `scripts/paleta/`: OKLCH → `tokens.css` y `tokens.json`.
  - `scripts/copiar-maqueta.mjs`, `vercel.json` y `serve.json`, para que el preview abra desde la fase 0.
  - `scripts/capturar-maqueta.mjs`: arnés de capturas con pasada de interacción y simulación de
    daltonismo; declara su árbol y aborta fuera de él.
- **Bundle `design-sync/`** (regla 16), sin publicar:
  - Una tarjeta por panel del kit (3 de fundamentos y 9 de componentes), generada desde el mismo código
    que dibuja `kit.html` y con su misma hoja.
  - Cada tarjeta muestra el tema oscuro en español y el claro en inglés.
  - `project.json` lleva `projectId: null`.
- **Gates (20)**, cada uno visto en rojo antes de entrar. Están en la tabla «Gates de esta etapa» del
  README de diseño, y su demo en la bitácora.

## DoD — checklist (6+1)

| Estándar | Estado | Evidencia |
|---|---|---|
| Testing | ✓ | `pnpm test`: 701 unitarias en 19 archivos. `pnpm test:e2e`: 1044 pruebas en 2 archivos (dos proyectos). Cada gate de la etapa tiene su demo en rojo registrada en la bitácora: D1–D9 y F1–F8 en las fases 0 y 1, G1–G21 en las fases 2 a 5, G22–G34 en la auditoría y G35 en el bundle |
| CI/CD | ✓ | `quality`, `e2e` y `lighthouse` con conclusión propia `success`, leídos con `gh pr checks` después de cada push del PR #4. Último medido antes del cierre: `4ec0850` (bundle y registro de G-Diseño), con `quality` en 1 min 59 s, `e2e` en 10 min, `lighthouse` en 1 min 25 s y Vercel ✓. El commit del summary se verifica igual antes del merge. Los gates de la maqueta corrieron en CI por primera vez en este PR: sin histórico, no se afirma regresión ni no-regresión |
| Observabilidad | N/A | Sin código de producto. Sentry del estampado sin cambios (inerte sin DSN) |
| Seguridad | ✓ | gitleaks en cada commit (0 fugas). `pnpm audit --audit-level high`: la única alta es la ignorada por ADR-001 (dependencia de desarrollo vía `eslint-config-next`). Barrido de enlaces vacío tras el último `git add`. El campo homepage apunta al propio repo. Datos sintéticos, sin cargas ni procedimientos (regla dura 3). De ISO/IEC, solo identificadores y resúmenes propios, también en los nombres de las áreas del Anexo A (regla 11) |
| Performance | ✓ con límite declarado | `lighthouse` mide `/`, no la maqueta; la maqueta la miden los e2e y el arnés (decisión del plan, en el README de diseño) |
| UX + A11y | ✓ | axe en las 47 páginas × 2 temas × 2 idiomas. Vacío, carga y error a 380 px con axe en las 44 páginas que los tienen. Sin desbordes ni palabras partidas a 380 px y en escritorio. «Reducir movimiento» sin animaciones en las 47. El botón pulsado se distingue sin color. La paleta está medida bajo tres dicromacias. El color nunca va solo |
| IA embebida | N/A | La etapa no toca IA. El agente «Experto ISO 42001» no es fuente de los resúmenes del Anexo A (decisión del usuario) |

## Métricas técnicas

La orden no fija métricas numéricas. Lo que se midió, sobre los tokens finales:

| Medida | Oscuro | Claro | Umbral |
|---|---|---|---|
| Tinta sobre toda superficie y todo tinte (peor caso) | 11,65:1 | 13,61:1 | 7:1 |
| Tinta secundaria (peor caso) | 7,06:1 | 6,51:1 | 4,5:1 |
| Acento sobre superficies | 7,33:1 | 7,53:1 | 4,5:1 |
| Marcas y bordes de control | 3,41:1 | 3,25:1 | 3:1 |
| Peor par de papeles, visión normal (ΔE OKLab) | 0,133 | 0,110 | 0,10 |
| Peor par bajo protanopía · deuteranopía · tritanopía | 0,088 · 0,083 · 0,055 | 0,072 · 0,111 · 0,085 | 0,05 |

- **Crecimiento de la red de pruebas:** de 30 unitarias y 24 e2e en la fase 0 a 701 y 1044 al cierre.
- **Generador:** 47 páginas, mismos bytes en cada corrida. La matriz de envejecimiento construye la
  maqueta en cada fecha umbral y exige que cada estado aparezca al menos una vez.

## Gate ⭐ — diferimiento y contrapesos

La etapa no tiene guía de prueba: su gate humano es **G-Diseño**, la mirada 6. El usuario la hizo sobre el
preview desplegado, como pide la orden. El ⭐ no aplica aquí.

| Contrapeso | Evidencia (archivo, cuenta medida, corrida) |
|---|---|
| Pasada de capturas del builder | Fase 1: 44 · 4-ter tramo 1: 192 · 4-ter tramo 2: 1176 · mirada 5: 1432, más 444 en 900, 1100 y 1440 px · auditoría fase 2: 1432 · bundle: 12 tarjetas. En todas, 0 fallas de medida, más los encuadres leídos como imagen que la bitácora lista en cada fase. Arnés `scripts/capturar-maqueta.mjs`; capturas fuera del repo |
| e2e de `reduced-motion` | 94 pruebas («todo se ve y nada se anima»: 47 páginas × 2 proyectos) en `tests/e2e/maqueta-servida.spec.ts`, en la CI de cada push |

⭐ no aplica en la etapa. G-Diseño (mirada 6): aprobado el 2026-10-04, sin ajustes.

## Auditoría (`/audita-sprint`)

- **Revisión propia** (`/self-review`): encontró piezas duplicadas en el generador (`eslabon`, `sobreDe`,
  `plural`, `nombreDe` y dos formas de contar un sobre). Se pagó con la fase 2.
- **Fase 1:** auditor independiente (un subagente que no construyó la etapa, con el diff delante):
  `sprints/ETAPA-DISENO-auditoria.md`. Veredicto **«requiere ajustes»**: 0 críticos, 3 altos, 16 medios y
  17 bajos. Las reglas duras se cumplían. Verifiqué cuatro hallazgos en el código antes de presentarla.
- **Fase 2:** la aprobó el usuario: «Si arregla los 36 hallazgos, Si registra que el agente «Experto ISO
  42001» no será fuente de los resúmenes del Anexo A». Los 36 están pagados en cuatro bloques:

| Bloque | Hallazgos | Pago |
|---|---|---|
| Altos | A1 · A2 · A3 | Notas y frontmatter al día. La escala de IA declara su piso y su techo en datos, y la vista los lee de ahí. Ninguna cifra de datos se escribe a mano en el texto (gate `maqueta-cifras`) |
| Cálculos latentes | M8 · M9 · M10 · M12 · M14 | La huella se calcula sobre JSON canónico en todos los niveles. Un solo predicado `estaCerrado`. «No ejecutada» deja la prueba sin evidencia (E-6). El generador falla ante un enlace a una página que no genera |
| Lo que se ve | M1 · M2 · M3 · M15 · M16 | Vigencia por familia en el catálogo. Equivalencias en controles y en el carril. Una prueba agregada por el operador, con su justificación. El botón pulsado lleva barra y peso. Los estados de pantalla tienen su gate |
| Textos, documentación y orden | M4–M7 · M11 · M13 · B1–B17 | C19 y C20 declarados fuera. La promesa de «reabierto» se retira. El orden de los hallazgos sale de su estado. Las duplicaciones quedan unificadas, las guardas endurecidas y las áreas del Anexo A con palabras propias |

**Los pagos destaparon dos defectos que nadie había visto.** El gate nuevo de estados encontró, en su
primera corrida, 31 páginas sin `h1` en vacío, carga y error. Y la lectura de una captura mostró que la
prioridad nueva saturaba todo el plan del asistente en «5 de 5»; ninguna sonda lo nombró. Los dos están
corregidos. El barrido de frases caducadas se repitió sobre el diff de la fase 2 y sobre el del cierre,
este summary incluido, y no apareció ninguna nueva.

## Decisiones no anticipadas

Son 27 y están en «Decisiones de diseño que la orden no escribió» del README de diseño. No hubo ADR,
porque no se tocó código de producto. Las de más peso:

- **Miradas incrementales** (1): «propuesta completa» se entendió por artefacto, no las 13 pantallas
  antes de la primera mirada.
- **Entrega de la maqueta** (3): el patrón de big-d completo. El preview abrió desde la fase 0, a
  diferencia de las dos apps hermanas.
- **Dirección «acta» rechazada y dirección «consola»** (8, 15–17): armazón de aplicación, tablas densas,
  carril de acción y recorrido. Se eligió entre tres estructuras de interfaz sobre la misma pantalla.
- **Una página por objeto** (10, 11, 13, 23): prueba, activo y plan, hallazgo, control.
- **Una sola brecha, informe global imprimible y C18 como banda del tablero** (21, 24, 26).
- **Cierre:** el agente «Experto ISO 42001» no es fuente. Las tarjetas del bundle muestran oscuro en
  español y claro en inglés, para que la regla 20 llegue también a Claude Design.

## Bugs + resoluciones

- **El gate bilingüe nació decorativo:** su primera demo salió verde con el defecto puesto
  (`closest("[lang]")` encontraba el `<html>`). Se repitió hasta verla en rojo. Le pasó lo mismo al gate de
  la prueba agregada (G27), que medía un texto que ya pasaba el umbral.
- **Dos demos que no demostraban:** un `sed` inválido no editó nada, y `cmp` lo delató. Otra demo editó
  `out/`, que el servidor de los e2e recompila. Las dos se repitieron sobre la fuente.
- **El tema claro confundía dos pares de papeles bajo daltonismo** en la primera paleta (ΔE 0,012 y
  0,023). Lo encontró la medición, no la vista.
- **Mirada 2:** todas las filas del catálogo abrían la misma ficha. Ahora hay una ficha por prueba, con su
  gate.
- **Mirada 4:** el diseño se leía como un documento. Las dos direcciones de la mirada 1 diferían solo en
  la letra.
- **Fase 2 de la auditoría:** 31 páginas sin `h1` en sus estados, y la prioridad saturada en «5 de 5».
- **Entorno:** el puerto 3000 estaba ocupado por otra app de la casa, así que se añadió `E2E_PUERTO`.
  Hubo timeouts de axe con la máquina en carga, y pasaron al repetirlos.

## Qué salió bien / qué generó fricción

**Bien.**

- **El preview abrió en la fase 0** y el usuario hizo todas las miradas sobre la maqueta desplegada. Es
  lo que big-d no logró.
- El generador vivió en el repo desde el primer día, con su gate de deriva: nada se editó a mano.
- Exigir el rojo encontró dos gates decorativos antes de que dieran falsa tranquilidad.
- Leer capturas como imagen encontró lo que ninguna sonda veía (la prioridad saturada).
- «Una cuenta, un cálculo»: tablero, brecha, vista por control e informe dicen las mismas cifras en
  cualquier fecha.

**Fricción.**

- **La mirada 4 tiró el diseño de las miradas 1 a 3.** La dirección se había decidido por letra y color,
  no por interfaz. Costó dos miradas extra (4-bis y 4-ter).
- **La 4-bis se decidió sin evidencia de mirada:** el usuario aceptó la recomendación. Se acotó con un
  tramo 1 de tres pantallas, con parada propia.
- **La e2e completa (1044 pruebas) es lenta en local** y da timeouts de axe bajo carga.

## Sugerencias de mejora al método

1. **La mirada de dirección debe contrastar estructuras de interfaz** (armazón, navegación, densidad,
   componentes) sobre la misma pantalla, no solo tipografía y color. Aquí, mostrar solo la letra costó
   rehacer tres miradas aprobadas.
2. **Gate de estados de pantalla en la plantilla del kit:** vacío, carga y error a 380 px con axe. Su
   primera corrida encontró 31 páginas sin título.
3. **Toda cifra calculada que ordena necesita una prueba de reparto**, además de su prueba de valor: la
   prioridad saturada pasaba todas las pruebas de valor.
4. **`/design-sync` pide tarjetas `lang="es"`; con la regla 20 deberían llevar los dos idiomas.** Aquí,
   oscuro en español y claro en inglés en cada tarjeta.
5. **Generar el bundle desde el código del kit**, en vez de tarjetas a mano: el kit y el bundle no pueden
   divergir.

## Deuda técnica aceptada

| Deuda | Por qué | Sprint de pago |
|---|---|---|
| Texto en los dos idiomas «maquetado, no visto» | Las miradas de texto no bloquean (dos clases de mirada) | Gate del MVP |
| Barrido de tintas vetadas en `pnpm lint` | Sin código de producto no hay qué barrer | S2, primer sprint con UI |
| Gate de FIDELIDAD (cada pantalla contra su página de la maqueta) | Ídem | S2, con la parada tras la primera pantalla |
| `--coverage` en `pnpm test` | Los umbrales cubren `src/`, vacío en la etapa | S1, con los primeros tests del motor |
| Versiones de marcos, resúmenes del Anexo A y la equivalencia con NIST AI RMF, ilustrativos | La versión y la atribución de cada marco se fijan con su licencia (DA-01) | S1, fase 0 |
| Tabla de prioridad de IA ilustrativa | Se fija con el libro de evidencia | Sprint del libro de evidencia |
| La maqueta viaja en cada build (`public/diseno/`) | El paquete público del H2 no debe incluirla; falta su gate | S4 |
| Bundle `design-sync/` sin publicar; las tarjetas declaran la pila de letras sin las fuentes | La publicación es después del ⭐⭐ (regla 16) | Cierre de pruebas del ciclo H1 |
| `README.md` raíz es el del estampado | La etapa no toca la presentación del repo | S1 |

## Archivos clave

1. `design-system.md`
2. `docs/diseno/README.md` (decisiones, cobertura, gates, registro de miradas y de G-Diseño)
3. `docs/diseno/index.html` y `docs/diseno/kit.html`
4. `docs/diseno/assets/app.css` y `docs/diseno/assets/tokens.css`
5. `scripts/maqueta/generar.mjs`, `scripts/maqueta/datos/mundo.mjs` y `scripts/maqueta/nucleo/brecha.mjs`
6. `scripts/paleta/tokens.mjs`
7. `scripts/capturar-maqueta.mjs`
8. `tests/e2e/maqueta-servida.spec.ts` y `tests/unit/maqueta-deriva.test.ts`
9. `design-sync/` y `scripts/design-sync/generar.mjs`
10. `sprints/ETAPA-DISENO-implementation-log.md` y `sprints/ETAPA-DISENO-auditoria.md`

## Cómo probar

- **Desplegado:** preview del PR #4 en `/diseno`, con sesión de Vercel. La URL no se escribe en el repo
  (regla 17).
- **Local, servida:** `pnpm build && pnpm start` y abrir `/diseno`.
- **Regenerar:** `pnpm maqueta`, `pnpm tokens` y `pnpm design-sync:bundle`. Después, `pnpm test` debe
  seguir en verde (deriva 0).
- **Capturas:** `pnpm capturas:maqueta --salida <directorio temporal>`.
- **Barrido de enlaces** (sin resultados):
  `git grep -nE "vercel[.]app|workers[.]dev|pages[.]dev" -- ':!pnpm-lock.yaml'`
