---
paths:
  - "src/engine/catalogo/**"
  - "src/engine/modelo-decision/**"
  - "src/engine/demo/**"
  - "src/lib/catalogo/**"
  - "datos/**"
  - "propuestas/**"
  - "docs/LICENCIAS-DE-MARCOS.md"
  - ".claude/skills/**"
  - ".claude/agents/**"
---

# Reglas del catálogo y del conocimiento como dato (cargan al tocar `src/engine/catalogo/`, `datos/`, `propuestas/`)

Parte de la constitución de HackGuard (`CLAUDE.md`). Cada regla vive en un solo archivo: `tests/unit/reglas-por-carpeta.test.ts` lo exige.

## Reglas duras de producto

2. **La IA propone, el humano aprueba.** Las únicas piezas con IA son dos skills de Claude Code a demanda (investigador del catálogo, extractor de resultados): escriben solo en `propuestas/` con salida validada por esquema; hooks bloquean escrituras fuera; jamás aprueban ni confirman un veredicto ni corren en tiempo de ejecución; ninguna fuente se muestra sin verificación por código; el veredicto sugerido lo calcula la regla del catálogo. ADR «código primero» para ambas antes de construirlas. Sin APIs de terceros ni claves.
3. **Frontera de contenido.** Cada prueba describe **qué se verifica, por qué importa, con qué herramienta y qué resultado se espera**, nada más. El repo jamás contiene cargas ni procedimientos operativos. El filtro **marca** para revisión y la persona decide; nunca rechaza solo. Si una redacción se detiene, se reescribe desde ese ángulo, no se omite la prueba.
10. **El conocimiento es dato.** Marcos (con versión y mapa de equivalencias), controles, herramientas, pruebas, escalas, vocabularios de estado y plantillas viven en archivos versionados; agregar una familia, un marco o un adaptador no toca el núcleo; una referencia de marco sin versión se rechaza al cargar; umbrales de vigencia (30/60 días) y fecha de consulta son datos, nunca el reloj.
11. **Normas y marcos:** de ISO/IEC solo identificadores y resúmenes con palabras propias, jamás su texto (`verificado_contra_norma: false` hasta validar contra la norma, deuda antes de G-Release); atribución según la licencia de cada marco (`docs/LICENCIAS-DE-MARCOS.md`, DA-01); una fuente que responde 403 se registra `fuente_no_accesible_al_agente`, nunca se elude.

## Reglas del kit

4. `[siempre]` **Toda salida de LLM que se persista pasa por esquema Zod**; en esta app solo en `propuestas/` (regla dura 2). — § 4
14. `[siempre]` **Código primero, IA generativa después:** una feature LLM exige ADR «código primero» (`decisions/PLANTILLA-ADR-codigo-primero.md`). — § 14

## Patrones de dominio

- **Catálogo como dato con huella:** `src/engine/catalogo/` valida (61 reglas con nombre y severidad), filtra (patrones de forma en `datos/filtro/patrones.json`: marca, no rechaza), calcula el semáforo (umbrales en datos; la familia está como su prueba más atrasada) y emite la instantánea (JCS + SHA-256, gate de publicación). Toda pantalla lee la **instantánea oficial** (`datos/instantaneas/`), nunca los archivos sueltos; **una cuenta, un cálculo** (design-system § 9): lo que varias pantallas muestran sale de una sola función del motor.
- **Vocabulario de estados como dato** (ADR-003): `datos/estados.json` da símbolo, nombre `{es, en}` y rol de color; `ESTADOS_QUE_CALCULA_EL_MOTOR` debe tener etiqueta para cada estado que el motor emite (la matriz de envejecimiento lo exige).
- **Familia `modelo_decision`** (ADR-004): activo demo = clasificador determinista propio que imita el contrato de respuesta de Jev (distribución sobre opciones tipadas + estadístico derivado; `confidence` ≠ probabilidad); las pruebas miden probabilidades, comparan contra la variación por re-ejecución e incluyen paridad ES/EN; Jev real solo como segundo activo, con plan gratuito y su contrato citado (prohíbe pruebas de vulnerabilidad sobre su servicio).
