# Lote de 200 resultados pegados · 10 tandas de 20

> Texto sintético del kit de prueba de HackGuard. Lo escribe el generador con una semilla fija (`hackguard-lote-de-200@1`): el mismo lote en
> cualquier computadora. No lo edites a mano.

Sirve para medir cuánta cuota gasta cada corrida de `/extraer` y proyectar las demás. Se corre en el hito H-3 (Robustez), después de
medir la cuota con los 20 del lote demo (`../supuesto-s3`).

- `tandas.json`: las 10 tandas con sus ids, su composición por veredicto de la regla y el comando de cada texto.
- `pnpm lotes:metricas`: enseña el plan de las 10 tandas. Con `--registro <archivo>`, lee lo que anotaste de cada tanda
  (cuota antes y después, minutos, propuestas selladas, corregidas por una persona) y proyecta las que faltan.

Formato del registro: `{ "formato": "hackguard/registro-de-tandas@1", "tandas": [ { "tanda": 1, "cuota_antes_pct": 12, "cuota_despues_pct": 31, "minutos": 18, "propuestas_selladas": 20, "corregidas_por_persona": 2 } ] }`.
