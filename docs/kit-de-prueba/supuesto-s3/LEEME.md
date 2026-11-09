# Supuesto S3 · el veredicto de la regla frente al de una persona

> Texto sintético del kit de prueba de HackGuard. Lo escribe el generador (`pnpm supuestos:generar`): no lo edites a mano, el gate de
> deriva lo detecta.

**Qué mide.** S3 dice: «el veredicto que calcula la regla coincide con el de una persona en al menos el 90 % de los resultados
pegados». Aquí hay 20 resultados pegados de activos demo (`resultados/R01.txt` … `R20.txt`). Tú los calificas; el código compara.

**Cómo (una sola parada del ensayo del S14).**

1. **Copia `hoja-de-calificacion.json` fuera del kit** (por ejemplo a tu carpeta de trabajo): el kit es generado y su gate de deriva falla si lo editas en su sitio.
   En tu copia, para cada caso, lee el texto de su archivo y escribe en `tu_veredicto` uno de:
   `superada`, `fallida`, `parcial`, `no_ejecutada`. Llena también `calificador` y `fecha`.
2. **No abras el cálculo de la regla hasta terminar:** el veredicto de la regla no está en ningún archivo del kit; se calcula al comparar.
3. Corre `pnpm supuestos:s3 <tu-copia.json>`. Dice la coincidencia, **S3 probado** (≥ 90 %) o
   **S3 refutado**, y cada discrepancia con lo que dijiste tú y lo que dio la regla.

**Los dos casos de borde.** R05 (19 de 20 repeticiones, ninguna falló) y R20 (la métrica justo en el límite que el activo declaró) son
donde una persona y la regla pueden discrepar sin que ninguna se equivoque: la regla pide las 20 repeticiones para decir «superada», y el
límite «no debe superarse» admite el valor igual. Cuentan en el 90 %; el comando los marca cuando son la causa.

**Los 20 `/extraer`.** `extraer-lote-demo.json` lista, en orden, el comando de cada texto sobre su activo demo. Corren sobre el mismo
set para medir la cuota por corrida. Este sprint **no** los corrió.

**Límites.** Son 20 casos sintéticos: S3 queda probado o refutado para este set, no para evidencia real (que no viaja al repositorio).
