# datos/privado/

Aquí vive la **evidencia de activos reales**, y nada de ella viaja al repo público (regla dura 8 de la
constitución). git ignora toda la carpeta salvo este archivo, y `tests/unit/datos-privados.test.ts` falla si
algo más de aquí queda versionado.

**Qué va aquí (cuando llegue, desde el S2):**

- alcances autorizados;
- reglas de enfrentamiento;
- perfiles;
- sobres de evidencia;
- hallazgos de activos reales;
- todo derivado que salga de ellos (índices, reportes, instantáneas privadas).

Los derivados nacen con permisos restrictivos (regla 17-bis).

**Qué jamás va aquí:** secretos o claves (van en `.env.local` o en las variables de Vercel), ni la salida
cruda de una herramienta (al almacén solo entra su huella y un extracto redactado, regla dura 4).

**Respaldo:** un repo privado solo de datos, aparte de este.

**Qué es público:** el catálogo (`datos/marcos`, `datos/controles`, `datos/herramientas`, `datos/pruebas`…) y
los activos demo sintéticos son públicos y viven fuera de esta carpeta.
