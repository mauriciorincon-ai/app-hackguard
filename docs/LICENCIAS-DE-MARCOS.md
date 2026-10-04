# Licencias de los marcos · Framework licences

> Verificado el 2026-10-04 (S1, fase 0), con la URL de cada licencia consultada con `curl` y su código HTTP
> registrado en `datos/marcos/<id>.json`. La licencia de cada marco es dato: este documento la explica y dice
> cómo la cumple HackGuard.
>
> Checked on 2026-10-04 (S1, phase 0). Each licence URL was fetched with `curl` and its HTTP code is recorded in
> `datos/marcos/<id>.json`. Each framework's licence is data; this document explains it and how HackGuard complies.

## Español

### La regla de la app

HackGuard **no reproduce el texto de ningún marco**. Guarda:

- identificadores (`LLM01`, `AML.T0051`, `CWE-79`, `iso42001-A.6.2.4`);
- el nombre de cada entrada cuando el marco lo publica y la licencia lo permite;
- resúmenes **escritos con palabras propias**.

De ISO/IEC solo se usan identificadores y resúmenes propios, jamás su texto (regla dura 11).

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

- **OWASP** (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/): «OWASP Top 10 for LLM
  Applications 2026», «OWASP Top 10 for Agentic Applications for 2026» (OWASP GenAI Security Project),
  «OWASP Application Security Verification Standard 5.0.0», «OWASP Web Security Testing Guide 4.2» y
  «OWASP Top 10:2025», de la OWASP Foundation. HackGuard cita identificadores y nombres; no modifica ni
  redistribuye los documentos.
- **MITRE ATT&CK®:** «© 2026 The MITRE Corporation. This work is reproduced and distributed with the
  permission of The MITRE Corporation.» Licencia:
  https://attack.mitre.org/resources/legal-and-branding/terms-of-use/
- **CWE™:** «Copyright © 2006–2026, The MITRE Corporation.» Se usa conforme a los términos de uso de CWE
  (https://cwe.mitre.org/about/termsofuse.html). CWE es una marca de The MITRE Corporation.
- **MITRE ATLAS™:** datos bajo Apache-2.0, «Copyright 2021-2026 MITRE»
  (https://github.com/mitre-atlas/atlas-data/blob/main/LICENSE).
- **NIST:** NIST AI 100-1 (AI RMF 1.0), NIST AI 600-1 y NIST AI 100-2 E2025. «Republished courtesy of the
  National Institute of Standards and Technology.»
- **arXiv:2609.32160:** «Typed Decision Models: An Early Evidence Audit and Evaluation Checklist», CC BY 4.0
  (https://creativecommons.org/licenses/by/4.0/).
- **TypeSafe:** documentación de Jev, citada sin reproducir su texto (https://typesafe.ai/legal/terms).
- **ISO/IEC 42001:2023:** solo identificadores; ISO tiene los derechos del texto.

## English

### The app's rule

HackGuard **does not reproduce any framework's text**. It stores:

- identifiers;
- each entry's name, when the framework publishes it and its licence allows;
- summaries **written in its own words**.

From ISO/IEC it uses only identifiers and its own summaries, never the standard's text (hard rule 11).

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
