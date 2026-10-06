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
```

- **Manual de uso · User manual:** [`docs/MANUAL-DE-USO.md`](docs/MANUAL-DE-USO.md), con cada feature, cómo se usa
  y sus limitaciones · every feature, how to use it and its known limitations.
- **Guía de prueba · Test guide:** [`docs/GUIA-DE-PRUEBA.html`](docs/GUIA-DE-PRUEBA.html).
- **Licencias de los marcos · Framework licences:** [`docs/LICENCIAS-DE-MARCOS.md`](docs/LICENCIAS-DE-MARCOS.md).
- **Decisiones · Decisions:** [`decisions/`](decisions/).

## Dónde vive el código · Where the code lives

- `src/engine/`: el núcleo determinista (catálogo, huellas, semáforo, clasificador demo) · the deterministic core.
- `src/cli/`: los comandos que leen `datos/` y llaman al núcleo · the commands that read `datos/` and call the core.
- `src/app/`: la interfaz (Next.js, exportación estática) · the interface (Next.js, static export).
- `datos/`: el catálogo como dato, con su huella · the catalog as fingerprinted data.
