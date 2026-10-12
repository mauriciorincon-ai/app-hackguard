# HackGuard

**Español.** HackGuard planea, gestiona y valida pruebas de seguridad para software y para sistemas de inteligencia
artificial. No ejecuta pruebas: dice qué conviene verificar en un activo, con qué herramienta y qué resultado se
espera, y recibe los resultados como evidencia que una persona confirma. Un hallazgo no es una vulnerabilidad: es
evidencia de que un control falla.

**English.** HackGuard plans, manages and validates security tests for software and for artificial intelligence
systems. It runs no tests: it says what is worth checking on an asset, with which tool and what result is expected,
and it takes in results as evidence that a person confirms. A finding is not a vulnerability: it is evidence that a
control is failing.

## Empezar · Getting started

Node 22.18 o posterior y pnpm · Node 22.18 or later and pnpm.

```sh
pnpm install
pnpm catalogo:validar
pnpm catalogo:instantanea --fecha 2026-10-15 --salida /tmp/hackguard
pnpm clasificador:demo
pnpm evidencia:validar
pnpm build && pnpm start   # y abre /tablero, /brecha o /brecha/informe · and open /tablero, /brecha or /brecha/informe
```

- **Manual de uso · User manual:** [`docs/MANUAL-DE-USO.md`](docs/MANUAL-DE-USO.md), con cada feature, cómo se usa
  y sus limitaciones · every feature, how to use it and its known limitations.
- **Guía de prueba · Test guide:** [`docs/GUIA-DE-PRUEBA.html`](docs/GUIA-DE-PRUEBA.html).
- **Licencias de los marcos · Framework licences:** [`docs/LICENCIAS-DE-MARCOS.md`](docs/LICENCIAS-DE-MARCOS.md).
- **Decisiones · Decisions:** [`decisions/`](decisions/).

## Dónde vive el código · Where the code lives

- `src/engine/`: el núcleo determinista (catálogo, huellas, semáforo, clasificador demo, activos, planificador, libro de evidencia, lotes, adaptadores de Garak y ZAP, hallazgos, severidad y brecha) · the deterministic core (catalog, fingerprints, traffic light, demo classifier, assets, planner, evidence ledger, batches, Garak and ZAP adapters, findings, severity and gap).
- `src/engine/severidad/`: CVSS 4.0 con la referencia de FIRST fijada por commit (`c5b0d40`), su validador estricto y la tabla de prioridad de IA · CVSS 4.0 with FIRST's reference pinned by commit (`c5b0d40`), its strict validator and the AI priority table.
- `src/cli/`: los comandos que leen `datos/` y llaman al núcleo · the commands that read `datos/` and call the core.
- `src/app/` y `src/components/`: la interfaz, hoy el catálogo, sus fichas, los marcos, los controles, los activos, sus planes, la carga de evidencia, los hallazgos, el tablero, la brecha, la vista por control y el informe (Next.js, exportación estática) · the interface, today the catalog, its records, the frameworks, the controls, the assets, their plans, the evidence intake, the findings, the dashboard, the gap, the control view and the report (Next.js, static export).
- `src/lib/catalogo/`: lo que la pantalla lee de la instantánea oficial · what the screen reads from the official snapshot.
- `datos/`: el catálogo como dato, con su huella, los activos demo con sus planes, la evidencia, los lotes de Garak y ZAP y los hallazgos demo · the catalog as fingerprinted data, the demo assets with their plans, and the demo evidence, the Garak and ZAP batches and the findings.
- `datos/privado/`: lo real (evidencia, hallazgos, activos propios). Está ignorado por git y nunca entra al repositorio · the real data (evidence, findings, own assets). It is git-ignored and never enters the repository.
