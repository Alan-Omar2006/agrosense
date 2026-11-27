# Pruebas manuales · AgroSense Unidad III

Llena «Resultado obtenido» y adjunta capturas después de ejecutar cada caso en el Codespace. Usa únicamente datos ficticios. No se deben presentar resultados esperados como si ya se hubieran observado.

| # | Prueba | Resultado esperado | Resultado obtenido / evidencia |
|---:|---|---|---|
| 1 | `GET /api/salud` | HTTP 200, `ok: true` y latencia | Pendiente |
| 2 | `GET /api/proyecto` | HTTP 200 y conteos de las cuatro tablas | Pendiente |
| 3 | `GET /api/cultivos` | HTTP 200 con arreglo de cultivos | Pendiente |
| 4 | `GET /api/sensores?pagina=1&limite=10` | HTTP 200, lista y total | Pendiente |
| 5 | `POST /api/sensores` con nombre y ubicación nuevos | HTTP 201 y sensor creado | Pendiente |
| 6 | `GET /api/sensores/:id` con el ID creado | HTTP 200 y datos del sensor | Pendiente |
| 7 | `PATCH /api/sensores/:id` cambiando ubicación | HTTP 200 y valor actualizado | Pendiente |
| 8 | `GET /api/lecturas?sensor_id=:id` | HTTP 200 con lecturas filtradas | Pendiente |
| 9 | `POST /api/lecturas` con humedad `150` | HTTP 400; no se inserta registro | Pendiente |
| 10 | `POST /api/sensores` sin nombre | HTTP 400; no se inserta registro | Pendiente |
| 11 | `GET /api/sensores/999999999` | HTTP 404 si ese ID no existe | Pendiente |
| 12 | Desde la web: registrar sensor, abrir **Ver**, editar y comprobar el cambio en la tabla | La ficha muestra los datos y la edición persiste | Pendiente |
| 13 | `GET /api/reportes/ambiente` | HTTP 200 con promedios agrupados por sensor | Pendiente |
| 14 | `DELETE /api/sensores/:id` de un sensor con lecturas o alertas | HTTP 409 y los datos relacionados permanecen | Pendiente |

La tabla cubre las rutas de la API, incluye más de cuatro casos negativos y una prueba desde la aplicación web. Para guardar capturas, anota el nombre de archivo en la última columna y añade las imágenes a la carpeta de evidencias del equipo.
