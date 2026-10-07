# Licencias de los marcos · Framework licences

> Verificado el 2026-10-04 (S1, fase 0) y, en la auditoría, el 2026-10-05: ese día se descargó entero el archivo de
> CWE (de ahí su fecha y su «archivo 200») y se resolvieron los autores de arXiv:2609.32160 y los DOI de NIST. La
> fuente oficial y las vías de acceso de cada marco se consultaron con `curl`, y su código HTTP está registrado en
> `datos/marcos/<id>.json`; la URL de la licencia se registra sin código HTTP. La licencia de cada marco es dato:
> este documento la explica y dice cómo la cumple HackGuard.
>
> Checked on 2026-10-04 (S1, phase 0) and, in the audit, on 2026-10-05: that day CWE's archive was downloaded whole
> (hence its date and its "file 200"), and the arXiv:2609.32160 authors and the NIST DOIs were resolved. Each
> framework's official source and access routes were fetched with `curl`, and their HTTP codes are recorded in
> `datos/marcos/<id>.json`; the licence URL is recorded without an HTTP code.
> Each framework's licence is data; this document explains it and how HackGuard complies.

## Español

### La regla de la app

HackGuard **no reproduce el texto de ningún marco**. Guarda:

- identificadores (`LLM01`, `AML.T0051`, `CWE-79`, `iso42001-A.6.2.4`);
- el nombre de cada entrada cuando el marco lo publica y la licencia lo permite;
- resúmenes **escritos con palabras propias**.

De ISO/IEC solo se usan identificadores y resúmenes propios, jamás su texto (regla dura 11).

### Marcos con versión y fuente (DA-01)

La tabla de la parada 1, tal como está hoy en `datos/marcos/<id>.json`. «Vía legible por máquina» lista
las vías de acceso que no son la página, con su código HTTP. Un 206 es un pedido de un solo byte: el archivo existe y
responde, pero no se descargó entero.

| Marco                 | Versión  | Fecha                    | Fuente oficial                                                                   | HTTP                                  | Licencia                                                                           | Vía legible por máquina                                            |
| --------------------- | -------- | ------------------------ | -------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `cwe`                 | 4.20     | 2026-04-30               | https://cwe.mitre.org/data/index.html                                            | 200                                   | Términos de uso de CWE (licencia no exclusiva y sin regalías)                      | archivo 200                                                        |
| `iso-iec-42001`       | 2023     | 2023 (día por verificar) | https://www.iso.org/standard/81230.html                                          | 403 (`fuente_no_accesible_al_agente`) | Copyright de ISO/IEC (texto no reproducible)                                       | no                                                                 |
| `lista-decision-14`   | v1       | 2026-09-26               | https://arxiv.org/abs/2609.32160                                                 | 200                                   | CC BY 4.0                                                                          | interfaz 200; archivo 200                                          |
| `mitre-atlas`         | 2026.09  | 2026-09-15               | https://atlas.mitre.org/                                                         | 200                                   | Apache-2.0 (datos de atlas-data)                                                   | repositorio 200; archivo 206; canal de novedades 206               |
| `mitre-attack`        | 19.2     | 2026-04-28               | https://attack.mitre.org/resources/versions/                                     | 200                                   | Términos de uso de ATT&CK (licencia no exclusiva y sin regalías)                   | repositorio 200; archivo 206; canal de novedades 206               |
| `nist-ai-100-2`       | E2025    | 2025-03                  | https://csrc.nist.gov/pubs/ai/100/2/e2025/final                                  | 200                                   | Obra de empleados de NIST (sin copyright en EE. UU.; fuera, licencia sin regalías) | no                                                                 |
| `nist-ai-600-1`       | AI 600-1 | 2024-07                  | https://doi.org/10.6028/NIST.AI.600-1                                            | 200                                   | Obra de empleados de NIST (sin copyright en EE. UU.; fuera, licencia sin regalías) | archivo 200                                                        |
| `nist-ai-rmf`         | 1.0      | 2023-01-26               | https://www.nist.gov/itl/ai-risk-management-framework                            | 200                                   | Obra de empleados de NIST (sin copyright en EE. UU.; fuera, licencia sin regalías) | archivo 200; canal de novedades 206                                |
| `owasp-agentic-top10` | 2026     | 2025-12-10               | https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ | 200                                   | CC BY-SA 4.0                                                                       | archivo 200; canal de novedades 200                                |
| `owasp-asvs`          | 5.0.0    | 2025-05-30               | https://owasp.org/www-project-application-security-verification-standard/        | 200                                   | CC BY-SA 4.0                                                                       | repositorio 200; archivo 206; canal de novedades 206               |
| `owasp-llm-top10`     | 2026     | 2026-08-03               | https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/                    | 200                                   | CC BY-SA 4.0                                                                       | repositorio 200; archivo 200; canal de novedades 200; descarga 200 |
| `owasp-top10`         | 2025     | 2025 (día por verificar) | https://owasp.org/Top10/                                                         | 200                                   | CC BY-SA 4.0                                                                       | repositorio 200; canal de novedades 206                            |
| `owasp-wstg`          | 4.2      | 2020-12-03               | https://owasp.org/www-project-web-security-testing-guide/                        | 200                                   | CC BY-SA 4.0                                                                       | repositorio 200; canal de novedades 206                            |
| `typesafe-jev`        | jev-1.13 | 2026-10-02               | https://docs.typesafe.ai/model-jaggedness/jev-1.13.md                            | 200                                   | Sin licencia abierta declarada (términos de TypeSafe)                              | interfaz 200                                                       |

### Tabla de licencias

| Marco                                                                                                                                       | Licencia                                                                                             | Qué exige                                                                                       | Cómo lo cumple HackGuard                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OWASP Top 10 for LLM Applications 2026 · OWASP Top 10 for Agentic Applications 2026 · OWASP ASVS 5.0.0 · OWASP WSTG 4.2 · OWASP Top 10:2025 | CC BY-SA 4.0                                                                                         | Atribución a OWASP con enlace a la licencia; lo que se adapte se comparte con la misma licencia | Cita identificador y nombre de cada entrada con la atribución de abajo; los resúmenes son propios y no adaptan el texto del marco                                                    |
| MITRE ATLAS 2026.09                                                                                                                         | Apache-2.0 (datos de `atlas-data`)                                                                   | Conservar el aviso de copyright y la licencia en las copias de los datos                        | Cita identificadores de técnicas; no redistribuye el archivo de datos                                                                                                                |
| MITRE ATT&CK 19.2                                                                                                                           | Términos de uso de ATT&CK: licencia no exclusiva y sin regalías                                      | Reproducir la designación de copyright de MITRE y la licencia en toda copia                     | Cita identificadores y reproduce el aviso de abajo                                                                                                                                   |
| CWE 4.20 · 2025 CWE Top 25                                                                                                                  | Términos de uso de CWE: licencia no exclusiva y sin regalías                                         | Reproducir la designación de copyright de MITRE y la licencia en toda copia                     | Cita identificadores (`CWE-…`) y reproduce el aviso de abajo                                                                                                                         |
| NIST AI RMF 1.0 · NIST AI 600-1 · NIST AI 100-2 E2025                                                                                       | Obra de empleados de NIST: sin copyright en EE. UU.; fuera de EE. UU., licencia mundial sin regalías | Citar la publicación en el formato recomendado, seguido de la leyenda de NIST                   | Cita publicación e identificador con la leyenda de abajo                                                                                                                             |
| TypeSafe — documentación de Jev (jev-1.13)                                                                                                  | Sin licencia abierta declarada (términos de TypeSafe)                                                | No hay permiso de reproducción                                                                  | Guarda versión, fecha de revisión y nombre de cada modo de falla como dato con fuente; no copia texto                                                                                |
| arXiv:2609.32160 (lista de 14 ítems)                                                                                                        | CC BY 4.0                                                                                            | Atribución a los autores con enlace a la licencia                                               | Cita el artículo y el identificador de cada ítem; los nombres son paráfrasis breves                                                                                                  |
| ISO/IEC 42001:2023                                                                                                                          | Copyright de ISO/IEC                                                                                 | El texto no se reproduce                                                                        | Solo identificadores de controles y resúmenes propios, marcados `verificado_contra_norma: false`. La fuente responde 403 a un agente (`fuente_no_accesible_al_agente`) y no se elude |

### Atribuciones y avisos

- **OWASP** (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/), de la OWASP Foundation. HackGuard
  cita identificadores y nombres; no modifica ni redistribuye los documentos.
  - «OWASP Top 10 for LLM Applications 2026» (OWASP GenAI Security Project):
    https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
  - «OWASP Top 10 for Agentic Applications for 2026» (OWASP GenAI Security Project):
    https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
  - «OWASP Application Security Verification Standard 5.0.0»:
    https://owasp.org/www-project-application-security-verification-standard/
  - «OWASP Web Security Testing Guide 4.2»: https://owasp.org/www-project-web-security-testing-guide/
  - «OWASP Top 10:2025»: https://owasp.org/Top10/
- **MITRE ATT&CK®:** «© 2026 The MITRE Corporation. This work is reproduced and distributed with the
  permission of The MITRE Corporation.» Licencia:
  https://attack.mitre.org/resources/legal-and-branding/terms-of-use/
- **CWE™:** «Copyright © 2006–2026, The MITRE Corporation.» Se usa conforme a los términos de uso de CWE
  (https://cwe.mitre.org/about/termsofuse.html). CWE es una marca de The MITRE Corporation.
- **MITRE ATLAS™:** datos bajo Apache-2.0, «Copyright 2021-2026 MITRE»
  (https://github.com/mitre-atlas/atlas-data/blob/main/LICENSE).
- **NIST**, cada publicación con su título, su número y su DOI (resueltos el 2026-10-05), seguida de la leyenda
  de NIST:
  - National Institute of Standards and Technology, «Artificial Intelligence Risk Management Framework (AI RMF
    1.0)», NIST AI 100-1, https://doi.org/10.6028/NIST.AI.100-1
  - National Institute of Standards and Technology, «Artificial Intelligence Risk Management Framework: Generative
    Artificial Intelligence Profile», NIST AI 600-1, https://doi.org/10.6028/NIST.AI.600-1
  - National Institute of Standards and Technology, «Adversarial Machine Learning: A Taxonomy and Terminology of
    Attacks and Mitigations», NIST AI 100-2 E2025, https://doi.org/10.6028/NIST.AI.100-2e2025
  - «Republished courtesy of the National Institute of Standards and Technology.»
- **arXiv:2609.32160:** Lijuan Tang y Yuemeng Zheng, «Typed Decision Models: An Early Evidence Audit and
  Evaluation Checklist», https://arxiv.org/abs/2609.32160, CC BY 4.0
  (https://creativecommons.org/licenses/by/4.0/). Los autores se leyeron de la página del artículo (HTTP 200,
  2026-10-05).
- **TypeSafe:** documentación de Jev, citada sin reproducir su texto (https://typesafe.ai/legal/terms).
- **ISO/IEC 42001:2023:** solo identificadores; ISO tiene los derechos del texto.

## English

### The app's rule

HackGuard **does not reproduce any framework's text**. It stores:

- identifiers;
- each entry's name, when the framework publishes it and its licence allows;
- summaries **written in its own words**.

From ISO/IEC it uses only identifiers and its own summaries, never the standard's text (hard rule 11).

### Frameworks with version and source (DA-01)

The stop 1 table, as it stands today in `datos/marcos/<id>.json`. «Machine-readable route» lists the access
routes other than the page, with their HTTP code. A 206 is a one-byte request: the file exists and answers, but it was
not downloaded whole.

| Framework             | Version  | Date                      | Official source                                                                  | HTTP                                  | Licence                                                                                         | Machine-readable route                           |
| --------------------- | -------- | ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `cwe`                 | 4.20     | 2026-04-30                | https://cwe.mitre.org/data/index.html                                            | 200                                   | CWE terms of use (non-exclusive, royalty-free licence)                                          | file 200                                         |
| `iso-iec-42001`       | 2023     | 2023 (day to be verified) | https://www.iso.org/standard/81230.html                                          | 403 (`fuente_no_accesible_al_agente`) | ISO/IEC copyright (text not reproducible)                                                       | no                                               |
| `lista-decision-14`   | v1       | 2026-09-26                | https://arxiv.org/abs/2609.32160                                                 | 200                                   | CC BY 4.0                                                                                       | interface 200; file 200                          |
| `mitre-atlas`         | 2026.09  | 2026-09-15                | https://atlas.mitre.org/                                                         | 200                                   | Apache-2.0 (atlas-data data)                                                                    | repository 200; file 206; feed 206               |
| `mitre-attack`        | 19.2     | 2026-04-28                | https://attack.mitre.org/resources/versions/                                     | 200                                   | ATT&CK terms of use (non-exclusive, royalty-free licence)                                       | repository 200; file 206; feed 206               |
| `nist-ai-100-2`       | E2025    | 2025-03                   | https://csrc.nist.gov/pubs/ai/100/2/e2025/final                                  | 200                                   | Work of NIST employees (not subject to copyright in the US; outside it, a royalty-free licence) | no                                               |
| `nist-ai-600-1`       | AI 600-1 | 2024-07                   | https://doi.org/10.6028/NIST.AI.600-1                                            | 200                                   | Work of NIST employees (not subject to copyright in the US; outside it, a royalty-free licence) | file 200                                         |
| `nist-ai-rmf`         | 1.0      | 2023-01-26                | https://www.nist.gov/itl/ai-risk-management-framework                            | 200                                   | Work of NIST employees (not subject to copyright in the US; outside it, a royalty-free licence) | file 200; feed 206                               |
| `owasp-agentic-top10` | 2026     | 2025-12-10                | https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ | 200                                   | CC BY-SA 4.0                                                                                    | file 200; feed 200                               |
| `owasp-asvs`          | 5.0.0    | 2025-05-30                | https://owasp.org/www-project-application-security-verification-standard/        | 200                                   | CC BY-SA 4.0                                                                                    | repository 200; file 206; feed 206               |
| `owasp-llm-top10`     | 2026     | 2026-08-03                | https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/                    | 200                                   | CC BY-SA 4.0                                                                                    | repository 200; file 200; feed 200; download 200 |
| `owasp-top10`         | 2025     | 2025 (day to be verified) | https://owasp.org/Top10/                                                         | 200                                   | CC BY-SA 4.0                                                                                    | repository 200; feed 206                         |
| `owasp-wstg`          | 4.2      | 2020-12-03                | https://owasp.org/www-project-web-security-testing-guide/                        | 200                                   | CC BY-SA 4.0                                                                                    | repository 200; feed 206                         |
| `typesafe-jev`        | jev-1.13 | 2026-10-02                | https://docs.typesafe.ai/model-jaggedness/jev-1.13.md                            | 200                                   | No open licence declared (TypeSafe terms)                                                       | interface 200                                    |

### Licence table

| Framework                                                                                                                                   | Licence                                                                                                      | What it requires                                                                                   | How HackGuard complies                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OWASP Top 10 for LLM Applications 2026 · OWASP Top 10 for Agentic Applications 2026 · OWASP ASVS 5.0.0 · OWASP WSTG 4.2 · OWASP Top 10:2025 | CC BY-SA 4.0                                                                                                 | Attribution to OWASP with a link to the licence; adapted material is shared under the same licence | It cites each entry's identifier and name with the attribution above; summaries are its own and do not adapt the framework's text                                                 |
| MITRE ATLAS 2026.09                                                                                                                         | Apache-2.0 (`atlas-data` data)                                                                               | Keep the copyright notice and the licence in copies of the data                                    | It cites technique identifiers; it does not redistribute the data file                                                                                                            |
| MITRE ATT&CK 19.2                                                                                                                           | ATT&CK terms of use: non-exclusive, royalty-free licence                                                     | Reproduce MITRE's copyright designation and the licence in any copy                                | It cites identifiers and reproduces the notice above                                                                                                                              |
| CWE 4.20 · 2025 CWE Top 25                                                                                                                  | CWE terms of use: non-exclusive, royalty-free licence                                                        | Reproduce MITRE's copyright designation and the licence in any copy                                | It cites identifiers (`CWE-…`) and reproduces the notice above                                                                                                                    |
| NIST AI RMF 1.0 · NIST AI 600-1 · NIST AI 100-2 E2025                                                                                       | Work of NIST employees: not subject to copyright in the US; outside the US, a worldwide royalty-free licence | Cite the publication in the recommended format, followed by NIST's notice                          | It cites the publication and identifier with the notice above                                                                                                                     |
| TypeSafe — Jev documentation (jev-1.13)                                                                                                     | No open licence declared (TypeSafe terms)                                                                    | No reproduction permission                                                                         | It stores version, review date and each failure mode's name as sourced data; it copies no text                                                                                    |
| arXiv:2609.32160 (14-item checklist)                                                                                                        | CC BY 4.0                                                                                                    | Attribution to the authors with a link to the licence                                              | It cites the paper and each item's identifier; names are short paraphrases                                                                                                        |
| ISO/IEC 42001:2023                                                                                                                          | ISO/IEC copyright                                                                                            | The text is not reproduced                                                                         | Control identifiers and its own summaries only, marked `verificado_contra_norma: false`. The source answers 403 to an agent (`fuente_no_accesible_al_agente`) and is not bypassed |

The attributions and notices are the ones listed in the Spanish section above (MITRE and NIST notices are quoted
verbatim in their original English).
