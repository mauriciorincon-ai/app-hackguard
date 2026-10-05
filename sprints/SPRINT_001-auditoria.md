# Sprint 001 — auditoría final (`/audita-sprint`)

**Estado: Fase 1 en curso. Este archivo es un borrador.**

- El sprint se pausó el 2026-10-04 por la noche, a pedido del usuario.
- Los informes de abajo se guardan tal como los entregaron sus auditores, para que no se pierdan con la sesión.
- **Pendientes de la Fase 1:**
  - consolidar los hallazgos sin duplicados, con el auditor de origen en cada uno;
  - presentar el plan de ajustes al usuario;
  - esperar su aprobación.
- **Nada de la Fase 2 está pagado.**

## Cómo se audita

El diff del sprint contra `main` tiene 169 archivos. Por eso la Fase 1 se partió por superficies (kit v1.38.0). Hay tres auditores independientes, que no construyeron el sprint. Cada uno trabajó en solo lectura sobre su tramo del diff.

| Superficie                                                   | Estado         | Altos · medios · bajos | Recomendación    |
| ------------------------------------------------------------ | -------------- | ---------------------- | ---------------- |
| Alcance y textos                                             | Entregado      | 2 · 8 · 8              | Requiere ajustes |
| Hooks, privacidad, bilingüismo, guía y frontera de contenido | Entregado      | 3 · 5 · 4              | Requiere ajustes |
| Motor, contrato, gates y dependencias                        | Ver el anexo C | —                      | —                |

Ningún auditor encontró un hallazgo crítico.

## Anexo A — Informe del auditor «alcance y textos», tal como lo entregó

### Auditoría S1 de HackGuard, superficie «alcance y textos» (solo lectura)

No modifiqué nada en el repo; `git status` sigue limpio. Las corridas de instantánea fueron a una carpeta temporal fuera del repo, que borré al terminar.

**Lo que corrí:**
- `catalogo:validar` en es, en y `--json`, sobre el catálogo real y con 5 semillas.
- `catalogo:instantanea` en 8 fechas.
- `clasificador:demo` en es y en.
- `vitest run` completo, sin cobertura: **1.149 de 1.149 en 40 archivos**.
- Lectura de los logs de CI 37253753617 y 37252435488.

#### 1. Cobertura de alcance

| # | Ítem del plan o la orden | Estado | Evidencia |
|---|---|---|---|
| 1 | F0 · Verificación del kit (hooks, carnada, TS 6/React 19.3, ADR-001) | Completo | `sprints/SPRINT_001-implementation-log.md:10-16` |
| 2 | F0 · Delta v1.34→v1.39 por nombre (scripts, CI, hook, comandos, constitución, plantilla) | Completo | log:18-40; `CLAUDE.md:9-11, 96-103, 323-332, 440-458, 504-538, 579-583, 658`; `.claude/commands/{audita-sprint,deploy-check}.md` = kit (diff vacío) |
| 3 | F0 · `--coverage` + 90 % en el motor + test de observability | Completo | `package.json:11`; `vitest.config.ts:32-37` |
| 4 | F0 · `datos/privado/` ignorado + README + test | Completo | `git ls-files datos/privado` da solo el README; `tests/unit/datos-privados.test.ts` |
| 5 | F0 · DA-01/DA-10: 14 marcos con versión, fecha, fuente+HTTP, licencia, vías y lista blanca | Completo | `datos/marcos/*.json`; el validador da 4 notas `marco/por-verificar` |
| 6 | F0 · DA-03: 4 patrones de forma con carnada y contraejemplo | Completo | `datos/filtro/patrones.json:9-99`; las carnadas son inocuas |
| 7 | F0 · `docs/LICENCIAS-DE-MARCOS.md` es/en | Con desviación | `:3,:7` afirman algo falso; `:49-53` atribuciones incompletas (hallazgos M2 y M3) |
| 8 | F0 · PR en borrador con la línea del merge + tabla de aprovisionamiento | Completo, cuerpo desactualizado | PR #8 `isDraft:true`, línea 1 correcta; describe solo la fase 0 (B5) |
| 9 | F0 · STOP: tabla DA-01 (marco·versión·fecha·fuente·HTTP·licencia·vía máquina) aprobada | Parcial | Aprobada en el chat (log:131-134); **la tabla no existe en ningún archivo del repo** (A1) |
| 10 | F1 · Esquemas Zod 4 con § 6 + campos de la F1 | Completo | `src/engine/catalogo/esquemas.ts:395-453` (el detalle es del otro auditor) |
| 11 | F1 · Validador: rechazos, advertencias y aprobada+marcada | Completo | 61 reglas (`reglas.ts`); semillas reproducidas: SIN-MARCO 2, SIN-VERSION 2, VERSION-ANTERIOR 1, PATRON-PASOS 1 |
| 12 | F1 · Filtro que marca y no rechaza | Completo | PATRON-PASOS da «38 publicables, 1 pendiente», sale 1 |
| 13 | F1 · Huella JCS + SHA-256 | Completo | Huellas reproducidas (ítem 23) |
| 14 | F1 · CLI `validar`/`instantanea`, `--json`, `--idioma`, códigos 0/1/2/3 | Completo | Reproducido: 1, 2, 3 y 0 |
| 15 | F1 · Semillas C18 | Completo | 19 semillas + `semillas.json`; 11/11 bloqueadas |
| 16 | F2 · Anexo A: 9 áreas, 38 controles, resúmenes propios, `verificado_contra_norma:false`, equivalentes NIST con nota | Completo | `datos/controles/iso42001-anexo-a.json`; conté 201 equivalencias, todas «parcial» |
| 17 | F2 · Herramientas de § 10.4 y E-25, más proveedores TypeSafe si verifican | Completo | 13 archivos; los TypeSafe quedan como dato (`promptfoo.json:56`) |
| 18 | F2 · 21 pruebas de la maqueta + categorías de § 10.1/§ 10.2 + E-22 | Completo, con desviación | Las 21 IDs de la maqueta están; +17 nuevas = 38; 32 categorías cubiertas. DER `emergente` sin declarar (B3) |
| 19 | F2 · Mapa OWASP LLM 2025→2026; «LLM07» sin versión rechazado | Completo | `datos/marcos/equivalencias/owasp-llm-2025-a-2026.json`; reproducido |
| 20 | F2 · Filtro sobre todo el catálogo | Completo, ampliado y declarado | log:335-338 |
| 21 | F2 · STOP: parada 2; parada 3 declarada no corrida | Completo | log:410-411 |
| 22 | F3 · Semáforo por prueba, marco, herramienta y familia; umbrales y estados como dato | Completo | `datos/umbrales.json`, `datos/estados.json` (9 vocabularios, 33 estados). Reproducido: 11-02 vigente, 11-03 por revisar, 12-03 vencido |
| 23 | F3 · Instantáneas, gate de publicación, autoconsistencia | Completo | Re-emití 2026-10-04: **idéntica byte a byte** a `datos/instantaneas/2026-10-04-12d3b632a871.json` (502.746 B) |
| 24 | F3 · Clasificador demo + conjunto bilingüe + métricas + `clasificador:demo` | Completo | Las cifras de log:538-548 coinciden una por una; huella `7d94f4a1…` |
| 25 | F4 · C18 + `demo-rojo` sobre validador, filtro y gate | Completo (desde la fase 1) | log:222-240, 594-601 |
| 26 | F4 · e2e de determinismo en 3 navegadores = Node, con rojo en un solo motor | Completo | `tests/e2e/determinismo.spec.ts:123-163`; el log de CI 37253753617 muestra las 9 huellas iguales |
| 27 | F4 · Tiempos de los dos comandos | Parcial | `instantanea` medida (log:449-450); `validar` sin medición registrada (B1) |
| 28 | F4 · Manual «El catálogo como dato» es/en | Parcial | Faltan 3 de los 5 contenidos de la DoD de `SPRINT_001.md:80-82` (A2) |
| 29 | F4 · Guía: nace, prefijo `hackguard-s1`, ⭐⭐ «1 de 3…3 de 3», declara lo que deja fuera | Con desviación | `GUIA-DE-PRUEBA.html:390`; parada 1 sin su artefacto (A1); E3 fuera del ⭐ sin declararlo (M4) |
| 30 | F4 · ADRs 002, 003 y 004 | Completo | `decisions/002…004` (inexactitud menor en B7) |
| 31 | F4 · `docs/CHANGELOG.md` | Completo | Sus cifras coinciden con los datos |
| 32 | Orden, insumo «§ 11.2: la escala, solo para dejar su tabla en datos» | No implementado ni declarado | `SPRINT_001-orden.md:56-57`; no hay tabla en `datos/` (M5) |
| 33 | Aceptación: todo `por_verificar` listado en el summary | Pendiente, en riesgo | La bitácora lista 3 campos; los datos tienen 4 (M6) |
| 34 | Cero UI y artefactos de diseño intactos | Completo | `git diff` sobre `src/app`, `docs/diseno`, `scripts/maqueta`, `design-*` está vacío |

#### 2. Hallazgos

##### [ALTO] A1 · La tabla DA-01 aprobada en la parada 1 no es un archivo del repo, y la guía manda a confirmarla en un documento que no la contiene
- **Ubicación:**
  - `docs/GUIA-DE-PRUEBA.html:199-209` y `:228`
  - `docs/LICENCIAS-DE-MARCOS.md:22-33`
  - `sprints/SPRINT_001-implementation-log.md:131-134`
- **Qué pasa (confirmado):**
  - La parada 1 del ⭐ dice «Abre `docs/LICENCIAS-DE-MARCOS.md` y recorre la tabla: cada marco con su versión, su fuente, su licencia».
  - «Qué mirar» exige «14, cada uno con versión, fuente con su código HTTP y licencia».
  - Ese documento tiene 8 filas agrupadas y columnas Marco · Licencia · Qué exige · Cómo cumple. **No tiene fuente ni HTTP.**
  - `git grep -i "DA-01"` no encuentra la tabla (marco·versión·fecha·fuente·HTTP·licencia·vía máquina) en ningún archivo: solo vivió en el chat del STOP de la fase 0.
- **Por qué importa:**
  - La parada 1 es obligatoria y no se puede recorrer tal como está escrita.
  - La regla 12 exige que todo entregable sea un archivo del repo.
  - El veredicto del usuario recae sobre un artefacto que no existe.
- **Ajuste ejecutable:**
  1. En `docs/LICENCIAS-DE-MARCOS.md`, antes de `### Tabla de licencias` (línea 22), agregar `### Marcos con versión y fuente (DA-01)` con esta tabla (salida verbatim de los datos):
     ```
     | Marco | Versión | Fecha | Fuente oficial | HTTP | Licencia | Vía legible por máquina |
     |---|---|---|---|---|---|---|
     | `cwe` | 4.20 | por verificar | https://cwe.mitre.org/data/index.html | 200 | Términos de uso de CWE | archivo 206 |
     | `iso-iec-42001` | 2023 | 2023 (día por verificar) | https://www.iso.org/standard/81230.html | 403 (`fuente_no_accesible_al_agente`) | Copyright de ISO/IEC | no |
     | `lista-decision-14` | v1 | 2026-09-26 | https://arxiv.org/abs/2609.32160 | 200 | CC BY 4.0 | interfaz 200; archivo 200 |
     | `mitre-atlas` | 2026.09 | 2026-09-15 | https://atlas.mitre.org/ | 200 | Apache-2.0 | repositorio 200; archivo 206 |
     | `mitre-attack` | 19.2 | 2026-04-28 | https://attack.mitre.org/resources/versions/ | 200 | Términos de uso de ATT&CK | repositorio 200; archivo 206 |
     | `nist-ai-100-2` | E2025 | 2025-03 | https://csrc.nist.gov/pubs/ai/100/2/e2025/final | 200 | Obra de NIST | no |
     | `nist-ai-600-1` | AI 600-1 | 2024-07 | https://doi.org/10.6028/NIST.AI.600-1 | 200 | Obra de NIST | archivo 200 |
     | `nist-ai-rmf` | 1.0 | 2023-01-26 | https://www.nist.gov/itl/ai-risk-management-framework | 200 | Obra de NIST | archivo 200 |
     | `owasp-agentic-top10` | 2026 | 2025-12-10 | https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ | 200 | CC BY-SA 4.0 | archivo 200 |
     | `owasp-asvs` | 5.0.0 | 2025-05-30 | https://owasp.org/www-project-application-security-verification-standard/ | 200 | CC BY-SA 4.0 | repositorio 200; archivo 206 |
     | `owasp-llm-top10` | 2026 | 2026-08-03 | https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ | 200 | CC BY-SA 4.0 | repositorio 200; archivo 200 |
     | `owasp-top10` | 2025 | 2025 (día por verificar) | https://owasp.org/Top10/ | 200 | CC BY-SA 4.0 | repositorio 200 |
     | `owasp-wstg` | 4.2 | 2020-12-03 | https://owasp.org/www-project-web-security-testing-guide/ | 200 | CC BY-SA 4.0 | repositorio 200 |
     | `typesafe-jev` | jev-1.13 | 2026-10-02 | https://docs.typesafe.ai/model-jaggedness/jev-1.13.md | 200 | Sin licencia abierta (términos de TypeSafe) | interfaz 200 |
     ```
     Agregar su gemela en `## English`.
  2. En la guía, línea 201: «recorre la tabla» pasa a «recorre las tablas "Marcos con versión y fuente (DA-01)" y "Tabla de licencias"».
- **Verificación:** `grep -c '^| `' docs/LICENCIAS-DE-MARCOS.md` sube en 28 (14 filas × 2 idiomas). Cada versión y HTTP de la tabla coincide con `datos/marcos/<id>.json`.
- **Casilla:** 6 (guía contra arquitectura) y 1.

##### [ALTO] A2 · El manual no cumple 3 de los 5 contenidos de la DoD
- **Ubicación:**
  - `docs/MANUAL-DE-USO.md:33-92` (es) y `:155-213` (en)
  - DoD en `SPRINT_001.md:80-82` (planeadora)
- **Qué pasa (confirmado):** la DoD pide estructura de `datos/`, los dos comandos, códigos de salida, cómo se agrega una prueba y cómo se marca para revisión.
  - El manual cubre comandos y códigos.
  - **No describe la estructura de `datos/`.**
  - **No dice cómo se agrega una prueba.** Solo cómo probarla con `--agregar`.
  - **No dice cómo se registra la decisión de revisión:** `estado_aprobacion`, `revision_contenido` y el bloque `revision{fecha,por,decision,huella}` (`esquemas.ts:441-451`).
- **Por qué importa:**
  - Es un ítem de la DoD: sin él, la regla de los 6+1 exige que quede como deuda explícita.
  - La parada 2 («revisada_y_aprobada · reescribir · retirar») no tiene un procedimiento escrito.
- **Ajuste ejecutable:** en `docs/MANUAL-DE-USO.md`, después de la línea 81 (fin del paso 5), insertar:
  ```
  - **Dónde vive cada cosa (`datos/`):**
    - `marcos/<id>.json`: un marco por archivo; `marcos/equivalencias/` guarda los mapas entre versiones.
    - `controles/iso42001-anexo-a.json`: la capa de controles por defecto.
    - `herramientas/<id>.json`: una herramienta por archivo.
    - `pruebas/<familia>/<id>.json`: una prueba por archivo, en la carpeta de su familia (`software`, `agente`, `modelo_generativo`, `modelo_decision`).
    - `familias.json`, `reglas-de-veredicto.json`, `rasgos-de-perfil.json`, `umbrales.json`, `estados.json` y `filtro/patrones.json`: los vocabularios.
    - `instantaneas/`: las escribe el comando; no se editan a mano.
    - `privado/`: evidencia de activos reales; git la ignora.
  - **Agregar una prueba:** copia `docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json`, cámbiale el `id` y nombra el archivo igual que el `id`. Escribe en los dos idiomas qué verifica, por qué importa, con qué herramienta y qué se espera (nunca cómo se ejecuta un ataque). Valídala con `pnpm catalogo:validar --agregar <archivo>` hasta que no quede ningún ✗, y muévela a `datos/pruebas/<familia>/`.
  - **Si el filtro la marca** (`filtro/marcada`), no entra a la instantánea hasta que una persona decida: reescribirla para que deje de marcar, retirarla (`"estado_aprobacion": "retirada"`) o aprobarla (`"revision_contenido": "revisada_y_aprobada"`, `"estado_aprobacion": "aprobada"` y un bloque `revision` con fecha, quién, la decisión en los dos idiomas y la huella del contenido revisado).
  ```
  Agregar su versión en inglés, redactada, después de la línea 202.
- **Verificación:** `grep -c "datos/pruebas/<familia>\|revisada_y_aprobada" docs/MANUAL-DE-USO.md` da ≥ 4.
- **Casilla:** 1.

##### [MEDIO] M1 · Una persona no tiene cómo calcular la `revision.huella` que el validador exige para aprobar una prueba marcada
- **Ubicación:**
  - `src/engine/catalogo/validar.ts:453-464` y `:1113-1137`
  - `src/cli/` (ningún comando la expone)
- **Qué pasa (confirmado):**
  - `revision.huella` tiene que igualar a `huellaDeRevision(p)`: el JCS de la prueba sin `revision`, `revision_contenido`, `estado_aprobacion` ni `fecha_verificacion`.
  - Ni el CLI ni el `detalle` de `prueba/revision-desactualizada` o `prueba/aprobada-sin-revision` la muestran (`detalle` va en null).
  - **Plausible:** con cero marcadas en el S1 no se ejerció, pero la primera marcada real no se podrá aprobar sin escribir código.
- **Por qué importa:** RF-01.3 («una persona decide») y la parada 2 dependen de este camino. El texto que pide A2 no se podrá cumplir.
- **Ajuste ejecutable** (coordinar con el auditor de motor):
  - En `validar.ts:1117-1121` y `:1132-1136`, pasar como 4.º argumento ``t(`huella a registrar: ${await huellaDeRevision(p)}`, `fingerprint to record: ${await huellaDeRevision(p)}`)``.
  - Actualizar los casos de esas dos reglas en `tests/unit/catalogo/validar.test.ts`.
- **Verificación:** `pnpm catalogo:validar --agregar docs/kit-de-prueba/semillas/SEMILLA-APROBADA-MARCADA.json` muestra «huella a registrar: <64 hex>». `pnpm vitest run tests/unit/catalogo/validar.test.ts tests/unit/instrumento` queda en verde.
- **Casilla:** 1 y textos.

##### [MEDIO] M2 · `LICENCIAS-DE-MARCOS.md` afirma que el HTTP de cada licencia está registrado, y no lo está
- **Ubicación:** `docs/LICENCIAS-DE-MARCOS.md:3` y `:7`
- **Qué pasa (confirmado):**
  - El documento dice «con la URL de cada licencia consultada con `curl` y su código HTTP registrado en `datos/marcos/<id>.json`».
  - El objeto `licencia` de los 14 marcos solo tiene `nombre`, `url`, `exige` y `como_cumple`, sin `http`.
  - Ninguna URL de licencia aparece en `vias_de_acceso`. La excepción es ISO, cuya URL de licencia es la misma página de la fuente.
- **Por qué importa:** es una afirmación de procedencia falsa en un documento que el usuario aprueba (parada 1).
- **Ajuste ejecutable:**
  - Línea 3: reemplazar «con la URL de cada licencia consultada con `curl` y su código HTTP registrado en `datos/marcos/<id>.json`» por «con la fuente oficial y las vías de acceso de cada marco consultadas con `curl` y su código HTTP registrado en `datos/marcos/<id>.json`; la URL de la licencia se registra sin código HTTP».
  - Línea 7: «Each licence URL was fetched with `curl` and its HTTP code is recorded» pasa a «Each framework's official source and access routes were fetched with `curl` and their HTTP codes are recorded…; the licence URL is recorded without an HTTP code».
- **Verificación:** `grep -n "URL de cada licencia" docs/LICENCIAS-DE-MARCOS.md` sin resultados.
- **Casilla:** regla 27 y normas.

##### [MEDIO] M3 · Las atribuciones no cumplen lo que los propios datos dicen que cada licencia exige
- **Ubicación:**
  - `docs/LICENCIAS-DE-MARCOS.md:49-53`
  - `datos/marcos/lista-decision-14.json` (`editor`), `nist-*.json` (`licencia.exige`)
- **Qué pasa (confirmado):**
  - **arXiv (CC BY 4.0):** «exige: atribución a los autores», pero ni el documento ni los datos nombran a ningún autor (`editor: "arXiv:2609.32160"`).
  - **NIST:** «exige: citar la publicación en el formato recomendado», y el documento solo da los identificadores.
  - **OWASP (CC BY-SA):** se dan títulos y el enlace a la licencia, sin el enlace a la fuente de cada obra.
- **Por qué importa:** la regla dura 11 manda atribuir «según la licencia de cada marco», y el repo es público.
- **Ajuste ejecutable:**
  - Línea 51: agregar los autores tal como figuran en https://arxiv.org/abs/2609.32160, leídos con `curl`, sin suponerlos. Registrarlos también en `lista-decision-14.json` (`notas` o `editor`).
  - Línea 49: citar cada publicación con título, número y DOI:
    - `https://doi.org/10.6028/NIST.AI.100-1`
    - `https://doi.org/10.6028/NIST.AI.600-1`
    - y la de AI 100-2 E2025 tomada de su `fuente_oficial`

    Cada cita, seguida de la leyenda.
  - Línea 37: agregar a cada título OWASP la URL de su `fuente_oficial`.
- **Verificación:** las tres atribuciones contienen autor o DOI o URL de la obra. Los datos no cambian de huella si solo se toca el `.md`.
- **Casilla:** normas (regla 11).

##### [MEDIO] M4 · La guía afirma que los bloques B a F «los respalda la CI», pero E3 es un juicio humano que queda fuera del ⭐ sin declararse
- **Ubicación:**
  - `docs/GUIA-DE-PRUEBA.html:170-172`
  - `:333-338` (E3)
- **Qué pasa (confirmado):** E3 pide juzgar que las notas «se leen natural… redactadas y no traducidas». Ningún test lo verifica. La orden fija el ⭐ en las 3 paradas, pero el encabezado lo presenta como cubierto por la CI.
- **Por qué importa:** es un gate que se encoge sin decirlo (regla 11 de desarrollo, disciplina (b) del ⭐⭐).
- **Ajuste ejecutable:**
  - Líneas 171-172: «Lo demás (bloques B a F) lo respalda la CI y se corre en pases completos: 18 pruebas, ~22 min.» pasa a «Lo demás (bloques B a F) lo respalda la CI y se corre en pases completos: 18 pruebas, ~22 min. La excepción es E3, una lectura de redacción que ninguna prueba automática juzga; queda fuera del ⭐ porque la orden lo fija en las tres paradas».
  - Línea 168: «Deja fuera 0 pruebas ⭐» queda igual.
- **Verificación:** `grep -c "salvo E3\|excepción es E3" docs/GUIA-DE-PRUEBA.html` da 1.
- **Casilla:** 6.

##### [MEDIO] M5 · El insumo de la orden «§ 11.2: la escala, solo para dejar su tabla en datos» no se hizo ni se declaró
- **Ubicación:**
  - `hr01…/ordenes/SPRINT_001-orden.md:56-57`
  - `datos/` (no hay tabla de escala)
  - El plan aprobado tampoco lo incluye
- **Qué pasa (confirmado):**
  - No existe ninguna tabla de la escala de IA en `datos/`.
  - Ni la bitácora ni el plan lo mencionan (`grep "11.2\|escala"` sin resultados).
  - El brief asigna C13 al S3 y descarta la suma de dimensiones.
- **Por qué importa:** una desviación del plan que no se registra queda invisible para la planeadora.
- **Ajuste ejecutable:** en la bitácora, bajo la fase 4, agregar `### Desviación del plan` con este texto:
  > «§ 11.2 (escala de IA) no se deja en datos en el S1: la orden la nombraba entre los insumos, pero ni el plan aprobado ni `SPRINT_001.md` la incluyen; el brief asigna C13 al S3 y la regla dura 7 sustituye la suma de dimensiones por una tabla de prioridad de acción.»

  Repetirlo en el summary y avisar al usuario.
- **Verificación:** `grep -n "11.2" sprints/SPRINT_001-implementation-log.md` da ≥ 1.
- **Casilla:** 1.

##### [MEDIO] M6 · La bitácora lista 3 campos `por_verificar`; los datos tienen 4
- **Ubicación:**
  - `sprints/SPRINT_001-implementation-log.md:85-88` y `:133`
  - `datos/marcos/iso-iec-42001.json` (`por_verificar: [fecha_version, fuente_oficial]`)
- **Qué pasa (confirmado):** `pnpm catalogo:validar` da 4 notas: cwe·fecha, iso·fecha, iso·fuente y owasp-top10·fecha. A la lista de la bitácora le falta la fecha de ISO.
- **Por qué importa:** la aceptación exige que el summary liste todo `por_verificar`, y el summary saldrá de la bitácora.
- **Ajuste ejecutable:** en la línea 88 agregar «- la fecha exacta de ISO/IEC 42001:2023 (la fuente responde 403; solo consta el año);». En la línea 133, «con las tres filas `por_verificar`» pasa a «con sus cuatro campos `por_verificar` en tres marcos».
- **Verificación:** `pnpm catalogo:validar | grep -c marco/por-verificar` da 4, igual al número de viñetas de la bitácora.
- **Casilla:** coherencia.

##### [MEDIO] M7 · El manual pide «Node 22 o posterior», pero el CLI usa type stripping, que Node 22 solo trae activado desde la 22.18 (plausible)
- **Ubicación:**
  - `docs/MANUAL-DE-USO.md:27` y `:149`
  - `package.json` sin `engines`
- **Qué pasa (plausible):** los scripts corren `node src/cli/*.ts` sin flag. En Node 22.0–22.17 eso falla con `ERR_UNKNOWN_FILE_EXTENSION`. No pude reproducirlo porque solo hay Node 24 instalado. La CI usa 22.23.3.
- **Por qué importa:** una persona con un Node 22 LTS anterior no puede seguir el manual.
- **Ajuste ejecutable:**
  - Línea 27: «Necesitas Node 22 o posterior y pnpm.» pasa a «Necesitas Node 22.18 o posterior (el CLI usa el TypeScript nativo de Node) y pnpm.»
  - Línea 149: lo mismo en inglés.
  - Opcional, fuera de mi tramo: `"engines": {"node": ">=22.18"}`.
- **Verificación:** `node -p process.features.typescript` imprime `strip` en la versión mínima declarada.
- **Casilla:** 4.

##### [MEDIO] M8 · `semillas.json` dice «ok» para la semilla de referencia, pero su propio `como_correr` da «con advertencias»
- **Ubicación:** `docs/kit-de-prueba/semillas/semillas.json:6-9` y `:12-19`
- **Qué pasa (confirmado):**
  - `pnpm catalogo:validar --agregar …/SEMILLA-REFERENCIA.json` da «Catálogo: con advertencias» y sale 1, por las 10 pruebas de software.
  - El manifiesto espera `"estado": "ok"` porque el test (`semillas-del-catalogo.test.ts:33-46`) solo cuenta los hallazgos propios de la semilla. El manifiesto no lo explica.
- **Por qué importa:** quien use el kit verá una discrepancia y la reportará como fallo (la guía, bloque C, pide reportar diferencias).
- **Ajuste ejecutable:** añadir al final de `como_correr.es`: « — «espera» describe solo los hallazgos de la semilla: el estado del catálogo entero suma las 10 advertencias de software, así que SEMILLA-REFERENCIA sale «con advertencias» (código 1) sin ningún hallazgo propio». Equivalente en `en`.
- **Verificación:** `pnpm vitest run tests/unit/instrumento` sigue en 22 de 22.
- **Casilla:** 6.

##### [BAJO] B1 · El tiempo de `catalogo:validar` no está medido
- **Ubicación:** bitácora, fase 4
- **Qué pasa:** solo se midió `instantanea` (log:449-450). Yo medí `validar` con `time -p` tres veces: 0,30, 0,31 y 0,36 s en esta máquina y con el entorno de agente. La cifra válida es la del builder.
- **Ajuste ejecutable:** correr `for i in 1 2 3; do /usr/bin/time -p pnpm -s catalogo:validar >/dev/null; done` y anotar el rango en «### Tiempos» de la fase 4 y en el summary.
- **Verificación:** la bitácora tiene una línea «validar: entre X y Y s» posterior a la corrida.
- **Casilla:** 1 y regla 27.

##### [BAJO] B2 · La corrección de la fase 4 (concordancia de número, `0a8228a`) no está en la bitácora
- **Ubicación:** bitácora, fase 4 (no tiene «Bugs y resoluciones»)
- **Qué pasa:** la línea de conteos decía «1 pendientes de revisión». La guía C4 depende de la corrección.
- **Ajuste ejecutable:** agregar a la fase 4 «### Bugs y resoluciones — La línea de conteos en español no concordaba en número («1 publicables», «1 pendientes de revisión»); `0a8228a` lo corrige con su prueba en `tests/unit/catalogo/informe.test.ts`.»
- **Verificación:** `grep -n 0a8228a sprints/SPRINT_001-implementation-log.md` da 1.

##### [BAJO] B3 · Deriva (`PR-MD-DER-001`) es `emergente` sin declararlo frente a E-23 / J E-8
- **Ubicación:** `datos/pruebas/modelo_decision/PR-MD-DER-001.json:64`; `decisions/004-…md:22-23`
- **Qué pasa:** E-23 dice «cuatro de las seis pasan a emergente» y J E-8 nombra calibración, umbral, inyección y límites. Los datos ponen cinco de las seis en `emergente`.
- **Ajuste ejecutable:** en ADR-004, línea 23, agregar: «Drift (`PR-MD-DER-001`) is `emergente`, one more than E-23's four: it is anchored on item R1 of the 14-item checklist, which E-23 accepts as a framework.»
- **Verificación:** `grep -n "PR-MD-DER-001" decisions/004-*.md` da 1.

##### [BAJO] B4 · Tres afirmaciones inexactas en el manual
- **Ubicación:** `docs/MANUAL-DE-USO.md:39/161`, `:99/221` y `:60/182`
- **Qué pasa:**
  - «13 herramientas, cada una con su versión verificada y su licencia»: `hackguard-revision` tiene versión «1» propia y licencia `NOASSERTION`.
  - «Responde con el mismo formato que Jev»: según ADR-004, la anidación de `answers` es nuestra.
  - El ejemplo `--fecha 2026-10-15` sin `--salida` escribe un archivo nuevo dentro de `datos/instantaneas/`, en el repo.
- **Ajuste ejecutable:**
  - L39: «13 herramientas: 12 públicas, cada una con su versión verificada y su licencia, y `hackguard-revision`, la revisión documentada por una persona».
  - L99: «responde con un formato que imita el contrato de respuesta de Jev, de TypeSafe (la anidación de las respuestas es nuestra)».
  - L60: añadir «Para probar sin tocar el repositorio, agrega `--salida /tmp/hackguard`.»
  - Lo mismo en inglés en 161, 221 y 182.
- **Verificación:** `grep -n "mismo formato que Jev" docs/MANUAL-DE-USO.md` sin resultados.
- **Casilla:** 4.

##### [BAJO] B5 · El cuerpo del PR #8 quedó en la fase 0
- **Qué pasa:** dice «Phase 0 (this push)» y «Playwright browsers … added in phase 4», en futuro, aunque ya está hecho.
- **Ajuste ejecutable:** al cierre, `gh pr edit 8 --body-file <archivo>`. La línea del merge va primero, luego un resumen de las 5 fases y la tabla de aprovisionamiento con «Installed by CI (chromium, firefox, webkit)».
- **Verificación:** `gh pr view 8 --json body --jq .body | grep -c "this push"` da 0.

##### [BAJO] B6 · Cuatro textos desfasados en la constitución y los comandos
- **Ubicación:**
  - `CLAUDE.md:81`
  - `CLAUDE.md:110-119` (Estructura)
  - `CLAUDE.md:11` / `:96`
  - `CLAUDE.md:229` vs `.claude/commands/plan-sprint.md:74`
- **Qué pasa:**
  - (a) La regla dura 11 dice la licencia «se fija en la fase 0 del S1», en futuro, aunque ya se fijó.
  - (b) La Estructura no lista `src/cli/`.
  - (c) La cabecera ubica la frase centinela «lo que el proveedor publica no es lo que el build escribe» en el Stack, pero solo existe en la cabecera. Un `grep` se satisface con su propia declaración.
  - (d) La regla 10 dice «Dos clases de mirada»; `plan-sprint` (f) dice «Tres». La contradicción se hereda del kit.
- **Ajuste ejecutable:**
  - (a) «(se fija en la fase 0 del S1)» pasa a «(fijada en la fase 0 del S1: `docs/LICENCIAS-DE-MARCOS.md` y `licencia` en cada `datos/marcos/<id>.json`)».
  - (b) Añadir «├─ cli/            (E/S del catálogo: lee `datos/` y llama al motor)» bajo `├─ app/`.
  - (c) En la línea 96, «**La CI construye COMO EL PROVEEDOR (kit v1.39.0):**» pasa a «**La CI construye COMO EL PROVEEDOR (kit v1.39.0) — lo que el proveedor publica no es lo que el build escribe:**».
  - (d) Registrar «K-S1-4 — la regla 10 del `CLAUDE.md` del kit dice dos clases de mirada y `plan-sprint.md` v1.36 dice tres» en la bitácora, sin editar la regla.
- **Verificación:** `grep -c "lo que el proveedor publica no es lo que el build escribe" CLAUDE.md` da 2, y `grep -n K-S1-4` da 1.

##### [BAJO] B7 · ADR-002 describe mal el contenido de la instantánea
- **Ubicación:** `decisions/002-…md:38-39`
- **Qué pasa:** dice «only publishable tests … plus the freshness semaphore». La instantánea lleva el catálogo entero (11 claves), `pendientes_de_revision` y `advertencias`. ADR-003, el manual y el CHANGELOG lo dicen bien.
- **Ajuste ejecutable:** reemplazar por «**Contents:** the whole catalog (frameworks, maps, controls, tools, vocabularies, thresholds, states) with only its publishable tests, plus the freshness semaphore, the tests awaiting review and the validator's warnings and notes.»
- **Verificación:** `grep -n "whole catalog" decisions/002-*.md` da 1.

##### [BAJO] B8 · Otros textos menores
- **(a) Cita del usuario en dos versiones.** La bitácora dice «Aprobados los marcos, continúa» (`log:132`) y la guía dice «Aprobados lo marcos, continua» (`GUIA:203-204`). Hay que unificar con la cita literal de la conversación, con «(sic)» como en la fase 2.
- **(b) La guía E2 cita una línea que no existe.** «accuracy 20 of 26 · 25 of 26» no sale así: la salida es una fila de tabla, `accuracy 20 of 26 25 of 26`. Cambiarlo por «la fila "accuracy" con 20 of 26 y 25 of 26».
- **(c) Afirmación sin sustento en `PR-MD-COH-001.json:14-15`.** «es la más barata de la familia»: ESTAB e INV tampoco necesitan etiquetas.
  - Propuesta: «y, como la estabilidad y la invariancia, esta prueba no necesita etiquetas».
  - **Aviso:** cualquier cambio en `datos/` cambia las huellas citadas en la guía (D1 `e2858e…`, D2, D5 `12d3b6…` y F1), en ADR-002 y en la bitácora. Ninguna prueba compara las huellas de la guía con el motor. Conviene un test que extraiga las huellas de 64 hex de `GUIA-DE-PRUEBA.html` y las compare con `construirInstantanea` en esas fechas. D5 se rompe con cualquier dato nuevo: o se re-emite la instantánea oficial, o D5 se reescribe.
- **(d) `tiene_adaptador: true` en garak y ZAP.** El campo afirma algo que hoy no existe (no hay `src/engine/adaptadores/`), aunque así lo pide `SPRINT_001.md` y las notas lo aclaran. Añadir en las limitaciones del manual: «garak y ZAP figuran con adaptador, como pide § 10.4; el adaptador que lee sus informes llega en el Sprint 3.»
- **(e) `README.md` es el texto de create-next-app.** Dice «modifying `app/page.tsx`», cuando la ruta real es `src/app/`. Es anterior al sprint: puede apuntar a `docs/MANUAL-DE-USO.md`, sin URL.

#### 3. Lo comprobado sin hallazgo

- **Guía contra el producto (casilla 6):** B1–B4, C1–C4, D1–D5 y E1 dan exactamente el resultado que la guía espera, cifra por cifra.
  - Las huellas `e2858e…`, `0b24f1…`, `39f851…` y `12d3b6…` coinciden.
  - D5 da un archivo idéntico byte a byte al versionado.
  - Las 7 cifras del clasificador coinciden.
  - F1 lo confirma el log de CI: 9 huellas iguales en chromium 153, firefox 155 y webkit 26.6.
  - **C5:** la línea «C18 catálogo: bloquea 11 de 11» no se imprime bajo un agente (Vitest oculta la consola con `CLAUDECODE`/`AI_AGENT`). Al quitar esas variables, aparece. En la terminal del usuario funciona.
- **Evidencia después del hecho (regla 27):**
  - Coinciden: tamaño de la instantánea (502.746 B), cuentas del semáforo, 61 reglas, 19 semillas y 11 de 11, 201 equivalencias, 33 estados, tallies de madurez y uso de herramientas, y versiones de navegadores.
  - La última cuenta de la bitácora, 1.148, es anterior a `0a8228a`. Hoy son 1.149 en 40 archivos: el summary debe usar la cifra nueva.
- **Frontera de contenido (regla 3):** leí las 38 pruebas (es) y en es/en una muestra de 6. Ninguna trae cargas, comandos ni pasos operativos. Las carnadas del filtro son inocuas.
- **Normas (regla 11):** los 38 resúmenes del Anexo A están en palabras propias.
  - **Plausible, de memoria:** 4 nombres de 1–2 palabras («Data provenance», «Data preparation», «Suppliers», «Customers») coinciden con los títulos oficiales. No es texto sustantivo, pero conviene sumarlo a la validación diferida antes de G-Release.
  - Las licencias de `LICENCIAS-DE-MARCOS.md` coinciden con `licencia.nombre` de los 14 marcos.
- **Bilingüe:** en 951 textos `{es,en}` de `datos/` y del kit, las cifras son las mismas en los dos idiomas y ningún idioma está vacío. Leí 6 pruebas en paralelo: dicen lo mismo.

**Recomendación para mi superficie: requiere ajustes.** Lo mínimo para cerrar es A1 y A2, y después los cinco Medios, para que la parada 1 y la DoD del manual puedan cumplirse.

## Anexo B — Informe del auditor «hooks, privacidad, bilingüismo, guía y frontera de contenido», tal como lo entregó

### Auditoría independiente S1 · superficie «hooks, privacidad, bilingüismo, guía y frontera de contenido»

**Veredicto: requiere ajustes.** Hay 3 hallazgos altos, 5 medios y 4 bajos. Ninguno es crítico: no hay secretos, no hay fugas de enlaces, ningún dato privado está versionado y ninguna de las 38 pruebas contiene una carga.

El repo queda intacto: `git status` está limpio y el HEAD sigue en `10c277c`. Trabajé en mi scratchpad porque otro auditor estaba vaciando `/tmp/auditoria-hg` mientras yo lo usaba.

#### Qué pasó bien (comprobado)
- **Rutas que no debían cambiar:** `git diff origin/main...HEAD` sobre `src/app`, `docs/diseno`, `scripts/maqueta`, `design-system.md` y `design-sync` sale vacío.
- **Worktrees:** `git worktree list` muestra solo el checkout principal y no existe `.claude/worktrees`.
- **Secretos:**
  - `gitleaks git --log-opts=origin/main..HEAD` revisó 18 commits: «no leaks found».
  - `gitleaks dir` sobre el árbol de HEAD: «no leaks found».
- **Cero enlaces:** el `git grep` de la regla 17 sale vacío. La única URL propia es la del repo público, en `datos/herramientas/hackguard-revision.json`, y está permitida. No hay rutas locales ni correos en archivos versionados.
- **Datos privados:**
  - `git ls-files datos/privado` devuelve solo el README.
  - El `.gitignore` es correcto y `datos-privados.test.ts` pasa.
  - Las pruebas escriben solo en `os.tmpdir()`.
- **Estados:** `datos/estados.json` tiene 9 vocabularios y 33 estados. Cada uno lleva rol, símbolo y nombre `{es,en}`, y ningún símbolo se repite dentro de un vocabulario. En la terminal, cada estado sale con marca y palabra.
- **Frontera de contenido:**
  - Leí las 38 pruebas una por una (qué verifica, resultado esperado y selectores): ninguna trae una carga ni un procedimiento.
  - Las carnadas de `patrones.json` y de las semillas son inocuas.
  - El filtro recorre todo el catálogo: 0 marcas.
  - El conjunto de referencia no tiene datos personales.
- **Guía de prueba:** la abrí con Playwright en Chromium, Firefox y WebKit, con los temas claro y oscuro, a 320 y a 1024 px.
  - 0 errores de consola y 0 peticiones fuera de `file://`.
  - La clave de `localStorage` es `hackguard-s1:a1` y persiste al recargar.
  - Las 21 pruebas llevan su chip de origen.
  - Los filtros cuentan bien (21/21/3/3) y el contador coincide.
  - Los 6 bloques tienen «Empieza en:» y todas las etiquetas están asociadas.
  - No hay desborde a 320 px y el foco es visible.
  - axe no encuentra nada en el tema oscuro.
- **Pruebas que corrí:** `hook-secretos`, `datos-privados`, `filtro`, `instrumento` y `catalogo-real` dan 93 de 93 en verde en local.

---

##### [ALTO] Nombres y licencias de los marcos escritos en un solo idioma, y el esquema lo permite
- **Ubicación:**
  - `src/engine/catalogo/esquemas.ts:81` (`nombre: Nombre`) y `:97` (`licencia.nombre: Nombre`).
  - `datos/marcos/cwe.json:3` y `:18`; `lista-decision-14.json:3`; `typesafe-jev.json:3` y `:18`; `mitre-atlas.json:20`; `mitre-attack.json:23`; `iso-iec-42001.json:20`; `nist-ai-rmf.json:20`; `nist-ai-600-1.json:19`; `nist-ai-100-2.json:20`.
- **Qué pasa (confirmado):** recorrí con un script todo `datos/`. Aparecen textos redactados por nosotros que viven solo en español:
  - en el nombre: «Common Weakness Enumeration (CWE) y CWE Top 25», «… (lista de 14 ítems)», «TypeSafe — documentación de Jev (límites conocidos del modelo)»;
  - en 8 licencias, por ejemplo «Obra de empleados de NIST (sin copyright en EE. UU.; …)» o «Sin licencia abierta declarada (términos de TypeSafe)».

  La versión inglesa existe solo en `docs/LICENCIAS-DE-MARCOS.md` (tabla «Licence table»). Ese es justo el patrón que la regla 20 prohíbe: «un campo en un idioma más una traducción aparte». Estos campos entran en la instantánea, y el gate «datos bilingües» (`texto/idioma-repetido`) no puede verlos porque no son `{es,en}`.
- **Por qué importa:** la pantalla del S2 los va a mostrar. Cuanto más tarde se corrija, más costoso es: cambia el contrato de datos y la huella.
- **Ajuste ejecutable:**
  1. En `esquemas.ts:97`, dentro de `licencia`, cambiar `nombre: Nombre,` por `nombre: Texto,`.
  2. En los 14 `datos/marcos/*.json`, convertir `licencia.nombre` en `{ "es": <texto actual>, "en": <texto> }`. Los textos en inglés salen de la tabla inglesa de `docs/LICENCIAS-DE-MARCOS.md`:
     - OWASP ×5 → `"CC BY-SA 4.0"`
     - lista-decision-14 → `"CC BY 4.0"`
     - mitre-atlas → `"Apache-2.0 (atlas-data data)"`
     - mitre-attack → `"ATT&CK terms of use (non-exclusive, royalty-free licence)"`
     - cwe → `"CWE terms of use (non-exclusive, royalty-free licence)"`
     - NIST ×3 → `"Work of NIST employees (not subject to copyright in the US; outside the US, a worldwide royalty-free licence)"`
     - typesafe → `"No open licence declared (TypeSafe terms)"`
     - iso → `"ISO/IEC copyright (text not reproducible)"`

     Los textos de menos de 24 caracteres no disparan `idioma-repetido`.
  3. `Marco.nombre` sigue siendo `Nombre`: es el título propio tal como lo publica el editor (comentario en `esquemas.ts:6-7`). Se quitan las glosas en español:
     - `cwe.json:3` → `"Common Weakness Enumeration (CWE)"`;
     - `lista-decision-14.json:3` → `"Typed Decision Models: An Early Evidence Audit and Evaluation Checklist"`;
     - `typesafe-jev.json:3` → el título de la página `https://docs.typesafe.ai/model-jaggedness/jev-1.13.md` copiado literal (leerlo con `curl` y registrar el HTTP).

     Cada glosa pasa a `notas` `{es,en}`: «lista de 14 ítems» / «14-item checklist»; «documentación de los límites conocidos del modelo» / «documentation of the model's known limits». La de CWE (Top 25) ya está en `notas`.
  4. Nuevo invariante en `tests/unit/catalogo/catalogo-real.test.ts`: «ningún `nombre` de marco lleva glosa en español», con `expect(m.nombre).not.toMatch(/[áéíóúñ¿¡]|\b(y|de|del|la|los|las|el)\b/)`. Va con su demo en rojo: restaurar la glosa de `cwe.json` debe poner la prueba en rojo.
  5. Efecto en cadena: las huellas cambian. Hay que actualizar la guía en D1 y F1 (`e2858e62…`), D2 y D5. La instantánea `2026-10-04-12d3b632a871.json` se conserva como registro histórico (su prueba exige autoconsistencia, no igualdad), así que D5 se reescribe así: «hoy la misma fecha da `<nueva>`; la versionada es el registro del 2026-10-04». Ninguna prueba fija esas huellas a mano (comprobado con `git grep`).

  **Alternativa válida:** declararlo como deuda en el summary, pagable antes de la primera pantalla que muestre marcos (S2).
- **Verificación:**
  - `pnpm catalogo:validar` sale 1, con las mismas 10 advertencias y 4 notas.
  - `python3 -c "import json,glob;print([f for f in glob.glob('datos/marcos/*.json') if not isinstance(json.load(open(f))['licencia']['nombre'],dict)])"` → `[]`.
- **Casilla:** bilingüe (regla 20).

##### [ALTO] El filtro de contenido no ve las cargas escritas dentro de una línea, y la parada 2 lo presenta como prueba de que nada operativo pasó
- **Ubicación:** `datos/filtro/patrones.json:19,40,61,81`; `docs/GUIA-DE-PRUEBA.html:210-215`; `docs/MANUAL-DE-USO.md:91` y `:212`.
- **Qué pasa (confirmado con una sonda en Node sobre los patrones reales):** ninguno de estos textos se marca:
  - `<script>alert(1)</script>`
  - `' OR '1'='1' --`
  - «Ignore all previous instructions…»
  - `../../../../etc/passwd`
  - `` `; cat /etc/passwd` ``
  - `{{7*7}}`
  - un bloque con triple comilla invertida sin lenguaje
  - pasos en viñetas
  - un `curl` sangrado
  - `?q=<script>` sin codificar

  Solo se marcan las cuatro formas que fijó DA-03. Hay que precisar dos cosas:
  - Las cuatro formas son exactamente las de la orden: no hay desvío del plan.
  - Una prueba que no se marca puede nacer `aprobada` sin ningún registro de revisión (decisión 7 del plan). Por eso el filtro es la única barrera automática entre una carga escrita en línea y la instantánea publicada.

  Hoy no hay ninguna violación: leí las 38 pruebas.
- **Por qué importa:** el requisito RF-01.3 pide marcar «toda prueba cuyo texto parezca contener cargas». La parada 2 («busca `filtro/marcada`: no debe aparecer») y la orden («el filtro demuestra… que nada operativo pasó») afirman más de lo que el filtro puede ver. Las propuestas del investigador (RF-07.4) pasarán por este mismo filtro.
- **Ajuste ejecutable (lo mínimo, sin decisión de producto):**
  1. `MANUAL-DE-USO.md`, después de la línea 92: «- **Lo que el filtro no ve:** reconoce cuatro formas (bloque de código con intérprete, tres o más pasos numerados, cadena codificada larga y dirección con parámetros de inyección). Una carga corta escrita dentro de una línea (una etiqueta HTML, una comilla seguida de una condición, una ruta con `../`) no tiene ninguna de esas formas y no se marca: la lectura de cada prueba nueva por una persona sigue siendo el control.»
  2. Después de la línea 213, el equivalente en inglés: «- **What the filter does not see:** … a short inline payload … is not flagged: a person reading each new test is still the control.»
  3. En la guía, a2 (línea 214), añadir: «El filtro solo reconoce cuatro formas; por eso esta parada también es leer.»
  4. Al summary o al backlog: «DA-03: la lista inicial no cubre cargas en línea; se revisa con el usuario (RF-01.3 prevé ajustarla)». Se proponen estos patrones de forma, con carnadas inertes, para que el usuario decida:
     - bloque con comillas triples sin lenguaje: carnada `"```\ntexto\n```"`;
     - etiqueta HTML activa `<\s*(?:script|iframe|object|embed|svg)\b|\bon[a-z]+\s*=\s*["']`: carnada `"<script></script>"`;
     - recorrido de ruta `(?:\.\.[\\/]){2,}`: carnada `"../../archivo"`.
- **Verificación:** `grep -n "Lo que el filtro no ve" docs/MANUAL-DE-USO.md` da 1 línea, y `grep -n "What the filter does not see"` da 1.
- **Casilla:** frontera de contenido (regla dura 3).

##### [ALTO] Los errores del clasificador demo mezclan español e inglés y no respetan `--idioma`
- **Ubicación:** `src/engine/demo/conjunto.ts:172-174`, `src/engine/demo/clasificador.ts:260-263` y `src/cli/clasificador-demo.ts:35` (lectura sin envoltorio).
- **Qué pasa (confirmado):** con un conjunto modificado y `--idioma en`, el CLI imprime `conjunto inválido: parametros.repeticiones: Too small: expected number to be >=2`: prefijo en español y cuerpo de Zod en inglés. Lo mismo ocurre con `bins_ece=0` y `ruido_por_mil=900`. Un archivo que no existe da `ENOENT: no such file…`, solo en inglés. Por contraste, el `RangeError` del semáforo (`semaforo.ts:103`) sí es bilingüe.
- **Por qué importa:** `--conjunto` es una opción documentada, así que este texto llega al usuario.
- **Ajuste ejecutable:**
  1. `conjunto.ts:172`:
     ```ts
     const ruta = p.path.map(String).join(".") || "(raíz / root)";
     throw new RangeError(`conjunto inválido en ${ruta} (${p.code}) / invalid set at ${ruta} (${p.code})`);
     ```
  2. `clasificador.ts:260`, igual: `petición inválida en ${ruta} (${p.code}) / invalid request at ${ruta} (${p.code})`.
  3. `clasificador-demo.ts:35`: envolver `readFileSync` y `JSON.parse` en un `try` que relance `new Error(\`error de lectura / read error: ${e.message}\`)`.
  4. Actualizar las pruebas:
     - `tests/unit/demo/clasificador.test.ts:249`: la expresión pasa a `/^petición inválida en .* \/ invalid request at /`;
     - `tests/unit/demo/conjunto.test.ts:128`: pasa a `/conjunto inválido en \(raíz \/ root\)/`.
- **Verificación:** con un conjunto cuyas `repeticiones` valen 1, `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/cli/clasificador-demo.ts --conjunto <archivo> --idioma en` debe imprimir en stderr «invalid set at parametros.repeticiones (too_small)» y salir con 3.
- **Casilla:** bilingüe (regla 20).

##### [MEDIO] La prueba del hook no cubre el caso «falta solo una herramienta»
- **Ubicación:** `.claude/settings.json:12`; `tests/unit/hook-secretos.test.ts:48-73`.
- **Qué pasa (confirmado):** corrí el comando real del hook con gitleaks en el PATH, sin jq, y con la carnada como contenido:
  - el hook original sale 2;
  - mutado de `||` a `&&`, sale 0 y deja pasar la carnada.

  Las 3 pruebas existentes (faltan las dos, `KIT_SIN_GITLEAKS`, están las dos) siguen en verde con esa mutación.
- **Por qué importa:** «gitleaks sí, jq no» es el caso más probable en Windows con Git Bash, que no trae jq. Hoy esa rama de «falla cerrado» no tiene ninguna prueba que la sostenga.
- **Ajuste ejecutable:** en `hook-secretos.test.ts`, añadir:
  ```ts
  const hay = (b: string) => spawnSync("/bin/bash", ["-c", `command -v ${b}`]).status === 0;
  function pathCon(extras: string[]) { const dir = pathSinHerramientas(); for (const b of extras) { const r = spawnSync("/bin/bash", ["-c", `command -v ${b}`], { encoding: "utf8" }); if (r.stdout.trim().startsWith("/")) symlinkSync(r.stdout.trim(), join(dir, b)); } return dir; }
  it.runIf(hay("jq"))("con jq pero sin gitleaks bloquea", () => { const r = correr("hola", { PATH: pathCon(["jq"]) }); expect(r.status).toBe(2); expect(r.stdout).toContain("falta gitleaks o jq"); });
  it.runIf(hay("gitleaks"))("con gitleaks pero sin jq bloquea", () => { const r = correr("hola", { PATH: pathCon(["gitleaks"]) }); expect(r.status).toBe(2); expect(r.stdout).toContain("falta gitleaks o jq"); });
  ```
  La demo en rojo se hace con `demo-rojo.sh`, mutando `||` por `&&` en el `command`: las dos pruebas nuevas tienen que salir en rojo y volver a verde al restaurar. Se registra en la bitácora.
- **Verificación:** `pnpm vitest run tests/unit/hook-secretos.test.ts` debe dar 5 de 5 en local.
- **Casilla:** secretos (regla 7, regla 15).

##### [MEDIO] La prueba que bloquea la carnada nunca corre en la CI
- **Ubicación:** `tests/unit/hook-secretos.test.ts:62` (`it.runIf(hayHerramientas)`); `.github/workflows/ci.yml:33`.
- **Qué pasa (confirmado):** en el log de la corrida 37253753617 aparece `tests/unit/hook-secretos.test.ts (3 tests | 1 skipped)` y en el total `1147 passed | 1 skipped`. El runner de Ubuntu no tiene gitleaks.
- **Por qué importa:** regla 15, «skipped no es verde». La única prueba que demuestra que el hook detecta un secreto no ejecuta en la CI, y la CI no tiene ningún otro escaneo de secretos.
- **Ajuste ejecutable:**
  1. En `ci.yml`, job `quality`, antes de `pnpm test`, un paso que instale gitleaks 8.30.1 (la misma versión que en local) en `$HOME/.local/bin`:
     - descargar `gitleaks_8.30.1_linux_x64.tar.gz` del release;
     - verificar su SHA-256 contra el `checksums.txt` publicado (`sha256sum -c`);
     - `tar -xzf … gitleaks`;
     - `echo "$HOME/.local/bin" >> "$GITHUB_PATH"`.
  2. En la prueba, cambiar `it.runIf(hayHerramientas)` por `it.runIf(hayHerramientas || process.env.CI === "true")`. Así, una CI sin gitleaks sale en rojo en lugar de saltarse la prueba.
  3. La demo en rojo va en un PR desechable sin el paso de instalación: `quality` debe salir en rojo.

  **Alternativa:** declarar la prueba `manual` en el summary, con su corrida local registrada.
- **Verificación:** con `gh run view <id> --log | grep hook-secretos` debe verse `(3 tests)` sin «skipped».
- **Casilla:** secretos (regla 15).

##### [MEDIO] `instantanea --agregar` escribe en la carpeta versionada un derivado que viene de fuera de `datos/`, con la ruta de la máquina dentro
- **Ubicación:** `src/cli/catalogo.ts:83` (salida por defecto `datos/instantaneas`); `src/cli/cargar.ts:67` (`path.relative` de un archivo externo).
- **Qué pasa:**
  - **Confirmado:** `instantanea --fecha 2026-10-15 --agregar <archivo fuera del repo con advertencia> --salida <tmp>` emite el archivo y deja en `advertencias[].ruta` el valor `"../../../../private/tmp/claude-501/-Users-henryrincon-…/SEMILLA-SIN-CONTROL.json"`. Ahí van el nombre del usuario y la estructura local. Además, la huella pasa a depender de la máquina, lo que rompe la promesa del manual de «la misma huella en cualquier computador».
  - **Plausible:** sin `--salida`, el CLI escribiría en `datos/instantaneas/`, que está versionada, aunque el archivo agregado venga de `datos/privado/`. El archivo nace con permisos 644, y nada lo impide (regla 17-bis(a)).
- **Por qué importa:** un solo comando basta para que un borrador privado y la ruta del equipo terminen en el repo público.
- **Ajuste ejecutable:**
  1. En `catalogo.ts`, dentro de la rama `instantanea` y antes de `construirInstantanea`:
     ```ts
     if (o.agregar.length > 0 && (o.salida === undefined || path.resolve(o.salida) === path.resolve("datos/instantaneas")))
       throw new ErrorDeUso("--agregar exige --salida fuera de datos/instantaneas/ / --agregar requires --salida outside datos/instantaneas/");
     ```
  2. En `cargar.ts:67`, para cada archivo agregado: si `path.relative(raiz, abs)` empieza por `..`, usar como ruta `agregado/${path.basename(abs)}`; si no, la relativa de hoy. Así siguen funcionando la guía (C1–C4, D4) y `semillas-del-catalogo.test.ts`, que arma sus rutas por su cuenta.
  3. Pruebas nuevas en `tests/unit/catalogo/cli.test.ts`:
     - (a) `instantanea --fecha 2026-10-15 --agregar docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json` sin `--salida` sale 3 y no crea ningún archivo nuevo en `datos/instantaneas`;
     - (b) un archivo externo con advertencia deja `ruta` = `agregado/<nombre>`.

     Cada una con su demo en rojo.
- **Verificación:** `git status --porcelain datos/instantaneas` vacío después de (a); `grep -c '"ruta": "\.\./' <instantánea>` igual a 0.
- **Casilla:** privacidad (reglas 8 y 17-bis).

##### [MEDIO] Guía: contraste de 4,44:1 en las celdas de valor del tema claro
- **Ubicación:** `docs/GUIA-DE-PRUEBA.html:74` (`--ok: #4f7a4a`) y `:146` (`td.valor`).
- **Qué pasa (confirmado):** axe da `color-contrast(serious) x15` en tema claro en los tres motores: #4f7a4a sobre #f2f2ef = 4,44 (el mínimo es 4,5). El tema oscuro está limpio.
- **Ajuste ejecutable:** en la línea 74, dentro del `:root` claro, cambiar `--ok: #4f7a4a;` por `--ok: #477043;`. Calculado: 5,11 sobre #f2f2ef, 5,53 sobre #fbfbfa y 4,53 sobre #dde6ec.
- **Verificación:** axe con wcag2aa sobre `file://…/GUIA-DE-PRUEBA.html`, `colorScheme: "light"` → 0 violaciones en Chromium, Firefox y WebKit.
- **Casilla:** a11y de la guía (regla 11).

##### [MEDIO] Guía D1: cuenta archivos sin decir desde qué estado parte
- **Ubicación:** `docs/GUIA-DE-PRUEBA.html:290-295`.
- **Qué pasa (confirmado leyendo):** D1 espera «en `/tmp/hackguard` un solo archivo», pero D2, D3 y D5 escriben en esa misma carpeta. Al repetir el bloque (el gate se corre por bloques, y volver a probar tras un arreglo es parte del gate) salen 4 archivos. Eso contradice la regla 9 que la propia guía declara en su cabecera.
- **Ajuste ejecutable:** en las líneas 290 y 292, D1 usa su propia carpeta: `--salida /tmp/hackguard-d1` en «Empieza en:» y en el paso. El esperado pasa a «en `/tmp/hackguard-d1` un solo archivo, `2026-10-15-<huella12>.json`, aunque repitas el bloque». Como el CLI no reescribe un archivo con la misma huella, sigue habiendo uno solo.
- **Verificación:** correr D1, D2, D5 y otra vez D1: `ls /tmp/hackguard-d1 | wc -l` debe dar 1.
- **Casilla:** guía (regla 11).

##### [BAJO] Identificadores en español dentro de la salida en inglés
- **Ubicación:**
  - `src/engine/demo/conjunto.ts:333` y `:351`: «Choice: aprobar · rechazar · revisar» y «the band: “aprobar”».
  - `src/engine/catalogo/validar.ts:900`, `:926` y `:1146`: el detalle de `filtro/marcada` muestra el id «pasos-imperativos» aunque el patrón tiene `nombre` `{es,en}`.
  - `src/cli/catalogo.ts:79`: «--fecha AAAA-MM-DD» en modo inglés.
  - `src/cli/catalogo.ts:65`: `--agregar <archivo>` no dice que el archivo no existe.
- **Qué pasa (confirmado):** salen así en `--idioma en`.
- **Ajuste ejecutable:**
  - En el detalle de `filtro/marcada`, usar `{ es: «nombre.es», en: “nombre.en” }` del patrón.
  - En el informe del demo en inglés, añadir glosas (`aprobar (approve) · rechazar (reject) · revisar (review)`).
  - `ErrorDeUso` con texto bilingüe: `--fecha AAAA-MM-DD / --fecha YYYY-MM-DD` y `--agregar: no existe / does not exist: <archivo>`.
- **Verificación:** con `--agregar docs/kit-de-prueba/semillas/SEMILLA-PATRON-PASOS.json --idioma en` sale «Step-by-step imperative sequence».
- **Casilla:** bilingüe.

##### [BAJO] Una familia sin pruebas publicadas se imprime sin marca
- **Ubicación:** `src/engine/catalogo/informe.ts:156-160`.
- **Qué pasa (confirmado leyendo):** «sin pruebas publicadas N» se imprime sin símbolo. El vocabulario `vigencia` no tiene un estado para ese caso, así que la pantalla del S2 heredará el mismo hueco. Hoy no ocurre, porque las 4 familias tienen pruebas.
- **Ajuste ejecutable:** añadir a `datos/estados.json`, vocabulario `vigencia`, el estado `{ "id": "sin_pruebas", "rol": "neutro", "simbolo": "vacio", "nombre": { "es": "Sin pruebas publicadas", "en": "No published tests" } }` y pintarlo con `MARCAS.vacio`. También puede quedar como backlog del S2.
- **Casilla:** el color nunca solo (regla dura 12).

##### [BAJO] La cita del usuario no coincide entre la guía y la bitácora
- **Ubicación:** `docs/GUIA-DE-PRUEBA.html:203-204` («Aprobados lo marcos, continua») frente a `sprints/SPRINT_001-implementation-log.md:132` («Aprobados los marcos, continúa»).
- **Ajuste ejecutable:** dejar las dos con el texto literal del usuario, con «(sic)» si se conservan las erratas, como ya se hizo en la línea 411.
- **Casilla:** evidencia (regla 27).

##### [BAJO] La guía está solo en español
- **Ubicación:** `docs/GUIA-DE-PRUEBA.html` (`lang="es-CO"`).
- **Qué pasa (plausible, es una interpretación):** la regla 20 pide «documentos» bilingües y la guía se declara también «entregable para usuarios finales». Hay precedente en las dos direcciones: planlang tiene la guía bilingüe y big-d no. La orden no lo exige.
- **Ajuste:** que lo decida la planeadora; si no se hace ahora, anotarlo en el summary.
- **Casilla:** bilingüe.

---

**Casilla 8 (protecciones del sistema tocadas): ninguna.**
- Busqué en el diff Llavero, TCC, launchd o LaunchAgents, Touch ID, `osascript`, certificados, `sudo`, micrófono y cámara: no aparece nada.
- `pnpm test` solo lanza `bash`, `git`, `node` y gitleaks, y escribe en `os.tmpdir()`.
- `verificar-dependencias.test.ts` inyecta la consulta al registro, así que no sale a la red.
- Las reglas 24 y 25 se cumplen.
- Regla 26: no hay worktrees.

**Para mi superficie: requiere ajustes.** Los 3 altos hay que corregirlos o declararlos como deuda en el summary con su sprint de pago. Los medios del hook (2), de `--agregar` y de la guía (2) son cambios acotados.

## Anexo C — Informe del auditor «motor, contrato, gates y dependencias»

Todavía no llega. Se le pidió cerrar con lo revisado y listar «Lo que no alcancé a revisar».
