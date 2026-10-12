# HackGuard — Manual de uso · User manual

> **Documento obligatorio y vivo.** Toda feature que llega a `main` se documenta aquí en el mismo sprint (regla 9
> del CLAUDE.md), en español y en inglés. Escrito para quien usa la app, no para quien la programa.
>
> **Mandatory, living document.** Every feature that reaches `main` is documented here in the same sprint, in
> Spanish and in English, for the people who use the app rather than the people who build it.

[Español](#español) · [English](#english)

---

## Español

### Qué es esta app

HackGuard ayuda a planear, gestionar y validar pruebas de seguridad para software y para sistemas de
inteligencia artificial. No ejecuta ninguna prueba: dice qué conviene verificar en un activo, con qué herramienta
y qué resultado se espera, y recibe los resultados como evidencia que una persona confirma. Su idea central es
que un hallazgo no es una vulnerabilidad: es evidencia de que un control falla.

Hoy puedes **recorrer el catálogo de pruebas en pantalla** (la lista con sus filtros, una ficha por prueba), ver los
**marcos y sus versiones** y los **controles** de ISO/IEC 42001 con las pruebas que les dan evidencia. Debajo de esas
pantallas está el **catálogo como dato**, con sus comandos para validarlo y fotografiarlo, y un **clasificador demo**
para la familia de modelos de decisión. Desde el Sprint 4 también puedes ver los **activos** y el **plan de pruebas** de
cada uno. Desde el Sprint 5 también puedes leer los **hallazgos** de la evidencia confirmada. Desde el Sprint 6 también puedes ver los **lotes** de evidencia que llegan de Garak o ZAP, y su revisión. Las demás secciones (tablero y
brecha) aparecen en la barra lateral con la marca «pronto».

### Primeros pasos

1. Necesitas Node 22.18 o posterior (el CLI usa el TypeScript nativo de Node) y pnpm.
2. En la carpeta del repositorio, instala lo necesario una vez: `pnpm install`.
3. Todos los comandos de este manual se escriben en una terminal abierta en esa carpeta.

### Features

#### El catálogo como dato · desde Sprint 001

- **Qué hace:** guarda en archivos, dentro de la carpeta `datos/`, todo lo que HackGuard sabe:
  - 38 pruebas en cuatro familias de activo: software, agente, modelo generativo y modelo de decisión;
  - 14 marcos de referencia con su versión, como OWASP LLM Top 10 2026, NIST AI RMF o MITRE ATLAS;
  - 38 controles del Anexo A de ISO/IEC 42001, resumidos con palabras propias;
  - 13 herramientas: 12 públicas, cada una con su versión verificada y su licencia, y `hackguard-revision`, la
    revisión documentada por una persona.

  Cada prueba dice qué verifica, por qué importa, con qué herramienta, qué resultado se espera, con qué regla
  se decide el veredicto y a qué activos aplica. Nunca dice cómo se ejecuta un ataque.

- **Cómo se usa:**
  1. **Validar el catálogo:** `pnpm catalogo:validar`. La primera línea dice el estado, con un código de salida
     que se lee con `echo $?`:

     | Estado                    | Qué significa                                 | Código |
     | ------------------------- | --------------------------------------------- | ------ |
     | «ok»                      | Nada que revisar                              | 0      |
     | «con advertencias»        | Es válido, pero algo pide atención            | 1      |
     | «inválido»                | Hay al menos un error                         | 2      |
     | Error de uso o de lectura | Faltó una opción o no se pudo leer un archivo | 3      |

     Debajo aparece cada hallazgo con su archivo, el campo, la regla que lo encontró y su explicación. Las marcas
     son ✗ para un error, ! para una advertencia y · para una nota.

  2. **Probar una prueba nueva antes de sumarla:** `pnpm catalogo:validar --agregar <archivo.json>`. El archivo
     se valida junto con el catálogo real, sin copiarlo a `datos/`.
  3. **Tomar una instantánea:** `pnpm catalogo:instantanea --fecha 2026-10-15`.
     - **Qué escribe:** un archivo en `datos/instantaneas/` cuyo nombre lleva la fecha y los primeros 12
       caracteres de su huella, una suma de comprobación SHA-256 del contenido. Con `--salida <carpeta>` se
       escribe en otra parte; para probar sin tocar el repositorio, agrega `--salida /tmp/hackguard`.
     - **Con una prueba de fuera:** `--agregar` exige `--salida` fuera de `datos/`, para que una prueba que no es
       del catálogo no termine en la carpeta versionada.
     - **Qué contiene:** las pruebas aprobadas, los marcos, controles y herramientas, y el semáforo de vigencia en
       esa fecha.
     - **Es reproducible:** la misma fecha y los mismos datos dan siempre la misma huella, en cualquier
       computador y en cualquier navegador.
  4. **Leer el semáforo de vigencia:** el informe de la instantánea cuenta cuántas pruebas, marcos, herramientas
     y familias hay en cada estado. Los días se cuentan desde la última verificación de cada uno:

     | Estado        | Desde cuándo     |
     | ------------- | ---------------- |
     | ✓ Vigente     | Menos de 30 días |
     | ! Por revisar | Desde 30 días    |
     | ✗ Vencido     | Desde 60 días    |

     Una familia está como su prueba más atrasada. Cada estado lleva siempre su marca y su nombre, nunca solo un
     color.

  5. **Otro idioma o una máquina:** todo comando acepta `--idioma en` para la salida en inglés y `--json` para
     una salida que lee otro programa.
  6. **Dónde vive cada cosa (`datos/`):**
     - `marcos/<id>.json`: un marco por archivo; `marcos/equivalencias/` guarda los mapas entre versiones.
     - `controles/iso42001-anexo-a.json`: la capa de controles por defecto.
     - `herramientas/<id>.json`: una herramienta por archivo.
     - `pruebas/<familia>/<id>.json`: una prueba por archivo, en la carpeta de su familia (`software`, `agente`,
       `modelo_generativo`, `modelo_decision`).
     - `familias.json`, `reglas-de-veredicto.json`, `rasgos-de-perfil.json`, `umbrales.json`, `estados.json` y
       `filtro/patrones.json`: los vocabularios.
     - `instantaneas/`: las escribe el comando; no se editan a mano.
     - `privado/`: evidencia de activos reales; git la ignora.

     El comando avisa de cualquier archivo de `datos/` que no lee (otra extensión o una carpeta mal escrita).

  7. **Agregar una prueba:**
     1. Copia `docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json`, cámbiale el `id` y nombra el archivo igual que
        el `id`.
     2. Escribe en los dos idiomas qué verifica, por qué importa, con qué herramienta y qué se espera; nunca cómo se
        ejecuta un ataque.
     3. Valídala con `pnpm catalogo:validar --agregar <archivo>` hasta que no quede ningún ✗.
     4. Muévela a `datos/pruebas/<familia>/`.
  8. **Si el filtro la marca** (`filtro/marcada`), la prueba no entra a la instantánea hasta que una persona decida
     una de tres cosas:
     - **Reescribirla** para que deje de marcar.
     - **Retirarla:** `"estado_aprobacion": "retirada"`.
     - **Aprobarla:** `"revision_contenido": "revisada_y_aprobada"`, `"estado_aprobacion": "aprobada"` y un bloque
       `revision` con la fecha, quién la revisó, la decisión en los dos idiomas y la huella del contenido revisado.
       La huella la da el validador: con `revisada_y_aprobada` y sin `revision`, el hallazgo
       `prueba/revision-sin-registro` dice «huella del contenido a revisar: …». Si el contenido cambia después,
       `prueba/revision-desactualizada` da la huella nueva.
- **Limitaciones conocidas:**
  - **Solo algunas vistas están en pantalla:** el catálogo, los marcos, los controles y los activos con su plan. Lo demás se maneja por los comandos de arriba (ver «El catálogo en pantalla»).
  - **Instantánea bloqueada:** si el catálogo es inválido, no se escribe nada (código 2).
  - **Fecha obligatoria:** la fecha de la instantánea es obligatoria y nunca se toma del reloj. Una fecha anterior
    a la última verificación del catálogo se rechaza (código 3).
  - **Controles sin contrastar:** los resúmenes del Anexo A no se han comparado con el texto de la norma; cada
    control lo declara («verificado contra la norma: no»).
  - **Software sin control:** las 10 pruebas de software todavía no dan evidencia a ningún control, porque el
    Anexo A gobierna sistemas de IA. Por eso el catálogo sale «con advertencias».
  - **El filtro de contenido marca, no decide:** marca para revisión el texto con forma de instrucción operativa.
    Una prueba marcada no entra a la instantánea hasta que una persona la revisa.
  - **Lo que el filtro no ve:**
    - **Lo que reconoce:** siete formas:
      - un bloque de código con intérprete;
      - un bloque de código sin lenguaje;
      - tres o más pasos numerados;
      - una cadena codificada larga;
      - una dirección con parámetros de inyección;
      - una etiqueta HTML activa;
      - un recorrido de ruta (`../../`).
    - **Lo que se le escapa:** una carga corta escrita como texto normal no tiene ninguna de esas formas, y no se
      marca. Por ejemplo, una comilla seguida de una condición, una instrucción maliciosa escrita como frase, un
      comando dentro de una línea o pasos en viñetas.
    - **El control es la persona:** que alguien lea cada prueba nueva.
  - **garak y ZAP con adaptador:** figuran con adaptador porque la especificación prevé que HackGuard lea sus
    informes. Esta versión no los lee: la marca dice para qué herramientas está previsto un lector.

#### El catálogo en pantalla · desde Sprint 002

- **Qué hace:** muestra el catálogo que ya existía como dato. Es **solo de lectura**: aquí no se edita ni se aprueba
  nada; para cambiar una prueba se edita su archivo de `datos/` (ver arriba).
- **Cómo se usa:**
  1. Abre la aplicación: la raíz te lleva a **Catálogo → Pruebas**. La barra lateral tiene cinco secciones; dentro de
     Catálogo (**Pruebas**, **Marcos** y **Controles**), **Activos**, la **carga** y los **hallazgos** de **Evidencia** funcionan. Las demás
     llevan la marca «pronto».
  2. Arriba ves el nombre de la **instantánea** que se está leyendo, su huella abreviada, cuántas pruebas hay y la
     **fecha de consulta**, y cuatro cifras: cuántas pruebas están vigentes, por revisar, vencidas y sin control.
  3. **Filtra** con las píldoras de familia (Software, Agente, Modelo generativo, Modelo de decisión) y con las listas
     de Marco, Control, Herramienta, Madurez, Vigencia y Revisión de contenido. Los filtros se suman; el contador dice
     cuántas pruebas quedan y «Quitar filtros» las devuelve todas. Si ninguna cumple, la pantalla lo dice. La lista
     muestra **20 pruebas por página**, con «Anterior» y «Siguiente»; cada filtro vuelve a la página 1.
  4. **Abre una prueba** con su nombre: la ficha dice qué se verifica, por qué importa, el resultado esperado, cómo
     se decide el veredicto (y cuántas repeticiones hacen falta), con qué herramienta y configuración se mide, cuándo
     aplica, a qué marco y controles responde y de dónde sale.
  5. Abajo, **«Vigencia por familia»**: cada familia está como su prueba más atrasada.
  6. Arriba a la derecha cambias el **tema** (oscuro o claro) y el **idioma** (español o inglés); se recuerdan al
     recargar. En el teléfono la navegación pasa a una barra fija al pie.
- **Qué significa cada estado** (siempre con marca, texto y color; el color nunca va solo):

  | Estado      | Cuándo sale                                            | Qué hacer                                                                           |
  | ----------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
  | Vigente     | Se verificó hace menos de 30 días                      | Nada                                                                                |
  | Por revisar | Pasaron 30 días o más desde su última verificación     | Sigue siendo válida; conviene revisarla pronto                                      |
  | Vencido     | Pasaron 60 días o más                                  | Su marco o su herramienta pueden haber cambiado: pide al investigador que la revise |
  | Sin control | Todavía no da evidencia a ningún control               | Queda a la vista como deuda hasta que alguien le asigne uno                         |
  | Marcada     | El filtro de contenido encontró un patrón en esa ficha | Una persona decide si se queda, se corrige o se retira                              |

  La ficha de una prueba vencida o por revisar lo dice con un aviso arriba, y marco y herramienta llevan cada uno su
  propia vigencia.

- **La fecha de consulta:** es la fecha con que se calcula la vigencia. Sale de la instantánea y, al publicar, de la
  fecha del commit que se construye; nunca del reloj del navegador. Por eso la pantalla **envejece solo cuando se
  vuelve a publicar**: la fecha de consulta que muestra arriba es la que manda. Una persona que prepare el sitio puede
  fijarla con la variable `HACKGUARD_CONSULTA` (AAAA-MM-DD) para ver cómo se vería otro día.
- **Limitaciones conocidas:**
  - Propuestas, tablero y brecha todavía no existen como pantalla.
  - Muestra la **instantánea oficial**, no los archivos sueltos de `datos/`: un cambio en un archivo aparece cuando se
    emite una instantánea nueva (ver «El catálogo como dato»).
  - Las cifras de arriba cuentan las 38 pruebas publicadas; las que esperan revisión aparecen en un panel aparte solo
    cuando las hay.
  - Las pantallas están probadas en español; la prueba en inglés llega al cierre del hito.

#### Marcos y controles · desde Sprint 003

- **Qué hace:** muestra los marcos de referencia con su versión, el mapa que traduce una versión a la siguiente y la
  capa de controles de ISO/IEC 42001 con las pruebas que les dan evidencia. Es **solo de lectura**, como el catálogo.
- **Cómo se usa:**
  1. Desde **Catálogo**, la barra lateral lleva a **Marcos** y a **Controles**.
  2. **Marcos y versiones** lista los 14 marcos del catálogo, cada uno con su versión en el catálogo, la fecha de esa
     versión, su licencia y lo que exige, su vigencia y cuántas pruebas lo citan.
  3. El **mapa de equivalencias** (hoy, OWASP LLM Top 10 de 2025 a 2026) dice, para cada entrada de la versión
     anterior, a qué entrada nueva corresponde y qué cambió. Si una prueba cita la entrada nueva, aparece su
     identificador, y pulsarlo abre su ficha.
  4. Las **instantáneas** del catálogo listan cada foto con su fecha, cuántas pruebas trae y su huella. La oficial sale
     marcada.
  5. **Controles** muestra las nueve áreas del Anexo A con su cobertura, los controles a los que alguna prueba da
     evidencia (cada prueba enlaza a su ficha, y un equivalente de otro marco se marca cuando el mapa no lo cubre entero) y, al
     final, las **pruebas sin control asignado**.
- **Qué significa cada estado** (siempre con marca, texto y color):

  | Estado                        | Cuándo sale                                                               | Qué hacer                                                    |
  | ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
  | Vigente, por revisar, vencido | Los de la vigencia de cada marco, con los mismos umbrales que el catálogo | Lo mismo que en «El catálogo en pantalla»                    |
  | Fuente no accesible al agente | La fuente oficial del marco no se pudo leer desde la app                  | Verifica el marco a mano antes de confiar en su versión      |
  | Mapa incompleto               | Un equivalente de otro marco no cubre el control entero                   | Lee la nota del control antes de usar la equivalencia        |
  | Sin control asignado          | La prueba no da evidencia a ningún control todavía                        | Queda como deuda visible hasta que una persona le asigne uno |

- **Lo que la app no sabe, dicho tal cual:** las columnas «Frente a la fuente», «Avisos de versión» y «Qué cambió»
  dicen «Sin aviso registrado», «Sin avisos registrados» y «Sin comparación registrada» mientras el catálogo no guarde
  ese registro. No se simula una comparación con la fuente.
- **«No contrastado con la norma»:** los resúmenes de las áreas y controles del Anexo A están en palabras propias y
  ninguno se ha comparado con el texto de la norma. Por eso la página lo dice arriba, con su marca.
- **Limitaciones conocidas:**
  - Las versiones y las fechas vienen del catálogo: si el marco publica una versión nueva, la página lo mostrará cuando el
    catálogo lo registre, no antes.
  - Se leen desde la instantánea oficial, como el resto de la app: un cambio en `datos/` aparece cuando se emite una
    instantánea nueva.
  - Las pantallas se prueban en español; la prueba en inglés llega al cierre del hito.

#### Activos y plan · desde Sprint 004

- **Qué hace:** muestra cada activo registrado (un asistente, un clasificador, un portal) con su dueño, su proveedor, su
  perfil, su autorización y el **plan de pruebas** que el planificador calcula para él. Es **solo de lectura**: el plan
  no se edita en pantalla.
- **Cómo se usa:**
  1. Desde **Activos**, la barra lateral abre el primer activo. Arriba, un selector lista los tres activos demo con su
     estado: «Con plan» o «Registrado, sin plan».
  2. En la página de un activo ves quién es su dueño y quién su proveedor, qué perfil declara, su alcance y sus reglas
     de enfrentamiento. Si tiene plan, el carril lateral lleva a él.
  3. En **Plan** hay un resumen de cuatro cifras y, después, las **pruebas planeadas**. Cada una dice por qué aplica
     («Aplica porque:»). Una prueba que agregaste tú aparece como «Agregada por ti», con tu justificación.
  4. Las pruebas que no entran aparecen en **«Excluidas, con su razón»**, con uno de tres motivos: «No aplica» (el perfil
     no declara esa condición), «Fuera de alcance» (el alcance autorizado no la cubre) o «Quitada por ti».
  5. **«Cobertura por control»** dice qué controles de ISO/IEC 42001 tienen prueba en el plan y cuáles no («Sin prueba»).
  6. **«Descargar el paquete»** baja el archivo que describe qué se ejecuta, con su huella. Es el mismo archivo que
     escribe el comando de emisión, byte a byte.
- **Sin autorización no hay plan:** el portal de clientes dice «Sin autorización no hay plan» en su página y en la del
  plan. Para que un activo reciba plan hacen falta su alcance autorizado y sus reglas de enfrentamiento.
- **Registrar un activo propio:** la página de cualquier activo tiene «Ver la plantilla para activos propios», que
  muestra qué hace falta. Un activo real se escribe en `datos/privado/activos/`, nunca en `datos/activos/`: esa carpeta
  versionada solo admite activos demo con `origen: "demo"`. Su plan se emite con
  `pnpm plan:emitir <id> --fecha AAAA-MM-DD`, que lo escribe en `datos/privado/planes/` con permisos de solo tu usuario.
  Ningún activo real entra en el repositorio ni en la web pública.
- **Limitaciones conocidas:**
  - El plan no muestra todavía qué pruebas ya tienen evidencia confirmada: la página de cada hallazgo sí la muestra (ver la sección siguiente).
  - No hay editor de perfil ni de plan en pantalla: un cambio se hace en el archivo del activo y el plan se vuelve a emitir.
  - Si sale una instantánea oficial nueva, el plan viejo deja de construirse hasta volver a emitirlo.
  - Las pantallas están probadas en español; la prueba en inglés llega al cierre del hito.

#### Evidencia y hallazgos · desde Sprint 005

- **Qué hace:** convierte el resultado de una herramienta en **evidencia**, que una persona confirma. Un sobre confirmado
  que falla abre un **hallazgo**, con su severidad, su plazo y su ciclo de vida. Un hallazgo no es una vulnerabilidad: es
  la prueba de que un control no funciona. Solo una **re-prueba válida** lo cierra.
- **Cómo se usa:**
  1. **Registrar un resultado:** `pnpm evidencia:registrar <resultado.json> --crudo <archivo>`. Queda como sobre
     **propuesto**, que todavía no cuenta para nada. El archivo crudo solo sirve para calcular su huella: no se guarda.
  2. **Confirmar:** `pnpm evidencia:confirmar <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD`, y para la severidad,
     `--cvss <vector>` en software, o `--impacto`, `--alcance` y `--detectabilidad` en los demás. Un sobre confirmado no
     cambia nunca. Si falló, abre su hallazgo.
  3. **Ver la lista:** `pnpm hallazgos:listar` dice el estado, la severidad y el plazo de cada hallazgo.
  4. **Leer un hallazgo:** en **Evidencia**, la barra lateral abre el primero. La página `/evidencia/hallazgos/<id>` tiene:
     - la **cadena de cierre**: el sobre, la corrección, la re-prueba y el cierre, con lo que falta dibujado como pendiente;
     - la **severidad**: para software, CVSS 4.0 con su vector y la referencia fijada; para los demás, la tabla de prioridad
       de acción, con la celda de este hallazgo;
     - el **control que falla**, con lo que se esperaba y lo que se obtuvo;
     - **«Qué puedes hacer»**, que dice cada salida, su consecuencia y el comando que la registra. La página solo se lee.
  5. **Registrar una decisión:** `pnpm hallazgos:declarar <HZ-NNNN> <corregido|aceptado|eliminado|no-reproducible>`,
     con `--por`, `--fecha` y la justificación en los dos idiomas (`--justificacion-es`, `--justificacion-en`). Aceptar un
     riesgo pide además `--revision-en-dias`.
  6. **Cerrar:** solo con una re-prueba confirmada. Debe ser de la misma prueba, con la misma herramienta, la misma versión
     exacta y el mismo selector, con al menos las mismas repeticiones, y debe citar el hallazgo. Si da «superada», el hallazgo
     se cierra. Pedir «cerrado» a mano sale con error.
- **Plazos:** crítico, 7 días; alto, 30; medio, 90. Bajo e informativo no tienen plazo. El plazo cuenta desde que una persona
  confirma el sobre que abre el hallazgo. Si se vence, la página lo avisa con «Plazo vencido».
- **Aceptar un riesgo no lo cierra:** un hallazgo aceptado con riesgo pide una justificación y una fecha de revisión, y
  **sigue contando como falla del control** hasta que se corrija. Al llegar la fecha de revisión, la página dice que
  toca revisarlo.
- **Un hallazgo cerrado** dice que ya no corre el plazo. Si una prueba posterior vuelve a fallar, esa falla abre un
  hallazgo nuevo con su propia evidencia: la evidencia confirmada no se toca.
- **Qué NO hace:** no ejecuta herramientas ni trae resultados desde Garak o ZAP: eso lo hace la carga de evidencia
  (Sprint 6). Que un hallazgo no aparezca en un escaneo posterior **no** lo cierra.
- **Limitaciones conocidas:**
  - Los hallazgos de tu activo real van a `datos/privado/`, nunca al repositorio ni a la web pública.
  - La pantalla está probada en español; la prueba en inglés llega al cierre del hito.

#### Carga de evidencia · desde Sprint 006

- **Qué hace:** convierte el reporte de **Garak** o de **ZAP** de una corrida del plan en un **lote** de sobres por confirmar.
  El veredicto de cada prueba lo calcula su regla, no la herramienta. Una persona confirma el lote: revisa **todas** las
  fallidas y parciales, y una **muestra** del resto. La pantalla **Evidencia · Carga** muestra los lotes; no confirma nada
  por sí misma.
- **Cómo se usa:**
  1. **Importar el reporte:** `pnpm evidencia:importar --garak <report.jsonl> --activo <id> --por <persona>`, o con
     `--zap <report.json>`. Si el reporte no trae la fecha o la zona horaria, añade `--fecha AAAA-MM-DD` y `--zona <IANA>`.
     El archivo se lee una vez: solo se guarda su huella, nunca su contenido. El lote nace por confirmar y todavía no cuenta.
  2. **Ver el lote:** en **Evidencia · Carga** eliges el lote. La ficha dice la herramienta y su versión, las huellas del
     archivo, del lote y del registro, y las advertencias. La columna **Revisión** dice si cada sobre se revisa siempre, si
     está en la muestra o si queda fuera.
  3. **Confirmar el lote:** `pnpm evidencia:confirmar-lote <LOTE-NNNN> --por <persona> --fecha AAAA-MM-DD`. Si una falla
     abriría un hallazgo nuevo, el lote no se confirma hasta que la separes con `--separar <SOB-NNNN>` y la confirmes sola
     con `pnpm evidencia:confirmar`, con su severidad. Si prefieres revisar cada sobre por separado, usa
     `--revisar-uno-por-uno` en lugar de confirmar el lote.
  4. Un lote confirmado cuenta como los sobres confirmados a mano: sus fallidas abren hallazgos, y su evidencia no cambia después.
- **Cómo se elige la muestra:** todas las fallidas y parciales se revisan siempre. Del resto, lo que no falla, se revisa una
  muestra según su tamaño: hasta 25 se revisa todo; de 26 a 50, 22; de 51 a 90, 25; de 91 a 150, 26; más de 150, 29. Con ese
  plan de calidad (hasta 10 % de sobres malos aceptable y un riesgo de 5 % de aceptar un lote peor), la probabilidad de que un
  lote con 10 % de sobres malos pase la muestra sin encontrar ninguno es menor de 5 %. El sistema elige la muestra con una
  semilla que sale de la huella del lote: la misma en cualquier computadora y en cualquier navegador.
- **Qué NO hace:** no ejecuta herramientas, no lee el archivo en el navegador, no pega texto todavía (la pestaña lo dice),
  ningún modelo decide un veredicto y no guarda el contenido del reporte ni los ataques que usó la herramienta. Con ZAP, una
  regla sin constancia de que corrió aparece como **No ejecutada**, nunca como superada.
- **Limitaciones conocidas:**
  - El reporte de Garak no trae el umbral con el que una prueba cuenta como fallida. La app usa 0,5, que es el valor por
    omisión de Garak, y lo dice en las advertencias del lote; además comprueba que sus cuentas coincidan con las líneas de
    resumen del mismo reporte.
  - Las estadísticas de ZAP se leen con el formato de su documentación. Todavía no se han probado con un reporte real de una
    corrida de ZAP.
  - En la pantalla, «Texto pegado» todavía no carga nada, y «Sobre manual» muestra los pasos del CLI de arriba.
  - La pantalla está probada en español; la prueba en inglés llega al cierre del hito.

#### El clasificador demo de la familia «modelo de decisión» · desde Sprint 001

- **Qué hace:** simula un modelo que decide, para que las pruebas de esa familia tengan algo que medir.
  - **El caso:** clasifica solicitudes inventadas de socios de una biblioteca: aprobar, rechazar o pasar a una
    persona, y si son urgentes.
  - **El formato:** imita el contrato de respuesta de Jev, de TypeSafe: una distribución de probabilidad sobre las
    opciones y un estadístico de confianza. Cómo se anidan las respuestas es decisión nuestra.
  - **Lo que mide:** las probabilidades, nunca la «confianza»:
    - exactitud;
    - error de Brier;
    - error de calibración (ECE);
    - errores cerca del umbral con que se aprobaría sin una persona;
    - cuánto cambia la decisión al repetir la misma petición;
    - la diferencia entre español e inglés.
- **Cómo se usa:** `pnpm clasificador:demo`, o `pnpm clasificador:demo --idioma en`, o `--json`.
  - **El conjunto:** 26 casos en `docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json`, con la política
    que decide la respuesta correcta de cada uno.
  - **La huella de las respuestas:** sale siempre la misma con los mismos datos.
- **Limitaciones conocidas:**
  - **No mide un modelo real:** no aprende, y el conjunto y el clasificador los escribió la misma persona. Las
    cifras demuestran que las métricas funcionan.
  - **Tiene tres defectos a propósito,** para que las métricas los encuentren:
    - entiende el inglés mejor que el español;
    - no entiende frases negadas;
    - favorece a los socios antiguos.

### Preguntas frecuentes

- **¿Por qué el catálogo sale «con advertencias» y no «ok»?** Por las 10 pruebas de software sin control. Es lo
  esperado hasta que exista una capa de controles de software.
- **Cambié un archivo de `datos/`, ¿qué hago?** Corre `pnpm catalogo:validar` y lee los hallazgos. Si cambiaste
  el contenido de una prueba y su fecha de verificación, su vigencia vuelve a empezar.

### Historial

| Sprint           | Features añadidas a este manual                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 001 · 2026-10-04 | El catálogo como dato (validar, instantánea, semáforo de vigencia) · el clasificador demo                                                 |
| 002 · 2026-10-11 | El catálogo en pantalla (lista con filtros, vigencia por familia y una ficha por prueba)                                                  |
| 003 · 2026-10-11 | Marcos y versiones (con el mapa de equivalencias y las instantáneas) · controles del Anexo A · la lista paginada                          |
| 004 · 2026-10-11 | Activos (selector, dueño y proveedor, perfil, alcance y reglas) · plan de pruebas con sus excluidas y su cobertura · descarga del paquete |
| 005 · 2026-10-11 | Evidencia (registrar y confirmar sobres) · hallazgos con severidad, plazo y ciclo de vida, cerrados solo por re-prueba · su página        |
| 006 · 2026-10-12 | Carga de evidencia (lotes de Garak y ZAP, revisión por muestra con su plan de calidad, confirmación por lote) · su pantalla                 |

---

## English

### What this app is

HackGuard helps plan, manage and validate security tests for software and for artificial intelligence systems.
It runs no tests itself: it says what is worth checking on an asset, with which tool and what result is expected,
and it takes in results as evidence that a person confirms. Its central idea is that a finding is not a
vulnerability: it is evidence that a control is failing.

You can now **browse the test catalog on screen** (the list with its filters and a record per test), and see the **assets with their test plan**; under that screen sits the **test catalog as data**, with the commands to validate it and
take snapshots of it, and a **demo classifier** for the decision-model family. Since Sprint 5 you can also read the **findings** of confirmed evidence, and since Sprint 6 the **batches** that come from Garak and ZAP, with their review.

### Getting started

1. You need Node 22.18 or later (the CLI uses Node's native TypeScript support) and pnpm.
2. In the repository folder, install what is needed once: `pnpm install`.
3. Every command in this manual is typed in a terminal opened in that folder.

### Features

#### The catalog as data · since Sprint 001

- **What it does:** it keeps everything HackGuard knows in files, inside the `datos/` folder:
  - 38 tests across four asset families: software, agent, generative model and decision model;
  - 14 reference frameworks with their version, such as OWASP LLM Top 10 2026, NIST AI RMF or MITRE ATLAS;
  - 38 controls from Annex A of ISO/IEC 42001, summarised in our own words;
  - 13 tools: 12 public ones, each with its verified version and its licence, and `hackguard-revision`, a review
    documented by a person.

  Each test says what it checks, why it matters, which tool to use, what result is expected, which rule decides
  the verdict and which assets it applies to. It never says how to carry out an attack.

- **How to use it:**
  1. **Validate the catalog:** `pnpm catalogo:validar --idioma en`. The first line gives the status, with an exit
     code you can read with `echo $?`:

     | Status              | What it means                                     | Code |
     | ------------------- | ------------------------------------------------- | ---- |
     | “ok”                | Nothing to review                                 | 0    |
     | “with warnings”     | It is valid, but something needs attention        | 1    |
     | “invalid”           | There is at least one error                       | 2    |
     | Usage or read error | An option was missing or a file could not be read | 3    |

     Below come the findings, each with its file, the field, the rule that found it and its explanation. The marks
     are ✗ for an error, ! for a warning and · for a note.

  2. **Try a new test before adding it:** `pnpm catalogo:validar --agregar <file.json>`. The file is validated
     together with the real catalog, without copying it into `datos/`.
  3. **Take a snapshot:** `pnpm catalogo:instantanea --fecha 2026-10-15 --idioma en`.
     - **What it writes:** a file in `datos/instantaneas/` whose name carries the date and the first 12 characters
       of its fingerprint, a SHA-256 checksum of the content. With `--salida <folder>` it goes somewhere else; to
       try it without touching the repository, add `--salida /tmp/hackguard`.
     - **With a test from outside:** `--agregar` requires `--salida` outside `datos/`, so a test that is not part
       of the catalog never lands in the versioned folder.
     - **What it holds:** the approved tests, the frameworks, controls and tools, and the freshness semaphore on
       that date.
     - **It is reproducible:** the same date and the same data always give the same fingerprint, on any computer
       and in any browser.
  4. **Read the freshness semaphore:** the snapshot report counts how many tests, frameworks, tools and families
     are in each state. Days are counted from each one's last verification:

     | State        | From when     |
     | ------------ | ------------- |
     | ✓ Current    | Under 30 days |
     | ! Review due | From 30 days  |
     | ✗ Overdue    | From 60 days  |

     A family takes the state of its most out-of-date test. Every state always shows its mark and its name, never
     colour alone.

  5. **Another language or a machine:** every command takes `--idioma en` for English output and `--json` for
     output another program reads.
  6. **Where everything lives (`datos/`):**
     - `marcos/<id>.json`: one framework per file; `marcos/equivalencias/` holds the maps between versions.
     - `controles/iso42001-anexo-a.json`: the default control layer.
     - `herramientas/<id>.json`: one tool per file.
     - `pruebas/<familia>/<id>.json`: one test per file, in its family's folder (`software`, `agente`,
       `modelo_generativo`, `modelo_decision`).
     - `familias.json`, `reglas-de-veredicto.json`, `rasgos-de-perfil.json`, `umbrales.json`, `estados.json` and
       `filtro/patrones.json`: the vocabularies.
     - `instantaneas/`: written by the command; never edited by hand.
     - `privado/`: evidence from real assets; git ignores it.

     The command warns about any file in `datos/` that it does not read (another extension, or a misspelt folder).

  7. **Add a test:**
     1. Copy `docs/kit-de-prueba/semillas/SEMILLA-REFERENCIA.json`, change its `id`, and name the file after the
        `id`.
     2. Write, in both languages, what it checks, why it matters, with which tool and what is expected; never how
        an attack is carried out.
     3. Validate it with `pnpm catalogo:validar --agregar <file>` until no ✗ is left.
     4. Move it to `datos/pruebas/<familia>/`.
  8. **If the filter flags it** (`filtro/marcada`), the test stays out of the snapshot until a person decides one
     of three things:
     - **Rewrite it** so that it is no longer flagged.
     - **Withdraw it:** `"estado_aprobacion": "retirada"`.
     - **Approve it:** `"revision_contenido": "revisada_y_aprobada"`, `"estado_aprobacion": "aprobada"` and a
       `revision` block with the date, who reviewed it, the decision in both languages and the fingerprint of the
       reviewed content. The validator gives the fingerprint: with `revisada_y_aprobada` and no `revision`, the
       finding `prueba/revision-sin-registro` says “fingerprint of the content to review: …”. If the content
       changes later, `prueba/revision-desactualizada` gives the new one.
- **Known limitations:**
  - **Only some views are on screen:** the catalog, the frameworks, the controls and the assets with their plan. Everything else is handled with the commands above (see “The catalog on screen”).
  - **Blocked snapshot:** if the catalog is invalid, nothing is written (code 2).
  - **Date required:** the snapshot date is required and is never taken from the clock. A date earlier than the
    catalog's latest verification is rejected (code 3).
  - **Controls not checked against the standard:** the Annex A summaries have not been compared with the text of
    the standard; each control says so (“verified against the standard: no”).
  - **Software tests without a control:** the 10 software tests do not yet give evidence to any control, because
    Annex A governs AI systems. That is why the catalog comes out “with warnings”.
  - **The content filter flags, it does not decide:** it flags text shaped like an operational instruction for
    review. A flagged test stays out of the snapshot until a person reviews it.
  - **What the filter does not see:**
    - **What it recognises:** seven shapes:
      - a code block for an interpreter;
      - a code block with no language;
      - three or more numbered steps;
      - a long encoded string;
      - a URL with injection parameters;
      - an active HTML tag;
      - path traversal (`../../`).
    - **What gets past it:** a short payload written as plain text has none of those shapes, and is not flagged.
      For example, a quote followed by a condition, a malicious instruction written as a sentence, a command
      inside a line, or steps as bullets.
    - **The control is a person:** someone reads each new test.
  - **garak and ZAP with an adapter:** they are listed with an adapter because the specification plans for
    HackGuard to read their reports. This version does not read them: the flag says which tools a reader is
    planned for.

#### The catalog on screen · since Sprint 002

- **What it does:** it shows the catalog that already existed as data. It is **read-only**: nothing is edited or
  approved here; to change a test you edit its `datos/` file (see above).
- **How to use it:**
  1. Open the app: the root takes you to **Catalog → Tests**. The sidebar has five sections; inside Catalog, **Tests**,
     **Frameworks** and **Controls** work, and so do **Assets**, the **intake** and the findings under **Evidence**. The others carry the “soon” mark.
  2. At the top you see the name of the **snapshot** being read, its short fingerprint, how many tests there are and
     the **query date**, and four figures: how many tests are current, review due, overdue and without a control.
  3. **Filter** with the family pills (Software, Agent, Generative model, Decision model) and the Framework, Control,
     Tool, Maturity, Freshness and Content review lists. Filters add up; the counter says how many tests are left and
     “Clear filters” brings them all back. If none matches, the screen says so. The list shows **20 tests per page**,
     with “Previous” and “Next”; each filter goes back to page 1.
  4. **Open a test** by its name: the record says what is verified, why it matters, the expected result, how the
     verdict is decided (and how many repetitions are needed), with which tool and configuration it is measured,
     when it applies, which framework and controls it answers to and where it comes from.
  5. Below, **“Freshness by family”**: each family stands where its most out-of-date test stands.
  6. At the top right you switch the **theme** (dark or light) and the **language** (Spanish or English); both are
     remembered on reload. On a phone the navigation becomes a fixed bar at the bottom.
- **What each state means** (always mark, text and colour; colour never stands alone):

  | State      | When it shows                                     | What to do                                                             |
  | ---------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
  | Current    | Verified less than 30 days ago                    | Nothing                                                                |
  | Review due | 30 days or more since its last verification       | It is still valid; review it soon                                      |
  | Overdue    | 60 days or more                                   | Its framework or tool may have changed: ask the researcher to check it |
  | No control | It does not yet give evidence to any control      | It stays visible as a debt until someone assigns one                   |
  | Flagged    | The content filter found a pattern in that record | A person decides whether it stays, is corrected or is retired          |

  The record of an overdue or review-due test says so in a notice at the top, and its framework and tool each keep
  their own freshness.

- **The query date:** it is the date the freshness is computed with. It comes from the snapshot and, when
  publishing, from the date of the commit being built; never from the browser's clock. That is why the screen **ages
  only when it is published again**: the query date it shows at the top is the one that counts. Whoever prepares the
  site can set it with the `HACKGUARD_CONSULTA` variable (YYYY-MM-DD) to see how it would look on another day.
- **Known limitations:**
  - Proposals, dashboard and gap do not exist as screens yet; neither does the intake of results.
  - It shows the **official snapshot**, not the loose `datos/` files: a change to a file shows up when a new snapshot
    is emitted (see “The catalog as data”).
  - The figures at the top count the 38 published tests; those awaiting review appear in a separate panel only when
    there are any.
  - The screens are tested in Spanish; English testing arrives at the close of the milestone.

#### Frameworks and controls · since Sprint 003

- **What it does:** it shows the reference frameworks with their version, the map that translates one version into the
  next, and the ISO/IEC 42001 control layer with the tests that give them evidence. It is **read-only**, like the catalog.
- **How to use it:**
  1. From **Catalog**, the sidebar leads to **Frameworks** and **Controls**.
  2. **Frameworks and versions** lists the 14 frameworks in the catalog, each with its version in the catalog, that
     version's date, its licence and what it requires, its freshness, and how many tests cite it.
  3. The **equivalence map** (today, OWASP LLM Top 10 from 2025 to 2026) says, for each entry of the previous version,
     which new entry it corresponds to and what changed. If a test cites the new entry, its identifier appears, and
     pressing it opens that test's record.
  4. The catalog **snapshots** list each snapshot with its date, how many tests it holds and its fingerprint. The
     official one is marked.
  5. **Controls** shows the nine areas of Annex A with their coverage, the controls that some test gives evidence to
     (each test links to its record, and an equivalent from another framework is marked when the map does not cover
     the control entirely), and at the end, the **tests with no control assigned**.
- **What each state means** (always mark, text and colour):

  | State                             | When it shows                                                            | What to do                                              |
  | --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
  | Current, review due, overdue      | Each framework's freshness, with the same thresholds as the catalog      | The same as in “The catalog on screen”                  |
  | Source not reachable by the agent | The framework's official source could not be read by the app             | Check the framework by hand before trusting its version |
  | Incomplete map                    | An equivalent from another framework does not cover the control entirely | Read the control's note before using the equivalence    |
  | No control assigned               | The test does not give evidence to any control yet                       | It stays visible as a debt until a person assigns one   |

- **What the app does not know, said plainly:** the columns “Against the source”, “Version notices” and “What changed”
  say “No notice recorded”, “No notices recorded” and “No comparison recorded” while the catalog does not keep that
  record. No comparison with the source is simulated.
- **“Not checked against the standard”:** the summaries of the Annex A areas and controls are in our own words and none
  of them has been compared with the standard's text. That is why the page says so at the top, with its mark.
- **Known limitations:**
  - Versions and dates come from the catalog: if a framework publishes a new version, the page shows it once the catalog
    records it, not before.
  - They are read from the official snapshot, as the rest of the app is: a change in `datos/` appears when a new snapshot
    is emitted.
  - The screens are tested in Spanish; English testing arrives at the close of the milestone.

#### Assets and plan · since Sprint 004

- **What it does:** shows each registered asset (an assistant, a classifier, a portal) with its owner, its provider, its
  profile, its authorization and the **test plan** the planner computes for it. It is **read-only**: the plan is not
  edited on screen.
- **How to use it:**
  1. From **Assets**, the sidebar opens the first asset. At the top, a selector lists the three demo assets with their
     status: “Has a plan” or “Registered, no plan”.
  2. On an asset's page you see who owns it and who provides it, which profile it declares, its scope and its
     engagement rules. If it has a plan, the side panel leads to it.
  3. On **Plan** there is a summary of four figures and then the **planned tests**. Each one says why it applies
     (“Applies because:”). A test you added yourself appears as “Added by you”, with your justification.
  4. The tests that do not make it appear under **“Excluded, with their reason”**, with one of three motives: “Not
     applicable” (the profile does not declare that condition), “Out of scope” (the authorized scope does not cover it)
     or “Removed by you”.
  5. **“Coverage by control”** says which ISO/IEC 42001 controls have a test in the plan and which do not (“No test”).
  6. **“Download the package”** downloads the file that describes what is run, with its fingerprint. It is the same file
     the issuing command writes, byte for byte.
- **No authorization, no plan:** the customer portal says “No authorization, no plan” on its page and on its plan page.
  For an asset to receive a plan it needs its authorized scope and its engagement rules.
- **Registering an own asset:** any asset's page has “See the template for own assets”, which shows what is needed. A
  real asset is written in `datos/privado/activos/`, never in `datos/activos/`: that versioned folder only accepts demo
  assets with `origen: "demo"`. Its plan is issued with `pnpm plan:emitir <id> --fecha AAAA-MM-DD`, which writes it to
  `datos/privado/planes/` with permissions for your user only. No real asset enters the repository or the public web.
- **Known limitations:**
  - The plan does not yet show which tests already have confirmed evidence: the page of each finding does (see the next section).
  - There is no profile or plan editor on screen: a change is made in the asset's file and the plan is issued again.
  - If a new official snapshot comes out, the old plan stops being built until it is issued again.
  - The screens are tested in Spanish; the English test arrives at the close of the milestone.

#### Evidence and findings · since Sprint 005

- **What it does:** turns a tool's result into **evidence**, which a person confirms. A confirmed envelope that fails opens a
  **finding**, with its severity, its deadline and its lifecycle. A finding is not a vulnerability: it is proof that a control
  is not working. Only a valid **retest** closes it.
- **How to use it:**
  1. **Record a result:** `pnpm evidencia:registrar <resultado.json> --crudo <archivo>`. It is kept as a **proposed** envelope,
     which does not count for anything yet. The raw file is used only to compute its fingerprint: it is not stored.
  2. **Confirm:** `pnpm evidencia:confirmar <SOB-NNNN> --por <persona> --fecha AAAA-MM-DD`, and for the severity,
     `--cvss <vector>` for software, or `--impacto`, `--alcance` and `--detectabilidad` for the rest. A confirmed envelope never
     changes. If it failed, it opens its finding.
  3. **See the list:** `pnpm hallazgos:listar` shows the status, the severity and the deadline of each finding.
  4. **Read a finding:** under **Evidence**, the sidebar opens the first one. The page `/evidencia/hallazgos/<id>` has:
     - the **closure chain**: the envelope, the fix, the retest and the closure, with what is missing drawn as pending;
     - the **severity**: for software, CVSS 4.0 with its vector and the pinned reference; for the rest, the action priority
       table, with this finding's cell;
     - the **control that fails**, with what was expected and what was obtained;
     - **“What you can do”**, which says each outcome, its consequence and the command that records it. The page is read-only.
  5. **Record a decision:** `pnpm hallazgos:declarar <HZ-NNNN> <corregido|aceptado|eliminado|no-reproducible>`, with `--por`,
     `--fecha` and the justification in both languages (`--justificacion-es`, `--justificacion-en`). Accepting a risk also
     takes `--revision-en-dias`.
  6. **Close:** only with a confirmed retest. It must be of the same test, with the same tool, the same exact version and
     the same selector, with at least the same repetitions, and it must cite the finding. If it says “passed”, the finding
     closes. Asking for “closed” by hand fails.
- **Deadlines:** critical, 7 days; high, 30; medium, 90. Low and informational have no deadline. The deadline counts from the
  day a person confirms the envelope that opens the finding. If it expires, the page warns “Deadline passed”.
- **Accepting a risk does not close it:** an accepted finding asks for a justification and a review date, and it **still counts
  as a failure of its control** until it is fixed. When the review date arrives, the page says it is time to review it.
- **A closed finding** says its deadline no longer runs. If a later test fails again, that failure opens a new finding with its
  own evidence: confirmed evidence is never touched.
- **What it does NOT do:** it does not run tools and does not bring results from Garak or ZAP: that is the evidence intake
  (Sprint 6). A finding missing from a later scan does **not** close it.
- **Known limitations:**
  - The findings of your real asset go to `datos/privado/`, never to the repository or the public web.
  - The screen is tested in Spanish; the English test arrives at the close of the milestone.

#### Evidence intake · since Sprint 006

- **What it does:** turns the **Garak** or **ZAP** report of a plan run into a **batch** of envelopes waiting for confirmation.
  Each test's verdict is computed by its rule, not by the tool. A person confirms the batch: they review **every** failed and
  partial one, and a **sample** of the rest. The **Evidence · Intake** screen shows the batches; it confirms nothing by itself.
- **How to use it:**
  1. **Import the report:** `pnpm evidencia:importar --garak <report.jsonl> --activo <id> --por <person>`, or with
     `--zap <report.json>`. If the report does not carry the date or the time zone, add `--fecha YYYY-MM-DD` and `--zona <IANA>`.
     The file is read once: only its fingerprint is kept, never its contents. The batch is born pending and does not count yet.
  2. **See the batch:** in **Evidence · Intake** you choose the batch. Its card shows the tool and its version, the fingerprints
     of the file, the batch and the record, and the warnings. The **Review** column says whether each envelope is always
     reviewed, in the sample, or left out.
  3. **Confirm the batch:** `pnpm evidencia:confirmar-lote <LOTE-NNNN> --por <person> --fecha YYYY-MM-DD`. If a failure would
     open a new finding, the batch is not confirmed until you separate it with `--separar <SOB-NNNN>` and confirm it alone with
     `pnpm evidencia:confirmar`, with its severity. To review each envelope on its own, use `--revisar-uno-por-uno` instead of
     confirming the batch.
  4. A confirmed batch counts like envelopes confirmed by hand: its failures open findings, and its evidence does not change afterwards.
- **How the sample is chosen:** every failed and partial one is always reviewed. Of the rest, the ones that do not fail, a sample
  is reviewed according to its size: up to 25, all of them; 26 to 50, 22; 51 to 90, 25; 91 to 150, 26; more than 150, 29. With
  that quality plan (up to 10 % of bad envelopes acceptable, a 5 % risk of accepting a worse batch), the probability that a batch
  with 10 % bad envelopes passes the sample without finding one is under 5 %. The system chooses the sample with a seed that comes
  from the batch's fingerprint: the same on any computer and in any browser.
- **What it does NOT do:** it does not run tools, does not read the file in the browser, does not paste text yet (the tab says so),
  no model decides a verdict, and it does not keep the report's contents or the attacks the tool used. With ZAP, a rule with no
  proof that it ran appears as **Not run**, never as passed.
- **Known limitations:**
  - Garak's report does not carry the threshold above which a test counts as failed. The app uses 0.5, Garak's default, and says
    so in the batch's warnings; it also checks that its counts match the summary lines of the same report.
  - ZAP's statistics are read with the format in its documentation. They have not yet been tried against a real ZAP run report.
  - On the screen, “Pasted text” does not load anything yet, and “Manual envelope” shows the CLI steps above.
  - The screen is tested in Spanish; the English test arrives at the close of the milestone.

#### The demo classifier for the “decision model” family · since Sprint 001

- **What it does:** it simulates a model that makes decisions, so the tests of that family have something to
  measure.
  - **The case:** it sorts made-up requests from library members: approve, reject or send to a person, and whether
    they are urgent.
  - **The format:** it imitates the response contract of Jev, from TypeSafe: a probability distribution over the
    options and a confidence statistic. How the answers are nested is our own choice.
  - **What is measured:** the probabilities, never the “confidence”:
    - accuracy;
    - Brier score;
    - calibration error (ECE);
    - errors near the threshold at which a request would be approved without a person;
    - how much the decision changes when the same request is repeated;
    - the gap between Spanish and English.
- **How to use it:** `pnpm clasificador:demo --idioma en`, or `--json`.
  - **The set:** 26 cases in `docs/kit-de-prueba/modelo-decision/conjunto-de-referencia.json`, with the policy that
    decides the right answer for each one.
  - **The response fingerprint:** it always comes out the same with the same data.
- **Known limitations:**
  - **It measures no real model:** it does not learn, and the same person wrote the set and the classifier. The
    figures show that the metrics work.
  - **It has three flaws on purpose,** so the metrics can find them:
    - it understands English better than Spanish;
    - it does not understand negated sentences;
    - it favours long-standing members.

### Frequently asked questions

- **Why does the catalog come out “with warnings” rather than “ok”?** Because of the 10 software tests without a
  control. That is expected until there is a layer of software controls.
- **I changed a file in `datos/`. What now?** Run `pnpm catalogo:validar` and read the findings. If you changed a
  test's content and its verification date, its freshness starts again.

### History

| Sprint           | Features added to this manual                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 001 · 2026-10-04 | The catalog as data (validate, snapshot, freshness semaphore) · the demo classifier                                             |
| 002 · 2026-10-11 | The catalog on screen (list with filters, freshness by family and a record per test)                                            |
| 003 · 2026-10-11 | Frameworks and versions (with the equivalence map and the snapshots) · Annex A controls · the paginated list                    |
| 004 · 2026-10-11 | Assets (selector, owner and provider, profile, scope and rules) · test plan with its exclusions and coverage · package download |
| 005 · 2026-10-11 | Evidence (record and confirm envelopes) · findings with severity, deadline and lifecycle, closed only by a retest · their page  |
