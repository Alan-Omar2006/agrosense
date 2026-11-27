# AgroSense · Unidad III

Aplicación web y API REST de AgroSense Technologies. El navegador consume la API de Node.js y el servidor consulta PostgreSQL en Supabase usando el rol `agrosense_app`. Las consultas usan el esquema `public` creado con `schema_postgres.sql`.

## Ejecutar en GitHub Codespaces

1. Copia la carpeta `app/` a la raíz del repositorio.
2. En **Settings → Secrets and variables → Codespaces**, configura `DATABASE_URL` como secreto del repositorio. Usa la URI de conexión Session pooler y la contraseña del rol de aplicación `agrosense_app`. No pegues la URI en archivos ni la publiques.
3. Reinicia el Codespace después de crear o cambiar el secreto.
4. En la terminal ejecuta:

   ```sh
   cd app
   npm install
   npm start
   ```

5. Abre la pestaña **Ports**, busca el puerto `3000` y pulsa **Open in Browser**. La página muestra el estado de conexión a Supabase.

Si el puerto asignado no es 3000, Codespaces define `PORT` automáticamente. Para comprobar la conexión desde otra terminal: `npm run test:conexion`.

## Rutas de la API

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/salud` | Comprueba la conexión y reporta latencia |
| GET | `/api/proyecto` | Cuenta cultivos, sensores, lecturas y alertas |
| GET | `/api/cultivos` | Lista cultivos y sus umbrales |
| GET | `/api/sensores?buscar=&pagina=1&limite=10` | Busca y pagina sensores |
| GET | `/api/sensores/:id` | Consulta el detalle de un sensor |
| POST | `/api/sensores` | Registra sensor |
| PATCH | `/api/sensores/:id` | Modifica sensor |
| DELETE | `/api/sensores/:id` | Elimina sensor sin lecturas ni alertas relacionadas; si existen, responde 409 |
| GET | `/api/lecturas?sensor_id=&pagina=1&limite=10` | Filtra y pagina lecturas |
| GET | `/api/lecturas/:id` | Consulta el detalle de una lectura |
| POST | `/api/lecturas` | Registra lectura (fecha asignada por la base) |
| PATCH | `/api/lecturas/:id` | Modifica lectura |
| DELETE | `/api/lecturas/:id` | Elimina lectura |
| GET | `/api/reportes/ambiente` | Calcula cantidad, promedios y última lectura por sensor |

Las rutas de escritura validan tipos, rangos y referencias. Los valores de usuario se envían como parámetros SQL. El navegador no recibe la cadena de conexión.

## Requisitos de la base

- Ejecuta el script de esquema entregado por el equipo en Supabase.
- El rol `agrosense_app` requiere permisos SELECT en `cultivos` y `alertas`, y SELECT/INSERT/UPDATE/DELETE en `sensores` y `lecturas`, además del uso de sus secuencias.
- Esta app utiliza permisos del servidor con el rol restringido; no conecta el navegador directamente a la base.
- La base puede empezar vacía. Agrega cultivos o sensores desde Supabase o desde el formulario de la página.

## Evidencias pendientes de capturar

- `GET /api/salud` y `npm run test:conexion` en Codespaces.
- Lista de sensores, formulario, ficha de detalle y reporte desde navegador.
- Tabla de pruebas completada y capturas en `pruebas-manuales.md`.

No guardes archivos `.env`, contraseñas, URI de base de datos ni certificados privados en GitHub.
